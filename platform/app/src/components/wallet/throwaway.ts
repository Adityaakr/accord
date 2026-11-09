// A throwaway testnet key: "Try without a wallet". The browser makes an ed25519 key, and the implicit account it names
// (the hex of the public key) signs like a wallet would: NEP-413 for the session, NEP-366 delegates sent through
// Accord's relayer for calls that attach at most 1 yoctoNEAR, and its own transactions, paid from the faucet's NEAR,
// for calls that attach more (create_agreement's room deposit). The key lives in sessionStorage only, so it belongs to
// one tab and is gone when the tab closes. It is never sent to the server. Testnet only.
//
// No "use client": pure apart from the default network calls, so it is unit-tested.

import { Account, KeyPair, KeyPairSigner, actions, buildDelegateAction, encodeSignedDelegate, type KeyPairString } from "near-api-js";
import { RotatingRpcProvider, isRpcBusy, rpcEndpoints, toTxResult, type Signer, type TxResult } from "@accord/sdk";

export const THROWAWAY_STORAGE_KEY = "accord-throwaway-key";
/** Blocks a relayed request stays valid for; the relayer accepts up to 7200. */
export const DELEGATE_TTL = 300n;
/** No request may hold the signer's queue for longer than this. */
const TIMEOUT_MS = 90_000;

const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const toB64 = (b: Uint8Array) => {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
};

export const newThrowawayKey = (): KeyPair => KeyPair.fromRandom("ed25519");

/** The implicit account an ed25519 key controls: the 64-character hex of its public key. */
export const implicitAccountId = (kp: KeyPair): string => toHex(kp.getPublicKey().data);

/** What a call needs from the chain and from Accord. Defaults talk to the RPC and /api/relay; tests pass fakes. */
export interface ThrowawayDeps {
  /** The access key's current nonce and the chain's height, for a delegate. */
  accessKey(accountId: string, publicKey: string): Promise<{ nonce: bigint; height: bigint }>;
  /** Posts a base64 borsh SignedDelegate to Accord's relayer and returns its outcome. */
  relay(signedDelegate: string): Promise<unknown>;
  /** Signs and sends a transaction from the account itself, and returns its outcome. */
  direct(receiverId: string, action: Action): Promise<unknown>;
}

type Action = ReturnType<typeof actions.functionCall> | ReturnType<typeof actions.deleteAccount>;

/** The throwaway key's signer: a `Signer`, and it can delete its own account at the end of a visit. */
export interface ThrowawaySigner extends Signer {
  /** Deletes this account; every yoctoNEAR it holds goes to `beneficiary` (Accord's faucet). Returns the tx hash. */
  deleteAccount(beneficiary: string): Promise<string>;
  /**
   * ft_transfer of `amount` of `token` to `receiver`, with the 1 yoctoNEAR NEP-141 requires, as this account's own
   * transaction (Accord's relayer carries token transfers into agreements only). Returns the tx hash.
   */
  transferToken(token: string, receiver: string, amount: string): Promise<string>;
}

export const isThrowawaySigner = (s: Signer | null | undefined): s is ThrowawaySigner =>
  !!s && typeof (s as Partial<ThrowawaySigner>).deleteAccount === "function";

async function rpcAccessKey(provider: RotatingRpcProvider, accountId: string, publicKey: string) {
  let r: { nonce: number | string; block_height: number | string };
  try {
    r = await provider.request("query", { request_type: "view_access_key", finality: "final", account_id: accountId, public_key: publicKey });
  } catch (e) {
    // a busy RPC (every endpoint rate limited or down) keeps its own error; a missing key is the account's state
    if (isRpcBusy(e)) throw e;
    throw new Error("this throwaway account has no key on chain yet; get test funds first");
  }
  return { nonce: BigInt(r.nonce), height: BigInt(r.block_height) };
}

/** Tries left and the wait before each when the relayer answers 503 (the network busy). */
const RELAY_BUSY_WAITS_MS = [3_000, 8_000, 15_000];

/**
 * Posts the delegate; on a 503 "busy" answer waits and posts the same delegate again. Safe: a delegate carries its
 * own nonce, so if an earlier post did land, the repeat is refused on chain (DelegateActionInvalidNonce) and runs
 * nothing twice.
 */
export async function postRelay(signedDelegate: string, waits: number[] = RELAY_BUSY_WAITS_MS, post: typeof fetch = fetch): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    const res = await post("/api/relay", {
      method: "POST", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "content-type": "application/json" }, body: JSON.stringify({ signedDelegate }),
    });
    const body = (await res.json().catch(() => ({}))) as { outcome?: unknown; error?: string; busy?: boolean };
    if (res.status === 503 && body.busy && attempt < waits.length) {
      await new Promise((r) => setTimeout(r, waits[attempt]));
      continue;
    }
    if (!res.ok || !body.outcome) throw new Error(`Accord's relayer could not send this transaction: ${body.error ?? `HTTP ${res.status}`}.`);
    return body.outcome;
  }
}

export function defaultDeps(kp: KeyPair, accountId: string, rpc: string): ThrowawayDeps {
  // rpc: one URL or a comma list; the public testnet endpoints follow as fallbacks (rate limits and outages only)
  const provider = new RotatingRpcProvider(rpcEndpoints(rpc, "testnet"), { txTimeoutMs: TIMEOUT_MS });
  const account = new Account(accountId, provider, new KeyPairSigner(kp));
  return {
    accessKey: (id, pk) => rpcAccessKey(provider, id, pk),
    relay: postRelay,
    direct: (receiverId, action) => account.signAndSendTransaction({ receiverId, actions: [action], waitUntil: "FINAL", throwOnFailure: false }),
  };
}

/** Signs a NEP-366 delegate for one function call and encodes it the way wallets return it (base64 borsh). */
export async function signDelegate(kp: KeyPair, senderId: string, receiverId: string, action: ReturnType<typeof actions.functionCall>, at: { nonce: bigint; height: bigint }): Promise<string> {
  const da = buildDelegateAction({
    senderId, receiverId, actions: [action], nonce: at.nonce + 1n, maxBlockHeight: at.height + DELEGATE_TTL, publicKey: kp.getPublicKey(),
  });
  const { signedDelegate } = await new KeyPairSigner(kp).signDelegateAction(da);
  return toB64(encodeSignedDelegate(signedDelegate));
}

/** A `Signer` for the throwaway key, like the wallet's connectorSigner. Calls run one at a time, so nonces never race. */
export function throwawaySigner(kp: KeyPair, opts: { rpc: string; deps?: ThrowawayDeps }): ThrowawaySigner {
  const accountId = implicitAccountId(kp);
  const publicKey = kp.getPublicKey().toString();
  const deps = opts.deps ?? defaultDeps(kp, accountId, opts.rpc);
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(f: () => Promise<T>): Promise<T> => {
    const run = queue.then(f, f);
    queue = run.catch(() => undefined);
    return run;
  };
  return {
    accountId,
    call(contractId, method, args, o = {}): Promise<TxResult> {
      return serial(async () => {
        const deposit = BigInt(o.deposit ?? 0n);
        const action = actions.functionCall(method, args, BigInt(o.gas ?? 100_000_000_000_000n), deposit);
        // NEP-366: the relayer pays any NEAR a delegate attaches, so only calls that attach at most 1 yoctoNEAR are
        // relayed; the room deposit is this account's own transaction, paid from the faucet's NEAR.
        let outcome: unknown;
        if (deposit <= 1n) {
          const at = await deps.accessKey(accountId, publicKey);
          outcome = await deps.relay(await signDelegate(kp, accountId, contractId, action, at));
        } else {
          outcome = await deps.direct(contractId, action);
        }
        return toTxResult(outcome);
      });
    },
    async signMessage(message, recipient, nonce) {
      const s = await new KeyPairSigner(kp).signNep413Message(accountId, { message, recipient, nonce });
      return { signature: s.signature, publicKey };
    },
    transferToken(token, receiver, amount) {
      return serial(async () => {
        const action = actions.functionCall("ft_transfer", { receiver_id: receiver, amount, memo: "Accord try-it: test USDC back to the faucet" }, 30_000_000_000_000n, 1n);
        const r = toTxResult(await deps.direct(token, action));
        if (!r.ok) throw new Error(`the test USDC could not be returned: ${r.failure ?? "failed"}`);
        return r.txHash;
      });
    },
    deleteAccount(beneficiary) {
      return serial(async () => {
        // the account's own transaction (a relayer carries function calls only); its gas comes out of what it sends
        const r = toTxResult(await deps.direct(accountId, actions.deleteAccount(beneficiary)));
        if (!r.ok) throw new Error(`the account could not be deleted: ${r.failure ?? "failed"}`);
        return r.txHash;
      });
    },
  };
}

/** The tab's throwaway key, if it has one. sessionStorage only: never localStorage, never the server. */
export function loadThrowawayKey(): KeyPair | null {
  try {
    const s = sessionStorage.getItem(THROWAWAY_STORAGE_KEY);
    return s ? KeyPair.fromString(s as KeyPairString) : null;
  } catch {
    return null;
  }
}

export function saveThrowawayKey(kp: KeyPair): boolean {
  try {
    sessionStorage.setItem(THROWAWAY_STORAGE_KEY, kp.toString());
    return true;
  } catch {
    return false;
  }
}

export function clearThrowawayKey() {
  try { sessionStorage.removeItem(THROWAWAY_STORAGE_KEY); } catch { /* nothing stored */ }
}

// Accord's relayer for NEP-366 meta-transactions. A wallet that can sign delegate actions (Meteor, Intear and others)
// signs the user's call; the relayer wraps it in its own transaction, pays the gas and broadcasts it, so the user's
// wallet never has to reach the network itself. The relayer holds only its own key (RELAYER_ACCOUNT / RELAYER_KEY in
// the gitignored .env) and attaches no deposit of its own.
// It answers with the transaction's hash as soon as the broadcast is in (relaySubmit, about 10 s at most); the page
// then polls GET /api/relay/status (relayStatus) until the call is final, so no request waits a minute on a busy chain.
// Under NEP-366 the relayer pays any NEAR a delegate attaches, so the policy (delegate.ts) only carries calls that
// attach at most 1 yoctoNEAR.

import "server-only";
import { Account, KeyPair, KeyPairSigner, SignedTransaction, actions, baseEncode, type KeyPairString } from "near-api-js";
import { InvalidNonceError } from "near-api-js/rpc-errors";
import { sha256 } from "@noble/hashes/sha2";
import { RotatingRpcProvider, TENDER_BOARDS, isRpcBusy, rpcEndpoints, rpcRequest } from "@accord/sdk";
import { readWithin, settleWithin } from "./deadline";
import { accord, config } from "./accord";
import type { FactoryPair } from "./delegate";
import { decodeSignedDelegate, isUnknownTx, readRelayed, rejectDelegate, type DecodedDelegate, type RelayRead, type RelayedTx } from "./delegate";

// NEAR_RPC_URL (one URL or a comma list) first, then the public testnet endpoints; rotates only on a rate limit or
// a transport failure, so the relayed call's own errors reach the caller as they are (@accord/sdk RotatingRpcProvider).
let provider: RotatingRpcProvider | null = null;
const rpc = () => (provider ??= new RotatingRpcProvider(rpcEndpoints(process.env.NEAR_RPC_URL, "testnet")));

function relayer(): Account {
  const id = process.env.RELAYER_ACCOUNT, key = process.env.RELAYER_KEY;
  if (!id || !key) throw new Error("the relayer is not configured");
  return new Account(id, rpc(), new KeyPairSigner(KeyPair.fromString(key as KeyPairString)));
}

async function height(): Promise<bigint> {
  const b = await rpcRequest<{ header?: { height: number } }>(rpc(), "block", { finality: "final" });
  if (!b?.header) throw new Error("could not read the chain height");
  return BigInt(b.header.height);
}

/**
 * The second factory (ACCORD_FACTORY_USDC) and the token its own config names. When ACCORD_TOKEN_USDC is set and
 * differs from what the factory says, the pair is left out: the relayer never pairs a token with a factory that
 * does not settle in it.
 */
async function extraPairs(): Promise<FactoryPair[]> {
  const out: FactoryPair[] = [];
  for (const cur of config().currencies.slice(1)) {
    const onChain = await accord().onFactory(cur.factory).config().then((x) => x.token).catch(() => null);
    if (onChain && (!cur.token || cur.token === onChain)) out.push({ factory: cur.factory, token: onChain });
  }
  return out;
}

/** How long POST /api/relay may take in all before it answers with the hash (ms). */
export const SUBMIT_DEADLINE_MS = 10_000;
/** The share of that spent validating (chain height, factory config) before anything is signed. */
const VALIDATE_MS = 6_000;

/**
 * Relays sent by this process, by the hash POST /api/relay answered with. A send that has not come back yet is
 * "sending"; one the network refused keeps its error so the status route can report it; a re-signed send (the
 * relayer's nonce was taken) points at the hash that actually went out.
 */
interface Sent { state: "sending" | "sent" | "failed"; hash: string; error?: unknown; at: number }
const sent = new Map<string, Sent>();
const SENT_KEEP_MS = 15 * 60_000;
function remember(hash: string, s: Sent) {
  sent.set(hash, s);
  const now = Date.now();
  for (const [k, v] of sent) if (now - v.at > SENT_KEEP_MS) sent.delete(k);
}

let account: Account | null = null;
const relayerAccount = () => (account ??= relayer());

const txHash = (signed: SignedTransaction) => baseEncode(sha256(signed.transaction.encode()));

/** Sends a signed relay transaction until it is INCLUDED; on a used nonce, signs it again with a fresh one (3 tries). */
async function broadcast(entry: Sent, signed: SignedTransaction, d: DecodedDelegate): Promise<void> {
  for (let tries = 0; ; tries++) {
    try {
      await rpc().sendTransactionUntil(signed, "INCLUDED");
      entry.state = "sent";
      return;
    } catch (e) {
      if (e instanceof InvalidNonceError && tries < 3) {
        account = null; // a fresh nonce manager reads the key's nonce from the chain again
        signed = await relayerAccount().createSignedTransaction({ receiverId: d.delegateAction.senderId, actions: [delegateAction(d)] });
        entry.hash = txHash(signed);
        continue;
      }
      // a send that timed out may still have reached the network: the status route looks the hash up
      if (isRpcBusy(e)) { entry.state = "sent"; return; }
      entry.state = "failed";
      entry.error = e;
      throw e;
    }
  }
}

const delegateAction = (d: DecodedDelegate) => actions.signedDelegate(d as unknown as Parameters<typeof actions.signedDelegate>[0]);

/**
 * Validates one signed delegate, signs the relayer's transaction around it and broadcasts it. Answers within about
 * SUBMIT_DEADLINE_MS with the transaction's hash: once it is INCLUDED, or still on its way when the deadline comes
 * (the send runs on and the status route reports it). The final outcome comes from relayStatus. A refusal by the
 * policy is a 400; a network refusal that comes back in time is thrown as it is.
 */
export async function relaySubmit(signedDelegate: string): Promise<{ hash: string; sender: string; receiver: string; included: boolean }> {
  const started = Date.now();
  const c = config();
  if (c.network !== "testnet") throw new Error("the relayer runs on testnet only");
  const d: DecodedDelegate = decodeSignedDelegate(signedDelegate);
  const [{ token }, pairs, h] = await readWithin(Promise.all([accord().config(), extraPairs(), height()]), VALIDATE_MS, "checking the relayed call");
  const why = rejectDelegate(d, { factory: c.factory, token, pairs, height: h, board: process.env.TENDER_BOARD || TENDER_BOARDS.testnet });
  if (why) throw Object.assign(new Error(why), { status: 400 });
  const left = () => Math.max(1_000, SUBMIT_DEADLINE_MS - (Date.now() - started));
  // nothing is broadcast unless the signed transaction (and so its hash) is ready inside the deadline
  let late = false;
  const signing = relayerAccount().createSignedTransaction({ receiverId: d.delegateAction.senderId, actions: [delegateAction(d)] })
    .then((signed) => (late ? null : signed));
  let signed: SignedTransaction | null;
  try {
    signed = await readWithin(signing, left(), "signing the relayed call");
  } catch (e) {
    late = true;
    throw e;
  }
  if (!signed) throw new Error("signing the relayed call took too long; try again");
  const hash = txHash(signed);
  const entry: Sent = { state: "sending", hash, at: Date.now() };
  remember(hash, entry);
  const sending = broadcast(entry, signed, d);
  const r = await settleWithin(sending, left());
  if (r.done) return { hash: entry.hash, sender: d.delegateAction.senderId, receiver: d.delegateAction.receiverId, included: true };
  sending.catch(() => undefined); // its failure is kept in `sent` for the status route
  return { hash, sender: d.delegateAction.senderId, receiver: d.delegateAction.receiverId, included: false };
}

// The status reads: their own provider with short timeouts, so one poll never holds a request (rounds 1, 6 s each).
let statusProvider: RotatingRpcProvider | null = null;
const statusRpc = () => (statusProvider ??= new RotatingRpcProvider(rpcEndpoints(process.env.NEAR_RPC_URL, "testnet"), { rounds: 1, timeoutMs: 6_000, txTimeoutMs: 6_000 }));
/** The longest one status read waits on the chain (ms). */
export const STATUS_DEADLINE_MS = 8_000;

/** Final answers for a while, pending ones for a moment, so polls from one tab (or several) do not each read the chain. */
const statusCache = new Map<string, { until: number; value: RelayRead | { error: Error } }>();
const FINAL_CACHE_MS = 5 * 60_000, PENDING_CACHE_MS = 1_500;

export function relayerId(): string {
  const id = process.env.RELAYER_ACCOUNT;
  if (!id) throw new Error("the relayer is not configured");
  return id;
}

/**
 * Where one relayed call is: still on its way (`final: false`), or final with the user's call as its status, read the
 * way the waiting route read it (readRelayed, innerStatus). Throws what the network said when the relayer's own
 * transaction failed or the send was refused.
 */
export async function relayStatus(hash: string, sender: string): Promise<RelayRead> {
  const mine = sent.get(hash);
  if (mine?.state === "failed") throw mine.error;
  const actual = mine?.hash ?? hash;
  const key = `${actual}:${sender}`;
  const hit = statusCache.get(key);
  if (hit && hit.until > Date.now()) {
    if ("error" in hit.value) throw hit.value.error;
    return hit.value;
  }
  let value: RelayRead;
  try {
    const tx = await readWithin(
      statusRpc().request<RelayedTx>("tx", { tx_hash: actual, sender_account_id: relayerId(), wait_until: "NONE" }),
      STATUS_DEADLINE_MS, "reading the relayed call",
    );
    value = readRelayed(tx, { relayer: relayerId(), sender });
  } catch (e) {
    if (isUnknownTx(e)) value = { final: false, status: mine?.state === "sending" ? "SENDING" : "UNKNOWN" };
    else if (isRpcBusy(e)) throw e; // never cached: the next poll tries again
    else {
      statusCache.set(key, { until: Date.now() + FINAL_CACHE_MS, value: { error: e as Error } });
      throw e;
    }
  }
  statusCache.set(key, { until: Date.now() + (value.final ? FINAL_CACHE_MS : PENDING_CACHE_MS), value });
  return value;
}

// NEAR Auth (FastAuth) in the browser: email sign-in through the NEAR Auth testnet Auth0 tenant, and a `Signer` for
// the SDK. A transaction is built for the person's own account (an implicit account named by their MPC-derived key),
// approved by them in the Auth0 popup, signed by NEAR's MPC network through the `sign` call our relayer submits, then
// broadcast from their account. No private key exists in this browser or on our server.
//
// NEP-413 is not offered: the installed SDK (browser-sdk 1.4.2) has no message signing, and the NEAR Auth signature is
// the public result of an on-chain call, so it could never seed the document key a sealed mandate needs. Email users
// therefore seal mandates with a wallet (DECISIONS.md 19).

import { Buffer } from "buffer";
import { toTxResult, type Signer, type TxResult } from "@accord/sdk";

if (typeof globalThis !== "undefined" && !(globalThis as { Buffer?: unknown }).Buffer) (globalThis as { Buffer?: unknown }).Buffer = Buffer;

const CLIENT_ID = process.env.NEXT_PUBLIC_NEAR_AUTH_CLIENT_ID || "np8paqIpMWmNbzT4xAvOOapZBjsOpptl";
const RPC = "https://rpc.testnet.near.org";
const OPTIONS = { fastAuthContractId: "fast-auth.testnet", mpcContractId: "v1.signer-prod.testnet" };

/** Why sealing needs a wallet, in the words the app shows. */
export const EMAIL_CANNOT_SEAL = "Sealing your limits needs a NEAR wallet. With email sign-in, signatures come from a public on-chain call, so they cannot protect the key that encrypts your mandate.";

type Loaded = {
  client: { login(): Promise<unknown>; getSigner(): Promise<FaSigner> };
  provider: { isLoggedIn(): Promise<boolean>; logout(o?: unknown): Promise<void>; client: { getIdTokenClaims(): Promise<{ __raw?: string } | undefined> } };
  FastAuthSignature: { fromBase64(b64: string): unknown };
  v5: typeof import("near-api-js-v5");
};
type FaSigner = {
  getPublicKey(): Promise<unknown>;
  requestTransactionSignature(o: { transaction: unknown }): Promise<unknown>;
  getSignatureRequest(): Promise<unknown>;
  sendTransaction(tx: unknown, sig: unknown): Promise<unknown>;
};

let loading: Promise<Loaded> | null = null;
function load(): Promise<Loaded> {
  loading ??= (async () => {
    const [sdk, prov, v5] = await Promise.all([
      import("@fast-auth-near/browser-sdk"),
      import("@fast-auth-near/javascript-provider"),
      import("near-api-js-v5"),
    ]);
    const provider = new prov.JavascriptProvider({ network: "testnet", clientId: CLIENT_ID });
    const near = await v5.connect({ networkId: "testnet", nodeUrl: RPC });
    const client = new sdk.FastAuthClient(provider, near.connection as never, OPTIONS);
    return { client, provider, FastAuthSignature: sdk.FastAuthSignature, v5 } as unknown as Loaded;
  })();
  return loading;
}

/** True when the Auth0 tenant still has this browser signed in (also completes a login redirect, if any). */
export async function emailSignedIn(): Promise<boolean> {
  try {
    return await (await load()).provider.isLoggedIn();
  } catch {
    return false;
  }
}

/** Opens the NEAR Auth login (an Auth0 popup on login.testnet.fast-auth.com). */
export async function emailLogin(): Promise<void> {
  await (await load()).client.login();
}

export async function emailLogout(): Promise<void> {
  await (await load()).provider.logout({ openUrl: false }).catch(() => undefined);
}

/** The raw Auth0 ID token, for the server to verify and derive the account from. */
export async function emailIdToken(): Promise<string> {
  const claims = await (await load()).provider.client.getIdTokenClaims();
  if (!claims?.__raw) throw new Error("not signed in with email");
  return claims.__raw;
}

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

async function rpc<T>(method: string, params: unknown): Promise<T> {
  const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: "accord", method, params }) });
  const b = (await r.json()) as { result?: T; error?: { cause?: { name?: string }; message?: string } };
  if (b.error) throw new Error(b.error.cause?.name ?? b.error.message ?? "rpc error");
  return b.result as T;
}

/** The person's NEAR account (implicit, from their MPC-derived key) and a Signer for it. */
export async function emailSigner(): Promise<{ accountId: string; signer: Signer }> {
  const { client, FastAuthSignature, v5 } = await load();
  const fa = await client.getSigner();
  const pkRaw = await fa.getPublicKey();
  const pk = v5.utils.PublicKey.from(String(pkRaw));
  const accountId = hex(pk.data);

  const signer: Signer = {
    accountId,
    async call(contractId, method, args, opts = {}): Promise<TxResult> {
      const ak = await rpc<{ nonce: number; block_hash: string }>("query", {
        request_type: "view_access_key", finality: "final", account_id: accountId, public_key: pk.toString(),
      });
      const tx = v5.transactions.createTransaction(
        accountId, pk, contractId, BigInt(ak.nonce) + 1n,
        [v5.transactions.functionCall(method, args, opts.gas ?? 100_000_000_000_000n, opts.deposit ?? 0n)],
        v5.utils.serialize.base_decode(ak.block_hash),
      );
      await fa.requestTransactionSignature({ transaction: tx }); // the Auth0 approval popup
      const got = (await fa.getSignatureRequest()) as { signatureRequest?: Record<string, unknown> } & Record<string, unknown>;
      const req = (got.signatureRequest ?? got) as { guardId: string; verifyPayload: string; signPayload: ArrayLike<number>; algorithm?: string };
      const res = await fetch("/api/fastauth/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signatureRequest: { guardId: req.guardId, verifyPayload: req.verifyPayload, signPayload: Array.from(req.signPayload), algorithm: req.algorithm } }),
      });
      const body = (await res.json()) as { successValue?: string; error?: string };
      if (!res.ok || !body.successValue) throw new Error(body.error ?? `HTTP ${res.status}`);
      const outcome = await fa.sendTransaction(tx, FastAuthSignature.fromBase64(body.successValue));
      return toTxResult(outcome);
    },
    // signMessage deliberately absent: see the header comment and EMAIL_CANNOT_SEAL.
  };
  return { accountId, signer };
}

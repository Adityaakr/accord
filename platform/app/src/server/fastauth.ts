// NEAR Auth (FastAuth) on the server: verify the Auth0 tokens a signed-in email user presents, derive their NEAR
// account from the MPC contract (so the browser cannot claim someone else's), and relay the two calls an email user
// cannot pay for themselves: funding a brand-new account, and the `sign` call on the NEAR Auth contract that returns an
// MPC signature for the user's own transaction. The relayer holds only its own key (RELAYER_ACCOUNT / RELAYER_KEY in the
// gitignored .env); it never holds, sees or derives a user key. Testnet values from docs.auth.near.org/resources/testnet.

import "server-only";
import { createPublicKey, verify as verifySig, type JsonWebKey } from "node:crypto";
import { Account, JsonRpcProvider, KeyPair, KeyPairSigner, actions, type KeyPairString } from "near-api-js";
import { config } from "./accord";

export const FASTAUTH = {
  clientId: process.env.NEXT_PUBLIC_NEAR_AUTH_CLIENT_ID || "np8paqIpMWmNbzT4xAvOOapZBjsOpptl",
  domain: "login.testnet.fast-auth.com",
  signingAudience: "auth0.jwt.fast-auth.testnet",
  fastAuthContractId: "fast-auth.testnet",
  mpcContractId: "v1.signer-prod.testnet",
  rpc: "https://rpc.testnet.near.org",
} as const;

/** NEAR given to a brand-new email account so it can pay its own gas; sent once. */
const NEW_ACCOUNT_YOCTO = 300_000_000_000_000_000_000_000n; // 0.3 NEAR
const TGAS = 1_000_000_000_000n;

// ---------- JWT (RS256 against the tenant's JWKS) ----------

type Jwk = JsonWebKey & { kid?: string };
let jwks: { at: number; keys: Jwk[] } | null = null;

async function keys(): Promise<Jwk[]> {
  if (jwks && Date.now() - jwks.at < 10 * 60_000) return jwks.keys;
  const r = await fetch(`https://${FASTAUTH.domain}/.well-known/jwks.json`, { cache: "no-store" });
  if (!r.ok) throw new Error(`jwks HTTP ${r.status}`);
  const b = (await r.json()) as { keys: Jwk[] };
  jwks = { at: Date.now(), keys: b.keys };
  return b.keys;
}

const b64u = (s: string) => Buffer.from(s, "base64url");

/** Verifies an Auth0 JWT from the NEAR Auth testnet tenant and returns its claims; throws on anything off. */
export async function verifyJwt(token: string, audience: string): Promise<Record<string, unknown>> {
  const [h, p, sig] = token.split(".");
  if (!h || !p || !sig) throw new Error("not a JWT");
  const parts = [h, p, sig] as const;
  let header: { alg: string; kid?: string };
  try { header = JSON.parse(b64u(parts[0]).toString()) as { alg: string; kid?: string }; } catch { throw new Error("not a valid login token"); }
  if (header.alg !== "RS256") throw new Error("unexpected JWT algorithm");
  const jwk = (await keys()).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("unknown signing key");
  const ok = verifySig("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey({ key: jwk, format: "jwk" }), b64u(parts[2]));
  if (!ok) throw new Error("bad JWT signature");
  const claims = JSON.parse(b64u(parts[1]).toString()) as Record<string, unknown>;
  if (claims.iss !== `https://${FASTAUTH.domain}/`) throw new Error("wrong issuer");
  const aud = claims.aud;
  if (!(aud === audience || (Array.isArray(aud) && aud.includes(audience)))) throw new Error("wrong audience");
  if (typeof claims.exp !== "number" || claims.exp * 1000 < Date.now()) throw new Error("token expired");
  return claims;
}

// ---------- account derivation ----------

async function rpc<T>(method: string, params: unknown): Promise<T> {
  const r = await fetch(FASTAUTH.rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "accord", method, params }),
  });
  const b = (await r.json()) as { result?: T; error?: { cause?: { name?: string }; message?: string } };
  if (b.error) throw Object.assign(new Error(b.error.cause?.name ?? b.error.message ?? "rpc error"), { cause: b.error });
  return b.result as T;
}

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58(s: string): Uint8Array {
  let n = 0n;
  for (const c of s) {
    const i = ALPHABET.indexOf(c);
    if (i < 0) throw new Error("bad base58");
    n = n * 58n + BigInt(i);
  }
  const bytes: number[] = [];
  while (n > 0n) { bytes.unshift(Number(n % 256n)); n /= 256n; }
  for (const c of s) { if (c !== "1") break; bytes.unshift(0); }
  return Uint8Array.from(bytes);
}

/** The user's MPC-derived ed25519 key and the implicit account it names, for an Auth0 subject. */
export async function derivedAccount(sub: string): Promise<{ accountId: string; publicKey: string }> {
  const path = `jwt#https://${FASTAUTH.domain}/#${sub}`;
  const args = Buffer.from(JSON.stringify({ path, predecessor: FASTAUTH.fastAuthContractId, domain_id: 1 })).toString("base64");
  const res = await rpc<{ result: number[] }>("query", {
    request_type: "call_function", finality: "final", account_id: FASTAUTH.mpcContractId, method_name: "derived_public_key", args_base64: args,
  });
  const publicKey = JSON.parse(Buffer.from(res.result).toString()) as string; // "ed25519:<base58>"
  const raw = base58(publicKey.replace(/^ed25519:/, ""));
  if (raw.length !== 32) throw new Error("unexpected derived key length");
  return { accountId: Buffer.from(raw).toString("hex"), publicKey };
}

async function exists(accountId: string): Promise<boolean> {
  try {
    await rpc("query", { request_type: "view_account", finality: "final", account_id: accountId });
    return true;
  } catch {
    return false;
  }
}

// ---------- the relayer (its own key only) ----------

function relayer(): Account {
  const id = process.env.RELAYER_ACCOUNT, key = process.env.RELAYER_KEY;
  if (!id || !key) throw new Error("the relayer is not configured (RELAYER_ACCOUNT, RELAYER_KEY)");
  return new Account(id, new JsonRpcProvider({ url: FASTAUTH.rpc }), new KeyPairSigner(KeyPair.fromString(key as KeyPairString)));
}

/** Sends 0.3 NEAR to a new email account so it exists and can pay its own gas. Does nothing if it already exists. */
export async function fundIfNew(accountId: string): Promise<{ funded: boolean; tx?: string }> {
  if (config().network !== "testnet") throw new Error("email accounts are funded on testnet only");
  if (!/^[0-9a-f]{64}$/.test(accountId) || (await exists(accountId))) return { funded: false };
  const r = await relayer().signAndSendTransaction({ receiverId: accountId, actions: [actions.transfer(NEW_ACCOUNT_YOCTO)], waitUntil: "FINAL" });
  return { funded: true, tx: (r as { transaction: { hash: string } }).transaction.hash };
}

export type SignatureRequest = { guardId: string; verifyPayload: string; signPayload: number[]; algorithm?: string };

/** Submits the NEAR Auth `sign` call for an approved request and returns the MPC signature (base64), or throws. */
export async function relaySign(req: SignatureRequest): Promise<string> {
  if (typeof req?.guardId !== "string" || typeof req.verifyPayload !== "string" || !Array.isArray(req.signPayload)) throw new Error("malformed signature request");
  if (req.signPayload.length > 8192 || !req.signPayload.every((n) => Number.isInteger(n) && n >= 0 && n < 256)) throw new Error("malformed sign payload");
  // Only spend gas on approvals Auth0 really issued for NEAR Auth signing.
  await verifyJwt(req.verifyPayload, FASTAUTH.signingAudience);
  const r = await relayer().signAndSendTransaction({
    receiverId: FASTAUTH.fastAuthContractId,
    actions: [actions.functionCall("sign", {
      guard_id: req.guardId, verify_payload: req.verifyPayload, sign_payload: req.signPayload, algorithm: req.algorithm ?? "eddsa",
    }, 300n * TGAS, 1n)],
    waitUntil: "FINAL",
  });
  const status = (r as { status?: { SuccessValue?: string } }).status;
  if (!status?.SuccessValue) throw new Error("NEAR Auth did not return a signature");
  return status.SuccessValue;
}

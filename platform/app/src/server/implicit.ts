// NEAR implicit accounts: a 64-character lowercase hex account id IS the ed25519 public key that controls it. Before the
// account is funded it has no access keys on chain, so a NEP-413 signature cannot be checked against them; it can be
// checked against the id itself. Pure functions (no server-only) so they are testable.

import { createPublicKey, verify } from "node:crypto";
import { sha256 } from "@noble/hashes/sha2";
import { utf8ToBytes } from "@noble/hashes/utils";

export const isImplicitAccount = (account: string) => /^[0-9a-f]{64}$/.test(account);

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58Decode(s: string): Uint8Array {
  let n = 0n;
  for (const c of s) {
    const i = B58.indexOf(c);
    if (i < 0) throw new Error("bad base58");
    n = n * 58n + BigInt(i);
  }
  const bytes: number[] = [];
  while (n > 0n) { bytes.unshift(Number(n & 0xffn)); n >>= 8n; }
  for (const c of s) { if (c === "1") bytes.unshift(0); else break; }
  return new Uint8Array(bytes);
}

/** The raw 32 bytes of an "ed25519:<base58>" public key, or null. */
export function ed25519Bytes(publicKey: string): Uint8Array | null {
  const [kind, data] = publicKey.includes(":") ? publicKey.split(":") : ["ed25519", publicKey];
  if (kind !== "ed25519" || !data) return null;
  try {
    const b = base58Decode(data);
    return b.length === 32 ? b : null;
  } catch {
    return null;
  }
}

/** True when the public key is the one an implicit account id names. */
export function keyNamesImplicitAccount(account: string, publicKey: string): boolean {
  const b = ed25519Bytes(publicKey);
  return !!b && isImplicitAccount(account) && Buffer.from(b).toString("hex") === account;
}

/** The NEP-413 signed digest: sha256(u32le(2^31 + 413) ‖ borsh{message, nonce[32], recipient, callbackUrl: None}). */
export function nep413Digest(message: string, recipient: string, nonce: Uint8Array): Uint8Array {
  const str = (s: string) => { const b = utf8ToBytes(s); const len = Buffer.alloc(4); len.writeUInt32LE(b.length); return Buffer.concat([len, Buffer.from(b)]); };
  const prefix = Buffer.alloc(4); prefix.writeUInt32LE(2 ** 31 + 413);
  return sha256(Buffer.concat([prefix, str(message), Buffer.from(nonce), str(recipient), Buffer.from([0])]));
}

/** Checks an ed25519 signature over the NEP-413 digest with the raw public key (no chain lookup). */
export function verifyNep413(publicKey: string, message: string, recipient: string, nonce: Uint8Array, signature: Uint8Array): boolean {
  const raw = ed25519Bytes(publicKey);
  if (!raw || signature.length !== 64) return false;
  const spki = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(raw)]);
  try {
    return verify(null, Buffer.from(nep413Digest(message, recipient, nonce)), createPublicKey({ key: spki, format: "der", type: "spki" }), Buffer.from(signature));
  } catch {
    return false;
  }
}

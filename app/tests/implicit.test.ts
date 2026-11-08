// Implicit accounts: an unfunded 64-hex account has no keys on chain, so "Confirm it's you" checks the NEP-413
// signature against the key the account id names.
import { describe, expect, it } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";
import { isImplicitAccount, keyNamesImplicitAccount, nep413Digest, verifyNep413 } from "../src/server/implicit";

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function b58(bytes: Uint8Array): string {
  let n = BigInt("0x" + Buffer.from(bytes).toString("hex"));
  let s = "";
  while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; }
  for (const b of bytes) { if (b === 0) s = "1" + s; else break; }
  return s;
}
function keypair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const raw = publicKey.export({ format: "der", type: "spki" }).subarray(12);
  return { raw: new Uint8Array(raw), pk: `ed25519:${b58(new Uint8Array(raw))}`, privateKey };
}

describe("implicit accounts", () => {
  const k = keypair();
  const account = Buffer.from(k.raw).toString("hex");
  const nonce = new Uint8Array(32).fill(7);
  const msg = "accord:session:v1:" + account + ":1";
  const sig = new Uint8Array(sign(null, Buffer.from(nep413Digest(msg, "accord-session", nonce)), k.privateKey));

  it("recognises a 64-hex id", () => {
    expect(isImplicitAccount(account)).toBe(true);
    expect(isImplicitAccount("northwind.testnet")).toBe(false);
  });
  it("matches the key the id names, and only that key", () => {
    expect(keyNamesImplicitAccount(account, k.pk)).toBe(true);
    expect(keyNamesImplicitAccount(account, keypair().pk)).toBe(false);
  });
  it("verifies a NEP-413 signature with the raw key", () => {
    expect(verifyNep413(k.pk, msg, "accord-session", nonce, sig)).toBe(true);
    expect(verifyNep413(k.pk, msg + "x", "accord-session", nonce, sig)).toBe(false);
    expect(verifyNep413(keypair().pk, msg, "accord-session", nonce, sig)).toBe(false);
  });
});

// The digest matches near-api-js's own NEP-413 signing, so wallet signatures verify.
import { describe, expect, it } from "vitest";
import { KeyPair, KeyPairSigner } from "near-api-js";
import { verifyNep413 } from "../src/server/implicit";

describe("NEP-413 digest", () => {
  it("verifies a signature produced by near-api-js", async () => {
    const kp = KeyPair.fromRandom("ed25519");
    const signer = new KeyPairSigner(kp);
    const nonce = new Uint8Array(32).fill(3);
    const s = await signer.signNep413Message("x.testnet", { message: "hello", recipient: "accord-session", nonce });
    expect(verifyNep413(kp.getPublicKey().toString(), "hello", "accord-session", nonce, s.signature)).toBe(true);
  });
});

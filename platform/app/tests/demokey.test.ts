// The demo agent's key is derived, not stored: the same seed and room always give the same valid ed25519 key pair,
// and a different room or seed gives a different one.
import { describe, expect, it } from "vitest";
import { KeyPair, type KeyPairString } from "near-api-js";
import { deriveAgentKey } from "../src/server/demokey";

const SEED = "x".repeat(32);

describe("deriveAgentKey", () => {
  it("is deterministic and a valid key pair", () => {
    const a = deriveAgentKey(SEED, "a7.accord-v2.testnet");
    expect(deriveAgentKey(SEED, "a7.accord-v2.testnet")).toEqual(a);
    const kp = KeyPair.fromString(a.secretKey as KeyPairString);
    expect(kp.getPublicKey().toString()).toBe(a.publicKey);
    const msg = new TextEncoder().encode("act");
    expect(kp.verify(msg, kp.sign(msg).signature)).toBe(true);
  });
  it("differs per room and per seed", () => {
    const a = deriveAgentKey(SEED, "a7.accord-v2.testnet").publicKey;
    expect(deriveAgentKey(SEED, "a8.accord-v2.testnet").publicKey).not.toBe(a);
    expect(deriveAgentKey("y".repeat(32), "a7.accord-v2.testnet").publicKey).not.toBe(a);
  });
});

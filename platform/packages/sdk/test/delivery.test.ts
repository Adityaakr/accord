import { describe, expect, it } from "vitest";
import { PLACEHOLDER_EVIDENCE, demoDelivery, demoDeliveryPath, isDemoEvidence, sha256Hex } from "../src/index.js";

describe("demo delivery evidence", () => {
  it("is sha256 of the served document, 64 hex characters as submit_delivery requires", () => {
    const d = demoDelivery("a10.accord-v2.testnet", 1);
    expect(d.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(d.hash).toBe(sha256Hex(d.document));
    expect(JSON.parse(d.document)).toMatchObject({ type: "accord-demo-delivery", agreement: "a10.accord-v2.testnet", item: 1 });
  });
  it("is deterministic and differs per agreement and item", () => {
    expect(demoDelivery("a1.x.testnet", 1)).toEqual(demoDelivery("a1.x.testnet", 1));
    expect(demoDelivery("a1.x.testnet", 1).hash).not.toBe(demoDelivery("a1.x.testnet", 2).hash);
    expect(demoDelivery("a1.x.testnet", 1).hash).not.toBe(demoDelivery("a2.x.testnet", 1).hash);
  });
  it("recognises the demo and placeholder hashes only", () => {
    expect(isDemoEvidence(PLACEHOLDER_EVIDENCE)).toBe(true);
    expect(isDemoEvidence(demoDelivery("a1.x.testnet", 3).hash, "a1.x.testnet", 3)).toBe(true);
    expect(isDemoEvidence("ab".repeat(32), "a1.x.testnet", 3)).toBe(false);
    expect(demoDeliveryPath("a1.x.testnet", 3)).toBe("/app/api/deliveries/a1.x.testnet/3");
  });
});

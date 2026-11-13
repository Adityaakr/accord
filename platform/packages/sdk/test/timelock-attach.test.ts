import { describe, expect, it } from "vitest";
import { newBidderKey, signTimelock, verifyTimelock } from "../src/tender.js";

describe("attaching a timelock to a bid on the board", () => {
  const k = newBidderKey(), other = newBidderKey();
  const c = "ab".repeat(32), sha = "cd".repeat(32);
  it("is signed by the bid's own key over the board, job, commitment and ciphertext", () => {
    const sig = signTimelock(k, "tender-v2.accord-v2.testnet", 20, c, sha);
    expect(verifyTimelock(k.id, "tender-v2.accord-v2.testnet", 20, c, sha, sig)).toBe(true);
    // another key, job, commitment or ciphertext does not verify, so nobody replaces another bidder's lock
    expect(verifyTimelock(other.id, "tender-v2.accord-v2.testnet", 20, c, sha, sig)).toBe(false);
    expect(verifyTimelock(k.id, "tender-v2.accord-v2.testnet", 21, c, sha, sig)).toBe(false);
    expect(verifyTimelock(k.id, "tender-v2.accord-v2.testnet", 20, "ef".repeat(32), sha, sig)).toBe(false);
    expect(verifyTimelock(k.id, "tender-v2.accord-v2.testnet", 20, c, "00".repeat(32), sig)).toBe(false);
    expect(verifyTimelock(k.id, "tender-v2.accord-v2.testnet", 20, c, sha, "zz")).toBe(false);
  });
});

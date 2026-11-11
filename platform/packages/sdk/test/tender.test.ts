// The SDK's sealed bids match the board contract byte for byte (the vector is asserted in
// contracts/tender-board/src/tests.rs too), and the client-side checks reject what the board would reject.
import { describe, expect, it } from "vitest";
import { bidderKey, bidderNearKey, commitment, prepareBid, secondsLeft, verifyBidSignature, winningBid, type TenderJob } from "../src/tender.js";

const BOARD = "tender.accord-v2.testnet";
const seed = "01".repeat(32);
const salt = "65".repeat(32); // 101 as a byte

describe("open tender bids", () => {
  it("matches the contract's commitment and signature", () => {
    const k = bidderKey(seed);
    expect(k.id).toBe("8a88e3dd7409f195fd52db2d3cba5d72ca6709bf1d94121bf3748801b40f6f5c");
    expect(commitment(BOARD, 1, k.id, 40_000_000n, salt)).toBe("944d44b1b9123241be942c13fa74576b0e2bb77657104c64083b226dd918f556");
    const b = prepareBid({ board: BOARD, job: 1, price: 40_000_000n, agent: "agent", key: k, nonce: 1, salt });
    expect(b.signature).toBe("cb5bd0a83fbcc9298e427d656f0332a27d745b06a18bfd16a16c24adfb2c3368eb9312d905743628acb8653613efc81a7a54937936b9e519dd8f6279a4559e04");
    expect(verifyBidSignature(b)).toBe(true);
  });
  it("rejects an altered bid and bad input", () => {
    const b = prepareBid({ board: BOARD, job: 1, price: 5n, agent: "a", key: bidderKey(seed) });
    expect(verifyBidSignature({ ...b, commitment: "00".repeat(32) })).toBe(false);
    expect(verifyBidSignature({ ...b, job: 2 })).toBe(false);
    expect(verifyBidSignature({ ...b, signature: "zz" })).toBe(false);
    expect(() => prepareBid({ board: BOARD, job: 1, price: 0n, agent: "a", key: bidderKey(seed) })).toThrow("more than 0");
    expect(() => prepareBid({ board: BOARD, job: 1, price: 1n, agent: "a:b", key: bidderKey(seed) })).toThrow("agent label");
  });
  it("gives the same key as a NEAR key string for the implicit account", () => {
    expect(bidderNearKey(bidderKey(seed))).toMatch(/^ed25519:[1-9A-HJ-NP-Za-km-z]{80,90}$/);
  });
  it("reads the winner and the time left", () => {
    const j = { phase: "open", commit_ends: 10_000 * 1e6, reveal_ends: 0, winner: "x", bids: [{ bidder: "x" }] } as unknown as TenderJob;
    expect(secondsLeft(j, 4_000)).toBe(6);
    expect(winningBid(j)?.bidder).toBe("x");
  });
});

import { addBidSecret, isBoardId, nextNonce, parseBidSecrets, secretFor, validAgentLabel } from "../src/tender.js";

describe("bid secrets and labels (audit fixes)", () => {
  it("keeps every submission by commitment, so the bid on chain can be revealed", () => {
    const k = bidderKey(seed);
    const a = prepareBid({ board: BOARD, job: 4, price: 30n, agent: "a", key: k, nonce: 10 });
    const b = prepareBid({ board: BOARD, job: 4, price: 25n, agent: "a", key: k, nonce: 11 });
    const kept = addBidSecret(addBidSecret(null, a), b);
    expect(parseBidSecrets(kept)?.entries).toHaveLength(2);
    // the second relay failed: the first is what the board holds, and it is still revealable
    expect(secretFor(kept, { bidder: k.id, commitment: a.commitment })?.price).toBe("30");
    expect(secretFor(kept, { bidder: k.id, commitment: "00".repeat(32) })).toBeNull();
    expect(nextNonce(kept, 10, Date.UTC(2026, 0, 1))).toBe(12);
  });
  it("reads the single-entry file written before the fix", () => {
    const old = JSON.stringify({ bidder: "x", price: "5", salt: "s", commitment: "c", nonce: 3 });
    expect(secretFor(old, { bidder: "x", commitment: "c" })?.price).toBe("5");
  });
  it("accepts only labels the board stores as signed", () => {
    for (const ok of ["my agent-1.0_x", "a"]) expect(validAgentLabel(ok)).toBe(true);
    for (const bad of ["agent\u0085", " a", "a ", "a:b", "", "x".repeat(65), "​x"]) expect(validAgentLabel(bad)).toBe(false);
    expect(() => prepareBid({ board: BOARD, job: 1, price: 1n, agent: "a", key: bidderKey(seed), salt: "zz" })).toThrow("salt");
  });
  it("checks a board id before it goes into a path", () => {
    expect(isBoardId("tender-v2.accord-v2.testnet")).toBe(true);
    for (const bad of ["../x", "a/b", "A.testnet", ""]) expect(isBoardId(bad)).toBe(false);
  });
});

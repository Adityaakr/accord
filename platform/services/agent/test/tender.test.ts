// The house tender keeper decides from the board alone: post only when no house job runs and the interval passed,
// bid each house agent once while open, reveal what it bid, ask for the award when the board allows it. Its bids
// are reproducible from the seed, so a restart reveals the same price and salt.
import { describe, expect, it } from "vitest";
import { commitment, type TenderJob } from "@accord/sdk";
import { HOUSE_AGENTS, houseBid, nextActions, type TenderKeeperConfig } from "../src/tender.js";

const cfg: TenderKeeperConfig = {
  board: "tender.accord-v2.testnet", buyer: { account: "house.testnet", key: "ed25519:x" }, houseSeed: "07".repeat(32),
  token: "t.testnet", everyMin: 60, commitSecs: 900, revealSecs: 300,
};
const NOW = 10_000_000_000;
const job = (over: Partial<TenderJob>): TenderJob => ({
  id: 5, buyer: "house.testnet", title: "t", spec: "", evidence_hash: "", budget: "40000000", token: "t", created_at: (NOW - 1000) * 1e6,
  commit_ends: 0, reveal_ends: 0, phase: "open", bids: [], winner: null, agreement: null, ...over,
});
const bidOf = (i: number, price: string | null) => {
  const h = houseBid(cfg.houseSeed, cfg.board, 5, i);
  return { bidder: h.key.id, agent: h.agent, commitment: commitment(cfg.board, 5, h.key.id, h.price, h.salt), nonce: 1, committed_at: 0, price, revealed_at: null };
};

describe("house tender keeper", () => {
  it("posts when nothing of its own runs and the interval has passed, not before", () => {
    expect(nextActions(cfg, [], NOW)).toEqual([{ kind: "post" }]);
    expect(nextActions(cfg, [job({ phase: "linked" })], NOW)).toEqual([]);
    expect(nextActions(cfg, [job({ phase: "awarded", created_at: (NOW - 61 * 60_000) * 1e6 })], NOW)).toEqual([{ kind: "post" }]);
    expect(nextActions(cfg, [job({ buyer: "someone.testnet", phase: "open" })], NOW)).toEqual([{ kind: "post" }]);
  });
  it("bids each house agent once while open, then reveals, then awards", () => {
    expect(nextActions(cfg, [job({})], NOW).filter((a) => a.kind === "bid")).toHaveLength(HOUSE_AGENTS.length);
    expect(nextActions(cfg, [job({ bids: [bidOf(0, null), bidOf(1, null), bidOf(2, null)] })], NOW)).toEqual([]);
    expect(nextActions(cfg, [job({ phase: "revealing", bids: [bidOf(0, null), bidOf(1, "1"), bidOf(2, "1")] })], NOW)).toEqual([{ kind: "reveal", job: 5, agent: 0 }]);
    expect(nextActions(cfg, [job({ phase: "revealing", bids: [bidOf(0, "1"), bidOf(1, "1"), bidOf(2, "1")] })], NOW)).toEqual([{ kind: "award", job: 5 }]);
    expect(nextActions(cfg, [job({ phase: "closed" })], NOW)).toEqual([{ kind: "award", job: 5 }]);
  });
  it("derives the same key, salt and price after a restart, each under the budget", () => {
    for (let i = 0; i < 3; i++) {
      const a = houseBid(cfg.houseSeed, cfg.board, 9, i), b = houseBid(cfg.houseSeed, cfg.board, 9, i);
      expect(a).toEqual(b);
      expect(a.price <= 40_000_000n && a.price > 30_000_000n).toBe(true);
    }
    expect(houseBid(cfg.houseSeed, cfg.board, 9, 0).salt).not.toBe(houseBid(cfg.houseSeed, cfg.board, 10, 0).salt);
  });
});

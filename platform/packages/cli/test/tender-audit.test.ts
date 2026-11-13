// Audit findings in `accord tender`, kept as regression tests after the fix (11 Nov 2026).
import { describe, expect, it } from "vitest";
import { parseBidSecrets, type TenderJob } from "@accord/sdk";
import { runTender, type TenderDeps } from "../src/tender.js";
import type { Ctx } from "../src/commands.js";
import { parseArgv } from "../src/args.js";

const BOARD = "tender.accord-v2.testnet";
const job = (over: Partial<TenderJob> = {}): TenderJob => ({
  id: 3, buyer: "b.testnet", title: "t", spec: "", evidence_hash: "11".repeat(32), budget: "40000000", token: "tusdc.accord-v1.testnet",
  created_at: 0, commit_ends: (Date.now() + 60_000) * 1e6, reveal_ends: (Date.now() + 120_000) * 1e6, phase: "open", bids: [], winner: null, agreement: null, ...over,
});
function setup(j: TenderJob, relay: TenderDeps["relay"]) {
  const files = new Map<string, string>();
  const d: TenderDeps = {
    board: { board: BOARD, job: async () => j, jobs: async () => [j] }, relay, home: "/h",
    readText: async (p) => files.get(p) ?? null,
    writeSecret: async (p, c) => { files.set(p, c); }, sleep: async () => undefined,
    post: async () => ({}), appUrl: "https://app.test/app", ops: () => { throw new Error("no agreement in this test"); }, runDeliver: async () => "", now: () => 0, lockBid: async () => "-----BEGIN AGE ENCRYPTED FILE-----test",
  };
  const ctx = (argv: string[]): Ctx => {
    const args = parseArgv(argv);
    return { deps: {} as Ctx["deps"], args, rest: args.positionals.slice(1), env: {}, out: { block: () => undefined, warn: () => undefined, fail: () => undefined } };
  };
  return { d, files, ctx };
}

describe("accord tender audit regressions", () => {
  it("a refused re-bid must not overwrite the secret of the bid still on chain", async () => {
    let calls = 0;
    const s = setup(job(), async () => { if (++calls > 1) throw new Error("relay: a newer bid from this key is already on the board"); return { tx: "TX" }; });
    await runTender(s.ctx(["tender", "bid", "3", "--price", "34", "--agent", "a"]), s.d);
    const first = parseBidSecrets(s.files.get(`/h/.accord/tender-bids/${BOARD}/3.json`)!)!.entries[0]!;
    await runTender(s.ctx(["tender", "bid", "3", "--price", "33", "--agent", "a"]), s.d).catch(() => undefined);
    // the bid on chain is still the first one, and its price and salt are still kept
    const kept = parseBidSecrets(s.files.get(`/h/.accord/tender-bids/${BOARD}/3.json`)!)!.entries;
    expect(kept.find((e) => e.commitment === first.commitment)).toEqual(first);
  });
  it("an unreadable bidder.json must not be replaced by a new key", async () => {
    const s = setup(job(), async () => ({ tx: "TX" }));
    s.files.set("/h/.accord/bidder.json", "{ truncated");
    await runTender(s.ctx(["tender", "bid", "3", "--price", "34", "--agent", "a"]), s.d).catch(() => undefined);
    expect(s.files.get("/h/.accord/bidder.json")).toBe("{ truncated");
  });
});

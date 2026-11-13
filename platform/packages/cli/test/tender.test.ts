// `accord tender`: a bid is made with the local key, sealed (no price leaves the machine before the reveal), kept for
// the reveal in a 0600 file, and sent to the relay; the reveal sends exactly the kept price and salt.
import { describe, expect, it } from "vitest";
import { commitment, verifyBidSignature, type TenderJob } from "@accord/sdk";
import { runTender, type TenderDeps } from "../src/tender.js";
import type { Ctx } from "../src/commands.js";
import { parseArgv } from "../src/args.js";

const BOARD = "tender.accord-v2.testnet";
const job = (over: Partial<TenderJob> = {}): TenderJob => ({
  id: 3, buyer: "b.testnet", title: "t", spec: "", evidence_hash: "11".repeat(32), budget: "40000000", token: "tusdc.accord-v1.testnet",
  created_at: 0, commit_ends: (Date.now() + 60_000) * 1e6, reveal_ends: (Date.now() + 120_000) * 1e6, phase: "open", bids: [], winner: null, agreement: null, ...over,
});

function setup(j: TenderJob) {
  const files = new Map<string, string>();
  const sent: { path: string; body: Record<string, unknown> }[] = [];
  const lines: string[] = [];
  const d: TenderDeps = {
    board: { board: BOARD, job: async () => j, jobs: async () => [j] },
    relay: async (path, body) => { sent.push({ path, body: body as Record<string, unknown> }); return { tx: "TX" }; },
    home: "/h",
    readText: async (p) => files.get(p) ?? null,
    writeSecret: async (p, c) => { files.set(p, c); },
    sleep: async () => undefined,
    post: async (path: string, body: object) => { sent.push({ path, body: body as Record<string, unknown> }); return {}; },
    appUrl: "https://app.test/app",
    ops: () => { throw new Error("no agreement in this test"); },
    runDeliver: async () => "",
    now: () => 0, lockBid: async () => "-----BEGIN AGE ENCRYPTED FILE-----test",
  };
  const ctx = (argv: string[]): Ctx => {
    const args = parseArgv(argv);
    return { deps: {} as Ctx["deps"], args, rest: args.positionals.slice(1), env: {}, out: { block: (l) => lines.push(...l), warn: (t) => lines.push(t), fail: () => undefined } };
  };
  return { d, files, sent, lines, ctx };
}

describe("accord tender", () => {
  it("bids sealed with a new local key and keeps the secret for the reveal", async () => {
    const s = setup(job());
    expect(await runTender(s.ctx(["tender", "bid", "3", "--price", "34.5", "--agent", "my-agent"]), s.d)).toBe(0);
    const key = JSON.parse(s.files.get("/h/.accord/bidder.json")!);
    const kept = JSON.parse(s.files.get(`/h/.accord/tender-bids/${BOARD}/3.json`)!).entries[0];
    expect(kept.price).toBe("34500000");
    const body = s.sent[0]!.body;
    expect(s.sent[0]!.path).toBe("3/bids");
    expect(JSON.stringify(body)).not.toContain("34500000"); // the price never leaves before the reveal
    expect(body.timelock).toContain("AGE ENCRYPTED FILE"); // Accord can reveal it if this agent goes offline
    expect(body.bidder).toBe(key.id);
    expect(body.commitment).toBe(commitment(BOARD, 3, key.id, 34_500_000n, kept.salt));
    expect(verifyBidSignature({ board: BOARD, job: 3, ...(body as { bidder: string; agent: string; commitment: string; nonce: number; signature: string }) })).toBe(true);
  });
  it("reveals the kept entry that opens the bid on chain", async () => {
    const j = job();
    const s = setup(j);
    await runTender(s.ctx(["tender", "bid", "3", "--price", "1", "--agent", "a"]), s.d);
    const file = JSON.parse(s.files.get(`/h/.accord/tender-bids/${BOARD}/3.json`)!);
    const kept = file.entries[0];
    j.bids = [{ bidder: file.bidder, agent: "a", commitment: kept.commitment, nonce: kept.nonce, committed_at: 0, price: null, revealed_at: null, bond_payer: "r.testnet", bond_held: true }];
    await runTender(s.ctx(["tender", "reveal", "3"]), s.d);
    expect(s.sent[1]).toEqual({ path: "3/reveal", body: { bidder: file.bidder, price: "1000000", salt: kept.salt } });
  });
  it("refuses to bid on a job that is not open, and warns above the budget", async () => {
    const closed = setup(job({ phase: "revealing" }));
    await expect(runTender(closed.ctx(["tender", "bid", "3", "--price", "1", "--agent", "a"]), closed.d)).rejects.toThrow("revealing");
    const over = setup(job());
    await runTender(over.ctx(["tender", "bid", "3", "--price", "41", "--agent", "a"]), over.d);
    expect(over.lines.join("\n")).toContain("above the budget");
  });
});

describe("accord tender on a NEAR job", () => {
  it("parses the price with the job token's 24 decimals, never 6", async () => {
    const s = setup(job({ token: "wrap.testnet", budget: "40000000000000000000000000" }));
    await runTender(s.ctx(["tender", "bid", "3", "--price", "2.5", "--agent", "near-agent"]), s.d);
    const kept = JSON.parse(s.files.get(`/h/.accord/tender-bids/${BOARD}/3.json`)!).entries[0];
    expect(kept.price).toBe("2500000000000000000000000");
  });
});

describe("accord tender: joining a dashboard without a pasted link", () => {
  it("bid --account asks to join that account's agents, signed by the bidder key", async () => {
    const { verifyLink } = await import("@accord/sdk");
    const s = setup(job());
    await runTender(s.ctx(["tender", "bid", "3", "--price", "1", "--agent", "my-agent", "--account", "Adi.testnet"]), s.d);
    const claim = s.sent.find((x) => x.path === "agents/claims")!.body as { account: string; bidder: string; label: string; signature: string };
    expect(claim).toMatchObject({ account: "adi.testnet", label: "my-agent", source: "cli" });
    expect(verifyLink(claim.bidder, "adi.testnet", claim.signature)).toBe(true);
    expect(s.lines.join("\n")).toContain("approve it at https://app.test/app/tenders/agents");
  });
  it("link sends the claim instead of printing a link to paste", async () => {
    const s = setup(job());
    await runTender(s.ctx(["tender", "link", "adi.testnet"]), s.d);
    expect(s.sent.map((x) => x.path)).toEqual(["agents/claims"]);
    expect(s.lines.join("\n")).not.toContain("sig=");
  });
});

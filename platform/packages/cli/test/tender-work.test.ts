// `accord tender work`: a winning key finishes the job on its own. Against a simulated agreement (the buyer moves
// whenever it is its turn), the agent names its approver and payee with signatures the app can check, seals its
// winning price as the floor, approves, proves and approves its payee, delivers the output of --deliver (published
// and recorded by the same sha256), and claims each accepted item until all are paid.
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyDelivery, verifyWinner, type AgreementView, type ItemView, type Mandate, type RecipientVersion, type TenderJob } from "@accord/sdk";
import { runTender, type TenderDeps } from "../src/tender.js";
import type { WorkOps } from "../src/tenderwork.js";
import type { Ctx } from "../src/commands.js";
import { parseArgv } from "../src/args.js";

const BOARD = "tender-v2.accord-v2.testnet";

function simulated() {
  const a = {
    state: "Sealed", negotiation: "AwaitingMandates", approvals: { buyer: false, vendor: false }, terms_hash: null as string | null,
    recipient: null as AgreementView["recipient"], funded: "0", total: "20", params: { claim_delay_secs: 120 }, now: 1000,
  };
  const sealed = { buyer: false, vendor: false };
  const recipients: RecipientVersion[] = [];
  const items: ItemView[] = [1, 2].map((id) => ({
    id, amount: "10", due_amount: "10", due_offset_secs: 60, due_at: null, evidence: "DeliveryAccepted", status: "Open", delivery: null,
    eligible_at: null, exception: null, exception_used: false, pending_exception: null, settled: "0",
  }) as ItemView);
  const calls: string[] = [];
  let mandate: Mandate | null = null;
  const delivered: { item: number; sha: string; uri: string }[] = [];
  // the buyer and the jobs: whatever is the buyer's (or the enclave's) move happens on the next reading
  const world = () => {
    a.now += 200;
    if (a.state === "Sealed" && sealed.vendor && !sealed.buyer) sealed.buyer = true;
    else if (a.state === "Sealed" && a.negotiation === "Requested") { a.state = "Attested"; a.terms_hash = "T"; }
    else if (a.state === "Attested" && a.approvals.vendor) { a.approvals.buyer = true; a.state = "Executing"; }
    const v = recipients.at(-1);
    if (v?.status === "Proposed") v.status = "Proven";
    else if (v?.status === "AuthorityApproved") { v.status = "Accepted"; v.active_at = a.now - 1; }
    else if (v?.status === "Active" && a.funded === "0") a.funded = "20";
    for (const it of items) if (it.status === "Delivered") { it.status = "Eligible"; it.eligible_at = a.now; }
  };
  const ops: WorkOps = {
    view: async () => {
      world();
      if (sealed.buyer && sealed.vendor && a.negotiation === "AwaitingMandates") a.negotiation = { Ready: { attempts: 0 } } as never;
      return { agreement: a as unknown as AgreementView, sealed: { ...sealed }, recipients: recipients.map((r) => ({ ...r })), items: items.map((i) => ({ ...i })), now: a.now };
    },
    seal: async (m) => { mandate = m; sealed.vendor = true; calls.push("seal"); return "tx-seal"; },
    negotiate: async () => { a.negotiation = "Requested" as never; calls.push("negotiate"); return "tx-neg"; },
    approve: async () => { a.approvals.vendor = true; calls.push("approve"); return "tx-approve"; },
    propose: async (r, domain) => {
      recipients.push({ version: 1, account: r, domain, status: "Proposed", rating: "allow", reasons: [], failure: null, proposed_at: 0, active_at: null, proof: null });
      calls.push("propose"); return "tx-propose";
    },
    authorityApprove: async (v) => { recipients[v - 1]!.status = "AuthorityApproved"; calls.push("authority"); return "tx-auth"; },
    activate: async (v) => { recipients[v - 1]!.status = "Active"; a.recipient = { version: v, account: recipients[v - 1]!.account, domain: "d" }; calls.push("activate"); return "tx-act"; },
    deliver: async (item, sha, uri) => { delivered.push({ item, sha, uri }); items[item - 1]!.status = "Delivered"; calls.push(`deliver ${item}`); return `tx-d${item}`; },
    claim: async (item) => { items[item - 1]!.status = "Paid"; calls.push(`claim ${item}`); return { tx: `tx-c${item}`, status: "sent", code: null }; },
  };
  return { ops, calls, delivered, mandate: () => mandate, recipients };
}

describe("accord tender work", () => {
  it("takes a winning key from the award to every item paid", async () => {
    const files = new Map<string, string>();
    const posts: { path: string; body: Record<string, unknown> }[] = [];
    const lines: string[] = [];
    const sim = simulated();
    const vendorSeed = "05".repeat(32);
    files.set("/h/.accord/bidder.json", JSON.stringify({ seed: vendorSeed }));
    const { bidderKey } = await import("@accord/sdk");
    const vendor = bidderKey(vendorSeed);
    let reads = 0;
    const job = (): TenderJob => ({
      id: 9, buyer: "buyer.testnet", title: "Inference buy", spec: "s", evidence_hash: "11".repeat(32), budget: "20000000", token: "tusdc.accord-v1.testnet",
      created_at: 0, commit_ends: 0, reveal_ends: 0, phase: reads++ < 2 ? "awarded" : "linked", winner: vendor.id, agreement: reads > 2 ? "a99.accord-v2.testnet" : null,
      bids: [{ bidder: vendor.id, agent: "deepinfra-agent", commitment: "c", nonce: 1, committed_at: 0, price: "15750000", revealed_at: 0, bond_payer: "r", bond_held: false }],
    });
    const deliverEnv: Record<string, string>[] = [];
    const d: TenderDeps = {
      board: { board: BOARD, job: async () => job(), jobs: async () => [job()] },
      relay: async () => ({ tx: "TX" }),
      post: async (path, body) => {
        posts.push({ path, body: body as Record<string, unknown> });
        if (path === "9/winner") return { ok: true, setup: { domain: "demo.example" }, txs: ["fund-tx"] };
        const b = body as { body: string };
        return { ok: true, sha256: createHash("sha256").update(b.body).digest("hex"), path: `/api/tenders/deliveries/a99.accord-v2.testnet/${(body as { item: number }).item}` };
      },
      appUrl: "https://app.test/app", home: "/h",
      readText: async (p) => files.get(p) ?? null,
      writeSecret: async (p, c) => { files.set(p, c); },
      sleep: async () => undefined,
      ops: () => sim.ops,
      runDeliver: async (cmd, env) => { deliverEnv.push(env); return `inference report for item ${env.ACCORD_ITEM} (${cmd})\n`; },
      now: () => 0, lockBid: async () => "-----BEGIN AGE ENCRYPTED FILE-----test",
    };
    const args = parseArgv(["tender", "work", "9", "--deliver", "./run.sh"]);
    const ctx: Ctx = { deps: {} as Ctx["deps"], args, rest: args.positionals.slice(1), env: {}, out: { block: (l) => lines.push(...l), warn: (t) => lines.push(t), fail: () => undefined } };

    expect(await runTender(ctx, d)).toBe(0);
    expect(sim.calls).toEqual(["seal", "negotiate", "approve", "propose", "authority", "activate", "deliver 1", "claim 1", "deliver 2", "claim 2"]);
    // the winning price is the floor and the target
    expect(sim.mandate()!.limits).toMatchObject({ min_total: "15750000", target_total: "15750000" });

    // the approver and payee were named with signatures the app checks, and kept for later runs
    const w = posts.find((p) => p.path === "9/winner")!.body as { bidder: string; authority: string; recipient: string; signature: string; recipient_signature: string };
    expect(w.bidder).toBe(vendor.id);
    expect(verifyWinner(vendor.id, BOARD, 9, w.authority, w.recipient, w.signature)).toBe(true);
    expect(verifyWinner(w.recipient, BOARD, 9, w.authority, w.recipient, w.recipient_signature)).toBe(true);
    expect(verifyWinner(w.authority, BOARD, 9, w.authority, w.recipient, (w as unknown as { authority_signature: string }).authority_signature)).toBe(true);
    // asked once on the award and again once the agreement is linked (when the app funds the accounts)
    expect(posts.filter((p) => p.path === "9/winner")).toHaveLength(2);
    expect(JSON.parse(files.get(`/h/.accord/tender-work/${BOARD}/9.json`)!)).toMatchObject({ vendor: vendor.id });
    expect(sim.recipients[0]).toMatchObject({ account: w.recipient, domain: "demo.example" });

    // each delivery is the --deliver output: published with the vendor key's signature, recorded by the same sha256
    const pub = posts.filter((p) => p.path === "9/deliveries").map((p) => p.body as { item: number; body: string; signature: string; agreement: string });
    expect(pub.map((p) => p.item)).toEqual([1, 2]);
    for (const [i, p] of pub.entries()) {
      const sha = createHash("sha256").update(p.body).digest("hex");
      expect(verifyDelivery(vendor.id, "a99.accord-v2.testnet", p.item, sha, p.signature)).toBe(true);
      expect(sim.delivered[i]).toEqual({ item: p.item, sha, uri: `https://app.test/app/api/tenders/deliveries/a99.accord-v2.testnet/${p.item}` });
    }
    expect(deliverEnv[0]).toMatchObject({ ACCORD_JOB: "9", ACCORD_ITEM: "1", ACCORD_AGREEMENT: "a99.accord-v2.testnet", ACCORD_TITLE: "Inference buy" });
    expect(lines.join("\n")).toContain("every item is paid");
  });

  it("stops at the first delivery and says how, when no --deliver was given", async () => {
    const sim = simulated();
    const { bidderKey } = await import("@accord/sdk");
    const vendor = bidderKey("06".repeat(32));
    const files = new Map([["/h/.accord/bidder.json", JSON.stringify({ seed: "06".repeat(32) })]]);
    const lines: string[] = [];
    const j: TenderJob = {
      id: 9, buyer: "b.testnet", title: "t", spec: "", evidence_hash: "", budget: "20000000", token: "tusdc.accord-v1.testnet", created_at: 0, commit_ends: 0, reveal_ends: 0,
      phase: "linked", winner: vendor.id, agreement: "a99.accord-v2.testnet",
      bids: [{ bidder: vendor.id, agent: "x", commitment: "c", nonce: 1, committed_at: 0, price: "15000000", revealed_at: 0, bond_payer: "r", bond_held: false }],
    };
    const d = {
      board: { board: BOARD, job: async () => j, jobs: async () => [j] }, relay: async () => ({ tx: "TX" }),
      post: async () => ({ setup: { domain: "demo.example" }, txs: [] }), appUrl: "https://app.test/app", home: "/h",
      readText: async (p: string) => files.get(p) ?? null, writeSecret: async (p: string, c: string) => { files.set(p, c); }, sleep: async () => undefined,
      ops: () => sim.ops, runDeliver: async () => "x", now: () => 0, lockBid: async () => "-----BEGIN AGE ENCRYPTED FILE-----test",
    } satisfies TenderDeps;
    const args = parseArgv(["tender", "work", "9"]);
    const ctx: Ctx = { deps: {} as Ctx["deps"], args, rest: args.positionals.slice(1), env: {}, out: { block: (l) => lines.push(...l), warn: () => undefined, fail: () => undefined } };
    expect(await runTender(ctx, d)).toBe(0);
    expect(sim.calls).not.toContain("deliver 1");
    expect(lines.join("\n")).toContain('--deliver "<command that prints the work>"');
  });

  it("does nothing for a key that did not win", async () => {
    const files = new Map([["/h/.accord/bidder.json", JSON.stringify({ seed: "07".repeat(32) })]]);
    const lines: string[] = [];
    const j = { id: 9, phase: "awarded", winner: "ff".repeat(32), agreement: null, bids: [] } as unknown as TenderJob;
    const d = {
      board: { board: BOARD, job: async () => j, jobs: async () => [j] }, relay: async () => ({ tx: "TX" }),
      post: async () => { throw new Error("must not register"); }, appUrl: "", home: "/h",
      readText: async (p: string) => files.get(p) ?? null, writeSecret: async () => undefined, sleep: async () => undefined,
      ops: () => { throw new Error("no"); }, runDeliver: async () => "", now: () => 0, lockBid: async () => "-----BEGIN AGE ENCRYPTED FILE-----test",
    } satisfies TenderDeps;
    const args = parseArgv(["tender", "work", "9"]);
    const ctx: Ctx = { deps: {} as Ctx["deps"], args, rest: args.positionals.slice(1), env: {}, out: { block: (l) => lines.push(...l), warn: () => undefined, fail: () => undefined } };
    expect(await runTender(ctx, d)).toBe(0);
    expect(lines.join("\n")).toContain("another bid won");
  });
});

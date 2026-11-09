// The room timeline parser (src/lib/activity.ts) on a real room: a21.accord-v2.testnet's 18 transactions as FastNEAR's
// /v0/transactions returned them on 9 Nov 2026 (tests/fixtures/a21-txs.json, trimmed to the fields the parser reads).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fromFastnear, fromRpc, outlayerJob, parseTx, timeline, type FastnearTx, type Parties } from "../src/lib/activity";

const txs = JSON.parse(readFileSync(path.join(__dirname, "fixtures/a21-txs.json"), "utf8")) as FastnearTx[];
const buyer = "f98a8a5dc91d9da29382fb6e6cd164d83d9bfd9b99cdad8a79be36bb5fdad2d1";
const p: Parties = { agreement: "a21.accord-v2.testnet", buyer, vendor: "halcyon-demo.testnet", authority: "halcyon-auth.testnet", keeper: "keeper.accord-v2.testnet" };
const rows = timeline(txs.map(fromFastnear), p);
const by = (event: string) => rows.filter((r) => r.event === event);

describe("room timeline from the agreement's transactions", () => {
  it("has every step of the room, newest first", () => {
    const events = [...rows].reverse().map((r) => r.event);
    expect(events).toEqual([
      "agreement_created", "mandate_committed", "mandate_committed", "negotiation_requested", "terms_proposed",
      "terms_approved", "terms_approved", "executing", "recipient_proposed", "funded",
      // the Payee proof lands when the enclave job answers, after the buyer funded and installed the key: receipt time
      "agent_key_installed", "recipient_proven", "recipient_approved", "recipient_accepted", "recipient_active", "delivery_submitted",
      "delivery_accepted", "payment_sent", "act_refused", "delivery_submitted", "delivery_accepted", "agent_key_revoked",
    ]);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1]!.at).toBeGreaterThanOrEqual(rows[i]!.at);
  });

  it("names who acted: the buyer through the relayer, the vendor, the authority, the enclave and the agent", () => {
    expect(by("agreement_created")[0]).toMatchObject({ actor: "buyer", label: "Room created" });
    expect(by("mandate_committed").map((r) => [r.label, r.actor])).toEqual(
      expect.arrayContaining([["Buyer's mandate sealed", "buyer"], ["Vendor's mandate sealed", "vendor"]]));
    expect(by("terms_approved").map((r) => r.actor).sort()).toEqual(["buyer", "vendor"]);
    expect(by("terms_proposed")[0]).toMatchObject({ actor: "enclave", amount: "35000000", unit: "token", detail: expect.stringContaining("3 items") });
    expect(by("recipient_approved")[0]).toMatchObject({ actor: "authority", account: "halcyon-mm.testnet" });
    expect(by("recipient_accepted")[0]).toMatchObject({ actor: "buyer" });
    expect(by("funded")[0]).toMatchObject({ actor: "buyer", amount: "35000000", group: "funds" });
    expect(by("delivery_submitted")[0]).toMatchObject({ actor: "vendor", item: 2 });
  });

  it("carries the OutLayer job id on the negotiation and on the payee proof", () => {
    expect(by("negotiation_requested")[0]).toMatchObject({ job: 14510, label: "Negotiation requested · attempt 1" });
    expect(by("terms_proposed")[0]!.job).toBe(14510);
    expect(by("terms_proposed")[0]!.at).toBeGreaterThan(by("negotiation_requested")[0]!.at);
    expect(by("recipient_proven")[0]).toMatchObject({ job: 14511, actor: "enclave", detail: "useaccord.tech · rated allow" });
    expect(by("funded")[0]!.job).toBeNull();
  });

  it("shows the agent's payment, its refusal in red, and the revocation in red", () => {
    expect(by("payment_sent")[0]).toMatchObject({ actor: "agent", amount: "16500000", account: "halcyon-mm.testnet", item: 1, red: false, detail: "transfer settled", group: "payments" });
    expect(by("payment_settled")).toHaveLength(0);
    expect(by("act_refused")[0]).toMatchObject({ actor: "agent", code: "ERR_PAYEE_MISMATCH", amount: "13500000", account: "halcyon-markets.testnet", red: true, group: "refusals" });
    expect(by("agent_key_revoked")[0]).toMatchObject({ actor: "buyer", red: true, label: "Agent key revoked" });
    expect(by("agent_key_installed")[0]).toMatchObject({ actor: "buyer", red: false });
    expect(rows.filter((r) => r.red).map((r) => r.event).sort()).toEqual(["act_refused", "agent_key_revoked"]);
  });

  it("ignores other contracts' events in the same transaction (the factory, the token, OutLayer)", () => {
    expect(rows.some((r) => ["agreement_registered", "recipient_reported", "ft_transfer", "execution_requested"].includes(r.event))).toBe(false);
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });

  it("reads the same rows from RPC EXPERIMENTAL_tx_status, at the transaction's time", () => {
    const t = txs.find((x) => x.transaction.hash === "DaRuHG2tLsA5FP4f2CHouMjgABnbenUfZcGSnDeUDDmH")!;
    const rpc = fromRpc({
      transaction: { hash: t.transaction.hash, signer_id: t.transaction.signer_id, actions: t.transaction.actions },
      receipts: t.receipts.map((r) => ({ receipt_id: r.receipt.receipt_id, predecessor_id: r.receipt.predecessor_id })),
      receipts_outcome: t.receipts.map((r) => ({ id: r.execution_outcome.id, outcome: r.execution_outcome.outcome })),
    }, "1794215289703000000", 1);
    const [row] = parseTx(rpc, p);
    expect(row).toMatchObject({ event: "act_refused", actor: "agent", code: "ERR_PAYEE_MISMATCH", at: 1794215289 });
  });

  it("finds no job and no rows in a transaction without Accord events", () => {
    const raw = { hash: "h", signer: "x", realSigner: "x", timestampNs: "1000000000", block: 1, receipts: [{ id: "r", executor: p.agreement, predecessor: "x", logs: ["hello", "EVENT_JSON:{bad"], timestampNs: null, block: null }] };
    expect(outlayerJob(raw)).toBeNull();
    expect(parseTx(raw, p)).toEqual([]);
  });
});

// The house buyer's side of a tender-won agreement, decided from the agreement alone: it seals a ceiling equal to the
// winning price, approves only terms at or under it, accepts a payee only after the winner's approver did, accepts a
// delivery only when the hosted copy has the sha256 on chain, and gives up on a winner that never shows.
import { describe, expect, it } from "vitest";
import type { AgreementView, ItemView, RecipientVersion } from "@accord/sdk";
import { PATIENCE_SECS, buyerMove, houseBuyerMandate, tenderTitle, type BuyerView } from "../src/tenderdeal.js";

const PRICE = 29_000_000n;
const agreement = (over: Partial<AgreementView>): AgreementView => ({
  state: "Executing", total: "29000000", funded: "29000000", terms_hash: "aa", approvals: { buyer: true, vendor: true }, ends_at: 2000, now: 1000,
  in_flight: null, closing: false, mutual_close: { buyer: false, vendor: false }, budget: { balance: "0", storage_stake: "0", liquid: "0" },
  ...over,
} as AgreementView);
const item = (id: number, status: ItemView["status"], sha?: string): ItemView =>
  ({ id, status, evidence: "DeliveryAccepted", delivery: sha ? { evidence_hash: sha, uri: "", at: 0, window_end: 0 } : null } as ItemView);
const version = (status: RecipientVersion["status"], rating: RecipientVersion["rating"] = "ok" as RecipientVersion["rating"]): RecipientVersion =>
  ({ version: 1, account: "p", domain: "d", status, rating, reasons: [], failure: null, proposed_at: 0, active_at: null, proof: null });
const view = (a: Partial<AgreementView>, over: Partial<BuyerView> = {}): BuyerView =>
  ({ agreement: agreement(a), sealed: { buyer: true, vendor: true }, recipients: [], items: [], hosted: {}, age: 0, ...over });
const kind = (v: BuyerView) => buyerMove(v, PRICE).kind;

describe("house buyer", () => {
  it("seals first, then waits for the winner, and cancels a winner that never seals", () => {
    expect(kind(view({ state: "Sealed" }, { sealed: { buyer: false, vendor: false } }))).toBe("seal");
    expect(kind(view({ state: "Sealed" }, { sealed: { buyer: true, vendor: false } }))).toBe("wait");
    expect(kind(view({ state: "Sealed" }, { sealed: { buyer: true, vendor: false }, age: PATIENCE_SECS }))).toBe("cancel");
    expect(kind(view({ state: "Sealed" }, { age: PATIENCE_SECS }))).toBe("wait");
  });
  it("approves terms at the winning price and never above it", () => {
    const attested = { state: "Attested" as const, approvals: { buyer: false, vendor: false } };
    expect(buyerMove(view(attested), PRICE)).toEqual({ kind: "approve", terms: "aa" });
    expect(kind(view({ ...attested, total: "29000001" }))).toBe("cancel");
    expect(kind(view({ state: "Attested", approvals: { buyer: true, vendor: false } }))).toBe("wait");
    expect(kind(view({ state: "Attested", approvals: { buyer: true, vendor: false } }, { age: PATIENCE_SECS }))).toBe("cancel");
  });
  it("accepts a payee only once the winner's approver approved it, and never a blocked one", () => {
    expect(kind(view({}, { recipients: [version("Proven")] }))).toBe("wait");
    expect(buyerMove(view({}, { recipients: [version("AuthorityApproved", "warn" as RecipientVersion["rating"])] }), PRICE)).toEqual({ kind: "accept-recipient", version: 1, warn: true });
    expect(kind(view({}, { recipients: [version("AuthorityApproved", "block" as RecipientVersion["rating"])] }))).toBe("wait");
  });
  it("funds exactly what is missing", () => {
    expect(buyerMove(view({ funded: "9000000" }), PRICE)).toEqual({ kind: "fund", amount: 20_000_000n });
  });
  it("accepts a delivery only when the hosted copy has the sha256 on chain", () => {
    const items = [item(1, "Delivered", "ab")];
    expect(kind(view({}, { items }))).toBe("wait");
    expect(kind(view({}, { items, hosted: { 1: "cd" } }))).toBe("wait");
    expect(buyerMove(view({}, { items, hosted: { 1: "ab" } }), PRICE)).toEqual({ kind: "accept-delivery", item: 1 });
  });
  it("asks to close once every item is paid, closes after the term, and takes the spare NEAR back at the end", () => {
    const paid = [item(1, "Paid"), item(2, "Paid")];
    expect(kind(view({}, { items: paid }))).toBe("mutual-close");
    expect(kind(view({ mutual_close: { buyer: true, vendor: false } }, { items: paid }))).toBe("wait");
    expect(kind(view({ now: 2000 }, { items: [item(1, "Paid"), item(2, "Open")] }))).toBe("close");
    expect(kind(view({ now: 2000, closing: true }))).toBe("wait");
    const spare = { balance: "0", storage_stake: "0", liquid: (10n ** 24n).toString() };
    expect(kind(view({ state: "Settled", budget: spare }))).toBe("withdraw");
    expect(kind(view({ state: "Cancelled" }))).toBe("done");
  });
  it("seals the winning price as both ceiling and target", () => {
    const m = houseBuyerMandate({ id: 24, title: "Liquidity reporting integration", spec: "Three milestones." }, PRICE);
    expect(m.limits).toMatchObject({ max_total: "29000000", target_total: "29000000" });
    expect(tenderTitle({ id: 24, title: "x".repeat(200) })).toHaveLength(120);
  });
});

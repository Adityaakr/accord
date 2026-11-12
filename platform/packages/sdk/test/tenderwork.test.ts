// A winning tender agent's moves: who moves next at each state of a procurement agreement, and the two messages its
// key signs (its approver and payee; each delivery it hosts).
import { describe, expect, it } from "vitest";
import { newBidderKey } from "../src/tender.js";
import {
  signDelivery, signWinner, tenderVendorMandate, vendorMove, verifyDelivery, verifyWinner, type VendorView,
} from "../src/tenderwork.js";
import type { AgreementView, ItemView, RecipientVersion } from "../src/types.js";

const PAYEE = { recipient: "r.testnet", domain: "demo.example" };
const item = (over: Partial<ItemView>): ItemView => ({
  id: 1, amount: "10", due_amount: "10", due_offset_secs: 60, due_at: null, evidence: "DeliveryAccepted", status: "Open", delivery: null,
  eligible_at: null, exception: null, exception_used: false, pending_exception: null, settled: "0", ...over,
});
const version = (over: Partial<RecipientVersion>): RecipientVersion => ({
  version: 1, account: "r.testnet", domain: "demo.example", status: "Proposed", rating: "allow", reasons: [], failure: null, proposed_at: 0, active_at: null, proof: null, ...over,
});
const view = (a: Partial<AgreementView>, rest: Partial<VendorView> = {}): VendorView => ({
  agreement: {
    state: "Executing", negotiation: "Done", approvals: { buyer: true, vendor: true }, terms_hash: "h", recipient: { version: 1, account: "r.testnet", domain: "demo.example" },
    funded: "20", total: "20", params: { claim_delay_secs: 120 }, ends_at: null, ...a,
  } as AgreementView,
  sealed: { buyer: true, vendor: true }, recipients: [version({ status: "Active" })], items: [item({})], now: 1000, ...rest,
});

describe("a winning agent's next move", () => {
  it("seals, then waits for the buyer, then starts the negotiation", () => {
    expect(vendorMove(view({ state: "Sealed" }, { sealed: { buyer: false, vendor: false } }), PAYEE)).toEqual({ kind: "seal" });
    expect(vendorMove(view({ state: "Sealed" }, { sealed: { buyer: false, vendor: true } }), PAYEE)).toMatchObject({ kind: "wait", buyer: true });
    expect(vendorMove(view({ state: "Sealed", negotiation: { Ready: { attempts: 0 } } }), PAYEE)).toEqual({ kind: "negotiate" });
    expect(vendorMove(view({ state: "Sealed", negotiation: { Requested: { request_nonce: "n", at: 0, attempt: 1 } } }), PAYEE)).toMatchObject({ kind: "wait", buyer: false });
  });
  it("approves the attested terms once, then waits for the buyer", () => {
    expect(vendorMove(view({ state: "Attested", approvals: { buyer: false, vendor: false } }), PAYEE)).toEqual({ kind: "approve", terms: "h" });
    expect(vendorMove(view({ state: "Attested", approvals: { buyer: false, vendor: true } }), PAYEE)).toMatchObject({ kind: "wait", buyer: true });
  });
  it("proposes its payee, approves it as the authority once proven, activates it after the timelock", () => {
    expect(vendorMove(view({ recipient: null }, { recipients: [] }), PAYEE)).toEqual({ kind: "propose", ...PAYEE });
    expect(vendorMove(view({ recipient: null }, { recipients: [version({ status: "ProofFailed" })] }), PAYEE)).toEqual({ kind: "propose", ...PAYEE });
    expect(vendorMove(view({ recipient: null }, { recipients: [version({ status: "Proven" })] }), PAYEE)).toEqual({ kind: "authority-approve", version: 1 });
    expect(vendorMove(view({ recipient: null }, { recipients: [version({ status: "AuthorityApproved" })] }), PAYEE)).toMatchObject({ kind: "wait", buyer: true });
    expect(vendorMove(view({ recipient: null }, { recipients: [version({ status: "Accepted", active_at: 2000 })] }), PAYEE)).toMatchObject({ kind: "wait", buyer: false });
    expect(vendorMove(view({ recipient: null }, { recipients: [version({ status: "Accepted", active_at: 900 })] }), PAYEE)).toEqual({ kind: "activate", version: 1 });
  });
  it("waits for funding, delivers in order, and claims only after the claim delay", () => {
    expect(vendorMove(view({ funded: "5" }), PAYEE)).toMatchObject({ kind: "wait", buyer: true });
    expect(vendorMove(view({}, { items: [item({ id: 2 }), item({ id: 1 })] }), PAYEE)).toEqual({ kind: "deliver", item: 1 });
    expect(vendorMove(view({}, { items: [item({ status: "Delivered" })] }), PAYEE)).toMatchObject({ kind: "wait", buyer: true });
    expect(vendorMove(view({}, { items: [item({ status: "Eligible", eligible_at: 950 })] }), PAYEE)).toMatchObject({ kind: "wait" });
    expect(vendorMove(view({}, { items: [item({ status: "Eligible", eligible_at: 800 })] }), PAYEE)).toEqual({ kind: "claim", item: 1 });
    expect(vendorMove(view({}, { items: [item({ status: "Paid" }), item({ id: 2, status: "Open" })] }), PAYEE)).toEqual({ kind: "deliver", item: 2 });
    expect(vendorMove(view({}, { items: [item({ status: "Paid" }), item({ id: 2, status: "Paid" })] }), PAYEE)).toMatchObject({ kind: "done" });
    expect(vendorMove(view({ state: "NoDeal" }), PAYEE)).toMatchObject({ kind: "done" });
  });
  it("delivers a disputed item again, stops after two failed payee proofs, and stops when the term ends", () => {
    expect(vendorMove(view({}, { items: [item({ status: "Disputed", delivery: { evidence_hash: "x", uri: "u", at: 0, window_end: 0 } })] }), PAYEE)).toEqual({ kind: "deliver", item: 1 });
    const failed = version({ status: "ProofFailed", failure: "no such recipient on the domain" });
    expect(vendorMove(view({ recipient: null }, { recipients: [failed] }), PAYEE)).toMatchObject({ kind: "propose" });
    expect(vendorMove(view({ recipient: null }, { recipients: [failed, { ...failed, version: 2 }] }), PAYEE)).toMatchObject({ kind: "done", why: expect.stringContaining("no such recipient") });
    expect(vendorMove(view({ ends_at: 1000 }), PAYEE)).toMatchObject({ kind: "done", why: expect.stringContaining("term") });
  });
});

describe("the winner's signed messages", () => {
  it("bind the approver, payee and delivery to the winning key and nothing else", () => {
    const k = newBidderKey(), other = newBidderKey();
    const s = signWinner(k.seed, "b.testnet", 4, "a", "r");
    expect(verifyWinner(k.id, "b.testnet", 4, "a", "r", s)).toBe(true);
    expect(verifyWinner(other.id, "b.testnet", 4, "a", "r", s)).toBe(false);
    expect(verifyWinner(k.id, "b.testnet", 5, "a", "r", s)).toBe(false);
    expect(verifyWinner(k.id, "b.testnet", 4, "a", "evil", s)).toBe(false);
    const sha = "ab".repeat(32);
    const d = signDelivery(k.seed, "a1.x.testnet", 1, sha);
    expect(verifyDelivery(k.id, "a1.x.testnet", 1, sha, d)).toBe(true);
    expect(verifyDelivery(k.id, "a1.x.testnet", 2, sha, d)).toBe(false);
    expect(verifyDelivery(k.id, "a1.x.testnet", 1, sha, "zz")).toBe(false);
  });
  it("seals the winning price as both floor and target", () => {
    const m = tenderVendorMandate(15_750_000n, { job: 17, title: "Inference buy" });
    expect(m.limits).toMatchObject({ min_total: "15750000", target_total: "15750000", min_items: 2 });
    expect(m.role).toBe("vendor");
  });
});

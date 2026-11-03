import { describe, expect, it } from "vitest";
import type { AgreementView, ItemView, Receipt } from "@accord/sdk";
import { nextAction, TESTNET_REARM, type RoomSnapshot } from "../src/rearm.js";

const cfg = { ...TESTNET_REARM, minLiquid: 100n };

function item(id: number, status: ItemView["status"]): ItemView {
  return {
    id, amount: "10000", due_amount: "10000", due_offset_secs: id * 3600, due_at: null, evidence: "DeliveryAccepted",
    status, delivery: null, eligible_at: null, exception: null, exception_used: false, pending_exception: null,
    settled: "0",
  };
}

function room(statuses: ItemView["status"][], over: Partial<AgreementView> = {}, receipts: Receipt[] = []): RoomSnapshot {
  const view = {
    state: "Executing", ends_at: 10_000, in_flight: null, closing: false, agent_key: "ed25519:k", ...over,
  } as AgreementView;
  return { view, items: statuses.map((s, i) => item(i + 1, s)), receipts, liquid: 1_000n };
}

const paidAt = (at: number): Receipt => ({ payment_id: 1, item: 1, amount: "10000", recipient: "r", via: "agent", block: 1, at, evidence_hash: null });

describe("nextAction", () => {
  it("opens a room while under the daily cap, and waits at it", () => {
    expect(nextAction(null, 0, null, 1, cfg)).toEqual({ kind: "open" });
    expect(nextAction(null, 0, null, 2, cfg)).toEqual({ kind: "wait_for_tomorrow" });
  });
  it("delivers the first item at once, then one an interval after the last payment", () => {
    expect(nextAction(room(["Open", "Open"]), 100, null, 0, cfg)).toEqual({ kind: "deliver", item: 1 });
    expect(nextAction(room(["Paid", "Open"], {}, [paidAt(100)]), 200, null, 0, cfg)).toEqual({ kind: "none" });
    expect(nextAction(room(["Paid", "Open"], {}, [paidAt(100)]), 3_700, null, 0, cfg)).toEqual({ kind: "deliver", item: 2 });
  });
  it("keeps one item due at a time", () => {
    expect(nextAction(room(["Eligible", "Open"]), 100, null, 0, cfg)).toEqual({ kind: "none" });
  });
  it("re-arms a revoked key only after the wait", () => {
    const r = room(["Eligible", "Open"], { agent_key: null });
    expect(nextAction(r, 200, 100, 0, cfg)).toEqual({ kind: "none" });
    expect(nextAction(r, 400, 100, 0, cfg)).toEqual({ kind: "install_key" });
  });
  it("closes a used-up or expired room and forgets one that is no longer executing", () => {
    expect(nextAction(room(["Paid", "Paid"]), 100, null, 0, cfg).kind).toBe("close");
    expect(nextAction(room(["Open"], { ends_at: 50 }), 100, null, 0, cfg).kind).toBe("close");
    expect(nextAction(room(["Open"], { state: "Settled" }), 100, null, 0, cfg).kind).toBe("forget");
  });
  it("tops the room's NEAR up when liquid runs low", () => {
    const r = { ...room(["Eligible"]), liquid: 10n };
    expect(nextAction(r, 100, null, 0, cfg)).toEqual({ kind: "top_up" });
  });
});

// The demo agent's auto-pay decision (src/lib/agenttick.ts): it pays only what the chain lists as due, only with its
// own key, and never an item it already sent or is sending, whatever number of polls ask at once.
import { describe, expect, it } from "vitest";
import type { AgentActionRecord } from "@accord/store";
import { SENDING_HOLD_SECS, autoInstruction, decideTick, type TickInput } from "../src/lib/agenttick";

const NOW = 1_794_215_300;
const base: TickInput = {
  state: "Executing", agentKey: "ed25519:demo", demoKey: "ed25519:demo", inFlight: false, recipient: "halcyon-mm.testnet",
  due: [{ item: 1, amount: "12000000", recipient: "halcyon-mm.testnet", eligible_at: NOW - 5 }], now: NOW, records: [],
};
const rec = (over: Partial<AgentActionRecord>): AgentActionRecord => ({
  id: "r", agreement: "a1", at: new Date().toISOString(), trigger: "auto", instruction: "", intent: { item: 1, amount: "12000000", recipient: "halcyon-mm.testnet" },
  outcome: "sent", code: null, tx_hash: "TX", ...over,
});

describe("decideTick", () => {
  it("pays the first due item to its recipient", () => {
    expect(decideTick(base)).toEqual({ pay: true, item: 1, amount: "12000000", recipient: "halcyon-mm.testnet" });
  });

  it("does nothing without the demo agent's own key: none, revoked and not replaced, or someone else's", () => {
    expect(decideTick({ ...base, agentKey: null })).toMatchObject({ pay: false });
    expect(decideTick({ ...base, agentKey: "ed25519:other" })).toMatchObject({ pay: false, reason: expect.stringContaining("not the demo agent's") });
  });

  it("waits for the chain: not executing, a payment in flight, no recipient, nothing due, or due later", () => {
    expect(decideTick({ ...base, state: "Attested" }).pay).toBe(false);
    expect(decideTick({ ...base, inFlight: true }).pay).toBe(false);
    expect(decideTick({ ...base, recipient: null }).pay).toBe(false);
    expect(decideTick({ ...base, due: [] })).toEqual({ pay: false, reason: "nothing is due" });
    expect(decideTick({ ...base, due: [{ ...base.due[0]!, eligible_at: NOW + 60 }] }).pay).toBe(false);
  });

  it("never pays an item twice: one already sent, or one being sent", () => {
    expect(decideTick({ ...base, records: [rec({ outcome: "sent" })] })).toMatchObject({ pay: false, reason: expect.stringContaining("already sent") });
    expect(decideTick({ ...base, records: [rec({ outcome: "sending", tx_hash: null })] })).toMatchObject({ pay: false, reason: "item 1 is being paid" });
    // the button's payment counts the same as the agent's own
    expect(decideTick({ ...base, records: [rec({ trigger: "pay", outcome: "sent" })] }).pay).toBe(false);
  });

  it("moves on to the next item once the first is paid on chain", () => {
    const next = { ...base, due: [{ item: 2, amount: "13500000", recipient: "halcyon-mm.testnet", eligible_at: NOW - 1 }], records: [rec({ outcome: "sent" })] };
    expect(decideTick(next)).toMatchObject({ pay: true, item: 2, amount: "13500000" });
  });

  it("does not count the redirect demonstration, or the buyer's refused try, as a payment of that item", () => {
    expect(decideTick({ ...base, records: [rec({ trigger: "attack", outcome: "refused", code: "ERR_PAYEE_MISMATCH" })] }).pay).toBe(true);
    expect(decideTick({ ...base, records: [rec({ trigger: "pay", outcome: "refused" })] }).pay).toBe(true);
  });

  it("never retries its own refused or failed call (five refusals revoke the key)", () => {
    expect(decideTick({ ...base, records: [rec({ outcome: "refused", code: "ERR_AMOUNT_MISMATCH" })] })).toMatchObject({ pay: false, reason: expect.stringContaining("does not retry") });
    expect(decideTick({ ...base, records: [rec({ outcome: "failed" })] }).pay).toBe(false);
  });

  it("lets a call that never came back go after the hold, so the chain decides again", () => {
    const old = new Date(Date.now() - (SENDING_HOLD_SECS + 5) * 1000).toISOString();
    expect(decideTick({ ...base, records: [rec({ outcome: "sending", at: old, tx_hash: null })] }).pay).toBe(true);
  });

  it("writes the instruction from what the chain says", () => {
    expect(autoInstruction(1, "12000000", "halcyon-mm.testnet", "tUSDC")).toBe("Item 1 is due: delivery accepted, recipient halcyon-mm.testnet active, not paid. Pay 12.00 tUSDC to the active recipient.");
  });
});

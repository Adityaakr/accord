// What a demo agent act did when the RPC lost its answer (src/lib/agentoutcome.ts), from a122.accord-v2.testnet's
// record of 28 Nov 2026: the redirect was refused on chain while the room was told "the network is busy".
import { describe, expect, it } from "vitest";
import { landedOutcome, type SeenItem, type SeenRefusal } from "../src/lib/agentoutcome";

const STRANGER = "halcyon-markets.testnet";
const RECIPIENT = "halcyon-mm.testnet";
const refusal = (seq: number, over: Partial<SeenRefusal> = {}): SeenRefusal => ({ seq, code: "ERR_PAYEE_MISMATCH", item: 1, amount: "16500000", recipient: STRANGER, via: "agent", ...over });
const items = (paid: number[]): SeenItem[] => [1, 2, 3].map((id) => ({ id, status: paid.includes(id) ? "Paid" : "Eligible" }));

describe("landedOutcome", () => {
  it("finds the redirect's refusal recorded after the count read before the send", () => {
    const out = landedOutcome({ item: 1, amount: "16500000", recipient: STRANGER }, 1, [refusal(2)], items([1, 2, 3]), RECIPIENT);
    expect(out).toEqual({ status: "refused", code: "ERR_PAYEE_MISMATCH", seq: 2 });
  });

  it("ignores refusals from before the send, of another item or amount, or not by the agent", () => {
    const intent = { item: 1, amount: "16500000", recipient: STRANGER };
    expect(landedOutcome(intent, 2, [refusal(1), refusal(2)], items([]), RECIPIENT)).toBeNull();
    expect(landedOutcome(intent, 0, [refusal(1, { item: 3, amount: "6000000" })], items([]), RECIPIENT)).toBeNull();
    expect(landedOutcome(intent, 0, [refusal(1, { via: "relayer" })], items([]), RECIPIENT)).toBeNull();
  });

  it("finds a payment: the item is paid and the intent was the active recipient", () => {
    expect(landedOutcome({ item: 2, amount: "5000000", recipient: RECIPIENT }, 0, [], items([1, 2]), RECIPIENT)).toEqual({ status: "sent" });
    // not yet paid (the transaction may not have landed): say nothing
    expect(landedOutcome({ item: 3, amount: "6000000", recipient: RECIPIENT }, 0, [], items([1, 2]), RECIPIENT)).toBeNull();
    // a redirect is never read as a payment, even when the item was paid by someone else
    expect(landedOutcome({ item: 1, amount: "16500000", recipient: STRANGER }, 0, [], items([1]), RECIPIENT)).toBeNull();
  });
});

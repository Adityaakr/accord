// What a demo agent `act` did when its answer was lost. The NEAR RPC can fail a transaction send at the transport
// (a timeout, a 5xx, a rate limit on every endpoint) after the transaction reached the network; the chain then has
// the payment or the refusal and the app had only "the network is busy". Without this the room said "busy, retry"
// for a call that had landed, a visitor (or the Demo health check) asked again, and repeated redirects reached the
// contract's refusal limit, which revoked the agent's key (Demo health, 28 Nov 2026, a122.accord-v2.testnet: five
// ERR_PAYEE_MISMATCH refusals recorded on chain, each answered 503 to the room). Pure, so it is unit-tested.

export interface ActIntent { item: number; amount: string; recipient: string }
export interface SeenRefusal { seq: number; code: string; item: number; amount: string; recipient: string; via: string }
export interface SeenItem { id: number; status: string }

export type LandedOutcome = { status: "refused"; code: string; seq: number } | { status: "sent" };

/**
 * The outcome the chain shows for `intent`, read after the send failed: a refusal of this item and recipient by the
 * agent recorded after `refusalsBefore` (the agreement's refusal count read before the send), or the item now paid
 * to the recipient it was due to. null when the chain shows neither yet (the transaction may not have landed).
 */
export function landedOutcome(intent: ActIntent, refusalsBefore: number, refusals: SeenRefusal[], items: SeenItem[], paidRecipient: string | null): LandedOutcome | null {
  const refused = refusals
    .filter((r) => r.seq > refusalsBefore && r.via === "agent" && r.item === intent.item && r.recipient === intent.recipient && r.amount === intent.amount)
    .sort((x, y) => x.seq - y.seq)[0];
  if (refused) return { status: "refused", code: refused.code, seq: refused.seq };
  // a payment can only go to the active recipient; an item is paid once, so a paid item after the send is this one
  if (paidRecipient === intent.recipient && items.some((it) => it.id === intent.item && it.status === "Paid")) return { status: "sent" };
  return null;
}

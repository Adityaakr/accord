// Which transaction paid a receipt: the payment_sent row of the room's timeline (server/activity.ts) with the same
// item, amount and recipient, the one at the receipt's block when several match. Pure (no server-only) so it is
// tested; null when the timeline does not have it (the transactions API was unreachable or has not indexed it yet).
import type { Receipt } from "@accord/sdk";

export interface PaymentRow { event: string; tx: string; block: number; item: number | null; amount: string | null; account: string | null }

export function paymentTx(receipt: Receipt, rows: readonly PaymentRow[]): string | null {
  const same = rows.filter((r) => r.event === "payment_sent" && r.item === receipt.item && r.amount === receipt.amount && r.account === receipt.recipient);
  return (same.find((r) => r.block === receipt.block) ?? (same.length === 1 ? same[0] : undefined))?.tx ?? null;
}

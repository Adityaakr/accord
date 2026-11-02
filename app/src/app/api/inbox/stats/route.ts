// Counters under the /try form, computed from the contract's own records: refusals, and payments checked against
// the terms. "Paid outside the terms" counts any receipt whose amount differs from its item's due amount or whose
// recipient was never the authorised recipient; it is 0 by construction and shown as counted.
import { accord } from "@/server/accord";
import { tryRoom } from "@/server/tryroom";

export const dynamic = "force-dynamic";

export async function GET() {
  const room = await tryRoom();
  if (!room) return Response.json({ open: false, attempts: 0, last_refusal: null, paid_outside_terms: 0, approved_payments: 0 });
  const d = accord().agreement(room.account);
  const [refusals, receipts, items, recipients] = await Promise.all([d.refusals(undefined, 1), d.receipts(), d.items(), d.recipients()]);
  const authorised = new Set(recipients.filter((r) => r.status === "Active" || r.status === "Superseded").map((r) => r.account));
  const due = new Map(items.map((i) => [i.id, i.due_amount]));
  const outside = receipts.filter((r) => !authorised.has(r.recipient) || due.get(r.item) !== r.amount).length;
  return Response.json({
    open: true,
    agreement: room.account,
    attempts: room.refusals,
    last_refusal: refusals.at(-1) ?? null,
    paid_outside_terms: outside,
    approved_payments: receipts.length,
  });
}

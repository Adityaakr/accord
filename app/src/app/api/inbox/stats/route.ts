// Counters under the /try form for the current room, computed from the contract's own records: refusals, and
// payments checked against the terms. "Paid outside the terms" counts any receipt whose recipient was never
// authorised, or whose amount is neither its item's amount nor an exception the buyer approved for that item; it is
// 0 by construction and shown as counted.
import { accord } from "@/server/accord";
import { tryRoom } from "@/server/tryroom";

export const dynamic = "force-dynamic";

export async function GET() {
  const room = await tryRoom();
  if (!room) return Response.json({ open: false, attempts: 0, last_refusal: null, paid_outside_terms: 0, approved_payments: 0 });
  const d = accord().agreement(room.account);
  const [refusals, receipts, items, recipients, exceptions] = await Promise.all([
    d.refusals(undefined, 1), d.receipts(), d.items(), d.recipients(), d.exceptions(),
  ]);
  const authorised = new Set(recipients.filter((r) => r.status === "Active" || r.status === "Superseded").map((r) => r.account));
  const allowed = new Map(items.map((i) => [i.id, new Set([i.amount])]));
  for (const e of exceptions) if (e.status === "approved") allowed.get(e.item)?.add(e.amount);
  const outside = receipts.filter((r) => !authorised.has(r.recipient) || !allowed.get(r.item)?.has(r.amount)).length;
  return Response.json({
    open: true,
    agreement: room.account,
    attempts: room.refusals,
    last_refusal: refusals.at(-1) ?? null,
    paid_outside_terms: outside,
    approved_payments: receipts.length,
  });
}

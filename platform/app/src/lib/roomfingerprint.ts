// The room's fingerprint for the demo counterparty panel (DemoPanel). The panel's "next" line is the answer to one
// /api/demo-counterparty/step call, which read the room at that moment. When the room moves on (the buyer approves,
// funds, accepts, installs or revokes the agent key; the counterparty acts; an item is delivered or paid) that answer
// may no longer apply, so the panel keeps each answer with the fingerprint of the room it was asked for, shows it only
// while the fingerprint still matches, and asks again at once when it does not.

import type { AgreementView } from "@accord/sdk";

export type FingerprintView = Pick<AgreementView,
  "state" | "negotiation" | "approvals" | "terms_hash" | "funded" | "paid" | "in_flight" | "recipient" |
  "pending_recipient" | "agent_key" | "revoked_keys" | "refusals" | "closing">;

/** Everything about the room that can change which move comes next, as one string. */
export function roomFingerprint(a: FingerprintView, items: { id: number; status: string }[] = []): string {
  const negotiation = typeof a.negotiation === "string" ? a.negotiation : Object.keys(a.negotiation)[0] ?? "";
  return [
    a.state, negotiation, a.approvals.buyer ? "b" : "", a.approvals.vendor ? "v" : "", a.terms_hash ?? "",
    a.funded, a.paid, a.in_flight ? "f" : "", a.closing ? "c" : "",
    a.recipient ? `${a.recipient.version}:${a.recipient.account}` : "",
    a.pending_recipient ? `${a.pending_recipient.version}:${a.pending_recipient.status}` : "",
    a.agent_key ?? "", a.revoked_keys, a.refusals,
    items.map((i) => `${i.id}:${i.status}`).join(","),
  ].join("|");
}

/** What the panel's "next" line says: the step's own text only when it was read for the room as it is now. */
export function nextLine(step: { next: string; fp: string } | null, fp: string, auto: boolean): string {
  if (step && step.fp === fp) return step.next;
  if (!step || auto) return "Checking the room…";
  return "The room changed. Run next step to see what comes next.";
}

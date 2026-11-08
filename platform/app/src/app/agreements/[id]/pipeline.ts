// The room's seven steps (PLATFORM.md §6), derived only from contract state. A step is reached when the chain says
// so; nothing here is inferred from time or guessed.

import type { AgreementView, ItemView, PeriodView } from "@accord/sdk";

export const STEPS = ["Sealed", "Attested", "Approved", "Funded", "Executing", "Checked", "Settled"] as const;
export type Step = (typeof STEPS)[number];

export const STEP_NOTE: Record<Step, string> = {
  Sealed: "Both limits sealed",
  Attested: "Terms out of the enclave",
  Approved: "Both companies signed",
  Funded: "USDC in escrow",
  Executing: "Agent paying within terms",
  Checked: "Evidence made a payment eligible",
  Settled: "Closed and recorded",
};

/** Index of the current step, or -1 for a room that ended without a deal (NoDeal, Cancelled). */
export function currentStep(a: AgreementView, items: ItemView[], periods: PeriodView[]): number {
  if (a.state === "NoDeal" || a.state === "Cancelled") return -1;
  if (a.state === "Settled") return 6;
  if (a.state === "Sealed") return 0;
  if (a.state === "Attested") return 1;
  // Executing: approved by both. Funded once escrow holds USDC; Executing once an agent key is installed or a
  // payment has gone out; Checked once evidence made at least one payment eligible (or one was paid on it).
  const funded = BigInt(a.funded) > 0n;
  if (!funded) return 2;
  const checked = items.some((it) => it.status === "Eligible" || it.status === "Paid" || it.status === "AssumedPaid")
    || periods.some((p) => p.outcome === "Eligible" || p.outcome === "ResolvedPay");
  if (checked) return 5;
  const running = !!a.agent_key || a.revoked_keys > 0 || BigInt(a.paid) > 0n;
  return running ? 4 : 3;
}

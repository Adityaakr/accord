// The agent-side wrapper around `pay` (ARCHITECTURE.md 7.3, INTERFACES.md section 12): preflight first; `block`
// refuses to sign, `warn` returns `needs_human` unless the buyer approved this recipient, `allow` pays. It is the
// second line; the contract's gates in `act` are the first and run whatever this returns.

import type { ActResult } from "./accord.js";
import type { PreflightResult } from "./preflight.js";

export interface PayRequest {
  item: number;
  amount: string;
  recipient: string;
  memo?: string;
}

export interface GuardedPayDeps {
  preflight(agreement: string, recipient: string): Promise<PreflightResult>;
  pay(agreement: string, p: PayRequest): Promise<ActResult>;
}

export type GuardedPayResult = ActResult & { preflight?: PreflightResult };

export async function guardedPay(
  deps: GuardedPayDeps,
  agreement: string,
  p: PayRequest,
  opts: { preflight?: "on" | "off" } = {},
): Promise<GuardedPayResult> {
  if (opts.preflight === "off") return deps.pay(agreement, p);
  const pf = await deps.preflight(agreement, p.recipient);
  if (pf.rating === "block") return { status: "preflight_blocked", reasons: pf.reasons, preflight: pf };
  if (pf.rating === "warn" && !pf.approvedByBuyer) return { status: "needs_human", reasons: pf.reasons, preflight: pf };
  return { ...(await deps.pay(agreement, p)), preflight: pf };
}

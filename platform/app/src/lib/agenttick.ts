// The demo agent's auto-pay decision, pure so it is testable. The server (server/demoagent.ts) reads the chain first,
// then asks this whether to pay: only the first item the contract lists as due (due_items: Eligible, so delivered,
// accepted and not paid), only with the demo agent's own key installed, only with an active recipient, nothing in
// flight, and never an item the agent already sent (or is sending) per its own record. The contract still checks the
// call; this is what keeps the agent from asking twice.

import type { AgentActionRecord } from "@accord/store";
import type { DueItem } from "@accord/sdk";

export interface TickInput {
  state: string;
  /** the key installed on the agreement account now */
  agentKey: string | null;
  /** the demo agent's key for this room's generation */
  demoKey: string;
  inFlight: boolean;
  recipient: string | null;
  due: DueItem[];
  now: number;
  records: AgentActionRecord[];
}

export type TickDecision =
  | { pay: true; item: number; amount: string; recipient: string }
  | { pay: false; reason: string };

/** A record still "sending" after this long is a call that never came back; the chain decides from there. */
export const SENDING_HOLD_SECS = 300;

export function decideTick(t: TickInput, nowMs = Date.now()): TickDecision {
  if (t.state !== "Executing") return { pay: false, reason: "the agreement is not executing" };
  if (!t.agentKey) return { pay: false, reason: "no agent key is installed" };
  if (t.agentKey !== t.demoKey) return { pay: false, reason: "the installed key is not the demo agent's" };
  if (t.inFlight) return { pay: false, reason: "a payment is in flight" };
  if (!t.recipient) return { pay: false, reason: "no active recipient" };
  const due = t.due.find((d) => d.eligible_at !== null && d.eligible_at <= t.now);
  if (!due) return { pay: false, reason: "nothing is due" };
  const mine = t.records.filter((r) => r.trigger !== "attack" && r.intent.item === due.item);
  if (mine.some((r) => r.outcome === "sent")) return { pay: false, reason: `item ${due.item} was already sent; waiting for the chain to show it` };
  // a refused or failed auto-pay is not retried on its own: the same call would be refused again, and five refusals
  // revoke the key; the buyer's button can still ask
  if (mine.some((r) => r.trigger === "auto" && (r.outcome === "refused" || r.outcome === "failed"))) {
    return { pay: false, reason: `the contract did not take item ${due.item} from the agent; it does not retry on its own` };
  }
  if (mine.some((r) => r.outcome === "sending" && nowMs - new Date(r.at).getTime() < SENDING_HOLD_SECS * 1000)) {
    return { pay: false, reason: `item ${due.item} is being paid` };
  }
  return { pay: true, item: due.item, amount: due.amount, recipient: due.recipient ?? t.recipient };
}

/** The instruction the agent reads when it pays on its own, built from what the chain says. */
export function autoInstruction(item: number, amount: string, recipient: string, symbol: string): string {
  const v = BigInt(amount);
  const amt = `${v / 1_000_000n}.${((v % 1_000_000n) / 10_000n).toString().padStart(2, "0")}`;
  return `Item ${item} is due: delivery accepted, recipient ${recipient} active, not paid. Pay ${amt} ${symbol} to the active recipient.`;
}

// How often the demo agent may sign `act` in one test room, kept apart by who asked, so the agent paying on its own
// never uses up what a visitor's own clicks are allowed (no "Ask the agent to pay a new account" refused with 429
// because auto-pay ran first). No "server-only" so it is unit-tested.
//
//   explicit  the buyer's "pay" and "attack" buttons: EXPLICIT_PER_HOUR per room
//   auto      the agent's own payment (tick): AUTO_PER_HOUR per room, and in any case one per due item, which the
//             chain read (lib/agenttick.ts) already enforces
//   item      one payment per item per day from this server, whoever asked (pay and auto share it)
//
// A tick that sends nothing counts against none of these; ticks only have a loose per-room read limit (TICKS_PER_MINUTE)
// so polling cannot turn into a stream of chain reads. Nothing is counted unless a transaction is about to be signed,
// and a refusal by one allowance never spends another (limiter.takeAll).

import { remaining, takeAll, type Limit } from "./limiter";

export const EXPLICIT_PER_HOUR = 12;
export const AUTO_PER_HOUR = 30;
export const TICKS_PER_MINUTE = 60;
const HOUR = 3600_000;
const DAY = 24 * HOUR;

export const explicitLimit = (agreement: string): Limit => ({ key: `agent:explicit:${agreement}`, max: EXPLICIT_PER_HOUR, windowMs: HOUR });
export const autoLimit = (agreement: string): Limit => ({ key: `agent:auto:${agreement}`, max: AUTO_PER_HOUR, windowMs: HOUR });
export const itemLimit = (agreement: string, item: number): Limit => ({ key: `agent:pay:${agreement}:${item}`, max: 1, windowMs: DAY });
export const tickLimit = (agreement: string): Limit => ({ key: `agent:tick:${agreement}`, max: TICKS_PER_MINUTE, windowMs: 60_000 });

export type AgentSpend =
  | { kind: "pay"; agreement: string; item: number }
  | { kind: "attack"; agreement: string }
  | { kind: "auto"; agreement: string; item: number };

export type SpendRefusal = { status: 409 | 429; error: string };

/** Counts one act call the agent is about to sign, or says why it may not; null when it may. */
export function spendAgentAction(s: AgentSpend, now = Date.now()): SpendRefusal | null {
  const limits = s.kind === "attack" ? [explicitLimit(s.agreement)]
    : s.kind === "pay" ? [itemLimit(s.agreement, s.item), explicitLimit(s.agreement)]
    : [itemLimit(s.agreement, s.item), autoLimit(s.agreement)];
  const full = takeAll(limits, now);
  if (!full) return null;
  if (full.key.startsWith("agent:pay:")) return { status: 409, error: `the demo agent already paid item ${(s as { item: number }).item}` };
  if (full.key.startsWith("agent:auto:")) return { status: 429, error: "the demo agent has paid on its own enough in this room for an hour" };
  return { status: 429, error: "you have asked the demo agent to act enough in this room for an hour" };
}

/** Whether a tick may read the chain now; counts the tick. Never touches the action allowances. */
export function allowTick(agreement: string, now = Date.now()): boolean {
  return takeAll([tickLimit(agreement)], now) === null;
}

/** What the buyer's buttons have left this hour, for tests and logs. */
export const explicitLeft = (agreement: string, now = Date.now()) => remaining(explicitLimit(agreement), now);

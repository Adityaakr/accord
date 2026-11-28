// How often one visitor may ask the demo counterparty for its next move (POST /api/demo-counterparty/step). No
// "server-only" so it is unit-tested.
//
//   room  STEP_PER_ROOM_PER_MINUTE per room: the panel's own poll is one call every POLL_MS (8 s), so this only
//         stops a loop.
//   ip    STEP_PER_IP_PER_HOUR per caller IP, across rooms. One room left open at the panel's poll is 3600 / 8 = 450
//         calls an hour, plus a call on each change of the room. This was 240, below a single open room's own poll:
//         a room open for more than about half an hour was refused by its own panel until the hour moved on (the
//         Demo health run of 28 Nov 2026 made 228 calls in its first 30-minute attempt, and its retry from the same
//         runner was refused from its 12th call to its deadline). It is now two rooms' worth at the poll rate.
//
// Both are taken together (limiter.takeAll), so a call one limit refuses spends nothing from the other, and a refusal
// says when to ask again (Retry-After) instead of "wait a minute".

import { POLL_MS } from "../components/pollbackoff";
import { takeAll, waitMs, type Limit } from "./limiter";

const HOUR = 3600_000;
export const STEP_PER_ROOM_PER_MINUTE = 30;
export const STEP_PER_IP_PER_HOUR = 2 * Math.ceil(HOUR / POLL_MS);

export const stepLimits = (ip: string, agreement: string): Limit[] => [
  { key: `cp:${agreement}`, max: STEP_PER_ROOM_PER_MINUTE, windowMs: 60_000 },
  { key: `cp:ip:${ip}`, max: STEP_PER_IP_PER_HOUR, windowMs: HOUR },
];

/** Counts one step call, or says how many seconds until the full limit has room (for Retry-After); null when allowed. */
export function takeStep(ip: string, agreement: string, now = Date.now()): { retryAfterS: number } | null {
  const full = takeAll(stepLimits(ip, agreement), now);
  if (!full) return null;
  return { retryAfterS: Math.max(1, Math.ceil(waitMs(full, now) / 1000)) };
}

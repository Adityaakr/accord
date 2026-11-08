// The public /try room: the agreement its inbox feeds. TRY_AGREEMENT pins it; otherwise only the room the re-arm
// recorded as open (the store's try_rooms). Never a guess from the chain: an agreement the re-arm did not finish
// opening has no agent key the agent holds, and a visitor sent there would wait forever.

import "server-only";
import type { AgreementView } from "@accord/sdk";
import { accord, config } from "./accord";
import { tryRooms } from "./store";

export async function tryRoom(): Promise<AgreementView | null> {
  const a = accord();
  if (process.env.TRY_AGREEMENT) return a.agreement(process.env.TRY_AGREEMENT).get().catch(() => null);
  const open = (await tryRooms(5).catch(() => [])).find((r) => r.status === "open");
  if (!open) return null;
  const v = await a.agreement(open.agreement).get().catch(() => null);
  return v?.state === "Executing" ? v : null;
}

/** The re-arm's timings as the agent runs them (the same variables and defaults as services/agent/src/main.ts). */
export function rearmTimings(): { rearmSecs: number; itemIntervalSecs: number; maxRoomsPerDay: number } {
  const local = config().network === "sandbox";
  const n = (name: string, fallback: number) => Number(process.env[name] ?? fallback);
  return {
    rearmSecs: n("TRY_REARM_SECS", local ? 60 : 300),
    itemIntervalSecs: n("TRY_ITEM_INTERVAL_SECS", local ? 60 : 3600),
    maxRoomsPerDay: n("TRY_MAX_ROOMS_PER_DAY", local ? 20 : 2),
  };
}

/** Why there is no room right now, in words a visitor can act on. */
export async function closedReason(): Promise<string> {
  const rooms = await tryRooms(50).catch(() => []);
  if (rooms.some((r) => r.status === "opening")) return "A new room is opening. It takes a few minutes: the two mandates are negotiated, the escrow funded and the recipient proven.";
  const today = new Date().toISOString().slice(0, 10);
  if (rooms.filter((r) => r.opened_at.slice(0, 10) === today).length >= rearmTimings().maxRoomsPerDay) {
    return "The room has used today's allowance and reopens at 00:00 UTC. The refusal log stays live.";
  }
  return "The room is between rooms and reopens shortly.";
}

export function duration(secs: number): string {
  return secs % 3600 === 0 ? `${secs / 3600} hour${secs === 3600 ? "" : "s"}` : secs % 60 === 0 ? `${secs / 60} minute${secs === 60 ? "" : "s"}` : `${secs} seconds`;
}

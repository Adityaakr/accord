// The /try room's re-arm (ARCHITECTURE.md 11): one public room with fictional principals of its own, kept usable
// for strangers. It feeds one item at a time, installs a new agent key a while after a revocation (a real
// agreement needs its buyer for that; the room says so), tops up the room's NEAR, and when the room is used up
// closes it and opens a fresh one, at most TRY_MAX_ROOMS_PER_DAY a UTC day. It never asks for a payment: the agent
// does, for what a visitor's message asks. One exception, by the contract's rule: closing a room whose term ended
// settles any item the terms already made payable, as `close` does in every agreement.

import { formatNear, type AgreementView, type ItemView, type Receipt } from "@accord/sdk";

export interface RearmConfig {
  /** Seconds between an item being paid and the next one's delivery (one hour on testnet). */
  itemIntervalSecs: number;
  /** Seconds after a revocation before a new agent key (five minutes on testnet). */
  rearmSecs: number;
  maxRoomsPerDay: number;
  /** Below this many yoctoNEAR liquid, the try buyer tops the room up. */
  minLiquid: bigint;
}

export const TESTNET_REARM: RearmConfig = {
  itemIntervalSecs: 3600, rearmSecs: 300, maxRoomsPerDay: 2, minLiquid: 500_000_000_000_000_000_000_000n,
};

export type RoomAction =
  | { kind: "open" }
  | { kind: "wait_for_tomorrow" }
  | { kind: "close"; reason: string }
  | { kind: "forget"; reason: string }
  | { kind: "install_key" }
  | { kind: "deliver"; item: number }
  | { kind: "top_up" }
  | { kind: "none" };

export interface RoomSnapshot {
  view: AgreementView;
  items: ItemView[];
  receipts: Receipt[];
  liquid: bigint;
}

/** What the re-arm should do now, given the open room (if any), when its key went missing, and today's count. */
export function nextAction(
  room: RoomSnapshot | null,
  now: number,
  keylessSince: number | null,
  openedToday: number,
  cfg: RearmConfig,
): RoomAction {
  if (!room) return openedToday < cfg.maxRoomsPerDay ? { kind: "open" } : { kind: "wait_for_tomorrow" };
  const { view, items, receipts } = room;
  if (view.state !== "Executing") return { kind: "forget", reason: `the room is ${view.state}` };
  // Never act while a payment or a close step is in flight: closing now would be refused, not done.
  if (view.in_flight || view.closing) return { kind: "none" };
  const paid = items.filter((i) => i.status === "Paid" || i.status === "AssumedPaid").length;
  if (paid === items.length) return { kind: "close", reason: `all ${items.length} items paid` };
  if (view.ends_at !== null && now >= view.ends_at) return { kind: "close", reason: "the term ended" };
  if (!view.agent_key) {
    return keylessSince !== null && now - keylessSince >= cfg.rearmSecs ? { kind: "install_key" } : { kind: "none" };
  }
  if (room.liquid < cfg.minLiquid) return { kind: "top_up" };
  if (items.some((i) => i.status === "Delivered" || i.status === "Eligible")) return { kind: "none" };
  const next = items.find((i) => i.status === "Open");
  if (!next) return { kind: "none" };
  const lastPaid = receipts.reduce((m, r) => Math.max(m, r.at), 0);
  return lastPaid === 0 || now - lastPaid >= cfg.itemIntervalSecs ? { kind: "deliver", item: next.id } : { kind: "none" };
}

export function describe(a: RoomAction, liquid?: bigint): string {
  switch (a.kind) {
    case "deliver": return `item ${a.item} delivered and accepted`;
    case "top_up": return `room NEAR topped up (liquid was ${formatNear(liquid ?? 0n)} NEAR)`;
    case "close": return `closed: ${a.reason}`;
    case "forget": return `released: ${a.reason}`;
    default: return a.kind.replace(/_/g, " ");
  }
}

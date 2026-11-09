"use client";

// One poll of /api/agreements/<id>/activity per room, shared by the Activity tab and the agent transcript in the
// header: every POLL_MS while the tab is visible, backing off while the server says it is busy, and once more right
// after the page's own data changes (a transaction this tab sent refreshes the page, and with it `version`).

import { useEffect, useSyncExternalStore } from "react";
import type { ActivityEntry } from "@/lib/activity";
import type { TranscriptMessage } from "@/lib/transcript";
import type { AgentActionRecord } from "@accord/store";
import { POLL_MS, isBusyStatus, nextPollDelay } from "@/components/pollbackoff";

export interface RoomActivityData {
  entries: ActivityEntry[] | null;
  complete: boolean;
  records: AgentActionRecord[];
  messages: TranscriptMessage[];
  now: number;
}

interface Slot { data: RoomActivityData | null; error: boolean; subs: Set<() => void>; timer: ReturnType<typeof setTimeout> | null; delay: number; inFlight: boolean; users: number }
const slots = new Map<string, Slot>();

function slot(id: string): Slot {
  let s = slots.get(id);
  if (!s) { s = { data: null, error: false, subs: new Set(), timer: null, delay: POLL_MS, inFlight: false, users: 0 }; slots.set(id, s); }
  return s;
}

async function load(id: string) {
  const s = slot(id);
  if (s.inFlight) return;
  s.inFlight = true;
  try {
    const r = await fetch(`/api/agreements/${encodeURIComponent(id)}/activity`, { cache: "no-store" });
    if (isBusyStatus(r.status)) { s.delay = nextPollDelay(s.delay, true, Number(r.headers.get("retry-after")) || null); return; }
    s.delay = POLL_MS;
    if (!r.ok) { s.error = true; return; }
    s.data = (await r.json()) as RoomActivityData;
    s.error = false;
  } catch {
    s.delay = nextPollDelay(s.delay, true, null);
  } finally {
    s.inFlight = false;
    s.subs.forEach((f) => f());
  }
}

function schedule(id: string) {
  const s = slot(id);
  if (s.timer) clearTimeout(s.timer);
  s.timer = setTimeout(async () => {
    if (document.visibilityState === "visible") await load(id);
    if (s.users > 0) schedule(id);
  }, s.delay);
}

export function useRoomActivity(id: string, version?: string | number): { data: RoomActivityData | null; error: boolean } {
  const s = slot(id);
  const snap = useSyncExternalStore(
    (f) => { s.subs.add(f); return () => { s.subs.delete(f); }; },
    () => s.data,
    () => null,
  );
  useEffect(() => {
    s.users++;
    if (s.users === 1) { void load(id); schedule(id); }
    return () => { s.users--; if (s.users === 0 && s.timer) { clearTimeout(s.timer); s.timer = null; } };
  }, [id, s]);
  // the page re-rendered with new chain data: read the timeline again now rather than at the next tick
  useEffect(() => { if (version !== undefined && s.data) void load(id); }, [version]); // eslint-disable-line react-hooks/exhaustive-deps
  return { data: snap, error: s.error };
}

/** Raw token units (6 decimals) as "12.00". */
export function tokenAmount(raw: string): string {
  try {
    const v = BigInt(raw);
    const whole = v / 1_000_000n, frac = (v % 1_000_000n) / 10_000n;
    return `${whole.toLocaleString("en-US")}.${frac.toString().padStart(2, "0")}`;
  } catch {
    return raw;
  }
}

/** yoctoNEAR as "0.48". */
export function nearAmount(raw: string): string {
  try {
    const v = BigInt(raw) / 10n ** 20n; // 4 places
    return `${(v / 10_000n).toString()}.${(v % 10_000n).toString().padStart(4, "0").slice(0, 2)}`;
  } catch {
    return raw;
  }
}

export function ago(at: number, now: number): string {
  const s = Math.max(0, now - at);
  return s < 60 ? `${s} s ago` : s < 5400 ? `${Math.round(s / 60)} min ago` : s < 172800 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} d ago`;
}

export function clock(at: number): string {
  return new Date(at * 1000).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

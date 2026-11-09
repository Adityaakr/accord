// The agent's transcript for the room header: what it read, what it meant to do, each act call with what the
// contract did, and its key being installed and revoked. Built only from real data: chain rows (lib/activity.ts) are
// the results; the demo agent's stored records (instruction and intent, by tx hash) and the /try inbox messages are
// the inputs the chain cannot show. Nothing is added that neither source holds. Pure, for tests.

import type { ActivityEntry } from "./activity";
import type { AgentActionRecord } from "@accord/store";

export interface TranscriptMessage {
  id: string;
  at: number;
  sender: string;
  subject: string;
  body: string;
  outcome: string | null;
  tx: string | null;
  intent?: { item: number; amount: string; recipient: string } | null;
}

export type TranscriptEntry =
  | { kind: "read"; key: string; at: number; from: string; text: string }
  | { kind: "intent"; key: string; at: number; item: number; amount: string; recipient: string }
  | { kind: "paid"; key: string; at: number; tx: string; item: number | null; amount: string | null; recipient: string | null }
  | { kind: "refused"; key: string; at: number; tx: string; code: string; item: number | null; amount: string | null; recipient: string | null }
  | { kind: "rejected"; key: string; at: number; text: string; tx: string | null }
  | { kind: "key"; key: string; at: number; tx: string; installed: boolean; reason: string | null; red: boolean };

export interface Transcript {
  entries: TranscriptEntry[];
  /** act calls and key changes: what the agent (or its key) did */
  steps: number;
  /** seconds from the first entry to the last */
  workedFor: number;
  last: TranscriptEntry | null;
}

const FROM: Record<AgentActionRecord["trigger"], string> = { auto: "Room check", pay: "Buyer", attack: "Buyer, testing a redirect" };

const isAct = (e: ActivityEntry) => (e.event === "payment_sent" || e.event === "act_refused") && e.actor === "agent";

export function buildTranscript(chain: ActivityEntry[] | null, records: AgentActionRecord[], messages: TranscriptMessage[], nowSecs: number): Transcript {
  const out: TranscriptEntry[] = [];
  const rows = chain ?? [];
  const byTx = new Map<string, ActivityEntry[]>();
  for (const e of rows) if (isAct(e)) byTx.set(e.tx, [...(byTx.get(e.tx) ?? []), e]);
  const used = new Set<string>();

  const result = (e: ActivityEntry): TranscriptEntry => e.event === "payment_sent"
    ? { kind: "paid", key: e.key, at: e.at, tx: e.tx, item: e.item, amount: e.amount, recipient: e.account }
    : { kind: "refused", key: e.key, at: e.at, tx: e.tx, code: e.code ?? "refused", item: e.item, amount: e.amount, recipient: e.account };

  const inputs = (key: string, at: number, from: string, text: string, intent: TranscriptMessage["intent"], tx: string | null, outcome: string | null) => {
    out.push({ kind: "read", key: `${key}:read`, at, from, text });
    if (intent) out.push({ kind: "intent", key: `${key}:intent`, at, ...intent });
    const hits = tx ? byTx.get(tx) : undefined;
    if (hits?.length) {
      for (const h of hits) { out.push(result(h)); used.add(h.key); }
    } else if (outcome === "rejected" || outcome === "key_revoked") {
      out.push({ kind: "rejected", key: `${key}:rejected`, at, text: "The network rejected the call: the agreement holds no key for the agent.", tx });
    } else if (outcome === "sending" && nowSecs - at > 120) {
      out.push({ kind: "rejected", key: `${key}:lost`, at, text: "No answer from the network was recorded for this call.", tx });
    }
  };

  for (const r of records) {
    const at = Math.floor(new Date(r.at).getTime() / 1000);
    inputs(`rec:${r.id}`, at, FROM[r.trigger] ?? "Buyer", r.instruction, r.intent, r.tx_hash, r.outcome);
  }
  for (const m of messages) {
    inputs(`msg:${m.id}`, m.at, m.sender, m.subject ? `${m.subject}\n${m.body}` : m.body, m.intent ?? null, m.tx, m.outcome);
  }
  // act calls with no stored input (signed before records were kept, or by another copy of the agent): the result alone
  for (const e of rows) if (isAct(e) && !used.has(e.key)) out.push(result(e));
  for (const e of rows) {
    if (e.event !== "agent_key_installed" && e.event !== "agent_key_revoked") continue;
    out.push({ kind: "key", key: e.key, at: e.at, tx: e.tx, installed: e.event === "agent_key_installed", reason: e.label, red: e.red });
  }

  const order: Record<TranscriptEntry["kind"], number> = { key: 0, read: 1, intent: 2, paid: 3, refused: 3, rejected: 3 };
  out.sort((x, y) => x.at - y.at || order[x.kind] - order[y.kind]);
  const steps = out.filter((e) => e.kind !== "read" && e.kind !== "intent").length;
  const workedFor = out.length ? out[out.length - 1]!.at - out[0]!.at : 0;
  return { entries: out, steps, workedFor, last: out.at(-1) ?? null };
}

/** "1m 33s", "42s" */
export function workedFor(secs: number): string {
  const s = Math.max(0, Math.round(secs));
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s` : `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`;
}

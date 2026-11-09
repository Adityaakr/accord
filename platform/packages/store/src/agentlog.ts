// The demo agent's own record of what it was asked and what it meant to do, per test room: the instruction it read
// (word for word), its literal intent (item, amount, recipient), the transaction it signed and what the server saw
// come back. The chain stays the source of truth for results; this holds only the inputs the chain cannot show, so
// the room's transcript can put "asked" and "meant" next to the act call and its event. No key, no mandate, no figure
// that is not already on chain.

import { randomUUID } from "node:crypto";
import type pg from "pg";

/** What made the agent act: the room's own poll ("auto"), the buyer's pay button, or the redirect demonstration. */
export type AgentTrigger = "auto" | "pay" | "attack";

export interface AgentActionRecord {
  id: string;
  agreement: string;
  at: string;
  trigger: AgentTrigger;
  /** The instruction the agent read, verbatim. */
  instruction: string;
  /** What it set out to do, before signing. */
  intent: { item: number; amount: string; recipient: string };
  /** "sending" until the network answers; then sent, refused, failed or rejected (the network refused the key). */
  outcome: string;
  code: string | null;
  tx_hash: string | null;
}

export interface AgentLogTables { agentActions?: AgentActionRecord[] }

export const AGENT_LOG_SCHEMA = `
create table if not exists agent_actions (id uuid primary key, agreement text not null, at timestamptz not null default now(),
  trigger text not null, instruction text not null check (length(instruction) <= 500), intent jsonb not null,
  outcome text not null, code text, tx_hash text);
create index if not exists agent_actions_room on agent_actions (agreement, at desc);
`;

export interface AgentLogBackend {
  db(): Promise<pg.Pool | null>;
  read(): AgentLogTables;
  mutate(f: (d: AgentLogTables) => void): void;
}

/** A file store keeps this many records per room; Postgres keeps them all and reads the newest. */
const KEEP_PER_ROOM = 200;

function row(r: Record<string, unknown>): AgentActionRecord {
  return {
    id: String(r.id), agreement: String(r.agreement), at: r.at instanceof Date ? r.at.toISOString() : String(r.at),
    trigger: r.trigger as AgentTrigger, instruction: String(r.instruction),
    intent: (typeof r.intent === "string" ? JSON.parse(r.intent) : r.intent) as AgentActionRecord["intent"],
    outcome: String(r.outcome), code: r.code == null ? null : String(r.code), tx_hash: r.tx_hash == null ? null : String(r.tx_hash),
  };
}

export function agentLog(b: AgentLogBackend) {
  return {
    /** Writes the record before the agent signs, so a crash mid-send still leaves "sending" behind (and blocks a repeat). */
    async begin(r: Pick<AgentActionRecord, "agreement" | "trigger" | "instruction" | "intent">): Promise<string> {
      const id = randomUUID();
      const instruction = r.instruction.slice(0, 500);
      const p = await b.db();
      if (p) {
        await p.query(
          "insert into agent_actions (id, agreement, trigger, instruction, intent, outcome) values ($1, $2, $3, $4, $5, 'sending')",
          [id, r.agreement, r.trigger, instruction, JSON.stringify(r.intent)],
        );
        return id;
      }
      b.mutate((d) => {
        const list = (d.agentActions ??= []);
        list.push({ ...r, instruction, id, at: new Date().toISOString(), outcome: "sending", code: null, tx_hash: null });
        const mine = list.filter((x) => x.agreement === r.agreement);
        if (mine.length > KEEP_PER_ROOM) {
          const drop = new Set(mine.slice(0, mine.length - KEEP_PER_ROOM).map((x) => x.id));
          d.agentActions = list.filter((x) => !drop.has(x.id));
        }
      });
      return id;
    },

    /** What came back: the transaction and its outcome. */
    async finish(id: string, f: { outcome: string; code?: string | null; tx_hash?: string | null }): Promise<void> {
      const p = await b.db();
      if (p) {
        await p.query("update agent_actions set outcome = $2, code = $3, tx_hash = $4 where id = $1", [id, f.outcome, f.code ?? null, f.tx_hash ?? null]);
        return;
      }
      b.mutate((d) => {
        const r = (d.agentActions ?? []).find((x) => x.id === id);
        if (r) Object.assign(r, { outcome: f.outcome, code: f.code ?? null, tx_hash: f.tx_hash ?? null });
      });
    },

    /** The room's records, oldest first. */
    async list(agreement: string, limit = 50): Promise<AgentActionRecord[]> {
      const p = await b.db();
      if (p) {
        const r = await p.query("select * from agent_actions where agreement = $1 order by at desc limit $2", [agreement, limit]);
        return r.rows.map(row).reverse();
      }
      return (b.read().agentActions ?? []).filter((x) => x.agreement === agreement).slice(-limit);
    },
  };
}

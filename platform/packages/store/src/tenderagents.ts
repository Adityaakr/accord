// Tender agents an account has linked to itself: each row says "this NEAR account runs the bidder with this key". A
// row is written only with a signature by that bidder key over "accord-tender:v1:link:<account>" (checked by the app),
// so nobody can claim another person's agent. Off chain and only for the dashboard: the board never reads it, and
// what an agent may do is decided by its key and the contracts alone.

import type pg from "pg";

export type TenderAgentSource = "browser" | "script" | "cli" | "mcp";
export interface TenderAgent { account: string; bidder: string; label: string; source: TenderAgentSource; linked_at: string }
export interface TenderAgentTables { tenderAgents?: TenderAgent[] }

export const TENDER_AGENT_SCHEMA = `
create table if not exists tender_agents (account text not null check (length(account) <= 64), bidder text not null check (bidder ~ '^[0-9a-f]{64}$'),
  label text not null check (length(label) <= 64), source text not null, linked_at timestamptz not null default now(), primary key (account, bidder));
create index if not exists tender_agents_bidder on tender_agents (bidder);
`;

interface Backend {
  db(): Promise<pg.Pool | null>;
  read(): TenderAgentTables;
  mutate(f: (d: TenderAgentTables) => void): void;
}

/** At most this many agents per account: a dashboard, not a registry. */
export const TENDER_AGENTS_MAX = 20;

export function tenderAgentStore(b: Backend) {
  const rows = (d: TenderAgentTables) => (d.tenderAgents ??= []);
  return {
    async list(account: string): Promise<TenderAgent[]> {
      const p = await b.db();
      if (p) {
        const r = await p.query("select account, bidder, label, source, linked_at::text as linked_at from tender_agents where account = $1 order by linked_at", [account]);
        return r.rows as TenderAgent[];
      }
      return rows(b.read()).filter((x) => x.account === account);
    },
    async link(account: string, bidder: string, label: string, source: TenderAgentSource): Promise<"linked" | "updated" | "full"> {
      const p = await b.db();
      if (p) {
        const n = await p.query("select count(*)::int as n, bool_or(bidder = $2) as has from tender_agents where account = $1", [account, bidder]);
        const { n: count, has } = n.rows[0] as { n: number; has: boolean | null };
        if (!has && count >= TENDER_AGENTS_MAX) return "full";
        await p.query(
          "insert into tender_agents (account, bidder, label, source) values ($1, $2, $3, $4) on conflict (account, bidder) do update set label = excluded.label, source = excluded.source",
          [account, bidder, label, source],
        );
        return has ? "updated" : "linked";
      }
      let out: "linked" | "updated" | "full" = "linked";
      b.mutate((d) => {
        const all = rows(d);
        const mine = all.filter((x) => x.account === account);
        const cur = mine.find((x) => x.bidder === bidder);
        if (cur) { cur.label = label; cur.source = source; out = "updated"; return; }
        if (mine.length >= TENDER_AGENTS_MAX) { out = "full"; return; }
        all.push({ account, bidder, label, source, linked_at: new Date().toISOString() });
      });
      return out;
    },
    async unlink(account: string, bidder: string): Promise<boolean> {
      const p = await b.db();
      if (p) return ((await p.query("delete from tender_agents where account = $1 and bidder = $2", [account, bidder])).rowCount ?? 0) > 0;
      let gone = false;
      b.mutate((d) => {
        const all = rows(d);
        const i = all.findIndex((x) => x.account === account && x.bidder === bidder);
        if (i >= 0) { all.splice(i, 1); gone = true; }
      });
      return gone;
    },
  };
}

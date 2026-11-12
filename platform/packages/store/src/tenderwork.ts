// What a tender agent tells the app between bidding and being paid. Three small tables, each row written only after
// the app checked a signature by the agent's own bidder key:
//
// - claims: "this agent runs for <account>" (the link signature, verifyLink). The account's owner sees it on their
//   dashboard and approves it with one click, which links it (./tenderagents.ts); nobody's agent joins anyone's
//   dashboard without both sides agreeing.
// - winners: the winning key names the second key that approves its recipients (the agreement's vendor_authority) and
//   the account it is paid to, so the buyer can open the agreement from the app; the relay funds those accounts once.
// - deliveries: the work a winning agent delivered for an item, hosted so the buyer can read it; the agreement holds
//   only its sha256, so a changed file no longer matches what was delivered.
//
// Off chain and advisory: the board and the agreement contracts decide everything.

import type pg from "pg";
import type { TenderAgentSource } from "./tenderagents.js";

export interface TenderClaim { account: string; bidder: string; label: string; source: TenderAgentSource; signature: string; claimed_at: string }
export interface TenderWinner {
  board: string; job: number; bidder: string; authority: string; recipient: string; funded_tx: string | null; created_at: string;
}
export interface TenderDelivery { agreement: string; item: number; bidder: string; sha256: string; content_type: string; body: string; created_at: string }
export interface TenderWorkTables { tenderClaims?: TenderClaim[]; tenderWinners?: TenderWinner[]; tenderDeliveries?: TenderDelivery[] }

/** A dashboard shows at most this many unanswered claims per account; the oldest goes first. */
export const TENDER_CLAIMS_MAX = 20;
/** A delivery is a report, not a dataset: 64 KiB of text. */
export const TENDER_DELIVERY_MAX = 65_536;

export const TENDER_WORK_SCHEMA = `
create table if not exists tender_claims (account text not null check (length(account) <= 64), bidder text not null check (bidder ~ '^[0-9a-f]{64}$'),
  label text not null check (length(label) <= 64), source text not null, signature text not null check (signature ~ '^[0-9a-f]{128}$'),
  claimed_at timestamptz not null default now(), primary key (account, bidder));
create table if not exists tender_winners (board text not null, job integer not null, bidder text not null check (bidder ~ '^[0-9a-f]{64}$'),
  authority text not null check (length(authority) <= 64), recipient text not null check (length(recipient) <= 64), funded_tx text,
  created_at timestamptz not null default now(), primary key (board, job));
create table if not exists tender_deliveries (agreement text not null check (length(agreement) <= 64), item integer not null,
  bidder text not null, sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'), content_type text not null,
  body text not null check (length(body) <= ${TENDER_DELIVERY_MAX}), created_at timestamptz not null default now(), primary key (agreement, item));
`;

interface Backend {
  db(): Promise<pg.Pool | null>;
  read(): TenderWorkTables;
  mutate(f: (d: TenderWorkTables) => void): void;
}

export function tenderWorkStore(b: Backend) {
  const claims = (d: TenderWorkTables) => (d.tenderClaims ??= []);
  const winners = (d: TenderWorkTables) => (d.tenderWinners ??= []);
  const deliveries = (d: TenderWorkTables) => (d.tenderDeliveries ??= []);
  return {
    /** Records (or refreshes) an agent's claim on an account, dropping the account's oldest beyond the cap. */
    async claim(c: Omit<TenderClaim, "claimed_at">): Promise<void> {
      const p = await b.db();
      if (p) {
        await p.query(
          `insert into tender_claims (account, bidder, label, source, signature) values ($1, $2, $3, $4, $5)
           on conflict (account, bidder) do update set label = excluded.label, source = excluded.source, signature = excluded.signature, claimed_at = now()`,
          [c.account, c.bidder, c.label, c.source, c.signature],
        );
        await p.query(
          `delete from tender_claims where account = $1 and bidder not in (select bidder from tender_claims where account = $1 order by claimed_at desc limit $2)`,
          [c.account, TENDER_CLAIMS_MAX],
        );
        return;
      }
      b.mutate((d) => {
        const rest = claims(d).filter((x) => !(x.account === c.account && x.bidder === c.bidder));
        rest.push({ ...c, claimed_at: new Date().toISOString() });
        const mine = rest.filter((x) => x.account === c.account);
        const drop = new Set(mine.slice(0, Math.max(0, mine.length - TENDER_CLAIMS_MAX)));
        d.tenderClaims = rest.filter((x) => !drop.has(x));
      });
    },
    async claims(account: string): Promise<TenderClaim[]> {
      const p = await b.db();
      if (p) {
        const r = await p.query("select account, bidder, label, source, signature, claimed_at::text as claimed_at from tender_claims where account = $1 order by claimed_at desc", [account]);
        return r.rows as TenderClaim[];
      }
      return claims(b.read()).filter((x) => x.account === account).reverse();
    },
    async dropClaim(account: string, bidder: string): Promise<void> {
      const p = await b.db();
      if (p) { await p.query("delete from tender_claims where account = $1 and bidder = $2", [account, bidder]); return; }
      b.mutate((d) => { d.tenderClaims = claims(d).filter((x) => !(x.account === account && x.bidder === bidder)); });
    },

    /** The winner's setup for a job; the first one written stands (a winner cannot swap its approver later here). */
    async setWinner(w: Omit<TenderWinner, "funded_tx" | "created_at">): Promise<TenderWinner> {
      const p = await b.db();
      if (p) {
        await p.query(
          "insert into tender_winners (board, job, bidder, authority, recipient) values ($1, $2, $3, $4, $5) on conflict (board, job) do nothing",
          [w.board, w.job, w.bidder, w.authority, w.recipient],
        );
        return (await this.winner(w.board, w.job))!;
      }
      let out: TenderWinner | undefined;
      b.mutate((d) => {
        out = winners(d).find((x) => x.board === w.board && x.job === w.job);
        if (!out) { out = { ...w, funded_tx: null, created_at: new Date().toISOString() }; winners(d).push(out); }
      });
      return { ...out! };
    },
    async winner(board: string, job: number): Promise<TenderWinner | null> {
      const p = await b.db();
      if (p) {
        const r = await p.query("select board, job, bidder, authority, recipient, funded_tx, created_at::text as created_at from tender_winners where board = $1 and job = $2", [board, job]);
        return (r.rows[0] as TenderWinner | undefined) ?? null;
      }
      return winners(b.read()).find((x) => x.board === board && x.job === job) ?? null;
    },
    /** Marks the winner's accounts funded; false when another request already did (so NEAR is sent once per job). */
    async markFunded(board: string, job: number, tx: string): Promise<boolean> {
      const p = await b.db();
      if (p) return ((await p.query("update tender_winners set funded_tx = $3 where board = $1 and job = $2 and funded_tx is null", [board, job, tx])).rowCount ?? 0) > 0;
      let ok = false;
      b.mutate((d) => {
        const w = winners(d).find((x) => x.board === board && x.job === job);
        if (w && w.funded_tx === null) { w.funded_tx = tx; ok = true; }
      });
      return ok;
    },

    /** Writes the funding transaction over the "sending" mark. */
    async recordFunded(board: string, job: number, tx: string): Promise<void> {
      const p = await b.db();
      if (p) { await p.query("update tender_winners set funded_tx = $3 where board = $1 and job = $2", [board, job, tx]); return; }
      b.mutate((d) => { const w = winners(d).find((x) => x.board === board && x.job === job); if (w) w.funded_tx = tx; });
    },
    /** Clears the mark after a failed send, so a later request may try again. */
    async unmarkFunded(board: string, job: number): Promise<void> {
      const p = await b.db();
      if (p) { await p.query("update tender_winners set funded_tx = null where board = $1 and job = $2", [board, job]); return; }
      b.mutate((d) => { const w = winners(d).find((x) => x.board === board && x.job === job); if (w) w.funded_tx = null; });
    },

    async deliver(x: Omit<TenderDelivery, "created_at">): Promise<void> {
      const p = await b.db();
      if (p) {
        await p.query(
          `insert into tender_deliveries (agreement, item, bidder, sha256, content_type, body) values ($1, $2, $3, $4, $5, $6)
           on conflict (agreement, item) do update set sha256 = excluded.sha256, content_type = excluded.content_type, body = excluded.body, created_at = now()`,
          [x.agreement, x.item, x.bidder, x.sha256, x.content_type, x.body],
        );
        return;
      }
      b.mutate((d) => {
        d.tenderDeliveries = deliveries(d).filter((y) => !(y.agreement === x.agreement && y.item === x.item));
        d.tenderDeliveries.push({ ...x, created_at: new Date().toISOString() });
      });
    },
    async delivery(agreement: string, item: number): Promise<TenderDelivery | null> {
      const p = await b.db();
      if (p) {
        const r = await p.query("select agreement, item, bidder, sha256, content_type, body, created_at::text as created_at from tender_deliveries where agreement = $1 and item = $2", [agreement, item]);
        return (r.rows[0] as TenderDelivery | undefined) ?? null;
      }
      return deliveries(b.read()).find((x) => x.agreement === agreement && x.item === item) ?? null;
    },
  };
}

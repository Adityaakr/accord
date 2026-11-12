// Timelocked reveals for sealed tender bids (packages/sdk/src/timelock.ts): the bidder's price and salt, encrypted to a
// drand round after the job's bidding deadline. Stored so the house keeper can open them once the round is out and
// send the reveal for a bidder who is offline. The store cannot read them before that round; the board checks every
// reveal against the bid's commitment, so a wrong row can only fail, never change a price.

import type pg from "pg";

export interface TenderTimelock {
  board: string; job: number; bidder: string; commitment: string; ciphertext: string; round: number;
  created_at: string; done_at: string | null; outcome: string | null;
}
export interface TenderTimelockTables { tenderTimelocks?: TenderTimelock[] }

export const TENDER_TIMELOCK_SCHEMA = `
create table if not exists tender_timelocks (board text not null, job integer not null, bidder text not null check (bidder ~ '^[0-9a-f]{64}$'),
  commitment text not null check (commitment ~ '^[0-9a-f]{64}$'), ciphertext text not null check (length(ciphertext) <= 4096),
  round bigint not null, created_at timestamptz not null default now(), done_at timestamptz, outcome text, primary key (board, job, bidder));
`;

interface Backend {
  db(): Promise<pg.Pool | null>;
  read(): TenderTimelockTables;
  mutate(f: (d: TenderTimelockTables) => void): void;
}

const COLS = "board, job, bidder, commitment, ciphertext, round::float8 as round, created_at::text as created_at, done_at::text as done_at, outcome";

export function tenderTimelockStore(b: Backend) {
  const rows = (d: TenderTimelockTables) => (d.tenderTimelocks ??= []);
  return {
    /** Keeps the latest timelock for a bidder on a job: a replaced bid replaces it. */
    async save(t: Pick<TenderTimelock, "board" | "job" | "bidder" | "commitment" | "ciphertext" | "round">): Promise<void> {
      const p = await b.db();
      if (p) {
        await p.query(
          `insert into tender_timelocks (board, job, bidder, commitment, ciphertext, round) values ($1, $2, $3, $4, $5, $6)
           on conflict (board, job, bidder) do update set commitment = excluded.commitment, ciphertext = excluded.ciphertext,
             round = excluded.round, created_at = now(), done_at = null, outcome = null`,
          [t.board, t.job, t.bidder, t.commitment, t.ciphertext, t.round],
        );
        return;
      }
      b.mutate((d) => {
        const all = rows(d).filter((x) => !(x.board === t.board && x.job === t.job && x.bidder === t.bidder));
        all.push({ ...t, created_at: new Date().toISOString(), done_at: null, outcome: null });
        d.tenderTimelocks = all;
      });
    },
    /** Timelocks on this board not yet revealed or given up on. */
    async pending(board: string, limit = 50): Promise<TenderTimelock[]> {
      const p = await b.db();
      if (p) {
        const r = await p.query(`select ${COLS} from tender_timelocks where board = $1 and done_at is null order by created_at limit $2`, [board, limit]);
        return r.rows as TenderTimelock[];
      }
      return rows(b.read()).filter((x) => x.board === board && x.done_at === null).slice(0, limit);
    },
    /** Marks a timelock finished: `outcome` is a tx hash or why it was dropped. */
    async finish(board: string, job: number, bidder: string, outcome: string): Promise<void> {
      const p = await b.db();
      if (p) {
        await p.query("update tender_timelocks set done_at = now(), outcome = $4 where board = $1 and job = $2 and bidder = $3", [board, job, bidder, outcome.slice(0, 200)]);
        return;
      }
      b.mutate((d) => {
        const t = rows(d).find((x) => x.board === board && x.job === job && x.bidder === bidder);
        if (t) { t.done_at = new Date().toISOString(); t.outcome = outcome.slice(0, 200); }
      });
    },
  };
}

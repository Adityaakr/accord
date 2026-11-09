// The app's only stored data (INTERFACES.md section 9): the /try inbox, the buyer's signed preflight approvals,
// demo vendors for the demo domain, the /try rooms and service heartbeats. Postgres when DATABASE_URL is set; a
// JSON file under app/.data for local development. No table has a column for a mandate. Organisations, members,
// invitations and the audit log live in ./orgs.ts and share the same backend.


import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { ORG_SCHEMA, orgs, type OrgTables } from "./orgs.js";
import { AGENT_LOG_SCHEMA, agentLog, type AgentLogTables } from "./agentlog.js";

export * from "./orgs.js";
export * from "./agentlog.js";

export interface InboxMessage {
  id: string;
  received_at: string;
  visitor_hash: string;
  sender: string;
  subject: string;
  body: string;
  agreement: string;
  processed_at: string | null;
  agent_action: unknown;
  outcome: string | null;
  tx_hash: string | null;
}

export interface Approval { agreement: string; recipient: string; buyer: string; signature: string; approved_at: string }
export interface DemoVendor { recipient: string; authority: string; registered_at: string }
export interface Heartbeat { service: string; at: string; detail: unknown }
export interface TryRoom { agreement: string; opened_at: string; closed_at: string | null; items_paid: number; status: "opening" | "open" | "closed" }

const SCHEMA = `
create table if not exists inbox_messages (
  id uuid primary key, received_at timestamptz not null default now(), visitor_hash text not null,
  sender text not null check (length(sender) <= 120), subject text not null check (length(subject) <= 160),
  body text not null check (length(body) <= 2000), agreement text not null, processed_at timestamptz,
  agent_action jsonb, outcome text, tx_hash text);
create index if not exists inbox_visitor on inbox_messages (visitor_hash, received_at);
create table if not exists preflight_approvals (agreement text, recipient text, buyer text, signature text, approved_at timestamptz, primary key (agreement, recipient));
create table if not exists demo_vendors (recipient text primary key, authority text not null, registered_at timestamptz not null);
create table if not exists try_rooms (agreement text primary key, opened_at timestamptz not null, closed_at timestamptz, items_paid int not null default 0, status text not null);
create table if not exists heartbeats (service text primary key, at timestamptz, detail jsonb);
create table if not exists faucet_grants (day date not null, kind text not null check (kind in ('account', 'ip')), subject text not null, granted_at timestamptz not null default now(), primary key (day, kind, subject));
create table if not exists faucet_days (day date primary key, open_yocto numeric not null, opened_at timestamptz not null default now());
`;

interface FileDb extends OrgTables, AgentLogTables {
  inbox: InboxMessage[];
  approvals: Approval[];
  demoVendors: DemoVendor[];
  heartbeats: Heartbeat[];
  tryRooms?: TryRoom[];
}

let pool: pg.Pool | null = null;
let ready: Promise<void> | null = null;

async function db(): Promise<pg.Pool | null> {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
    ready = pool.query(SCHEMA + ORG_SCHEMA + AGENT_LOG_SCHEMA).then(() => undefined);
  }
  await ready;
  return pool;
}

// Local development without Postgres: one JSON file shared by the app and the services (ACCORD_STORE_FILE).
const FILE = process.env.ACCORD_STORE_FILE ?? path.resolve(findRoot(), "app/.data/store.json");

function findRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

const EMPTY: FileDb = { inbox: [], approvals: [], demoVendors: [], heartbeats: [], tryRooms: [], orgs: [], members: [], invites: [], audit: [], notifications: [] };

/** The whole file. A missing file is an empty store; an unreadable one is an error, never silently empty. */
function readFile(): FileDb {
  let text: string;
  try {
    text = readFileSync(FILE, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(EMPTY);
    throw e;
  }
  return { ...structuredClone(EMPTY), ...(JSON.parse(text) as FileDb) };
}

/** Written to a temporary file and renamed over the old one, so a reader never sees half a file. */
function writeFile(d: FileDb) {
  mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(tmp, JSON.stringify(d, null, 2));
  renameSync(tmp, FILE);
}

const LOCK_STALE_MS = 5_000;
const pause = new Int32Array(new SharedArrayBuffer(4));

/**
 * One read-modify-write at a time across every process sharing the file (the app, the agent, the keeper): an
 * exclusive lock file taken with `wx`, retried for up to five seconds, and broken when older than that.
 */
function mutate(f: (d: FileDb) => void): void {
  mkdirSync(path.dirname(FILE), { recursive: true });
  const lock = `${FILE}.lock`;
  const until = Date.now() + LOCK_STALE_MS;
  for (;;) {
    try {
      closeSync(openSync(lock, "wx"));
      break;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      try {
        if (Date.now() - statSync(lock).mtimeMs > LOCK_STALE_MS) rmSync(lock, { force: true });
      } catch {
        // released meanwhile
      }
      if (Date.now() > until) throw new Error(`store lock ${lock} held too long`);
      Atomics.wait(pause, 0, 0, 15);
    }
  }
  try {
    const d = readFile();
    f(d);
    writeFile(d);
  } finally {
    rmSync(lock, { force: true });
  }
}

export async function countMessagesSince(sinceIso: string, visitorHash?: string): Promise<number> {
  const p = await db();
  if (p) {
    const r = visitorHash
      ? await p.query("select count(*)::int as n from inbox_messages where received_at > $1 and visitor_hash = $2", [sinceIso, visitorHash])
      : await p.query("select count(*)::int as n from inbox_messages where received_at > $1", [sinceIso]);
    return (r.rows[0] as { n: number }).n;
  }
  return readFile().inbox.filter((m) => m.received_at > sinceIso && (!visitorHash || m.visitor_hash === visitorHash)).length;
}

export async function addMessage(m: Pick<InboxMessage, "visitor_hash" | "sender" | "subject" | "body" | "agreement">): Promise<string> {
  const id = randomUUID();
  const p = await db();
  if (p) {
    await p.query(
      "insert into inbox_messages (id, visitor_hash, sender, subject, body, agreement) values ($1, $2, $3, $4, $5, $6)",
      [id, m.visitor_hash, m.sender, m.subject, m.body, m.agreement],
    );
    return id;
  }
  mutate((d) => {
    d.inbox.push({ ...m, id, received_at: new Date().toISOString(), processed_at: null, agent_action: null, outcome: null, tx_hash: null });
  });
  return id;
}

export async function recentMessages(agreement: string, limit = 20): Promise<InboxMessage[]> {
  const p = await db();
  if (p) {
    const r = await p.query("select * from inbox_messages where agreement = $1 order by received_at desc limit $2", [agreement, limit]);
    return r.rows as InboxMessage[];
  }
  return readFile().inbox.filter((m) => m.agreement === agreement).slice(-limit).reverse();
}

export async function unprocessed(limit = 20): Promise<InboxMessage[]> {
  const p = await db();
  if (p) {
    const r = await p.query("select * from inbox_messages where processed_at is null order by received_at asc limit $1", [limit]);
    return r.rows as InboxMessage[];
  }
  return readFile().inbox.filter((m) => !m.processed_at).slice(0, limit);
}

export async function markProcessed(id: string, outcome: string, action: unknown, txHash: string | null) {
  const p = await db();
  if (p) {
    await p.query("update inbox_messages set processed_at = now(), outcome = $2, agent_action = $3, tx_hash = $4 where id = $1", [id, outcome, JSON.stringify(action), txHash]);
    return;
  }
  mutate((d) => {
    const m = d.inbox.find((x) => x.id === id);
    if (m) Object.assign(m, { processed_at: new Date().toISOString(), outcome, agent_action: action, tx_hash: txHash });
  });
}

export async function saveApproval(a: Omit<Approval, "approved_at">) {
  const p = await db();
  if (p) {
    await p.query(
      "insert into preflight_approvals (agreement, recipient, buyer, signature, approved_at) values ($1, $2, $3, $4, now()) on conflict (agreement, recipient) do update set signature = excluded.signature, approved_at = now()",
      [a.agreement, a.recipient, a.buyer, a.signature],
    );
    return;
  }
  mutate((d) => {
    d.approvals = d.approvals.filter((x) => !(x.agreement === a.agreement && x.recipient === a.recipient));
    d.approvals.push({ ...a, approved_at: new Date().toISOString() });
  });
}

export async function approvals(agreement: string): Promise<Approval[]> {
  const p = await db();
  if (p) return (await p.query("select * from preflight_approvals where agreement = $1", [agreement])).rows as Approval[];
  return readFile().approvals.filter((x) => x.agreement === agreement);
}

export async function registerDemoVendor(recipient: string, authority: string) {
  const p = await db();
  if (p) {
    await p.query(
      "insert into demo_vendors (recipient, authority, registered_at) values ($1, $2, now()) on conflict (recipient) do update set authority = excluded.authority, registered_at = now()",
      [recipient, authority],
    );
    return;
  }
  mutate((d) => {
    d.demoVendors = d.demoVendors.filter((x) => x.recipient !== recipient);
    d.demoVendors.push({ recipient, authority, registered_at: new Date().toISOString() });
  });
}

/** Pairs registered in the last 24 hours: the demo domain's list-form file. */
export async function demoVendors(): Promise<DemoVendor[]> {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const p = await db();
  if (p) return (await p.query("select * from demo_vendors where registered_at > $1", [since])).rows as DemoVendor[];
  return readFile().demoVendors.filter((x) => x.registered_at > since);
}

export async function heartbeats(): Promise<Heartbeat[]> {
  const p = await db();
  if (p) return (await p.query("select * from heartbeats order by service")).rows as Heartbeat[];
  return readFile().heartbeats;
}

export async function beat(service: string, detail: unknown) {
  const p = await db();
  if (p) {
    await p.query("insert into heartbeats (service, at, detail) values ($1, now(), $2) on conflict (service) do update set at = now(), detail = excluded.detail", [service, JSON.stringify(detail)]);
    return;
  }
  mutate((d) => {
    d.heartbeats = d.heartbeats.filter((h) => h.service !== service);
    d.heartbeats.push({ service, at: new Date().toISOString(), detail });
  });
}

/** A Postgres timestamptz arrives as a Date; the store's callers always get ISO strings. */
function iso(v: unknown): string {
  return v instanceof Date ? v.toISOString() : String(v);
}

function roomRow(r: Record<string, unknown>): TryRoom {
  return {
    agreement: String(r.agreement), opened_at: iso(r.opened_at), closed_at: r.closed_at == null ? null : iso(r.closed_at),
    items_paid: Number(r.items_paid ?? 0), status: r.status as TryRoom["status"],
  };
}

/** The /try rooms the re-arm created, newest first: `opening` until it is ready, `open`, then `closed`. */
export async function tryRooms(limit = 20): Promise<TryRoom[]> {
  const p = await db();
  if (p) return (await p.query("select * from try_rooms order by opened_at desc limit $1", [limit])).rows.map(roomRow);
  return [...(readFile().tryRooms ?? [])].sort((a, b) => b.opened_at.localeCompare(a.opened_at)).slice(0, limit);
}

/** Records a room the moment it exists on chain, so a failure later in opening it is resumed, never leaked. */
export async function recordTryRoom(agreement: string, status: "opening" | "open") {
  const p = await db();
  if (p) {
    await p.query(
      "insert into try_rooms (agreement, opened_at, status) values ($1, now(), $2) on conflict (agreement) do update set status = excluded.status",
      [agreement, status],
    );
    return;
  }
  mutate((d) => {
    const r = (d.tryRooms ??= []).find((x) => x.agreement === agreement);
    if (r) r.status = status;
    else d.tryRooms.push({ agreement, opened_at: new Date().toISOString(), closed_at: null, items_paid: 0, status });
  });
}

export async function closeTryRoom(agreement: string, itemsPaid: number) {
  const p = await db();
  if (p) {
    await p.query("update try_rooms set closed_at = now(), items_paid = $2, status = 'closed' where agreement = $1", [agreement, itemsPaid]);
    return;
  }
  mutate((d) => {
    const r = (d.tryRooms ?? []).find((x) => x.agreement === agreement);
    if (r) Object.assign(r, { closed_at: new Date().toISOString(), items_paid: itemsPaid, status: "closed" });
  });
}

/** Unprocessed messages for these agreements only, oldest first, so other rooms' leftovers never block them. */
export async function unprocessedFor(agreements: readonly string[], limit = 20): Promise<InboxMessage[]> {
  if (agreements.length === 0) return [];
  const p = await db();
  if (p) {
    const r = await p.query(
      "select * from inbox_messages where processed_at is null and agreement = any($1) order by received_at asc limit $2",
      [agreements, limit],
    );
    return r.rows as InboxMessage[];
  }
  return readFile().inbox.filter((m) => !m.processed_at && agreements.includes(m.agreement)).slice(0, limit);
}

/** Marks a closed room's waiting messages, so they show an outcome instead of waiting forever. */
export async function closeRoomMessages(agreement: string) {
  const p = await db();
  if (p) {
    await p.query("update inbox_messages set processed_at = now(), outcome = 'room_closed' where agreement = $1 and processed_at is null", [agreement]);
    return;
  }
  mutate((d) => {
    for (const m of d.inbox) if (m.agreement === agreement && !m.processed_at) Object.assign(m, { processed_at: new Date().toISOString(), outcome: "room_closed" });
  });
}

// ---- faucet grants ------------------------------------------------------------------------------------------
// One testnet drip per account each UTC day, and up to `ipLimit` drips per client IP (people behind one office or
// home connection share an address), kept in Postgres so a redeploy does not reset it. The IP is stored as the
// caller gives it (the app passes a hash); an IP row's subject is `<ip>:<account>`, one row per account funded from
// that connection. Without DATABASE_URL these return null and the app keeps its in-memory limiter.

export type FaucetClaim = "granted" | "account_used" | "ip_used";

/** The UTC day a grant counts against, as YYYY-MM-DD. */
export const faucetDay = (at = new Date()) => at.toISOString().slice(0, 10);

/** Grants per client IP each day unless the caller says otherwise. */
export const FAUCET_IP_LIMIT_DEFAULT = 30;

/**
 * Claims today's grant for `account` from `ip`: the account row and one IP row are inserted together, or neither.
 * Refused when the account already had one today, or when `ipLimit` accounts were already funded from `ip`. Null
 * when there is no Postgres (the caller falls back to memory).
 */
export async function claimFaucetGrant(account: string, ip: string, day = faucetDay(), ipLimit = FAUCET_IP_LIMIT_DEFAULT): Promise<FaucetClaim | null> {
  const p = await db();
  if (!p) return null;
  const c = await p.connect();
  try {
    await c.query("begin");
    // two visitors on one connection claiming at once must not both pass the count
    await c.query("select pg_advisory_xact_lock(hashtext($1))", [`faucet|${day}|${ip}`]);
    const a = await c.query("insert into faucet_grants (day, kind, subject) values ($1, 'account', $2) on conflict do nothing", [day, account]);
    if (a.rowCount === 0) {
      await c.query("rollback");
      return "account_used";
    }
    // rows written before the limit was per account carry the bare IP as subject; they count too
    const n = await c.query("select count(*)::int as n from faucet_grants where day = $1 and kind = 'ip' and (subject = $2 or subject like $2 || ':%')", [day, ip]);
    if ((n.rows[0] as { n: number }).n >= ipLimit) {
      await c.query("rollback");
      return "ip_used";
    }
    await c.query("insert into faucet_grants (day, kind, subject) values ($1, 'ip', $2) on conflict do nothing", [day, `${ip}:${account}`]);
    await c.query("commit");
    return "granted";
  } catch (e) {
    await c.query("rollback").catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}

/** Gives back a grant whose drip failed before it spent anything. */
export async function releaseFaucetGrant(account: string, ip: string, day = faucetDay()): Promise<void> {
  const p = await db();
  if (!p) return;
  await p.query("delete from faucet_grants where day = $1 and ((kind = 'account' and subject = $2) or (kind = 'ip' and subject = $3))", [day, account, `${ip}:${account}`]);
}

/**
 * The faucet's NEAR balance when `day` (UTC) first asked: the first caller's `yocto` is kept, later callers get it
 * back. The day's net outflow (grants sent minus what Finish returned, plus gas) is this minus the balance now. Null
 * without Postgres.
 */
export async function faucetDayOpen(day: string, yocto: bigint): Promise<bigint | null> {
  const p = await db();
  if (!p) return null;
  await p.query("insert into faucet_days (day, open_yocto) values ($1, $2) on conflict do nothing", [day, yocto.toString()]);
  const r = await p.query("select open_yocto::text as v from faucet_days where day = $1", [day]);
  const v = (r.rows[0] as { v?: string } | undefined)?.v;
  return v ? BigInt(v) : null;
}

/** Accounts granted on `day`, or null without Postgres. */
export async function faucetGrantsOn(day = faucetDay()): Promise<number | null> {
  const p = await db();
  if (!p) return null;
  const r = await p.query("select count(*)::int as n from faucet_grants where day = $1 and kind = 'account'", [day]);
  return (r.rows[0] as { n: number }).n;
}

/** Organisations, members, roles, invitations and the audit log (./orgs.ts), on the same backend as the rest. */
export const org = orgs({ db, read: () => readFile(), mutate: (f) => mutate((d) => f(d)) });

/** The demo agent's record of what it was asked and meant to do in each test room (./agentlog.ts). */
export const agentActions = agentLog({ db, read: () => readFile(), mutate: (f) => mutate((d) => f(d)) });

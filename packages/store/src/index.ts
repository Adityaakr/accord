// The app's only stored data (INTERFACES.md section 9): the /try inbox, the buyer's signed preflight approvals,
// demo vendors for the demo domain, the /try rooms and service heartbeats. Postgres when DATABASE_URL is set; a
// JSON file under app/.data for local development. No table has a column for a mandate.


import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import pg from "pg";

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
`;

interface FileDb {
  inbox: InboxMessage[];
  approvals: Approval[];
  demoVendors: DemoVendor[];
  heartbeats: Heartbeat[];
}

let pool: pg.Pool | null = null;
let ready: Promise<void> | null = null;

async function db(): Promise<pg.Pool | null> {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
    ready = pool.query(SCHEMA).then(() => undefined);
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

function readFile(): FileDb {
  try {
    return JSON.parse(readFileSync(FILE, "utf8")) as FileDb;
  } catch {
    return { inbox: [], approvals: [], demoVendors: [], heartbeats: [] };
  }
}

function writeFile(d: FileDb) {
  mkdirSync(path.dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(d, null, 2));
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
  const d = readFile();
  d.inbox.push({ ...m, id, received_at: new Date().toISOString(), processed_at: null, agent_action: null, outcome: null, tx_hash: null });
  writeFile(d);
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
  const d = readFile();
  const m = d.inbox.find((x) => x.id === id);
  if (m) Object.assign(m, { processed_at: new Date().toISOString(), outcome, agent_action: action, tx_hash: txHash });
  writeFile(d);
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
  const d = readFile();
  d.approvals = d.approvals.filter((x) => !(x.agreement === a.agreement && x.recipient === a.recipient));
  d.approvals.push({ ...a, approved_at: new Date().toISOString() });
  writeFile(d);
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
  const d = readFile();
  d.demoVendors = d.demoVendors.filter((x) => x.recipient !== recipient);
  d.demoVendors.push({ recipient, authority, registered_at: new Date().toISOString() });
  writeFile(d);
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
  const d = readFile();
  d.heartbeats = d.heartbeats.filter((h) => h.service !== service);
  d.heartbeats.push({ service, at: new Date().toISOString(), detail });
  writeFile(d);
}

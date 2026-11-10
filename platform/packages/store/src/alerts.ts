// Finance references and refusal alerts, per organisation. Off chain and private to the organisation: nothing here
// is written to NEAR, and none of it decides what the contract allows.
//
// - `org_refs`: the PO or invoice reference an organisation gives an agreement (and optionally each item), used in its
//   finance exports.
// - `org_alert_channels`: where an organisation's refusal alerts go: a webhook URL with its signing secret (generated
//   here, shown to the admin once), a Telegram chat id, an email address.
// - `alert_cursors`: the last refusal sequence already turned into alerts, per organisation and agreement, so a scan
//   never alerts twice.
// - `org_alerts`: one row per (organisation, agreement, refusal sequence): the in-app list and badge.
// - `alert_deliveries`: each webhook, Telegram or email send with its attempts, status and next retry.

import { randomBytes, randomUUID } from "node:crypto";
import type pg from "pg";

export type AlertChannel = "webhook" | "telegram" | "email";
export type DeliveryStatus = "pending" | "sending" | "delivered" | "failed";

export interface OrgRef { org_id: string; agreement: string; reference: string; items: Record<string, string>; updated_by: string; updated_at: string }
export interface AlertChannels {
  org_id: string;
  webhook_url: string | null;
  /** the HMAC secret; never sent to a browser after the response that created it */
  webhook_secret: string | null;
  telegram_chat: string | null;
  email_to: string | null;
  updated_by: string;
  updated_at: string;
}
export interface AlertCursor { org_id: string; agreement: string; last_seq: number; updated_at: string }
export interface OrgAlert {
  id: string; org_id: string; agreement: string; seq: number; code: string; at: string;
  /** the payload a webhook receives, also what the in-app list shows */
  payload: Record<string, unknown>;
  read_at: string | null;
}
export interface AlertDelivery {
  id: string; org_id: string; alert_id: string | null; channel: AlertChannel; test: boolean;
  /** the exact JSON body (webhook) or message text (telegram, email) */
  body: string;
  /** where it went: a URL, a chat id or an address, as set when it was queued */
  target: string;
  status: DeliveryStatus; attempts: number; next_at: string; last_code: number | null; last_error: string | null;
  created_at: string; delivered_at: string | null;
}

export interface AlertTables {
  orgRefs?: OrgRef[];
  alertChannels?: AlertChannels[];
  alertCursors?: AlertCursor[];
  orgAlerts?: OrgAlert[];
  alertDeliveries?: AlertDelivery[];
}

export const ALERT_SCHEMA = `
create table if not exists org_refs (org_id uuid not null references orgs(id) on delete cascade, agreement text not null,
  reference text not null check (length(reference) <= 64), items jsonb not null default '{}', updated_by text not null,
  updated_at timestamptz not null default now(), primary key (org_id, agreement));
create table if not exists org_alert_channels (org_id uuid primary key references orgs(id) on delete cascade,
  webhook_url text check (length(webhook_url) <= 500), webhook_secret text, telegram_chat text check (length(telegram_chat) <= 64),
  email_to text check (length(email_to) <= 254), updated_by text not null, updated_at timestamptz not null default now());
create table if not exists alert_cursors (org_id uuid not null references orgs(id) on delete cascade, agreement text not null,
  last_seq int not null, updated_at timestamptz not null default now(), primary key (org_id, agreement));
create table if not exists org_alerts (id uuid primary key, org_id uuid not null references orgs(id) on delete cascade,
  agreement text not null, seq int not null, code text not null, at timestamptz not null, payload jsonb not null,
  read_at timestamptz, unique (org_id, agreement, seq));
create index if not exists org_alerts_org on org_alerts (org_id, at desc);
create table if not exists alert_deliveries (id uuid primary key, org_id uuid not null references orgs(id) on delete cascade,
  alert_id uuid, channel text not null, test boolean not null default false, body text not null, target text not null,
  status text not null, attempts int not null default 0, next_at timestamptz not null default now(), last_code int, last_error text,
  created_at timestamptz not null default now(), delivered_at timestamptz, unique (alert_id, channel));
create index if not exists alert_deliveries_due on alert_deliveries (status, next_at);
create index if not exists alert_deliveries_org on alert_deliveries (org_id, created_at desc);
`;

export interface AlertBackend {
  db(): Promise<pg.Pool | null>;
  read(): AlertTables;
  mutate(f: (d: AlertTables) => void): void;
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v == null ? null : String(v));
const json = <T>(v: unknown): T => (typeof v === "string" ? JSON.parse(v) : v) as T;

/** A webhook signing secret: `whsec_` and 32 random bytes, hex. */
export const newWebhookSecret = () => `whsec_${randomBytes(32).toString("hex")}`;

/** A file store keeps this many alerts and deliveries per organisation; Postgres keeps them all. */
const KEEP = 500;

function alertRow(r: Record<string, unknown>): OrgAlert {
  return {
    id: String(r.id), org_id: String(r.org_id), agreement: String(r.agreement), seq: Number(r.seq), code: String(r.code),
    at: iso(r.at)!, payload: json(r.payload), read_at: iso(r.read_at),
  };
}
function deliveryRow(r: Record<string, unknown>): AlertDelivery {
  return {
    id: String(r.id), org_id: String(r.org_id), alert_id: r.alert_id == null ? null : String(r.alert_id), channel: r.channel as AlertChannel,
    test: Boolean(r.test), body: String(r.body), target: String(r.target), status: r.status as DeliveryStatus, attempts: Number(r.attempts),
    next_at: iso(r.next_at)!, last_code: r.last_code == null ? null : Number(r.last_code), last_error: r.last_error == null ? null : String(r.last_error),
    created_at: iso(r.created_at)!, delivered_at: iso(r.delivered_at),
  };
}
function channelsRow(r: Record<string, unknown>): AlertChannels {
  return {
    org_id: String(r.org_id), webhook_url: r.webhook_url == null ? null : String(r.webhook_url), webhook_secret: r.webhook_secret == null ? null : String(r.webhook_secret),
    telegram_chat: r.telegram_chat == null ? null : String(r.telegram_chat), email_to: r.email_to == null ? null : String(r.email_to),
    updated_by: String(r.updated_by), updated_at: iso(r.updated_at)!,
  };
}

export function alertStore(b: AlertBackend) {
  const t = (d: AlertTables) => {
    d.orgRefs ??= []; d.alertChannels ??= []; d.alertCursors ??= []; d.orgAlerts ??= []; d.alertDeliveries ??= [];
    return d as Required<AlertTables>;
  };

  async function channels(orgId: string): Promise<AlertChannels | null> {
    const p = await b.db();
    if (p) {
      const r = await p.query("select * from org_alert_channels where org_id = $1", [orgId]);
      return r.rows[0] ? channelsRow(r.rows[0] as Record<string, unknown>) : null;
    }
    return t(b.read()).alertChannels.find((c) => c.org_id === orgId) ?? null;
  }

  return {
    // ---- references ----------------------------------------------------------------------------------------
    async reference(orgId: string, agreement: string): Promise<OrgRef | null> {
      const p = await b.db();
      if (p) {
        const r = await p.query("select * from org_refs where org_id = $1 and agreement = $2", [orgId, agreement]);
        const x = r.rows[0] as Record<string, unknown> | undefined;
        return x ? { org_id: String(x.org_id), agreement: String(x.agreement), reference: String(x.reference), items: json(x.items), updated_by: String(x.updated_by), updated_at: iso(x.updated_at)! } : null;
      }
      return t(b.read()).orgRefs.find((x) => x.org_id === orgId && x.agreement === agreement) ?? null;
    },

    async setReference(orgId: string, agreement: string, reference: string, items: Record<string, string>, actor: string): Promise<void> {
      const p = await b.db();
      if (p) {
        await p.query(
          "insert into org_refs (org_id, agreement, reference, items, updated_by, updated_at) values ($1, $2, $3, $4, $5, now()) on conflict (org_id, agreement) do update set reference = excluded.reference, items = excluded.items, updated_by = excluded.updated_by, updated_at = now()",
          [orgId, agreement, reference, JSON.stringify(items), actor],
        );
        return;
      }
      b.mutate((raw) => {
        const d = t(raw);
        d.orgRefs = d.orgRefs.filter((x) => !(x.org_id === orgId && x.agreement === agreement));
        d.orgRefs.push({ org_id: orgId, agreement, reference, items, updated_by: actor, updated_at: new Date().toISOString() });
      });
    },

    // ---- channels ------------------------------------------------------------------------------------------
    channels,

    /**
     * Saves the organisation's channels. A webhook URL set for the first time (or with `rotate`) gets a new secret,
     * returned here once; otherwise the secret is kept and null is returned. Clearing the URL drops the secret.
     */
    async setChannels(orgId: string, c: { webhook_url: string | null; telegram_chat: string | null; email_to: string | null; rotate?: boolean }, actor: string): Promise<{ secret: string | null }> {
      const cur = await channels(orgId);
      let secret = cur?.webhook_secret ?? null;
      let fresh: string | null = null;
      if (!c.webhook_url) secret = null;
      else if (!secret || c.rotate) secret = fresh = newWebhookSecret();
      const row: AlertChannels = { org_id: orgId, webhook_url: c.webhook_url, webhook_secret: secret, telegram_chat: c.telegram_chat, email_to: c.email_to, updated_by: actor, updated_at: new Date().toISOString() };
      const p = await b.db();
      if (p) {
        await p.query(
          "insert into org_alert_channels (org_id, webhook_url, webhook_secret, telegram_chat, email_to, updated_by, updated_at) values ($1, $2, $3, $4, $5, $6, now()) on conflict (org_id) do update set webhook_url = excluded.webhook_url, webhook_secret = excluded.webhook_secret, telegram_chat = excluded.telegram_chat, email_to = excluded.email_to, updated_by = excluded.updated_by, updated_at = now()",
          [orgId, row.webhook_url, row.webhook_secret, row.telegram_chat, row.email_to, actor],
        );
      } else {
        b.mutate((raw) => {
          const d = t(raw);
          d.alertChannels = d.alertChannels.filter((x) => x.org_id !== orgId);
          d.alertChannels.push(row);
        });
      }
      return { secret: fresh };
    },

    // ---- cursors -------------------------------------------------------------------------------------------
    async cursor(orgId: string, agreement: string): Promise<number | null> {
      const p = await b.db();
      if (p) {
        const r = await p.query("select last_seq from alert_cursors where org_id = $1 and agreement = $2", [orgId, agreement]);
        const x = r.rows[0] as { last_seq?: number } | undefined;
        return x ? Number(x.last_seq) : null;
      }
      return t(b.read()).alertCursors.find((x) => x.org_id === orgId && x.agreement === agreement)?.last_seq ?? null;
    },

    /** Moves the cursor forward only: a slower scan finishing late never moves it back. */
    async setCursor(orgId: string, agreement: string, seq: number): Promise<void> {
      const p = await b.db();
      if (p) {
        await p.query(
          "insert into alert_cursors (org_id, agreement, last_seq, updated_at) values ($1, $2, $3, now()) on conflict (org_id, agreement) do update set last_seq = greatest(alert_cursors.last_seq, excluded.last_seq), updated_at = now()",
          [orgId, agreement, seq],
        );
        return;
      }
      b.mutate((raw) => {
        const d = t(raw);
        const x = d.alertCursors.find((c) => c.org_id === orgId && c.agreement === agreement);
        if (x) { x.last_seq = Math.max(x.last_seq, seq); x.updated_at = new Date().toISOString(); }
        else d.alertCursors.push({ org_id: orgId, agreement, last_seq: seq, updated_at: new Date().toISOString() });
      });
    },

    // ---- alerts --------------------------------------------------------------------------------------------
    /** Adds the alert unless this (organisation, agreement, sequence) already has one; returns it only when new. */
    async addAlert(a: Omit<OrgAlert, "id" | "read_at">): Promise<OrgAlert | null> {
      const id = randomUUID();
      const p = await b.db();
      if (p) {
        const r = await p.query(
          "insert into org_alerts (id, org_id, agreement, seq, code, at, payload) values ($1, $2, $3, $4, $5, $6, $7) on conflict (org_id, agreement, seq) do nothing returning *",
          [id, a.org_id, a.agreement, a.seq, a.code, a.at, JSON.stringify(a.payload)],
        );
        return r.rows[0] ? alertRow(r.rows[0] as Record<string, unknown>) : null;
      }
      let out: OrgAlert | null = null;
      b.mutate((raw) => {
        const d = t(raw);
        if (d.orgAlerts.some((x) => x.org_id === a.org_id && x.agreement === a.agreement && x.seq === a.seq)) return;
        out = { ...a, id, read_at: null };
        d.orgAlerts.push(out);
        const mine = d.orgAlerts.filter((x) => x.org_id === a.org_id);
        if (mine.length > KEEP) {
          const drop = new Set(mine.sort((x, y) => x.at.localeCompare(y.at)).slice(0, mine.length - KEEP).map((x) => x.id));
          d.orgAlerts = d.orgAlerts.filter((x) => !drop.has(x.id));
        }
      });
      return out;
    },

    /** Newest first. */
    async alerts(orgId: string, limit = 50): Promise<OrgAlert[]> {
      const p = await b.db();
      if (p) return (await p.query("select * from org_alerts where org_id = $1 order by at desc, seq desc limit $2", [orgId, limit])).rows.map(alertRow);
      return t(b.read()).orgAlerts.filter((x) => x.org_id === orgId).sort((x, y) => y.at.localeCompare(x.at) || y.seq - x.seq).slice(0, limit);
    },

    async unread(orgId: string): Promise<number> {
      const p = await b.db();
      if (p) return Number(((await p.query("select count(*)::int as n from org_alerts where org_id = $1 and read_at is null", [orgId])).rows[0] as { n: number }).n);
      return t(b.read()).orgAlerts.filter((x) => x.org_id === orgId && !x.read_at).length;
    },

    /** Marks these alerts (or all of the organisation's) as read. */
    async markRead(orgId: string, ids?: string[]): Promise<void> {
      const p = await b.db();
      if (p) {
        if (ids) await p.query("update org_alerts set read_at = now() where org_id = $1 and id = any($2::uuid[]) and read_at is null", [orgId, ids]);
        else await p.query("update org_alerts set read_at = now() where org_id = $1 and read_at is null", [orgId]);
        return;
      }
      b.mutate((raw) => {
        const now = new Date().toISOString();
        for (const x of t(raw).orgAlerts) if (x.org_id === orgId && !x.read_at && (!ids || ids.includes(x.id))) x.read_at = now;
      });
    },

    // ---- deliveries ----------------------------------------------------------------------------------------
    /** Queues a send. One per (alert, channel): a second queue of the same alert on the same channel does nothing. */
    async enqueue(x: Pick<AlertDelivery, "org_id" | "alert_id" | "channel" | "test" | "body" | "target">): Promise<AlertDelivery | null> {
      const id = randomUUID();
      const now = new Date().toISOString();
      const row: AlertDelivery = { ...x, id, status: "pending", attempts: 0, next_at: now, last_code: null, last_error: null, created_at: now, delivered_at: null };
      const p = await b.db();
      if (p) {
        const r = await p.query(
          "insert into alert_deliveries (id, org_id, alert_id, channel, test, body, target, status) values ($1, $2, $3, $4, $5, $6, $7, 'pending') on conflict (alert_id, channel) do nothing returning *",
          [id, x.org_id, x.alert_id, x.channel, x.test, x.body, x.target],
        );
        return r.rows[0] ? deliveryRow(r.rows[0] as Record<string, unknown>) : null;
      }
      let out: AlertDelivery | null = null;
      b.mutate((raw) => {
        const d = t(raw);
        if (x.alert_id && d.alertDeliveries.some((y) => y.alert_id === x.alert_id && y.channel === x.channel)) return;
        out = row;
        d.alertDeliveries.push(row);
        const mine = d.alertDeliveries.filter((y) => y.org_id === x.org_id);
        if (mine.length > KEEP) {
          const drop = new Set(mine.slice(0, mine.length - KEEP).map((y) => y.id));
          d.alertDeliveries = d.alertDeliveries.filter((y) => !drop.has(y.id));
        }
      });
      return out;
    },

    /**
     * Claims up to `limit` sends that are due: pending with next_at passed, or stuck in "sending" for more than two
     * minutes (a process that died mid-send). Claimed rows move to "sending", so two processes never send one twice.
     */
    async claimDue(limit = 10, ids?: string[]): Promise<AlertDelivery[]> {
      const p = await b.db();
      const stuck = new Date(Date.now() - 120_000).toISOString();
      if (p) {
        const r = await p.query(
          `update alert_deliveries set status = 'sending', next_at = now() where id in (
             select id from alert_deliveries where ((status = 'pending' and next_at <= now()) or (status = 'sending' and next_at < $2))
             ${ids ? "and id = any($3::uuid[])" : ""} order by next_at limit $1 for update skip locked) returning *`,
          ids ? [limit, stuck, ids] : [limit, stuck],
        );
        return r.rows.map(deliveryRow);
      }
      const out: AlertDelivery[] = [];
      b.mutate((raw) => {
        const now = new Date().toISOString();
        for (const x of t(raw).alertDeliveries) {
          if (out.length >= limit) break;
          if (ids && !ids.includes(x.id)) continue;
          if ((x.status === "pending" && x.next_at <= now) || (x.status === "sending" && x.next_at < stuck)) {
            x.status = "sending";
            x.next_at = now;
            out.push({ ...x });
          }
        }
      });
      return out;
    },

    /** What one attempt did: delivered, failed for good, or pending again at `next_at`. */
    async finishDelivery(id: string, f: { status: "delivered" | "failed" | "pending"; code: number | null; error: string | null; next_at?: string }): Promise<void> {
      const p = await b.db();
      if (p) {
        await p.query(
          "update alert_deliveries set status = $2, attempts = attempts + 1, last_code = $3, last_error = $4, next_at = coalesce($5, next_at), delivered_at = case when $2 = 'delivered' then now() else delivered_at end where id = $1",
          [id, f.status, f.code, f.error, f.next_at ?? null],
        );
        return;
      }
      b.mutate((raw) => {
        const x = t(raw).alertDeliveries.find((y) => y.id === id);
        if (!x) return;
        Object.assign(x, { status: f.status, attempts: x.attempts + 1, last_code: f.code, last_error: f.error, next_at: f.next_at ?? x.next_at, delivered_at: f.status === "delivered" ? new Date().toISOString() : x.delivered_at });
      });
    },

    /** The organisation's delivery log, newest first. */
    async deliveries(orgId: string, limit = 30): Promise<AlertDelivery[]> {
      const p = await b.db();
      if (p) return (await p.query("select * from alert_deliveries where org_id = $1 order by created_at desc limit $2", [orgId, limit])).rows.map(deliveryRow);
      return t(b.read()).alertDeliveries.filter((x) => x.org_id === orgId).sort((x, y) => y.created_at.localeCompare(x.created_at)).slice(0, limit);
    },
  };
}

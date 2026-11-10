// Refusal alerts, the server half. A scan walks every organisation, finds the rooms where one of its members is the
// buyer (the factories' agreements_for, on every ledger factory), and for each room compares the contract's refusal
// count with the organisation's cursor in the store. New refusals become in-app alerts (one per organisation,
// agreement and sequence: the store's unique key) and queued sends on each channel the organisation set (webhook,
// Telegram, email). The cursor then moves forward, so a scan run twice, or by two processes, alerts once.
//
// Where it runs: inside the app process. src/instrumentation.ts starts a timer when the server boots (every
// ALERT_TICK_SECS, default 15), so alerts do not wait for anyone to open a page; the activity route and the alert
// routes also nudge it. A scan starts at most every ALERT_EVERY_SECS (default 60) and one at a time; queued sends go
// out on every tick, with retries on the schedule in lib/alerts.ts. ALERTS=off turns all of it off. If the app
// process is down, nothing is lost: the cursor is in the store and the contract keeps the last 128 refusals, so the
// next scan picks up every refusal since.

import "server-only";
import type { AgreementRecord, AgreementView, Refusal } from "@accord/sdk";
import { accord, config, symbolFor } from "./accord";
import { ledgerFactories } from "./ledger";
import { roomActivity } from "./activity";
import { alerts, org, type AlertDelivery } from "./store";
import { appUrl, emailConfigured, postWebhook, sendEmail, sendTelegram, telegramConfigured, type SendResult } from "./notify";
import { emailText, MAX_ATTEMPTS, nextAttempt, payloadFor, plan, refusalTx, retryable, telegramText, testPayload, type RefusalIn, type RefusalPayload, type RoomIn } from "@/lib/alerts";

const everyMs = () => Math.max(10, Number(process.env.ALERT_EVERY_SECS ?? 60)) * 1000;
/** On first sight of an agreement, refusals newer than this are alerted; older ones are history. */
const backfillSecs = () => Math.max(0, Number(process.env.ALERT_BACKFILL_SECS ?? 3600));
export const alertsEnabled = () => process.env.ALERTS === "on" || (process.env.ALERTS !== "off" && config().network !== "sandbox");

export interface ScanResult { orgs: number; rooms: number; alerts: number; queued: number; errors: string[] }

async function roomsOf(members: string[]): Promise<AgreementRecord[]> {
  const a = accord();
  const fs = ledgerFactories();
  const seen = new Map<string, AgreementRecord>();
  for (const m of members) {
    const lists = await Promise.all(fs.map((f, i) => (i === 0 ? a : a.onFactory(f)).listAgreements({ party: m }).catch(() => [] as AgreementRecord[])));
    for (const r of lists.flat()) if (members.includes(r.buyer)) seen.set(r.account, r);
  }
  return [...seen.values()];
}

function roomIn(v: AgreementView, due: Map<number, string>): RoomIn {
  return {
    account: v.account, title: v.title, buyer: v.buyer, vendor: v.vendor, symbol: symbolFor(v.factory), decimals: 6,
    approved: v.recipient?.account ?? null, dueAmount: (i) => due.get(i) ?? null, refusals: v.refusals, agentKey: v.agent_key,
    revokedKeys: v.revoked_keys, canaryTripped: v.canary_tripped, refusalLimit: v.params.refusal_limit, refusalWindowSecs: v.params.refusal_window_secs,
  };
}

/** Queues the alert on every channel the organisation has set and the server can send. */
async function queue(orgId: string, alertId: string | null, p: RefusalPayload): Promise<AlertDelivery[]> {
  const ch = await alerts.channels(orgId);
  const out: (AlertDelivery | null)[] = [];
  if (ch?.webhook_url && ch.webhook_secret) out.push(await alerts.enqueue({ org_id: orgId, alert_id: alertId, channel: "webhook", test: p.test, body: JSON.stringify(p), target: ch.webhook_url }));
  if (ch?.telegram_chat && telegramConfigured()) out.push(await alerts.enqueue({ org_id: orgId, alert_id: alertId, channel: "telegram", test: p.test, body: telegramText(p), target: ch.telegram_chat }));
  if (ch?.email_to && emailConfigured()) out.push(await alerts.enqueue({ org_id: orgId, alert_id: alertId, channel: "email", test: p.test, body: JSON.stringify(emailText(p)), target: ch.email_to }));
  return out.filter((x): x is AlertDelivery => !!x);
}

/** One room for one organisation: new refusals to alerts and queued sends, then the cursor. */
async function scanRoom(orgId: string, account: string, out: ScanResult, opts: { backfillSecs: number }) {
  const d = accord().agreement(account);
  const v = await d.get();
  out.rooms++;
  const cursor = await alerts.cursor(orgId, account);
  if (cursor !== null && cursor >= v.refusals) return;
  if (v.refusals === 0) { await alerts.setCursor(orgId, account, 0); return; }
  const from = Math.max(1, cursor === null ? v.refusals - 49 : cursor + 1);
  const held = (await d.refusals(from, 50)) as Refusal[];
  const { alert: todo, next } = plan(cursor, v.refusals, held as RefusalIn[], v.now, opts.backfillSecs);
  if (todo.length) {
    const [items, activity] = await Promise.all([
      d.items().catch(() => []),
      roomActivity({ agreement: account, buyer: v.buyer, vendor: v.vendor, authority: v.vendor_authority, keeper: v.keeper }).catch(() => null),
    ]);
    const due = new Map(items.map((it) => [it.id, it.due_amount]));
    const room = roomIn(v, due);
    for (const r of todo as RefusalIn[]) {
      const found = refusalTx(r, activity?.entries ?? []);
      const p = payloadFor(r, room, held as RefusalIn[], { tx: found.tx, revokedInTx: found.revokedInTx, explorer: config().explorer, appUrl: appUrl() });
      const a = await alerts.addAlert({ org_id: orgId, agreement: account, seq: r.seq, code: r.code, at: p.at, payload: p as unknown as Record<string, unknown> });
      if (!a) continue;
      out.alerts++;
      out.queued += (await queue(orgId, a.id, p)).length;
    }
  }
  await alerts.setCursor(orgId, account, next);
}

/** One pass over every organisation (or the ones named). */
export async function scanOnce(opts: { orgIds?: string[]; backfillSecs?: number } = {}): Promise<ScanResult> {
  const out: ScanResult = { orgs: 0, rooms: 0, alerts: 0, queued: 0, errors: [] };
  const list = (await org.list()).filter((o) => !opts.orgIds || opts.orgIds.includes(o.id));
  for (const o of list) {
    out.orgs++;
    const members = (await org.members(o.id)).map((m) => m.account_id);
    const rooms = await roomsOf(members).catch(() => [] as AgreementRecord[]);
    for (const r of rooms) {
      await scanRoom(o.id, r.account, out, { backfillSecs: opts.backfillSecs ?? backfillSecs() })
        .catch((e: Error) => { out.errors.push(`${r.account}: ${String(e?.message ?? e).split("\n")[0]!.slice(0, 120)}`); });
    }
  }
  return out;
}

async function sendOne(x: AlertDelivery): Promise<SendResult> {
  if (x.channel === "webhook") {
    const ch = await alerts.channels(x.org_id);
    if (!ch?.webhook_secret || !ch.webhook_url) return { ok: false, code: null, error: "the webhook was removed" };
    return postWebhook(x.target, x.body, ch.webhook_secret);
  }
  if (x.channel === "telegram") return sendTelegram(x.target, x.body);
  const m = JSON.parse(x.body) as { subject: string; text: string };
  return sendEmail(x.target, m.subject, m.text);
}

/** Sends what is due (or exactly `ids`), each once, and records the outcome and the next retry. */
export async function deliverDue(ids?: string[]): Promise<{ id: string; channel: string; ok: boolean; code: number | null; error: string | null }[]> {
  const claimed = await alerts.claimDue(ids ? ids.length : 10, ids);
  const out = [];
  for (const x of claimed) {
    const r = await sendOne(x).catch((e: Error) => ({ ok: false, code: null, error: e.message.slice(0, 160) }) as SendResult);
    const attempts = x.attempts + 1;
    const again = !r.ok && retryable(r.code) && attempts < MAX_ATTEMPTS ? nextAttempt(attempts, Date.now()) : { retry: false as const };
    await alerts.finishDelivery(x.id, r.ok ? { status: "delivered", code: r.code, error: null }
      : again.retry ? { status: "pending", code: r.code, error: r.error, next_at: again.at } : { status: "failed", code: r.code, error: r.error });
    out.push({ id: x.id, channel: x.channel, ...r });
  }
  return out;
}

/** Queues a test alert on the named channel (or every channel set) and sends it now. */
export async function sendTest(orgId: string, channel?: "webhook" | "telegram" | "email") {
  const p = testPayload(appUrl(), config().explorer);
  const queued = (await queue(orgId, null, p)).filter((x) => !channel || x.channel === channel);
  return deliverDue(queued.map((x) => x.id));
}

let lastScan = 0;
let lastSend = 0;
let scanning: Promise<unknown> | null = null;
let sending: Promise<unknown> | null = null;

/** Starts a scan when one is due and sends what is queued; never throws and never waits. */
export function maybeAlerts(): void {
  if (!alertsEnabled()) return;
  const now = Date.now();
  if (!scanning && now - lastScan >= everyMs()) {
    lastScan = now;
    scanning = scanOnce()
      .then((r) => { if (r.alerts || r.errors.length) console.log(`[alerts] scan: ${r.alerts} new, ${r.queued} queued, ${r.rooms} rooms, ${r.errors.length} errors`); })
      .catch((e: Error) => console.error(`[alerts] scan: ${e.message}`))
      .finally(() => { scanning = null; });
  }
  if (!sending && now - lastSend >= 5_000) {
    lastSend = now;
    sending = deliverDue()
      .then((r) => { for (const x of r) console.log(`[alerts] ${x.channel} ${x.id.slice(0, 8)} ${x.ok ? "delivered" : `failed: ${x.error}`}`); })
      .catch((e: Error) => console.error(`[alerts] send: ${e.message}`))
      .finally(() => { sending = null; });
  }
}

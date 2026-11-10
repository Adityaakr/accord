// The Telegram bot's inbox, read by polling (getUpdates), so connecting needs no webhook and no public bot URL. When
// someone taps Start on a connect link from Settings > Alerts, the bot receives "/start <param>"; the param names the
// organisation (lib/telegramlink.ts), and that chat becomes the organisation's Telegram channel, the other channels
// unchanged. The bot answers in the chat either way. Polled on the alert timer (instrumentation.ts) and, while the
// Alerts settings page waits for a connection, by its reads. One poll at a time, at most every 2 s.
import "server-only";
import { createHash } from "node:crypto";
import { alerts, org } from "./store";
import { sendTelegram } from "./notify";
import { makeStart, readStart, startParam } from "@/lib/telegramlink";

interface Update { update_id: number; message?: { text?: string; chat: { id: number; type: string; title?: string } } }

const token = () => process.env.TELEGRAM_BOT_TOKEN ?? "";
const linkKey = () => createHash("sha256").update(`accord-telegram-link:${token()}`).digest("hex");
const api = async <T>(method: string, body: unknown): Promise<T | null> => {
  const r = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  const b = (await r?.json().catch(() => null)) as { ok?: boolean; result?: T } | null;
  return b?.ok ? (b.result ?? null) : null;
};

const g = globalThis as { __accordTg?: { offset: number; last: number; running: Promise<void> | null; username: string | null } };
const st = () => (g.__accordTg ??= { offset: 0, last: 0, running: null, username: null });

/** The bot's @username (without the @), from getMe, cached. */
export async function botUsername(): Promise<string | null> {
  if (!token()) return null;
  const s = st();
  if (!s.username) s.username = (await api<{ username?: string }>("getMe", {}))?.username ?? null;
  return s.username;
}

/** The connect links for an organisation: a private chat, and a group the bot is added to. */
export async function connectLinks(orgId: string): Promise<{ chat: string; group: string; expires_in: number } | null> {
  const u = await botUsername();
  if (!u) return null;
  const p = makeStart(orgId, linkKey(), Math.floor(Date.now() / 1000));
  return { chat: `https://t.me/${u}?start=${p}`, group: `https://t.me/${u}?startgroup=${p}`, expires_in: 15 * 60 };
}

async function handle(u: Update) {
  const m = u.message;
  const p = startParam(m?.text);
  if (!m || p === null) return;
  const chat = String(m.chat.id);
  const orgId = p ? readStart(p, linkKey(), Math.floor(Date.now() / 1000)) : null;
  if (!orgId) {
    await sendTelegram(chat, p
      ? "This connect link has expired or is not valid. In Accord, open Settings › Alerts and press <b>Connect Telegram</b> again."
      : "To get Accord's refused-payment alerts here, open Settings › Alerts in Accord and press <b>Connect Telegram</b>.");
    return;
  }
  const cur = await alerts.channels(orgId);
  await alerts.setChannels(orgId, { webhook_url: cur?.webhook_url ?? null, telegram_chat: chat, email_to: cur?.email_to ?? null }, "telegram");
  await org.log(orgId, "telegram", "alerts.channels", { telegram: true, via: "connect link", chat_type: m.chat.type }).catch(() => {});
  const where = m.chat.type === "private" ? "this chat" : `“${(m.chat.title ?? "this group").replace(/[<>&]/g, "")}”`;
  await sendTelegram(chat, `Connected. When a contract refuses a payment by an agent in a room where your organisation is the buyer, Accord tells ${where}.\n\nTo stop, remove Telegram in Settings › Alerts.`);
}

async function pollOnce() {
  const s = st();
  const ups = await api<Update[]>("getUpdates", { offset: s.offset || undefined, timeout: 0, allowed_updates: ["message"] });
  for (const u of ups ?? []) {
    s.offset = Math.max(s.offset, u.update_id + 1);
    try { await handle(u); } catch (e) { console.error(`[telegram] update ${u.update_id}: ${(e as Error).message}`); }
  }
}

/** Reads the bot's new messages and connects chats; a no-op without TELEGRAM_BOT_TOKEN. */
export function pollTelegram(): Promise<void> {
  if (!token()) return Promise.resolve();
  const s = st();
  if (s.running) return s.running;
  if (Date.now() - s.last < 2000) return Promise.resolve();
  s.last = Date.now();
  s.running = pollOnce().catch(() => {}).finally(() => { s.running = null; });
  return s.running;
}

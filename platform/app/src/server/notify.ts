// The three ways a refusal alert leaves Accord: a signed webhook POST (through the SSRF guard), a Telegram message
// through the Bot API (TELEGRAM_BOT_TOKEN), and an email through Resend's HTTP API (RESEND_API_KEY). Each returns
// what happened, for the delivery log; none of them throws, and no secret or token is ever in what they return.

import "server-only";
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { sign, SIGNATURE_HEADER } from "@/lib/alerts";
import { checkResolved, checkWebhookUrl } from "@/lib/ssrf";

export interface SendResult { ok: boolean; code: number | null; error: string | null }

const TIMEOUT_MS = 8_000;
/** We read at most this much of a receiver's answer, and only to close the connection cleanly. */
const MAX_RESPONSE = 64 * 1024;

export const devHttpAllowed = () => process.env.NODE_ENV !== "production" || process.env.ACCORD_WEBHOOK_DEV_HTTP === "1";
export const telegramConfigured = () => Boolean(process.env.TELEGRAM_BOT_TOKEN);
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

/** The app's public address for links in alerts (no trailing slash). */
export function appUrl(): string {
  return (process.env.ACCORD_APP_URL || "https://accordweb-production.up.railway.app/app").replace(/\/+$/, "");
}

/** Checks a webhook URL as Settings saves it: the shape, then every address its host resolves to. */
export async function vetWebhookUrl(raw: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const c = checkWebhookUrl(raw, { allowDevHttp: devHttpAllowed() });
  if (!c.ok) return c;
  if (c.dev) return { ok: true, url: c.url.toString() };
  const addrs = await lookup(c.url.hostname, { all: true, verbatim: true }).catch(() => []);
  const r = checkResolved(addrs.map((a) => a.address));
  return r.ok ? { ok: true, url: c.url.toString() } : r;
}

/**
 * POSTs the body with its signature to the URL. The host is resolved once here and every answer checked; the
 * connection then goes to the checked address (the TLS name is still the host), so a second DNS answer cannot point
 * it somewhere private. Redirects are not followed: a 3xx counts as a failure.
 */
export async function postWebhook(raw: string, body: string, secret: string, nowSecs = Math.floor(Date.now() / 1000)): Promise<SendResult> {
  const c = checkWebhookUrl(raw, { allowDevHttp: devHttpAllowed() });
  if (!c.ok) return { ok: false, code: null, error: c.error };
  const u = c.url;
  let address: string;
  let family: 4 | 6;
  if (c.dev) {
    address = u.hostname === "[::1]" ? "::1" : "127.0.0.1";
    family = address === "::1" ? 6 : 4;
  } else {
    const addrs = await lookup(u.hostname, { all: true, verbatim: true }).catch(() => []);
    const r = checkResolved(addrs.map((a) => a.address));
    if (!r.ok) return { ok: false, code: null, error: r.error };
    ({ address, family } = r);
  }
  const lib = u.protocol === "https:" ? https : http;
  return new Promise<SendResult>((resolve) => {
    let done = false;
    const finish = (r: SendResult) => { if (!done) { done = true; resolve(r); } };
    const req = lib.request({
      protocol: u.protocol, hostname: u.hostname.replace(/^\[|\]$/g, ""), port: u.port || (u.protocol === "https:" ? 443 : 80),
      path: `${u.pathname}${u.search}`, method: "POST", servername: u.protocol === "https:" ? u.hostname : undefined,
      // pinned to the address checked above
      lookup: ((_h: string, o: { all?: boolean }, cb: (...a: unknown[]) => void) => (o?.all ? cb(null, [{ address, family }]) : cb(null, address, family))) as never,
      headers: {
        "content-type": "application/json", "content-length": Buffer.byteLength(body), "user-agent": "Accord-Webhooks/1",
        [SIGNATURE_HEADER]: sign(secret, body, nowSecs),
      },
      timeout: TIMEOUT_MS,
    }, (res) => {
      let n = 0;
      res.on("data", (chunk: Buffer) => { n += chunk.length; if (n > MAX_RESPONSE) res.destroy(); });
      const status = res.statusCode ?? 0;
      const end = () => finish({ ok: status >= 200 && status < 300, code: status, error: status >= 200 && status < 300 ? null : `HTTP ${status}` });
      res.on("end", end);
      res.on("close", end);
    });
    req.on("timeout", () => { req.destroy(); finish({ ok: false, code: null, error: `no answer within ${TIMEOUT_MS / 1000} s` }); });
    req.on("error", (e) => finish({ ok: false, code: null, error: e.message.split("\n")[0]!.slice(0, 160) }));
    req.end(body);
  });
}

const scrub = (s: string) => {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  return t ? s.split(t).join("<token>") : s;
};

/** One Telegram message to a chat, HTML parse mode, link previews off. */
export async function sendTelegram(chat: string, text: string): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, code: null, error: "TELEGRAM_BOT_TOKEN is not set" };
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", link_preview_options: { is_disabled: true } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (r.ok) return { ok: true, code: r.status, error: null };
    const b = (await r.json().catch(() => null)) as { description?: string } | null;
    return { ok: false, code: r.status, error: scrub(b?.description ?? `HTTP ${r.status}`).slice(0, 160) };
  } catch (e) {
    return { ok: false, code: null, error: scrub((e as Error).message).slice(0, 160) };
  }
}

/** One plain-text email through Resend's HTTP API. */
export async function sendEmail(to: string, subject: string, text: string): Promise<SendResult> {
  const keyValue = process.env.RESEND_API_KEY;
  if (!keyValue) return { ok: false, code: null, error: "RESEND_API_KEY is not set" };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { authorization: `Bearer ${keyValue}`, "content-type": "application/json" },
      body: JSON.stringify({ from: process.env.RESEND_FROM ?? "Accord <alerts@accord.app>", to: [to], subject, text }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return r.ok ? { ok: true, code: r.status, error: null } : { ok: false, code: r.status, error: `HTTP ${r.status}` };
  } catch (e) {
    return { ok: false, code: null, error: (e as Error).message.slice(0, 160) };
  }
}

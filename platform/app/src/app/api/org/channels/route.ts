// Where the organisation's refusal alerts go (Settings > Alerts). GET: the channels (never the webhook secret), what
// the server can send (Telegram and email need TELEGRAM_BOT_TOKEN and RESEND_API_KEY) and the delivery log. Any
// member can read; only an admin can change them.
// PUT {webhook_url, telegram_chat, email_to, rotate?}: saves them. A webhook URL is checked against the SSRF rules
// (lib/ssrf.ts) before it is stored; the signing secret is returned once, when it is created or rotated.
// POST {action:"test", channel?}: sends a test alert now on the channel (or every channel set) and returns the result.
// POST {action:"telegram-link"}: a signed, 15-minute t.me link; tapping Start on it connects that chat (server/telegrambot.ts).
// GET ?watch=telegram: reads the bot's new messages first, so the page sees a connection within seconds.
import { NextResponse } from "next/server";
import { OrgError } from "@accord/store";
import { alerts, org } from "@/server/store";
import { body, withSession } from "@/server/orgapi";
import { allow } from "@/server/ratelimit";
import { emailConfigured, telegramConfigured, vetWebhookUrl, devHttpAllowed } from "@/server/notify";
import { alertsEnabled, sendTest } from "@/server/alerts";
import { cleanChat, cleanEmail } from "@/lib/alerts";
import { connectLinks, pollTelegram } from "@/server/telegrambot";

export const dynamic = "force-dynamic";

async function admin(account: string) {
  const m = await org.membership(account);
  if (!m) throw new OrgError("not_found", "no organisation");
  return m;
}

export async function GET(req: Request) {
  return withSession(req, async (account) => {
    const m = await admin(account);
    if (new URL(req.url).searchParams.get("watch") === "telegram") await pollTelegram();
    const [ch, log] = await Promise.all([alerts.channels(m.org.id), alerts.deliveries(m.org.id, 30)]);
    return NextResponse.json({
      webhook_url: ch?.webhook_url ?? null, has_secret: Boolean(ch?.webhook_secret), telegram_chat: ch?.telegram_chat ?? null, email_to: ch?.email_to ?? null,
      updated_by: ch?.updated_by ?? null, updated_at: ch?.updated_at ?? null,
      available: { telegram: telegramConfigured(), email: emailConfigured(), scanning: alertsEnabled(), dev_http: devHttpAllowed() },
      deliveries: log.map((d) => ({ id: d.id, channel: d.channel, test: d.test, target: d.target, status: d.status, attempts: d.attempts, last_code: d.last_code, last_error: d.last_error, next_at: d.next_at, created_at: d.created_at, delivered_at: d.delivered_at })),
    }, { headers: { "cache-control": "no-store" } });
  });
}

export async function PUT(req: Request) {
  return withSession(req, async (account) => {
    const m = await admin(account);
    if (m.member.role !== "admin") throw new OrgError("forbidden", "only an admin can change where alerts go");
    const b = await body<{ webhook_url?: unknown; telegram_chat?: unknown; email_to?: unknown; rotate?: unknown }>(req);
    let url: string | null = null;
    if (typeof b.webhook_url === "string" && b.webhook_url.trim()) {
      const v = await vetWebhookUrl(b.webhook_url);
      if (!v.ok) throw new OrgError("invalid", `webhook URL: ${v.error}`);
      url = v.url;
    }
    let chat: string | null;
    let email: string | null;
    try { chat = cleanChat(b.telegram_chat); email = cleanEmail(b.email_to); } catch (e) { throw new OrgError("invalid", (e as Error).message); }
    const { secret } = await alerts.setChannels(m.org.id, { webhook_url: url, telegram_chat: chat, email_to: email, rotate: b.rotate === true }, account);
    await org.log(m.org.id, account, "alerts.channels", { webhook: Boolean(url), telegram: Boolean(chat), email: Boolean(email), rotated: Boolean(secret) && b.rotate === true });
    return NextResponse.json({ ok: true, secret });
  });
}

export async function POST(req: Request) {
  return withSession(req, async (account) => {
    const m = await admin(account);
    if (m.member.role !== "admin") throw new OrgError("forbidden", "only an admin can send a test");
    if (!allow(`alert-test:${m.org.id}`, 6, 60_000)) return NextResponse.json({ error: "too many tests; wait a minute" }, { status: 429 });
    const b = await body<{ action?: string; channel?: string }>(req);
    if (b.action === "telegram-link") {
      const links = await connectLinks(m.org.id);
      return links ? NextResponse.json(links) : NextResponse.json({ error: "Telegram is not set up on this server" }, { status: 409 });
    }
    if (b.action !== "test") return NextResponse.json({ error: "unknown action" }, { status: 400 });
    const channel = b.channel === "webhook" || b.channel === "telegram" || b.channel === "email" ? b.channel : undefined;
    const results = await sendTest(m.org.id, channel);
    if (results.length === 0) return NextResponse.json({ error: channel ? `no ${channel} channel is set up` : "no channel is set up" }, { status: 409 });
    return NextResponse.json({ results });
  });
}

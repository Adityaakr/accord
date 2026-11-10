// GET /api/org/alerts: the organisation's refusal alerts, newest first, and how many are unread (the badge).
// POST {action:"read", ids?}: marks them read. Any member. Each call also nudges the alert scan (server/alerts.ts).
import { NextResponse } from "next/server";
import { alerts, org } from "@/server/store";
import { body, withSession } from "@/server/orgapi";
import { maybeAlerts } from "@/server/alerts";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  maybeAlerts();
  return withSession(req, async (account) => {
    const m = await org.membership(account);
    if (!m) return NextResponse.json({ alerts: [], unread: 0 }, { headers: { "cache-control": "no-store" } });
    const limit = Math.min(100, Math.max(1, Number(new URL(req.url).searchParams.get("limit") ?? 50) || 50));
    const [list, unread] = await Promise.all([alerts.alerts(m.org.id, limit), alerts.unread(m.org.id)]);
    return NextResponse.json({ alerts: list.map(({ org_id: _o, ...a }) => a), unread }, { headers: { "cache-control": "no-store" } });
  });
}

export async function POST(req: Request) {
  return withSession(req, async (account) => {
    const m = await org.membership(account);
    if (!m) return NextResponse.json({ error: "no organisation" }, { status: 404 });
    const b = await body<{ action?: string; ids?: unknown }>(req);
    if (b.action !== "read") return NextResponse.json({ error: "unknown action" }, { status: 400 });
    const ids = Array.isArray(b.ids) ? b.ids.filter((x): x is string => typeof x === "string" && /^[0-9a-f-]{36}$/.test(x)).slice(0, 200) : undefined;
    await alerts.markRead(m.org.id, ids);
    return NextResponse.json({ unread: await alerts.unread(m.org.id) });
  });
}

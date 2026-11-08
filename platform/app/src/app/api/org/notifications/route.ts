// A member's notification choices. Stored now; delivery starts when email or a webhook is configured.
import { NextResponse } from "next/server";
import { org } from "@/server/store";
import { body, withSession } from "@/server/orgapi";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  return withSession(req, async (account) => {
    const m = await org.membership(account);
    if (!m) return NextResponse.json({ error: "no organisation" }, { status: 404 });
    const b = await body<{ prefs: Record<string, boolean> }>(req);
    await org.setNotifications(m.org.id, account, b.prefs ?? {});
    return NextResponse.json({ prefs: await org.notifications(m.org.id, account) });
  });
}

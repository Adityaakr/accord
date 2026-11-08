// Invite by link (and by email when an email provider is configured), or withdraw a pending invitation.
import { NextResponse } from "next/server";
import { org, ROLES, type OrgRole } from "@/server/store";
import { body, withSession } from "@/server/orgapi";
import { sendInvite } from "@/server/invitemail";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withSession(req, async (account) => {
    const m = await org.membership(account);
    if (!m) return NextResponse.json({ error: "no organisation" }, { status: 404 });
    const b = await body<{ role: OrgRole; email?: string }>(req);
    if (!ROLES.includes(b.role)) return NextResponse.json({ error: "unknown role" }, { status: 400 });
    const { token, invite } = await org.invite(m.org.id, b.role, account, { email: b.email ?? null });
    const origin = new URL(req.url).origin;
    const link = `${origin}/invite/${token}`;
    const emailed = invite.email ? await sendInvite(invite.email, link, m.org.name, invite.role) : false;
    return NextResponse.json({ link, role: invite.role, expires_at: invite.expires_at, emailed }, { status: 201 });
  });
}

export async function DELETE(req: Request) {
  return withSession(req, async (account) => {
    const m = await org.membership(account);
    if (!m) return NextResponse.json({ error: "no organisation" }, { status: 404 });
    const b = await body<{ ref: string }>(req);
    if (!/^[0-9a-f]{8}$/.test(b.ref ?? "")) return NextResponse.json({ error: "an invitation reference is required" }, { status: 400 });
    await org.revokeInvite(m.org.id, b.ref, account);
    return NextResponse.json({ ok: true });
  });
}

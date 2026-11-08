// The signed-in member's organisation: who is in it, pending invitations (admins), the audit log, their own
// notification choices, and how to prove the domain. POST creates one; PATCH renames it.
import { NextResponse } from "next/server";
import { org } from "@/server/store";
import { body, withSession } from "@/server/orgapi";
import { domainFile, domainRecord } from "@/server/domain";
import { emailConfigured } from "@/server/invitemail";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withSession(req, async (account) => {
    const m = await org.membership(account);
    if (!m) return NextResponse.json({ account, org: null }, { headers: { "cache-control": "no-store" } });
    const isAdmin = m.member.role === "admin";
    const now = Date.now();
    const [members, invites, audit, notifications] = await Promise.all([
      org.members(m.org.id),
      isAdmin ? org.invites(m.org.id) : Promise.resolve([]),
      org.audit(m.org.id, 40),
      org.notifications(m.org.id, account),
    ]);
    const { domain_token, ...publicOrg } = m.org;
    return NextResponse.json({
      account,
      org: publicOrg,
      member: m.member,
      members,
      invites: invites
        .filter((i) => !i.accepted_by && !i.revoked_at && Date.parse(i.expires_at) > now)
        .map((i) => ({ ref: i.token_hash.slice(0, 8), role: i.role, email: i.email, created_by: i.created_by, expires_at: i.expires_at })),
      audit,
      notifications,
      domain: isAdmin ? { record: domainRecord(domain_token), file: domainFile(m.org.domain) } : null,
      email: emailConfigured(),
    }, { headers: { "cache-control": "no-store" } });
  });
}

export async function POST(req: Request) {
  return withSession(req, async (account) => {
    const b = await body<{ name: string; domain: string }>(req);
    const o = await org.create(b.name ?? "", b.domain ?? "", account);
    return NextResponse.json({ id: o.id, name: o.name, domain: o.domain, record: domainRecord(o.domain_token), file: domainFile(o.domain) }, { status: 201 });
  });
}

export async function PATCH(req: Request) {
  return withSession(req, async (account) => {
    const m = await org.membership(account);
    if (!m) return NextResponse.json({ error: "no organisation" }, { status: 404 });
    const b = await body<{ name: string }>(req);
    await org.rename(m.org.id, b.name ?? "", account);
    return NextResponse.json({ ok: true });
  });
}

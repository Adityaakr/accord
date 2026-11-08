// An invitation link: what it is for (anyone with the link can read this), and accepting it (a session is needed).
import { NextResponse } from "next/server";
import { org } from "@/server/store";
import { fail, withSession } from "@/server/orgapi";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  try {
    const found = await org.lookupInvite(token);
    if (!found) return NextResponse.json({ error: "this invitation does not exist" }, { status: 404 });
    const { invite, org: o } = found;
    const status = invite.revoked_at ? "withdrawn" : invite.accepted_by ? "used" : Date.parse(invite.expires_at) < Date.now() ? "expired" : "open";
    return NextResponse.json({
      org: { name: o.name, domain: o.domain, domain_verified: Boolean(o.domain_verified_at) },
      role: invite.role, invited_by: invite.created_by, expires_at: invite.expires_at, status,
      accepted_by: invite.accepted_by,
    }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  return withSession(req, async (account) => {
    const joined = await org.acceptInvite(token, account);
    return NextResponse.json({ org: { name: joined.org.name }, role: joined.member.role });
  });
}

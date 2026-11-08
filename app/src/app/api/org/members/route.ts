// Change a member's role, or remove a member. Admins only; the organisation always keeps one admin.
import { NextResponse } from "next/server";
import { org, ROLES, type OrgRole } from "@/server/store";
import { body, withSession } from "@/server/orgapi";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  return withSession(req, async (account) => {
    const m = await org.membership(account);
    if (!m) return NextResponse.json({ error: "no organisation" }, { status: 404 });
    const b = await body<{ account: string; role: OrgRole }>(req);
    if (!ROLES.includes(b.role)) return NextResponse.json({ error: "unknown role" }, { status: 400 });
    await org.setRole(m.org.id, b.account, b.role, account);
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  return withSession(req, async (account) => {
    const m = await org.membership(account);
    if (!m) return NextResponse.json({ error: "no organisation" }, { status: 404 });
    const b = await body<{ account: string }>(req);
    await org.remove(m.org.id, b.account, account);
    return NextResponse.json({ ok: true });
  });
}

// GET/PUT /api/agreements/<id>/reference: the organisation's own PO or invoice reference for this agreement, and
// optionally per item, for its finance exports. Stored privately in the app's store for the organisation, never on
// chain. A party's organisation only (the buyer's, or the vendor's for its invoice numbers).
import { NextResponse } from "next/server";
import { accord, isConfiguredAgreement } from "@/server/accord";
import { alerts } from "@/server/store";
import { body, withSession } from "@/server/orgapi";
import { accessTo } from "@/server/exportrows";
import { cleanReference } from "@/lib/exports";

export const dynamic = "force-dynamic";

async function gate(id: string, account: string) {
  if (!isConfiguredAgreement(id)) return { error: NextResponse.json({ error: "not an agreement of this factory" }, { status: 400 }) };
  const v = await accord().agreement(id).get();
  const access = await accessTo(account, v);
  if (!access) return { error: NextResponse.json({ error: "only the agreement's parties and their organisations can see this", code: "not_party" }, { status: 403 }) };
  return { access };
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withSession(req, async (account) => {
    const g = await gate(id, account);
    if (g.error) return g.error;
    const ref = g.access.orgId ? await alerts.reference(g.access.orgId, id) : null;
    return NextResponse.json({ side: g.access.side, org: Boolean(g.access.orgId), reference: ref?.reference ?? "", items: ref?.items ?? {}, updated_at: ref?.updated_at ?? null }, { headers: { "cache-control": "no-store" } });
  });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return withSession(req, async (account) => {
    const g = await gate(id, account);
    if (g.error) return g.error;
    if (!g.access.orgId) return NextResponse.json({ error: "set up an organisation to keep references", code: "no_org" }, { status: 409 });
    const b = await body<{ reference?: unknown; items?: Record<string, unknown> }>(req);
    const items = Object.fromEntries(Object.entries(b.items ?? {}).filter(([k]) => /^\d{1,4}$/.test(k)).map(([k, v]) => [k, cleanReference(v)]).filter(([, v]) => v).slice(0, 200));
    await alerts.setReference(g.access.orgId, id, cleanReference(b.reference), items, account);
    return NextResponse.json({ ok: true, reference: cleanReference(b.reference), items });
  });
}

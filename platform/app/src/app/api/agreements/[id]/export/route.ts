// GET /api/agreements/<id>/export?format=accord|qbo|qbo4|xero[&dates=mdy][&token=tUSDC]: every payment of this
// agreement as CSV for finance (lib/exports.ts), signed from the caller's side. Only a party of the agreement, or a
// member of the same organisation as one, with a session. The public record CSV (/record.csv) is unchanged.
import { NextResponse } from "next/server";
import { accord, isConfiguredAgreement } from "@/server/accord";
import { sessionAccount } from "@/server/session";
import { allow, clientIp } from "@/server/ratelimit";
import { accessTo, csvResponse, rowsFor } from "@/server/exportrows";
import { chainErrorResponse } from "@/server/rpcerror";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isConfiguredAgreement(id)) return NextResponse.json({ error: "not an agreement of this factory" }, { status: 400 });
  if (!allow(`export:${clientIp(req)}`, 30, 60_000)) return NextResponse.json({ error: "too many requests; wait a minute" }, { status: 429 });
  const account = await sessionAccount();
  if (!account) return NextResponse.json({ error: "confirm it is you first", code: "no_session" }, { status: 401 });
  try {
    const d = accord().agreement(id);
    const [v, receipts] = await Promise.all([d.get(), d.receipts()]);
    const access = await accessTo(account, v);
    if (!access) return NextResponse.json({ error: "only the agreement's parties and their organisations can export it" }, { status: 403 });
    return csvResponse(req, await rowsFor(v, receipts, access.side, access.orgId), id);
  } catch (e) {
    return chainErrorResponse(e);
  }
}

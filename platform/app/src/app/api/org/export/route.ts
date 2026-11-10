// GET /api/org/export?format=accord|qbo|qbo4|xero[&dates=mdy][&token=tUSDC]: every payment in the rooms where the
// signed-in person's organisation (or the person, without one) is a party, as CSV for finance, each room signed from
// that side (buyer: out, vendor: in). QuickBooks and Xero files take one token: with tUSDC and USDC rooms, pass token.
import { NextResponse } from "next/server";
import { ledger } from "@/server/ledger";
import { sessionAccount } from "@/server/session";
import { allow, clientIp } from "@/server/ratelimit";
import { accessTo, csvResponse, rowsFor } from "@/server/exportrows";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!allow(`org-export:${clientIp(req)}`, 10, 60_000)) return NextResponse.json({ error: "too many requests; wait a minute" }, { status: 429 });
  const account = await sessionAccount();
  if (!account) return NextResponse.json({ error: "confirm it is you first", code: "no_session" }, { status: 401 });
  const l = await ledger("org");
  if (l.unavailable) return NextResponse.json({ error: "no organisation" }, { status: 401 });
  const rows = (await Promise.all(l.rooms.filter((r) => r.view && r.receipts.length).map(async (r) => {
    const access = await accessTo(account, r.view!);
    return access ? rowsFor(r.view!, r.receipts, access.side, access.orgId) : [];
  }))).flat();
  return csvResponse(req, rows, "organisation");
}

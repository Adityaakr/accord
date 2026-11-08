// GET /api/me?account=<id>: one person's rooms, what needs them and the Home numbers, from contract views only.
// The account is public; nothing here reads or holds a key.

import { NextResponse } from "next/server";
import { portfolio } from "@/server/data";

export const dynamic = "force-dynamic";

const ACCOUNT = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export async function GET(req: Request) {
  const account = new URL(req.url).searchParams.get("account") ?? "";
  if (!account || account.length > 64 || !ACCOUNT.test(account)) {
    return NextResponse.json({ error: "a NEAR account id is required" }, { status: 400 });
  }
  try {
    return NextResponse.json(await portfolio(account), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

// The account a /api/me* route reads for: public, validated, never a key.

import "server-only";
import { NextResponse } from "next/server";

const ACCOUNT = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export async function forAccount<T>(req: Request, read: (account: string) => Promise<T>) {
  const account = new URL(req.url).searchParams.get("account") ?? "";
  if (!account || account.length > 64 || !ACCOUNT.test(account)) {
    return NextResponse.json({ error: "a NEAR account id is required" }, { status: 400 });
  }
  try {
    return NextResponse.json(await read(account), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

// Open, read and close the app session: a NEP-413 signature from the person's wallet in, an httpOnly cookie out.
import { NextResponse } from "next/server";
import { closeSession, openSession, sessionAccount } from "@/server/session";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ account: await sessionAccount() }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return NextResponse.json({ error: "JSON only" }, { status: 415 });
  const b = (await req.json().catch(() => ({}))) as { account: string; public_key: string; signature: string; issued_at: number };
  const r = await openSession(b);
  return r.ok ? NextResponse.json({ account: b.account, expires: r.expires }) : NextResponse.json({ error: r.error }, { status: 401 });
}

export async function DELETE() {
  await closeSession();
  return NextResponse.json({ account: null });
}

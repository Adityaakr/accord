// POST /api/faucet: tops the signed-in account up to 2.5 testnet NEAR and 100 test USDC, from Accord's own faucet
// account. Testnet only, bound to the session (the account this browser proved), once a day per account and per IP.
// GET returns the session account's balances.
import { NextResponse } from "next/server";
import { sessionAccount } from "@/server/session";
import { allow, forget, sameOriginJson } from "@/server/ratelimit";
import { balances, demoReady, drip } from "@/server/demo";

export const dynamic = "force-dynamic";
const DAY = 24 * 3600_000;

export async function GET() {
  const account = await sessionAccount();
  if (!account) return NextResponse.json({ account: null, ready: demoReady().faucet });
  return NextResponse.json({ account, ready: demoReady().faucet, balances: await balances(account) });
}

export async function POST(req: Request) {
  const bad = sameOriginJson(req);
  if (bad) return NextResponse.json({ error: bad }, { status: 415 });
  if (!demoReady().faucet) return NextResponse.json({ error: "the faucet is not configured on this server" }, { status: 503 });
  const account = await sessionAccount();
  if (!account) return NextResponse.json({ error: "confirm it's you first, so the faucet knows which account to fund" }, { status: 401 });
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  if (!allow(`faucet:acct:${account}`, 1, DAY)) return NextResponse.json({ error: "this account already had test funds today" }, { status: 429 });
  if (!allow(`faucet:ip:${ip}`, 1, DAY)) {
    forget(`faucet:acct:${account}`);
    return NextResponse.json({ error: "this network already had test funds today" }, { status: 429 });
  }
  try {
    return NextResponse.json({ account, ...(await drip(account)) });
  } catch (e) {
    // nothing was sent, or only part of it: let the visitor try again (the drip only sends what is still missing)
    forget(`faucet:acct:${account}`);
    forget(`faucet:ip:${ip}`);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}

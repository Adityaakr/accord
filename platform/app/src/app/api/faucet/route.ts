// POST /api/faucet: tops the signed-in account up to 2.35 testnet NEAR and 100 test USDC, from Accord's own faucet
// account. Testnet only, bound to the session (the account this browser proved), once a UTC day per account and up to
// FAUCET_PER_IP_PER_DAY (default 30) accounts per client IP, within a daily budget of net outflow
// (FAUCET_DAILY_BUDGET_NEAR, default 25 NEAR) (server/faucetgrant.ts: Postgres when DATABASE_URL is set, so a
// redeploy does not reset it). Refused with code `budget` once a full drip no longer fits today.
// POST {"only":"near"} sends NEAR only (a Circle USDC visitor who already holds enough USDC). GET returns the session
// account's balances.
import { NextResponse } from "next/server";
import { sessionAccount } from "@/server/session";
import { clientIp, sameOriginJson } from "@/server/ratelimit";
import { budgetToday, claimGrant, FAUCET_REFUSAL, releaseGrant } from "@/server/faucetgrant";
import { balances, demoReady, drip, faucetStatus } from "@/server/demo";
import { chainErrorResponse } from "@/server/rpcerror";

export const dynamic = "force-dynamic";

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
  // the day's budget first: past it nobody is granted, and the page offers the replay and the live room instead
  const f = await faucetStatus().catch(() => null);
  if (f && !(await budgetToday(f.near)).open) return NextResponse.json({ error: FAUCET_REFUSAL.budget, code: "budget" }, { status: 429 });
  const ip = clientIp(req);
  const claim = await claimGrant(account, ip);
  if (claim === "account_used") return NextResponse.json({ error: FAUCET_REFUSAL.account_used, code: "account_used" }, { status: 429 });
  if (claim === "ip_used") return NextResponse.json({ error: FAUCET_REFUSAL.ip_used, code: "ip_used" }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { only?: unknown };
  try {
    return NextResponse.json({ account, ...(await drip(account, { nearOnly: body.only === "near" })) });
  } catch (e) {
    // nothing was sent, or only part of it: let the visitor try again (the drip only sends what is still missing)
    await releaseGrant(account, ip);
    return chainErrorResponse(e);
  }
}

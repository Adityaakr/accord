// GET /api/chain/balances?account=<id>&currency=<default|usdc>: an account's NEAR and its balance of the token the
// chosen currency settles in (tUSDC by default, Circle's USDC for "usdc"), read through the app's cache. An account
// that does not exist on chain yet has 0 NEAR, while a token may already hold funds for it (Circle's faucet pays the
// storage itself). Always 200: `{ busy: true }` when the network could not answer, so the page retries quietly.
import { NextResponse } from "next/server";
import { allow, clientIp } from "@/server/ratelimit";
import { readBalances } from "@/server/chainread";
import { readCache, tokenFor, upstreamUrls } from "@/server/chainproxy";

export const dynamic = "force-dynamic";

const ACCOUNT = /^(?=.{2,64}$)([a-z\d]+[-_])*[a-z\d]+(\.([a-z\d]+[-_])*[a-z\d]+)*$/;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const account = u.searchParams.get("account") ?? "";
  const currency = u.searchParams.get("currency") ?? "default";
  if (!ACCOUNT.test(account)) return NextResponse.json({ error: "a NEAR account id is required" }, { status: 400 });
  if (!allow(`chain:${clientIp(req)}`, 600, 60_000)) return NextResponse.json({ busy: true });
  const token = await tokenFor(currency).catch(() => null);
  if (!token) return NextResponse.json({ busy: true });
  const b = await readBalances(readCache, upstreamUrls(), account, token);
  return NextResponse.json(b === "busy" ? { busy: true } : { ...b, currency }, { headers: { "cache-control": "no-store" } });
}

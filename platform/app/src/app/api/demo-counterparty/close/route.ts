// POST /api/demo-counterparty/close {agreement}: Accord's demo vendor joins an early close the room's buyer already
// asked for on chain (mutual_close), and steps close until the room is settled: eligible items paid, the rest of the
// escrow refunded to the buyer. The end of a wallet-free try-it visit uses it so the room's NEAR can go back to the
// faucet (lib/finish.ts). Only demo rooms, only after the buyer's own request; testnet only.
import { NextResponse } from "next/server";
import { allow, clientIp, sameOriginJson } from "@/server/ratelimit";
import { demoReady, vendorClose } from "@/server/demo";
import { isConfiguredAgreement } from "@/server/accord";
import { chainErrorResponse } from "@/server/rpcerror";

export const dynamic = "force-dynamic";
const busy = new Set<string>();

export async function POST(req: Request) {
  const bad = sameOriginJson(req);
  if (bad) return NextResponse.json({ error: bad }, { status: 415 });
  if (!demoReady().counterparty) return NextResponse.json({ error: "the demo counterparty is not configured on this server" }, { status: 503 });
  const { agreement } = (await req.json().catch(() => ({}))) as { agreement?: string };
  if (typeof agreement !== "string" || !isConfiguredAgreement(agreement)) {
    return NextResponse.json({ error: "not an agreement of this factory" }, { status: 400 });
  }
  if (!allow(`close:ip:${clientIp(req)}`, 30, 3600_000) || !allow(`close:${agreement}`, 6, 60_000)) {
    return NextResponse.json({ error: "too many requests; wait a minute" }, { status: 429 });
  }
  if (busy.has(agreement)) return NextResponse.json({ state: "Executing", txs: [], pending: true });
  busy.add(agreement);
  try {
    return NextResponse.json(await vendorClose(agreement));
  } catch (e) {
    return chainErrorResponse(e, 502);
  } finally {
    busy.delete(agreement);
  }
}

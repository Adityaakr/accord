// POST /api/demo-counterparty/step {agreement}: Accord's demo vendor (and its authority) makes its next valid move in a
// room opened against it: seal its mandate, start the negotiation, approve the terms, propose and approve the
// recipient, activate it after the timelock, deliver items when due. Read from chain state each time, so calling it
// twice does nothing twice. Only rooms whose vendor is the demo vendor; testnet only.
import { NextResponse } from "next/server";
import { allow, clientIp, sameOriginJson } from "@/server/ratelimit";
import { counterpartyStep, demoReady } from "@/server/demo";
import { isConfiguredAgreement } from "@/server/accord";
import { chainErrorResponse } from "@/server/rpcerror";
import { REQUEST_DEADLINE_MS, settleWithin } from "@/server/deadline";
import { readCache } from "@/server/chainproxy";

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
  const ip = clientIp(req);
  if (!allow(`cp:ip:${ip}`, 240, 3600_000) || !allow(`cp:${agreement}`, 30, 60_000)) {
    return NextResponse.json({ error: "too many requests; wait a minute" }, { status: 429 });
  }
  if (busy.has(agreement)) return NextResponse.json({ did: null, next: "The counterparty is already acting in this room.", tx: null, yourMove: false });
  busy.add(agreement);
  // The move runs to the end whatever the request does; the room stays locked until it has. Past the deadline the
  // answer is "pending" and the panel polls again (a transaction such as start_negotiation can wait on the enclave).
  const work = counterpartyStep(agreement).finally(() => { readCache.invalidate(agreement); busy.delete(agreement); });
  try {
    const r = await settleWithin(work, REQUEST_DEADLINE_MS);
    if (!r.done) {
      work.catch(() => undefined);
      return NextResponse.json({ did: null, next: "The counterparty's transaction is on its way to the network; this panel checks again shortly.", tx: null, yourMove: false, pending: true });
    }
    return NextResponse.json(r.value);
  } catch (e) {
    // a busy RPC is a 503 with Retry-After; the panel backs off quietly
    return chainErrorResponse(e);
  }
}

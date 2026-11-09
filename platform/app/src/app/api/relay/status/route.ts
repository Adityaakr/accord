// GET /api/relay/status?hash=…&sender=…: where one relayed call is. `{ final: false }` while it is on its way (poll
// again); `{ final: true, outcome }` once it is final, with the user's own call as the outcome's status (innerStatus),
// the same outcome POST /api/relay used to wait for. A relayer transaction that failed, or a send the network refused,
// is an error with nearcore's words (such as AccessKeyNotFound after a deleted key). Read through the relayer's
// rotating provider with short timeouts and a short cache (server/relay.ts relayStatus); a busy RPC is a 503 the
// page retries. Only this relayer's transactions for this sender are reported.
import { NextResponse } from "next/server";
import { relayStatus } from "@/server/relay";
import { allow, clientIp } from "@/server/ratelimit";
import { chainErrorResponse } from "@/server/rpcerror";
import { readCache } from "@/server/chainproxy";
import { delegateReceiver, type RelayedTx } from "@/server/delegate";

export const dynamic = "force-dynamic";

const HASH = /^[1-9A-HJ-NP-Za-km-z]{32,64}$/;
const ACCOUNT = /^(?=.{2,64}$)[a-z0-9]+([-_][a-z0-9]+)*(\.[a-z0-9]+([-_][a-z0-9]+)*)*$/;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const hash = u.searchParams.get("hash") ?? "", sender = u.searchParams.get("sender") ?? "";
  if (!HASH.test(hash) || !ACCOUNT.test(sender)) return NextResponse.json({ error: "hash and sender are required" }, { status: 400 });
  if (!allow(`relay-status:${clientIp(req)}`, 600, 60_000)) return NextResponse.json({ final: false, status: "THROTTLED" }, { headers: { "retry-after": "3" } });
  try {
    const r = await relayStatus(hash, sender);
    if (!r.final) return NextResponse.json({ final: false, status: r.status });
    readCache.invalidate(sender, delegateReceiver(r.outcome as RelayedTx) ?? sender);
    return NextResponse.json({ final: true, outcome: r.outcome });
  } catch (e) {
    return chainErrorResponse(e);
  }
}

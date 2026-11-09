// Submits a user's NEP-366 signed delegate action through Accord's relayer (testnet). Same-origin JSON only,
// rate-limited per sender and per client, and only for calls into Accord (checked in relaySubmit()). The relayer pays
// gas and nothing else. Answers with the relayer transaction's hash within about 10 s, once it is INCLUDED or still on
// its way; the page then polls GET /api/relay/status?hash=…&sender=… until the call is final.
import { NextResponse } from "next/server";
import { relaySubmit } from "@/server/relay";
import { decodeSignedDelegate } from "@/server/delegate";
import { allow, clientIp, sameOriginJson } from "@/server/ratelimit";
import { chainErrorResponse } from "@/server/rpcerror";
import { readCache } from "@/server/chainproxy";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const bad = sameOriginJson(req);
  if (bad) return NextResponse.json({ error: bad }, { status: 415 });
  const client = clientIp(req);
  if (!allow(`relay-ip:${client}`, 120, 3600_000)) return NextResponse.json({ error: "too many relayed calls this hour" }, { status: 429 });
  const { signedDelegate } = (await req.json().catch(() => ({}))) as { signedDelegate?: string };
  let sender: string;
  try {
    sender = decodeSignedDelegate(signedDelegate as string).delegateAction.senderId;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  if (!allow(`relay:${sender}`, 60, 3600_000)) return NextResponse.json({ error: "too many relayed calls this hour" }, { status: 429 });
  try {
    const r = await relaySubmit(signedDelegate as string);
    // the next read of the room (or the token, or the sender) sees this call, not a cached copy from before it
    readCache.invalidate(r.sender, r.receiver);
    return NextResponse.json({ hash: r.hash, sender: r.sender, included: r.included });
  } catch (e) {
    return chainErrorResponse(e);
  }
}

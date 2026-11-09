// Submits a user's NEP-366 signed delegate action through Accord's relayer (testnet). Same-origin JSON only,
// rate-limited per sender and per client, and only for calls into Accord (checked in relay()). The relayer pays gas
// and nothing else.
import { NextResponse } from "next/server";
import { relay } from "@/server/relay";
import { decodeSignedDelegate } from "@/server/delegate";
import { allow, clientIp, sameOriginJson } from "@/server/ratelimit";
import { chainErrorResponse } from "@/server/rpcerror";

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
    const { outcome } = await relay(signedDelegate as string);
    return NextResponse.json({ outcome });
  } catch (e) {
    return chainErrorResponse(e);
  }
}

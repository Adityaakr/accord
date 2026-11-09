// POST /api/chain: the browser's NEAR reads, as JSON-RPC, through this server (server/chainread.ts). Reads only
// (view_account, call_function, access keys, block), cached for a few seconds, failing over between the server's
// endpoints. Always HTTP 200 with a JSON-RPC body, so a busy network is a quiet retry in the browser, not a console
// error. Same-origin, and limited per client IP.
import { NextResponse } from "next/server";
import { allow, clientIp, sameOriginJson } from "@/server/ratelimit";
import { busyBody, cachedRead, refuseRead, type RpcRequestBody } from "@/server/chainread";
import { readCache, upstreamUrls } from "@/server/chainproxy";

export const dynamic = "force-dynamic";

/** Reads per client IP per minute: a few open tabs polling a room stay well inside it. */
const PER_MINUTE = 600;

export async function POST(req: Request) {
  const bad = sameOriginJson(req);
  if (bad) return NextResponse.json({ error: bad }, { status: 415 });
  const body = (await req.json().catch(() => null)) as RpcRequestBody | null;
  const refused = refuseRead(body);
  const id = body?.id ?? "accord";
  if (refused) return NextResponse.json({ jsonrpc: "2.0", id, error: { code: -32600, message: refused, name: "REQUEST_VALIDATION_ERROR" } }, { status: 400 });
  if (!allow(`chain:${clientIp(req)}`, PER_MINUTE, 60_000)) return NextResponse.json(busyBody(id));
  return NextResponse.json(await cachedRead(readCache, upstreamUrls(), body!), { headers: { "cache-control": "no-store" } });
}

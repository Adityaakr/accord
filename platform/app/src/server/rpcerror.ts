// How an API route answers when a chain call fails. A busy or unreachable NEAR RPC (rate limited, 5xx, network) is a
// short 503 with Retry-After and a calm line, never the RPC's raw JSON-RPC body; the page retries quietly. Any other
// error keeps its message (a contract refusal such as ERR_NOT_BUYER is the point), unless that message is itself a
// raw RPC body.
import { isRpcBusy } from "@accord/sdk";

export const RPC_BUSY_TEXT = "The network is busy, retrying shortly.";
export const RETRY_AFTER_S = 5;

/** A message that is a JSON-RPC payload or an HTML error page, not something to show a visitor. */
export function looksRaw(msg: string): boolean {
  return /^\s*[{[<]/.test(msg) || /"jsonrpc"|"error"\s*:\s*\{|<html/i.test(msg);
}

/** The status, body and headers for a failed chain call. `status` is the route's own default for other errors. */
export function chainError(e: unknown, status = 502): { status: number; body: { error: string; busy?: true }; headers?: Record<string, string> } {
  if (isRpcBusy(e)) return { status: 503, body: { error: RPC_BUSY_TEXT, busy: true }, headers: { "Retry-After": String(RETRY_AFTER_S) } };
  const own = (e as { status?: number }).status;
  const msg = e instanceof Error ? e.message : String(e);
  return { status: own ?? status, body: { error: looksRaw(msg) ? "the chain returned an error; try again" : msg } };
}

/** `chainError` as a Response. */
export function chainErrorResponse(e: unknown, status = 502): Response {
  const r = chainError(e, status);
  return Response.json(r.body, { status: r.status, headers: r.headers });
}

// The tender relay routes' shared shape: JSON in, JSON out, open to any origin (the requests carry signed data and no
// credentials, so a browser never sends cookies), rate-limited per IP and per job, errors as {error} with a status.
import "server-only";
import { takeAll } from "./limiter";
import { clientIp } from "./clientip";
import { RelayError, parseJobId } from "./tender";

export const RELAY_CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

export const relayPreflight = () => new Response(null, { status: 204, headers: RELAY_CORS });

/** The body as text, refusing more than `max` bytes without reading the rest. */
async function cappedText(req: Request, max: number): Promise<string | null> {
  if (Number(req.headers.get("content-length") ?? "0") > max) return null;
  const reader = req.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { void reader.cancel(); return null; }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function relayRoute(
  req: Request,
  raw: Promise<{ id: string }>,
  what: string,
  perIpPerHour: number,
  run: (id: number, body: unknown, ip: string) => Promise<object>,
  maxBytes = 4096,
): Promise<Response> {
  const json = (v: unknown, status = 200) => Response.json(v, { status, headers: RELAY_CORS });
  try {
    const id = parseJobId((await raw).id);
    const ip = clientIp(req);
    // Per caller first; the job's shared allowance is spent only by requests that pass their checks (server/tender.ts).
    if (takeAll([{ key: `tender:${what}:ip:${ip}`, max: perIpPerHour, windowMs: 3_600_000 }])) return json({ error: "too many requests; try again later" }, 429);
    const text = await cappedText(req, maxBytes);
    if (text === null) return json({ error: "request too large" }, 413);
    let body: unknown = {};
    if (text) {
      try { body = JSON.parse(text); } catch { return json({ error: "the body is not JSON" }, 400); }
    }
    return json(await run(id, body, ip));
  } catch (e) {
    if (e instanceof RelayError) return json({ error: e.message }, e.status);
    return json({ error: `the relay failed: ${(e as Error).message}` }, 502);
  }
}

/** A per-IP allowance for the public GET routes (each uncached read is an RPC call). */
export function readAllowed(req: Request): boolean {
  return takeAll([{ key: `tender:read:ip:${clientIp(req)}`, max: 240, windowMs: 60_000 }]) === null;
}

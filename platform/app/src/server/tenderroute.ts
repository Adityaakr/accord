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

export async function relayRoute(
  req: Request,
  raw: Promise<{ id: string }>,
  what: string,
  perIpPerHour: number,
  run: (id: number, body: unknown) => Promise<{ ok: boolean; tx: string }>,
): Promise<Response> {
  const json = (v: unknown, status = 200) => Response.json(v, { status, headers: RELAY_CORS });
  try {
    const id = parseJobId((await raw).id);
    const full = takeAll([
      { key: `tender:${what}:ip:${clientIp(req)}`, max: perIpPerHour, windowMs: 3_600_000 },
      { key: `tender:${what}:job:${id}`, max: 200, windowMs: 3_600_000 },
    ]);
    if (full) return json({ error: "too many requests; try again later" }, 429);
    const text = await req.text();
    if (text.length > 4096) return json({ error: "request too large" }, 413);
    let body: unknown = {};
    if (text) {
      try { body = JSON.parse(text); } catch { return json({ error: "the body is not JSON" }, 400); }
    }
    return json(await run(id, body));
  } catch (e) {
    if (e instanceof RelayError) return json({ error: e.message }, e.status);
    return json({ error: `the relay failed: ${(e as Error).message}` }, 502);
  }
}

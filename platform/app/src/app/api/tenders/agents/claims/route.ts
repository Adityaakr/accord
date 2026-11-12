// POST: an agent says which account runs it, signed by its own bidder key over "accord-tender:v1:link:<account>"
// (`accord tender bid --account`, `accord tender link`). It waits on that account's dashboard until the owner approves
// it there. Open to any origin: the request carries a signature and no credentials.
// The owner approves or dismisses it on /api/tenders/agents, signed in; this route reads no login of any kind.
import { claimAccount } from "@/server/tenderwork";
import { RELAY_CORS, relayPreflight } from "@/server/tenderroute";
import { RelayError } from "@/server/tender";
import { takeAll } from "@/server/limiter";
import { clientIp } from "@/server/clientip";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const json = (v: unknown, status = 200) => Response.json(v, { status, headers: RELAY_CORS });
  if (takeAll([{ key: `tender:claims:ip:${clientIp(req)}`, max: 30, windowMs: 3_600_000 }])) return json({ error: "too many requests; try again later" }, 429);
  const text = await req.text().catch(() => "");
  if (text.length > 2048) return json({ error: "request too large" }, 413);
  try {
    return json(await claimAccount(JSON.parse(text || "{}") as Record<string, unknown>));
  } catch (e) {
    if (e instanceof RelayError) return json({ error: e.message }, e.status);
    if (e instanceof SyntaxError) return json({ error: "the body is not JSON" }, 400);
    return json({ error: (e as Error).message }, 502);
  }
}
export function OPTIONS() {
  return relayPreflight();
}

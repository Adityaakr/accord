// GET /api/check?agreement=&item=&amount=&recipient=[&block=]: would the agreement's contract pay this, or refuse it
// and why. A read-only simulation: the agreement's views at one block through accord-core's check_pay (the function
// the contract calls), built to wasm (@accord/sdk/check). No transaction, no key. Without `item`: the form data (items
// with their approved amounts, the active recipient). Readable from any origin (server/cors.ts), GET only; each client
// IP gets 30 checks a minute and the endpoint 300, since each is a few RPC reads. A past `block` the regular RPC has
// garbage collected is read from NEAR_ARCHIVAL_RPC_URL, else testnet's public archival RPC.
import { checkForm, checkPayment } from "@accord/sdk/check";
import { accord, config, factories } from "@/server/accord";
import { checkResponse } from "@/server/checkroute";
import { readPreflight, READ_CORS, withReadCors } from "@/server/cors";
import { clientIp, takeAll } from "@/server/ratelimit";

export const dynamic = "force-dynamic";

function archival(): string | undefined {
  if (process.env.NEAR_ARCHIVAL_RPC_URL) return process.env.NEAR_ARCHIVAL_RPC_URL;
  return config().network === "testnet" ? "https://archival-rpc.testnet.fastnear.com" : undefined;
}

export async function GET(req: Request) {
  const full = takeAll([
    { key: `check:${clientIp(req)}`, max: 30, windowMs: 60_000 },
    { key: "check:all", max: 300, windowMs: 60_000 },
  ]);
  if (full) {
    return Response.json({ error: "too many checks; wait a minute" }, { status: 429, headers: { ...READ_CORS, "retry-after": "30" } });
  }
  const a = accord();
  const res = await checkResponse(new URL(req.url).searchParams, {
    check: (agreement, input, block) => checkPayment(a, agreement, input, { block, archivalRpc: archival(), factories: factories() }),
    form: (agreement) => checkForm(a, agreement, { factories: factories() }),
  });
  const out = withReadCors(res);
  out.headers.set("cache-control", "no-store");
  return out;
}

export function OPTIONS() {
  return readPreflight();
}

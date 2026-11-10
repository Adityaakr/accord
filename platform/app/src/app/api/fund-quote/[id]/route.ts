// What funding this agreement's total from another chain would cost, from NEAR Intents' 1Click (packages/sdk
// funding.ts). Dry quotes only: nothing is signed or sent, and 1Click is mainnet-only, so for a testnet agreement this
// is a price, not a route the agreement can receive. Read-only and readable from any origin (server/cors.ts); one
// answer per agreement is kept for 60 s and each caller is rate-limited, so the page never hammers 1Click.
import { fundingQuotes, isAccountId, NotAnAgreementError } from "@accord/sdk";
import { accord, isConfiguredAgreement, symbolFor, factoryOf } from "@/server/accord";
import { readPreflight, withReadCors } from "@/server/cors";
import { allow } from "@/server/ratelimit";
import { clientIp } from "@/server/clientip";
import { chainErrorResponse } from "@/server/rpcerror";

export const dynamic = "force-dynamic";

const cache = new Map<string, { at: number; body: unknown }>();
const TTL = 60_000;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isAccountId(id) || !isConfiguredAgreement(id)) return withReadCors(Response.json({ error: `${id.slice(0, 80)} is not an agreement on this app's factories` }, { status: 404 }));
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL) return withReadCors(Response.json(hit.body));
  if (!allow(`fund-quote:${clientIp(req)}`, 10, 60_000)) return withReadCors(Response.json({ error: "too many quotes; wait a minute" }, { status: 429 }));
  try {
    const terms = await accord().agreement(id).terms();
    if (!terms) return withReadCors(Response.json({ error: `${id} has no terms yet: a quote needs the agreed total` }, { status: 409 }));
    const quotes = await fundingQuotes({ amount: terms.total });
    const body = {
      agreement: id, total: terms.total, decimals: 6, symbol: symbolFor(factoryOf(id)), dry: true, quotes,
      scope: "NEAR Intents 1Click, dry quotes: nothing is signed or sent. 1Click runs on NEAR mainnet only, so this prices the same total delivered as native USDC on NEAR mainnet; a testnet agreement cannot receive it.",
    };
    cache.set(id, { at: Date.now(), body });
    return withReadCors(Response.json(body));
  } catch (e) {
    if (e instanceof NotAnAgreementError) return withReadCors(Response.json({ error: e.message }, { status: 404 }));
    return withReadCors(chainErrorResponse(e));
  }
}

export function OPTIONS() {
  return readPreflight();
}

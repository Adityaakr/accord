// The app's one read cache and its upstream endpoints, shared by /api/chain and /api/chain/balances.
import "server-only";
import { rpcEndpoints } from "@accord/sdk";
import { accord, config } from "./accord";
import { ReadCache } from "./chainread";

export const readCache = new ReadCache();

/** The server's own endpoints, then the network's public ones (never the browser's concern). */
export function upstreamUrls(): string[] {
  const c = config();
  return rpcEndpoints(c.rpc, c.network === "sandbox" ? undefined : c.network);
}

const tokens = new Map<string, { at: number; token: string }>();

/**
 * The token a currency settles in: the factory's on-chain config (the truth, kept for 5 minutes), else the token as
 * configured (ACCORD_TOKEN, ACCORD_TOKEN_USDC) while the chain cannot be read.
 */
export async function tokenFor(currency: string): Promise<string | null> {
  const cur = config().currencies.find((c) => c.id === currency) ?? config().currencies[0];
  if (!cur) return null;
  const hit = tokens.get(cur.factory);
  if (hit && Date.now() - hit.at < 300_000) return hit.token;
  try {
    const { token } = await accord().onFactory(cur.factory).config();
    tokens.set(cur.factory, { at: Date.now(), token });
    return token;
  } catch {
    return cur.token;
  }
}

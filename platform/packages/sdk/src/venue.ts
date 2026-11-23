// What a venue reading says about the pool itself, apart from any agreement's conditions. A market-making slot
// fails when the pool did not meet the agreed spread or depth; when the pool had no liquidity at all, every slot of
// every agreement on it fails, and that is the venue's state on NEAR mainnet, not a fault in Accord (on 22 Nov 2026
// Rhea's USDC/wNEAR pool read `spread 12658 bps · depth 0.00 / 0.00 USDC`, reproduced from an archival node).

import type { Observation } from "./types.js";

/** `empty`: no depth on either side within the band; `one_sided`: depth on one side only; `wide`: a spread of at
 * least 10% (1000 bps); `quoted`: none of these. */
export type VenueState = "empty" | "one_sided" | "wide" | "quoted";

/** A spread this wide (10%) is a pool nobody is quoting, whatever any agreement asks for. */
export const WIDE_SPREAD_BPS = 1000;

export function venueState(o: Pick<Observation, "spread_bps" | "depth_bid" | "depth_ask">): VenueState {
  const bid = BigInt(o.depth_bid || "0") > 0n;
  const ask = BigInt(o.depth_ask || "0") > 0n;
  if (!bid && !ask) return "empty";
  if (!bid || !ask) return "one_sided";
  if (o.spread_bps >= WIDE_SPREAD_BPS) return "wide";
  return "quoted";
}

/** One plain sentence when the pool itself was empty, one-sided or not quoted at this reading; null otherwise. */
export function venueNote(o: Pick<Observation, "spread_bps" | "depth_bid" | "depth_ask" | "band_bps">, pool = "the pool"): string | null {
  const s = venueState(o);
  if (s === "quoted") return null;
  const what = s === "empty" ? `had no liquidity within ${o.band_bps} bps of the mid on either side`
    : s === "one_sided" ? `had liquidity on one side only within ${o.band_bps} bps of the mid`
    : `was quoted ${o.spread_bps} bps wide`;
  return `${pool[0]!.toUpperCase()}${pool.slice(1)} ${what} at this reading (spread ${o.spread_bps} bps), so slots fail on real market data from NEAR mainnet: the venue's state, not a fault in Accord.`;
}

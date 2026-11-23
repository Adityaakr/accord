// What a venue reading says about the pool itself, judged against one agreement's own conditions with the contract's
// rule (`accord-core::atlas::passes`). When the pool cannot meet them at a reading, the slot fails on the venue's
// state on NEAR mainnet, not a fault in Accord (on 22 Nov 2026 Rhea's USDC/wNEAR pool read
// `spread 12658 bps · depth 0.00 / 0.00 USDC`, reproduced from an archival node).

import type { AtlasTerms, Observation } from "./types.js";

type Reading = Pick<Observation, "spread_bps" | "depth_bid" | "depth_ask" | "two_sided">;
type Conditions = Pick<AtlasTerms, "max_spread_bps" | "min_depth_quote" | "depth_band_bps">;

/** `empty`: no depth on either side; `one_sided`: depth on one side only, or not two-sided when that is required;
 * `wide`: a spread above the agreed maximum; `shallow`: depth below the agreed minimum; `meets`: the slot passes. */
export type VenueState = "empty" | "one_sided" | "wide" | "shallow" | "meets";

export function venueState(o: Reading, terms: Conditions, requireTwoSided: boolean): VenueState {
  const bid = BigInt(o.depth_bid || "0");
  const ask = BigInt(o.depth_ask || "0");
  const min = BigInt(terms.min_depth_quote || "0");
  const wide = o.spread_bps > terms.max_spread_bps;
  const shallow = bid < min || ask < min;
  const oneSided = requireTwoSided && !o.two_sided;
  if (!wide && !shallow && !oneSided) return "meets";
  if (bid === 0n && ask === 0n) return "empty";
  if (bid === 0n || ask === 0n || oneSided) return "one_sided";
  return wide ? "wide" : "shallow";
}

/** One plain sentence naming the agreed condition the pool could not meet at this reading; null when it met them. */
export function venueNote(o: Reading, terms: Conditions, requireTwoSided: boolean, pool = "the pool"): string | null {
  const s = venueState(o, terms, requireTwoSided);
  if (s === "meets") return null;
  const band = `within ${terms.depth_band_bps} bps of the mid`;
  const shallow = BigInt(o.depth_bid || "0") < BigInt(terms.min_depth_quote || "0") || BigInt(o.depth_ask || "0") < BigInt(terms.min_depth_quote || "0");
  const what = s === "empty" ? `had no liquidity ${band} on either side (spread ${o.spread_bps} bps)`
    : s === "one_sided" ? `had liquidity on one side only ${band} (spread ${o.spread_bps} bps)`
    : s === "wide" ? `was quoted ${o.spread_bps} bps wide, above the agreed maximum of ${terms.max_spread_bps} bps${shallow ? `, with less depth ${band} than the agreed minimum` : ""}`
    : `had less depth ${band} than the agreed minimum (spread ${o.spread_bps} bps)`;
  return `${pool[0]!.toUpperCase()}${pool.slice(1)} ${what} at this reading, so slots fail on real market data from NEAR mainnet: the venue's state, not a fault in Accord.`;
}

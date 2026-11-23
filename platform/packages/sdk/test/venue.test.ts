import { describe, expect, it } from "vitest";
import { venueNote, venueState } from "../src/venue.js";

// a56.accord-v2.testnet's agreed conditions (docs/runs.md, market making on testnet): spread at most 200 bps, at
// least 25.00 USDC on each side within 300 bps of the mid, quoted on both sides.
const a56 = { max_spread_bps: 200, min_depth_quote: "25000000", depth_band_bps: 300 };
const at = (spread_bps: number, depth_bid: string, depth_ask: string) =>
  ({ spread_bps, depth_bid, depth_ask, two_sided: BigInt(depth_bid) > 0n && BigInt(depth_ask) > 0n });

describe("venue note against an agreement's own conditions", () => {
  it("says Rhea's empty pool of 22 Nov 2026 fails a56's conditions on the venue's own data", () => {
    // `make probe-venue` and every slot of `make market-making NET=local` on 22 Nov 2026
    const empty = at(12658, "0", "0");
    expect(venueState(empty, a56, true)).toBe("empty");
    expect(venueNote(empty, a56, true, "Rhea's NEAR/USDC pool")).toBe(
      "Rhea's NEAR/USDC pool had no liquidity within 300 bps of the mid on either side (spread 12658 bps) at this reading, so slots fail on real market data from NEAR mainnet: the venue's state, not a fault in Accord.",
    );
  });
  it("says nothing for a56's period 1 reading of 10 Nov 2026, which passed on chain", () => {
    const quoted = at(176, "36560000", "55000000");
    expect(venueState(quoted, a56, true)).toBe("meets");
    expect(venueNote(quoted, a56, true)).toBeNull();
  });
  it("judges a wide spread by the agreed maximum, not a fixed one", () => {
    const wide = at(1200, "30000000", "30000000");
    expect(venueNote(wide, { ...a56, max_spread_bps: 1500 }, true)).toBeNull();
    expect(venueNote(wide, a56, true)).toContain("was quoted 1200 bps wide, above the agreed maximum of 200 bps");
  });
  it("names a missing side and depth below the agreed minimum", () => {
    expect(venueState(at(40, "36560000", "0"), a56, true)).toBe("one_sided");
    expect(venueNote(at(40, "10000000", "30000000"), a56, true)).toContain("less depth within 300 bps of the mid than the agreed minimum");
  });
});

import { describe, expect, it } from "vitest";
import { venueNote, venueState } from "../src/venue.js";

const at = (spread_bps: number, depth_bid: string, depth_ask: string) => ({ spread_bps, depth_bid, depth_ask, band_bps: 100 });

describe("venue state", () => {
  it("reads Rhea's pool of 22 Nov 2026 as empty, and says it is the venue, not Accord", () => {
    // `make probe-venue` and every slot of `make market-making NET=local` on 22 Nov 2026
    const empty = at(12658, "0", "0");
    expect(venueState(empty)).toBe("empty");
    expect(venueNote(empty, "Rhea's NEAR/USDC pool")).toBe(
      "Rhea's NEAR/USDC pool had no liquidity within 100 bps of the mid on either side at this reading (spread 12658 bps), so slots fail on real market data from NEAR mainnet: the venue's state, not a fault in Accord.",
    );
  });
  it("tells one-sided and very wide pools apart from a quoted one", () => {
    expect(venueState(at(40, "36560000", "0"))).toBe("one_sided");
    expect(venueState(at(1000, "1", "1"))).toBe("wide");
    // a56's period 1 on 10 Nov 2026: 176 bps, 36.56 / 55.00 USDC
    const quoted = at(176, "36560000", "55000000");
    expect(venueState(quoted)).toBe("quoted");
    expect(venueNote(quoted)).toBeNull();
  });
});

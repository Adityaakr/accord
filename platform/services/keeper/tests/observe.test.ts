import { describe, expect, it } from "vitest";
import type { PeriodView } from "@accord/sdk";
import { observationOf, slotsToAsk } from "../src/observe.js";

const atlas = { period_secs: 360, slots_per_period: 6 };
const period = (p: number, starts_at: number, outcome: PeriodView["outcome"] = "Open"): PeriodView => ({
  period: p, outcome, recorded: 0, conflict: false, passed: 0, observed: 0, uptime_bps: 0,
  starts_at, ends_at: starts_at + 360, closable_at: starts_at + 365,
});

describe("slotsToAsk", () => {
  it("asks only for slots whose window has opened", () => {
    expect(slotsToAsk(atlas, [period(0, 1000)], new Map(), 1130)).toEqual([
      { period: 0, slot: 0 }, { period: 0, slot: 1 }, { period: 0, slot: 2 },
    ]);
  });
  it("skips recorded slots, future periods and closed or closable periods", () => {
    const periods = [period(0, 1000), period(1, 1360), period(2, 640, "Eligible"), period(3, 0)];
    const recorded = new Map([[0, new Set([0, 1])]]);
    expect(slotsToAsk(atlas, periods, recorded, 1130)).toEqual([{ period: 0, slot: 2 }]);
  });
});

describe("observationOf", () => {
  it("drops sig, mode and status, keeping the signed observation", () => {
    const o = observationOf({
      mode: "observe", status: "observed", sig: "s", agreement: "a1", period: 0, slot: 1, slot_time: 5,
      venue: { RheaDcl: { network: "mainnet", contract: "c", pool_id: "p" } }, band_bps: 200,
      venue_block: { height: 1, hash: "h", time: 5 }, mid: "1", spread_bps: 10, depth_bid: "1", depth_ask: "1",
      two_sided: true,
    });
    expect(Object.keys(o)).not.toContain("sig");
    expect(Object.keys(o)).not.toContain("status");
    expect(o.slot).toBe(1);
  });
});

describe("observeAgreement", () => {
  it("keeps going when one slot's observer call fails", async () => {
    const { observeAgreement } = await import("../src/observe.js");
    const recorded: number[] = [];
    const deal = {
      id: "a1",
      periods: async () => [period(0, 1000)],
      observations: async () => [],
      recordObservation: async (o: { slot: number }) => { recorded.push(o.slot); return { txHash: `t${o.slot}` }; },
    } as never;
    const ask = async (_: string, s: { period: number; slot: number }) => {
      if (s.slot === 0) throw new Error("timeout");
      return {
        mode: "observe", status: "observed", sig: "s", agreement: "a1", period: 0, slot: s.slot, slot_time: 1,
        venue: { RheaDcl: { network: "mainnet", contract: "c", pool_id: "p" } }, band_bps: 200,
        venue_block: { height: 9, hash: "h", time: 1 }, mid: "1", spread_bps: 5, depth_bid: "1", depth_ask: "1", two_sided: true,
      } as never;
    };
    const lines = await observeAgreement(deal, { period_secs: 360, slots_per_period: 6 } as never, 1130, ask);
    expect(recorded).toEqual([1, 2]);
    expect(lines[0]).toMatch(/slot 1 · timeout/);
  });
});

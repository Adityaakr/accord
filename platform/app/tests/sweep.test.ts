// The stale demo room sweep (lib/sweep.ts): the demo vendor cancels a room a visitor left before execution, once it is
// stale, and never touches an executing, ended or foreign room.
import { describe, expect, it } from "vitest";
import { DEFAULT_STALE_SECS, runSweep, sweepMove, type SweepDeps } from "../src/lib/sweep";

const O = { vendor: "halcyon-demo.testnet", authority: "halcyon-auth.testnet", staleSecs: DEFAULT_STALE_SECS };
const NOW = 1_794_300_000;
const OLD = NOW - DEFAULT_STALE_SECS - 1;
const room = (state: string, created_at = OLD, extra: Partial<{ vendor: string; vendor_authority: string }> = {}) =>
  ({ account: "a44.accord-v2.testnet", state, vendor: O.vendor, vendor_authority: O.authority, created_at, ...extra });

describe("sweepMove", () => {
  it("cancels a stale room before execution", () => {
    expect(sweepMove(room("Sealed"), NOW, O)).toEqual({ cancel: true });
    expect(sweepMove(room("Attested"), NOW, O)).toEqual({ cancel: true });
  });
  it("leaves a fresh room alone", () => {
    expect(sweepMove(room("Sealed", NOW - 600), NOW, O)).toEqual({ cancel: false, reason: "opened 10 min ago" });
  });
  it("never moves an executing or ended room (the vendor cannot end one alone)", () => {
    expect(sweepMove(room("Executing"), NOW, O).cancel).toBe(false);
    for (const s of ["Cancelled", "NoDeal", "Settled"]) expect(sweepMove(room(s), NOW, O)).toEqual({ cancel: false, reason: "already ended" });
  });
  it("only rooms opened against the demo vendor and its authority", () => {
    expect(sweepMove(room("Sealed", OLD, { vendor: "someone.testnet" }), NOW, O)).toEqual({ cancel: false, reason: "not a demo room" });
    expect(sweepMove(room("Sealed", OLD, { vendor_authority: "other.testnet" }), NOW, O)).toEqual({ cancel: false, reason: "not a demo room" });
  });
});

function deps(states: Record<string, string>, created: Record<string, number>, fail: string[] = []) {
  const calls: string[] = [];
  const reads: string[] = [];
  const d: SweepDeps = {
    list: async () => Object.keys(states).map((account) => ({ account, created_at: created[account] ?? OLD })),
    read: async (a) => { reads.push(a); return { state: states[a]!, vendor: O.vendor, vendor_authority: O.authority }; },
    cancel: async (a) => {
      calls.push(a);
      if (fail.includes(a)) throw new Error("ERR_WRONG_STATE\nmore");
      states[a] = "Cancelled";
      return `tx-${a}`;
    },
    log: () => undefined,
  };
  return { d, calls, reads };
}

describe("runSweep", () => {
  it("cancels the stale rooms before execution and nothing else; a second pass does nothing", async () => {
    const states = { a1: "Sealed", a2: "Executing", a3: "Attested", a4: "Settled", a5: "Sealed" };
    const { d, calls, reads } = deps(states, { a5: NOW - 60 });
    const r = await runSweep(d, { ...O, now: NOW, max: 5 });
    expect(r.cancelled).toEqual([{ account: "a1", tx: "tx-a1" }, { account: "a3", tx: "tx-a3" }]);
    expect(calls).toEqual(["a1", "a3"]);
    expect(reads).not.toContain("a5"); // too fresh to need a read
    const again = await runSweep(d, { ...O, now: NOW, max: 5 });
    expect(again.cancelled).toEqual([]);
    expect(calls).toEqual(["a1", "a3"]);
  });
  it("stops at max moves a pass and records failures without throwing", async () => {
    const { d, calls } = deps({ a1: "Sealed", a2: "Sealed", a3: "Sealed" }, {}, ["a1"]);
    const r = await runSweep(d, { ...O, now: NOW, max: 2 });
    expect(r.failed).toEqual([{ account: "a1", error: "ERR_WRONG_STATE" }]);
    expect(r.cancelled).toEqual([{ account: "a2", tx: "tx-a2" }]);
    expect(calls).toEqual(["a1", "a2"]);
  });
  it("only: limits a pass to the named rooms", async () => {
    const { d, calls } = deps({ a1: "Sealed", a2: "Sealed" }, {});
    await runSweep(d, { ...O, now: NOW, max: 5, only: ["a2"] });
    expect(calls).toEqual(["a2"]);
  });
});

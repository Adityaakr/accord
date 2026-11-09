// The replay of a32: real-looking hashes in order, one refusal with its code, and the step clock.
import { describe, expect, it } from "vitest";
import { REPLAY_PLAY_SECS, REPLAY_STEPS, clock, shownAt } from "../src/lib/replay";

describe("the a32 replay", () => {
  it("has the eleven steps in time order, each transaction a base58 hash", () => {
    expect(REPLAY_STEPS.map((s) => s.id)).toEqual(["key", "faucet", "room", "sealed", "negotiated", "funded", "recipient", "paid", "refused", "revoked", "finished"]);
    for (let i = 1; i < REPLAY_STEPS.length; i++) expect(REPLAY_STEPS[i]!.at).toBeGreaterThan(REPLAY_STEPS[i - 1]!.at);
    const hashes = REPLAY_STEPS.flatMap((s) => s.txs.map((t) => t.hash));
    for (const h of hashes) expect(h).toMatch(/^[1-9A-HJ-NP-Za-km-z]{43,44}$/);
    expect(new Set(hashes).size).toBe(hashes.length);
    expect(REPLAY_STEPS.find((s) => s.id === "refused")?.code).toBe("ERR_PAYEE_MISMATCH");
  });
  it("shows the first step at once and the last at the end of the minute", () => {
    expect(shownAt(0)).toBe(0);
    expect(shownAt(1)).toBe(1);
    expect(shownAt(REPLAY_PLAY_SECS - 1)).toBe(REPLAY_STEPS.length - 1);
    expect(shownAt(REPLAY_PLAY_SECS)).toBe(REPLAY_STEPS.length);
  });
  it("prints m:ss", () => {
    expect(clock(258)).toBe("4:18");
    expect(clock(2)).toBe("0:02");
  });
});

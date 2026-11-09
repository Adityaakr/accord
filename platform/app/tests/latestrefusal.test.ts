// /api/inbox/stats `last_refusal`: the newest refusal, not the oldest the ring holds. The fake reads like the
// contract's get_refusals (1-based sequences, oldest first, `from` clamped to the oldest of the last 128).
import { describe, expect, it } from "vitest";
import type { Refusal } from "@accord/sdk";
import { latestRefusal } from "../src/server/latestrefusal";

function ring(lastSeq: number) {
  const calls: Array<[number | undefined, number | undefined]> = [];
  return {
    calls,
    async refusals(from?: number, limit?: number): Promise<Refusal[]> {
      calls.push([from, limit]);
      const first = Math.max(1, lastSeq - 127);
      const start = Math.max(from ?? first, first);
      const out: Refusal[] = [];
      for (let s = start; s <= lastSeq && out.length < Math.min(limit ?? 50, 128); s++) {
        out.push({ seq: s, code: s % 2 ? "ERR_PAYEE_MISMATCH" : "ERR_AMOUNT_MISMATCH" } as unknown as Refusal);
      }
      return out;
    },
  };
}

describe("latestRefusal", () => {
  it("returns the newest refusal", async () => {
    const d = ring(7);
    expect((await latestRefusal(d, 7))?.seq).toBe(7);
    expect(d.calls).toEqual([[7, 1]]);
  });
  it("returns the newest once the ring has wrapped", async () => {
    expect((await latestRefusal(ring(300), 300))?.seq).toBe(300);
  });
  it("is null with no refusals and makes no call", async () => {
    const d = ring(0);
    expect(await latestRefusal(d, 0)).toBeNull();
    expect(d.calls).toEqual([]);
  });
  it("differs from the first-page read the route used before", async () => {
    const d = ring(5);
    const old = (await d.refusals(undefined, 1)).at(-1);
    expect(old?.seq).toBe(1);
    expect((await latestRefusal(d, 5))?.seq).toBe(5);
  });
});

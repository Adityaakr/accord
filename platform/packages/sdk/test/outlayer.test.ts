import { describe, expect, it } from "vitest";
import { judgeQueue, tableQueue } from "../src/outlayer.js";

describe("judgeQueue", () => {
  it("is not slow with nothing pending", () => {
    expect(judgeQueue([])).toEqual({ pending: 0, waiting: 0, oldestSecs: null, slow: false });
  });
  it("is not slow with fresh requests and one long job", () => {
    expect(judgeQueue([4, 9, 85]).slow).toBe(false);
  });
  it("is slow when two or more requests have waited over 45 s", () => {
    expect(judgeQueue([12, 43, 44, 57, 67, 69])).toEqual({ pending: 6, waiting: 3, oldestSecs: 69, slow: true });
  });
});

// OutLayer as read on 14 Nov 2026: `get_stats` counts finished requests and the unanswered ones sit at and above it.
function outlayer(finished: number, pending: Record<number, number>, nowMs: number, failing: number[] = []) {
  const asked: number[] = [];
  return {
    asked,
    view: async <T>(_c: string, method: string, args: { request_id?: number } = {}): Promise<T> => {
      if (method === "get_stats") return [finished, "0"] as T;
      const id = args.request_id!;
      asked.push(id);
      if (failing.includes(id)) throw new Error("rpc");
      const age = pending[id];
      return (age === undefined ? null : { request_id: id, timestamp: String(BigInt(nowMs - age * 1000) * 1_000_000n) }) as T;
    },
  };
}

describe("tableQueue", () => {
  const now = 1_794_670_000_000;
  it("finds the requests at and above the finished count", async () => {
    const o = outlayer(46033, { 46033: 69, 46034: 67, 46035: 57, 46036: 44, 46037: 43, 46038: 12 }, now);
    expect(await tableQueue(o, "outlayer.testnet", now)).toEqual({ pending: 6, waiting: 3, oldestSecs: 69, slow: true });
    expect(Math.min(...o.asked)).toBe(46028);
  });
  it("reads on while the queue is longer than one round", async () => {
    const pending = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [5000 + i, 100 - i]));
    const q = await tableQueue(outlayer(5000, pending, now), "outlayer.testnet", now);
    expect(q.pending).toBe(40);
    expect(q.slow).toBe(true);
  });
  it("reads fast when nothing has waited", async () => {
    expect((await tableQueue(outlayer(900, { 900: 8, 901: 3 }, now), "outlayer.testnet", now)).slow).toBe(false);
  });
  it("throws when too many reads fail, so a failed read never looks like an empty queue", async () => {
    await expect(tableQueue(outlayer(900, { 900: 80, 901: 70 }, now, [900, 901, 902, 903]), "outlayer.testnet", now)).rejects.toThrow("reads failed");
  });
});

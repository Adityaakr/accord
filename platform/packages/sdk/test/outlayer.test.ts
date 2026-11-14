import { describe, expect, it } from "vitest";
import { judgeQueue, tableQueue } from "../src/outlayer.js";

const reqs = (from: number, ages: (number | null)[]) => ages.flatMap((age, i) => (age === null ? [] : [{ id: from + i, age }]));

describe("judgeQueue", () => {
  it("is not slow with nothing pending", () => {
    expect(judgeQueue([])).toEqual({ pending: 0, unanswered: 0, sinceSecs: null, slow: false, senders: [] });
  });
  it("is slow when the newest requests in a row are all unanswered and the oldest has waited 45 s", () => {
    expect(judgeQueue(reqs(46033, [69, 67, 57, 44, 43, 12]))).toEqual({ pending: 6, unanswered: 6, sinceSecs: 69, slow: true, senders: [] });
  });
  it("is not slow when a newer request was answered: old ones below it are stuck jobs, not a queue", () => {
    // ids 100 and 101 hang; 102 was answered; 103 and 104 are fresh
    expect(judgeQueue(reqs(100, [110, 95, null, 9, 4]))).toEqual({ pending: 4, unanswered: 2, sinceSecs: 9, slow: false, senders: [] });
  });
  it("is not slow with a short run, however old", () => {
    expect(judgeQueue(reqs(7, [100, 90])).slow).toBe(false);
  });
  it("is not slow while the run is young", () => {
    expect(judgeQueue(reqs(7, [30, 20, 10, 5])).slow).toBe(false);
  });
  it("names each sender in the newest run once, the longest waiting first, and none from below an answered request", () => {
    const q = judgeQueue([
      { id: 9, age: 200, sender: "stuck.testnet" }, // 10 was answered: not part of the run
      { id: 11, age: 90, sender: "a.testnet" }, { id: 12, age: 60, sender: "b.testnet" }, { id: 13, age: 20, sender: "a.testnet" }, { id: 14, age: 5 },
    ]);
    expect(q.unanswered).toBe(4);
    expect(q.senders).toEqual(["a.testnet", "b.testnet"]);
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
      return (age === undefined ? null : { request_id: id, sender_id: `p${id % 2}.testnet`, timestamp: String(BigInt(nowMs - age * 1000) * 1_000_000n) }) as T;
    },
  };
}

describe("tableQueue", () => {
  const now = 1_794_670_000_000;
  it("finds the requests at and above the finished count", async () => {
    const o = outlayer(46033, { 46033: 69, 46034: 67, 46035: 57, 46036: 44, 46037: 43, 46038: 12 }, now);
    expect(await tableQueue(o, "outlayer.testnet", now)).toEqual({ pending: 6, unanswered: 6, sinceSecs: 69, slow: true, senders: ["p1.testnet", "p0.testnet"] });
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

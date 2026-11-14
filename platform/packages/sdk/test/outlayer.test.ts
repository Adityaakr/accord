import { describe, expect, it } from "vitest";
import { judgeQueue } from "../src/outlayer.js";

describe("judgeQueue", () => {
  it("is not slow with nothing pending", () => {
    expect(judgeQueue([])).toEqual({ pending: 0, waiting: 0, oldestSecs: null, slow: false });
  });
  it("is not slow with a few fresh requests and one long job", () => {
    expect(judgeQueue([4, 9, 85]).slow).toBe(false);
  });
  it("is slow when three or more requests have waited over a minute", () => {
    const q = judgeQueue([5, 70, 95, 110, 118]);
    expect(q).toEqual({ pending: 5, waiting: 4, oldestSecs: 118, slow: true });
  });
});

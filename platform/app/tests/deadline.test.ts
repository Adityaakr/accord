// Server waits are capped: a demo move past the deadline answers "pending" and keeps running; a page read past it
// throws a busy-RPC error (the error boundary reads again) instead of holding the request for minutes.
import { describe, expect, it } from "vitest";
import { isRpcBusy } from "@accord/sdk";
import { readWithin, settleWithin } from "../src/server/deadline";

const after = <T>(ms: number, v: T) => new Promise<T>((r) => setTimeout(() => r(v), ms));

describe("settleWithin", () => {
  it("returns the value when the work settles in time", async () => {
    expect(await settleWithin(after(5, "ok"), 200)).toEqual({ done: true, value: "ok" });
  });
  it("answers not done at the deadline and lets the work finish", async () => {
    let finished = false;
    const work = after(80, "late").then((v) => { finished = true; return v; });
    const t0 = Date.now();
    expect(await settleWithin(work, 20)).toEqual({ done: false });
    expect(Date.now() - t0).toBeLessThan(70);
    expect(await work).toBe("late");
    expect(finished).toBe(true);
  });
  it("passes a failure that comes in time through", async () => {
    await expect(settleWithin(Promise.reject(new Error("ERR_X")), 100)).rejects.toThrow("ERR_X");
  });
});

describe("readWithin", () => {
  it("throws an error the pages treat as a busy RPC", async () => {
    const e = await readWithin(after(100, 1), 10, "reading a1").catch((x: unknown) => x);
    expect(isRpcBusy(e)).toBe(true);
    expect((e as Error).message).toMatch(/reading a1 took longer than/);
  });
});

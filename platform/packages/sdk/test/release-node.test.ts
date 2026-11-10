import { describe, expect, it } from "vitest";
import type { ReleaseJob, ReleaseProof } from "../src/index.js";
import { cachedReleaseProof, releaseProof, runBinary } from "../src/release-node.js";

const WASM = "7c832ce9bbea56effda01e9ddf9c413f0d8d2c8baed837e1a524c77529f0a2e1";
const job: ReleaseJob = { job: "sealed_table", requestId: 13987, wasmHash: WASM, factory: "accord-v2.testnet", network: "testnet" };
const record = {
  task_id: 28880, request_id: 13987, project_id: "accord-v1.testnet/accord-sealed-table", wasm_hash: WASM,
  executed_wasm_sha256: WASM, caller_account_id: "accord-v2.testnet",
};

describe("release proof with outlayer-verify", () => {
  it("is not checked when the tool runs past its timeout", async () => {
    const p = releaseProof({ bin: "x", fetchRecord: async () => record, run: async () => ({ code: null, stdout: "", stderr: "", missing: false, timedOut: true }) });
    expect(await p(job)).toMatchObject({ status: "not_checked", detail: expect.stringContaining("timed out") });
  });
  it("asks once more when the first run is unproven (exit 2), and stays not checked if it still is", async () => {
    const codes = [2, 0];
    let calls = 0;
    const p = releaseProof({ bin: "x", fetchRecord: async () => record, run: async () => ({ code: codes[calls++] ?? 2, stdout: "INCOMPLETE task 28880", stderr: "", missing: false }) });
    expect(await p(job)).toMatchObject({ status: "ok", detail: expect.stringContaining("outlayer-verify proven") });
    expect(calls).toBe(2);
    let again = 0;
    const q = releaseProof({ bin: "x", fetchRecord: async () => record, run: async () => { again += 1; return { code: 2, stdout: "INCOMPLETE", stderr: "", missing: false }; } });
    expect(await q(job)).toMatchObject({ status: "not_checked", detail: expect.stringContaining("unproven (exit 2)") });
    expect(again).toBe(2);
  });
  it("never passes a task id that is not a number to the tool", async () => {
    const calls: string[][] = [];
    const p = releaseProof({ bin: "x", fetchRecord: async () => ({ ...record, task_id: "--offline" as unknown as number }), run: async (_b, a) => { calls.push(a); return { code: 0, stdout: "", stderr: "", missing: false }; } });
    expect((await p(job)).status).toBe("not_checked");
    expect(calls).toEqual([]);
  });
  it("reports a missing binary as missing, and kills a slow one at the timeout", async () => {
    expect(await runBinary("accord-no-such-binary", [], 1000)).toMatchObject({ missing: true, code: null });
    expect(await runBinary("sleep", ["5"], 100)).toMatchObject({ missing: false, timedOut: true });
  });
});

describe("cached release proof", () => {
  function counting(status: "ok" | "fail" | "not_checked") {
    let calls = 0;
    const inner: ReleaseProof = async () => { calls += 1; return { status, detail: "d" }; };
    return { inner, calls: () => calls };
  }
  it("runs once per job, shares concurrent calls, and keeps a settled verdict for the ttl", async () => {
    let t = 0;
    const c = counting("ok");
    const p = cachedReleaseProof(c.inner, { ttlMs: 1000, now: () => t });
    await Promise.all([p(job), p(job), p(job)]);
    expect(c.calls()).toBe(1);
    t = 999; await p(job); expect(c.calls()).toBe(1);
    t = 2000; await p(job); expect(c.calls()).toBe(2);
    await p({ ...job, job: "payee", requestId: 13988 }); expect(c.calls()).toBe(3);
  });
  it("retries a not-checked verdict sooner, and drops a thrown one", async () => {
    let t = 0;
    const c = counting("not_checked");
    const p = cachedReleaseProof(c.inner, { ttlMs: 1e9, retryMs: 10, now: () => t });
    await p(job); t = 5; await p(job); expect(c.calls()).toBe(1);
    t = 20; await p(job); expect(c.calls()).toBe(2);
    let n = 0;
    const flaky = cachedReleaseProof(async () => { n += 1; if (n === 1) throw new Error("down"); return { status: "ok", detail: "d" }; });
    await expect(flaky(job)).rejects.toThrow("down");
    expect((await flaky(job)).status).toBe("ok");
  });
  it("keeps at most `max` jobs", async () => {
    const c = counting("ok");
    const p = cachedReleaseProof(c.inner, { max: 2 });
    for (const id of [1, 2, 3]) await p({ ...job, requestId: id });
    await p({ ...job, requestId: 1 });
    expect(c.calls()).toBe(4);
  });
});

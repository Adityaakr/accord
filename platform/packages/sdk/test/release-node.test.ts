import { describe, expect, it } from "vitest";
import type { ReleaseJob, ReleaseProof } from "../src/index.js";
import { cachedReleaseProof, delistedOnly, releaseProof, runBinary, type VerifyJson } from "../src/release-node.js";

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

// `outlayer-verify job 106160 --network testnet --json` on 23 Nov 2026 (release 6's Sealed Table pubkey run): the
// worker register no longer lists the build that ran it; every other layer passes. Exit 1.
const delisted: VerifyJson = {
  authenticity: { verdict: "pass", detail: "Intel signature chain valid, TCB UpToDate" },
  identity: { verdict: "fail", reason: "measurements are NOT in the approved list on worker.outlayer.testnet \u2014 the code that ran is not a build this operator has published" },
  binding: { verdict: "pass" }, input: { verdict: "pass" }, output: { verdict: "pass" },
  measurements: { mrtd: "7fe6", rtmr0: "573a", rtmr1: "e7b3", rtmr2: "7644", rtmr3: "d854" },
};
const exit1 = (v: VerifyJson) => async () => ({ code: 1, stdout: JSON.stringify(v), stderr: "warning: the chain does NOT list this build as approved", missing: false });

describe("a worker build de-listed after the run", () => {
  it("is recognised only when identity alone failed on the approved list", () => {
    expect(delistedOnly(delisted)).toBe(true);
    expect(delistedOnly({ ...delisted, binding: { verdict: "fail", reason: "report_data differs" } })).toBe(false);
    expect(delistedOnly({ ...delisted, identity: { verdict: "fail", reason: "MRTD does not match" } })).toBe(false);
    expect(delistedOnly({ ...delisted, measurements: {} })).toBe(false);
  });
  it("is not checked, never failed, when only the approved list rejects it", async () => {
    const p = releaseProof({ bin: "x", fetchRecord: async () => record, run: exit1(delisted) });
    const r = await p(job);
    expect(r.status).toBe("not_checked");
    expect(r.detail).toContain("= task 28880 · wasm 7c832ce9… · worker build no longer approved; quote valid");
  });
  it("still fails when another layer failed, naming it", async () => {
    const p = releaseProof({ bin: "x", fetchRecord: async () => record, run: exit1({ ...delisted, output: { verdict: "fail", reason: "hash differs" } }) });
    const r = await p(job);
    expect(r).toMatchObject({ status: "fail", detail: expect.stringContaining("failed: identity") });
    expect(r.detail).toContain("output (hash differs)");
  });
  it("still fails when identity failed for another reason", async () => {
    const p = releaseProof({ bin: "x", fetchRecord: async () => record, run: exit1({ ...delisted, identity: { verdict: "fail", reason: "MRTD does not match" } }) });
    expect((await p(job)).status).toBe("fail");
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

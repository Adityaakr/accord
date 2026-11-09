import { describe, expect, it } from "vitest";
import type { ReleaseJob } from "@accord/sdk";
import { releaseProof, type AttestationRecord, type RunResult } from "../src/release.js";

const WASM = "7c832ce9bbea56effda01e9ddf9c413f0d8d2c8baed837e1a524c77529f0a2e1";
const job: ReleaseJob = { job: "sealed_table", requestId: 13987, wasmHash: WASM, factory: "accord-v2.testnet", network: "testnet" };
// The live record for release 4's Sealed Table pubkey run (testnet-api.outlayer.ai/attestations/by-request/13987).
const record: AttestationRecord = {
  task_id: 28880, request_id: 13987, project_id: "accord-v1.testnet/accord-sealed-table", wasm_hash: WASM,
  executed_wasm_sha256: WASM, caller_account_id: "accord-v2.testnet", transaction_hash: "3nceFkkX9gLnzNgH8ruWkWtTvH5eDBB5BHsZ2mNy27Lm",
};

function proof(rec: AttestationRecord | null, result: Partial<RunResult>) {
  const calls: string[][] = [];
  const p = releaseProof({
    bin: "outlayer-verify",
    fetchRecord: async () => rec,
    run: async (_b, args) => { calls.push(args); return { code: 0, stdout: "", stderr: "", missing: false, ...result }; },
  });
  return { p, calls };
}

describe("release proof", () => {
  it("verifies OutLayer's task for the request, not the request id itself", async () => {
    const { p, calls } = proof(record, { code: 0 });
    expect(await p(job)).toMatchObject({ status: "ok" });
    expect(calls[0]).toEqual(["job", "28880", "--network", "testnet", "--api", "https://testnet-api.outlayer.ai", "--short", "--no-color"]);
  });
  it("is not checked without the tool, and never ok", async () => {
    expect((await proof(record, { missing: true, code: null }).p(job)).status).toBe("not_checked");
    expect((await proof(null, {}).p(job)).status).toBe("not_checked");
    expect((await proof(record, { code: 2 }).p(job)).status).toBe("not_checked");
  });
  it("fails when the tool fails a layer, or the record ran other code or came from another caller", async () => {
    expect((await proof(record, { code: 1 }).p(job)).status).toBe("fail");
    const other = proof({ ...record, wasm_hash: "00".repeat(32), executed_wasm_sha256: "00".repeat(32) }, { code: 0 });
    expect((await other.p(job)).status).toBe("fail");
    expect(other.calls).toEqual([]);
    expect((await proof({ ...record, caller_account_id: "otcdesk.testnet" }, { code: 0 }).p(job)).status).toBe("fail");
  });
});

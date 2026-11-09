import { describe, expect, it } from "vitest";
import { recordReleaseProof, type AttestationRecord, type ReleaseJob } from "../src/index.js";

const WASM = "7c832ce9bbea56effda01e9ddf9c413f0d8d2c8baed837e1a524c77529f0a2e1";
const job: ReleaseJob = { job: "sealed_table", requestId: 13987, wasmHash: WASM, factory: "accord-v2.testnet", network: "testnet" };
// The live record for release 4's Sealed Table pubkey run (testnet-api.outlayer.ai/attestations/by-request/13987).
const record: AttestationRecord = {
  task_id: 28880, request_id: 13987, project_id: "accord-v1.testnet/accord-sealed-table", wasm_hash: WASM,
  executed_wasm_sha256: WASM, caller_account_id: "accord-v2.testnet",
};
const proof = (rec: AttestationRecord | null) => recordReleaseProof({ fetchRecord: async () => rec });

describe("record release proof (no outlayer-verify)", () => {
  it("names the task, says wasm and caller match, and is never ok", async () => {
    expect(await proof(record)(job)).toEqual({
      status: "not_checked",
      detail: "= task 28880 · wasm 7c832ce9… and caller match · quote not checked (needs outlayer-verify)",
    });
  });
  it("is not checked when the record cannot be read", async () => {
    expect(await proof(null)(job)).toMatchObject({ status: "not_checked", detail: "attestation record unreachable" });
    expect(await recordReleaseProof({ fetchRecord: async () => { throw new Error("down"); } })(job)).toMatchObject({ status: "not_checked" });
  });
  it("fails when the record ran other code or came from another caller", async () => {
    expect((await proof({ ...record, executed_wasm_sha256: "00".repeat(32) })(job)).status).toBe("fail");
    expect((await proof({ ...record, caller_account_id: "otcdesk.testnet" })(job)).status).toBe("fail");
    expect((await proof({ ...record, caller_account_id: "releases.accord-v2.testnet" })(job)).status).toBe("not_checked");
  });
});

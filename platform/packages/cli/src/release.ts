// The `release` check of `accord verify`: each job key's pubkey run, proven with OutLayer's own verifier.
//
// The factory stores each job's `pubkey_task_id`, which is the OutLayer *request* id on chain (13987 for release 4's
// Sealed Table), not OutLayer's internal task id (28880): `outlayer-verify job 13987` would check someone else's run.
// So the record is looked up by request (`/attestations/by-request/<id>`, public, no key), its build and caller are
// compared with the release, and then `outlayer-verify job <task_id>` proves the TDX quote, the approved measurement
// and the binding (https://github.com/out-layer/outlayer-verify; exit 0 proven, 1 a layer failed, 2 unproven).
// Without the tool on PATH (or OUTLAYER_VERIFY_BIN) the check stays `not checked`; nothing is assumed.

import { spawn } from "node:child_process";
import {
  fetchAttestationRecord, lookupReleaseRecord, recordOnlyDetail, OUTLAYER_API,
  type AttestationRecord, type ReleaseJob, type ReleaseProof,
} from "@accord/sdk";

export { OUTLAYER_API, type AttestationRecord };

export interface RunResult { code: number | null; stdout: string; stderr: string; missing: boolean }

export interface ReleaseProofDeps {
  fetchRecord(api: string, requestId: number): Promise<AttestationRecord | null>;
  run(bin: string, args: string[]): Promise<RunResult>;
  bin: string;
  api?: string;
}

/** The release proof for one job; pure over `fetchRecord` and `run` so it is tested without the tool. */
export function releaseProof(d: ReleaseProofDeps): ReleaseProof {
  return async (j: ReleaseJob) => {
    // the by-request lookup the app and the MCP server run too (@accord/sdk recordReleaseProof)
    const found = await lookupReleaseRecord(j, { fetchRecord: d.fetchRecord, api: d.api });
    if (found.status !== "match") return found;
    const { record: rec, api } = found;
    const r = await d.run(d.bin, ["job", String(rec.task_id), "--network", j.network, "--api", api, "--short", "--no-color"]);
    const said = (r.stdout.trim() || r.stderr.trim()).split("\n").filter(Boolean).pop() ?? "";
    if (r.missing) return { status: "not_checked", detail: recordOnlyDetail(rec, j) };
    if (r.code === 0) return { status: "ok", detail: `= task ${rec.task_id} · wasm ${j.wasmHash.slice(0, 8)}… · outlayer-verify proven` };
    if (r.code === 1) return { status: "fail", detail: `= task ${rec.task_id} · outlayer-verify: a layer failed${said ? ` (${said})` : ""}` };
    return { status: "not_checked", detail: `= task ${rec.task_id} · outlayer-verify: unproven (exit ${r.code ?? "signal"})${said ? ` (${said})` : ""}` };
  };
}

function run(bin: string, args: string[]): Promise<RunResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const p = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    // our own timer, unref'd: spawn's `timeout` option keeps the process alive when the binary is missing
    const timer = setTimeout(() => p.kill("SIGTERM"), 180_000);
    timer.unref();
    p.stdout?.on("data", (b: Buffer) => { stdout += b.toString(); });
    p.stderr?.on("data", (b: Buffer) => { stderr += b.toString(); });
    p.on("error", (e: NodeJS.ErrnoException) => { clearTimeout(timer); resolve({ code: null, stdout, stderr: e.message, missing: e.code === "ENOENT" }); });
    p.on("close", (code) => { clearTimeout(timer); resolve({ code, stdout, stderr, missing: false }); });
  });
}

/** The real proof: the public record API and the `outlayer-verify` binary (OUTLAYER_VERIFY_BIN, else PATH). */
export function realReleaseProof(env: Record<string, string | undefined>): ReleaseProof {
  return releaseProof({ fetchRecord: (api, id) => fetchAttestationRecord(api, id), run, bin: env.OUTLAYER_VERIFY_BIN || "outlayer-verify", api: env.OUTLAYER_API_URL || undefined });
}

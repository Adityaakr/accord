// The `release` check of `accord verify`: each job key's pubkey run, proven with OutLayer's own verifier.
//
// The factory stores each job's `pubkey_task_id`, which is the OutLayer *request* id on chain (13987 for release 4's
// Sealed Table), not OutLayer's internal task id (28880): `outlayer-verify job 13987` would check someone else's run.
// So the record is looked up by request (`/attestations/by-request/<id>`, public, no key), its build and caller are
// compared with the release, and then `outlayer-verify job <task_id>` proves the TDX quote, the approved measurement
// and the binding (https://github.com/out-layer/outlayer-verify; exit 0 proven, 1 a layer failed, 2 unproven).
// Without the tool on PATH (or OUTLAYER_VERIFY_BIN) the check stays `not checked`; nothing is assumed.

import { spawn } from "node:child_process";
import type { ReleaseJob, ReleaseProof } from "@accord/sdk";

/** OutLayer's API per network; its older *.outlayer.fastnear.com addresses now answer 410. */
export const OUTLAYER_API: Record<string, string> = {
  testnet: "https://testnet-api.outlayer.ai",
  mainnet: "https://api.outlayer.ai",
};

export interface AttestationRecord {
  task_id: number;
  request_id: number;
  project_id: string;
  wasm_hash: string;
  executed_wasm_sha256?: string;
  caller_account_id: string;
  transaction_hash?: string;
}

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
    const api = d.api ?? OUTLAYER_API[j.network];
    if (!api) return { status: "not_checked", detail: `no OutLayer API for ${j.network}` };
    const rec = await d.fetchRecord(api, j.requestId).catch(() => null);
    if (!rec) return { status: "not_checked", detail: "attestation record unreachable" };
    const problems: string[] = [];
    if (rec.request_id !== j.requestId) problems.push(`record is for request ${rec.request_id}`);
    if (rec.wasm_hash !== j.wasmHash || (rec.executed_wasm_sha256 && rec.executed_wasm_sha256 !== j.wasmHash)) {
      problems.push(`ran wasm ${(rec.executed_wasm_sha256 ?? rec.wasm_hash).slice(0, 8)}…, release names ${j.wasmHash.slice(0, 8)}…`);
    }
    if (rec.caller_account_id !== j.factory && rec.caller_account_id !== `releases.${j.factory}`) {
      problems.push(`requested by ${rec.caller_account_id}, not ${j.factory}`);
    }
    if (problems.length) return { status: "fail", detail: problems.join("; ") };
    const r = await d.run(d.bin, ["job", String(rec.task_id), "--network", j.network, "--api", api, "--short", "--no-color"]);
    const said = (r.stdout.trim() || r.stderr.trim()).split("\n").filter(Boolean).pop() ?? "";
    if (r.missing) return { status: "not_checked", detail: `= task ${rec.task_id} · wasm ${j.wasmHash.slice(0, 8)}… and caller match · quote not checked (needs outlayer-verify)` };
    if (r.code === 0) return { status: "ok", detail: `= task ${rec.task_id} · wasm ${j.wasmHash.slice(0, 8)}… · outlayer-verify proven` };
    if (r.code === 1) return { status: "fail", detail: `= task ${rec.task_id} · outlayer-verify: a layer failed${said ? ` (${said})` : ""}` };
    return { status: "not_checked", detail: `= task ${rec.task_id} · outlayer-verify: unproven (exit ${r.code ?? "signal"})${said ? ` (${said})` : ""}` };
  };
}

async function fetchRecord(api: string, requestId: number): Promise<AttestationRecord | null> {
  const res = await fetch(`${api}/attestations/by-request/${requestId}`, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return null;
  const body = (await res.json()) as AttestationRecord | AttestationRecord[];
  return Array.isArray(body) ? (body.find((r) => r.request_id === requestId) ?? null) : body;
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
  return releaseProof({ fetchRecord, run, bin: env.OUTLAYER_VERIFY_BIN || "outlayer-verify", api: env.OUTLAYER_API_URL || undefined });
}

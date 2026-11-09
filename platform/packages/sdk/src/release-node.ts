// The `release` check with OutLayer's own verifier, for Node only (`@accord/sdk/node`: it spawns a process, so it is
// kept out of the main entry the browser bundles).
//
// The factory stores each job's `pubkey_task_id`, which is the OutLayer *request* id on chain (13987 for release 4's
// Sealed Table), not OutLayer's internal task id (28880): `outlayer-verify job 13987` would check someone else's run.
// So the record is looked up by request (`lookupReleaseRecord`, public, no key), its build and caller are compared
// with the release, and then `outlayer-verify job <task_id>` proves the TDX quote, the approved measurement and the
// binding (https://github.com/out-layer/outlayer-verify; exit 0 proven, 1 a layer failed, 2 unproven). Without the
// tool (OUTLAYER_VERIFY_BIN, else PATH), or when it runs past the timeout, the check stays `not checked`: nothing is
// assumed. The CLI, the app's /api/verify and the MCP server all use this, so they print the same release line.

import { spawn } from "node:child_process";
import { fetchAttestationRecord, lookupReleaseRecord, recordOnlyDetail, type AttestationRecord } from "./release.js";
import type { ReleaseJob, ReleaseProof } from "./verify.js";

export interface RunResult { code: number | null; stdout: string; stderr: string; missing: boolean; timedOut?: boolean }

export interface ReleaseProofDeps {
  fetchRecord(api: string, requestId: number): Promise<AttestationRecord | null>;
  run(bin: string, args: string[]): Promise<RunResult>;
  bin: string;
  api?: string;
}

/** The release proof for one job; pure over `fetchRecord` and `run` so it is tested without the tool. */
export function releaseProof(d: ReleaseProofDeps): ReleaseProof {
  return async (j: ReleaseJob) => {
    const found = await lookupReleaseRecord(j, { fetchRecord: d.fetchRecord, api: d.api });
    if (found.status !== "match") return found;
    const { record: rec, api } = found;
    if (!Number.isSafeInteger(rec.task_id) || rec.task_id < 0) return { status: "not_checked", detail: "attestation record has no task id" };
    const r = await d.run(d.bin, ["job", String(rec.task_id), "--network", j.network, "--api", api, "--short", "--no-color"]);
    const said = (r.stdout.trim() || r.stderr.trim()).split("\n").filter(Boolean).pop() ?? "";
    if (r.missing) return { status: "not_checked", detail: recordOnlyDetail(rec, j) };
    if (r.timedOut) return { status: "not_checked", detail: `= task ${rec.task_id} · wasm ${j.wasmHash.slice(0, 8)}… and caller match · outlayer-verify timed out` };
    if (r.code === 0) return { status: "ok", detail: `= task ${rec.task_id} · wasm ${j.wasmHash.slice(0, 8)}… · outlayer-verify proven` };
    if (r.code === 1) return { status: "fail", detail: `= task ${rec.task_id} · outlayer-verify: a layer failed${said ? ` (${said})` : ""}` };
    return { status: "not_checked", detail: `= task ${rec.task_id} · outlayer-verify: unproven (exit ${r.code ?? "signal"})${said ? ` (${said})` : ""}` };
  };
}

/** Runs `bin` with `args`, killed after `timeoutMs`. A missing binary is `missing`, never a throw. */
export function runBinary(bin: string, args: string[], timeoutMs: number): Promise<RunResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const p = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    // our own timer, unref'd: spawn's `timeout` option keeps the process alive when the binary is missing
    const timer = setTimeout(() => { timedOut = true; p.kill("SIGKILL"); }, timeoutMs);
    timer.unref();
    p.stdout?.on("data", (b: Buffer) => { if (stdout.length < 64_000) stdout += b.toString(); });
    p.stderr?.on("data", (b: Buffer) => { if (stderr.length < 64_000) stderr += b.toString(); });
    p.on("error", (e: NodeJS.ErrnoException) => { clearTimeout(timer); resolve({ code: null, stdout, stderr: e.message, missing: e.code === "ENOENT" }); });
    p.on("close", (code) => { clearTimeout(timer); resolve({ code, stdout, stderr, missing: false, timedOut }); });
  });
}

/**
 * The real proof: the public record API and the `outlayer-verify` binary (OUTLAYER_VERIFY_BIN, else PATH), each run
 * bounded by `timeoutMs` (OUTLAYER_VERIFY_TIMEOUT_MS when set).
 */
export function outlayerVerifyProof(env: Record<string, string | undefined>, o: { timeoutMs?: number } = {}): ReleaseProof {
  const timeoutMs = Number(env.OUTLAYER_VERIFY_TIMEOUT_MS) > 0 ? Number(env.OUTLAYER_VERIFY_TIMEOUT_MS) : (o.timeoutMs ?? 180_000);
  return releaseProof({
    fetchRecord: (api, id) => fetchAttestationRecord(api, id),
    run: (bin, args) => runBinary(bin, args, timeoutMs),
    bin: env.OUTLAYER_VERIFY_BIN || "outlayer-verify",
    api: env.OUTLAYER_API_URL || undefined,
  });
}

export interface CacheOptions {
  /** How long a settled verdict (`ok` or `fail`) is kept. A job's pubkey run never changes, so hours are safe. */
  ttlMs?: number;
  /** How long a `not_checked` verdict (tool missing, timed out, record unreachable) is kept before trying again. */
  retryMs?: number;
  /** At most this many jobs are kept; the oldest is dropped first. */
  max?: number;
  now?: () => number;
}

/**
 * Wraps a release proof with an in-memory cache keyed by the job (network, factory, request id, wasm). Every
 * agreement of one release shares the same three job runs, so a handful of entries covers every agreement, and
 * concurrent calls for one job share a single run: the endpoint stays fast and repeated calls never spawn more.
 */
export function cachedReleaseProof(proof: ReleaseProof, o: CacheOptions = {}): ReleaseProof {
  const ttl = o.ttlMs ?? 6 * 3600_000;
  const retry = o.retryMs ?? 60_000;
  const max = o.max ?? 256;
  const now = o.now ?? Date.now;
  const cache = new Map<string, { at: number; keep: number; p: ReturnType<ReleaseProof> }>();
  return (j) => {
    const key = `${j.network}|${j.factory}|${j.job}|${j.requestId}|${j.wasmHash}`;
    const hit = cache.get(key);
    if (hit && now() - hit.at < hit.keep) return hit.p;
    const entry = { at: now(), keep: Number.POSITIVE_INFINITY, p: proof(j) };
    cache.delete(key);
    cache.set(key, entry);
    while (cache.size > max) cache.delete(cache.keys().next().value!);
    entry.p.then(
      (r) => { entry.at = now(); entry.keep = r.status === "not_checked" ? retry : ttl; },
      () => { if (cache.get(key) === entry) cache.delete(key); },
    );
    return entry.p;
  };
}

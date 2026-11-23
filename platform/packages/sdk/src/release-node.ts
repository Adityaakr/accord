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
//
// A worker build OutLayer has since taken off its approved list (DECISIONS.md section 38): the tool reads the list as
// it is now, so a run that was approved when it ran fails its identity layer once the operator moves to a new worker
// image, while the Intel quote, the binding, the input and the output still verify. That alone is `not checked`, never
// `fail`: the list is read again at the run's own block on an archival node, and only a build that was not approved
// then either fails the check.

import { spawn } from "node:child_process";
import { fetchAttestationRecord, lookupReleaseRecord, recordOnlyDetail, type AttestationRecord } from "./release.js";
import type { ReleaseJob, ReleaseProof } from "./verify.js";

export interface RunResult { code: number | null; stdout: string; stderr: string; missing: boolean; timedOut?: boolean }

/** Whether `contract` listed these worker measurements as approved at `block`; null when that could not be read. */
export type ApprovedAt = (network: string, contract: string, measurements: Record<string, string>, block: number) => Promise<boolean | null>;

export interface ReleaseProofDeps {
  fetchRecord(api: string, requestId: number): Promise<AttestationRecord | null>;
  run(bin: string, args: string[]): Promise<RunResult>;
  bin: string;
  api?: string;
  /** Pause before the one retry of an unproven run (exit 2); 0 in tests. */
  retryDelayMs?: number;
  /** Reads the approved list at the run's block, for a build that is no longer on it; absent, that is not read. */
  approvedAt?: ApprovedAt;
}

/** One layer of `outlayer-verify --json`: `pass`, `fail` or `unproven`, with a detail or the reason it failed. */
interface Layer { verdict?: string; detail?: string; reason?: string }

/** The parts of `outlayer-verify --json` read here. */
export interface VerifyJson {
  authenticity?: Layer;
  identity?: Layer;
  binding?: Layer;
  input?: Layer;
  output?: Layer;
  measurements?: Record<string, string>;
  collateral?: { contract_id?: string };
}

const LAYERS = ["authenticity", "identity", "binding", "input", "output"] as const;

function parseVerifyJson(text: string): VerifyJson | null {
  try {
    const v = JSON.parse(text) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as VerifyJson) : null;
  } catch {
    return null;
  }
}

/** The layers that failed, as `identity (reason)`, for the detail. */
function failedLayers(v: VerifyJson): string {
  return LAYERS.filter((l) => v[l]?.verdict === "fail").map((l) => `${l}${v[l]?.reason ? ` (${v[l]!.reason})` : ""}`).join(", ");
}

/**
 * Every layer passed except identity, and identity failed only because the worker's measurements are not on the
 * approved list now: the run is a genuine, bound TDX execution of a worker build the operator has since de-listed.
 */
export function delistedOnly(v: VerifyJson): boolean {
  return v.identity?.verdict === "fail"
    && /not in the approved list/i.test(v.identity.reason ?? "")
    && LAYERS.every((l) => l === "identity" || v[l]?.verdict === "pass")
    && !!v.measurements && Object.keys(v.measurements).length > 0;
}

/** The release proof for one job; pure over `fetchRecord` and `run` so it is tested without the tool. */
export function releaseProof(d: ReleaseProofDeps): ReleaseProof {
  return async (j: ReleaseJob) => {
    const found = await lookupReleaseRecord(j, { fetchRecord: d.fetchRecord, api: d.api });
    if (found.status !== "match") return found;
    const { record: rec, api } = found;
    if (!Number.isSafeInteger(rec.task_id) || rec.task_id < 0) return { status: "not_checked", detail: "attestation record has no task id" };
    const args = ["job", String(rec.task_id), "--network", j.network, "--api", api, "--json", "--no-color"];
    let r = await d.run(d.bin, args);
    // exit 2 is "unproven", often one fetch from OutLayer's API that came back incomplete: ask once more
    if (r.code === 2 && !r.missing && !r.timedOut) {
      if (d.retryDelayMs) await new Promise((ok) => setTimeout(ok, d.retryDelayMs));
      r = await d.run(d.bin, args);
    }
    const json = parseVerifyJson(r.stdout.trim());
    const said = (json && failedLayers(json) ? `failed: ${failedLayers(json)}` : "")
      || ((json ? "" : r.stdout.trim()) || r.stderr.trim()).split("\n").filter(Boolean).pop() || "";
    if (r.missing) return { status: "not_checked", detail: recordOnlyDetail(rec, j) };
    if (r.timedOut) return { status: "not_checked", detail: `= task ${rec.task_id} · wasm ${j.wasmHash.slice(0, 8)}… and caller match · outlayer-verify timed out` };
    if (r.code === 0) return { status: "ok", detail: `= task ${rec.task_id} · wasm ${j.wasmHash.slice(0, 8)}… · outlayer-verify proven` };
    if (r.code === 1 && json && delistedOnly(json)) {
      const block = Number(rec.block_height);
      const contract = json.collateral?.contract_id || `worker.outlayer.${j.network}`;
      const then = d.approvedAt && Number.isSafeInteger(block) && block > 0
        ? await d.approvedAt(j.network, contract, json.measurements!, block).catch(() => null) : null;
      if (then === false) {
        return { status: "fail", detail: `= task ${rec.task_id} · outlayer-verify: the worker build was not on ${contract}'s approved list when it ran either (block ${block})` };
      }
      return {
        status: "not_checked",
        detail: `= task ${rec.task_id} · wasm ${j.wasmHash.slice(0, 8)}… · worker build no longer approved; quote valid${then
          ? ` (approved on ${contract} at block ${block}, when it ran; quote, binding, input and output pass)`
          : " (quote, binding, input and output pass; the approved list at the run's block could not be read)"}`,
      };
    }
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

/** Archival NEAR RPC per network, for reading the worker register's approved list at an old block. */
export const ARCHIVAL_RPC: Record<string, string> = {
  testnet: "https://archival-rpc.testnet.fastnear.com",
  mainnet: "https://archival-rpc.mainnet.fastnear.com",
};

/**
 * `is_measurements_approved` on the worker register (`worker.outlayer.<network>`, the method `outlayer-verify` asks)
 * at `block`, over an archival node. Null when the node cannot answer.
 */
export function approvedAtBlock(rpcs: Record<string, string> = ARCHIVAL_RPC, timeoutMs = 20_000): ApprovedAt {
  return async (network, contract, measurements, block) => {
    const rpc = rpcs[network];
    if (!rpc) return null;
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: "accord-verify", method: "query",
        params: {
          request_type: "call_function", block_id: block, account_id: contract, method_name: "is_measurements_approved",
          args_base64: Buffer.from(JSON.stringify({ measurements })).toString("base64"),
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    }).catch(() => null);
    if (!res?.ok) return null;
    const body = (await res.json().catch(() => null)) as { result?: { result?: number[] } } | null;
    const bytes = body?.result?.result;
    if (!Array.isArray(bytes)) return null;
    const v = JSON.parse(Buffer.from(bytes).toString("utf8") || "null") as unknown;
    return typeof v === "boolean" ? v : null;
  };
}

/**
 * The real proof: the public record API and the `outlayer-verify` binary (OUTLAYER_VERIFY_BIN, else PATH), each run
 * bounded by `timeoutMs` (OUTLAYER_VERIFY_TIMEOUT_MS when set), and the approved list at the run's block over an
 * archival node for a build that has since been de-listed.
 */
export function outlayerVerifyProof(env: Record<string, string | undefined>, o: { timeoutMs?: number } = {}): ReleaseProof {
  const timeoutMs = Number(env.OUTLAYER_VERIFY_TIMEOUT_MS) > 0 ? Number(env.OUTLAYER_VERIFY_TIMEOUT_MS) : (o.timeoutMs ?? 180_000);
  return releaseProof({
    fetchRecord: (api, id) => fetchAttestationRecord(api, id),
    run: (bin, args) => runBinary(bin, args, timeoutMs),
    bin: env.OUTLAYER_VERIFY_BIN || "outlayer-verify",
    api: env.OUTLAYER_API_URL || undefined,
    retryDelayMs: 2000,
    approvedAt: approvedAtBlock(),
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

export { quoteProof, checkInstance, judgeInstances, type InstanceCheck } from "./model-node.js";

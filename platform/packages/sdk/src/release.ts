// The by-request lookup behind the `release` check of `verify`, shared by the CLI, the app's /api/verify and the MCP
// server, so all three print the same release line.
//
// The factory stores each job's `pubkey_task_id`, which is the OutLayer *request* id on chain (13987 for release 4's
// Sealed Table), not OutLayer's internal task id (28880). The public record is looked up by request
// (`/attestations/by-request/<id>`, no key) and its build and caller are compared with the release. That proves which
// task ran which wasm for which caller; it does not prove the TDX quote, which needs `outlayer-verify`
// (https://github.com/out-layer/outlayer-verify). The CLI adds that step when the tool is installed; without it the
// check stays `not_checked`: nothing is assumed.

import type { ReleaseJob, ReleaseProof } from "./verify.js";

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

export type FetchAttestationRecord = (api: string, requestId: number) => Promise<AttestationRecord | null>;

/** OutLayer's public attestation record for one request id, or null when it cannot be read. Bounded by `timeoutMs`. */
export async function fetchAttestationRecord(api: string, requestId: number, timeoutMs = 20_000): Promise<AttestationRecord | null> {
  const res = await fetch(`${api}/attestations/by-request/${requestId}`, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) return null;
  const body = (await res.json()) as AttestationRecord | AttestationRecord[];
  return Array.isArray(body) ? (body.find((r) => r.request_id === requestId) ?? null) : body;
}

/** What the record lookup found for one job: the record when it matches the release, or why it does not. */
export type RecordLookup =
  | { status: "match"; record: AttestationRecord; api: string }
  | { status: "fail"; detail: string }
  | { status: "not_checked"; detail: string };

/** Looks the job's pubkey run up by request id and compares its wasm and caller with the release. */
export async function lookupReleaseRecord(
  j: ReleaseJob,
  o: { fetchRecord?: FetchAttestationRecord; api?: string } = {},
): Promise<RecordLookup> {
  const api = o.api ?? OUTLAYER_API[j.network];
  if (!api) return { status: "not_checked", detail: `no OutLayer API for ${j.network}` };
  const rec = await (o.fetchRecord ?? fetchAttestationRecord)(api, j.requestId).catch(() => null);
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
  return { status: "match", record: rec, api };
}

/** The detail when the record matches and the quote is not checked here. */
export function recordOnlyDetail(rec: AttestationRecord, j: ReleaseJob): string {
  return `= task ${rec.task_id} · wasm ${j.wasmHash.slice(0, 8)}… and caller match · quote not checked (needs outlayer-verify)`;
}

/**
 * The release proof without `outlayer-verify`: the by-request record lookup only (task id, wasm and caller). Never
 * `ok`, because the TDX quote is not checked; `fail` when the record ran other code or came from another caller.
 * The app's /api/verify and the MCP server pass this; the CLI adds the quote check when the tool is installed.
 */
export function recordReleaseProof(o: { fetchRecord?: FetchAttestationRecord; api?: string } = {}): ReleaseProof {
  return async (j) => {
    const r = await lookupReleaseRecord(j, o);
    if (r.status !== "match") return r;
    return { status: "not_checked", detail: recordOnlyDetail(r.record, j) };
  };
}

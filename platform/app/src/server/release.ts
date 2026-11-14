// The `release` check the app's /api/verify and the hosted /app/mcp share: OutLayer's own verifier
// (`outlayer-verify`, OUTLAYER_VERIFY_BIN or PATH; the Docker image carries it) proves each job key's pubkey run.
// One instance per process, so both routes share its cache: a job run's proof never changes, so a settled verdict
// is kept for hours and concurrent calls for one job share a single run. Each run is bounded by a timeout
// (OUTLAYER_VERIFY_TIMEOUT_MS, default 30 s); without the tool, or past the timeout, the check is "not checked".
import type { ModelProof, ReleaseProof } from "@accord/sdk";
import { quoteProof, releaseProofFromEnv } from "@accord/mcp/deps";

let proof: ReleaseProof | null = null;

export function releaseProof(): ReleaseProof {
  proof ??= releaseProofFromEnv(process.env);
  return proof;
}

/**
 * The hardware part of the `model` check for the same two routes: the TDX quotes and GPU evidence in NEAR AI's report,
 * verified against Intel's collateral and NVIDIA's attestation service on every call (the report is fetched with the
 * caller's fresh nonce, so nothing can be cached). Bounded at 30 s; past it the model check says so and stays partial.
 */
export function modelProof(): ModelProof {
  return quoteProof({ timeoutMs: 30_000 });
}

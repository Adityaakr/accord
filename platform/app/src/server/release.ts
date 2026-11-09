// The `release` check the app's /api/verify and the hosted /app/mcp share: OutLayer's own verifier
// (`outlayer-verify`, OUTLAYER_VERIFY_BIN or PATH; the Docker image carries it) proves each job key's pubkey run.
// One instance per process, so both routes share its cache: a job run's proof never changes, so a settled verdict
// is kept for hours and concurrent calls for one job share a single run. Each run is bounded by a timeout
// (OUTLAYER_VERIFY_TIMEOUT_MS, default 30 s); without the tool, or past the timeout, the check is "not checked".
import type { ReleaseProof } from "@accord/sdk";
import { releaseProofFromEnv } from "@accord/mcp/deps";

let proof: ReleaseProof | null = null;

export function releaseProof(): ReleaseProof {
  proof ??= releaseProofFromEnv(process.env);
  return proof;
}

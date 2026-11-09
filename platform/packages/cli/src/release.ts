// The `release` check of `accord verify`: each job key's pubkey run, proven with OutLayer's own verifier. The logic
// lives in `@accord/sdk/node` (release-node.ts) so the CLI, the app's /api/verify and the MCP server print the same
// release line. Without `outlayer-verify` on PATH (or OUTLAYER_VERIFY_BIN) the check stays `not checked`.

import { outlayerVerifyProof } from "@accord/sdk/node";
import type { ReleaseProof } from "@accord/sdk";

export { OUTLAYER_API, type AttestationRecord } from "@accord/sdk";
export { releaseProof, type ReleaseProofDeps, type RunResult } from "@accord/sdk/node";

/** The real proof: the public record API and the `outlayer-verify` binary (OUTLAYER_VERIFY_BIN, else PATH). */
export function realReleaseProof(env: Record<string, string | undefined>): ReleaseProof {
  return outlayerVerifyProof(env, { timeoutMs: 180_000 });
}

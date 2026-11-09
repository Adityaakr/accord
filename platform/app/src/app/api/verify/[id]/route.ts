// Runs the keyless checks for one agreement with the nonce the browser chose. NEAR AI's attestation report is
// fetched with that nonce; the key, when one is configured, is only used to relay the report. A malformed id is a
// 400 before any RPC call (src/server/verifyroute.ts). Readable from any origin (server/cors.ts): GET only, no
// credentials. The release check runs outlayer-verify when the image carries it, cached per job run (server/release.ts).
import { verify } from "@accord/sdk";
import { accord, factories } from "@/server/accord";
import { readPreflight, withReadCors } from "@/server/cors";
import { releaseProof } from "@/server/release";
import { verifyResponse } from "@/server/verifyroute";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const nonce = new URL(req.url).searchParams.get("nonce") ?? undefined;
  return withReadCors(await verifyResponse(id, nonce, (a, n) => verify(accord(), a, { nonce: n, nearAiKey: process.env.NEARAI_API_KEY, factories: factories(), releaseProof: releaseProof() })));
}

export function OPTIONS() {
  return readPreflight();
}

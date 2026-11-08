// Runs the keyless checks for one agreement with the nonce the browser chose. NEAR AI's attestation report is
// fetched with that nonce; the key, when one is configured, is only used to relay the report.
import { NotAnAgreementError, verify } from "@accord/sdk";
import { accord } from "@/server/accord";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const nonce = new URL(req.url).searchParams.get("nonce") ?? undefined;
  if (nonce !== undefined && !/^[0-9a-f]{64}$/.test(nonce)) {
    return Response.json({ error: "nonce must be 64 lowercase hex characters" }, { status: 400 });
  }
  try {
    return Response.json(await verify(accord(), id, { nonce, nearAiKey: process.env.NEARAI_API_KEY }));
  } catch (e) {
    if (e instanceof NotAnAgreementError) return Response.json({ error: e.message }, { status: 404 });
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}

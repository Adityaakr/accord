// /api/verify/<id>'s answers, pure of server-only so they are testable: 400 with a plain message for an id that is not a
// NEAR account id or a bad nonce (before any RPC call), 404 for a well-formed account that is not an Accord agreement,
// 503 with Retry-After when the NEAR RPC is busy, 502 when the chain or NEAR AI could not be read otherwise.
import { isAccountId, NotAnAgreementError, type VerifyReport } from "@accord/sdk";
import { chainErrorResponse } from "./rpcerror";

export async function verifyResponse(
  id: string, nonce: string | undefined, run: (id: string, nonce: string | undefined) => Promise<VerifyReport>,
): Promise<Response> {
  if (!isAccountId(id)) {
    return Response.json({ error: `${JSON.stringify(id.slice(0, 80))} is not a NEAR account id: 2 to 64 characters, lowercase letters, digits, and single - _ or . between them` }, { status: 400 });
  }
  if (nonce !== undefined && !/^[0-9a-f]{64}$/.test(nonce)) {
    return Response.json({ error: "nonce must be 64 lowercase hex characters" }, { status: 400 });
  }
  try {
    return Response.json(await run(id, nonce));
  } catch (e) {
    if (e instanceof NotAnAgreementError) return Response.json({ error: e.message }, { status: 404 });
    return chainErrorResponse(e);
  }
}

// Relays an email user's approved NEAR Auth signature request: submits the `sign` call (the relayer pays its gas and
// the 1 yoctoNEAR deposit) and returns the MPC signature for the user's own transaction. Only for a signed-in session,
// rate-limited, and only for approvals Auth0 issued for NEAR Auth signing (checked in relaySign).
import { NextResponse } from "next/server";
import { relaySign, type SignatureRequest } from "@/server/fastauth";
import { sessionAccount } from "@/server/session";
import { allow, sameOriginJson } from "@/server/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const bad = sameOriginJson(req);
  if (bad) return NextResponse.json({ error: bad }, { status: 415 });
  const account = await sessionAccount();
  if (!account) return NextResponse.json({ error: "sign in with email first" }, { status: 401 });
  if (!allow(`sign:${account}`, 40, 3600_000)) return NextResponse.json({ error: "too many signatures this hour" }, { status: 429 });
  const { signatureRequest } = (await req.json().catch(() => ({}))) as { signatureRequest?: SignatureRequest };
  try {
    const successValue = await relaySign(signatureRequest as SignatureRequest);
    return NextResponse.json({ successValue });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

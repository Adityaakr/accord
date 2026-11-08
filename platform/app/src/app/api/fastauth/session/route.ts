// Email sign-in (NEAR Auth): the browser sends its Auth0 ID token; the server verifies it against the tenant's keys,
// derives the person's NEAR account from the MPC contract (the browser cannot pick it), funds the account once if it is
// new so it can pay its own gas, and opens the same short-lived session a wallet signature would.
import { NextResponse } from "next/server";
import { derivedAccount, fundIfNew, verifyJwt, FASTAUTH } from "@/server/fastauth";
import { openSessionFor } from "@/server/session";
import { allow, sameOriginJson } from "@/server/ratelimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const bad = sameOriginJson(req);
  if (bad) return NextResponse.json({ error: bad }, { status: 415 });
  const { idToken } = (await req.json().catch(() => ({}))) as { idToken?: string };
  if (!idToken) return NextResponse.json({ error: "idToken is required" }, { status: 400 });
  try {
    const claims = await verifyJwt(idToken, FASTAUTH.clientId);
    const sub = String(claims.sub ?? "");
    if (!sub || !allow(`session:${sub}`, 20, 3600_000)) return NextResponse.json({ error: "too many sign-ins; try again later" }, { status: 429 });
    const { accountId, publicKey } = await derivedAccount(sub);
    const funded = await fundIfNew(accountId);
    const expires = await openSessionFor(accountId);
    return NextResponse.json({ account: accountId, publicKey, funded: funded.funded, fundTx: funded.tx ?? null, expires });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 });
  }
}

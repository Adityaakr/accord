// The buyer approves a warned recipient for its agent: a NEP-413 signature over
// accord:preflight:v1:<agreement>:<recipient>, checked against the buyer's keys over RPC.
import { accord } from "@/server/accord";
import { verifySigned } from "@/server/nep413";
import { saveApproval } from "@/server/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = (await req.json()) as { agreement: string; recipient: string; signature: string; public_key: string };
  const view = await accord().agreement(b.agreement).get().catch(() => null);
  if (!view) return Response.json({ error: "unknown agreement" }, { status: 404 });
  const message = `accord:preflight:v1:${b.agreement}:${b.recipient}`;
  const ok = await verifySigned({ account: view.buyer, publicKey: b.public_key, message, recipient: b.agreement, signature: b.signature });
  if (!ok) return Response.json({ error: "not signed by the buyer" }, { status: 403 });
  await saveApproval({ agreement: b.agreement, recipient: b.recipient, buyer: view.buyer, signature: b.signature });
  return Response.json({ ok: true });
}

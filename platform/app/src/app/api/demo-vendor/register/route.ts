// A fresh vendor registers a recipient and authority pair on the app's labelled demo domain for 24 hours, so
// `make demo` can prove a recipient without owning a domain. Signed (NEP-413) by the recipient account.
import { verifySigned } from "@/server/nep413";
import { registerDemoVendor } from "@/server/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = (await req.json()) as { recipient: string; authority: string; signature: string; public_key: string };
  const message = `accord:demo-vendor:v1:${b.recipient}:${b.authority}`;
  const ok = await verifySigned({ account: b.recipient, publicKey: b.public_key, message, recipient: b.recipient, signature: b.signature });
  if (!ok) return Response.json({ error: "not signed by the recipient" }, { status: 403 });
  await registerDemoVendor(b.recipient, b.authority);
  return Response.json({ ok: true });
}

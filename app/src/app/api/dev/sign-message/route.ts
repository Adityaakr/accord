// Sandbox only: NEP-413 signature by a sandbox principal (for the document key).
import { toBase64 } from "@accord/sdk";
import { sandboxAccount, sandboxOnly } from "@/server/sandbox";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = sandboxOnly();
  if (blocked) return blocked;
  const b = (await req.json()) as { as: string; message: string; recipient: string; nonce: number[] };
  const signed = await sandboxAccount(b.as).signNep413Message({
    message: b.message, recipient: b.recipient, nonce: Uint8Array.from(b.nonce),
  });
  return Response.json({ signature: toBase64(signed.signature), publicKey: signed.publicKey.toString() });
}

// The demo vendor's delivery document for one item (packages/sdk/src/delivery.ts): the exact JSON text whose sha256
// the demo vendor submitted as the item's evidence hash, so anyone can fetch it and recompute the hash. It is the same
// for every request; it says it is demo evidence, not real work.
import { demoDelivery } from "@accord/sdk";

export const dynamic = "force-dynamic";

const ACCOUNT = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; item: string }> }) {
  const { id, item } = await ctx.params;
  const n = Number(item);
  if (id.length < 2 || id.length > 64 || !ACCOUNT.test(id) || !/^\d{1,6}$/.test(item) || !Number.isSafeInteger(n)) {
    return Response.json({ error: "expected /api/deliveries/<agreement account>/<item number>" }, { status: 400 });
  }
  const d = demoDelivery(id, n);
  return new Response(d.document, {
    headers: { "content-type": "application/json; charset=utf-8", "x-accord-evidence-sha256": d.hash, "cache-control": "public, max-age=86400" },
  });
}

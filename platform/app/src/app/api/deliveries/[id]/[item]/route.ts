// The demo vendor's delivery document for one item (src/server/delivery.ts): served as the exact JSON text whose
// sha256 is the item's evidence hash on chain, only when the hash on chain is that; a placeholder hash from before the
// documents is reported as one. It says it is demo evidence, not real work.
import { accord } from "@/server/accord";
import { deliveryResponse } from "@/server/delivery";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; item: string }> }) {
  const { id, item } = await ctx.params;
  return deliveryResponse(id, item, (a) => accord().agreement(a).items());
}

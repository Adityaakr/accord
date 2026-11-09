import { isRpcBusy } from "@accord/sdk";
import { room } from "@/server/data";
import { decodeSegment, isAccountId } from "@/lib/accountid";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = decodeSegment((await ctx.params).id);
  if (!isAccountId(id)) return Response.json({ error: "not a NEAR account id" }, { status: 404 });
  try {
    return Response.json(await room(id), { headers: { "cache-control": "s-maxage=15" } });
  } catch (e) {
    // a busy RPC is not a missing room
    if (isRpcBusy(e)) return Response.json({ error: "the chain is busy; read again in a moment", busy: true }, { status: 503 });
    return Response.json({ error: (e as Error).message }, { status: 404 });
  }
}

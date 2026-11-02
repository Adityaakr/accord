import { room } from "@/server/data";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    return Response.json(await room(id), { headers: { "cache-control": "s-maxage=15" } });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 404 });
  }
}

import { rooms } from "@/server/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { rooms: list, source } = await rooms();
    return Response.json({ source, agreements: list.map((r) => ({ ...r.record, state: r.view?.state ?? null, total: r.view?.total ?? null, paid: r.view?.paid ?? null, refusals: r.view?.refusals ?? 0 })) }, { headers: { "cache-control": "s-maxage=15" } });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}

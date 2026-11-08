import { approvals } from "@/server/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const agreement = new URL(req.url).searchParams.get("agreement") ?? "";
  return Response.json(await approvals(agreement));
}

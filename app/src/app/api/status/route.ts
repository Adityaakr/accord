import { source } from "@/server/accord";
import { heartbeats } from "@/server/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const [rpc, beats] = await Promise.all([source().catch((e: Error) => ({ error: e.message })), heartbeats()]);
  return Response.json({ rpc, heartbeats: beats });
}

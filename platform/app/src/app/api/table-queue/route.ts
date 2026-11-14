import { queueReading } from "@/server/tablequeue";

export const dynamic = "force-dynamic";

// OutLayer's queue right now (view calls only, shared 20 s reading). `reading` is null when it cannot be read.
export async function GET() {
  return Response.json({ reading: await queueReading() });
}

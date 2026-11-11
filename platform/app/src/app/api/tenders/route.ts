// The open tenders on the board, newest first. Keyless and readable from any origin.
import { readPreflight, withReadCors } from "@/server/cors";
import { boardId, listJobs } from "@/server/tender";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return withReadCors(Response.json({ board: boardId(), now: Date.now(), jobs: await listJobs() }, { headers: { "cache-control": "no-store" } }));
  } catch (e) {
    return withReadCors(Response.json({ error: `could not read the board: ${(e as Error).message}` }, { status: 502 }));
  }
}
export function OPTIONS() {
  return readPreflight();
}

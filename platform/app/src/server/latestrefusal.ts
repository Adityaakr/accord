// The newest refusal on an agreement. `get_refusals(from, limit)` reads oldest first from sequence `from` (1-based,
// clamped to the oldest the 128-slot ring still holds), so `refusals(undefined, 1)` is the OLDEST one held. The
// agreement view's `refusals` is the last sequence number, so reading one entry from it gives the newest.
import type { Refusal } from "@accord/sdk";

export async function latestRefusal(
  d: { refusals(from?: number, limit?: number): Promise<Refusal[]> },
  lastSeq: number,
): Promise<Refusal | null> {
  if (lastSeq < 1) return null;
  const rows = await d.refusals(lastSeq, 1);
  return rows.at(-1) ?? null;
}

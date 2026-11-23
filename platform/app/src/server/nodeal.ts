// Why a room ended `No deal` (lib/nodeal.ts), read once per room: a `NoDeal` agreement never changes again, so a
// cause read from complete transactions is kept for good. An incomplete or unreachable read is tried again later.

import "server-only";
import { accord } from "./accord";
import { accountTxs } from "./activity";
import { noDealCause, type NoDealCause } from "@/lib/nodeal";

const settled = new Map<string, NoDealCause>();
const MAX = 2_000;

/** The cause for a `NoDeal` agreement; `unknown` (never a guess) when the chain or the transactions cannot be read. */
export async function roomNoDeal(agreement: string, outlayer?: string): Promise<NoDealCause> {
  const hit = settled.get(agreement);
  if (hit) return hit;
  const d = accord().agreement(agreement);
  const sealed = await d.sealedOutput().catch(() => null);
  const ol = outlayer ?? (await d.get().catch(() => null))?.outlayer ?? "outlayer.testnet";
  const read = sealed ? null : await accountTxs(agreement).catch(() => null);
  const cause = noDealCause(sealed, read?.txs ?? null, agreement, ol);
  if (sealed || (read?.complete && cause.kind !== "unknown")) {
    settled.set(agreement, cause);
    while (settled.size > MAX) settled.delete(settled.keys().next().value as string);
  }
  return cause;
}

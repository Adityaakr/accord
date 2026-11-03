// The public /try room: the agreement its inbox feeds. TRY_AGREEMENT pins it; otherwise the room the re-arm has
// open (the store's try_rooms), else the newest executing room whose buyer is the /try buyer.

import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { AgreementView } from "@accord/sdk";
import { accord, config } from "./accord";
import { tryRooms } from "./store";

function tryBuyer(): string | undefined {
  if (process.env.TRY_BUYER_ACCOUNT) return process.env.TRY_BUYER_ACCOUNT;
  if (config().network !== "sandbox") return undefined;
  try {
    const file = path.resolve(process.cwd(), "../target/sandbox/env.json");
    return (JSON.parse(readFileSync(file, "utf8")) as { try?: { buyer?: { account: string } } }).try?.buyer?.account;
  } catch {
    return undefined;
  }
}

export async function tryRoom(): Promise<AgreementView | null> {
  const a = accord();
  if (process.env.TRY_AGREEMENT) return a.agreement(process.env.TRY_AGREEMENT).get().catch(() => null);
  const open = (await tryRooms(5).catch(() => [])).find((r) => r.status === "open");
  if (open) {
    const v = await a.agreement(open.agreement).get().catch(() => null);
    if (v?.state === "Executing") return v;
  }
  const buyer = tryBuyer();
  if (!buyer) return null;
  const records = await a.listAgreements({ party: buyer }).catch(() => []);
  for (const r of [...records].reverse()) {
    if (r.kind !== "procurement" || r.buyer !== buyer) continue;
    const v = await a.agreement(r.account).get().catch(() => null);
    if (v?.state === "Executing") return v;
  }
  return null;
}

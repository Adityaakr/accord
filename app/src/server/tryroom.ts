// The public /try room: the agreement its inbox feeds. TRY_AGREEMENT pins it; otherwise the newest executing room
// whose buyer is the /try buyer (or, on the local sandbox, the newest executing procurement room).

import "server-only";
import type { AgreementView } from "@accord/sdk";
import { accord, config } from "./accord";

export async function tryRoom(): Promise<AgreementView | null> {
  const a = accord();
  if (process.env.TRY_AGREEMENT) return a.agreement(process.env.TRY_AGREEMENT).get().catch(() => null);
  const buyer = process.env.TRY_BUYER_ACCOUNT;
  const records = buyer ? await a.listAgreements({ party: buyer }) : config().network === "sandbox" ? await a.listAgreements({ limit: 100 }) : [];
  for (const r of [...records].reverse()) {
    if (r.kind !== "procurement" || (buyer && r.buyer !== buyer)) continue;
    const v = await a.agreement(r.account).get().catch(() => null);
    if (v?.state === "Executing" && v.agent_key) return v;
  }
  return null;
}

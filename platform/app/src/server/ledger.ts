// The Record's read model: every payment across a set of rooms. Scope "public" is every room on the factory; scope
// "org" is the rooms where any member of the signed-in person's organisation is the buyer, the vendor or the
// vendor's authority. Contract views only; the organisation's membership comes from the store.

import "server-only";
import type { AgreementRecord, AgreementView, Receipt } from "@accord/sdk";
import { accord } from "./accord";
import { org } from "./store";
import { sessionAccount } from "./session";

export interface LedgerRoom { record: AgreementRecord; view: AgreementView | null; receipts: Receipt[] }
export interface Ledger {
  scope: "public" | "org";
  /** For scope "org": the organisation and its members' accounts, or why it is not available */
  org: { name: string; members: string[] } | null;
  unavailable: "no_session" | "no_org" | null;
  rooms: LedgerRoom[];
}

export async function ledger(scope: "public" | "org"): Promise<Ledger> {
  const a = accord();
  let records: AgreementRecord[] = [];
  let orgInfo: Ledger["org"] = null;
  if (scope === "org") {
    const account = await sessionAccount();
    if (!account) return { scope, org: null, unavailable: "no_session", rooms: [] };
    const m = await org.membership(account);
    if (!m) return { scope, org: null, unavailable: "no_org", rooms: [] };
    const members = (await org.members(m.org.id)).map((x) => x.account_id);
    orgInfo = { name: m.org.name, members };
    const lists = await Promise.all(members.map((p) => a.listAgreements({ party: p }).catch(() => [] as AgreementRecord[])));
    const seen = new Map<string, AgreementRecord>();
    for (const r of lists.flat()) seen.set(r.account, r);
    records = [...seen.values()];
  } else {
    records = await a.listAgreements({ limit: 100 }).catch(() => []);
  }
  const rooms = await Promise.all(records.map(async (record) => {
    const d = a.agreement(record.account);
    const [receipts, view] = await Promise.all([d.receipts().catch(() => [] as Receipt[]), d.get().catch(() => null)]);
    return { record, view, receipts };
  }));
  return { scope, org: orgInfo, unavailable: null, rooms };
}

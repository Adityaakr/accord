// The Record's read model: every payment across a set of rooms. Scope "public" is every room on the ledger's
// factories (the configured ones and the network's KNOWN_FACTORIES, so accord-usdc's rooms show beside accord-v2's); scope
// "org" is the rooms where any member of the signed-in person's organisation is the buyer, the vendor or the
// vendor's authority. Contract views only; the organisation's membership comes from the store.

import "server-only";
import { KNOWN_FACTORIES, type AgreementRecord, type AgreementView, type Receipt } from "@accord/sdk";
import { accord, config, factories } from "./accord";
import { org } from "./store";
import { sessionAccount } from "./session";

export interface LedgerRoom { record: AgreementRecord; view: AgreementView | null; receipts: Receipt[] }
export interface Ledger {
  scope: "public" | "org";
  /** For scope "org": the organisation and its members' accounts, or why it is not available */
  org: { name: string; members: string[] } | null;
  unavailable: "no_session" | "no_org" | null;
  rooms: LedgerRoom[];
  /** The factories the rooms were read from, the default first */
  factories: string[];
}

/** The configured factories, then the network's known ones (sandbox has none). */
export function ledgerFactories(): string[] {
  return [...new Set([...factories(), ...(KNOWN_FACTORIES[config().network] ?? []).map((f) => f.factory)])];
}

/** One list across every ledger factory, oldest first. */
async function listAcross(fs: string[], opts: { party?: string; limit?: number }): Promise<AgreementRecord[]> {
  const a = accord();
  const lists = await Promise.all(fs.map((f, i) => (i === 0 ? a : a.onFactory(f)).listAgreements(opts).catch(() => [] as AgreementRecord[])));
  return fs.length > 1 ? lists.flat().sort((x, y) => x.created_at - y.created_at) : lists.flat();
}

export async function ledger(scope: "public" | "org"): Promise<Ledger> {
  const a = accord();
  const fs = ledgerFactories();
  let records: AgreementRecord[] = [];
  let orgInfo: Ledger["org"] = null;
  if (scope === "org") {
    const account = await sessionAccount();
    if (!account) return { scope, org: null, unavailable: "no_session", rooms: [], factories: fs };
    const m = await org.membership(account);
    if (!m) return { scope, org: null, unavailable: "no_org", rooms: [], factories: fs };
    const members = (await org.members(m.org.id)).map((x) => x.account_id);
    orgInfo = { name: m.org.name, members };
    const lists = await Promise.all(members.map((p) => listAcross(fs, { party: p })));
    const seen = new Map<string, AgreementRecord>();
    for (const r of lists.flat()) seen.set(r.account, r);
    records = [...seen.values()];
  } else {
    records = await listAcross(fs, { limit: 100 });
  }
  const rooms = await Promise.all(records.map(async (record) => {
    const d = a.agreement(record.account);
    const [receipts, view] = await Promise.all([d.receipts().catch(() => [] as Receipt[]), d.get().catch(() => null)]);
    return { record, view, receipts };
  }));
  return { scope, org: orgInfo, unavailable: null, rooms, factories: fs };
}

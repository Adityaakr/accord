// Whether the Sealed Table has been answering, read from chain state: the newest agreements on the primary factory
// and how their negotiation ended. An agreement in `NoDeal` with no stored signed output got no signed answer the
// contract accepts on any of its three attempts; why is read from OutLayer's own log in each attempt's transaction
// (lib/nodeal.ts): its worker answering after NEAR's wait (about 200 blocks), or an error it returned. A room that
// failed only because its release attached too little NEAR for OutLayer to hold the answer (`output_storage_unpaid`,
// release 6 and earlier) says nothing about a room opened now, so it is not counted. One that reached `Attested` or
// later was answered. Nothing here is a guess about a run still in progress.

import "server-only";
import type { AgreementRecord } from "@accord/sdk";
import { accord } from "./accord";
import { roomNoDeal } from "./nodeal";
import { DEPOSIT_FIXED_IN_RELEASE, isStorageUnpaid, type NoDealCause } from "@/lib/nodeal";

export interface TableHealth {
  /** true when the newest negotiation that has ended got no signed answer in time */
  late: boolean;
  /** how many of the newest ended negotiations in a row got no answer */
  unanswered: number;
  /** the newest agreement whose negotiation got no answer, and when it was created (unix seconds) */
  newestUnanswered: { account: string; at: number } | null;
  /** the newest agreement whose negotiation was answered */
  lastAnswered: { account: string; at: number } | null;
  /** why the newest unanswered one ended, from its attempts' transactions (`unknown` when they could not be read) */
  cause: NoDealCause | null;
  factory: string;
}

const LOOK_BACK = 8;
const CACHE_MS = 60_000;
const ANSWERED = new Set(["Attested", "Executing", "Settled"]);
let cached: { at: number; value: TableHealth } | null = null;

async function newest(n: number): Promise<AgreementRecord[]> {
  return (await accord().listAgreements()).slice(-n).reverse();
}

/** null when the chain could not be read: the pages then say nothing rather than guess. */
export async function tableHealth(): Promise<TableHealth | null> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  try {
    const a = accord();
    const records = await newest(LOOK_BACK);
    const outcomes = await Promise.all(records.map(async (r) => {
      const d = a.agreement(r.account);
      const view = await d.get().catch(() => null);
      if (!view) return null;
      if (ANSWERED.has(view.state)) return true;
      if (view.state === "Sealed") return null; // still sealing or negotiating: no outcome to count
      // NoDeal or Cancelled: the Sealed Table's signed output is stored whenever it answered. A no-deal with none was
      // never answered; a room cancelled before any answer says nothing either way.
      const answered = (await d.sealedOutput()) !== null;
      if (answered) return true;
      if (view.state !== "NoDeal") return null;
      const cause = await roomNoDeal(r.account, view.outlayer).catch(() => null);
      // fixed for every room opened on the current release: not a sign about the table now
      if (isStorageUnpaid(cause) && r.release < DEPOSIT_FIXED_IN_RELEASE) return null;
      return cause ?? false;
    }));
    let unanswered = 0;
    let newestUnanswered: TableHealth["newestUnanswered"] = null;
    let lastAnswered: TableHealth["lastAnswered"] = null;
    let cause: NoDealCause | null = null;
    let run = true;
    records.forEach((r, i) => {
      const o = outcomes[i];
      if (o === null || o === undefined) return;
      if (o === true) { run = false; lastAnswered ??= { account: r.account, at: r.created_at }; return; }
      if (run) {
        unanswered += 1;
        if (!newestUnanswered) { newestUnanswered = { account: r.account, at: r.created_at }; cause = o === false ? null : o; }
      }
    });
    const value: TableHealth = { late: unanswered > 0, unanswered, newestUnanswered, lastAnswered, cause, factory: a.factory };
    cached = { at: Date.now(), value };
    return value;
  } catch {
    return null;
  }
}

// Whether the Sealed Table has been answering in time, read from chain state only: the newest agreements on the
// primary factory and how their negotiation ended. An agreement in `NoDeal` with no stored signed output ended
// because no signed answer reached the contract inside NEAR's wait (about 200 blocks) on any of its three attempts;
// one that reached `Attested` or later was answered. Nothing here is a guess about a run still in progress.

import "server-only";
import type { AgreementRecord } from "@accord/sdk";
import { accord } from "./accord";

export interface TableHealth {
  /** true when the newest negotiation that has ended got no signed answer in time */
  late: boolean;
  /** how many of the newest ended negotiations in a row got no answer */
  unanswered: number;
  /** the newest agreement whose negotiation got no answer, and when it was created (unix seconds) */
  newestUnanswered: { account: string; at: number } | null;
  /** the newest agreement whose negotiation was answered */
  lastAnswered: { account: string; at: number } | null;
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
      if (view.state !== "NoDeal") return null; // still sealing or negotiating, or cancelled: no outcome to count
      // a no-deal the Sealed Table decided stores its signed output; one with none was never answered
      return (await d.sealedOutput()) !== null ? true : false;
    }));
    let unanswered = 0;
    let newestUnanswered: TableHealth["newestUnanswered"] = null;
    let lastAnswered: TableHealth["lastAnswered"] = null;
    let run = true;
    records.forEach((r, i) => {
      const o = outcomes[i];
      if (o === null || o === undefined) return;
      if (o) { run = false; lastAnswered ??= { account: r.account, at: r.created_at }; return; }
      if (run) { unanswered += 1; newestUnanswered ??= { account: r.account, at: r.created_at }; }
    });
    const value: TableHealth = { late: unanswered > 0, unanswered, newestUnanswered, lastAnswered, factory: a.factory };
    cached = { at: Date.now(), value };
    return value;
  } catch {
    return null;
  }
}

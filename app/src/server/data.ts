// Read models for the pages, built from contract views only.

import "server-only";
import type {
  AgreementRecord, AgreementView, ExceptionView, ItemView, PeriodView, Receipt, RecipientVersion, Refusal, Terms,
  StoredObservation,
} from "@accord/sdk";
import { accord, source, type Source } from "./accord";

export interface RoomSummary {
  record: AgreementRecord;
  view: AgreementView | null;
}

export async function rooms(): Promise<{ rooms: RoomSummary[]; source: Source }> {
  const a = accord();
  const [records, src] = await Promise.all([a.listAgreements({ limit: 100 }), source()]);
  const views = await Promise.all(records.map((r) => a.agreement(r.account).get().catch(() => null)));
  return { rooms: records.map((record, i) => ({ record, view: views[i] ?? null })).reverse(), source: src };
}

export interface Room {
  view: AgreementView;
  terms: Terms | null;
  items: ItemView[];
  refusals: Refusal[];
  recipients: RecipientVersion[];
  exceptions: ExceptionView[];
  periods: PeriodView[];
  observations: StoredObservation[][];
  receipts: Receipt[];
  source: Source;
}

export async function room(id: string): Promise<Room> {
  const d = accord().agreement(id);
  const [view, terms, items, refusals, recipients, exceptions, periods, receipts, src] = await Promise.all([
    d.get(), d.terms(), d.items(), d.refusals(undefined, 128), d.recipients(), d.exceptions(), d.periods(), d.receipts(),
    source(),
  ]);
  const observations = await Promise.all(periods.map((p) => d.observations(p.period)));
  return { view, terms, items, refusals: refusals.reverse(), recipients, exceptions, periods, observations, receipts, source: src };
}

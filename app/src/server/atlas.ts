// The Accord Atlas console's read model: every market-making agreement with its conditions, periods and the
// observations recorded on chain, plus the totals and the latest reading across them. Contract views only; the
// app never reads the venue itself, so every number here is one the observer signed and the contract accepted.

import "server-only";
import type {
  AgreementRecord, AgreementView, AtlasTerms, PeriodView, Receipt, StoredObservation,
} from "@accord/sdk";
import { accord, source, type Source } from "./accord";

export interface AtlasRoom {
  record: AgreementRecord;
  view: AgreementView;
  atlas: AtlasTerms;
  periods: PeriodView[];
  observations: StoredObservation[][];
  receipts: Receipt[];
  /** Base units paid as retainers, and owed for periods that closed withheld. */
  paid: bigint;
  withheld: bigint;
}

export interface AtlasConsole {
  rooms: AtlasRoom[];
  latest: (StoredObservation & { agreement: string }) | null;
  recent: (StoredObservation & { agreement: string; title: string })[];
  totals: { paid: bigint; withheld: bigint; eligible: number; withheldPeriods: number; review: number; observations: number; passed: number };
  source: Source;
}

const PAID = new Set(["Eligible", "ResolvedPay"]);
const LOST = new Set(["Withheld", "ResolvedClosed"]);

async function load(record: AgreementRecord): Promise<AtlasRoom | null> {
  const d = accord().agreement(record.account);
  const [view, terms, periods, receipts] = await Promise.all([d.get(), d.terms(), d.periods(), d.receipts()]);
  if (!terms?.atlas) return null;
  const observations = await Promise.all(periods.map((p) => d.observations(p.period)));
  const paid = receipts.reduce((s, r) => s + BigInt(r.amount), 0n);
  const withheld = BigInt(periods.filter((p) => LOST.has(p.outcome)).length) * BigInt(terms.atlas.retainer_per_period);
  return { record, view, atlas: terms.atlas, periods, observations, receipts, paid, withheld };
}

export async function atlasConsole(): Promise<AtlasConsole> {
  const a = accord();
  const [records, src] = await Promise.all([a.listAgreements({ limit: 100 }), source()]);
  const loaded = await Promise.all(
    records.filter((r) => r.kind === "market-making").map((r) => load(r).catch(() => null)),
  );
  const rooms = loaded.filter((r): r is AtlasRoom => r !== null).reverse();
  const all = rooms.flatMap((r) => r.observations.flat().map((o) => ({ ...o, agreement: r.record.account, title: r.record.title })));
  all.sort((x, y) => y.observation.venue_block.height - x.observation.venue_block.height);
  const periods = rooms.flatMap((r) => r.periods);
  return {
    rooms,
    latest: all[0] ?? null,
    recent: all.slice(0, 12),
    totals: {
      paid: rooms.reduce((s, r) => s + r.paid, 0n),
      withheld: rooms.reduce((s, r) => s + r.withheld, 0n),
      eligible: periods.filter((p) => PAID.has(p.outcome)).length,
      withheldPeriods: periods.filter((p) => LOST.has(p.outcome)).length,
      review: periods.filter((p) => p.outcome === "Review").length,
      observations: all.length,
      passed: all.filter((o) => o.pass).length,
    },
    source: src,
  };
}

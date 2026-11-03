// The keeper's observer polling (ARCHITECTURE.md 9.2, PROGRESS 2.9): for every open Accord Atlas period, ask the
// observer about each slot whose window has opened and that has no observation on chain yet, and submit what it
// signs. The observer answers `not_yet` (unsigned, saying nothing about the time) until the hidden slot time and
// a final mainnet block after it exist, so asking early costs a call and reveals nothing.

import type { AgreementClient, AtlasTerms, Observation, PeriodView } from "@accord/sdk";

export interface SlotAsk { period: number; slot: number }

/** The slots worth asking about now: window open, period still open, no observation recorded. */
export function slotsToAsk(
  atlas: Pick<AtlasTerms, "period_secs" | "slots_per_period">,
  periods: readonly PeriodView[],
  recorded: ReadonlyMap<number, ReadonlySet<number>>,
  now: number,
): SlotAsk[] {
  const window = Math.floor(atlas.period_secs / Math.max(1, atlas.slots_per_period));
  const out: SlotAsk[] = [];
  for (const p of periods) {
    if (p.outcome !== "Open" || p.starts_at === undefined || p.starts_at > now) continue;
    if (p.closable_at !== undefined && now >= p.closable_at) continue;
    const have = recorded.get(p.period) ?? new Set<number>();
    for (let slot = 0; slot < atlas.slots_per_period; slot++) {
      if (have.has(slot)) continue;
      if (p.starts_at + slot * window > now) break;
      out.push({ period: p.period, slot });
    }
  }
  return out;
}

export type ObserverOutput =
  | ({ mode: "observe"; status: "observed"; sig: string } & Observation)
  | { mode: "observe"; status: "not_yet" }
  | { mode: string; status: "error"; error: string };

export type AskObserver = (agreement: string, ask: SlotAsk) => Promise<ObserverOutput>;

/** An observer over HTTP: the local OutLayer's `/observe`, or OutLayer's HTTPS API with a payment key. */
export function httpObserver(url: string, token?: string): AskObserver {
  return async (agreement, ask) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ mode: "observe", agreement, period: ask.period, slot: ask.slot }),
    });
    const body = (await res.json()) as ObserverOutput | { error: string };
    if (!res.ok || !("mode" in body)) throw new Error(`observer ${res.status}: ${"error" in body ? body.error : ""}`);
    return body;
  };
}

/** The observation `record_observation` takes: the signed object without `sig`, `mode` and `status`. */
export function observationOf(out: Extract<ObserverOutput, { status: "observed" }>): Observation {
  const { sig: _sig, mode: _mode, status: _status, ...observation } = out;
  return observation;
}

/** One pass for one agreement; returns a line per observation recorded. */
export async function observeAgreement(
  deal: AgreementClient,
  atlas: AtlasTerms,
  now: number,
  ask: AskObserver,
): Promise<string[]> {
  const periods = await deal.periods();
  const recorded = new Map<number, Set<number>>();
  for (const p of periods) {
    if (p.outcome !== "Open" || p.starts_at === undefined || p.starts_at > now) continue;
    const obs = await deal.observations(p.period);
    recorded.set(p.period, new Set(obs.map((o) => o.observation.slot)));
  }
  const lines: string[] = [];
  for (const s of slotsToAsk(atlas, periods, recorded, now)) {
    const out = await ask(deal.id, s);
    if (out.status === "not_yet") continue;
    if (out.status !== "observed") {
      lines.push(`observe ${deal.id} · period ${s.period + 1} slot ${s.slot + 1} · ${out.error}`);
      continue;
    }
    const tx = await deal.recordObservation(observationOf(out), out.sig);
    lines.push(
      `observe ${deal.id} · period ${s.period + 1} slot ${s.slot + 1} · mainnet block ${out.venue_block.height} · ` +
        `spread ${out.spread_bps} bps · tx ${tx.txHash}`,
    );
  }
  return lines;
}

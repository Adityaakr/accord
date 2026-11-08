// Market-making building blocks, shared by the console (/market-making, alias /atlas) and the market-making deal rooms: the agreed
// conditions, each period's slots, and the observations the contract accepted, each linked to its mainnet block.

import Link from "next/link";
import { formatUnits, type AtlasTerms, type PeriodView, type StoredObservation } from "@accord/sdk";
import { Pill, type Tone } from "./ui";
import styles from "./atlas.module.css";

const MAINNET_BLOCK = "https://nearblocks.io/blocks/";

export const OUTCOME_TONE: Record<string, Tone> = {
  // Withheld is the terms working, not a refusal: red stays for refusals, canary trips and revocations.
  Open: "neutral", Eligible: "teal", Withheld: "muted", Review: "warn", ResolvedPay: "teal", ResolvedClosed: "muted",
};
export const OUTCOME_LABEL: Record<string, string> = {
  Open: "open", Eligible: "eligible", Withheld: "withheld", Review: "buyer decides", ResolvedPay: "resolved: pay",
  ResolvedClosed: "resolved: closed",
};

const usdc0 = (base: string) => formatUnits(base, 6, 0);

export function Conditions({ atlas, twoSided }: { atlas: AtlasTerms; twoSided: boolean }) {
  return (
    <div className={styles.conditions}>
      <Pill>spread ≤ {atlas.max_spread_bps} bps</Pill>
      <Pill>depth ≥ {usdc0(atlas.min_depth_quote)} USDC each side within {atlas.depth_band_bps} bps</Pill>
      {twoSided && <Pill>two-sided</Pill>}
      <Pill>{atlas.pass_threshold} of {atlas.slots_per_period} slots</Pill>
    </div>
  );
}

/** Each period's slots: the spread a passing or failing slot measured, dashed while unobserved. */
export function PeriodGrid({
  periods, observations, atlas, now, compact = false,
}: { periods: PeriodView[]; observations: StoredObservation[][]; atlas: AtlasTerms; now: number; compact?: boolean }) {
  return (
    <div className={compact ? styles.periodsCompact : styles.periods}>
      {periods.map((p, i) => {
        const obs = observations[i] ?? [];
        const bySlot = new Map(obs.map((o) => [o.observation.slot, o]));
        const open = p.outcome === "Open";
        const started = p.starts_at === undefined || p.starts_at <= now;
        return (
          <div key={p.period} className={`${styles.period} ${started ? "" : styles.future}`}>
            <div className={styles.periodHead}>
              <span className="h5">Period {p.period + 1}</span>
              <Pill tone={OUTCOME_TONE[p.outcome] ?? "neutral"}>{started || !open ? OUTCOME_LABEL[p.outcome] ?? p.outcome : "upcoming"}</Pill>
            </div>
            <div className={styles.slots} role="list" aria-label={`Period ${p.period + 1} slots`}
              style={{ gridTemplateColumns: `repeat(${atlas.slots_per_period}, minmax(0, 1fr))` }}>
              {Array.from({ length: atlas.slots_per_period }, (_, k) => {
                const o = bySlot.get(k);
                const cls = o ? (o.pass ? styles.pass : styles.fail) : styles.empty;
                const label = o
                  ? `slot ${k + 1}: spread ${o.observation.spread_bps} bps, depth ${usdc0(o.observation.depth_bid)} / ${usdc0(o.observation.depth_ask)} USDC, ${o.pass ? "pass" : "fail"} at mainnet block ${o.observation.venue_block.height}`
                  : `slot ${k + 1}: ${open ? "not observed yet" : "unobserved"}`;
                return (
                  <span key={k} role="listitem" className={`${styles.slot} ${cls}`} title={label}>
                    {o ? <span className="mono">{o.observation.spread_bps}</span> : <span className="mono faint">·</span>}
                  </span>
                );
              })}
            </div>
            <div className={styles.periodFoot}>
              {open ? (
                <span className="small">
                  {!started && p.starts_at ? `starts in ${short(p.starts_at - now)}` : `${obs.length} of ${atlas.slots_per_period} observed${p.closable_at ? ` · closes ${p.closable_at > now ? `in ${short(p.closable_at - now)}` : "now"}` : ""}`}
                </span>
              ) : (
                <span className="small mono">{p.passed} of {atlas.slots_per_period} passed · uptime {(p.uptime_bps / 100).toFixed(0)}%{p.conflict ? " · conflict logged" : ""}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function short(secs: number): string {
  if (secs < 90) return `${secs} s`;
  if (secs < 5400) return `${Math.round(secs / 60)} min`;
  return `${Math.round(secs / 3600)} h`;
}

export function blockLink(o: StoredObservation) {
  const b = o.observation.venue_block;
  return (
    <a className="link mono" href={`${MAINNET_BLOCK}${b.hash}`} target="_blank" rel="noreferrer" title={`NEAR mainnet block ${b.hash}`}>
      {b.height.toLocaleString("en-US")}
    </a>
  );
}

/** Every observation, newest first: slot, mainnet block (anyone can re-read the pool at it), spread, depth, result. */
export function ObservationLog({
  rows, showAgreement = false,
}: { rows: (StoredObservation & { agreement?: string; title?: string })[]; showAgreement?: boolean }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {showAgreement && <th>Agreement</th>}
            <th>Slot</th><th>Measured at</th><th>Mainnet block</th><th>Spread</th><th>Depth bid / ask</th><th>Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => {
            const ob = o.observation;
            return (
              <tr key={`${o.agreement ?? ""}-${ob.period}-${ob.slot}`}>
                {showAgreement && (
                  <td><Link className="link" href={`/agreements/${o.agreement}`}>{o.title ?? o.agreement}</Link></td>
                )}
                <td className="mono">P{ob.period + 1} · S{ob.slot + 1}</td>
                <td className="mono">{new Date(ob.slot_time * 1000).toISOString().slice(11, 19)} UTC</td>
                <td>{blockLink(o)}</td>
                <td className="mono">{ob.spread_bps} bps</td>
                <td className="mono">{usdc0(ob.depth_bid)} / {usdc0(ob.depth_ask)} USDC</td>
                <td><Pill tone={o.pass ? "teal" : "muted"}>{o.pass ? "pass" : "fail"}</Pill></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

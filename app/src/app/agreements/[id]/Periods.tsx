import { formatUnits, type AtlasTerms, type PeriodView, type StoredObservation } from "@accord/sdk";
import { Panel, Pill, type Tone } from "@/components/ui";
import styles from "./periods.module.css";

const OUTCOME_TONE: Record<string, Tone> = {
  Open: "neutral", Eligible: "teal", Withheld: "refusal", Review: "warn", ResolvedPay: "teal", ResolvedClosed: "muted",
};
const OUTCOME_LABEL: Record<string, string> = {
  Open: "open", Eligible: "eligible", Withheld: "withheld", Review: "buyer decides", ResolvedPay: "resolved: pay",
  ResolvedClosed: "resolved: closed",
};

/** Accord Atlas: each period's slots, what each observation measured, and the period's outcome. */
export function Periods({
  periods, observations, atlas, now,
}: { periods: PeriodView[]; observations: StoredObservation[][]; atlas: AtlasTerms; now: number }) {
  return (
    <Panel
      title="Observations"
      eyebrow="slot times are drawn inside the observer's enclave; each sample is the first NEAR mainnet block after its time"
    >
      <div className={styles.periods}>
        {periods.map((p, i) => {
          const obs = observations[i] ?? [];
          const bySlot = new Map(obs.map((o) => [o.observation.slot, o]));
          const open = p.outcome === "Open";
          return (
            <div key={p.period} className={styles.period}>
              <div className={styles.periodHead}>
                <span className="h5">Period {p.period + 1}</span>
                <Pill tone={OUTCOME_TONE[p.outcome] ?? "neutral"}>{OUTCOME_LABEL[p.outcome] ?? p.outcome}</Pill>
              </div>
              <div className={styles.slots} role="list" aria-label={`Period ${p.period + 1} slots`}>
                {Array.from({ length: atlas.slots_per_period }, (_, k) => {
                  const o = bySlot.get(k);
                  const cls = o ? (o.pass ? styles.pass : styles.fail) : styles.empty;
                  const label = o
                    ? `slot ${k + 1}: spread ${o.observation.spread_bps} bps, depth ${formatUnits(o.observation.depth_bid, 6, 0)} / ${formatUnits(o.observation.depth_ask, 6, 0)} USDC, ${o.pass ? "pass" : "fail"} at mainnet block ${o.observation.venue_block.height}`
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
                  <span className="small">{obs.length} of {atlas.slots_per_period} observed{p.closable_at ? ` · closes ${p.closable_at > now ? `in ${p.closable_at - now} s` : "now"}` : ""}</span>
                ) : (
                  <span className="small mono">{p.passed} of {atlas.slots_per_period} passed · threshold {atlas.pass_threshold} · uptime {(p.uptime_bps / 100).toFixed(0)}%{p.conflict ? " · conflict logged" : ""}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="small">Numbers in the slots are the spread in basis points. Atlas measures the venue&apos;s liquidity, not the market maker&apos;s own orders.</p>
    </Panel>
  );
}

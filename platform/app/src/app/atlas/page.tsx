import Link from "next/link";
import { formatUnits } from "@accord/sdk";
import { atlasConsole } from "@/server/atlas";
import { blockLink, Conditions, ObservationLog, PeriodGrid } from "@/components/atlas";
import { AutoRefresh } from "@/components/AutoRefresh";
import { SourceLine } from "@/components/SourceLine";
import { Empty, PageHead, Panel, Pill, StatePill, Usdc } from "@/components/ui";
import styles from "./atlas.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accord Atlas" };

function Figure({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className={styles.figure}>
      <span className="small">{label}</span>
      <span className={styles.figureValue}>{value}</span>
      {note && <span className="small faint">{note}</span>}
    </div>
  );
}

export default async function Atlas() {
  const c = await atlasConsole().catch(() => null);
  const latest = c?.latest ?? null;
  const pool = c?.rooms[0]?.atlas.venue.RheaDcl;
  const age = latest && c ? Math.max(0, Math.round(c.source.at / 1000) - latest.observation.venue_block.time) : null;

  return (
    <div className="container">
      <AutoRefresh seconds={15} />
      <PageHead
        eyebrow={<Pill tone="purple">Accord Atlas · liquidity agreements</Pill>}
        title="Pay a market maker for the liquidity the pool actually had."
        lead="A project and its market maker agree a spread, a depth and two-sided quoting. At hidden times an observer reads the venue on NEAR mainnet and signs what it saw; a period's retainer becomes payable only when enough slots pass."
        aside={c && <SourceLine {...c.source} />}
      />

      <section className={styles.reading} aria-label="Latest reading">
        <div className={styles.readingHead}>
          <div>
            <span className="eyebrow">latest reading recorded on chain</span>
            <h2 className="h4">Rhea DCL · NEAR/USDC{pool && <span className="small mono faint"> · {pool.pool_id.slice(0, 8)}… · {pool.contract}</span>}</h2>
          </div>
          {latest && <span className="small">mainnet block {blockLink(latest)}{age !== null && ` · ${age < 120 ? `${age} s` : `${Math.round(age / 60)} min`} ago`}</span>}
        </div>
        {latest ? (
          <div className={styles.figures}>
            <Figure label="Spread" value={<><span className="num">{latest.observation.spread_bps}</span> <span className={styles.unit}>bps</span></>} note={`mid ${Number(latest.observation.mid).toFixed(4)}`} />
            <Figure label="Bid depth" value={<Usdc amount={latest.observation.depth_bid} places={2} />} note={`within ${latest.observation.band_bps} bps of mid`} />
            <Figure label="Ask depth" value={<Usdc amount={latest.observation.depth_ask} places={2} />} note={`within ${latest.observation.band_bps} bps of mid`} />
            <Figure label="Two-sided" value={<span className="num">{latest.observation.two_sided ? "yes" : "no"}</span>} note={`slot ${latest.observation.slot + 1} of period ${latest.observation.period + 1}`} />
          </div>
        ) : (
          <Empty>No observation recorded yet. The keeper asks the observer once each hidden slot time has passed.</Empty>
        )}
      </section>

      {c && c.unread > 0 && (
        <p className="small" style={{ marginTop: 12 }}>{c.unread} agreement{c.unread === 1 ? "" : "s"} could not be read this time; the totals leave {c.unread === 1 ? "it" : "them"} out.</p>
      )}
      {c && (
        <div className={styles.totals}>
          <Figure label="Retainers paid" value={<Usdc amount={c.totals.paid} />} note={`${c.totals.eligible} period${c.totals.eligible === 1 ? "" : "s"} eligible`} />
          <Figure label="Withheld" value={<span className={c.totals.withheld > 0n ? styles.withheld : ""}><Usdc amount={c.totals.withheld} /></span>} note={`${c.totals.withheldPeriods} period${c.totals.withheldPeriods === 1 ? "" : "s"} below the threshold`} />
          <Figure label="Observations" value={<span className="num">{c.totals.observations}</span>} note={`${c.totals.passed} passed · ${c.totals.observations - c.totals.passed} failed`} />
          <Figure label="Buyer decides" value={<span className="num">{c.totals.review}</span>} note="periods with conflicts or too few slots" />
        </div>
      )}

      <h2 className={`h3 ${styles.sectionTitle}`}>Agreements</h2>
      {!c || c.rooms.length === 0 ? (
        <Empty>No Accord Atlas agreements yet. <Link className="link" href="/agreements/new">Create one</Link> with the market-making presets.</Empty>
      ) : (
        <div className={styles.rooms}>
          {c.rooms.map((r) => {
            const done = r.periods.filter((p) => p.outcome !== "Open").length;
            return (
              <Panel
                key={r.record.account}
                title={<Link href={`/agreements/${r.record.account}`} className={styles.roomTitle}>{r.record.title}</Link>}
                eyebrow={<span className="mono">{r.record.account} · {r.view.buyer} pays {r.view.vendor}</span>}
                aside={<StatePill state={r.view.state} />}
              >
                <div className={styles.roomTop}>
                  <Conditions atlas={r.atlas} twoSided={r.view.params.require_two_sided} />
                  <span className="small">
                    <span className="mono">{formatUnits(r.atlas.retainer_per_period)}</span> USDC a period · {done} of {r.periods.length} closed ·{" "}
                    <span className="mono">{formatUnits(r.paid)}</span> paid
                    {r.withheld > 0n && <> · <span className={`mono ${styles.withheld}`}>{formatUnits(r.withheld)}</span> withheld</>}
                  </span>
                </div>
                <PeriodGrid periods={r.periods} observations={r.observations} atlas={r.atlas} now={r.view.now} compact />
              </Panel>
            );
          })}
        </div>
      )}

      {c && c.recent.length > 0 && (
        <>
          <h2 className={`h3 ${styles.sectionTitle}`}>Observation stream</h2>
          <Panel flush eyebrow="the newest observations across every agreement; each block link opens NEAR mainnet">
            <ObservationLog rows={c.recent} showAgreement />
          </Panel>
        </>
      )}

      <h2 className={`h3 ${styles.sectionTitle}`}>How a period is decided</h2>
      <div className={styles.cols3}>
        <Panel title="Hidden slot times">
          <p className="body">Each slot&apos;s time is drawn inside the observer&apos;s enclave from a seed generated there. Nobody knows it in advance, and every caller after it gets the same sample: the first final mainnet block at or after that time.</p>
        </Panel>
        <Panel title="Checked by the contract">
          <p className="body">The contract verifies the observer&apos;s signature, the venue and the slot window, then counts passes against the threshold. Anyone can recompute an observation from an archival node at its block.</p>
        </Panel>
        <Panel title="People decide the rest">
          <p className="body">A period that unobserved slots leave undecided, or that has conflicting observations, goes to the buyer. A withheld period can still be paid through an exception the buyer approves.</p>
        </Panel>
      </div>

      <Panel title="What Accord Atlas does not claim" className={styles.note}>
        <ul className={styles.bullets}>
          <li>It measures the venue&apos;s liquidity, not the market maker&apos;s own orders.</li>
          <li>Retainer-only engagements; no loan-plus-option structures. One venue per agreement.</li>
          <li>The deployer owns the observer&apos;s seed and could rebind it to a build that reveals slot times in advance.</li>
          <li>Slots are minutes in the demo and hours in production, set in the terms.</li>
        </ul>
      </Panel>
    </div>
  );
}

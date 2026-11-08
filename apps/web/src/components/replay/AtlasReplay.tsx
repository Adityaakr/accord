import { useCallback } from "react"
import { ReplayFrame, Hash } from "./ReplayFrame"
import type { Atlas } from "./parse"
import { useReplay } from "./useReplay"
import styles from "./Replay.module.css"

/* make market-making (recorded as make atlas), replayed: one market-making period. Six slot cells fill one by one as
   each is observed (its mainnet block, the spread, the depth on each side as two small bars, the pass tick) while the counter ticks up and the
   threshold marker lights once crossed. Then the decision (Eligible) and the payment sliding to the recipient (teal).
   Beside it the strict agreement: every cell hollow, Withheld, and the agent's attempt refused in red. The depth pair
   is the observer's bid / ask (platform packages/live/src/targets/market-making.ts prints depth_bid / depth_ask). */

const tick = (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m2.5 6.4 2.4 2.3 4.6-5" /></svg>
)

export function AtlasReplay({ data, raw, label, caption }: { data: Atlas; raw: string; label?: string; caption?: string }) {
  const S = data.slots.length
  const DECIDE = S + 1, PAY = S + 2, STRICT = S + 3, REFUSE = S + 4
  const delay = useCallback((s: number) => (s === 0 ? 350 : s < S ? 620 : s === S ? 800 : s === DECIDE ? 900 : s === PAY ? 1300 : 1000), [S, DECIDE, PAY])
  const { ref, stage, replay, reduce } = useReplay(REFUSE, delay)
  const on = (s: number) => (stage >= s ? styles.on : "")
  const passed = data.slots.filter((x) => x.pass && x.n <= stage).length
  const crossed = passed >= data.closed.threshold
  const depthMax = Math.max(...data.slots.flatMap((x) => [Number(x.bid), Number(x.ask)]).filter((v) => !Number.isNaN(v)), 1)
  const pct = (v: string) => `${Math.max(4, (Number(v) / depthMax) * 100).toFixed(1)}%`
  const thPos = `${(data.closed.threshold / data.closed.of) * 100}%`

  return (
    <ReplayFrame ref={ref} label={label} caption={caption} raw={raw} onReplay={replay} canReplay={!reduce} ariaLabel={`${data.title} on ${data.account}: ${data.closed.passed} of ${data.closed.of} slots passed against a threshold of ${data.closed.threshold}, ${data.closed.outcome}, ${data.paid.amount} paid to ${data.paid.to}; the strict agreement ${data.strict.account} passed ${data.strict.passed} of ${data.strict.of}, ${data.strict.outcome}, and the agent's attempt was refused with ${data.withheld.code}`}>
      <div className={styles.atlas}>
        <p className={styles.atlasMeta}><span className="mono">{data.account}</span> · {data.type} · <span className="mono">{data.venue}</span> · {data.where}</p>

        <div className={styles.panels}>
          <section className={styles.panel} aria-label={`${data.account}, ${data.period.name}`}>
            <header className={styles.panelHead}>
              <span className={styles.panelTitle}>{data.period.name}</span>
              <span className={styles.counter} aria-live="off">
                <span key={passed} className={`mono ${styles.count} ${crossed ? styles.countOk : ""}`}>{passed}</span>
                <span> of {data.closed.of} passed</span>
              </span>
            </header>
            <p className={styles.panelNote}>{data.period.note}</p>

            <ol className={styles.slots}>
              {data.slots.map((x) => (
                <li key={x.n} className={`${styles.slot} ${stage >= x.n ? styles.slotOn : ""}`}>
                  <span className={styles.slotHead}><span>slot {x.n}</span><span className={styles.passTick}>{tick}{x.pass ? "pass" : "fail"}</span></span>
                  <span className={styles.slotBody}>
                    <span className={styles.slotLabel}>mainnet block</span>
                    <span className={`mono ${styles.block}`}>{x.block}</span>
                    <span className={styles.slotLabel}>spread <span className={`mono ${styles.slotVal}`}>{x.spread}</span></span>
                    <span className={styles.slotLabel}>depth <span className={`mono ${styles.slotVal}`}>{x.bid} / {x.ask} {x.unit}</span></span>
                    <span className={styles.bars} aria-hidden="true">
                      <span className={styles.bar}><span style={{ width: pct(x.bid) }} /></span>
                      <span className={styles.bar}><span style={{ width: pct(x.ask) }} /></span>
                    </span>
                  </span>
                </li>
              ))}
            </ol>

            <div className={`${styles.track} ${crossed ? styles.trackCrossed : ""}`} aria-hidden="true">
              {data.slots.map((x) => <span key={x.n} className={`${styles.seg} ${x.pass && stage >= x.n ? styles.segOn : ""}`} />)}
              <span className={styles.threshold} style={{ left: thPos }}><span>threshold {data.closed.threshold}</span></span>
            </div>

            <div className={`${styles.decision} ${on(DECIDE)}`}>
              <span className={styles.decisionText}>closed · {data.closed.passed} of {data.closed.of} passed · threshold {data.closed.threshold}{data.closed.parts.map((p) => ` · ${p}`).join("")}</span>
              <span className={`${styles.badge} ${styles.badgeOk}`}>{data.closed.outcome}</span>
            </div>

            <div className={`${styles.payment} ${on(PAY)}`}>
              <span className={styles.payLead}>{data.paid.lead} · <span className="mono">{data.paid.event}</span></span>
              <span className={styles.payTrack}>
                <span className={styles.payLine} aria-hidden="true" />
                <span className={`mono ${styles.payChip}`}>{data.paid.amount}</span>
              </span>
              <span className={`mono ${styles.payTo}`}>→ {data.paid.to}</span>
              <Hash value={data.paid.tx} />
            </div>
          </section>

          <section className={`${styles.panel} ${styles.strict} ${on(STRICT)}`} aria-label={`${data.strict.account}, ${data.strict.period}`}>
            <header className={styles.panelHead}>
              <span className={styles.panelTitle}><span className="mono">{data.strict.account}</span> · {data.strict.period}</span>
            </header>
            <ol className={styles.hollow} aria-hidden="true">
              {Array.from({ length: data.strict.of }, (_, k) => <li key={k} className={k < data.strict.passed ? styles.hollowOn : ""} />)}
            </ol>
            <div className={`${styles.decision} ${styles.on}`}>
              <span className={styles.decisionText}>{data.strict.passed} of {data.strict.of} passed · threshold {data.strict.threshold}</span>
              <span className={styles.badge}>{data.strict.outcome}</span>
            </div>
            <div className={`${styles.withheld} ${on(REFUSE)}`}>
              <span className={styles.who}>{data.withheld.lead}</span>
              <code className={`mono ${styles.code}`}>{data.withheld.code}</code>
              <Hash value={data.withheld.tx} />
            </div>
          </section>
        </div>

        {data.scope ? <p className={styles.scope}>scope · {data.scope}</p> : null}
      </div>
    </ReplayFrame>
  )
}

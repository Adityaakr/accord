import { Appear } from "../lib/motion"
import { SectionHeading, appear } from "../components/SectionHeading"
import { Ref } from "../components/Ref"
import { Mono } from "../components/Mono"
import { Button } from "../components/Button"
import { LINKS, isPlaceholder } from "../content/links"
import { useLive, asOfLabel } from "../lib/live"
import styles from "./Glassbook.module.css"

/* Glassbook (brief §4.10), anchor #glassbook, accent pink.
   Copy is the brief's, set verbatim. Numbers carry their §9 row:
   1% [21] · $5B [24] · 66M + $38M [25] · $300M [23] · disclosure [30] [31] · DOJ [26] [27].
   The observation slots come from useLive().slots (brief §5 <live:slots>), never hard-coded.
   The button's "recorded" label appears only when the record is not live (brief §2 rule 8, §7). */

const LINES = [
  (
      <>
        The project's mandate (maximum retainer, minimum spread, depth and uptime, required venues) and the market maker's (minimum retainer,
        venues covered, the KPI floor it will commit to) go into the room; only the terms come out.
      </>
  ),
  (
      <>
        An observer runs inside an enclave: it samples the venue's public order book, computes spread, depth within <Mono>1%</Mono> of mid and
        uptime against the terms, and attests the result. A period pays when <Mono>k</Mono> of <Mono>n</Mono> observation slots pass; otherwise it is
        withheld and a human decides.
      </>
  ),
  (
      <>
        The market maker's fee destination is a bound payee like any other, and <Mono>revoke</Mono> works the same way.
      </>
  ),
]

export function Glassbook() {
  const live = useLive()
  const slots = live?.slots ?? []
  const recordHref = LINKS.record
  const recordIsLink = !isPlaceholder(recordHref)
  const recorded = live?.source === "last-known"

  return (
    <section id="glassbook" className={`section ${styles.section}`}>
      <SectionHeading
        eyebrow="Glassbook"
        accent="pink"
        wide
        title="Did your market maker earn this payment?"
        lead={
          <>
            <p className={styles.subline}>
              Glassbook, the first deal type on Accord: a retainer that pays only when the order book says the market maker showed up.
            </p>
            <p>
              Token projects pay market makers to keep their books tight, and almost nobody can tell whether they did. Fewer than{" "}
              <Mono>1%</Mono>
              <Ref n={21} /> of protocols disclose any terms; the project negotiates without knowing the market rate while the market maker
              negotiates every week; the KPIs are self-reported; and when it goes wrong it goes wrong in public: more than <Mono>$5B</Mono> of
              market cap gone from one token in a day
              <Ref n={24} />, <Mono>66M</Mono> tokens sold for <Mono>$38M</Mono> before an exchange froze the proceeds
              <Ref n={25} />, more than <Mono>$300M</Mono> of alleged wash trades for one firm on one venue
              <Ref n={23} />.
            </p>
          </>
        }
      />

      <ul className={styles.cards} aria-label="The three lines of a Glassbook agreement">
        {LINES.map((body, i) => (
          <li key={i} className={styles.cardCell}>
            <Appear className={styles.card} effect={appear("0s")} delay={0.1 * (i + 1)}>
              <p className={`t-body-lg ${styles.cardBody}`}>{body}</p>
            </Appear>
          </li>
        ))}
      </ul>

      <Appear className={styles.statements} effect={appear("0.1s")}>
        <div className={styles.statement}>
          <p className={`t-h6 ${styles.label}`}>The limit, stated:</p>
          <p className="t-body-lg">
            Glassbook v0 measures the venue's book, not the market maker's own orders. Attribution needs the market maker's read-only key inside
            the enclave; that is v1. Retainer-only engagements in v0; loan-plus-option structures are v1.
          </p>
        </div>
        <div className={styles.statement}>
          <p className={`t-h6 ${styles.label}`}>Why it is first:</p>
          <p className="t-body-lg">
            the evidence is the strongest of any deal type we looked at (
            <a href="#references" className="ls-link-inline">rows 21 to 33</a>), the industry's answer so far is disclosure and dashboards without
            enforcement <Ref n={[30, 31]} />, and the DOJ now prosecutes the worst cases years later <Ref n={[26, 27]} />. Nobody has shipped the
            sensor inside the contract.
          </p>
        </div>
      </Appear>

      <Appear className={styles.foot} effect={appear("0.2s")}>
        <div className={styles.slots} aria-live="polite" aria-label="Glassbook observation slots for the current period">
          <div className={styles.slotsHead}>
            <p className={`t-h6 ${styles.label}`}>Observation slots</p>
            {live ? <p className={`t-body-sm ${styles.asOf}`}>{asOfLabel(live)}</p> : null}
          </div>
          {slots.length === 0 ? (
            <p className={`t-body-sm ${styles.empty}`}>No observation slots yet</p>
          ) : (
            <ul className={styles.slotList}>
              {slots.map((s) => (
                <li key={s.slot}>
                  <Mono className={styles.slotLine}>
                    slot {s.slot}: {s.result === "FAIL" ? <Mono tone="refusal">FAIL</Mono> : "PASS"} · spread p50 {s.spreadP50Bps} bps · depth min{" "}
                    {s.depthMin.toLocaleString("en-US")} · uptime {s.uptimePct}%
                  </Mono>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.cta}>
          {recordIsLink ? (
            <Button href={recordHref} variant="secondary">See a Glassbook agreement</Button>
          ) : (
            <span className={styles.ctaPlaceholder}>
              <span className="t-link">See a Glassbook agreement</span> <Mono>{recordHref}</Mono>
            </span>
          )}
          {recorded ? <Mono>recorded</Mono> : null}
        </div>
      </Appear>
    </section>
  )
}

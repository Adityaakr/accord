import { usePageMeta } from "../lib/meta"
import { Appear } from "../lib/motion"
import { appear } from "../components/SectionHeading"
import { PageHero } from "../components/PageHero"
import { TestnetFlowRecord } from "../components/TestnetRecord"
import { Mono } from "../components/Mono"
import { useLive, asOfLabel, txUrl, type LiveValues } from "../lib/live"
import { Arrow } from "../components/Arrow"
import { isPlaceholder } from "../content/links"
import styles from "./Record.module.css"

/* /record: the execution record (doc F1 "Inspect an agreement / Inspect the execution").
   Hero lead = A4 Activity cell; the two record panels are the A8 live module's (copied from sections/Proof.tsx so the
   page does not depend on that file); D4 "Loading", "Data unavailable" and "Last updated" wording. Nothing is called live. */

const LOADING = "Loading the agreement record."

/* The panels are taller than a phone viewport; the template's 0.5 threshold would never fire. */
const appearTall = (delay: `${number}s`) => ({ ...appear(delay), threshold: 0.1 })

const STATES = ["Sealed", "Attested", "Executing", "Settled"] as const

const utc = (iso: string, withDate: boolean) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return withDate
    ? d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC"
    : d.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" }) + " UTC"
}

/* Empty state: the literal "No entries yet" */
function Empty(_: { v: LiveValues }) {
  return <p className={`t-body-sm ${styles.empty}`}>No entries yet</p>
}

/* Left panel: the agreement page from the app on testnet */
function AgreementPanel({ v }: { v: LiveValues | null }) {
  const a = v?.agreement
  const payeeKnown = !!a && a.payee.domain !== ""
  return (
    <article className={styles.panel} aria-labelledby="record-page-agreement-title">
      <header className={styles.panelHead}>
        <h2 id="record-page-agreement-title" className={`t-h6 ${styles.panelTitle}`}>Agreement</h2>
        {a && !isPlaceholder(a.id) && a.id !== "" ? <Mono className={styles.panelId}>{a.id}</Mono> : null}
      </header>
      {v?.label ? <p className={`t-body-sm ${styles.panelHint}`}>{v.label}</p> : null}

      {/* Four-state strip; the current state in the template's white pill */}
      <ol className={styles.states} aria-label="Agreement state">
        {STATES.map((s) => {
          const current = a?.state === s
          return (
            <li key={s} aria-current={current ? "step" : undefined}>
              <Mono className={`${styles.state} ${current ? styles.stateCurrent : ""}`}>{s}</Mono>
            </li>
          )
        })}
      </ol>

      <div className={styles.panelRow}>
        <p className={`t-body-sm ${styles.rowLabel}`}>Approved terms</p>
        {!v ? <p className={`t-body-sm ${styles.empty}`}>{LOADING}</p> : a && a.terms.length > 0 ? (
          <ul className={styles.terms}>
            {a.terms.map((t) => (
              <li key={t.milestone} className={styles.term}>
                <Mono className={styles.cell}>milestone {t.milestone}</Mono>
                <Mono className={styles.cell}>{t.amount}</Mono>
                <Mono className={styles.cell}>due {t.due}</Mono>
              </li>
            ))}
          </ul>
        ) : <Empty v={v} />}
      </div>

      <div className={styles.panelRow}>
        <p className={`t-body-sm ${styles.rowLabel}`}>Authorised recipient</p>
        {!v ? <p className={`t-body-sm ${styles.empty}`}>{LOADING}</p> : payeeKnown ? (
          <div className={styles.lines}>
            <Mono className={styles.cell}>{a.payee.account ?? a.payee.domain} · v{a.payee.version}</Mono>
            {a.payee.account ? <Mono className={`${styles.cell} ${styles.wrapCell}`}>proven on {a.payee.domain}</Mono> : a.payee.proof ? <Mono className={`${styles.cell} ${styles.wrapCell}`}>{a.payee.proof}</Mono> : null}
          </div>
        ) : <Empty v={v} />}
      </div>

      <div className={styles.panelRow}>
        <p className={`t-body-sm ${styles.rowLabel}`}>Last transfer on NEAR</p>
        {!v ? <p className={`t-body-sm ${styles.empty}`}>{LOADING}</p> : a?.lastTransfer ? (
          <div className={styles.lines}>
            <Mono className={styles.cell}>{a.lastTransfer.amount} → {a.lastTransfer.to}</Mono>
            <Mono className={styles.cell}>{utc(a.lastTransfer.at, true)} · <a className={styles.txLink} href={txUrl(a.lastTransfer.tx)} target="_blank" rel="noreferrer">tx<Arrow dir="up-right" /></a></Mono>
          </div>
        ) : <Empty v={v} />}
      </div>
    </article>
  )
}

/* Right panel: the refusal log, newest first; a polite live region */
function RefusalPanel({ v }: { v: LiveValues | null }) {
  const refusals = v ? [...v.refusals].sort((x, y) => Date.parse(y.at) - Date.parse(x.at)) : []
  return (
    <article className={styles.panel} aria-labelledby="record-page-refusal-title">
      <header className={styles.panelHead}>
        <h2 id="record-page-refusal-title" className={`t-h6 ${styles.panelTitle}`}>Refusal log</h2>
        <p className={`t-body-sm ${styles.panelHint}`}>newest first</p>
      </header>
      <div className={styles.log} aria-live="polite" aria-atomic="false" aria-busy={!v}>
        {!v ? <p className={`t-body-sm ${styles.empty}`}>{LOADING}</p> : refusals.length === 0 ? <Empty v={v} /> : (
          <ol className={styles.logList}>
            {refusals.map((r, i) => (
              <li key={`${r.at}-${i}`} className={styles.logLine}>
                <time dateTime={r.at} className={`mono ${styles.logTime}`}>{utc(r.at, false)}</time>
                <span className={styles.sep} aria-hidden="true">·</span>
                <Mono tone="refusal" className={styles.logReason}>{r.reason}</Mono>
                {r.amount && r.to ? (
                  <>
                    <span className={styles.sep} aria-hidden="true">·</span>
                    <span className={`mono ${styles.logFrom}`}>{r.amount} to {r.to}</span>
                  </>
                ) : (
                  <>
                    <span className={styles.sep} aria-hidden="true">·</span>
                    <span className={`mono ${styles.logFrom}`}>{r.from}</span>
                  </>
                )}
                {r.tx ? <a className={styles.txLink} href={txUrl(r.tx)} target="_blank" rel="noreferrer">tx<Arrow dir="up-right" /></a> : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </article>
  )
}

export function Record() {
  usePageMeta("Accord: Public record", "Agreement a6.accord-v2.testnet on NEAR testnet, each step linked to its transaction, from the sealed limits to a refused redirect.")
  const live = useLive()
  return (
    <div className={styles.page}>
      <PageHero pill="Execution record" title="Inspect an agreement." lead="Follow approvals, recipient changes, exceptions and refused requests." />

      {/* The record: D4 "Data unavailable" once (when the snapshot is the last retrieved one), the two panels, the timestamp */}
      <section id="record" className={`section ${styles.section}`}>
        <TestnetFlowRecord />
        <div className={styles.record}>
          {!live ? <p className={`t-body-sm ${styles.weak}`} role="status">{LOADING}</p> : null}
          <Appear className={styles.panels} effect={appearTall("0.1s")}>
            <AgreementPanel v={live} />
            <RefusalPanel v={live} />
          </Appear>
          {live && !live.label ? <p className={`t-body-sm ${styles.weak}`}>Last updated: {asOfLabel(live)}</p> : null}
        </div>
      </section>
    </div>
  )
}

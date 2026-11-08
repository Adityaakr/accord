import { Link } from "react-router-dom"
import { Arrow } from "../components/Arrow"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { SectionHeading } from "../components/SectionHeading"
import { LINKS } from "../content/links"
import { CHECKS, checkSummary, FLOW, INFRA, PHASES, TESTNET } from "../content/testnet"
import styles from "./LiveTestnet.module.css"

/* Home · Live on NEAR testnet (#testnet), 8 Nov 2026. The full flow of one agreement, each step linked to its
   transaction on the explorer, in the Proof section's language (Elevation Strong panels, mono values, teal for a pass,
   refusal red only for the refusal and the revocation), as one vertical timeline in four phases. Each row: step,
   a mono detail only where it carries a number or a code, and the transaction. Below it, one slim line with the
   verify result and the infrastructure links. */

const rise = (delay: `${number}s`): AppearEffect => ({
  threshold: 0.15,
  replay: false,
  enter: { opacity: 0, x: 0, y: 16, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "0.8s", delay } },
})

export function LiveTestnet() {
  return (
    <section id="testnet" className={`section ${styles.section}`}>
      <SectionHeading
        eyebrow="Live on NEAR testnet"
        accent="teal"
        wide
        centered
        title="One agreement, every step on chain."
        lead={<p>Twelve steps of a real agreement, each one a transaction you can open.</p>}
      />

      <Appear as="div" className={styles.timeline} effect={rise("0s")}>
        <div className={styles.head}>
          <span className={styles.headLabel}>Agreement</span>
          <a href={TESTNET.agreementUrl} target="_blank" rel="noreferrer" className={`mono ${styles.headLink}`}>{TESTNET.agreement}<Arrow dir="up-right" /></a>
        </div>
        {PHASES.map((ph) => (
          <div key={ph.label} className={styles.phase}>
            <p className={styles.phaseLabel}>{ph.label}</p>
            <ol className={styles.steps}>
              {ph.steps.map((n) => FLOW.find((s) => s.n === n)!).map((s) => (
                <li key={s.n} className={styles.row}>
                  <span className={`mono ${styles.num}`}>{s.n}</span>
                  <span className={`${styles.name} ${s.refused ? styles.refused : ""}`}>{s.title}</span>
                  <span className={`mono ${styles.detail} ${s.refused ? styles.refused : ""}`}>{s.mono ?? ""}</span>
                  <a href={s.href} target="_blank" rel="noreferrer" className={`mono ${styles.tx}`} aria-label={`${s.title}: open the transaction`}>tx<Arrow dir="up-right" /></a>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </Appear>

      <Appear as="div" className={styles.foot} effect={rise("0.05s")}>
        <p className={styles.verify}>
          <span className="mono">make verify</span>
          <span className={styles.sep} aria-hidden="true">·</span>
          <span className={styles.verifyResult}>{checkSummary(CHECKS)}</span>
          <span className={styles.sep} aria-hidden="true">·</span>
          <Link to="/verify" className={styles.footLink}>See the checks<Arrow /></Link>
        </p>
        <ul className={styles.infra} aria-label="Behind it">
          {INFRA.map((i) => <li key={i.label}><a href={i.href} target="_blank" rel="noreferrer">{i.label}<Arrow dir="up-right" /></a></li>)}
        </ul>
      </Appear>

      <Link to={LINKS.join} className={`t-body-sm ls-link ${styles.cta}`}>How to start<Arrow /></Link>
    </section>
  )
}

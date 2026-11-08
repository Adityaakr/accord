import { Link } from "react-router-dom"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { SectionHeading } from "../components/SectionHeading"
import { LINKS } from "../content/links"
import { FLOW, INFRA, TESTNET } from "../content/testnet"
import styles from "./LiveTestnet.module.css"

/* Home · Live on NEAR testnet (#testnet), 8 Nov 2026. The full flow of one agreement, each step linked to its
   transaction on the explorer, in the Proof section's language (Elevation Strong panels, mono values, teal for a pass,
   refusal red only for the refusal and the revocation). Below it, the infrastructure links and the verify result.
   The settlement token is a test USDC on testnet, said plainly. */

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
        title="One agreement, every step on chain."
        lead={<p>Agreement <a href={TESTNET.agreementUrl} target="_blank" rel="noreferrer" className="mono">{TESTNET.agreement}</a> ran the full flow on testnet: sealed limits, a negotiation by the real model inside OutLayer's attested enclave, approvals, funding, a payment, a refused redirect and a revocation. Settlement is test USDC on NEAR testnet.</p>}
      />

      <Appear as="div" className={styles.panel} effect={rise("0s")}>
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>Agreement record</span>
          <a href={TESTNET.agreementUrl} target="_blank" rel="noreferrer" className={`mono ${styles.panelLink}`}>{TESTNET.agreement} ↗</a>
        </div>
        <ol className={styles.flow}>
          {FLOW.map((s) => (
            <li key={s.n}>
              <a href={s.href} target="_blank" rel="noreferrer" className={styles.step}>
                <span className={`mono ${styles.num}`}>{s.n}</span>
                <span className={styles.stepText}>
                  <span className={styles.stepTitle}>{s.title}</span>
                  <span className={`${styles.stepDetail} ${s.refused ? styles.refused : ""}`}>{s.detail}</span>
                </span>
                <span className={`mono ${styles.tx}`}>tx ↗</span>
              </a>
            </li>
          ))}
        </ol>
      </Appear>

      <div className={styles.foot}>
        <Appear as="div" className={styles.card} effect={rise("0.05s")}>
          <p className={styles.cardTitle}>Checked from public data</p>
          <p className={styles.cardText}>
            <span className="mono">make verify DEAL={TESTNET.agreement}</span> passes {TESTNET.verify.ok.length} checks: {TESTNET.verify.ok.join(", ")}. Not checked yet: {TESTNET.verify.notChecked.join("; ")}.
          </p>
          <a href={LINKS.appVerify(TESTNET.agreement)} className={`t-body-sm ls-link ${styles.cardLink}`}>{LINKS.app ? "Verify it in the app →" : "How to verify it →"}</a>
        </Appear>
        <Appear as="div" className={styles.card} effect={rise("0.1s")}>
          <p className={styles.cardTitle}>Behind it</p>
          <ul className={styles.infra}>
            <li><a href={TESTNET.factoryUrl} target="_blank" rel="noreferrer">Factory <span className="mono">{TESTNET.factory}</span> ↗</a></li>
            {INFRA.map((i) => <li key={i.label}><a href={i.href} target="_blank" rel="noreferrer">{i.label} ↗</a></li>)}
          </ul>
          <p className={styles.cardNote}>Mainnet follows an audit.</p>
        </Appear>
      </div>

      <div className={styles.ctaRow}>
        {LINKS.app ? <a href={LINKS.openDealRoom} className={`t-body-sm ls-link ${styles.cta}`}>Open the app and create a deal room →</a> : <Link to={LINKS.join} className={`t-body-sm ls-link ${styles.cta}`}>How to start →</Link>}
        <Link to={LINKS.docs} className={`t-body-sm ls-link ${styles.ctaWeak}`}>Run it yourself from the docs</Link>
      </div>
    </section>
  )
}

import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { SectionHeading } from "../components/SectionHeading"
import styles from "./CoreFeatures.module.css"

/* Home · Core features (#features), after How it works (8 Nov 2026). The seven controls between an agent and the money,
   as a bento grid in the template's system: Elevation Strong tiles at radius 4 with the hairline, a small product
   detail in JetBrains Mono at the top of each tile (teal for a pass, refusal red only for a refusal or a revocation),
   then the title and two sentences. Every line is something the demonstration does today; values match the deal-room
   band and /verify. Grid: 2+1 / 1+1+1 / 1+2 on desktop, two columns on tablet, one on phone. */

const rise = (delay: `${number}s`): AppearEffect => ({
  threshold: 0.25,
  replay: false,
  enter: { opacity: 0, x: 0, y: 24, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1s", delay } },
})

const Ok = () => <span className={styles.ok} aria-hidden="true">✓</span>

/* ---------- the product details, one per feature ---------- */
const Sealed = () => (
  <div className={styles.sealed}>
    <div className={styles.flow}>
      <span className={styles.chip}><i className={styles.lock} />Buyer · sealed</span>
      <span className={styles.arrow} />
      <span className={`${styles.chip} ${styles.chipOn}`}>Sealed Table · attested</span>
      <span className={`${styles.arrow} ${styles.arrowIn}`} />
      <span className={styles.chip}><i className={styles.lock} />Seller · sealed</span>
    </div>
    <span className={styles.result}><Ok />Terms 18,500 USDC a period · both companies approve</span>
  </div>
)
const OneKey = () => (
  <div className={styles.term}>
    <span><b>keys</b> 1 · FunctionCall</span>
    <span><b>methods</b> [act]</span>
    <span><b>full access</b> none <Ok /></span>
  </div>
)
const Controls = () => (
  <div className={styles.rows}>
    <span className={styles.row}><span>→ halcyon-mm</span><span className={styles.pass}>paid</span></span>
    <span className={styles.row}><span>→ new account</span><span className={styles.err}>ERR_PAYEE_MISMATCH</span></span>
    <span className={styles.row}><span>25,000 USDC</span><span className={styles.err}>ERR_AMOUNT_MISMATCH</span></span>
  </div>
)
const Payee = () => (
  <div className={styles.steps}>
    {["Domain proven", "Authority approves", "Buyer accepts"].map((s) => <span key={s} className={styles.step}><Ok />{s}</span>)}
    <span className={styles.note}>Changes wait 24 h</span>
  </div>
)
const Evidence = () => (
  <div className={styles.slots}>
    <span className={styles.slotRow} aria-hidden="true">
      {[1, 1, 0, 1, 1, 0].map((p, i) => <i key={i} className={p ? styles.slotPass : styles.slotMiss} />)}
    </span>
    <span className={styles.note}>4 of 6 observations passed · <span className={styles.pass}>eligible</span></span>
  </div>
)
const Revoke = () => (
  <div className={styles.term}>
    <span className={styles.cmd}>revoke_agent()</span>
    <span><b>keys</b> 0</span>
    <span className={styles.err}>AccessKeyDoesNotExist</span>
  </div>
)
const Verify = () => (
  <div className={styles.term}>
    <span className={styles.cmd}>$ make verify DEAL=&lt;agreement&gt;</span>
    {["01 Contract code", "02 Agreement keys", "03 Sealed Table release", "04 Sealed outcome", "05 Model attestation"].map((l) => (
      <span key={l} className={styles.line}><span>{l}</span><span className={styles.pass}>ok</span></span>
    ))}
  </div>
)

type Feature = { kicker: string; title: string; text: string; detail: ReactNode; wide?: boolean }
const FEATURES: Feature[] = [
  {
    kicker: "Sealed Table", title: "Confidential negotiation", wide: true, detail: <Sealed />,
    text: "Each company seals its limits in the browser, and the agents negotiate inside an attested enclave. Only the agreed terms and an attestation come out, and both companies approve before anything takes effect.",
  },
  {
    kicker: "Agent permissions", title: "One key, one method", detail: <OneKey />,
    text: "The buyer's agent holds a key that can call one method, act, on one contract. It cannot deploy code, add keys or move funds any other way.",
  },
  {
    kicker: "Agreement controls", title: "Every payment checked", detail: <Controls />,
    text: "Each payment must match the approved milestone, amount and recipient. Anything else is refused, and the reason is recorded.",
  },
  {
    kicker: "Payee", title: "A recipient that cannot be redirected", detail: <Payee />,
    text: "The vendor proves its domain, its settlement authority approves the account and the buyer accepts it. A message cannot change it.",
  },
  {
    kicker: "Evidence checks", title: "Evidence before release", detail: <Evidence />,
    text: "A payment becomes eligible only when the agreed evidence is recorded. Otherwise it is withheld for both sides to review.",
  },
  {
    kicker: "Revocation", title: "Stop the agent in one transaction", detail: <Revoke />,
    text: "The buyer calls revoke_agent and the agent's key is deleted. Payments already made stay with the authorised recipient.",
  },
  {
    kicker: "Verify", title: "Checkable from public data", wide: true, detail: <Verify />,
    text: "One command checks a live agreement with no keys: the contract code, the agent's key, the Sealed Table release, the attestation, the recipient and the record.",
  },
]

export function CoreFeatures() {
  return (
    <section id="features" className={`section ${styles.section}`}>
      <SectionHeading
        eyebrow="Core features"
        accent="teal"
        wide
        title="Seven controls between an agent and the money."
        lead={<p>Each one is enforced by the NEAR contract or the attested enclave, and each can be checked from public data.</p>}
      />

      <div className={styles.grid}>
        {FEATURES.map((f, i) => (
          <Appear key={f.title} as="article" className={`${styles.card} ${f.wide ? styles.wide : ""}`} effect={rise(`${(i % 3) * 0.08}s` as `${number}s`)}>
            <div className={styles.detail} aria-hidden="true">{f.detail}</div>
            <div className={styles.copy}>
              <p className={`mono ${styles.kicker}`}>{f.kicker}</p>
              <h3 className={styles.title}>{f.title}</h3>
              <p className={styles.text}>{f.text}</p>
            </div>
          </Appear>
        ))}
      </div>

      <Link to="/security" className={`t-body-sm ls-link ${styles.more}`}>Each claim and its limit, on Security →</Link>
    </section>
  )
}

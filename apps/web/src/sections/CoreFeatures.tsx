import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { SectionHeading } from "../components/SectionHeading"
import { PixelIcon, type PixelName } from "../components/PixelIcon"
import { SceneEvidence, SceneKey, SceneNegotiation, ScenePayee, ScenePayment, SceneRevoke, SceneVerify } from "./CoreScenes"
import styles from "./CoreFeatures.module.css"

/* Home · Core features (#features), after How it works (8 Nov 2026). The seven controls between an agent and the money,
   as a bento grid in the template's system: Elevation Strong tiles at radius 4 with the hairline, a small product
   detail in JetBrains Mono at the top of each tile (teal for a pass, refusal red only for a refusal or a revocation),
   then the title and two sentences. Since 8 Nov 2026 each card's detail is a live scene (CoreScenes) on the teal stage. Since 8 Nov 2026 each detail floats on the use-case cards' teal stage (weave,
   glow, fade) with a pixel icon tile beside the label, so the two card sections read as one family. Every line is something the demonstration does today; values match the deal-room
   band and /verify. Grid: 2+1 / 1+1+1 / 1+2 on desktop, two columns on tablet, one on phone. */

const rise = (delay: `${number}s`): AppearEffect => ({
  threshold: 0.25,
  replay: false,
  enter: { opacity: 0, x: 0, y: 24, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1s", delay } },
})

type Feature = { icon: PixelName; kicker: string; title: string; text: string; detail: ReactNode; wide?: boolean }
const FEATURES: Feature[] = [
  {
    icon: "agents", kicker: "Sealed Table", title: "Confidential negotiation", wide: true, detail: <SceneNegotiation />,
    text: "Each company seals its limits in the browser, and the agents negotiate inside an attested enclave. Only the agreed terms and an attestation come out, and both companies approve before anything takes effect.",
  },
  {
    icon: "key", kicker: "Agent permissions", title: "One key, one method", detail: <SceneKey />,
    text: "The buyer's agent holds a key that can call one method, act, on one contract. It cannot deploy code, add keys or move funds any other way.",
  },
  {
    icon: "shield", kicker: "Agreement controls", title: "Every payment checked", detail: <ScenePayment />,
    text: "Each payment must match the approved milestone, amount and recipient. Anything else is refused, and the reason is recorded.",
  },
  {
    icon: "bank", kicker: "Payee", title: "A recipient that cannot be redirected", detail: <ScenePayee />,
    text: "The vendor proves its domain, its settlement authority approves the account and the buyer accepts it. A message cannot change it.",
  },
  {
    icon: "chart", kicker: "Evidence checks", title: "Evidence before release", detail: <SceneEvidence />,
    text: "A payment becomes eligible only when the agreed evidence is recorded. Otherwise it is withheld for both sides to review.",
  },
  {
    icon: "power", kicker: "Revocation", title: "Stop the agent in one transaction", detail: <SceneRevoke />,
    text: "The buyer calls revoke_agent and the agent's key is deleted. Payments already made stay with the authorised recipient.",
  },
  {
    icon: "terminal", kicker: "Verify", title: "Checkable from public data", wide: true, detail: <SceneVerify />,
    text: "One command checks an agreement from public data, with no keys: the contract code, the agent's key, the recipient proof and the record. The enclave release check follows the testnet release.",
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
            {/* the stage: the use-case cards' teal weave and glow, fading into the card, with the product detail floating on it */}
            <div className={styles.stage} aria-hidden="true">{f.detail}</div>
            <div className={styles.copy}>
              <p className={styles.label}>
                <span className={styles.tile}><PixelIcon name={f.icon} size={18} /></span>
                <span className={`mono ${styles.kicker}`}>{f.kicker}</span>
              </p>
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

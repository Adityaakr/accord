import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { SectionHeading } from "../components/SectionHeading"
import { Mono } from "../components/Mono"
import styles from "./HowSteps.module.css"

/* How it works (#how): docs/website/ACCORD_WEBSITE_FINAL_COPY.md Part A "How it works", set verbatim (REFILL-V3 slot map).
   Template pieces only: the section rhythm (gap 64 / padding 72px 0, Tablet 48 / 72px 24px, Phone 32 / 72px 16px),
   the SectionHeading (pill + H2, accent teal, no lead), the hero's Action-card row (4 → 2 → 1 columns,
   gap 40 / 32 / 32; each card = H6 + Body Small, gap 8) sitting on the stepper hairline with the
   template's 14×8 white pill above each card. Part A has no buttons for this section, so none are rendered.
   Spec §1.7: the stepper highlights the hovered or keyboard-focused step (pill and title go full White); "03 · Executing"
   is pre-highlighted at rest. Steps are focusable (tabIndex 0) with a visible focus ring; geometry is unchanged. */

/* Action-card appear (hero instances): onInView, threshold 0.5, replay false,
   enter {opacity 0, y 24}, tween 1.4s ease [0.12,0.23,0.5,1], stagger 0.1s per card */
const CARD_APPEAR: AppearEffect = {
  threshold: 0.5,
  replay: false,
  enter: { opacity: 0, x: 0, y: 24, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1.4s", delay: "0s" } },
}

/* ---------- copy (Part A "How it works", verbatim) ---------- */
const STEPS: { n: string; title: string; body: string; active?: boolean }[] = [
  {
    n: "01",
    title: "Sealed",
    body: "Each company sets its limits in the browser and seals them. Only the sealed mandate and its commitment hash go on NEAR; the other side never sees the numbers.",
  },
  {
    n: "02",
    title: "Attested",
    body: "The Sealed Table negotiates inside an attested enclave; code checks the result against both mandates' limits; the terms are recorded with an attestation anyone can verify.",
  },
  {
    n: "03",
    title: "Executing",
    active: true,
    body: "Both companies approve, and the buyer funds the agreement's USDC escrow on NEAR. The agent holds one key for one method; a payment must match the approved milestone, amount and recipient, or it is refused and recorded.",
  },
  {
    n: "04",
    title: "Settled",
    body: "Payments complete under the agreed conditions, people decide the exceptions, and the record remains.",
  },
]

export function HowSteps() {
  return (
    <section id="how" className={`section ${styles.section}`}>
      <SectionHeading eyebrow="How it works" title="How a deal room works." accent="teal" />

      {/* The four steps: Action cards on the stepper hairline, a white pill marking each step */}
      <ol className={styles.steps} aria-label="How a deal room works, in four steps">
        {STEPS.map((s, i) => (
          <Appear
            key={s.n}
            as="li"
            className={`${styles.step} ${s.active ? styles.active : ""}`}
            effect={CARD_APPEAR}
            delay={i * 0.1}
            tabIndex={0}
            aria-current={s.active ? "step" : undefined}
          >
            <span className={styles.node} aria-hidden="true" />
            {/* Action card (BE0Kc14HI) geometry: vertical, gap 8; H6 title row; Body Small description */}
            <div className={styles.card}>
              <h6 className={`t-h6 ${styles.heading}`}>
                <Mono className={styles.num}>{s.n}</Mono> · {s.title}
              </h6>
              <p className={`t-body-sm ${styles.body}`}>{s.body}</p>
            </div>
          </Appear>
        ))}
      </ol>
    </section>
  )
}

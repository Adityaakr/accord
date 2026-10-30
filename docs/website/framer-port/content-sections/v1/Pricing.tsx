import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { PricingTable } from "../components/PricingTable"
import styles from "./Pricing.module.css"

/* Framer "Pricing" section: Desktop gIIppVdjT (elementId "pricing"), Tablet uX81zskxrgIIppVdjT, Phone Ue6QXWSr_gIIppVdjT
   section: vertical stack, width 1fr, maxWidth 1080, gap 48, padding 72px 0, justify center, scroll-margin-top 40
     (Tablet: padding 72px 24px · Phone: gap 32, padding 72px 16px)
     Heading m4KE_z7I6: vertical, gap 24, maxWidth 480, width 1fr
       Tag vKxyYCg08 (appear y32 1s delay 0): Indicator vV85IZL83 14×8 Pink + Text rUpyNSvjQ (Body Small) "Transparent Pricing"
   Refill (brief FAQ 11 "What does it cost?"): tag = the FAQ question, title = its first sentence, description = the rest verbatim.
   No sourced numbers in this section, so no <Ref>.
       Text vV_SWJF0x (appear y32 1s delay 0.2): Title rik_zR3q2 (H2) + Description cdpKw3Qzd (Body Large)
     nrzwPVB0z: instance of Pricing t25qGiMhP, width 1fr, appear y32 1s delay 0: starts in Monthly (no $control__variant override on any breakpoint) */

const appear = (delay: `${number}s`): AppearEffect => ({
  threshold: 0.5,
  replay: false,
  enter: { opacity: 0, x: 0, y: 32, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1s", delay } },
})

export function Pricing() {
  return (
    <section id="pricing" className={`section ${styles.section}`}>
      {/* Heading m4KE_z7I6 */}
      <div className={styles.heading}>
        <Appear className={styles.tag} effect={appear("0s")}>
          <span className={styles.tagIndicator} aria-hidden="true" />
          <p className={`t-body-sm ${styles.tagText}`}>What does it cost?</p>
        </Appear>
        <Appear className={styles.text} effect={appear("0.2s")}>
          <h2 className={`t-h2 ${styles.title}`}>Testnet is free.</h2>
          <p className={`t-body-lg ${styles.description}`}>
            Planned pricing on mainnet: a flat fee per agreement, paid by the buyer when the terms are approved, and a fee per payee binding, paid by the
            vendor. No percentage of payment amounts, so the room has no stake in the size of the deal.
          </p>
        </Appear>
      </div>

      {/* nrzwPVB0z: Pricing component instance. Threshold lowered from the template's 0.5 for this slot only:
          with the brief's full §4.10 lines the stacked phone table is ~1800px tall, so half of it can never be in a
          844px viewport and the template threshold would leave it at opacity 0 forever. Same y32 / 1s / delay 0. */}
      <Appear className={styles.table} effect={{ ...appear("0s"), threshold: 0.2 }}>
        <PricingTable />
      </Appear>
    </section>
  )
}

import { PageHero } from "../components/PageHero"
import { KitFigure } from "../components/KitFigure"
import { InboxModule } from "../sections/Proof"
import { usePageMeta } from "../lib/meta"
import attackSvg from "../assets/diagrams/attack.svg?raw"
import styles from "./Verify.module.css"

/* /try (spec v6.6 §4): the open inbox on its own page, with attack.svg above the form and, under the form, the GOAL.md
   sentence ("A successful attempt can only ever produce a payment to the authorised recipient at the approved amount."). */
const LEAD = "The demonstration agent's inbox is public. Send it new bank details, an urgent invoice or an instruction from the chief executive; the contract refuses anything outside the approved terms and the authorised recipient."

export function Try() {
  usePageMeta("Accord: Try to move the money", "Send the Accord demonstration agent new bank details or an urgent invoice, and watch the NEAR contract refuse anything outside the approved terms.")
  return (
    <div className={styles.page}>
      <PageHero pill="Try" title="Try to move the money." lead={LEAD} />
      <section id="try" className={`section ${styles.main}`}>
        <KitFigure svg={attackSvg} minWidth={720} />
        <InboxModule goal level={2} />
      </section>
    </div>
  )
}

import { usePageMeta } from "../lib/meta"
import type { ReactNode } from "react"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { Button } from "../components/Button"
import { PageHero } from "../components/PageHero"
import { LINKS } from "../content/links"
import { ProductShot, type ShotVariant } from "../components/ProductShot"
import styles from "./SealedTable.module.css"
import { NearAiLogo } from "../components/NearAiLogo"

/* ------------------------------------------------------------------
   Sealed Table page (/product/sealed-table). Copy: doc B1 (docs/website/ACCORD_WEBSITE_CONTENT.md), set verbatim.
   Shell = the template's page hero (PageHero: pill + H1 word-reveal + lead + buttons, looping Dots);
   the doc's second paragraph sits under the lead as a second Body Large line.
   Then one content section (#negotiation) in About geometry: four alternating image rows (showcase images 1–4)
   and the doc's closing button in the Hero `.actions` row style.
------------------------------------------------------------------- */

/* Section appear: y 32 → 0, tween 1s ease [0.12,0.23,0.5,1] */
const appear = (delay: `${number}s`): AppearEffect => ({
  threshold: 0.5,
  replay: false,
  enter: { opacity: 0, x: 0, y: 32, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1s", delay } },
})

/* About row children: slide from x ±100 → 0, spring stiffness 240 / damping 80 / mass 1 */
const slide = (x: -100 | 100): AppearEffect => ({
  threshold: 0.5,
  replay: false,
  enter: { opacity: 0, x, y: 0, scale: 1, rotate: 0, transition: { type: "spring", stiffness: 240, damping: 80, mass: 1, delay: "0s" } },
})

type RowProps = { id: string; shot: ShotVariant; imageSide: "left" | "right"; title: ReactNode; paragraphs: ReactNode[] }

/* About "Section" row: Image (1fr, aspect 1.3) + Content (1fr); image slides in from its own side.
   Rows with the image on the right put the image first on Phone (Ue6QXWSr_J3FA8OTKG). */
function Row({ id, shot, imageSide, title, paragraphs }: RowProps) {
  const img = <Appear effect={slide(imageSide === "left" ? -100 : 100)} className={styles.image}><ProductShot variant={shot} /></Appear>
  const content = (
    <Appear effect={slide(imageSide === "left" ? 100 : -100)} className={styles.content}>
      <div className={styles.rowText}>
        <h2 className={`t-h3 ${styles.rowTitle}`}>{title}</h2>
        {paragraphs.map((p, j) => (
          <p key={j} className={`t-body-lg ${styles.rowBody}`}>{p}</p>
        ))}
      </div>
    </Appear>
  )
  return (
    <div id={id} className={`${styles.row} ${imageSide === "right" ? styles.rowPhoneImageFirst : ""}`}>
      {imageSide === "left" ? img : content}
      {imageSide === "left" ? content : img}
    </div>
  )
}

export function SealedTable() {
  usePageMeta("Accord: Sealed Table", "Two companies' agents negotiate inside an attested enclave. Each side's limits stay sealed; only the agreed terms and an attestation come out.")
  return (
    <div className={styles.page}>
      <PageHero
        pill="Inside Accord · Sealed Table"
        title="Negotiate with confidential mandates."
        lead={[
          "Give your agent the information it needs to negotiate while keeping the underlying mandate out of the counterparty's view.",
          "Sealed Table brings both mandates into an approved confidential execution process. Agents propose terms. Deterministic checks evaluate the supported hard limits. Both parties approve the agreement before it becomes payment policy.",
        ]}
        actions={[
          { label: LINKS.app ? "Open a deal room" : "See it on testnet", href: LINKS.app ? LINKS.newDealRoom : LINKS.testnet, variant: "primary" },
          { label: "Inspect a negotiation", href: LINKS.record, variant: "secondary" },
        ]}
      />

      {/* Where the negotiators run: NEAR AI Cloud's private inference, shown with NEAR AI's logo */}
      <section className={`section ${styles.runsOn}`} aria-label="Where the negotiators run">
        <p className={`t-body-lg ${styles.runsOnText}`}>
          Inside the Sealed Table's attested enclave, the two negotiators run on <NearAiLogo className={styles.runsOnLogo} /> Cloud's private inference.
        </p>
      </section>

      {/* B1 sub-sections: four alternating rows (About geometry) + closing button */}
      <section id="negotiation" className={`section ${styles.block}`}>
        <Row
          id="mandate"
          shot="mandate"
          imageSide="left"
          title="Your mandate guides the negotiation."
          paragraphs={[<>Define your budget, requirements and acceptable trade-offs. Review the proposed outcome before committing to it.</>]}
        />
        <Row
          id="evidence"
          shot="attestation"
          imageSide="right"
          title="The output carries evidence."
          paragraphs={[
            <>
              Inspect the execution identifiers, input commitments and validation result associated with the proposed agreement. The technical record should identify the
              application and configuration both parties accepted.
            </>,
          ]}
        />
        <Row
          id="approval"
          shot="terms"
          imageSide="left"
          title="Approval remains a commercial decision."
          paragraphs={[
            <>
              An attested run is evidence about execution, not a guarantee of a good bargain. You can decline terms that satisfy your hard limits but do not meet your commercial
              expectations.
            </>,
          ]}
        />
        <Row
          id="boundary"
          shot="visibility"
          imageSide="right"
          title="Privacy has a boundary."
          paragraphs={[
            <>
              The other party receives the approved output, not direct access to your raw mandate. Offers and accepted terms can still reveal information about your preferences.
              Confidential computation does not eliminate inference from the result.
            </>,
          ]}
        />

        {/* Doc B1 closing button (Hero `.actions` row style, section appear) */}
        <Appear className={styles.actions} effect={appear("0s")}>
          <Button variant="secondary" href={LINKS.security}>Read the privacy model</Button>
        </Appear>
      </section>
    </div>
  )
}

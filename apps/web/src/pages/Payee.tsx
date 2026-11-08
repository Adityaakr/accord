import { usePageMeta } from "../lib/meta"
import type { ReactNode } from "react"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { Button } from "../components/Button"
import { PageHero } from "../components/PageHero"
import { LINKS } from "../content/links"
import { ProductShot, type ShotVariant } from "../components/ProductShot"
import styles from "./Payee.module.css"

/* ------------------------------------------------------------------
   Payee page (/product/payee, also /payee). Copy: doc B2 (docs/website/ACCORD_WEBSITE_CONTENT.md), set verbatim.
   Shell = the template's page hero (PageHero: pill + H1 word-reveal + lead + buttons, looping Dots).
   Then one content section (#recipient) in About geometry: four alternating image rows
   (content images 4/5/6 + showcase image 5) and the doc's closing button in the Hero `.actions` row style.
   Doc editorial note honoured: no reuse promise, no editorial delay duration, no "live/verified/confirmed".
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

export function Payee() {
  usePageMeta("Accord: Payee", "Payee pays only a recipient the vendor proved through its domain, its settlement authority approved and the buyer accepted. A message cannot change it.")
  return (
    <div className={styles.page}>
      <PageHero
        pill="Inside Accord · Payee"
        title="Make the recipient part of the agreement."
        lead="A payment needs an approved destination as well as an approved amount. Payee connects the recipient's domain proof, settlement authority and payment address to the deal."
        actions={[
          { label: "Set up your recipient profile", href: LINKS.recipientProfile, variant: "primary" },
          { label: "Inspect a recipient record", href: LINKS.record, variant: "secondary" },
        ]}
      />

      {/* B2 sub-sections: four alternating rows (About geometry) + closing button */}
      <section id="recipient" className={`section ${styles.block}`}>
        <Row
          id="destination"
          shot="payeeProof"
          imageSide="left"
          title="Establish the destination."
          paragraphs={[
            <>The vendor proposes a destination and demonstrates control of its domain. Its settlement authority approves the destination. The buyer accepts the binding for the agreement.</>,
          ]}
        />
        <Row
          id="change"
          shot="payeeChange"
          imageSide="right"
          title="Treat a change as a new decision."
          paragraphs={[<>A new address follows the configured approval and delay process. An instruction in an email is not enough to update the bound destination.</>]}
        />
        <Row
          id="history"
          shot="payeeHistory"
          imageSide="left"
          title="Keep the history visible."
          paragraphs={[<>Inspect the current recipient version, the approvals behind it and any pending change before authorizing a payment.</>]}
        />
        <Row
          id="identity"
          shot="identity"
          imageSide="right"
          title="Control is not corporate identity."
          paragraphs={[
            <>
              Domain proof establishes control of a domain. Destination approval establishes authorization within the configured process. Neither alone proves that a business
              exists or that its commercial claims are genuine.
            </>,
          ]}
        />

        {/* Doc B2 closing button (Hero `.actions` row style, section appear) */}
        <Appear className={styles.actions} effect={appear("0s")}>
          <Button variant="secondary" href={LINKS.security}>Review recipient controls</Button>
        </Appear>
      </section>
    </div>
  )
}

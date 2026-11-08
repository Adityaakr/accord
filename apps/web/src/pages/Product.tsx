import { usePageMeta } from "../lib/meta"
import { Arrow } from "../components/Arrow"
import type { ReactNode } from "react"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { Button } from "../components/Button"
import { ContentCard } from "../components/ContentCard"
import { PageHero } from "../components/PageHero"
import { LINKS } from "../content/links"
import { ProductShot, type ShotVariant } from "../components/ProductShot"
import styles from "./Product.module.css"

/* ------------------------------------------------------------------
   Product page (/product). Copy: doc A3 "Product premise" + A7 "Sealed Table and Payee"
   (copy brief ACCORD_WEBSITE_CONTENT.md), set verbatim.
   Shell = the template's page hero (PageHero: pill + H1 word-reveal + lead + buttons, looping Dots),
   then two content sections in template geometry:
     #premise      three Content Card instances (Features FfCn55RGg row)
     #capabilities Heading + two alternating image rows (About YoIZRFTN2 / J3FA8OTKG)
------------------------------------------------------------------- */

/* Section appear (Features/About heading + cards): y 32 → 0, tween 1s ease [0.12,0.23,0.5,1] */
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

type RowProps = {
  id: string
  shot: ShotVariant
  imageSide: "left" | "right"
  title: ReactNode
  subline?: ReactNode
  paragraphs: ReactNode[]
  action?: { label: string; href: string }
}

/* About "Section" row: Image (1fr, aspect 1.3) + Content (1fr); image slides in from its own side.
   Rows with the image on the right put the image first on Phone (Ue6QXWSr_J3FA8OTKG). */
function Row({ id, shot, imageSide, title, subline, paragraphs, action }: RowProps) {
  const img = <Appear effect={slide(imageSide === "left" ? -100 : 100)} className={styles.image}><ProductShot variant={shot} /></Appear>
  const content = (
    <Appear effect={slide(imageSide === "left" ? 100 : -100)} className={styles.content}>
      <div className={styles.rowText}>
        <h3 className={`t-h3 ${styles.rowTitle}`}>{title}</h3>
        {subline && <p className={`t-h5 ${styles.subline}`}>{subline}</p>}
        {paragraphs.map((p, j) => (
          <p key={j} className={`t-body-lg ${styles.rowBody}`}>{p}</p>
        ))}
      </div>
      {action && (
        <div className={styles.actions}>
          <Button variant="secondary" href={action.href}>{action.label}<Arrow /></Button>
        </div>
      )}
    </Appear>
  )
  return (
    <div id={id} className={`${styles.row} ${imageSide === "right" ? styles.rowPhoneImageFirst : ""}`}>
      {imageSide === "left" ? img : content}
      {imageSide === "left" ? content : img}
    </div>
  )
}

/* A3 premise items as Content Card instances (Features hehXLuKvS / M5z5mWu0X / Dr9qLJnUh) */
const CARDS = [
  {
    shot: "mandate" as ShotVariant,
    title: "Negotiate with confidential mandates",
    description: "Give your agent the budget, requirements and limits it needs to negotiate, without directly sharing those instructions with the counterparty.",
    delay: "0s",
  },
  {
    shot: "terms" as ShotVariant,
    title: "Approve what becomes policy",
    description: "Review the proposed agreement together. Its supported payment conditions become checks on what the agent can authorize.",
    delay: "0.2s",
  },
  {
    shot: "payment" as ShotVariant,
    title: "Keep the payment connected to the deal",
    description: "Check the milestone, amount and approved recipient before authorization. Follow the payment from request to reported confirmation.",
    delay: "0.4s",
  },
] as const

export function Product() {
  usePageMeta("Accord: Product", "How Accord works: agents negotiate in the Sealed Table, both companies approve the terms, and Agreement controls and Payee govern every USDC payment.")
  return (
    <div className={styles.page}>
      <PageHero
        pill="Product"
        title="A deal needs more than a conversation."
        lead="Your negotiating limits, the terms you approve and the destination of your money belong to the same decision. Accord keeps them connected in one deal room."
        actions={[
          { label: "Open a deal room", href: LINKS.newDealRoom, variant: "primary" },
          { label: "Inspect an agreement", href: LINKS.record, variant: "secondary" },
        ]}
      />

      {/* A3 premise: three Content Cards (Features FfCn55RGg) */}
      <section id="premise" className={`section ${styles.block}`}>
        <div className={styles.cards}>
          {CARDS.map((c, i) => (
            <ContentCard key={c.title} step={String(i + 1).padStart(2, "0")} className={styles.card} visual={<ProductShot variant={c.shot} />} title={c.title} description={c.description} appear={appear(c.delay)} />
          ))}
        </div>
      </section>

      {/* A7 Sealed Table and Payee: Heading (About mubm_eTfC) + two alternating rows */}
      <section id="capabilities" className={`section ${styles.block}`}>
        <div className={styles.sectionHeading}>
          <Appear effect={appear("0s")} className={styles.tag}>
            <span className={styles.indicator} aria-hidden="true" />
            <p className={`t-body-sm ${styles.tagText}`}>Sealed Table and Payee</p>
          </Appear>
          <Appear effect={appear("0.2s")} className={styles.text}>
            <h2 className={`t-h2 ${styles.h2}`}>Confidential where it matters. Explicit where money moves.</h2>
          </Appear>
        </div>

        <Row
          id="sealed-table"
          shot="negotiation"
          imageSide="left"
          title="Sealed Table"
          subline="Reach terms without directly disclosing your limits."
          paragraphs={[
            <>Each party submits a confidential mandate. Agents propose terms within those constraints, and both parties decide whether to approve the result.</>,
            <>Attestation provides evidence about the execution environment. It does not establish that a deal is fair or commercially optimal.</>,
          ]}
          action={{ label: "How negotiation works", href: LINKS.sealedTable }}
        />

        <Row
          id="payee"
          shot="payeeProof"
          imageSide="right"
          title="Payee"
          subline="Make the destination part of the agreement."
          paragraphs={[
            <>
              The recipient establishes control of its domain and proposes a payment destination. Its settlement authority approves the destination, and the buyer accepts it
              through the agreement's binding process.
            </>,
            <>Destination changes follow a separate approval process and configured delay. Domain control and authorization do not establish legal business identity.</>,
          ]}
          action={{ label: "How recipient approval works", href: LINKS.payee }}
        />
      </section>
    </div>
  )
}

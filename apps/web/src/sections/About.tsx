import type { ReactNode } from "react"
import { Appear, type AppearEffect } from "../lib/motion"
import { Link } from "react-router-dom"
import { Button } from "../components/Button"
import { Mono } from "../components/Mono"
import { LINKS } from "../content/links"
import styles from "./About.module.css"

/* Framer "About" section: Desktop NX9mbZ4xB (elementId "about"), Tablet uX81zskxrNX9mbZ4xB, Phone Ue6QXWSr_NX9mbZ4xB.
   Vertical stack, gap 64 (48 on Tablet/Phone), padding 72px 0 (72px 24px Tablet, 72px 16px Phone), max-width 1080.
   Children: Heading (mubm_eTfC) + three horizontal "Section" rows (YoIZRFTN2, J3FA8OTKG, y_CVc9JIP).
   Final copy (docs/website/ACCORD_WEBSITE_FINAL_COPY.md Part A "Sealed Table, Agreement controls and Payee"), per REFILL-V3:
   section root `#parts`, rows `#sealed-table` `#agreement-controls` `#payee`. The doc has no heading description, so that element is left out.
   Each row: title, the doc's short sub-line (`.t-h5`), the rest of the paragraph as one body paragraph; the doc's only button sits on row 3.
   Spec §3.6 (docs/website/ACCORD_LANDING_PAGE_SPEC.md): each row ends in a monospace chip row of its `make` targets, every chip linking to the
   commands list in the documentation; the Agreement controls row carries a thin top rule to mark it as the control plane. */

/* Heading appear (Tag YgvgslwMF delay 0s, Text ZhNEexvfs delay 0.2s): y 32 → 0, tween 1s ease [0.12,0.23,0.5,1] */
const headingAppear = (delay: `${number}s`): AppearEffect => ({
  threshold: 0.5,
  replay: false,
  enter: { opacity: 0, x: 0, y: 32, scale: 1, rotate: 0, transition: { type: "tween", ease: [0.12, 0.23, 0.5, 1], duration: "1s", delay } },
})

/* Row children appear: slide from x ±100 → 0, spring stiffness 240 / damping 80 / mass 1, delay 0 */
const slide = (x: -100 | 100): AppearEffect => ({
  threshold: 0.5,
  replay: false,
  enter: { opacity: 0, x, y: 0, scale: 1, rotate: 0, transition: { type: "spring", stiffness: 240, damping: 80, mass: 1, delay: "0s" } },
})

type Action = { label: string; href: string; variant?: "primary" | "secondary" }

type RowProps = {
  id: "sealed-table" | "agreement-controls" | "payee"
  image: string
  imageAlt: string
  /** Desktop order: image first ("left") or content first ("right"). */
  imageSide: "left" | "right"
  /** Phone (vertical) order when it differs from the desktop order. */
  phoneImageFirst?: boolean
  title: ReactNode
  /** Doc's short sub-line under the title. */
  subline?: ReactNode
  /** Body paragraphs, verbatim from the doc. */
  paragraphs: ReactNode[]
  /** Spec §3.6 chips: the row's `make` targets, each linking to the commands list in the docs. */
  chips?: string[]
  /** Thin top rule on the text column (spec §3.6: the control-plane row). */
  rule?: boolean
  actions?: Action[]
}

const COMMANDS_HREF = `${LINKS.docs}#commands`

function Row({ id, image, imageAlt, imageSide, phoneImageFirst, title, subline, paragraphs, chips = [], rule, actions = [] }: RowProps) {
  // Image slides in from the side it sits on; Content from the opposite side (values stay the same on all breakpoints).
  const imageEffect = slide(imageSide === "left" ? -100 : 100)
  const contentEffect = slide(imageSide === "left" ? 100 : -100)

  const img = (
    <Appear
      effect={imageEffect}
      className={styles.image}
      style={{ backgroundImage: `url("${image}")` }}
      role="img"
      aria-label={imageAlt}
    />
  )
  const content = (
    <Appear effect={contentEffect} className={styles.content}>
      <div className={`${styles.text} ${rule ? styles.textRuled : ""}`}>
        <h3 className={`t-h3 ${styles.title}`}>{title}</h3>
        {subline && <p className={`t-h5 ${styles.subline}`}>{subline}</p>}
        {paragraphs.map((p, j) => (
          <p key={j} className={`t-body-lg ${styles.description}`}>{p}</p>
        ))}
        {chips.length > 0 && (
          <ul className={styles.chips} aria-label="Commands">
            {chips.map((c) => (
              <li key={c}>
                <Link to={COMMANDS_HREF} className={styles.chipLink}>
                  <Mono className={styles.chip}>{c}</Mono>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {actions.length > 0 && (
        <div className={styles.actions}>
          {actions.map((a) => (
            <Button key={a.label} variant={a.variant ?? "primary"} href={a.href}>{a.label}</Button>
          ))}
        </div>
      )}
    </Appear>
  )

  return (
    <div id={id} className={`${styles.row} ${phoneImageFirst ? styles.rowPhoneImageFirst : ""}`}>
      {imageSide === "left" ? img : content}
      {imageSide === "left" ? content : img}
    </div>
  )
}

export function About() {
  return (
    <section id="parts" className={`section ${styles.about}`}>
      {/* Heading mubm_eTfC */}
      <div className={styles.heading}>
        {/* Tag YgvgslwMF */}
        <Appear effect={headingAppear("0s")} className={styles.tag}>
          <span className={styles.indicator} aria-hidden="true" />
          <p className={`t-body-sm ${styles.tagText}`}>The parts of the room</p>
        </Appear>
        {/* Text ZhNEexvfs (the doc gives no description for this heading) */}
        <Appear effect={headingAppear("0.2s")} className={styles.headingText}>
          <h2 className={`t-h2 ${styles.h2}`}>The parts of the room.</h2>
        </Appear>
      </div>

      {/* Section YoIZRFTN2: Image qoJ68mlH9 (left) + Content bb6PGfMEB → row 1 Sealed Table */}
      <Row
        id="sealed-table"
        image="/assets/content-image-4.png"
        imageAlt="Actions panel listing executed buy and sell orders"
        imageSide="left"
        title="Sealed Table"
        subline="Confidential negotiation between agents."
        paragraphs={[
          <>
            Two sealed mandates enter an attested enclave on NEAR; the agents negotiate with private inference, and deterministic code checks each proposal
            against both mandates' limits. Only the terms, the commitment hashes and an attestation come out.
          </>,
        ]}
        chips={["make negotiate"]}
      />

      {/* Section J3FA8OTKG: Content vEq13rCmi + Image tTccR6dpf (right); Phone reorders Image first → row 2 Agreement controls */}
      <Row
        id="agreement-controls"
        image="/assets/content-image-5.png"
        imageAlt="Recent analyses panel with quick actions"
        imageSide="right"
        phoneImageFirst
        title="Agreement controls"
        subline="The approved terms, enforced by the contract."
        rule
        paragraphs={[
          <>
            The control plane: the approved terms, enforced by the contract. A payment request must match the milestone, the amount, the recipient version
            and the destination, or it is refused and recorded. Revocation removes the agent's key and stops new authorisations in one transaction. The
            transfer itself, in USDC on NEAR, is the data plane; the contract decides and the contract pays.
          </>,
        ]}
        chips={["make pay", "make attack", "make revoke"]}
      />

      {/* Section y_CVc9JIP: Image qn2QatAHO (left) + Content Tq_ckVkQX → row 3 Payee, with the doc's button */}
      <Row
        id="payee"
        image="/assets/content-image-6.png"
        imageAlt="AI Agents panel listing trading, risk and portfolio agents"
        imageSide="left"
        title="Payee"
        subline="Recipient authorisation."
        paragraphs={[
          <>
            A vendor proves control of its domain inside an enclave, its settlement authority approves the destination, and the buyer accepts it. A change needs
            a fresh proof, the authority's approval and a 24-hour delay.
          </>,
        ]}
        chips={["make bind-payee", "make payee-change"]}
        actions={[{ label: "Verify your domain", href: LINKS.verifyDomain, variant: "secondary" }]}
      />
    </section>
  )
}

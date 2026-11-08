import { usePageMeta } from "../lib/meta"
import type { ReactNode } from "react"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { PageHero } from "../components/PageHero"
import { SectionHeading, appear } from "../components/SectionHeading"
import { Button } from "../components/Button"
import { useLive, type LiveValues } from "../lib/live"
import { LINKS } from "../content/links"
import { ProductShot, type ShotVariant } from "../components/ProductShot"
import tl from "../styles/Timeline.module.css"
import styles from "./MarketMaking.module.css"

/* /use-cases/market-making (alias /atlas): the featured agreement type, docs/website/ACCORD_WEBSITE_CONTENT.md B3. It was the
   Accord Atlas page until 8 Nov 2026; Accord is now the only product and market making one of its agreement types.
   Shell = the template's page hero (404 page Main) · four B3 sub-sections as the About section's alternating
   image rows (showcase-image-1…4) · the A5 visual labels as the Compliance section's five badge cards, with the
   observations from useLive().slots under them in the D2 evidence wording · `Review a measurement record`.
   Nothing here is called live; a last-known snapshot carries the D2 "Recorded demo" line and the D4 timestamp label. */

/* About row children appear: slide from x ±100 → 0, spring stiffness 240 / damping 80 / mass 1 */
const slide = (x: -100 | 100): AppearEffect => ({
  threshold: 0.5,
  replay: false,
  enter: { opacity: 0, x, y: 0, scale: 1, rotate: 0, transition: { type: "spring", stiffness: 240, damping: 80, mass: 1, delay: "0s" } },
})


/* The observation list can be taller than a phone viewport; the template's 0.5 threshold would never fire. */
const appearTall = (delay: `${number}s`) => ({ ...appear(delay), threshold: 0.1 })

type RowProps = {
  id: string
  shot: ShotVariant
  imageSide: "left" | "right"
  title: string
  paragraphs: ReactNode[]
}

/* About section row (YoIZRFTN2 geometry): Image + Content, 1fr each, gap 64; vertical on Phone */
function Row({ id, shot, imageSide, title, paragraphs }: RowProps) {
  const img = <Appear effect={slide(imageSide === "left" ? -100 : 100)} className={styles.image}><ProductShot variant={shot} /></Appear>
  const content = (
    <Appear effect={slide(imageSide === "left" ? 100 : -100)} className={styles.content}>
      <div className={styles.text}>
        <h2 className={`t-h3 ${styles.rowTitle}`}>{title}</h2>
        {paragraphs.map((p, i) => (
          <p key={i} className={`t-body-lg ${styles.rowBody}`}>{p}</p>
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

/* B3 sub-sections */
const ROWS: RowProps[] = [
  {
    id: "measurement",
    shot: "conditions",
    imageSide: "left",
    title: "Define the measurement before the engagement.",
    paragraphs: ["Specify the venue, the maximum spread, the minimum depth within the agreed band, whether both sides must be quoted, the number of observation slots and how many must pass for a period to pay."],
  },
  {
    id: "observations",
    shot: "observation",
    imageSide: "right",
    title: "Give each observation a place in the record.",
    paragraphs: ["Follow the measurement window, source, result and associated execution evidence. Review gaps and exceptions alongside successful observations."],
  },
  {
    id: "result",
    shot: "decision",
    imageSide: "left",
    title: "Connect the result to the agreement.",
    paragraphs: ["Where the approved measurement and release rules are satisfied, the payment becomes eligible for authorization. Where they are not, the room shows what is outstanding and which review process applies."],
  },
  {
    id: "scope",
    shot: "scope",
    imageSide: "right",
    title: "What the current version measures.",
    paragraphs: [
      "The observer reads the venue's public liquidity, today Rhea's USDC/wNEAR pool, at times drawn inside the observer's enclave. It measures venue-level liquidity, not the market maker's individual contribution, and does not detect all forms of manipulation, guarantee execution quality or verify legal compliance.",
      "Verification using the market maker's authenticated account data is planned. The hidden times rest on the operator never moving the observer's seed to a build that reveals them. Token loans and option-based compensation are outside the current retainer-focused flow.",
    ],
  },
]

/* A5 suggested visual labels on the Compliance section's five Media cards */
const CARDS = [
  { label: "Approved conditions", detail: "The venue, maximum spread, minimum depth, two-sided quoting, slots per period and how many must pass, approved by both companies." },
  { label: "Observation slot", detail: "One reading of the venue's public liquidity, at a time drawn inside the observer's enclave." },
  { label: "Attestation", detail: "Each observation is signed by the observer's enclave and checked by the agreement before it is recorded." },
  { label: "Period decision", detail: "When the approved measurement and release rules are satisfied, the period's payment becomes eligible." },
  { label: "Payment on NEAR", detail: "USDC from the agreement's own account to the authorised recipient, or a refusal on the record." },
]

/* D2 evidence wording per result. Anything other than PASS/FAIL is treated as incomplete evidence. */
function resultLine(result: string): string {
  if (result === "PASS") return "Observed conditions met the agreed thresholds."
  if (result === "FAIL") return "Observed conditions did not meet the agreed thresholds."
  return "Insufficient evidence to determine the result. Follow the agreement's review rule."
}

/* The observations under the evidence chain: one row per slot when the record carries them. Market-making
   observations are not recorded on NEAR testnet yet, so the group says so instead of showing an unrelated snapshot. */
function Observations({ v }: { v: LiveValues | null }) {
  const slots = v?.slots ?? []
  return (
    <div className={tl.group} aria-live="polite" aria-atomic="false">
      <h3 className={tl.groupLabel}><span>Observations</span>{slots.length ? <span className={tl.groupMeta}>{slots.filter((s) => s.result === "PASS").length} of {slots.length} pass</span> : null}</h3>
      {slots.length === 0 ? (
        <p className={tl.note}>No market-making observations are recorded on NEAR testnet yet.</p>
      ) : (
        <ol className={tl.rows}>
          {slots.map((s) => (
            <li key={s.slot} className={`${tl.row} ${tl.rowWide}`}>
              <span className={`mono ${tl.num}`}>{String(s.slot).padStart(2, "0")}</span>
              <span className={`mono ${tl.name} ${tl.code}`}>window {s.slot}</span>
              <span className={`mono ${tl.value} ${s.result === "FAIL" ? tl.weak : ""}`}>spread {s.spreadBps} bps · depth {Math.min(s.depthBid, s.depthAsk)} · {s.twoSided ? "both sides" : "one side"} · {resultLine(s.result)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export function MarketMaking() {
  usePageMeta("Accord: Market-making agreements", "Market-making agreements in Accord: retainers tied to agreed liquidity conditions, with scheduled observations deciding whether each payment is eligible.")
  const live = useLive()
  return (
    <div className={styles.page}>
      <PageHero
        pill="Use case · Market-making agreements"
        title="Put liquidity conditions into the payment decision."
        lead="Agree on the market conditions to measure, inspect the observations, and apply the results to the payment rules in the deal room."
        actions={[
          { label: "Explore an example agreement", href: LINKS.record, variant: "primary" },
          { label: "Try a deal", href: LINKS.tryDeal, variant: "secondary" },
        ]}
      />

      {/* B3 sub-sections: About section rows */}
      <section id="how-it-measures" className={`section ${styles.rows}`}>
        {ROWS.map((r) => <Row key={r.id} {...r} />)}
      </section>

      {/* A5 visual labels + observations: Compliance section cards */}
      <section id="measurement-record" className={`section ${styles.cards}`}>
        <SectionHeading
          eyebrow="Measurement record"
          title="Inspect the evidence"
          lead={<p>Review the observed spread, depth and availability for each measurement window, alongside the result produced by the agreed rules.</p>}
          accent="teal"
        />
        <Appear className={tl.column} effect={appearTall("0.1s")}>
          <div className={tl.group}>
            <h3 className={tl.groupLabel}><span>The evidence chain</span></h3>
            <ol className={tl.rows}>
              {CARDS.map((c, i) => (
                <li key={c.label} className={`${tl.row} ${styles.chainRow}`}>
                  <span className={`mono ${tl.num}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={styles.chainMain}>
                    <span className={tl.name}>{c.label}</span>
                    <span className={styles.chainText}>{c.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <Observations v={live} />
        </Appear>
        <Appear className={styles.actions} effect={appear("0s")}>
          <Button variant="secondary" href={LINKS.record}>Inspect the testnet record</Button>
        </Appear>
      </section>
    </div>
  )
}

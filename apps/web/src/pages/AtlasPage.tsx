import { usePageMeta } from "../lib/meta"
import type { ReactNode } from "react"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { PageHero } from "../components/PageHero"
import { SectionHeading, appear } from "../components/SectionHeading"
import { MediaCard } from "../components/MediaCard"
import { IconTerms, IconSlot, IconAttest, IconDecision, IconTransfer } from "../components/FlowIcons"
import { Mono } from "../components/Mono"
import { Button } from "../components/Button"
import { useLive, asOfLabel, type LiveValues } from "../lib/live"
import { LINKS } from "../content/links"
import styles from "./AtlasPage.module.css"

/* /atlas (was /glassbook; renamed Accord Atlas 30 Oct 2026): docs/website/ACCORD_WEBSITE_CONTENT.md B3, set verbatim.
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

/* Compliance card appear: y 32 → 0, tween 1s ease [0.12,0.23,0.5,1], staggered 0.1s */
const rise = (delay: `${number}s`): AppearEffect => ({
  threshold: 0.5,
  replay: false,
  enter: { opacity: 0, x: 0, y: 32, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1s", delay } },
})

/* The observation list can be taller than a phone viewport; the template's 0.5 threshold would never fire. */
const appearTall = (delay: `${number}s`) => ({ ...appear(delay), threshold: 0.1 })

type RowProps = {
  id: string
  image: string
  imageAlt: string
  imageSide: "left" | "right"
  title: string
  paragraphs: ReactNode[]
}

/* About section row (YoIZRFTN2 geometry): Image + Content, 1fr each, gap 64; vertical on Phone */
function Row({ id, image, imageAlt, imageSide, title, paragraphs }: RowProps) {
  const img = <Appear effect={slide(imageSide === "left" ? -100 : 100)} className={styles.image} style={{ backgroundImage: `url("${image}")` }} role="img" aria-label={imageAlt} />
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
    image: "/assets/showcase-image-1.png",
    imageAlt: "Agreement terms panel",
    imageSide: "left",
    title: "Define the measurement before the engagement.",
    paragraphs: ["Specify the venue and pair, maximum spread, minimum depth, observation schedule, data-coverage requirements and the rule used to determine payment eligibility."],
  },
  {
    id: "observations",
    image: "/assets/showcase-image-2.png",
    imageAlt: "Observation record panel",
    imageSide: "right",
    title: "Give each observation a place in the record.",
    paragraphs: ["Follow the measurement window, source, result and associated execution evidence. Review gaps and exceptions alongside successful observations."],
  },
  {
    id: "result",
    image: "/assets/showcase-image-3.png",
    imageAlt: "Payment eligibility panel",
    imageSide: "left",
    title: "Connect the result to the agreement.",
    paragraphs: ["Where the approved measurement and release rules are satisfied, the payment becomes eligible for authorization. Where they are not, the room shows what is outstanding and which review process applies."],
  },
  {
    id: "scope",
    image: "/assets/showcase-image-4.png",
    imageAlt: "Order-book observation panel",
    imageSide: "right",
    title: "What the current version measures.",
    paragraphs: [
      "Atlas observes the venue's order book. It does not identify which firm supplied that liquidity, detect all forms of manipulation, guarantee execution quality or verify legal compliance.",
      "Account-attributed performance verification is a planned extension. Token loans and option-based compensation are outside the current retainer-focused flow.",
    ],
  },
]

/* A5 suggested visual labels on the Compliance section's five Media cards */
const CARDS = [
  { icon: <IconTerms />, label: "Approved conditions", delay: "0s" as const },
  { icon: <IconSlot />, label: "Observation slot", delay: "0.1s" as const },
  { icon: <IconAttest />, label: "Attestation", delay: "0.2s" as const },
  { icon: <IconDecision />, label: "Period decision", delay: "0.3s" as const },
  { icon: <IconTransfer />, label: "Payment on NEAR", delay: "0.4s" as const },
]

/* D2 evidence wording per result. Anything other than PASS/FAIL is treated as incomplete evidence. */
function resultLine(result: string): string {
  if (result === "PASS") return "Observed conditions met the agreed thresholds."
  if (result === "FAIL") return "Observed conditions did not meet the agreed thresholds."
  return "Insufficient evidence to determine the result. Follow the agreement's review rule."
}

const RECORDED_DEMO = "Recorded demonstration. These observations are not live."

/* The observations under the cards: one line per slot, in the five labels' order */
function Observations({ v }: { v: LiveValues | null }) {
  if (!v) return <p className={`t-body-sm ${styles.weak}`}>Loading the agreement record.</p>
  return (
    <div className={styles.observations} aria-live="polite" aria-atomic="false">
      {v.source === "last-known" ? <p className={`t-body-sm ${styles.weak}`}>{RECORDED_DEMO}</p> : null}
      {v.slots.length === 0 ? (
        <p className={`t-body-sm ${styles.weak}`}>No observations yet</p>
      ) : (
        <ol className={styles.slots}>
          {v.slots.map((s) => (
            <li key={s.slot} className={styles.slot}>
              <Mono className={styles.cell}>window {s.slot}</Mono>
              <Mono className={styles.cell}>spread p50 {s.spreadP50Bps} bps · depth min {s.depthMin} · uptime {s.uptimePct}%</Mono>
              <Mono className={styles.cell} tone={s.result === "FAIL" ? "refusal" : undefined}>{resultLine(s.result)}</Mono>
            </li>
          ))}
        </ol>
      )}
      <p className={`t-body-sm ${styles.weak}`}>Last updated: {asOfLabel(v)}</p>
    </div>
  )
}

export function AtlasPage() {
  usePageMeta("Accord Atlas", "Accord Atlas: liquidity agreements with measurable payment conditions, the first application built on Accord.")
  const live = useLive()
  return (
    <div className={styles.page}>
      <PageHero
        pill="Built on Accord · Accord Atlas"
        title="Put liquidity conditions into the payment decision."
        lead="Agree on the market conditions to measure, inspect the observations, and apply the results to the payment rules in the deal room."
        actions={[
          { label: "Explore an Atlas agreement", href: LINKS.record, variant: "primary" },
          { label: "Watch the walkthrough", href: LINKS.demo, variant: "secondary" },
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
        <div className={styles.cardRow}>
          {CARDS.map((c, i) => (
            <MediaCard key={c.label} className={styles.card} icon={c.icon} step={String(i + 1).padStart(2, "0")} label={c.label} effect={rise(c.delay)} />
          ))}
        </div>
        <Appear className={styles.record} effect={appearTall("0.1s")}>
          <Observations v={live} />
        </Appear>
        <Appear className={styles.actions} effect={appear("0s")}>
          <Button variant="secondary" href={LINKS.record}>Review a measurement record</Button>
        </Appear>
      </section>
    </div>
  )
}

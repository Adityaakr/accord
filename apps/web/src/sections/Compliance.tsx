import { Link } from "react-router-dom"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { Button } from "../components/Button"
import { MediaCard } from "../components/MediaCard"
import { IconTerms, IconSlot, IconAttest, IconDecision, IconTransfer } from "../components/FlowIcons"
import { Mono } from "../components/Mono"
import { LINKS } from "../content/links"
import { asOfLabel, useLive, type LiveValues } from "../lib/live"
import { AtlasMark } from "../components/AtlasMark"
import styles from "./Compliance.module.css"

/* Framer "Compliance" section: Desktop xx_IlnaTQ (elementId now "atlas"), Tablet uX81zskxrxx_IlnaTQ, Phone Ue6QXWSr_xx_IlnaTQ
   section: vertical stack, width 1fr, maxWidth 1080, gap 64, padding 72px 0 (template 72/0/48; bottom set to the
            section rhythm), scrollMarginTop 40 (Tablet: gap 48, padding 72px 24px · Phone: gap 32, padding 72px 16px)
     Heading ua_xHTB_9: vertical, gap 24, maxWidth 480, width 1fr
       Tag EjKNufgsR (appear y32 1s delay 0): Indicator sQh3S5ACm 14×8 Teal radius 9999 + Text oxnK1aspD (Body Small)
       Text eyNj8EBaA (appear y32 1s delay 0.2, gap 20): Title SgdD5XHXf (H2) + Description ZK8AQ9S1d (Body Large)
     Media Cards xztoSB5UX: horizontal, gap 16, width 1fr, overflow hidden (Phone: vertical)
       5 × Media card instances, width 1fr, appear y32 1s delay 0 / 0.1 / 0.2 / 0.3 / 0.4
   No loop/hover/tap effects anywhere in this subtree.
   Copy: docs/website/ACCORD_WEBSITE_FINAL_COPY.md Part A "Glassbook" (renamed Accord Atlas, 30 Oct 2026) (docs/website/framer-port/REFILL-V3.md slot map).
   Added in the template's own presets: three text columns (H5 + Body Small) between the heading and the cards, a
   scope line (H6 label + Body Small) and one secondary button under the cards. The column labels are the only words
   not in Part A; the five cards carry the slot map's labels. */

const appear = (delay: `${number}s`): AppearEffect => ({
  threshold: 0.5,
  replay: false,
  enter: { opacity: 0, x: 0, y: 32, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1s", delay } },
})


/* Slot map card labels */
const CARDS = [
  { id: "YmMOXz8s_", icon: <IconTerms />, label: "Approved conditions", delay: "0s" as const },
  { id: "Lr77O11tM", icon: <IconSlot />, label: "Observation slot", delay: "0.1s" as const },
  { id: "ft_W0m1ZR", icon: <IconAttest />, label: "Attestation", delay: "0.2s" as const },
  { id: "RWoheQGYT", icon: <IconDecision />, label: "Period decision", delay: "0.3s" as const },
  { id: "yT6tNV4N1", icon: <IconTransfer />, label: "Payment on NEAR", delay: "0.4s" as const },
]

/* spec §3.3: compact slot panel under the cards when the snapshot carries observation slots (src/lib/live.ts `slots`).
   Every value is read from the snapshot; the word "live" is never printed (honesty gate); nothing renders without slots. */
function SlotPanel({ v }: { v: LiveValues }) {
  const slots = v.slots
  const passed = slots.filter((s) => s.result === "PASS").length
  return (
    <div className={styles.slots} aria-label="Observation slots">
      <div className={styles.slotsHead}>
        <p className={`t-h6 ${styles.slotsTitle}`}>Observation slots</p>
        <Mono className={styles.pill}>{passed} of {slots.length} pass</Mono>
        <p className={`t-body-sm ${styles.slotsAsOf}`}>
          {v.source === "last-known" ? "Data unavailable · last known " : "Last updated "}{asOfLabel(v)}
        </p>
      </div>
      <ul className={styles.slotList}>
        {slots.map((s) => (
          <li key={s.slot}>
            <Mono className={styles.slotChip} tone={s.result === "FAIL" ? "refusal" : undefined}>
              slot {s.slot} · {s.result === "PASS" ? "pass" : "fail"} · {s.spreadP50Bps} bps · {s.depthMin} · {s.uptimePct}%
            </Mono>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Compliance() {
  const live = useLive()
  const hasSlots = !!live && live.slots.length > 0
  return (
    <section id="atlas" className={`section ${styles.section}`}>
      {/* Heading ua_xHTB_9 */}
      <div className={styles.heading}>
        {/* Tag EjKNufgsR */}
        <Appear className={styles.tag} effect={appear("0s")}>
          <AtlasMark size={20} />
          <p className="t-body-sm">The first application built on Accord</p>
        </Appear>
        {/* Text eyNj8EBaA */}
        <Appear className={styles.text} effect={appear("0.2s")}>
          <h2 className={`t-h2 ${styles.title}`}>Accord Atlas: liquidity agreements with measurable payment conditions.</h2>
          <p className={`t-body-lg ${styles.description}`}>
            Built on Accord, Atlas links a market maker's recurring retainer to the spread, depth and uptime both sides agreed. An attested observer samples
            the venue's public order book on the agreed schedule. When the agreed number of observations pass, the payment is released; when they don't, it
            is held for both sides to decide.
          </p>
        </Appear>
      </div>

      {/* Media Cards xztoSB5UX */}
      <div className={styles.cards}>
        {CARDS.map((c, i) => (
          <MediaCard key={c.id} className={styles.card} icon={c.icon} step={String(i + 1).padStart(2, "0")} label={c.label} effect={appear(c.delay)} />
        ))}
      </div>

      {/* Slot panel (spec §3.3): only when the snapshot has observation slots */}
      {hasSlots ? <SlotPanel v={live} /> : null}

      {/* Scope paragraph + button. The H6 carries the paragraph's "Scope:" lead-in; the body is the rest, first letter capitalised. */}
      <Appear className={styles.scope} effect={appear("0s")}>
        <p className={`t-h6 ${styles.scopeLabel}`}>Scope</p>
        <p className={`t-body-sm ${styles.scopeText}`}>
          Atlas measures the market's condition on the venue, not which participant supplied it. Attributing liquidity to the market maker's own account is planned.
        </p>
        <Button variant="secondary" href={LINKS.exploreAtlas}>See the Atlas demonstration</Button>
        {/* spec §3.3: tertiary link as the section's last line */}
        <Link to={LINKS.join} className={`t-body-sm ls-link ${styles.join}`}>Join as a project or a market maker →</Link>
      </Appear>
    </section>
  )
}

import { Appear, type AppearEffect } from "../lib/motion"
import { Showcase, type ShowcaseItem } from "../components/Showcase"
import { Button } from "../components/Button"
import { LINKS } from "../content/links"
import styles from "./Overview.module.css"

/* Overview section (WaR1fWHPo, elementId "overview" → ACCORD_HOMEPAGE_FINAL Slot 2 "The deal room", #experience): Home breakpoint WQLkyLRf1
   Tablet replica uX81zskxrWaR1fWHPo · Phone replica Ue6QXWSr_WaR1fWHPo
   Vertical stack, gap 64 (Tablet 48, Phone 32), padding 72/0 (Tablet 72/24, Phone 72/16),
   width 1fr, maxWidth 1080, scrollMarginTop 40.
   Children: Heading (iNcfvRJfP) + Showcase instance (hO5jyIcbp, appear y32 1s)
   + (added, template presets) the `Inspect the record` button (REFILL-V3: closing line removed). */
const APPEAR_TAG: AppearEffect = {
  threshold: 0.5, replay: false,
  enter: { opacity: 0, x: 0, y: 32, scale: 1, rotate: 0, transition: { type: "tween", ease: [0.12, 0.23, 0.5, 1], duration: "1s", delay: "0s" } },
}
const APPEAR_TEXT: AppearEffect = {
  threshold: 0.5, replay: false,
  enter: { opacity: 0, x: 0, y: 32, scale: 1, rotate: 0, transition: { type: "tween", ease: [0.12, 0.23, 0.5, 1], duration: "1s", delay: "0.2s" } },
}
const APPEAR_SHOWCASE: AppearEffect = {
  threshold: 0.5, replay: false,
  enter: { opacity: 0, x: 0, y: 32, scale: 1, rotate: 0, transition: { type: "tween", ease: [0.12, 0.23, 0.5, 1], duration: "1s", delay: "0s" } },
}
const APPEAR_CLOSING: AppearEffect = {
  threshold: 0.5, replay: false,
  enter: { opacity: 0, x: 0, y: 32, scale: 1, rotate: 0, transition: { type: "tween", ease: [0.12, 0.23, 0.5, 1], duration: "1s", delay: "0.1s" } },
}

/* The five tabs kept as they are (REFILL-V3 slot map: "keep its current 5 tabs").
   The template's five accordions with its images 1–5. */
const ITEMS: ShowcaseItem[] = [
  {
    id: "gcgI0_bUk",
    title: "Mandates",
    description: "Set the private requirements and limits your agent negotiates within.",
    image: "/assets/showcase-image-1.png",
  },
  {
    id: "HTRHgyK5f",
    title: "Agreement",
    description: "Review the exact terms awaiting approval from each party.",
    image: "/assets/showcase-image-2.png",
  },
  {
    id: "XjpLIVHRa",
    title: "Evidence",
    description: "Inspect the observations used to evaluate each payment condition.",
    image: "/assets/showcase-image-3.png",
  },
  {
    id: "DUwVrHG2y",
    title: "Payments",
    description: "Track requests, authorizations, signed transfers and reported confirmations.",
    image: "/assets/showcase-image-4.png",
  },
  {
    id: "VsOrToXRO",
    title: "Activity",
    description: "Follow approvals, recipient changes, exceptions and refused requests.",
    image: "/assets/showcase-image-5.png",
  },
]

export function Overview() {
  return (
    <section id="experience" className={`section ${styles.section}`}>
      {/* Heading (iNcfvRJfP): vertical, gap 24, width 1fr, maxWidth 480 */}
      <div className={styles.heading}>
        {/* Tag (u44WM8doi): horizontal, gap 8, align center, appear y32/1s */}
        <Appear className={styles.tag} effect={APPEAR_TAG}>
          <span className={styles.indicator} aria-hidden="true" />
          <p className={`t-body-sm ${styles.tagText}`}>Product preview</p>
        </Appear>
        {/* Text (BatNIC0OT): vertical, gap 20, appear y32/1s delay 0.2s */}
        <Appear className={styles.text} effect={APPEAR_TEXT}>
          <h2 className={`t-h2 ${styles.title}`}>The deal room.</h2>
          {/* The "live agreement" caption was removed at Adi's request (30 Oct 2026) */}
        </Appear>
      </div>
      {/* Showcase instance (hO5jyIcbp): width 1fr, appear y32/1s */}
      <Appear className={styles.showcase} effect={APPEAR_SHOWCASE}>
        <Showcase items={ITEMS} />
      </Appear>
      {/* Added: the `Inspect the record` button, in the template's presets (closing line removed per REFILL-V3) */}
      <Appear className={styles.closing} effect={APPEAR_CLOSING}>
        <Button variant="secondary" href={LINKS.record}>Inspect the record</Button>
      </Appear>
    </section>
  )
}

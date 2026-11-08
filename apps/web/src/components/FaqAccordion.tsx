import type { KeyboardEvent, MouseEvent, ReactNode } from "react"
import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react"
import { EASE_APPEAR, SPRING_UI } from "../lib/motion"
import styles from "./FaqAccordion.module.css"

/* Framer "FAQ Accordion" component (SKzZQm08B)
   Variables: Title PxHQAJJZn · Description gcD7_UKA6
   Variants: Open TOtD54UnA (primary) · Closed Nf3dw3Su0 · Closed/hover waGFzOvQR (inherits Closed)
   Root frame (all variants): fill Elevation Strong, radius 4, padding 18px 16px, vertical stack gap 16,
     overflow hidden, width 532 (instances: 1fr), transition spring 0.4s bounce 0.2
     onTap: Open → SET_VARIANT Closed · Closed → SET_VARIANT Open (explicit ids, independent per instance)
     Heading XA17B0zuW: horizontal, gap 10, align center, width 1fr
       Title wxu8mRDn0: H6 preset (mc7iekM0c), width 1fr
       Icon irCj4PG3r: 16×16 stack centered → Indicator kb6lbcCf0 8×8, radius 100%
         fill: Open = Orange · Closed = Elevation Medium · Closed hover = Elevation Weak
     Description OQkN6QM83: Body Small preset (pWARBbc57), width 1fr; visible:false in Closed + hover
   Instances carry an appearEffect (trigger onScrollTarget → FAQ section, y 32 → 0, 1s, ease [0.12,0.23,0.5,1],
   per-instance delay) → passed in as `inView` + `delay`.
   Spec §5 Accordion: open state is controlled by the parent so only one item is open at a time; `aria-expanded`,
   Enter/Space; the height/fill spring is replaced by an instant switch under prefers-reduced-motion. */

type Props = {
  title: string
  /** Body Small copy; may carry inline markup (<Mono>, <Ref> footnote links) */
  description: ReactNode
  /** Appear effect: becomes true when the scroll target (the FAQ section) is in view */
  inView: boolean
  /** Appear delay in seconds (from the Framer instance) */
  delay: number
  /** Controlled open state (the FAQ section keeps at most one item open) */
  open: boolean
  /** Called on click / Enter / Space; the parent decides whether this opens or closes the item */
  onToggle: () => void
  className?: string
}

const INSTANT: Transition = { duration: 0 }

const ORANGE = "var(--token-35240c30-baf2-4269-8805-70fb739fb8ad)"
const ELEVATION_MEDIUM = "var(--token-ad0e5630-4fcd-4e6f-a643-3c63e11b8ed6)"
const ELEVATION_WEAK = "var(--token-03d079c3-6dd0-4171-9717-4f5a9d769b77)"

const indicatorVariants = {
  open: { backgroundColor: ORANGE },
  closed: { backgroundColor: ELEVATION_MEDIUM },
  /* Hover variant only exists for Closed (waGFzOvQR inherits Nf3dw3Su0); Open has no hover diff */
  hover: (open: boolean) => ({ backgroundColor: open ? ORANGE : ELEVATION_WEAK }),
}

export function FaqAccordion({ title, description, inView, delay, open, onToggle, className = "" }: Props) {
  /* prefers-reduced-motion: no height/fill animation (spec §5); the open/closed switch is instant */
  const reduceMotion = useReducedMotion()
  const spring = reduceMotion ? INSTANT : SPRING_UI
  /* A footnote <Ref> link inside the open description navigates to #ref-n; it must not also toggle the accordion closed. */
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a")) return
    onToggle()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a")) return
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onToggle()
    }
  }

  return (
    /* appearEffect wrapper (instance-level) */
    <motion.div
      className={`${styles.appear} ${className}`}
      initial={reduceMotion ? false : { opacity: 0, y: 32 }}
      animate={reduceMotion || inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ type: "tween", ease: EASE_APPEAR, duration: 1, delay }}
    >
      {/* Variant frame TOtD54UnA / Nf3dw3Su0 */}
      <motion.div
        className={styles.root}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onClick}
        onKeyDown={onKeyDown}
        initial={false}
        animate={open ? "open" : "closed"}
        whileHover="hover"
        transition={spring}
      >
        {/* Heading XA17B0zuW */}
        <div className={styles.heading}>
          <h3 className={`t-h6 ${styles.title}`}>{title}</h3>
          {/* Icon irCj4PG3r */}
          <span className={styles.icon} aria-hidden="true">
            {/* Indicator kb6lbcCf0 */}
            <motion.span className={styles.indicator} variants={indicatorVariants} custom={open} transition={spring} />
          </span>
        </div>

        {/* Description OQkN6QM83: visible only in Open; height/opacity animate with the variant spring */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="description"
              className={styles.collapse}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={spring}
            >
              <div className={styles.collapseInner}>
                <p className={`t-body-sm ${styles.description}`}>{description}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

import { AnimatePresence, motion } from "motion/react"
import type { KeyboardEvent, ReactNode } from "react"
import { EASE_APPEAR } from "../lib/motion"
import styles from "./ShowcaseAccordion.module.css"

/* Framer "Showcase accordion" component (BLTyZCJu2)
   Variants: Open (llbCLxNDL, primary) · Closed (lHa8E18Lj) · Closed/hover (uzCG_TomN)
   Variables: Title KRougN7Yy · Description dbVKaIiIS · Click (eventhandler) Lmg5wru3b
   Root: fill Elevation Strong, vertical stack gap 12, radius 4, overflow hidden,
         padding Open 24/32/20/20 · Closed 20/32/20/20,
         onTap → SET_VARIANT (other) + TRIGGER_EVENT Click,
         variant transition tween 0.4s [0.12,0.23,0.5,1]
   Heading: horizontal stack gap 12, align center → Indicator 2×16 r9999
            (Open: Green · Closed: Elevation Medium · Closed hover: Elevation Weak) + Title h6 (mc7iekM0c)
   Description: p Body Small (pWARBbc57), visible only in Open
   `aside` (added for the brief's "What the other side sees" cell): one Body Small text-weak line under the description. */
const T = { type: "tween" as const, ease: EASE_APPEAR, duration: 0.4 }

type Props = {
  title: ReactNode
  description: ReactNode
  aside?: ReactNode
  open: boolean
  onClick: () => void
}

export function ShowcaseAccordion({ title, description, aside, open, onClick }: Props) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onClick()
    }
  }
  return (
    <div
      className={`${styles.root} ${open ? styles.open : styles.closed}`}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <div className={styles.heading}>
        <span className={styles.indicator} aria-hidden="true" />
        <h6 className={`t-h6 ${styles.title}`}>{title}</h6>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="description"
            className={styles.descriptionWrap}
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: "auto", opacity: 1, marginTop: 12 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={T}
          >
            <p className={`t-body-sm ${styles.description}`}>{description}</p>
            {aside ? <p className={`t-body-sm ${styles.aside}`}>{aside}</p> : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

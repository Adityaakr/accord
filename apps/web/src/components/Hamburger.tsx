import { motion } from "motion/react"
import styles from "./Hamburger.module.css"

/* Framer "Hamburger" component (tvrMDEcEB). 32×32, three 24×2 lines (radius 7).
   Open → Close: line1 rotates 45°, line2 fades to 0 (width 1px), line3 rotates −45°.
   Spring stiffness 500, damping 60, mass 1. Color = `color` prop (White / Text Strong). */
export function Hamburger({ open, onTap, color = "var(--white)" }: { open: boolean; onTap: () => void; color?: string }) {
  const spring = { type: "spring" as const, stiffness: 500, damping: 60, mass: 1 }
  return (
    <button type="button" className={styles.root} onClick={onTap} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
      <motion.span className={styles.line} style={{ background: color }} animate={open ? { top: 15, rotate: 45, width: 20, x: "-50%" } : { top: 7, rotate: 0, width: 24, x: "-50%" }} transition={spring} />
      <motion.span className={styles.line} style={{ background: color, top: 15 }} animate={open ? { opacity: 0, width: 1, x: "-50%" } : { opacity: 1, width: 24, x: "-50%" }} transition={spring} />
      <motion.span className={styles.line} style={{ background: color }} animate={open ? { bottom: 15, rotate: -45, width: 20, x: "-50%" } : { bottom: 7, rotate: 0, width: 24, x: "-50%" }} transition={spring} />
    </button>
  )
}

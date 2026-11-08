import type { ReactNode } from "react"
import styles from "./ActionCard.module.css"

/* Framer "Action card" component (BE0Kc14HI), single variant "Default" (xcGV720w0):
   vertical stack, gap 8, align start, width 195px (instances override to 1fr).
     Title row (j5R9YDVgS): horizontal, gap 8, align center, width 1fr
       IconNode (DFCncuIt1): 16×16, color Text Medium (7a4abf4f…), stroke width 1.8
       Heading (AgnR7Putm): h6, preset H6 (mc7iekM0c), width 1fr
     Description (tEpmXWo0N): p, preset Body Small (pWARBbc57), width 1fr
   Variables: Icon jyrPMeX_W (vectorsetitem) / Title LAICbkWlV / Description beDgi4nTC. */
type Props = {
  icon: ReactNode
  title: string
  description: string
  className?: string
}

export function ActionCard({ icon, title, description, className = "" }: Props) {
  return (
    <div className={`${styles.card} ${className}`}>
      <div className={styles.title}>
        <span className={styles.icon} aria-hidden="true">{icon}</span>
        <h2 className={`t-h6 ${styles.heading}`}>{title}</h2>
      </div>
      <p className={`t-body-sm ${styles.description}`}>{description}</p>
    </div>
  )
}

/* Icon rendering helper for the Lucide-style vector-set items used by Action cards.
   Paths are the exact exports of the Framer vector set modules (viewBox 0 0 24 24,
   stroke = Text Medium, stroke-width 1.8, round caps/joins, no fill). */
export type IconPath = { d: string; t?: string }

export function ActionCardIcon({ paths }: { paths: IconPath[] }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" role="presentation" style={{ display: "block" }}>
      {paths.map((p, i) => (
        <path key={i} d={p.d} transform={p.t} />
      ))}
    </svg>
  )
}

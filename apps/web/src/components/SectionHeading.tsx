import type { ReactNode } from "react"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import styles from "./SectionHeading.module.css"

/* The template's section heading pattern (Tag pill + H2 + lead), reused by every content section.
   Pill colour cycles through the template palette; the appear timings are the template's (tag 0s, text 0.2s). */
export type Accent = "white" | "orange" | "yellow" | "lime" | "green" | "teal" | "cyan" | "blue" | "purple" | "pink"

export const appear = (delay: `${number}s`): AppearEffect => ({
  threshold: 0.5,
  replay: false,
  enter: { opacity: 0, x: 0, y: 32, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1s", delay } },
})

type Props = {
  eyebrow: string
  title: ReactNode
  lead?: ReactNode
  accent?: Accent
  /** max-width of the heading column; template default 480 */
  wide?: boolean
  /** Centre the pill, heading and lead on the section axis */
  centered?: boolean
  className?: string
}

export function SectionHeading({ eyebrow, title, lead, accent = "white", wide, centered, className = "" }: Props) {
  return (
    <div className={`${styles.heading} ${wide ? styles.wide : ""} ${centered ? styles.centered : ""} ${className}`}>
      <Appear className={styles.tag} effect={appear("0s")}>
        <span className={styles.indicator} style={{ background: `var(--${accent})` }} aria-hidden="true" />
        <p className="t-body-sm">{eyebrow}</p>
      </Appear>
      <Appear className={styles.text} effect={appear("0.2s")}>
        <h2 className={`t-h2 ${styles.title}`}>{title}</h2>
        {lead ? <div className={`t-body-lg ${styles.lead}`}>{lead}</div> : null}
      </Appear>
    </div>
  )
}

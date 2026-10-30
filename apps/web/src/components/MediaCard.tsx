import type { ReactNode } from "react"
import { Appear, type AppearEffect } from "../lib/motion"
import styles from "./MediaCard.module.css"

/* Framer "Media card" component (pq2CvSExL): single variant "Default" ck6suJZ1g, no hover/pressed/loop effects.
   Default: vertical stack, align center, gap 32, padding 48px 20px 20px 20px, radius 4, overflow hidden,
            fill Elevation Strong, width 200 (instances override to 1fr), variant transition spring 0.4s bounce 0.2 (unused: one variant)
     Image bze6w7n4M: 76×76, aspectRatio 1, opacity 0.3, fill = Image variable (PVY7HIPWr, background cover)
     Label dsqA8JJuZ: Body Small preset, textColor Text Weak, width 1fr (left aligned), text = Label variable (z3tOkao7r) */
type Props = {
  /** template image (kept for other callers); prefer `icon` */
  image?: string
  /** drawn line icon rendered in the image slot */
  icon?: ReactNode
  /** optional step number shown top-left, e.g. "01" */
  step?: string
  label: string
  alt?: string
  effect?: AppearEffect
  className?: string
}

export function MediaCard({ image, icon, step, label, alt = "", effect, className = "" }: Props) {
  const cls = `${styles.card} ${icon ? styles.flow : ""} ${className}`
  const inner = (
    <>
      {step ? <span className={`mono ${styles.step}`}>{step}</span> : null}
      {icon ? (
        <div className={styles.icon}>{icon}</div>
      ) : (
        <div className={styles.image} style={{ backgroundImage: `url("${image}")` }} role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} />
      )}
      <p className={`t-body-sm ${styles.label}`}>{label}</p>
    </>
  )
  if (effect) return <Appear className={cls} effect={effect}>{inner}</Appear>
  return <div className={cls}>{inner}</div>
}

import type { ReactNode } from "react"
import { Appear, type AppearEffect } from "../lib/motion"
import styles from "./IconCard.module.css"

/* Framer "Icon Card" component (dnTe1y1M6): single "Default" variant J1gFCUXFa, no gesture variants.
   Variables: Icon C5SynL5KB (vectorsetitem, Lucide set Y7SpbVH16cWqMhj75z1M) · Title zBnyJS5pi · Description yo7TSeqzq
   Default frame: vertical stack, width 350 (instances override to 1fr), height auto, gap 24px, padding 24px 20px,
   fill Elevation Strong, radius 4px, overflow hidden, variant transition spring 0.4s bounce 0.2 (unused: single variant).
     Icon circle huFgiZMep: 64×64, radius 999px, 1px solid Elevation Weak, overflow clip, centered
       Icon ijQykoF4o: 24×24, aspectRatio 1, opacity 0.9, color = White token ($control__P_DcoRcrY), stroke width 1.4 ($control__JEeZYcamG)
     Text hIf4D1WL9: vertical, gap 8px, width 1fr
       Title kqwlZQYrl: H5 preset (AGwqkS8yv), width 1fr
       Description g8FA44xcv: Body Large preset (nBG6kvhVn), width 1fr */
type Props = {
  /** A 24×24 Lucide SVG (stroke currentColor, width 1.4) */
  icon: ReactNode
  title: string
  description: ReactNode
  /** Optional content rendered after the Text stack, inside the same card (the caller styles it) */
  extra?: ReactNode
  /** Anchor id on the card frame */
  id?: string
  className?: string
  /** The instance's own appearEffect (ComponentInstanceNode level), if any */
  appear?: AppearEffect
}

export function IconCard({ icon, title, description, extra, id, className = "", appear }: Props) {
  const cls = `${styles.card} ${className}`
  const inner = (
    <>
      <div className={styles.iconCircle}>
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      </div>
      <div className={styles.text}>
        <h3 className={`t-h5 ${styles.title}`}>{title}</h3>
        <p className={`t-body-lg ${styles.description}`}>{description}</p>
      </div>
      {extra}
    </>
  )
  if (appear) {
    return (
      <Appear id={id} className={cls} effect={appear}>
        {inner}
      </Appear>
    )
  }
  return (
    <div id={id} className={cls}>
      {inner}
    </div>
  )
}

import type { ReactNode } from "react"
import { Appear, type AppearEffect } from "../lib/motion"
import styles from "./ContentCard.module.css"

/* Framer "Content Card" component (h3PijSECn): single "Default" variant jmO3Qg7ls, no gesture variants.
   Variables: Image DGRHOTwnI (responsiveimage) · Title Rr96IsBGP · Description EjRugmKk7
   Default frame: vertical stack, width 350 (instances override to 1fr), height auto, radius 4px, overflow hidden,
   variant transition spring 0.4s bounce 0.2 (unused: no other variants).
     Image ogFtqGf_s: width 1fr, aspectRatio 1.46, fill = Image (cover, centered)
     Container cq2X7rb2x: fill Elevation Strong, padding 32px 24px, gap 12px, vertical
       Heading enrkI1SQ0: horizontal, gap 12px, align center, width 1fr
         Indicator ZxCLBhhwi: 8×14, radius 9999px, fill Yellow
         Title UzrNw3S_i: H4 preset (qtCKPWAzU), width 1fr
       Description D18pPODKO: Body Large preset (nBG6kvhVn), width 1fr */
type Props = {
  image?: string
  /** A rendered illustration in place of the image */
  visual?: ReactNode
  alt?: string
  title: string
  /** Plain text, or marked-up copy (`<Mono>`, `<Ref>`, or several `<p>` for a multi-paragraph description) */
  description: ReactNode
  className?: string
  /** The instance's own appearEffect (ComponentInstanceNode level), if any */
  appear?: AppearEffect
}

export function ContentCard({ image, visual, alt = "", title, description, className = "", appear }: Props) {
  const cls = `${styles.card} ${className}`
  /* A string stays the template's single <p>; marked-up copy may carry its own <p>s, so it gets a <div> wrapper */
  const Description = typeof description === "string" ? "p" : "div"
  const inner = (
    <>
      <div className={styles.image}>
        {visual ?? <img src={image} alt={alt} loading="lazy" decoding="async" />}
      </div>
      <div className={styles.container}>
        <div className={styles.heading}>
          <span className={styles.indicator} aria-hidden="true" />
          <h4 className={`t-h4 ${styles.title}`}>{title}</h4>
        </div>
        <Description className={`t-body-lg ${styles.description}`}>{description}</Description>
      </div>
    </>
  )
  if (appear) {
    return (
      <Appear className={cls} effect={appear}>
        {inner}
      </Appear>
    )
  }
  return <div className={cls}>{inner}</div>
}

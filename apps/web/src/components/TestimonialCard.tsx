import type { ReactNode } from "react"
import styles from "./TestimonialCard.module.css"

/* Framer "Testimonial card" component (X7Qb3GfH2): single variant "Default" (kzc40LWU1).
   Variables: Image IvjlRaQJR · Text r722ImUEn · Name PQApz8a4p · Position vtzwPZVSM.
   Card: fill Elevation Strong, padding 32, gap 16, radius 2, overflow hidden, vertical stack
   (the quote at the top; the divider and the User row pinned to the bottom when the grid stretches the card).
   Children: Text (Body Large, p) → Divider (Elevation Medium, 1fr wide, empty auto-stack = 1px)
   → User (horizontal, gap 12, center): Avatar 48×48 radius 999 (image fill, cover)
   + Name and position (vertical, 1fr, overflow hidden): Name (H6, h6) + Position (Body Small, p).
   No hover/pressed variants exist on the component.
   Refill (REFILL-V2 rule 6): `label` adds a text-weak Body Small line under Position
   ("verbatim" / "paraphrase" + a small "source" link). Geometry is unchanged. */
export type TestimonialCardProps = {
  image: string
  imageAlt?: string
  text: ReactNode
  name: string
  position: string
  /** Small text-weak line under Position, e.g. "verbatim · source". */
  label?: ReactNode
  className?: string
}

export function TestimonialCard({ image, imageAlt = "", text, name, position, label, className = "" }: TestimonialCardProps) {
  return (
    <div className={`${styles.card} ${className}`}>
      <p className={`t-body-lg ${styles.text}`}>{text}</p>
      <div className={styles.divider} aria-hidden="true" />
      <div className={styles.user}>
        <img className={styles.avatar} src={image} alt={imageAlt} width={48} height={48} loading="lazy" decoding="async" />
        <div className={styles.meta}>
          <h6 className={`t-h6 ${styles.name}`}>{name}</h6>
          <p className={`t-body-sm ${styles.position}`}>{position}</p>
          {label !== undefined && <p className={`t-body-sm ${styles.label}`}>{label}</p>}
        </div>
      </div>
    </div>
  )
}

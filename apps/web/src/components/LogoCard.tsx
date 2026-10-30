import styles from "./LogoCard.module.css"

/* Framer "Logo Card" component (pIEASCV9k), variant Default (zxubIPaDB)
   146×112, fill Elevation Strong, radius 4px, overflow hidden, centered;
   child "Airtable" frame 64×64 (aspectRatio 1) filled by the `Logo` image variable (ZJiBsBYZB).
   No hover/pressed variants.
   Refill extension: with `label` the card renders a centred `.t-h6` text mark instead of the image
   (same size, fill and radius); `mono` sets the label in the monospace face (commands, brief §2 rule 6). */
type Props = { src?: string; alt?: string; label?: string; mono?: boolean; className?: string }

export function LogoCard({ src, alt = "", label, mono, className = "" }: Props) {
  return (
    <div className={`${styles.card} ${className}`}>
      {label !== undefined ? (
        <p className={`t-h6 ${mono ? "mono" : ""} ${styles.label}`} aria-hidden={alt ? undefined : true}>
          {label}
        </p>
      ) : (
        <div className={styles.logo} style={{ backgroundImage: `url("${src}")` }} role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} />
      )}
    </div>
  )
}

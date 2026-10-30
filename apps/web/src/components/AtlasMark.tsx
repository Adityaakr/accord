import { useId } from "react"
import styles from "./AtlasMark.module.css"

/* Accord Atlas mark: an "A" drawn as two meridians meeting at the pole, standing on a horizon line that runs edge to
   edge (the crossbar), in brushed silver on a dark glass tile. Metallic edge, inner top highlight, and, with `live`,
   a soft light sheen that glides across the glass every few seconds (still under reduced motion). Monochrome by
   design so it reads as a product mark rather than an accent. */
export function AtlasMark({ size = 20, live = false }: { size?: number; live?: boolean }) {
  const id = useId().replace(/:/g, "")
  const tile = `gbt-${id}`, edge = `gbe-${id}`, metal = `gbm-${id}`, sheen = `gbs-${id}`, clip = `gbc-${id}`
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`${styles.mark} ${live ? styles.live : ""}`}>
      <defs>
        <linearGradient id={tile} x1="12" y1="1" x2="12" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2b2d31" />
          <stop offset="1" stopColor="#121315" />
        </linearGradient>
        <linearGradient id={edge} x1="3" y1="1" x2="21" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id={metal} x1="7" y1="6" x2="17" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#d9dce0" />
          <stop offset="1" stopColor="#8e949b" />
        </linearGradient>
        <linearGradient id={sheen} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={clip}><rect x="1" y="1" width="22" height="22" rx="6.5" /></clipPath>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="6.5" fill={`url(#${tile})`} />
      <g clipPath={`url(#${clip})`}>
        <ellipse cx="12" cy="1.5" rx="10" ry="5" fill="#fff" opacity="0.07" />
        {live ? <rect className={styles.sheen} x="-14" y="-4" width="9" height="32" fill={`url(#${sheen})`} transform="rotate(20 12 12)" /> : null}
      </g>
      <rect x="1.5" y="1.5" width="21" height="21" rx="6" stroke={`url(#${edge})`} strokeWidth="1" />
      {/* An A drawn as two meridians meeting at the pole, standing on a horizon that runs edge to edge */}
      <path d="M8 16.6C8.4 11.6 9.7 7.6 12 5.2c2.3 2.4 3.6 6.4 4 11.4" stroke={`url(#${metal})`} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.6 13.4h16.8" stroke={`url(#${metal})`} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.9" />
      <path d="M5.5 16.6h13" stroke="#fff" strokeOpacity="0.18" strokeWidth="0.9" strokeLinecap="round" />
      <circle cx="12" cy="5.2" r="1.1" fill="#fff" />
    </svg>
  )
}

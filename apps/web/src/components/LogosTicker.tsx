import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react"
import { motion, useAnimationFrame, useInView, useMotionTemplate, useMotionValue, useReducedMotion } from "motion/react"
import { LogoCard } from "./LogoCard"
import styles from "./LogosTicker.module.css"

/* Framer "Logos ticker" canvas component (xDC8qSvur), variant Default (OKdp7nI7b):
   horizontal stack, gap 10, center/center, overflow clip, width 1080 (instance → 1fr), height auto.
   Its only child (ktrAbjmLh) is Framer's code `Ticker` component (B2xAlJLcN0gOnt11mSPw), 1fr × 112px, with:
     speed 30 (px/s) · direction "left" · alignment "center" · gap 12 · padding 0
     hoverFactor 0.6 (playback speed while hovered)
     fadeOptions { fadeContent true, overflow false (→ hidden), fadeWidth 25%, fadeInset 0%, fadeAlpha 0 }
     sizingOptions { widthType true, heightType true }
   Slots (9 Logo Card instances, 146×112, in order):
     Microsoft · Make · Drive · Airtable (card default) · Monday · Intercom · Zapier · Confluence · Flatfile */

/* A slot is either an image logo (`src`) or, for the refill, a text mark (`label`, optionally `mono`) rendered by LogoCard */
export type TickerSlot = { name: string; src?: string; label?: string; mono?: boolean }

export const TICKER_LOGOS: TickerSlot[] = [
  { name: "Microsoft", src: "/assets/logo-microsoft.png" },
  { name: "Make", src: "/assets/logo-make.png" },
  { name: "Drive", src: "/assets/logo-drive.png" },
  { name: "Airtable", src: "/assets/logo-airtable.png" },
  { name: "Monday", src: "/assets/logo-monday.png" },
  { name: "Intercom", src: "/assets/logo-intercom.png" },
  { name: "Zapier", src: "/assets/logo-zapier.png" },
  { name: "Confluence", src: "/assets/logo-confluence.png" },
  { name: "Flatfile", src: "/assets/logo-flatfile.png" },
]

type Props = {
  logos?: TickerSlot[]
  /** px per second (Framer Ticker `speed`) */
  speed?: number
  /** playback multiplier while hovered (Framer Ticker `hoverFactor`) */
  hoverFactor?: number
  direction?: "left" | "right"
  gap?: number
  fade?: { fadeContent: boolean; overflow: boolean; fadeWidth: number; fadeInset: number; fadeAlpha: number }
  className?: string
}

const DEFAULT_FADE = { fadeContent: true, overflow: false, fadeWidth: 25, fadeInset: 0, fadeAlpha: 0 }

export function LogosTicker({ logos = TICKER_LOGOS, speed = 30, hoverFactor = 0.6, direction = "left", gap = 12, fade = DEFAULT_FADE, className = "" }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const [copyWidth, setCopyWidth] = useState(0)
  const [copies, setCopies] = useState(2)
  const hovering = useRef(false)
  const reduced = useReducedMotion()
  const inView = useInView(rootRef, { amount: 0 })

  /* Measure one copy of the slots (incl. its trailing gap) and how many copies are needed to cover the viewport + 1 */
  useLayoutEffect(() => {
    const root = rootRef.current, copy = copyRef.current
    if (!root || !copy) return
    const measure = () => {
      const w = copy.offsetWidth
      setCopyWidth(w)
      setCopies(w > 0 ? Math.max(2, Math.ceil(root.offsetWidth / w) + 1) : 2)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    ro.observe(copy)
    return () => ro.disconnect()
  }, [logos, gap])

  /* Same model as Framer's Ticker: a linear motion value advanced each frame at `speed` px/s,
     playback rate = hoverFactor while hovered, looping once one copy has scrolled past. */
  const x = useMotionValue(0)
  useEffect(() => {
    x.set(direction === "right" && copyWidth ? -copyWidth : 0)
  }, [direction, copyWidth, x])

  useAnimationFrame((_, delta) => {
    if (reduced || !inView || !copyWidth) return
    const dt = Math.min(delta, 100) / 1000
    const rate = hovering.current ? hoverFactor : 1
    const move = speed * dt * rate
    let next = x.get() + (direction === "left" ? -move : move)
    if (direction === "left") { if (next <= -copyWidth) next += copyWidth }
    else if (next >= 0) next -= copyWidth
    x.set(next)
  })
  const transform = useMotionTemplate`translateX(${x}px)`

  const maskStyle: CSSProperties = {}
  if (fade.fadeContent) {
    const mask = `linear-gradient(to right, rgba(0, 0, 0, ${fade.fadeAlpha}) ${fade.fadeInset}%, rgba(0, 0, 0, 1) ${fade.fadeWidth}%, rgba(0, 0, 0, 1) ${100 - fade.fadeWidth}%, rgba(0, 0, 0, ${fade.fadeAlpha}) ${100 - fade.fadeInset}%)`
    maskStyle.maskImage = mask
    maskStyle.WebkitMaskImage = mask
  }
  if (fade.overflow) maskStyle.overflow = "visible"

  return (
    <div className={`${styles.root} ${className}`}>
      <div
        ref={rootRef}
        className={styles.ticker}
        style={maskStyle}
        onMouseEnter={() => { hovering.current = true }}
        onMouseLeave={() => { hovering.current = false }}
      >
        <motion.div className={styles.track} style={{ transform }}>
          {Array.from({ length: copies }, (_, c) => (
            <div key={c} ref={c === 0 ? copyRef : undefined} className={styles.copy} style={{ gap, paddingRight: gap }} aria-hidden={c > 0 ? true : undefined}>
              {logos.map((l, i) => (
                <LogoCard key={`${c}-${i}`} src={l.src} label={l.label} mono={l.mono} alt={c === 0 ? l.name : ""} />
              ))}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

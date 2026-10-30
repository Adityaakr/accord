import { Appear, type AppearEffect } from "../lib/motion"
import styles from "./Dots.module.css"

/* The "Dots" background frame used by Hero/Features/Benefits/Reviews/CTA:
   absolute, left 0, top 0, 920×780, fill = dots.png (2602×1566), z-index 0.
   Some sections give it an appearEffect (Features: y 40, 1s, delay 0.4s, ease [0.12,0.23,0.17,0.99]). */
export function Dots({ effect, className = "" }: { effect?: AppearEffect; className?: string }) {
  if (effect) return <Appear className={`${styles.dots} ${className}`} effect={effect} aria-hidden="true" />
  return <div className={`${styles.dots} ${className}`} aria-hidden="true" />
}

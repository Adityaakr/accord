import { motion, type Transition } from "motion/react"
import { EASE_UI } from "../lib/motion"
import styles from "./FormButton.module.css"

/* Framer "Form Button" component (LfcphVkGA): variants:
     Default  HNaGSL8BR (primary): htmlTag button, fill White, horizontal stack centered, padding 8px 12px, radius 8px,
              width/height auto, variant transition tween 0.2s ease [0.44,0,0.56,1]
       Label   Xz_H6Vb95: "Submit", Link preset (fqtZzlFtC), user-select none
       Spinner kE1HkNSa3: 20×20, hidden, alpha mask "Spinner Mask.svg" (ring)
         Conic PBEZRcR1P: 20×20 pinned right 0 / bottom 0,
               fill conic-gradient(from 0deg at 50% 50%, rgb(0,0,0) 7.2086deg, rgba(0,0,0,0.7) 342deg),
               loopEffect rotate 360, repeat loop, tween 1s linear [0,0,1,1], repeatDelay 0
           Rounding H3ogQFFH2: 2×2, radius 1px, fill Text Strong (round cap of the 2px ring stroke)
     hover    kUavjChYN (gesture, inherits Default): boxShadow 0 0 0 2px rgba(255,255,255,0.5)
     pressed  yUI2q8MBc (gesture, inherits Default): boxShadow 0 0 0 2px rgba(255,255,255,0.7)
     Loading  CqDOqLP8H: Label hidden, Spinner visible
     Disabled cpSznsH4H: opacity 0.5
     Success  lZoMH0RkI: identical to Default
     Error    G87fQHscc: fill rgba(255,34,68,0.15), label "Submission failed" rgb(255,34,68)
   Gesture variants only inherit from Default, so the ring is applied in the Default state only. */
export type FormButtonState = "default" | "loading" | "disabled" | "success" | "error"

const VARIANT: Transition = { type: "tween", ease: EASE_UI, duration: 0.2 }
const SPIN: Transition = { type: "tween", ease: [0, 0, 1, 1], duration: 1, delay: 0, repeat: Infinity, repeatType: "loop", repeatDelay: 0 }

type Props = {
  state?: FormButtonState
  label?: string
  /** Text shown beside the spinner while Loading (spec §3.7 "Sending to the agent"); the template hides the label when unset. */
  loadingLabel?: string
  errorLabel?: string
  className?: string
  type?: "submit" | "button"
}

export function FormButton({ state = "default", label = "Submit", loadingLabel, errorLabel = "Submission failed", className = "", type = "submit" }: Props) {
  const isDefault = state === "default"
  const isLoading = state === "loading"
  const isError = state === "error"
  return (
    <motion.button
      type={type}
      className={`${styles.button} ${className}`}
      style={{ borderRadius: 8 }}
      layout
      transition={VARIANT}
      initial={false}
      animate={{ backgroundColor: isError ? "rgba(255, 34, 68, 0.15)" : "var(--white)", opacity: state === "disabled" ? 0.5 : 1 }}
      whileHover={isDefault ? { boxShadow: "0px 0px 0px 2px rgba(var(--ink-rgb), 0.5)" } : undefined}
      whileTap={isDefault ? { boxShadow: "0px 0px 0px 2px rgba(var(--ink-rgb), 0.7)" } : undefined}
      disabled={isLoading || state === "disabled"}
      aria-busy={isLoading || undefined}
      data-state={state}
    >
      {/* Spinner kE1HkNSa3: visible only in Loading (leads the loading label when there is one) */}
      {isLoading && (
        <motion.span layout="position" className={styles.spinner} aria-hidden="true">
          <motion.span className={styles.conic} initial={{ rotate: 0 }} animate={{ rotate: 360 }} transition={SPIN}>
            <span className={styles.rounding} />
          </motion.span>
        </motion.span>
      )}
      {/* Label Xz_H6Vb95: visible:false in Loading, unless a loading label is given */}
      {(!isLoading || loadingLabel) && (
        <motion.span layout="position" className={`t-link ${styles.label} ${isError ? styles.labelError : ""}`}>
          {isLoading ? loadingLabel : isError ? errorLabel : label}
        </motion.span>
      )}
    </motion.button>
  )
}

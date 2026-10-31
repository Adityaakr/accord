import { motion, type Transition, type HTMLMotionProps, useReducedMotion } from "motion/react"
import type { ReactNode } from "react"

/* ------------------------------------------------------------------
   Framer-canvas → motion mappings. Values are copied from the Framer
   project's JSON so timings/easings are identical to the published site.
------------------------------------------------------------------- */

export type FramerTween = { type: "tween"; ease: [number, number, number, number]; duration: `${number}s`; delay?: `${number}s` }
export type FramerSpringDuration = { type: "spring"; duration: `${number}s`; bounce: number; delay?: `${number}s` }
export type FramerSpringPhysics = { type: "spring"; stiffness: number; damping: number; mass: number; delay?: `${number}s` }
export type FramerTransition = FramerTween | FramerSpringDuration | FramerSpringPhysics

const s = (v?: `${number}s`) => (v ? parseFloat(v) : 0)

/** Convert a Framer transition object to a motion Transition. */
export function toTransition(t: FramerTransition | undefined): Transition {
  if (!t) return { duration: 0 }
  if (t.type === "tween") return { type: "tween", ease: t.ease, duration: s(t.duration), delay: s(t.delay) }
  if ("stiffness" in t) return { type: "spring", stiffness: t.stiffness, damping: t.damping, mass: t.mass, delay: s(t.delay) }
  return { type: "spring", duration: s(t.duration), bounce: t.bounce, delay: s(t.delay) }
}

/* The two transitions used throughout the project */
export const EASE_APPEAR: [number, number, number, number] = [0.12, 0.23, 0.5, 1]
export const EASE_APPEAR_SLOW: [number, number, number, number] = [0.12, 0.23, 0.17, 0.99]
export const EASE_UI: [number, number, number, number] = [0.44, 0, 0.56, 1]
export const SPRING_UI: Transition = { type: "spring", duration: 0.4, bounce: 0.2 }

/* ------------------------------------------------------------------
   <Appear>: Framer `appearEffect` (trigger onInView, replay false).
   Default = the project's standard: opacity 0 → 1, y 32 → 0, 1s tween.
------------------------------------------------------------------- */
export type AppearEffect = {
  threshold?: number
  replay?: boolean
  enter?: { opacity?: number; x?: number; y?: number; scale?: number; rotate?: number; transition?: FramerTransition & { stagger?: `${number}s` } }
}

type AppearProps = {
  /** HTML tag to render (motion.<tag>); default div */
  as?: keyof HTMLElementTagNameMap
  effect?: AppearEffect
  /** Override the delay (seconds), e.g. for staggered children */
  delay?: number
  children?: ReactNode
} & Omit<HTMLMotionProps<"div">, "children" | "ref">

export const DEFAULT_APPEAR: AppearEffect = {
  threshold: 0.5,
  replay: false,
  enter: { opacity: 0, x: 0, y: 32, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1s", delay: "0s" } },
}

export function Appear({ as, effect = DEFAULT_APPEAR, delay, children, ...rest }: AppearProps) {
  const Tag = (as ? (motion as any)[as] : motion.div) as typeof motion.div
  /* Reduced motion: content is visible from the first paint, never faded or moved in. */
  const reduce = useReducedMotion()
  if (reduce) return <Tag {...rest}>{children}</Tag>
  const e = effect.enter ?? DEFAULT_APPEAR.enter!
  const transition = toTransition(e.transition)
  if (delay !== undefined) transition.delay = delay
  return (
    <Tag
      initial={{ opacity: e.opacity ?? 1, x: e.x ?? 0, y: e.y ?? 0, scale: e.scale ?? 1, rotate: e.rotate ?? 0 }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
      viewport={{ once: !(effect.replay ?? false), amount: clampAmount(effect.threshold ?? 0.5) }}
      transition={transition}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/* IntersectionObserver threshold, capped low so a block taller than the viewport still reveals (a 50% threshold
   never fires for an element more than twice the viewport's height, leaving it invisible). */
function clampAmount(threshold: number) {
  return Math.min(Math.max(threshold, 0), 0.15)
}

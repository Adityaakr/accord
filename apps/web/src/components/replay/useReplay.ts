import { useCallback, useEffect, useRef, useState } from "react"
import { useInView, useReducedMotion } from "motion/react"

/* A replay is a count of stages, 0 (nothing shown) to `max` (the complete record). It starts the first time the
   figure is in view, advances one stage after `delay(stage)` ms, pauses while off screen and holds at the end.
   Replay starts again from 0. Reduced motion: always the complete record, nothing moves. */
export function useReplay(max: number, delay: (stage: number) => number) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion() ?? false
  const inView = useInView(ref, { amount: 0.3 })
  const [stage, setStage] = useState(0)
  const [started, setStarted] = useState(false)
  const [run, setRun] = useState(0)

  useEffect(() => { if (inView) setStarted(true) }, [inView])

  useEffect(() => {
    if (reduce || !started || !inView || stage >= max) return
    const t = window.setTimeout(() => setStage((s) => Math.min(s + 1, max)), delay(stage))
    return () => window.clearTimeout(t)
  }, [reduce, started, inView, stage, max, delay, run])

  const replay = useCallback(() => { setStage(0); setStarted(true); setRun((r) => r + 1) }, [])

  return { ref, stage: reduce ? max : stage, reduce, run, replay, done: reduce || stage >= max }
}

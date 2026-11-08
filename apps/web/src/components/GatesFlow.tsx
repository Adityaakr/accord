import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "motion/react"
import styles from "./GatesFlow.module.css"

/* "Claims and their limits": the control plane as gates (kit gates.svg, every label and error code verbatim), redrawn
   in HTML so it reads at any width: a row of hairline gates over one rail, each gate's named errors under it and a
   dotted drop into the public refusal log. Below ~720px of width it turns 90 degrees: gates stack down the rail and the
   log stands to their right.
   Motion (only while on screen): a request token rides the rail and each gate lights teal as it passes. The loop
   alternates a request that passes all six and is paid, and one refused at Recipient: that gate and ERR_PAYEE_MISMATCH
   turn the refusal red, a dot drops into the log and the log shows the entry (blur crossfade). Red is used only for the
   refusal. Reduced motion, or off screen: the static drawing, nothing moves. Every state keeps the same box sizes. */

type Gate = { name: string; codes: { code: string; note?: boolean }[] }
const GATES: Gate[] = [
  { name: "Key and state", codes: [{ code: "ERR_REVOKED" }, { code: "ERR_NOT_EXECUTING" }, { code: "other keys: rejected", note: true }] },
  { name: "Recipient", codes: [{ code: "ERR_CANARY → revoke" }, { code: "ERR_NO_RECIPIENT" }, { code: "ERR_PAYEE_MISMATCH" }] },
  { name: "Item", codes: [{ code: "ERR_UNKNOWN_ITEM" }, { code: "ERR_ALREADY_PAID" }] },
  { name: "Evidence", codes: [{ code: "ERR_NOT_DUE" }, { code: "ERR_PERIOD_WITHHELD" }] },
  { name: "Amount", codes: [{ code: "ERR_AMOUNT_MISMATCH" }, { code: "ERR_CAP_EXCEEDED" }, { code: "ERR_INSUFFICIENT_FUNDS" }] },
  { name: "Lock", codes: [{ code: "ERR_IN_FLIGHT" }] },
]

/* The refused run: stops at Recipient on ERR_PAYEE_MISMATCH */
const REFUSE_AT = 1
const REFUSE_CODE = 2

const EASE: [number, number, number, number] = [0.45, 0, 0.2, 1]
const EASE_OUT: [number, number, number, number] = [0.12, 0.23, 0.5, 1]

type Phase = { lit: number; stop: number | null; paid: boolean; logged: boolean }
const REST: Phase = { lit: -1, stop: null, paid: false, logged: false }

const Chevron = () => (
  <svg viewBox="0 0 18 16" aria-hidden="true"><path d="M1.5 1.5h9.5l5.5 6.5-5.5 6.5H1.5L7 8z" /></svg>
)

export function GatesFlow() {
  const reduce = useReducedMotion() ?? false
  const root = useRef<HTMLDivElement>(null)
  const flow = useRef<HTMLDivElement>(null)
  const nodes = useRef<(HTMLSpanElement | null)[]>([])
  const drops = useRef<(HTMLSpanElement | null)[]>([])
  const inView = useInView(root, { amount: 0.35 })
  const [phase, setPhase] = useState<Phase>(REST)
  const [tone, setTone] = useState<"go" | "stop">("go")

  const tx = useMotionValue(0), ty = useMotionValue(0), to = useMotionValue(0), tb = useMotionValue(6)
  const dx = useMotionValue(0), dy = useMotionValue(0), dop = useMotionValue(0)
  const blur = useTransform(tb, (b) => `blur(${b.toFixed(2)}px)`)

  /* Centre of an element, in the flow's coordinates */
  const at = useCallback((el: Element | null | undefined): [number, number] => {
    const f = flow.current
    if (!el || !f) return [0, 0]
    const a = el.getBoundingClientRect(), b = f.getBoundingClientRect()
    return [a.left - b.left + a.width / 2, a.top - b.top + a.height / 2]
  }, [])

  useLayoutEffect(() => { setPhase(REST) }, [reduce])

  useEffect(() => {
    if (reduce || !inView) { setPhase(REST); to.set(0); dop.set(0); return }
    let live = true
    const running: { stop: () => void }[] = []
    const wait = (ms: number) => new Promise<void>((res) => { const t = window.setTimeout(res, ms); running.push({ stop: () => window.clearTimeout(t) }) })
    const go = (mv: MotionValue<number>, v: number, o: Parameters<typeof animate>[2]) => {
      const c = animate(mv, v, o as never); running.push(c); return c
    }
    const blurIn = (o: MotionValue<number>, b: MotionValue<number>) => Promise.all([go(o, 1, { duration: 0.35, ease: EASE_OUT }), go(b, 0, { duration: 0.35, ease: EASE_OUT })])

    const run = async () => {
      let refused = false
      await wait(500)
      while (live) {
        setPhase(REST); setTone("go"); dop.set(0)
        const origin = at(flow.current?.querySelector(`.${styles.origin}`))
        tx.set(origin[0]); ty.set(origin[1]); tb.set(6)
        await blurIn(to, tb)
        const last = refused ? REFUSE_AT : GATES.length
        for (let i = 0; i <= last && live; i++) {
          const [x, y] = at(nodes.current[i])
          await Promise.all([go(tx, x, { duration: i === 0 ? 0.5 : 0.62, ease: EASE }), go(ty, y, { duration: i === 0 ? 0.5 : 0.62, ease: EASE })])
          if (!live) return
          if (refused && i === REFUSE_AT) {
            setTone("stop"); setPhase({ ...REST, lit: i - 1, stop: i })
            await wait(420)
            const d = drops.current[i]
            if (d) {
              const r = d.getBoundingClientRect(), f = flow.current!.getBoundingClientRect()
              const down = r.height >= r.width
              const sx = r.left - f.left + (down ? 0.5 : 0), sy = r.top - f.top + (down ? 0 : 0.5)
              dx.set(sx); dy.set(sy); dop.set(1)
              await (down ? go(dy, sy + r.height, { duration: 0.7, ease: [0.5, 0, 0.75, 0] }) : go(dx, sx + r.width, { duration: 0.6, ease: [0.5, 0, 0.75, 0] }))
              dop.set(0)
            }
            setPhase({ ...REST, lit: i - 1, stop: i, logged: true })
            await wait(2600)
          } else if (i === GATES.length) {
            setPhase({ ...REST, lit: i - 1, paid: true })
            await wait(2000)
          } else {
            setPhase((p) => ({ ...p, lit: i }))
            await wait(140)
          }
        }
        if (!live) return
        await Promise.all([go(to, 0, { duration: 0.4, ease: EASE_OUT }), go(tb, 6, { duration: 0.4, ease: EASE_OUT })])
        setPhase(REST)
        await wait(700)
        refused = !refused
      }
    }
    run()
    return () => { live = false; running.forEach((c) => c.stop()); to.set(0); dop.set(0) }
  }, [reduce, inView, at, tx, ty, to, tb, dx, dy, dop])

  const gateState = (i: number) => (phase.stop === i ? "stop" : i <= phase.lit ? "lit" : "idle")

  return (
    <div ref={root} className={styles.plate} role="figure" aria-label="The control plane as gates: every payment request from the agent's single key passes six checks in a fixed order, key and state, recipient, item, evidence, amount and the payment lock; any gate refuses with a named error into the public refusal log, and only a request that passes all six is paid, by the agreement's own account.">
      <p className={styles.kicker}>The control plane as gates · every request, the same order, no gate skipped</p>
      <div className={styles.request}>
        <code className={styles.call}>act(Pay{"{"}item, amount, recipient{"}"})</code>
        <span className={styles.from}>from the agent's one key, which can call this one method</span>
      </div>

      <div ref={flow} className={styles.flow}>
        <span className={styles.origin} aria-hidden="true" />
        <span className={styles.rail} aria-hidden="true" />
        <ol className={styles.gates} aria-label="Six gates, in order; any gate refuses with a named error into the public refusal log">
          {GATES.map((g, i) => {
            const s = gateState(i)
            return (
              <li key={g.name} className={styles.gate} data-state={s}>
                <span className={styles.node} ref={(el) => { nodes.current[i] = el }}><Chevron /></span>
                <span className={styles.name}>{g.name}</span>
                <ul className={styles.codes}>
                  {g.codes.map((c, k) => (
                    <li key={c.code} className={`${c.note ? styles.note : styles.code} ${s === "stop" && i === REFUSE_AT && k === REFUSE_CODE ? styles.hit : ""}`}>{c.code}</li>
                  ))}
                </ul>
                <span className={styles.drop} aria-hidden="true" ref={(el) => { drops.current[i] = el }} />
              </li>
            )
          })}
          <li className={styles.pay} data-state={phase.paid ? "paid" : "idle"}>
            <span className={`${styles.node} ${styles.payNode}`} ref={(el) => { nodes.current[GATES.length] = el }}><span /></span>
            <span className={styles.name}>Pay</span>
            <span className={styles.payNote}>ft_transfer, locked</span>
          </li>
        </ol>

        <div className={styles.log} data-state={phase.logged ? "entry" : "idle"}>
          <span className={styles.logTitle}>Public refusal log</span>
          <span className={styles.logBody}>
            <span className={styles.logRest}>every refusal is an on-chain event with its reason · nothing was sent</span>
            <span className={styles.logEntry} aria-hidden="true"><code>ERR_PAYEE_<wbr />MISMATCH</code> at Recipient · nothing was sent</span>
          </span>
        </div>

        {!reduce ? (
          <>
            <motion.span className={`${styles.token} ${tone === "stop" ? styles.tokenStop : ""}`} aria-hidden="true"
              style={{ x: tx, y: ty, opacity: to, filter: blur }} />
            <motion.span className={styles.dropDot} aria-hidden="true" style={{ x: dx, y: dy, opacity: dop }} />
          </>
        ) : null}
      </div>

      <p className={styles.foot}>The agent cannot reorder, skip or argue with a gate. Humans change the inputs (approve an exception, accept a new recipient); the gates stay the same.</p>
    </div>
  )
}

import { useEffect, useRef, useState } from "react"
import { useInView, useReducedMotion } from "motion/react"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { SectionHeading } from "../components/SectionHeading"
import { PixelIcon, type PixelName } from "../components/PixelIcon"
import ab from "./AudienceBand.module.css"
import { BOUNDS, Course, DUR, STARTS, stationAt } from "./HowCourse"
import styles from "./HowSteps.module.css"

/* How it works (#how): how any deal room works, whatever the agreement type (rebuilt 8 Nov 2026 to the motion-graphics
   explainer-engaging skill). The band's tab row and stage hold one card: the current step on the left (what happens,
   who acts, what goes on NEAR, what cannot happen) and on the right the course (HowCourse): one hero travelling
   through six stations that react to it, with a following camera and a pull-out reveal. One clock drives the course,
   the active tab and the step text; choosing a tab moves the clock there; hover pauses; reduced motion shows each
   station at rest and does not advance. Every step's text stays in the DOM for agents and screen readers. */

const APPEAR: AppearEffect = {
  threshold: 0.2,
  replay: false,
  enter: { opacity: 0, x: 0, y: 24, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1.1s", delay: "0s" } },
}
const STEP_MS = 7500

type Step = {
  n: string; icon: PixelName; title: string; short: string; state: string
  body: string; who: string; onChain: string; never: string
  answer: string
}

const STEPS: Step[] = [
  {
    n: "01", icon: "vault", title: "Sealed", short: "Each side seals its limits", state: "Sealed",
    body: "Each company sets its limits in the browser, such as a price ceiling or floor and the conditions it needs, and seals them. A mandate is encrypted to a key that exists only inside the Sealed Table's enclave.",
    who: "Each company, in its own browser", onChain: "Each sealed mandate as ciphertext, with its commitment hash", never: "The other side, the operator or the app reading the numbers",
    answer: "Both mandates sealed. Neither side sees the other's limits.",
  },
  {
    n: "02", icon: "agents", title: "Attested", short: "Agents negotiate in the enclave", state: "Attested",
    body: "Both companies' agents negotiate inside the Sealed Table, an attested enclave. Code checks every proposal against both mandates' hard limits, and only the agreed terms come out, with an attestation anyone can verify.",
    who: "Both agents, inside the enclave", onChain: "The agreed terms, the sealed outcome and the attestation", never: "Terms outside either side's limits; a mandate leaving the enclave",
    answer: "Terms agreed inside both limits, with an attestation.",
  },
  {
    n: "03", icon: "bank", title: "Approved", short: "Both companies approve and fund", state: "Executing",
    body: "People at both companies read the terms and approve them. Payee binds the recipient: the vendor proves its domain, its settlement authority approves the account and the buyer accepts it. The buyer then funds the agreement's USDC escrow on NEAR.",
    who: "A person at each company", onChain: "Both approvals, the authorised recipient and the escrowed USDC", never: "Terms taking effect before both sides approve",
    answer: "Approved by both companies. Recipient bound. Escrow funded.",
  },
  {
    n: "04", icon: "key", title: "Executing", short: "The agent pays inside the rules", state: "Executing",
    body: "The buyer's agent holds one key that can call one method, act. Each payment must match the approved milestone, amount and recipient; anything else is refused and recorded, whatever the agent was told.",
    who: "The buyer's agent, through act", onChain: "Every payment and every refusal with its reason", never: "A payment to another account, a different amount or an early payment",
    answer: "Payments inside the terms go through. Anything else is refused and recorded.",
  },
  {
    n: "05", icon: "chart", title: "Checked", short: "Evidence decides each payment", state: "Executing",
    body: "A payment becomes eligible only when the agreed evidence is recorded: observations of a market at hidden times or the buyer's acceptance of a delivery; a named reviewer's approval is planned. Otherwise it is withheld for both sides to review.",
    who: "An attested observer or the buyer (a named reviewer is planned); a keeper triggers scheduled steps", onChain: "Each observation or acceptance, and the result", never: "The keeper moving funds or changing an outcome",
    answer: "Evidence decides: eligible, or withheld for review.",
  },
  {
    n: "06", icon: "book", title: "Settled", short: "Paid, recorded, checkable", state: "Settled",
    body: "Eligible payments complete to the authorised recipient in USDC. The buyer decides any exception and can revoke the agent's key in one transaction, and the record remains for anyone to check with one command.",
    who: "The contract pays; the buyer decides exceptions", onChain: "The transfer, any exception and the full record", never: "A payment being reversed or redirected after the fact",
    answer: "Paid to the approved recipient, recorded and checkable.",
  },
]

/* one clock for the course, the tabs and the step text: seconds 0 … DUR, looping; paused on hover or out of view */
function useCourseClock(running: boolean, reduce: boolean) {
  const [t, setT] = useState(reduce ? STARTS[0] + 2.8 : 0)
  const at = useRef(0)
  useEffect(() => {
    if (reduce || !running) return
    let raf = 0, last = performance.now()
    const tick = (now: number) => {
      at.current = (at.current + (now - last) / 1000) % DUR
      last = now
      setT(at.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running, reduce])
  const seek = (v: number) => { at.current = v; setT(v) }
  return { t, seek }
}

export function HowSteps() {
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const [paused, setPaused] = useState(false)
  const running = !reduce && inView && !paused
  const { t, seek } = useCourseClock(running, reduce)
  const active = stationAt(t)
  const go = (n: number) => seek(reduce ? STARTS[n] + 2.8 : STARTS[n])
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const m = window.matchMedia("(max-width: 809.98px)")
    const on = () => setNarrow(m.matches)
    on(); m.addEventListener("change", on)
    return () => m.removeEventListener("change", on)
  }, [])
  const from = active === 0 ? 0 : BOUNDS[active - 1], to = active === 5 ? DUR : BOUNDS[active]
  const progress = Math.min(1, Math.max(0, (t - from) / (to - from)))

  return (
    <section ref={ref} id="how" className={`section ${styles.section}`}>
      <SectionHeading
        eyebrow="How it works"
        title="How a deal room works."
        accent="teal"
        wide
        lead={<p>One agreement from sealed limits to a settled payment, in six steps. Every agreement type runs the same way; only the terms and the evidence change.</p>}
      />

      <Appear as="div" className={styles.flow} effect={APPEAR}>
        <div className={ab.uses} role="tablist" aria-label="The six steps of a deal room">
          {STEPS.map((s, k) => (
            <button key={s.n} ref={(el) => { tabs.current[k] = el }} type="button" role="tab" id={`how-tab-${k}`} aria-controls={`how-panel-${k}`}
              aria-selected={k === active} tabIndex={k === active ? 0 : -1} title={s.short}
              className={`${ab.use} ${k === active ? ab.useOn : ""}`} onClick={() => go(k)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
                e.preventDefault()
                const n = (k + (e.key === "ArrowRight" ? 1 : STEPS.length - 1)) % STEPS.length
                go(n); tabs.current[n]?.focus()
              }}>
              <PixelIcon name={s.icon} size={22} />
              <span className={ab.useLabel}><span className={styles.tabNum}>{s.n}</span> {s.title}</span>
              {k === active && !reduce ? <span className={styles.tabBar} aria-hidden="true" style={{ transform: `scaleX(${progress})` }} /> : null}
            </button>
          ))}
        </div>

        <div className={ab.stage} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <span className={ab.weave} aria-hidden="true" />
          <span className={ab.sheen} aria-hidden="true" />
          <div className={styles.card}>
            <div className={styles.text}>
              {STEPS.map((s, k) => (
                <div key={s.n} role="tabpanel" id={`how-panel-${k}`} aria-labelledby={`how-tab-${k}`} hidden={k !== active} className={styles.panelText}>
                  <div className={styles.textHead}>
                    <span className={styles.tileLg}><PixelIcon name={s.icon} size={22} /></span>
                    <p className={`mono ${styles.kicker}`}>Step {s.n} of 06 · {s.state}</p>
                  </div>
                  <h3 className={styles.title}>{s.title}: {s.short.toLowerCase()}.</h3>
                  <p className={styles.body}>{s.body}</p>
                  <dl className={styles.facts}>
                    <div><dt>Who acts</dt><dd>{s.who}</dd></div>
                    <div><dt>On NEAR</dt><dd>{s.onChain}</dd></div>
                    <div className={styles.never}><dt>Cannot happen</dt><dd>{s.never}</dd></div>
                  </dl>
                </div>
              ))}
            </div>
            <div className={styles.courseCol}>
              <Course t={t} boost={narrow ? 1.15 : 1} />
              <p className={styles.answer}>{STEPS[active].answer}</p>
            </div>
          </div>
        </div>
      </Appear>
    </section>
  )
}

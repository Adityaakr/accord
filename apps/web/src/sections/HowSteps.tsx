import { useEffect, useRef, useState } from "react"
import { useInView, useReducedMotion } from "motion/react"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { SectionHeading } from "../components/SectionHeading"
import { PixelIcon, type PixelName } from "../components/PixelIcon"
import ab from "./AudienceBand.module.css"
import { PHASES, VISUAL } from "./HowVisuals"
import styles from "./HowSteps.module.css"

/* How it works (#how), rebuilt 8 Nov 2026 from the deal-room band's own pieces so the two read as one product: the
   band's tab row (pixel icon + label, teal timer bar), its stage (teal weave + light sheen), and on it one card. The
   card's left half explains the step (what happens, who acts, what goes on NEAR, what cannot happen); its right half
   is a live instrument for the step (HowVisuals: mandates sealing, offers meeting inside sealed ranges, approvals and
   escrow, requests meeting three checks, observations at hidden times, the payment and its receipt), then the answer
   sweeps in and the next step starts. Choosing a tab takes over; arrow keys move; reduced motion shows each step finished
   and does not advance. Every panel and every line stays in the DOM, so agents and screen readers read the whole flow.
   Example values are production-shaped (.near accounts, a vendor domain) and labelled illustrative. */

const APPEAR: AppearEffect = {
  threshold: 0.2,
  replay: false,
  enter: { opacity: 0, x: 0, y: 24, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1.1s", delay: "0s" } },
}

type TStep = { k: "call" | "event" | "think" | "out"; t: string; r?: string; bad?: boolean }
type Step = {
  n: string; icon: PixelName; title: string; short: string; state: string
  body: string; who: string; onChain: string; never: string
  answer: string; trace: TStep[]
}

const PHASE_MS = 1100 // each beat of a step's instrument
const DWELL = 3600 // after the last beat, before the next step
const runMs = (s: Step) => PHASES[s.n] * PHASE_MS + DWELL

const STEPS: Step[] = [
  {
    n: "01", icon: "vault", title: "Sealed", short: "Each side seals its limits", state: "Sealed",
    body: "Each company sets its limits in the browser, such as a price ceiling and the conditions it needs, and seals them. The mandate is encrypted to a key that exists only inside the Sealed Table's enclave.",
    who: "Each company, in its own browser", onChain: "The sealed mandate as ciphertext and its commitment hash", never: "The other side, the operator or the app reading the numbers",
    answer: "Both mandates sealed. Neither side sees the other's numbers.",
    trace: [
      { k: "call", t: "commit_mandate(buyer)", r: "ciphertext stored · commitment 9f3c…a1" },
      { k: "call", t: "commit_mandate(seller)", r: "ciphertext stored · commitment 41de…7b" },
      { k: "event", t: "enclave key check", r: "only the Sealed Table can open either mandate" },
    ],
  },
  {
    n: "02", icon: "agents", title: "Attested", short: "Agents negotiate in the enclave", state: "Attested",
    body: "Both companies' agents negotiate inside the Sealed Table, an attested enclave. Code checks every proposal against both mandates' hard limits, and the agreed terms come out with an attestation anyone can verify.",
    who: "Both agents, inside the enclave", onChain: "The agreed terms, the sealed outcome and the attestation", never: "Terms outside either side's limits; a mandate leaving the enclave",
    answer: "Terms agreed at 18,500 USDC a period, with an attestation.",
    trace: [
      { k: "call", t: "start_negotiation()", r: "Sealed Table job started" },
      { k: "think", t: "Halcyon asks 19,800. Counter at 18,000, inside our sealed ceiling." },
      { k: "event", t: "round 2", r: "18,500 USDC a period · inside both limits" },
      { k: "event", t: "on_sealed_result()", r: "terms recorded · attestation verified" },
    ],
  },
  {
    n: "03", icon: "bank", title: "Approved", short: "Both companies approve and fund", state: "Executing",
    body: "People at both companies read the terms and approve them. Payee binds the recipient: the vendor proves its domain and its settlement authority approves the account. The buyer then funds the agreement's USDC escrow on NEAR.",
    who: "A person at each company", onChain: "Both approvals, the authorised recipient and the escrowed USDC", never: "Terms taking effect before both sides approve",
    answer: "Approved by both companies. Escrow funded.",
    trace: [
      { k: "call", t: "approve_terms()", r: "approved by yourco.near and Halcyon" },
      { k: "call", t: "accept_recipient(1)", r: "halcyon-mm.near bound to halcyon-mm.xyz" },
      { k: "call", t: "ft_transfer_call(\"fund\")", r: "escrow funded · USDC on NEAR" },
    ],
  },
  {
    n: "04", icon: "key", title: "Executing", short: "The agent pays inside the rules", state: "Executing",
    body: "The buyer's agent holds one key that can call one method, act. Each payment must match the approved milestone, amount and recipient; anything else is refused and recorded, whatever the agent was told.",
    who: "The buyer's agent, through act", onChain: "Every payment and every refusal with its reason", never: "A payment to another account, a different amount or an early payment",
    answer: "One payment within the terms. Two refused and recorded.",
    trace: [
      { k: "call", t: "act(Pay{period 1, 18,500 USDC})", r: "matches the terms · waits for evidence" },
      { k: "call", t: 'act(Pay{to "halcyon-ops.near"})', r: "refused · ERR_PAYEE_MISMATCH", bad: true },
      { k: "call", t: "act(Pay{period 1, 25,000 USDC})", r: "refused · ERR_AMOUNT_MISMATCH", bad: true },
    ],
  },
  {
    n: "05", icon: "chart", title: "Checked", short: "Evidence decides each payment", state: "Executing",
    body: "A payment becomes eligible only when the agreed evidence is recorded. For a market-making agreement, an attested observer reads the pool at hidden times; elsewhere it is delivery acceptance or a reviewer's approval. Otherwise the payment is withheld.",
    who: "An attested observer or the named reviewer; a keeper triggers scheduled steps", onChain: "Each observation or acceptance, and the period's result", never: "The keeper moving funds or changing an outcome",
    answer: "Period 1 is eligible on measured liquidity.",
    trace: [
      { k: "event", t: "observe · 6 hidden times", r: "Rhea USDC/wNEAR pool read" },
      { k: "event", t: "spread ≤ 60 bps · depth ≥ 12,000 USDC", r: "4 of 6 slots meet both" },
      { k: "out", t: "period 1 · 4 of 6 passed", r: "eligible" },
    ],
  },
  {
    n: "06", icon: "book", title: "Settled", short: "Paid, recorded, checkable", state: "Settled",
    body: "Eligible payments complete to the authorised recipient in USDC. People decide the exceptions, the buyer can revoke the agent's key in one transaction, and the record remains for anyone to check with one command.",
    who: "The contract pays; people decide exceptions", onChain: "The transfer, any exception and the full record", never: "A payment being reversed or redirected after the fact",
    answer: "Paid, recorded and checkable by anyone.",
    trace: [
      { k: "call", t: "act(Pay{period 1})", r: "18,500 USDC → halcyon-mm.near" },
      { k: "event", t: "record", r: "1 payment · 2 refusals · 6 observations" },
      { k: "call", t: "make verify", r: "contract code, agent key, recipient proof and record checked" },
    ],
  },
]



/* An instrument's progress through one step: phase 0 … n, one beat every PHASE_MS */
function useRun(on: boolean, reduce: boolean, n: number) {
  const [p, setP] = useState(reduce ? n : 0)
  useEffect(() => {
    if (reduce) { setP(n); return }
    if (!on) { setP(0); return }
    setP(0)
    const t = Array.from({ length: n }, (_, i) => window.setTimeout(() => setP(i + 1), 350 + i * PHASE_MS))
    return () => t.forEach(window.clearTimeout)
  }, [on, reduce, n])
  return p
}

/* The right half: the step's live instrument (HowVisuals), its answer once it lands, and the six-step track. The
   on-chain calls behind it are listed for screen readers and agents. */
function Instrument({ s, on, reduce }: { s: Step; on: boolean; reduce: boolean }) {
  const n = PHASES[s.n]
  const p = useRun(on, reduce, n)
  const done = p >= n
  const View = VISUAL[s.n]
  return (
    <div className={styles.console}>
      <div className={ab.room}><span>NEAR/USDC retainer · step {s.n}</span><span className={ab.tags}><span className={styles.state}>{s.state}</span><span className={ab.tag}>Illustrative</span></span></div>
      <div className={styles.view} aria-hidden="true"><View p={p} /></div>
      <p className={`${styles.answer} ${done ? (reduce ? "" : ab.sweep) : styles.answerWait}`} key={done ? "done" : "wait"}>{s.answer}</p>
      <ol className={styles.sr} aria-label="On chain">
        {s.trace.map((st, i) => <li key={i}>{st.t}{st.r ? `: ${st.r}` : ""}</li>)}
      </ol>
      <div className={styles.track} aria-hidden="true">{Array.from({ length: 6 }, (_, k) => <i key={k} className={k < Number(s.n) ? styles.trackOn : ""} />)}</div>
    </div>
  )
}

export function HowSteps() {
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const [active, setActive] = useState(0)
  const [cycle, setCycle] = useState(0)
  const [paused, setPaused] = useState(false)
  const running = !reduce && inView && !paused
  const go = (n: number) => { setActive(n); setCycle((c) => c + 1) }
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (!running) return
    const t = window.setTimeout(() => go((active + 1) % STEPS.length), runMs(STEPS[active]))
    return () => window.clearTimeout(t)
  }, [running, active, cycle])

  return (
    <section ref={ref} id="how" className={`section ${styles.section}`}>
      <SectionHeading
        eyebrow="How it works"
        title="How a deal room works."
        accent="teal"
        wide
        lead={<p>One agreement from sealed limits to a settled payment, in six steps. The example is the market-making room above.</p>}
      />

      <Appear as="div" className={styles.flow} effect={APPEAR}>
        <div className={`${ab.uses} ${styles.tabs}`} role="tablist" aria-label="The six steps of a deal room">
          {STEPS.map((s, i) => (
            <button key={s.n} ref={(el) => { tabs.current[i] = el }} type="button" role="tab" id={`how-tab-${i}`} aria-controls={`how-panel-${i}`}
              aria-selected={i === active} tabIndex={i === active ? 0 : -1} title={s.short}
              className={`${ab.use} ${i === active ? ab.useOn : ""}`} onClick={() => go(i)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
                e.preventDefault()
                const n = (i + (e.key === "ArrowRight" ? 1 : STEPS.length - 1)) % STEPS.length
                go(n); tabs.current[n]?.focus()
              }}>
              <PixelIcon name={s.icon} size={22} />
              <span className={ab.useLabel}><span className={styles.tabNum}>{s.n}</span>{s.title}</span>
              {i === active && !reduce ? (
                <span key={cycle} className={ab.timer} aria-hidden="true" style={{ animationDuration: `${runMs(s)}ms`, animationPlayState: running ? "running" : "paused" }} />
              ) : null}
            </button>
          ))}
        </div>

        <div className={ab.stage} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <span className={ab.weave} aria-hidden="true" />
          <span className={ab.sheen} aria-hidden="true" />
          <div className={styles.stack}>
            {STEPS.map((s, i) => (
              <div key={s.n} role="tabpanel" id={`how-panel-${i}`} aria-labelledby={`how-tab-${i}`} hidden={i !== active} className={styles.card}>
                <div className={styles.text}>
                  <div className={styles.textHead}>
                    <span className={styles.tileLg}><PixelIcon name={s.icon} size={22} /></span>
                    <p className={`mono ${styles.kicker}`}>Step {s.n} of 06</p>
                  </div>
                  <h3 className={styles.title}>{s.title}: {s.short.toLowerCase()}.</h3>
                  <p className={styles.body}>{s.body}</p>
                  <dl className={styles.facts}>
                    <div><dt>Who acts</dt><dd>{s.who}</dd></div>
                    <div><dt>On NEAR</dt><dd>{s.onChain}</dd></div>
                    <div className={styles.never}><dt>Cannot happen</dt><dd>{s.never}</dd></div>
                  </dl>
                </div>
                <Instrument s={s} on={i === active} reduce={reduce} />
              </div>
            ))}
          </div>
        </div>
      </Appear>
    </section>
  )
}

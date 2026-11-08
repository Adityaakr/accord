import { useEffect, useRef, useState, type ReactNode } from "react"
import { useInView, useReducedMotion } from "motion/react"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { SectionHeading } from "../components/SectionHeading"
import { Mono } from "../components/Mono"
import styles from "./HowSteps.module.css"

/* How it works (#how), rebuilt 8 Nov 2026 as the full flow of one deal room. The template stepper stays (hairline, the
   14×8 pill per step, H6 titles), now six steps, and drives a detail panel in the template card (Elevation Strong,
   radius 4): what happens, who acts, what goes on NEAR and what cannot happen, beside an agreement record in
   JetBrains Mono (teal for a pass, refusal red only for a refusal). The steps advance on their own while the section is
   in view; choosing one takes over. Reduced motion: no auto-advance. Every panel stays in the DOM (inactive ones
   hidden), so crawlers, agents and screen readers read the whole flow. Example values match the market-making room in
   the deal-room band above. */

const APPEAR: AppearEffect = {
  threshold: 0.3,
  replay: false,
  enter: { opacity: 0, x: 0, y: 24, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1.2s", delay: "0s" } },
}
const CYCLE = 6500

type Line = { k: string; v: ReactNode; tone?: "pass" | "refuse" | "weak" }
type Step = {
  n: string; title: string; short: string; state: string
  body: string; who: string; onChain: string; never: string
  record: Line[]
}

const STEPS: Step[] = [
  {
    n: "01", title: "Sealed", short: "Each side seals its limits", state: "Sealed",
    body: "Each company sets its limits in the browser, such as a price ceiling and the conditions it needs, and seals them. The mandate is encrypted to a key that exists only inside the Sealed Table's enclave.",
    who: "Each company, in its own browser", onChain: "The sealed mandate as ciphertext and its commitment hash", never: "The other side, the operator or the app reading the numbers",
    record: [
      { k: "buyer mandate", v: "sealed · commitment 9f3c…a1", tone: "pass" },
      { k: "seller mandate", v: "sealed · commitment 41de…7b", tone: "pass" },
      { k: "ceiling", v: "hidden", tone: "weak" },
    ],
  },
  {
    n: "02", title: "Attested", short: "Agents negotiate in the enclave", state: "Attested",
    body: "Both companies' agents negotiate inside the Sealed Table, an attested enclave. Code checks every proposal against both mandates' hard limits, and the agreed terms come out with an attestation anyone can verify.",
    who: "Both agents, inside the enclave", onChain: "The agreed terms, the sealed outcome and the attestation", never: "Terms outside either side's limits; a mandate leaving the enclave",
    record: [
      { k: "round 1", v: "19,800 USDC · above buyer limit", tone: "weak" },
      { k: "round 2", v: "18,500 USDC · inside both limits", tone: "pass" },
      { k: "attestation", v: "verified", tone: "pass" },
    ],
  },
  {
    n: "03", title: "Approved", short: "Both companies approve and fund", state: "Executing",
    body: "People at both companies read the terms and approve them. Payee binds the recipient: the vendor proves its domain and its settlement authority approves the account. The buyer then funds the agreement's USDC escrow on NEAR.",
    who: "A person at each company", onChain: "Both approvals, the authorised recipient and the escrowed USDC", never: "Terms taking effect before both sides approve",
    record: [
      { k: "approved", v: "buyer ✓ · seller ✓", tone: "pass" },
      { k: "recipient", v: "halcyon-mm.testnet · bound to halcyon.example", tone: "pass" },
      { k: "escrow", v: "funded · USDC on NEAR", tone: "pass" },
    ],
  },
  {
    n: "04", title: "Executing", short: "The agent pays inside the rules", state: "Executing",
    body: "The buyer's agent holds one key that can call one method, act. Each payment must match the approved milestone, amount and recipient; anything else is refused and recorded, whatever the agent was told.",
    who: "The buyer's agent, through act", onChain: "Every payment and every refusal with its reason", never: "A payment to another account, a different amount or an early payment",
    record: [
      { k: "act · period 1", v: "18,500 → halcyon-mm", tone: "pass" },
      { k: "act · new account", v: "ERR_PAYEE_MISMATCH", tone: "refuse" },
      { k: "act · 25,000", v: "ERR_AMOUNT_MISMATCH", tone: "refuse" },
    ],
  },
  {
    n: "05", title: "Checked", short: "Evidence decides each payment", state: "Executing",
    body: "A payment becomes eligible only when the agreed evidence is recorded. For a market-making agreement, an attested observer reads the pool at hidden times; elsewhere it is delivery acceptance or a reviewer's approval. Otherwise the payment is withheld.",
    who: "An attested observer or the named reviewer; a keeper triggers scheduled steps", onChain: "Each observation or acceptance, and the period's result", never: "The keeper moving funds or changing an outcome",
    record: [
      { k: "spread ≤ 60 bps", v: "5 of 6 slots", tone: "pass" },
      { k: "depth ≥ 12,000", v: "4 of 6 slots", tone: "pass" },
      { k: "period 1", v: "4 of 6 passed · eligible", tone: "pass" },
    ],
  },
  {
    n: "06", title: "Settled", short: "Paid, recorded, checkable", state: "Settled",
    body: "Eligible payments complete to the authorised recipient in USDC. People decide the exceptions, the buyer can revoke the agent's key in one transaction, and the record remains for anyone to check with one command.",
    who: "The contract pays; people decide exceptions", onChain: "The transfer, any exception and the full record", never: "A payment being reversed or redirected after the fact",
    record: [
      { k: "transfer", v: "18,500 USDC → halcyon-mm.testnet", tone: "pass" },
      { k: "exceptions", v: "none open", tone: "weak" },
      { k: "make verify", v: "7 checks ok", tone: "pass" },
    ],
  },
]

export function HowSteps() {
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.35 })
  const [active, setActive] = useState(0)
  const [manual, setManual] = useState(false)
  const [paused, setPaused] = useState(false)
  const auto = !reduce && !manual && !paused && inView

  useEffect(() => {
    if (!auto) return
    const t = window.setInterval(() => setActive((a) => (a + 1) % STEPS.length), CYCLE)
    return () => window.clearInterval(t)
  }, [auto, active])

  const choose = (i: number) => { setManual(true); setActive(i) }

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
        <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          {/* The stepper: the template hairline and pills, one tab per step */}
          <div className={styles.steps} role="tablist" aria-label="The six steps of a deal room">
            {STEPS.map((s, i) => {
              const on = i === active
              return (
                <button
                  key={s.n}
                  type="button"
                  role="tab"
                  id={`how-tab-${i}`}
                  aria-selected={on}
                  aria-controls={`how-panel-${i}`}
                  tabIndex={on ? 0 : -1}
                  className={`${styles.step} ${on ? styles.active : ""} ${i < active ? styles.done : ""}`}
                  onClick={() => choose(i)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                      e.preventDefault()
                      const n = (i + (e.key === "ArrowRight" ? 1 : STEPS.length - 1)) % STEPS.length
                      choose(n)
                      document.getElementById(`how-tab-${n}`)?.focus()
                    }
                  }}
                >
                  <span className={styles.node} aria-hidden="true" />
                  {on && auto ? <span className={styles.timer} key={`t-${active}`} aria-hidden="true" /> : null}
                  <span className={`t-h6 ${styles.heading}`}><Mono className={styles.num}>{s.n}</Mono> · {s.title}</span>
                  <span className={`t-body-sm ${styles.short}`}>{s.short}</span>
                </button>
              )
            })}
          </div>

          {/* The panels: every step stays in the DOM; only the active one shows */}
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              role="tabpanel"
              id={`how-panel-${i}`}
              aria-labelledby={`how-tab-${i}`}
              hidden={i !== active}
              className={styles.panel}
            >
              <div className={styles.text}>
                <p className={`mono ${styles.kicker}`}>Step {s.n} of 06</p>
                <h3 className={styles.title}>{s.title}: {s.short.toLowerCase()}.</h3>
                <p className={styles.body}>{s.body}</p>
                <dl className={styles.facts}>
                  <div><dt>Who acts</dt><dd>{s.who}</dd></div>
                  <div><dt>On NEAR</dt><dd>{s.onChain}</dd></div>
                  <div className={styles.never}><dt>Cannot happen</dt><dd>{s.never}</dd></div>
                </dl>
              </div>

              <div className={styles.record}>
                <div className={styles.recordHead}>
                  <span>Agreement record · NEAR/USDC retainer</span>
                  <span className={styles.state}>{s.state}</span>
                </div>
                <div className={styles.lines}>
                  {s.record.map((l) => (
                    <div key={l.k} className={styles.line}>
                      <span className={styles.lk}>{l.k}</span>
                      <span className={l.tone === "refuse" ? styles.refuse : l.tone === "pass" ? styles.pass : styles.weak}>{l.v}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.track} aria-hidden="true">
                  {STEPS.map((_, k) => <i key={k} className={k <= i ? styles.trackOn : ""} />)}
                </div>
                <p className={styles.illus}>Illustrative values</p>
              </div>
            </div>
          ))}
        </div>
      </Appear>
    </section>
  )
}

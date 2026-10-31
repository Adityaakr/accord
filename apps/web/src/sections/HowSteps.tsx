import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import { useInView, useReducedMotion } from "motion/react"
import { SectionHeading } from "../components/SectionHeading"
import styles from "./HowSteps.module.css"

/* How it works (#how). Copy: docs/website/ACCORD_WEBSITE_FINAL_COPY.md Part A "How it works", set verbatim.
   Left, the four steps as a tab list: the active step opens its text (grid-rows transition) and draws a progress line;
   steps advance every 6.5s while the section is in view, pause on hover or focus, and any step can be chosen.
   Right, one deal-room card shows what that step does to an illustrative agreement (Indexer hosting, Q1: 36,000 USDC
   in three milestones of 12,000, as in the hero preview): mandates sealed to hashes, the enclave's checks and the
   terms, the escrow and a refused payment, then the record. Teal marks what passed, coral what was refused.
   Reduced motion: no auto-advance, no entrance animation. */

const STEPS = [
  { title: "Sealed", body: "Each company seals its mandate in the browser; only a commitment hash is recorded." },
  { title: "Attested", body: "The Sealed Table negotiates inside an attested enclave; code checks the result against both mandates' limits; the terms are recorded with an attestation anyone can verify." },
  { title: "Executing", body: "Both companies approve, and the buyer funds the agreement's USDC escrow on NEAR. The agent holds one key for one method; a payment must match the approved milestone, amount and recipient, or it is refused and recorded." },
  { title: "Settled", body: "Payments complete under the agreed conditions, people decide the exceptions, and the record remains." },
]
const DWELL = 6500
const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties

const Check = () => <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" /></svg>
const Cross = () => <svg viewBox="0 0 16 16" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
const Lock = () => <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>

/* ---------- the four scenes ---------- */
function Sealed() {
  const side = (who: string, hash: string, t: number) => (
    <div className={styles.mandate} style={d(t)}>
      <div className={styles.mHead}><span>{who}</span><span className={styles.lockChip}><Lock /> Sealed</span></div>
      {["Price limit", "Milestones", "Deadline"].map((k, i) => (
        <div key={k} className={styles.mRow} style={d(t + 0.15 + i * 0.1)}><span>{k}</span><i /></div>
      ))}
      <div className={styles.hash} style={d(t + 0.7)}>
        <span className={styles.dim}>commitment</span>
        <code className={styles.type}>{hash}</code>
      </div>
    </div>
  )
  return (
    <div className={styles.scene}>
      <div className={styles.pair}>
        {side("Your mandate", "0x4f1c…a92e", 0.05)}
        {side("Relay Labs' mandate", "0xb83d…17c4", 0.2)}
      </div>
      <div className={styles.foot} style={d(1.4)}>
        <span className={styles.ok}><Check /></span>
        <code>commit_mandate</code> × 2 <span className={styles.dim}>· only the hashes are on-chain</span>
      </div>
    </div>
  )
}

function Attested() {
  const checks = ["Enclave runs the published build", "Output bound to agreement 27", "Terms within both mandates' limits"]
  return (
    <div className={styles.scene}>
      <div className={styles.enclave} style={d(0.05)}>
        <div className={styles.encHead}>
          <span>Sealed Table</span>
          <span className={styles.dim}>attested enclave</span>
        </div>
        <ul className={styles.checks}>
          {checks.map((c, i) => (
            <li key={c} style={d(0.35 + i * 0.35)}><span className={styles.ok} style={d(0.55 + i * 0.35)}><Check /></span>{c}</li>
          ))}
        </ul>
      </div>
      <div className={styles.terms} style={d(1.5)}>
        <span className={styles.kicker}>Recorded terms</span>
        <div className={styles.termRow}>
          <span><b>36,000</b> USDC</span><span><b>3</b> milestones</span><span><b>12,000</b> each</span>
        </div>
        <span className={styles.attest}>attestation <code>0x9b2e…41e1</code> · verifiable by anyone</span>
      </div>
      <div className={styles.foot} style={d(2.0)}>
        <span className={styles.ok}><Check /></span> Terms recorded <span className={styles.dim}>· waiting for both companies to approve</span>
      </div>
    </div>
  )
}

function Executing() {
  return (
    <div className={styles.scene}>
      <div className={styles.escrow} style={d(0.05)}>
        <div className={styles.escHead}><span>USDC escrow on NEAR</span><span className={styles.escAmt}><b>36,000</b> / 36,000</span></div>
        <span className={styles.escBar}><span className={styles.escFill} /></span>
        <div className={styles.keyRow}>
          <span className={styles.keyChip}>agent key</span>
          <code>method_names: ["act"]</code>
        </div>
      </div>
      <ul className={styles.pays}>
        <li className={styles.payOk} style={d(0.9)}>
          <span className={styles.payMain}><span>Milestone 1 · <b>12,000 USDC</b></span><code>act(Pay) → relaylabs.near</code></span>
          <span className={styles.badgeOk} style={d(1.2)}><Check /> paid</span>
        </li>
        <li className={styles.payBad} style={d(1.7)}>
          <span className={styles.payMain}><span>Milestone 2 · <b>12,000 USDC</b></span><code>act(Pay) → relay-billing.near</code></span>
          <span className={styles.badgeBad} style={d(2.0)}><Cross /> refused · recipient</span>
        </li>
      </ul>
      <div className={styles.foot} style={d(2.5)}>
        <span className={styles.bad}><Cross /></span> Refusal recorded <span className={styles.dim}>· nothing left the escrow</span>
      </div>
    </div>
  )
}

function Settled() {
  const rows: [string, string, "ok" | "bad" | "person"][] = [
    ["Mandates sealed", "2 commitments", "ok"],
    ["Terms attested", "36,000 USDC · 3 milestones", "ok"],
    ["Approved by both companies", "escrow funded", "ok"],
    ["Milestone 1 paid", "12,000 USDC", "ok"],
    ["Payment refused", "recipient mismatch", "bad"],
    ["Exception decided by both companies", "original recipient kept", "person"],
    ["Milestones 2 and 3 paid", "24,000 USDC", "ok"],
  ]
  return (
    <div className={styles.scene}>
      <ol className={styles.record}>
        {rows.map(([k, v, t], i) => (
          <li key={k} className={styles[`r_${t}`]} style={d(0.05 + i * 0.16)}>
            <span className={styles.rDot}>{t === "bad" ? <Cross /> : <Check />}</span>
            <span className={styles.rText}>{k}</span>
            <span className={styles.rVal}>{v}</span>
          </li>
        ))}
      </ol>
      <div className={styles.foot} style={d(1.4)}>
        <span className={styles.ok}><Check /></span> 36,000 USDC settled <span className={styles.dim}>· the record remains</span>
      </div>
    </div>
  )
}

const SCENES = [Sealed, Attested, Executing, Settled]

export function HowSteps() {
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [cycle, setCycle] = useState(0)
  const go = (n: number) => { setActive(n); setCycle((c) => c + 1) }
  const running = !reduce && inView && !paused
  useEffect(() => {
    if (!running) return
    const t = window.setTimeout(() => go((active + 1) % STEPS.length), DWELL)
    return () => window.clearTimeout(t)
  }, [running, active, cycle])

  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = e.key === "ArrowDown" || e.key === "ArrowRight" ? i + 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? i - 1 : null
    if (next === null) return
    e.preventDefault()
    const n = (next + STEPS.length) % STEPS.length
    go(n)
    tabs.current[n]?.focus()
  }

  return (
    <section ref={ref} id="how" className={`section ${styles.section}`}>
      <SectionHeading eyebrow="How it works" title="How a deal room works." accent="teal" />

      <div className={styles.layout} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
        <div className={styles.list} role="tablist" aria-label="How a deal room works, in four steps" aria-orientation="vertical">
          {STEPS.map((s, i) => {
            const on = i === active
            return (
              <button key={s.title} ref={(el) => { tabs.current[i] = el }} type="button" role="tab" id={`how-tab-${i}`} aria-controls="how-panel"
                aria-selected={on} tabIndex={on ? 0 : -1} className={`${styles.item} ${on ? styles.itemOn : ""} ${i < active ? styles.itemDone : ""}`}
                onClick={() => go(i)} onKeyDown={(e) => onKey(e, i)}>
                <span className={styles.rail} aria-hidden="true">
                  {on && !reduce ? <span key={cycle} className={styles.railFill} style={{ animationDuration: `${DWELL}ms`, animationPlayState: running ? "running" : "paused" }} /> : null}
                </span>
                <span className={styles.itemHead}>
                  <span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={`t-h6 ${styles.title}`}>{s.title}</span>
                </span>
                <span className={styles.bodyWrap}><span className={`t-body-sm ${styles.body}`}>{s.body}</span></span>
              </button>
            )
          })}
        </div>

        <div className={styles.stage} id="how-panel" role="tabpanel" aria-labelledby={`how-tab-${active}`} data-seo-skip>
          <span className={styles.weave} aria-hidden="true" />
          <div className={`${styles.card} ${reduce ? styles.still : ""}`} aria-hidden="true">
            <div className={styles.cardHead}>
              <span className={styles.room}>Deal room · <span>Indexer hosting, Q1</span></span>
              <span className={`${styles.state} ${styles[`s${active}`]}`}><span className={styles.stateDot} />{STEPS[active].title}</span>
            </div>
            <div className={styles.states}>
              {STEPS.map((s, i) => <span key={s.title} className={`${styles.stateSeg} ${i <= active ? styles.segOn : ""}`} />)}
            </div>
            <div className={styles.scenes}>
              {SCENES.map((Scene, i) => (
                <div key={i === active ? `on-${cycle}` : `off-${i}`} className={`${styles.layer} ${i === active ? styles.layerOn : ""}`}>
                  <Scene />
                </div>
              ))}
            </div>
            <span className={styles.illus}>Illustrative</span>
          </div>
        </div>
      </div>
    </section>
  )
}

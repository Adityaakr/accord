import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { useInView, useReducedMotion } from "motion/react"
import { LogoMark } from "../components/Logo"
import { PixelIcon, type PixelName } from "../components/PixelIcon"
import styles from "./AudienceBand.module.css"

/* Band under the hero (copy from Adi, 30 Oct 2026). The five "Built for" use cases are tabs; each opens a deal-room
   panel showing that use case end to end: the mandate the buyer gives its agent, the agreed terms, and the five core
   capabilities as they apply to it. Tabs advance every 12s while the band is visible (a bar on the active tab shows the
   time left); resting the pointer on the deal-room card pauses it, and choosing a tab restarts the timer. Reduced motion: no advance. All panels share one grid cell, so
   the band keeps the height of the tallest and never moves when the tab changes. Addresses and .example domains are
   illustrative (RFC 2606), and every panel carries the "Illustrative" pill. */

const CAPS = ["Confidential negotiation", "Agent permissions", "Payment controls", "Recipient authorisation", "Conditional settlement"]

type Panel = { room: string; ask: string; answer: string; lines: ReactNode[] }
type Use = { label: string; icon: PixelName; line: string; panel: Panel }

const c = (t: string) => <code>{t}</code>

const USES: Use[] = [
  {
    label: "Market-making retainers", icon: "bank", line: "Tied to agreed spread, depth and uptime",
    panel: {
      room: "NEAR/USDC retainer, Q1",
      ask: "Renew our NEAR/USDC market-making retainer: up to 20,000 USDC a period, spread under 50 bps, at least 10,000 USDC of depth within 1%, 90% uptime. Our agent must not overpay or pay the wrong desk.",
      answer: "18,500 USDC a period. Paid on measured liquidity.",
      lines: [
        <>Terms agreed inside the Sealed Table; both mandates stayed sealed</>,
        <>Your agent's key can call {c("act()")} and nothing else</>,
        <>Any amount, period or recipient off the terms is refused</>,
        <>Paying {c("halcyon-mm.testnet")} only, bound to halcyon.example</>,
        <>Each period's payment becomes eligible when 5 of 6 slots pass</>,
      ],
    },
  },
  {
    label: "Vendor contracts", icon: "bag", line: "Invoices and milestones, paid to approved terms",
    panel: {
      room: "Vendor invoices, October run",
      ask: "Process October's vendor invoices, 214 in the queue. Pay each one only if it matches its purchase order and a confirmed delivery, only to the vendor's proven address, and hold anything that doesn't.",
      answer: "212 invoices cleared. Two held for you.",
      lines: [
        <>Rates per vendor agreed in the Sealed Table; your limits stayed sealed</>,
        <>Your agent can only pay invoices matched to an approved order</>,
        <>Duplicates, overcharges and changed bank details are refused</>,
        <>Each vendor is paid only at the address bound to its domain</>,
        <>Paid as one batch once delivery is confirmed; two mismatches held</>,
      ],
    },
  },
  {
    label: "Treasury payouts", icon: "vault", line: "Grants and recurring payouts, only to authorised recipients",
    panel: {
      room: "Grant G-114, wallet SDK",
      ask: "Fund grant G-114 for the wallet SDK: up to 45,000 USDC in three tranches, each only after our committee accepts the milestone report. Pay the team's own address and nobody else.",
      answer: "42,000 USDC in three tranches. Released on acceptance.",
      lines: [
        <>Grant size and tranches agreed in the Sealed Table; your maximum stayed sealed</>,
        <>Your agent can only pay these three tranches</>,
        <>A changed amount or an unscheduled tranche is refused</>,
        <>Paying {c("sdkworks.testnet")} only, bound to sdkworks.example</>,
        <>Each tranche becomes payable when the committee accepts the report</>,
      ],
    },
  },
  {
    label: "Selling to AI agents", icon: "store", line: "Deals with buyers' agents, funded before work starts",
    panel: {
      room: "Data API subscription",
      ask: "A buyer's agent wants our on-chain data API. Hold at least 2,000 USDC a month for six months, and start only once the agreement is funded.",
      answer: "2,150 USDC a month. Funded before work starts.",
      lines: [
        <>Price agreed in the Sealed Table; your floor stayed sealed</>,
        <>The buyer approved on-chain; its agent can only pay these terms</>,
        <>Neither agent can change the schedule alone</>,
        <>Paid only to your account {c("yourco.testnet")}, bound to yourco.example</>,
        <>Work starts once 12,900 USDC is funded; then paid monthly on schedule</>,
      ],
    },
  },
  {
    label: "Agent-to-agent services", icon: "book", line: "Priced and settled between agents, within agreed caps",
    panel: {
      room: "Inference credits",
      ask: "Buy inference for our research agent from a provider's agent: up to 500 USDC a week, never more than 2,000 USDC in total, and stop when I revoke.",
      answer: "450 USDC a week. Capped at 1,800.",
      lines: [
        <>Price agreed agent to agent in the Sealed Table; both limits stayed sealed</>,
        <>Your agent can only pay 450 USDC a week</>,
        <>Anything over the weekly amount or the 1,800 USDC cap is refused</>,
        <>Paying {c("inferhub.testnet")} only, bound to inferhub.example</>,
        <>Each week becomes payable on schedule, until you revoke</>,
      ],
    },
  },
]

/* The agent's mark: a 3×3 dot grid */
const DotMark = () => (
  <span className={styles.dotMark} aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i} />)}</span>
)

/* The run, per panel: read the request, open a deal room on Accord, negotiate in the Sealed Table, then verify each
   capability through Accord one by one, then answer. Every row is rendered from the start, so nothing moves. */
const PRE = ["Reading the request…", "Opening a deal room on Accord…", "Negotiating inside the Sealed Table…"]
const STEP_MS = [900, 1000, 1100]
const CHECK_MS = 650
const DONE = PRE.length + CAPS.length // phase index when everything has passed

function usePhase(active: boolean, reduce: boolean) {
  const [phase, setPhase] = useState(reduce ? DONE : 0)
  useEffect(() => {
    if (reduce) { setPhase(DONE); return }
    if (!active) { setPhase(0); return }
    setPhase(0)
    const timers: number[] = []
    let t = 0
    for (let i = 1; i <= DONE; i++) {
      t += i <= PRE.length ? STEP_MS[i - 1] : CHECK_MS
      timers.push(window.setTimeout(() => setPhase(i), t))
    }
    return () => timers.forEach(window.clearTimeout)
  }, [active, reduce])
  return phase
}

const Tick = () => (
  <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" /></svg>
)

function PanelView({ p, active, id, labelledBy }: { p: Panel; active: boolean; id: string; labelledBy: string }) {
  const reduce = useReducedMotion() ?? false
  const phase = usePhase(active, reduce)
  const checking = phase - PRE.length // index of the line being verified (or < 0 before verification)
  const done = phase >= DONE
  const status = done ? p.answer : phase < PRE.length ? PRE[phase] : `Verifying via Accord · ${CAPS[checking]}…`

  return (
    <div id={id} role="tabpanel" aria-labelledby={labelledBy} aria-hidden={!active} className={`${styles.chat} ${active ? styles.chatOn : ""}`}>
      <div className={styles.room}><span>Deal room · {p.room}</span><span className={styles.tag}>Illustrative</span></div>

      <p className={styles.msgUser}>{p.ask}</p>

      <div className={styles.agent}>
        <span className={`${styles.dotMark} ${done ? "" : styles.dotBusy}`} aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i} style={{ animationDelay: `${(i % 3 + Math.floor(i / 3)) * 0.12}s` }} />)}</span>
        <div className={styles.agentBody}>
          <p className={`${styles.answer} ${done ? (reduce ? "" : styles.sweep) : styles.status}`} key={done ? "done" : `s${phase}`}>{status}</p>
          <ul className={styles.lines}>
            {p.lines.map((l, i) => {
              const state = done || i < checking ? "pass" : i === checking ? "check" : "wait"
              return (
                <li key={i} className={`${styles.line} ${styles[state]}`}>
                  <span className={styles.lineText}>{l}</span>
                  <span className={styles.cap}>
                    {state === "pass" ? <span className={styles.ok}><Tick /></span> : state === "check" ? <span className={styles.spin} aria-hidden="true" /> : null}
                    {CAPS[i]}{state === "check" ? " · verifying" : state === "pass" ? " · passed" : ""}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <div className={styles.composer} data-seo-skip>
        <span className={styles.placeholder}>Reply to your agent…</span>
        <span className={styles.composerRow}>
          <svg className={styles.tool} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21 11.5-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l7.9-7.9" /></svg>
          <span className={styles.grow} />
          <svg className={styles.tool} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></svg>
          <span className={`${styles.send} ${done ? "" : styles.sendIdle}`} aria-hidden="true">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" /></svg>
          </span>
        </span>
      </div>
    </div>
  )
}

const DWELL = 12000

export function AudienceBand() {
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [cycle, setCycle] = useState(0) // bumps on every switch, restarting the timer and the bar
  const go = (n: number) => { setActive(n); setCycle((c) => c + 1) }
  const running = !reduce && inView && !paused
  useEffect(() => {
    if (!running) return
    const t = window.setTimeout(() => go((active + 1) % USES.length), DWELL)
    return () => window.clearTimeout(t)
  }, [running, active, cycle])
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = e.key === "ArrowDown" || e.key === "ArrowRight" ? i + 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? USES.length - 1 : null
    if (next === null) return
    e.preventDefault()
    const n = (next + USES.length) % USES.length
    go(n)
    tabs.current[n]?.focus()
  }

  return (
    <aside ref={ref} className={styles.band} aria-label="What Accord is built for, with a deal room for each use case"
>
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 className={styles.heading}>Built for commerce in stablecoins.</h2>
          <p className={styles.sub}>{USES[active].line}</p>
        </div>

        <div className={styles.uses} role="tablist" aria-label="Use cases">
          {USES.map((u, i) => (
            <button key={u.label} ref={(el) => { tabs.current[i] = el }} type="button" role="tab" id={`use-tab-${i}`} aria-controls={`use-panel-${i}`}
              aria-selected={i === active} tabIndex={i === active ? 0 : -1} title={u.line}
              className={`${styles.use} ${i === active ? styles.useOn : ""}`} onClick={() => go(i)} onKeyDown={(e) => onKey(e, i)}>
              <PixelIcon name={u.icon} size={22} />
              <span className={styles.useLabel}>{u.label}</span>
              {i === active && !reduce ? (
                <span key={cycle} className={styles.timer} aria-hidden="true" style={{ animationDuration: `${DWELL}ms`, animationPlayState: running ? "running" : "paused" }} />
              ) : null}
            </button>
          ))}
        </div>

        <div className={styles.stage} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <span className={styles.weave} aria-hidden="true" />
          <span className={styles.sheen} aria-hidden="true" />
          <div className={styles.stack}>
            {USES.map((u, i) => <PanelView key={u.label} p={u.panel} active={i === active} id={`use-panel-${i}`} labelledBy={`use-tab-${i}`} />)}
          </div>
        </div>
      </div>
    </aside>
  )
}

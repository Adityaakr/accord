import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { Arrow } from "../components/Arrow"
import { useInView, useReducedMotion } from "motion/react"
import { LogoMark } from "../components/Logo"
import { PixelIcon, type PixelName } from "../components/PixelIcon"
import styles from "./AudienceBand.module.css"
import { DealDetail, type Detail } from "./DealDetail"

/* Band under the hero (copy from Adi, 30 Oct 2026; six agreement types since 8 Nov 2026). The six use cases are tabs; each opens a deal-room
   panel showing that use case end to end: the mandate the buyer gives its agent, the agreed terms, and the five core
   capabilities as they apply to it. Tabs advance every 17s while the band is visible (a bar on the active tab shows the
   time left); resting the pointer on the deal-room card pauses it, and choosing a tab restarts the timer. Reduced motion: no advance. All panels share one grid cell, so
   the band keeps the height of the tallest and never moves when the tab changes. Addresses and vendor domains are
   invented examples, and every panel carries the "Illustrative" pill; types not built yet also carry "Planned". */

const CAPS = ["Confidential negotiation", "Agent permissions", "Payment controls", "Recipient authorisation", "Conditional settlement"]

/* One step of the agent's work log. k: think (its reasoning), call (a contract call it signs or asks you to sign),
   wait (waiting on the other side), event (a result coming back from the contract), out (the agreed terms).
   s is the step's illustrative duration in seconds, summed into "Worked for …".
   c pins a step to a capability when its call name doesn't decide it (see capOf). */
type Step = { k: "think" | "call" | "wait" | "event" | "out"; t: string; r?: string; s: number; bad?: boolean; c?: number }
/* planned on a panel: the type is built but this panel shows more than it does today (the vendor batch across many
   agreements), so the panel carries "Planned" while its tab does not. */
type Panel = { room: string; ask: string; answer: string; lines: ReactNode[]; trace: Step[]; detail: Detail; planned?: boolean }
type Use = { label: string; icon: PixelName; line: string; planned?: boolean; panel: Panel }

const c = (t: string) => <code>{t}</code>

const USES: Use[] = [
  {
    label: "Market making", icon: "chart", line: "Retainers paid on agreed spread, depth and two-sided quoting",
    panel: {
      room: "NEAR/USDC retainer, Q1",
      ask: "Renew our NEAR/USDC market-making retainer on Rhea: up to 20,000 USDC a period, spread under 70 bps, at least 10,000 USDC of depth within 2%, quotes on both sides. Our agent must not overpay or pay the wrong desk.",
      answer: "18,500 USDC a period. Paid on measured liquidity.",
      lines: [
        <>Terms agreed inside the Sealed Table; both mandates stayed sealed</>,
        <>Your agent's key can call {c("act()")} and nothing else</>,
        <>Any amount, period or recipient off the terms is refused</>,
        <>Paying {c("halcyon-mm.near")} only, bound to halcyon-mm.xyz</>,
        <>Each period's payment becomes eligible when 4 of 6 slots pass</>,
      ],
      trace: [
        { k: "think", t: "Ceiling is 20,000 USDC a period. A tighter spread and deeper liquidity are worth more to us than the last 1,500, so I'll seal stricter floors.", s: 4 },
        { k: "call", t: 'create_agreement({vendor: "halcyon-mm.near"})', r: "agreement 41 · agent key limited to act()", s: 2 },
        { k: "call", t: "commit_mandate(0x9c2e…a71f, ciphertext)", r: "your mandate sealed, hash on-chain", s: 2 },
        { k: "wait", t: "Waiting for Halcyon's agent to commit its mandate", r: "committed", s: 41 },
        { k: "call", t: "start_negotiation()", r: "Sealed Table job started", s: 3 },
        { k: "think", t: "Neither side sees the other's limits. If both mandates can be met, only the agreed terms come out.", s: 2 },
        { k: "event", t: "on_sealed_result()", r: "attestation verified · limits checked", s: 27 },
        { k: "out", t: "18,500 USDC · ≤60 bps · ≥12,000 depth · both sides · 4 of 6", s: 1 },
        { k: "think", t: "Under our ceiling and stricter than every floor we set. Asking you to approve.", s: 3 },
        { k: "call", t: "approve_terms()", r: "approved by yourco.near and Halcyon", s: 6 },
        { k: "call", t: "accept_recipient(1)", r: "halcyon-mm.near bound to halcyon-mm.xyz", s: 2 },
      ],
      detail: {
        you: "Your agent", them: "Halcyon's agent", hashes: ["0x9c2e…a71f", "0x5d18…e44b"],
        terms: "18,500 USDC · ≤60 bps · ≥12,000 depth · both sides · 4 of 6",
        keyLabel: "Your agent's key", key: "ed25519:7Hq2…3fKa", agreement: "agreement 41",
        pay: [
          { call: "act(Pay{period 1, 18,500 USDC})" },
          { call: "act(Pay{period 1, 19,000 USDC})", fail: "amount", err: "ERR_AMOUNT_MISMATCH" },
          { call: 'act(Pay{to "halcyon-ops.near"})', fail: "recipient", err: "ERR_PAYEE_MISMATCH" },
        ],
        domain: "halcyon-mm.xyz", account: "halcyon-mm.near",
        marks: ["p", "p", "f", "p", "p", "p"], marksLabel: "Observation slots at hidden times · period 1",
        rows: [["Spread", "49 bps", "needs ≤ 60"], ["Depth within 2%", "12,288 USDC", "needs ≥ 12,000"], ["Two-sided quoting", "6 of 6 slots", "needed every slot"]],
        result: "5 of 6 slots passed, 4 needed. 18,500 USDC eligible for period 1.",
      },
    },
  },
  {
    label: "Vendor contracts", icon: "bag", line: "Invoices and renewals, paid only against approved obligations",
    panel: {
      room: "Vendor invoices, October run", planned: true,
      ask: "Process October's vendor invoices, 214 in the queue. Pay each one only if it matches its purchase order and a confirmed delivery, only to the vendor's proven address, and hold anything that doesn't.",
      answer: "212 invoices cleared. Two held for you.",
      lines: [
        <>Rates per vendor agreed in the Sealed Table; your limits stayed sealed</>,
        <>Your agent can only pay invoices matched to an approved order</>,
        <>Duplicates, overcharges and changed bank details are refused</>,
        <>Each vendor is paid only at the address bound to its domain</>,
        <>Paid as one batch once delivery is confirmed; two mismatches held</>,
      ],
      trace: [
        { k: "think", t: "214 invoices. Each needs a matching purchase order, a confirmed delivery and the vendor's bound address before I pay it.", s: 3 },
        { k: "event", t: "Reading 38 vendor agreements", r: "38 authorised recipients", s: 2 },
        { k: "out", t: "214 read · 212 match order and delivery · 2 don't", s: 19, c: 4 },
        { k: "think", t: "INV-2291 bills 4,120 against an order for 3,800. INV-2307 asks us to pay a new bank account. Submitting both as invoiced; the contract decides.", s: 4 },
        { k: "call", t: "act(Pay{INV-2291, 4,120 USDC})", r: "refused · ERR_AMOUNT_MISMATCH", s: 1, bad: true },
        { k: "call", t: "act(Pay{INV-2307, new destination})", r: "refused · ERR_PAYEE_MISMATCH", s: 1, bad: true },
        { k: "think", t: "Both refusals are right. Holding them for you instead of retrying.", s: 2 },
        { k: "call", t: "act(Pay) × 212", r: "212 accepted, each to its bound address", s: 14 },
      ],
      detail: {
        you: "Your agent", them: "Vendors' agents", hashes: ["0x3a71…d09c", "38 commitments"],
        terms: "Rates for 38 vendors · your limits sealed",
        keyLabel: "Your agent's key", key: "ed25519:Bv9d…q71M", agreement: "38 vendor agreements",
        pay: [
          { call: "act(Pay{INV-2290, 3,800 USDC})" },
          { call: "act(Pay{INV-2291, 4,120 USDC})", fail: "amount", err: "ERR_AMOUNT_MISMATCH" },
          { call: "act(Pay{INV-2307, new destination})", fail: "recipient", err: "ERR_PAYEE_MISMATCH" },
        ],
        domain: "northwind.xyz", account: "northwind.near",
        rows: [["Purchase order matched", "212", "of 214"], ["Delivery confirmed", "212", "of 214"], ["Paid to bound address", "212", "of 212"]],
        result: "212 paid as one batch. INV-2291 and INV-2307 held for you.",
      },
    },
  },
  {
    label: "Agent services", icon: "agents", planned: true, line: "Specialist work commissioned between agents, within agreed caps",
    panel: {
      room: "Inference credits",
      ask: "Buy inference for our research agent from a provider's agent: up to 500 USDC a week, never more than 2,000 USDC in total, and stop when I revoke.",
      answer: "450 USDC a week. Capped at 1,800.",
      lines: [
        <>Price agreed agent to agent in the Sealed Table; both limits stayed sealed</>,
        <>Your agent can only pay 450 USDC a week</>,
        <>Anything over the weekly amount or the 1,800 USDC cap is refused</>,
        <>Paying {c("inferhub.near")} only, bound to inferhub.xyz</>,
        <>Each week becomes payable on schedule, until you revoke</>,
      ],
      trace: [
        { k: "think", t: "Up to 500 USDC a week, 2,000 in total, and stop when you revoke. The provider's agent prices by the week.", s: 3 },
        { k: "call", t: 'create_agreement({vendor: "inferhub.near"})', r: "agreement 88 · agent key limited to act()", s: 2 },
        { k: "call", t: "commit_mandate(0x2fa9…c710, ciphertext)", r: "your limits sealed", s: 2 },
        { k: "wait", t: "Waiting for InferHub's agent to commit", r: "committed", s: 7 },
        { k: "call", t: "start_negotiation()", r: "Sealed Table job started", s: 3 },
        { k: "event", t: "on_sealed_result()", r: "attestation verified · limits checked", s: 19 },
        { k: "out", t: "450 USDC a week · capped at 1,800 USDC", s: 1 },
        { k: "call", t: "approve_terms()", r: "approved by both sides", s: 4 },
        { k: "call", t: "act(Pay{week 1, 450 USDC})", r: "paid to inferhub.near", s: 3 },
        { k: "think", t: "A 500 USDC payment would be refused. The cap leaves room for three more weeks.", s: 2, c: 2 },
      ],
      detail: {
        you: "Your agent", them: "InferHub's agent", hashes: ["0x2fa9…c710", "0x6c03…a9e1"],
        terms: "450 USDC a week · capped at 1,800 USDC",
        keyLabel: "Your agent's key", key: "ed25519:Tz8r…5vYc", agreement: "agreement 88",
        pay: [
          { call: "act(Pay{week 1, 450 USDC})" },
          { call: "act(Pay{week 2, 500 USDC})", fail: "amount", err: "ERR_AMOUNT_MISMATCH" },
          { call: 'act(Pay{to "inferhub-2.near"})', fail: "recipient", err: "ERR_PAYEE_MISMATCH" },
        ],
        domain: "inferhub.xyz", account: "inferhub.near",
        marks: ["p", "o", "o", "o"], marksLabel: "Weeks under the cap",
        rows: [["Paid", "450 USDC", "week 1"], ["Left under the cap", "1,350 USDC", "3 weeks"], ["Revoke", "available", "any time"]],
        result: "Week 2 payable on schedule, until you revoke.",
      },
    },
  },
  {
    label: "Security fixes", icon: "shield", planned: true, line: "A fix paid when the agreed checks pass and the reviewer approves",
    panel: {
      room: "SDK signature fix, report K-17",
      ask: "Commission the fix for the signature bug Kestrel reported in our SDK: up to 8,000 USDC, paid only when our 14 regression checks pass on the patch and our security lead approves it.",
      answer: "6,000 USDC. Checks pass; held for your security lead.",
      lines: [
        <>Fee agreed in the Sealed Table; your 8,000 USDC ceiling stayed sealed</>,
        <>Your agent's key can call {c("act()")} and nothing else</>,
        <>A different amount or an early payment is refused</>,
        <>Paying {c("kestrel-sec.near")} only, bound to kestrel-sec.xyz</>,
        <>Payable once 14 of 14 checks pass and the security lead approves</>,
      ],
      trace: [
        { k: "think", t: "Ceiling is 8,000 USDC. Nothing moves until the regression suite passes on the submitted patch and our security lead signs off.", s: 3 },
        { k: "call", t: 'create_agreement({vendor: "kestrel-sec.near"})', r: "agreement 63 · agent key limited to act()", s: 2 },
        { k: "call", t: "commit_mandate(0x6e14…b2d8, ciphertext)", r: "your ceiling sealed", s: 2 },
        { k: "wait", t: "Waiting for Kestrel's agent to commit its mandate", r: "committed", s: 26 },
        { k: "call", t: "start_negotiation()", r: "Sealed Table job started", s: 3 },
        { k: "event", t: "on_sealed_result()", r: "attestation verified · limits checked", s: 22 },
        { k: "out", t: "6,000 USDC · 14 agreed checks · security lead approves", s: 1 },
        { k: "call", t: "approve_terms()", r: "approved by both sides", s: 5 },
        { k: "event", t: "Patch 3f9a2c1 submitted", r: "14 of 14 checks pass", s: 41, c: 4 },
        { k: "think", t: "The checks pass. The review is still open, so nothing is payable yet. Asking your security lead.", s: 2, c: 4 },
      ],
      detail: {
        you: "Your agent", them: "Kestrel's agent", hashes: ["0x6e14…b2d8", "0x91af…3c07"],
        terms: "6,000 USDC · 14 agreed checks · security lead approves",
        keyLabel: "Your agent's key", key: "ed25519:Rf3k…9wQa", agreement: "agreement 63",
        pay: [
          { call: "act(Pay{fix, 6,000 USDC})" },
          { call: "act(Pay{fix, 8,000 USDC})", fail: "amount", err: "ERR_AMOUNT_MISMATCH" },
          { call: 'act(Pay{to "kestrel-new.near"})', fail: "recipient", err: "ERR_PAYEE_MISMATCH" },
        ],
        domain: "kestrel-sec.xyz", account: "kestrel-sec.near",
        rows: [["Regression checks", "14 of 14", "on patch 3f9a2c1"], ["Security lead", "pending", "approval needed"], ["Payable", "6,000 USDC", "after approval"]],
        result: "Checks pass. 6,000 USDC becomes payable when your security lead approves.",
      },
    },
  },
  {
    label: "Infrastructure", icon: "server", planned: true, line: "Monthly payments tied to the service levels you rely on",
    panel: {
      room: "GPU capacity, November",
      ask: "Renew our GPU capacity with Northlight: up to 50,000 USDC a month for 99.5% availability and p95 latency under 300 ms. If a month misses, hold it under the shortfall rule and let them dispute the reading.",
      answer: "48,000 USDC a month. November held at 99.2%.",
      lines: [
        <>Price agreed in the Sealed Table; your 50,000 USDC ceiling stayed sealed</>,
        <>Your agent can only pay the agreed monthly amount</>,
        <>Paying a month that missed the levels is refused</>,
        <>Paying {c("northlight.near")} only, bound to northlight.xyz</>,
        <>Each month becomes payable when the agreed monitor reports both levels met</>,
      ],
      trace: [
        { k: "think", t: "Up to 50,000 USDC a month. Availability and latency decide each payment, and Northlight can dispute a reading.", s: 3 },
        { k: "call", t: 'create_agreement({vendor: "northlight.near"})', r: "agreement 152 · agent key limited to act()", s: 2 },
        { k: "call", t: "commit_mandate(0x0d7c…e581, ciphertext)", r: "your ceiling sealed", s: 2 },
        { k: "wait", t: "Waiting for Northlight's agent to commit", r: "committed", s: 14 },
        { k: "call", t: "start_negotiation()", r: "Sealed Table job started", s: 3 },
        { k: "event", t: "on_sealed_result()", r: "attestation verified · limits checked", s: 23 },
        { k: "out", t: "48,000 USDC a month · ≥ 99.5% available · p95 ≤ 300 ms", s: 1 },
        { k: "call", t: "approve_terms()", r: "approved by both sides", s: 4 },
        { k: "event", t: "Reading November from the agreed monitor", r: "99.2% available · p95 212 ms", s: 6, c: 4 },
        { k: "think", t: "Availability missed by 0.3 points. Holding November under the shortfall rule; Northlight has 72 hours to dispute.", s: 2, c: 4 },
      ],
      detail: {
        you: "Your agent", them: "Northlight's agent", hashes: ["0x0d7c…e581", "0xb3a0…6f29"],
        terms: "48,000 USDC a month · ≥ 99.5% available · p95 ≤ 300 ms",
        keyLabel: "Your agent's key", key: "ed25519:Nc5w…h2Ud", agreement: "agreement 152",
        pay: [
          { call: "act(Pay{October, 48,000 USDC})" },
          { call: "act(Pay{October, 50,000 USDC})", fail: "amount", err: "ERR_AMOUNT_MISMATCH" },
          { call: 'act(Pay{to "northlight-ops.near"})', fail: "recipient", err: "ERR_PAYEE_MISMATCH" },
        ],
        domain: "northlight.xyz", account: "northlight.near",
        marks: ["p", "p", "f"], marksLabel: "Months · September to November",
        rows: [["Availability", "99.2%", "needs ≥ 99.5%"], ["p95 latency", "212 ms", "needs ≤ 300"], ["Dispute window", "open", "72 hours"]],
        result: "November held under the shortfall rule. Northlight may dispute the reading.",
      },
    },
  },
  {
    label: "Grants", icon: "vault", planned: true, line: "Each payment tied to a milestone the reviewers accept",
    panel: {
      room: "Grant G-114, wallet SDK",
      ask: "Fund grant G-114 for the wallet SDK: up to 45,000 USDC in three tranches, each only after two of our three reviewers accept the milestone report. Pay the team's own address and nobody else.",
      answer: "42,000 USDC in three tranches. Released on acceptance.",
      lines: [
        <>Grant size and tranches agreed in the Sealed Table; your maximum stayed sealed</>,
        <>Your agent can only pay these three tranches</>,
        <>A changed amount or an unscheduled tranche is refused</>,
        <>Paying {c("sdkworks.near")} only, bound to sdkworks.xyz</>,
        <>Each tranche becomes payable when two of three reviewers accept the report</>,
      ],
      trace: [
        { k: "think", t: "Our maximum is 45,000 USDC over three tranches, and none moves before two reviewers accept a report.", s: 3 },
        { k: "call", t: 'create_agreement({vendor: "sdkworks.near"})', r: "agreement 114 · agent key limited to act()", s: 2 },
        { k: "call", t: "commit_mandate(0x41d0…9b3e, ciphertext)", r: "your maximum sealed", s: 2 },
        { k: "wait", t: "Waiting for SDKWorks to commit its mandate", r: "committed", s: 52 },
        { k: "call", t: "start_negotiation()", r: "Sealed Table job started", s: 3 },
        { k: "event", t: "on_sealed_result()", r: "attestation verified · limits checked", s: 24 },
        { k: "out", t: "42,000 USDC · tranches of 12,000 / 15,000 / 15,000", s: 1 },
        { k: "call", t: "approve_terms()", r: "approved by both sides", s: 5 },
        { k: "call", t: "accept_recipient(1)", r: "sdkworks.near bound to sdkworks.xyz", s: 2 },
        { k: "think", t: "Tranche 1 waits on accept_delivery(0). Nothing is payable yet.", s: 2 },
      ],
      detail: {
        you: "Your agent", them: "SDKWorks' agent", hashes: ["0x41d0…9b3e", "0x88c2…17fa"],
        terms: "42,000 USDC · tranches of 12,000 / 15,000 / 15,000",
        keyLabel: "Your agent's key", key: "ed25519:Kp4x…8nTe", agreement: "agreement 114",
        pay: [
          { call: "act(Pay{tranche 1, 12,000 USDC})" },
          { call: "act(Pay{tranche 1, 15,000 USDC})", fail: "amount", err: "ERR_AMOUNT_MISMATCH" },
          { call: 'act(Pay{to "sdkworks-new.near"})', fail: "recipient", err: "ERR_PAYEE_MISMATCH" },
        ],
        domain: "sdkworks.xyz", account: "sdkworks.near",
        marks: ["p", "o", "o"], marksLabel: "Tranches",
        rows: [["Milestone report", "submitted", "tranche 1"], ["Reviewers", "accepted", "2 of 3 needed"], ["accept_delivery(0)", "called", "by your treasury"]],
        result: "Tranche 1 payable: 12,000 USDC to sdkworks.near.",
      },
    },
  },
]

/* The agent's mark: a 3×3 dot grid */
const DotMark = () => (
  <span className={styles.dotMark} aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i} />)}</span>
)

/* The run, per panel: the agent works through its log (each step shows a spinner, then its result), then the five
   capabilities pass one by one, then it answers. The log and the checks share one grid cell, so the card never changes
   height; once done, "Show work" swaps the log back in. Reduced motion starts at the finished state. */
const STEP_MS: Record<Step["k"], number> = { think: 950, call: 620, wait: 900, event: 620, out: 700 }
const CHECK_MS = 330
const VERB: Record<Step["k"], string> = { think: "Thinking", call: "Running", wait: "Waiting", event: "Reading result", out: "Checking terms" }
const fn = (t: string) => t.split("(")[0]

function usePhase(active: boolean, reduce: boolean, trace: Step[]) {
  const done = trace.length + CAPS.length
  const [phase, setPhase] = useState(reduce ? done : 0)
  useEffect(() => {
    if (reduce) { setPhase(done); return }
    if (!active) { setPhase(0); return }
    setPhase(0)
    const timers: number[] = []
    let t = 0
    for (let i = 1; i <= done; i++) {
      t += i <= trace.length ? STEP_MS[trace[i - 1].k] : CHECK_MS
      timers.push(window.setTimeout(() => setPhase(i), t))
    }
    return () => timers.forEach(window.clearTimeout)
  }, [active, reduce, trace, done])
  return phase
}

const Tick = () => (
  <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" /></svg>
)

/* Which capability a step belongs to, for opening the detail: by call name; a thought goes with the step it leads to */
const NEG = ["commit_mandate", "start_negotiation", "on_sealed_result"]
const PAYEE = ["accept_recipient", "propose_recipient", "Reading 38 vendor agreements"]
function capOf(trace: Step[], i: number): number {
  const st = trace[i]
  if (st.c !== undefined) return st.c
  const name = fn(st.t)
  if (st.k === "think") return i + 1 < trace.length ? capOf(trace, i + 1) : 4
  if (st.k === "out" || NEG.includes(name)) return 0
  if (st.k === "wait") return st.t.includes("commit") ? 0 : 4
  if (name.startsWith("create_agreement")) return 1
  if (name.startsWith("act")) return 2
  if (PAYEE.includes(name)) return 3
  return 4
}
const stepsByCap = (trace: Step[]) => CAPS.map((_, c) => trace.filter((_, i) => capOf(trace, i) === c))

const secs = (n: number) => (n < 60 ? `${n}s` : `${Math.floor(n / 60)}m ${String(n % 60).padStart(2, "0")}s`)

/* visible: the trace is on screen in the active panel. The step buttons are pointer shortcuts (out of the tab order);
   while the trace is hidden they are also hidden from assistive technology, so no hidden text is announced. */
function TraceView({ trace, shown, visible, onOpen }: { trace: Step[]; shown: number; visible: boolean; onOpen: (cap: number) => void }) {
  const ref = useRef<HTMLOListElement>(null)
  /* keep the newest step in view, like a terminal */
  useEffect(() => { const box = ref.current?.parentElement; if (box) box.scrollTop = box.scrollHeight }, [shown])
  return (
    <ol ref={ref} className={styles.trace}>
      {trace.slice(0, shown + 1).map((st, i) => {
        const running = i === shown
        return (
          <li key={i} className={`${styles.step} ${styles[`k_${st.k}`]}`}>
            <button type="button" className={styles.stepBtn} disabled={running} onClick={() => onOpen(capOf(trace, i))} aria-label={`${st.t}: open ${CAPS[capOf(trace, i)]}`} tabIndex={-1} aria-hidden={!visible || undefined}>
            <span className={styles.stepHead}>
              {st.k === "call" ? <span className={styles.glyph}>▸</span> : st.k === "event" ? <span className={styles.glyph}>←</span> : st.k === "think" ? <span className={styles.glyph}>∴</span> : st.k === "wait" ? <span className={styles.glyph}>…</span> : <span className={styles.glyph}>=</span>}
              <span className={styles.stepText}>{st.t}</span>
            </span>
            {st.r || st.k === "wait" || st.k === "call" ? (
              <span className={`${styles.stepOut} ${st.bad ? styles.bad : ""}`}>
                {running ? <><span className={styles.spin} aria-hidden="true" /> {st.k === "wait" ? "waiting" : "running"}</> : <>{st.bad ? "✕" : "↳"} {st.r} <span className={styles.took}>{secs(st.s)}</span></>}
              </span>
            ) : null}
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function PanelView({ p, planned, active, id, labelledBy, onOpen }: { p: Panel; planned?: boolean; active: boolean; id: string; labelledBy: string; onOpen: (cap: number) => void }) {
  const reduce = useReducedMotion() ?? false
  const phase = usePhase(active, reduce, p.trace)
  const [showWork, setShowWork] = useState(false)
  useEffect(() => { if (!active) setShowWork(false) }, [active])
  const T = p.trace.length
  const working = phase < T
  const checking = phase - T // index of the line being verified (or < 0 before verification)
  const done = phase >= T + CAPS.length
  const elapsed = p.trace.slice(0, Math.min(phase, T)).reduce((n, st) => n + st.s, 0)
  const total = p.trace.reduce((n, st) => n + st.s, 0)
  const cur = p.trace[Math.min(phase, T - 1)]
  const status = done ? p.answer : working ? `${VERB[cur.k]}${cur.k === "call" || cur.k === "event" ? ` ${fn(cur.t)}` : ""}…` : `Verifying via Accord · ${CAPS[checking]}…`
  const traceOn = working || showWork

  return (
    <div id={id} role="tabpanel" aria-labelledby={labelledBy} aria-hidden={!active} className={`${styles.chat} ${active ? styles.chatOn : ""}`}>
      <div className={styles.room}><span>Deal room · {p.room}</span><span className={styles.tags}>{planned ? <span className={`${styles.tag} ${styles.planned}`}>Planned</span> : null}<span className={styles.tag}>Illustrative</span></span></div>

      <p className={styles.msgUser}>{p.ask}</p>

      <div className={styles.agent}>
        <span className={`${styles.dotMark} ${done ? "" : styles.dotBusy}`} aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i} style={{ animationDelay: `${(i % 3 + Math.floor(i / 3)) * 0.12}s` }} />)}</span>
        <div className={styles.agentBody}>
          <p className={`${styles.answer} ${done ? (reduce ? "" : styles.sweep) : styles.status}`} key={done ? "done" : `s${phase}`}>{status}</p>
          <div className={styles.meta} data-seo-skip>
            {done ? (
              <>
                <span>Worked for {secs(total)} · {T} steps</span>
                <button type="button" className={styles.metaBtn} onClick={() => setShowWork((v) => !v)} aria-expanded={showWork} tabIndex={active ? 0 : -1}>
                  {showWork ? "Hide work" : "Show work"}
                </button>
              </>
            ) : (
              <span>{working ? `Step ${phase + 1} of ${T}` : "Checking the agreement"} · {secs(elapsed)}</span>
            )}
          </div>
          <div className={styles.slot}>
            <div className={`${styles.layer} ${styles.traceLayer} ${traceOn ? styles.layerOn : ""}`} aria-hidden={!traceOn} data-seo-skip>
              <TraceView trace={p.trace} shown={working ? phase : T} visible={active && traceOn} onOpen={onOpen} />
            </div>
            <ul className={`${styles.lines} ${styles.layer} ${traceOn ? "" : styles.layerOn}`}>
              {p.lines.map((l, i) => {
                const state = done || i < checking ? "pass" : i === checking ? "check" : "wait"
                return (
                  <li key={i} className={`${styles.line} ${styles[state]}`}>
                    <button type="button" className={styles.lineBtn} data-seo-keep onClick={() => onOpen(i)} tabIndex={active && !traceOn ? 0 : -1} aria-hidden={!(active && !traceOn) || undefined}>
                    <span className={styles.lineText}>{l}</span>
                    <span className={styles.cap}>
                      {state === "pass" ? <span className={styles.ok}><Tick /></span> : state === "check" ? <span className={styles.spin} aria-hidden="true" /> : null}
                      {CAPS[i]}{state === "check" ? " · verifying" : state === "pass" ? " · passed" : ""}
                      <span className={styles.view} aria-hidden="true">See how<Arrow dir="up-right" /></span>
                    </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
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

const DWELL = 17000

export function AudienceBand() {
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [open, setOpen] = useState<{ use: number; cap: number } | null>(null)
  const [cycle, setCycle] = useState(0) // bumps on every switch, restarting the timer and the bar
  const go = (n: number) => { setActive(n); setCycle((c) => c + 1) }
  const running = !reduce && inView && !paused && !open
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
            {USES.map((u, i) => <PanelView key={u.label} p={u.panel} planned={u.planned || u.panel.planned} active={i === active} id={`use-panel-${i}`} labelledBy={`use-tab-${i}`} onOpen={(cap) => setOpen({ use: i, cap })} />)}
          </div>
        </div>
      </div>

      {(() => {
        const u = USES[open?.use ?? active].panel
        return (
          <DealDetail open={open !== null} room={u.room} caps={CAPS} lines={u.lines} detail={u.detail} steps={stepsByCap(u.trace)}
            cap={open?.cap ?? 0} onCap={(cap) => setOpen((o) => (o ? { ...o, cap } : o))} onClose={() => setOpen(null)} />
        )
      })()}
    </aside>
  )
}

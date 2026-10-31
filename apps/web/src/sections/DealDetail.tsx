import { useEffect, useRef, useState, type CSSProperties } from "react"
import { useReducedMotion } from "motion/react"
import styles from "./DealDetail.module.css"

/* The deal-room detail: opened from a work-log step or a check line in the band. One capability at a time, shown as a
   short animated scene of the agents and the contract, followed by the agent-log steps that belong to it. The five
   capabilities are tabs, so a visitor can walk the whole agreement. Every value is illustrative and matches the panel
   it was opened from. Native <dialog>: focus stays inside, Esc closes. Reduced motion shows each scene's end state. */

export type Mark = "p" | "f" | "o" // passed, failed, open
export type Attempt = { call: string; fail?: "amount" | "recipient"; err?: string }
export type Detail = {
  you: string
  them: string
  hashes: [string, string]
  terms: string
  keyLabel: string
  key: string
  agreement: string
  pay: Attempt[]
  domain: string
  account: string
  marks?: Mark[]
  marksLabel?: string
  rows: [string, string, string][]
  result: string
}
export type LogStep = { k: "think" | "call" | "wait" | "event" | "out"; t: string; r?: string; s: number; bad?: boolean }

const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties

const Check = () => (
  <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" /></svg>
)
const Cross = () => (
  <svg viewBox="0 0 16 16" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
)
const Dots = () => <span className={styles.dots} aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i} />)}</span>

/* ---------- 1. Confidential negotiation: both mandates go in sealed, only the terms come out ---------- */
function Negotiation({ x }: { x: Detail }) {
  const side = (name: string, hash: string, right: boolean, delay: number) => (
    <div className={styles.party} style={d(delay)}>
      <div className={styles.partyHead}><Dots /><span>{name}</span></div>
      <div className={styles.redact} aria-label="Mandate, sealed"><i /><i /><i /></div>
      <code className={styles.hash}>{hash}</code>
      <span className={`${styles.wire} ${right ? styles.wireL : styles.wireR}`} style={d(delay + 0.5)} aria-hidden="true"><b /></span>
    </div>
  )
  return (
    <div className={styles.neg}>
      {side(x.you, x.hashes[0], false, 0)}
      <div className={styles.table}>
        <span className={styles.tableName}>Sealed Table</span>
        <span className={styles.tableState}>
          <span className={styles.tableRun} style={d(1.2)}><span className={styles.spin} aria-hidden="true" /> negotiating</span>
          <span className={styles.attest} style={d(2.4)}><Check /> attestation verified</span>
        </span>
      </div>
      {side(x.them, x.hashes[1], true, 0.25)}
      <div className={styles.termsOut} style={d(2.9)}>
        <span className={styles.kicker}>Only this comes out</span>
        <code>{x.terms}</code>
      </div>
    </div>
  )
}

/* ---------- 2. Agent permissions: a NEAR function-call key that can reach act() and nothing else ---------- */
const METHODS: [string, string | null][] = [
  ["act()", null],
  ["approve_terms()", "MethodNameMismatch"],
  ["accept_payee()", "MethodNameMismatch"],
  ["transfer", "RequiresFullAccess"],
]
function Permissions({ x }: { x: Detail }) {
  return (
    <div className={styles.perm}>
      <div className={styles.keyCard} style={d(0)}>
        <span className={styles.kicker}>{x.keyLabel}</span>
        <code className={styles.keyId}>{x.key}</code>
        <span className={styles.keyMeta}>Function-call key · {x.agreement}</span>
        <span className={styles.keyScope}>method_names: [<code>"act"</code>]</span>
      </div>
      <ol className={styles.calls}>
        {METHODS.map(([m, err], i) => (
          <li key={m} className={styles.callRow} style={d(0.5 + i * 0.55)}>
            <code>{m}</code>
            <span className={`${styles.badge} ${err ? styles.no : styles.yes}`} style={d(0.85 + i * 0.55)}>
              {err ? <><Cross /> {err}</> : <><Check /> allowed</>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ---------- 3. Payment controls: every act(Pay) is checked against the approved terms ---------- */
const GATES = ["amount", "schedule", "recipient"] as const
function Payments({ x }: { x: Detail }) {
  return (
    <ol className={styles.pay}>
      {x.pay.map((a, i) => {
        const t0 = i * 1.1
        return (
          <li key={a.call} className={styles.payRow} style={d(t0)}>
            <code className={styles.payCall}>{a.call}</code>
            <span className={styles.gates}>
              {GATES.map((g, j) => {
                const bad = a.fail === g
                return (
                  <span key={g} className={`${styles.gate} ${bad ? styles.gateBad : styles.gateOk}`} style={d(t0 + 0.3 + j * 0.15)}>
                    {bad ? <Cross /> : <Check />} {g}
                  </span>
                )
              })}
            </span>
            <span className={`${styles.badge} ${a.fail ? styles.no : styles.yes}`} style={d(t0 + 0.85)}>
              {a.fail ? <>refused · {a.err}</> : <>accepted</>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/* ---------- 4. Recipient authorisation: the domain is proven, approved, then bound to one account ---------- */
function Recipient({ x }: { x: Detail }) {
  const nodes: [string, string, string][] = [
    ["Domain", x.domain, "propose_payee"],
    ["Proof", "domain verified", "verify-payee job"],
    ["Authority", "approved", "approve_payee"],
    ["Bound", x.account, "accept_payee · v1"],
  ]
  return (
    <div className={styles.chain}>
      <span className={styles.rail} aria-hidden="true"><b /></span>
      {nodes.map(([k, v, call], i) => (
        <div key={k} className={styles.node} style={d(0.2 + i * 0.6)}>
          <span className={styles.nodeDot} style={d(0.35 + i * 0.6)}><Check /></span>
          <span className={styles.kicker}>{k}</span>
          <code className={styles.nodeVal}>{v}</code>
          <span className={styles.nodeCall}>{call}</span>
        </div>
      ))}
      <p className={styles.chainNote} style={d(2.8)}>A different account is refused at payment. Changing it later needs a new version, the authority's approval and a 24 hour timelock.</p>
    </div>
  )
}

/* ---------- 5. Conditional settlement: payment becomes eligible only when the agreed conditions are measured ---------- */
function Settlement({ x }: { x: Detail }) {
  const marks = x.marks ?? []
  const after = 0.3 + marks.length * 0.3
  return (
    <div className={styles.settle}>
      {marks.length ? (
        <div className={styles.marksWrap}>
          <span className={styles.kicker}>{x.marksLabel}</span>
          <ol className={styles.marks}>
            {marks.map((m, i) => (
              <li key={i} className={`${styles.mark} ${styles[`m_${m}`]}`} style={d(0.3 + i * 0.3)}>
                <span>{m === "p" ? <Check /> : m === "f" ? <Cross /> : null}</span>
                <small>{i + 1}</small>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      <dl className={styles.rows}>
        {x.rows.map(([k, v, need], i) => (
          <div key={k} className={styles.row} style={d(after + i * 0.25)}>
            <dt>{k}</dt><dd><code>{v}</code><span>{need}</span></dd>
          </div>
        ))}
      </dl>
      <div className={styles.result} style={d(after + x.rows.length * 0.25 + 0.3)}>
        <span className={styles.ok}><Check /></span>{x.result}
      </div>
    </div>
  )
}

const SCENES = [Negotiation, Permissions, Payments, Recipient, Settlement]

const secs = (n: number) => (n < 60 ? `${n}s` : `${Math.floor(n / 60)}m ${String(n % 60).padStart(2, "0")}s`)

const SHORT = ["Negotiation", "Permissions", "Payments", "Recipient", "Settlement"]

export function DealDetail({ open, room, caps, lines, detail, steps, cap, onCap, onClose }: {
  open: boolean
  room: string
  caps: string[]
  lines: React.ReactNode[]
  detail: Detail
  steps: LogStep[][] // the agent-log steps for each capability
  cap: number
  onCap: (i: number) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const reduce = useReducedMotion() ?? false
  const [run, setRun] = useState(0) // bumps to replay the scene
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
    if (!open) return
    /* hold the page still behind the dialog */
    const root = document.documentElement
    const prev = root.style.overflow
    root.style.overflow = "hidden"
    return () => { root.style.overflow = prev }
  }, [open])
  useEffect(() => { setRun((r) => r + 1) }, [cap, open])
  const Scene = SCENES[cap]
  const log = steps[cap] ?? []

  return (
    <dialog ref={ref} className={styles.dialog} aria-labelledby="deal-detail-title" data-lenis-prevent data-seo-skip
      onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose() }}>
      {open ? (
        <div className={`${styles.card} ${reduce ? styles.still : ""}`}>
          <div className={styles.top}>
            <span>Deal room · {room}</span>
            <span className={styles.topRight}>
              <span className={styles.tag}>Illustrative</span>
              <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
              </button>
            </span>
          </div>

          <div className={styles.tabs} role="tablist" aria-label="Capabilities">
            {caps.map((c, i) => (
              <button key={c} type="button" role="tab" aria-selected={i === cap} className={`${styles.tab} ${i === cap ? styles.tabOn : ""}`} onClick={() => onCap(i)}>
                <span className={styles.tabNum}>{i + 1}</span>{SHORT[i] ?? c}
              </button>
            ))}
          </div>

          <div className={styles.head}>
            <h3 id="deal-detail-title" className={styles.title}>{caps[cap]}</h3>
            <p className={styles.sub}>{lines[cap]}</p>
          </div>

          <div className={styles.stage} key={run}>
            <span className={styles.grid} aria-hidden="true" />
            <Scene x={detail} />
            {!reduce ? (
              <button type="button" className={styles.replay} onClick={() => setRun((r) => r + 1)}>
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 8a5.5 5.5 0 1 0 1.7-4M2.5 2.5v3h3" /></svg>
                Replay
              </button>
            ) : null}
          </div>

          {log.length ? (
            <div className={styles.log}>
              <span className={styles.kicker}>From the agent's log</span>
              <ol>
                {log.map((st, i) => (
                  <li key={i} className={`${styles.step} ${styles[`k_${st.k}`]}`}>
                    <span className={styles.stepHead}>
                      <span className={styles.glyph}>{st.k === "call" ? "▸" : st.k === "event" ? "←" : st.k === "think" ? "∴" : st.k === "wait" ? "…" : "="}</span>
                      <span className={styles.stepText}>{st.t}</span>
                    </span>
                    {st.r ? <span className={`${styles.stepOut} ${st.bad ? styles.bad : ""}`}>{st.bad ? "✕" : "↳"} {st.r} <span className={styles.took}>{secs(st.s)}</span></span> : null}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <div className={styles.foot}>
            <button type="button" className={styles.nav} onClick={() => onCap((cap + caps.length - 1) % caps.length)}>← {SHORT[(cap + caps.length - 1) % caps.length]}</button>
            <button type="button" className={styles.nav} onClick={() => onCap((cap + 1) % caps.length)}>{SHORT[(cap + 1) % caps.length]} →</button>
          </div>
        </div>
      ) : null}
    </dialog>
  )
}

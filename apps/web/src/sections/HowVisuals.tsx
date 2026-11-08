import type { ReactNode } from "react"
import styles from "./HowVisuals.module.css"

/* How it works · one live instrument per step (8 Nov 2026). Each takes `p`, the phase reached (0 … PHASES[n]), and
   shows the step's idea as a small product view rather than a log: mandates turning into ciphertext, offers meeting
   inside two sealed ranges, signatures and the escrow filling, requests meeting three checks, observations landing at
   hidden times, the payment travelling and the receipt printing. Values are illustrative and match the market-making
   room in the deal-room band. Teal for a pass; refusal red only for a refusal. Purely visual: aria-hidden, with the
   step's text alternative rendered beside it by HowSteps. */

export const PHASES: Record<string, number> = { "01": 4, "02": 4, "03": 4, "04": 3, "05": 6, "06": 4 }

const Tick = () => (
  <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" /></svg>
)
const Cross = () => (
  <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
)
const LockIcon = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={`${styles.lock} ${on ? styles.lockOn : ""}`} aria-hidden="true">
    <rect x="3" y="7" width="10" height="7" rx="2" /><path d={on ? "M5.5 7V5a2.5 2.5 0 0 1 5 0v2" : "M5.5 7V5a2.5 2.5 0 0 1 5 0"} />
  </svg>
)
const Pill = ({ tone, children }: { tone: "ok" | "bad" | "wait" | "run"; children: ReactNode }) => (
  <span className={`${styles.pill} ${styles[tone]}`}>{tone === "ok" ? <Tick /> : tone === "bad" ? <Cross /> : tone === "run" ? <span className={styles.spin} /> : null}{children}</span>
)

/* 01 · two mandates seal into ciphertext; their commitments appear */
function Sealed({ p }: { p: number }) {
  const rows = [
    { who: "Buyer mandate", by: "yourco.near", fields: [["ceiling", "20,000 USDC"], ["spread", "< 70 bps"]], cipher: ["a7f3 9c1e 04d2", "e81b 33fa 7c90"], commit: "9f3c…a1", at: 1 },
    { who: "Seller mandate", by: "halcyon-mm.near", fields: [["floor", "17,000 USDC"], ["term", "1 quarter"]], cipher: ["5d0e b27a 9113", "c4f8 0a6d 2e57"], commit: "41de…7b", at: 2 },
  ]
  return (
    <div className={styles.mandates}>
      {rows.map((r) => {
        const sealed = p >= r.at
        return (
          <div key={r.who} className={`${styles.mandate} ${sealed ? styles.mandateOn : ""}`}>
            <div className={styles.mHead}><LockIcon on={sealed} /><span>{r.who}</span><span className={styles.dim}>{r.by}</span></div>
            {r.fields.map(([k, v], i) => (
              <div key={k} className={styles.mRow}>
                <span className={styles.dim}>{k}</span>
                <span className={styles.swap}>
                  <span className={`${styles.plain} ${sealed ? styles.gone : ""}`}>{v}</span>
                  <span className={`${styles.cipher} ${sealed ? styles.shown : ""}`}>{r.cipher[i]}</span>
                </span>
              </div>
            ))}
            <div className={`${styles.commit} ${p >= 3 ? styles.shown : ""}`}>commitment {r.commit} · on NEAR</div>
          </div>
        )
      })}
    </div>
  )
}

/* 02 · offers move along a price axis and meet inside both sealed ranges */
const AX = (v: number) => `${((v - 16500) / (21000 - 16500)) * 100}%`
function Attested({ p }: { p: number }) {
  const offers = [
    { v: 19800, who: "ask", at: 1 },
    { v: 18000, who: "counter", at: 2 },
  ]
  return (
    <div className={styles.neg}>
      <div className={styles.axis}>
        <span className={`${styles.zone} ${styles.zoneSeller}`} style={{ left: AX(17000), right: `calc(100% - ${AX(21000)})` }}><em>seller range · sealed</em></span>
        <span className={`${styles.zone} ${styles.zoneBuyer}`} style={{ left: AX(16500), right: `calc(100% - ${AX(20000)})` }}><em>buyer range · sealed</em></span>
        <span className={styles.line} />
        {offers.map((o) => (
          <span key={o.who} className={`${styles.offer} ${p >= o.at ? styles.shown : ""} ${p >= 3 ? styles.faded : ""}`} style={{ left: AX(o.v) }}>
            <i /><b>{o.v.toLocaleString("en-US")}</b><small>{o.who}</small>
          </span>
        ))}
        <span className={`${styles.deal} ${p >= 3 ? styles.shown : ""}`} style={{ left: AX(18500) }}><small>agreed</small><b>18,500</b><i /></span>
        {[16500, 18000, 19500, 21000].map((v) => <span key={v} className={styles.tickMark} style={{ left: AX(v) }}>{(v / 1000).toFixed(1)}k</span>)}
      </div>
      <div className={styles.negFoot}>
        <span className={styles.dim}>Only the agreed terms leave the enclave</span>
        <span className={`${styles.badge} ${p >= 4 ? styles.shown : ""}`}><Tick /> attested</span>
      </div>
    </div>
  )
}

/* 03 · both signatures, the recipient binding, the escrow filling */
function Approved({ p }: { p: number }) {
  return (
    <div className={styles.stack}>
      <div className={styles.hashRow}><span className={styles.dim}>terms hash</span><span className={styles.mono}>7c2e 91af · 18,500 USDC a period</span></div>
      {[["yourco.near", "buyer", 1], ["halcyon-mm.near", "vendor", 2]].map(([who, role, at]) => (
        <div key={String(who)} className={styles.sig}>
          <span className={styles.avatar}>{String(who)[0].toUpperCase()}</span>
          <span className={styles.sigName}>{String(who)}<small>{String(role)}</small></span>
          <Pill tone={p >= Number(at) ? "ok" : p === Number(at) - 1 ? "run" : "wait"}>{p >= Number(at) ? "approved" : "pending"}</Pill>
        </div>
      ))}
      <div className={`${styles.bind} ${p >= 3 ? styles.shown : ""}`}>
        <span className={styles.mono}>halcyon-mm.near</span><span className={styles.link} /><span className={styles.mono}>halcyon-mm.xyz</span><Pill tone="ok">bound</Pill>
      </div>
      <div className={styles.escrow}>
        <div className={styles.escrowHead}><span>Escrow · USDC on NEAR</span><span className={p >= 4 ? styles.okText : styles.dim}>{p >= 4 ? "funded" : "waiting for approval"}</span></div>
        <div className={styles.bar}><span style={{ transform: `scaleX(${p >= 4 ? 1 : 0})` }} /></div>
      </div>
    </div>
  )
}

/* 04 · three requests meet three checks */
const CHECKS = ["milestone", "amount", "recipient"]
function Executing({ p }: { p: number }) {
  const reqs = [
    { t: "18,500 → halcyon-mm.near", r: [1, 1, 1], out: "within the terms", bad: false },
    { t: "18,500 → halcyon-ops.near", r: [1, 1, 0], out: "ERR_PAYEE_MISMATCH", bad: true },
    { t: "25,000 → halcyon-mm.near", r: [1, 0, 1], out: "ERR_AMOUNT_MISMATCH", bad: true },
  ]
  return (
    <div className={styles.gate}>
      <div className={styles.gateHead}><span>act() request</span>{CHECKS.map((c) => <span key={c} className={styles.gCol}>{c}</span>)}<span className={styles.gRes}>result</span></div>
      {reqs.map((q, i) => {
        const on = p > i
        return (
          <div key={q.t} className={`${styles.gRow} ${on ? styles.shown : ""}`}>
            <span className={styles.gReq}>{q.t}</span>
            {q.r.map((ok, k) => <span key={k} className={styles.gCol}><span className={`${styles.dot} ${on ? (ok ? styles.dotOk : styles.dotBad) : ""}`} style={{ transitionDelay: `${0.15 + k * 0.15}s` }}>{on ? (ok ? <Tick /> : <Cross />) : null}</span></span>)}
            <span className={`${styles.gRes} ${q.bad ? styles.badText : styles.okText}`}>{on ? q.out : ""}</span>
          </div>
        )
      })}
    </div>
  )
}

/* 05 · six observations at hidden times against the agreed spread and depth */
function Checked({ p }: { p: number }) {
  const slots = [{ x: 9, ok: 1 }, { x: 24, ok: 1 }, { x: 41, ok: 0 }, { x: 58, ok: 1 }, { x: 77, ok: 1 }, { x: 92, ok: 0 }]
  const passed = slots.slice(0, p).filter((s) => s.ok).length
  return (
    <div className={styles.obs}>
      <svg viewBox="0 0 320 96" className={styles.book} aria-hidden="true">
        <path d="M8 88 C 60 82, 110 58, 152 22 L152 88 Z" className={styles.bid} />
        <path d="M8 88 C 60 82, 110 58, 152 22" className={styles.bidLine} />
        <path d="M168 22 C 210 58, 260 82, 312 88 L168 88 Z" className={styles.ask} />
        <path d="M168 22 C 210 58, 260 82, 312 88" className={styles.askLine} />
        <line x1="160" y1="8" x2="160" y2="90" className={styles.mid} />
        <line x1="8" y1="58" x2="312" y2="58" className={styles.need} />
        <text x="312" y="52" textAnchor="end" className={styles.svgLbl}>agreed depth</text>
      </svg>
      <div className={styles.timeline}>
        <span className={styles.tl} />
        {slots.map((s, i) => (
          <span key={i} className={`${styles.pin} ${p > i ? (s.ok ? styles.pinOk : styles.pinMiss) : ""}`} style={{ left: `${s.x}%` }}>{p > i ? (s.ok ? <Tick /> : <Cross />) : null}</span>
        ))}
        <span className={styles.tlLbl}>Period 1 · six readings at hidden times</span>
      </div>
      <div className={styles.count}><b className={passed >= 4 ? styles.okText : ""}>{passed}</b><span> of 6 passed · 4 needed</span><span className={`${styles.badge} ${p >= 6 ? styles.shown : ""}`}><Tick /> eligible</span></div>
    </div>
  )
}

/* 06 · the payment travels, the receipt prints, verify ticks */
function Settled({ p }: { p: number }) {
  return (
    <div className={styles.stack}>
      <div className={styles.flowRow}>
        <span className={styles.node}>escrow</span>
        <span className={styles.path}><span className={`${styles.coin} ${p >= 1 ? styles.coinGo : ""}`}>$</span></span>
        <span className={`${styles.node} ${p >= 2 ? styles.nodeOn : ""}`}>halcyon-mm.near</span>
      </div>
      <div className={`${styles.receipt} ${p >= 2 ? styles.shown : ""}`}>
        <div><span className={styles.dim}>transfer</span><span className={styles.mono}>18,500 USDC</span></div>
        <div><span className={styles.dim}>to</span><span className={styles.mono}>halcyon-mm.near · halcyon-mm.xyz</span></div>
        <div><span className={styles.dim}>record</span><span className={styles.mono}>1 payment · 2 refusals · 6 readings</span></div>
      </div>
      <div className={`${styles.verify} ${p >= 3 ? styles.shown : ""}`}>
        <span className={styles.mono}>$ make verify</span>
        {["contract code", "agent key", "recipient proof", "record"].map((c, i) => (
          <Pill key={c} tone={p >= 4 || (p >= 3 && i < 2) ? "ok" : "wait"}>{c}</Pill>
        ))}
      </div>
    </div>
  )
}

export const VISUAL: Record<string, (props: { p: number }) => ReactNode> = {
  "01": Sealed, "02": Attested, "03": Approved, "04": Executing, "05": Checked, "06": Settled,
}

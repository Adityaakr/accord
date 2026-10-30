import type { CSSProperties, ReactNode } from "react"
import { LogoMark } from "./Logo"
import styles from "./HeroPreview.module.css"

/* Hero product preview, built to the template's original hero image (assets/hero-image-2.png): misty backdrop, a
   light app window with stacked windows behind it, an icon rail, a list panel, a canvas of numbered nodes, and an
   assistant-style side panel. The content is Accord's: the deal-room list, the Accord Atlas agreement as its seven-step
   pipeline, and the agreement's activity. Illustrative (labelled so); nothing is read from a live source.
   Scales with its container: 1em = container width / 108. */

/* ---------- icons (Lucide-style, 24 grid, 1.75 stroke) ---------- */
const P: Record<string, ReactNode> = {
  rooms: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  chat: <><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l.9-5.4A8 8 0 1 1 21 12Z" /></>,
  badge: <><path d="M12 3 14.4 5l3.1-.2.7 3 2.6 1.8-1.1 2.9 1.1 2.9-2.6 1.8-.7 3-3.1-.2L12 21l-2.4-2-3.1.2-.7-3-2.6-1.8 1.1-2.9-1.1-2.9 2.6-1.8.7-3 3.1.2Z" /><path d="m9 12 2 2 4-4" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  star: <><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9Z" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  down: <><path d="m6 9 6 6 6-6" /></>,
  right: <><path d="m9 6 6 6-6 6" /></>,
  x: <><path d="M18 6 6 18M6 6l12 12" /></>,
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  file: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M9 14l2 2 4-4" /></>,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  branch: <><circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="9" r="2" /><path d="M6 8v8M18 11c0 4-6 3-10 5" /></>,
  send: <><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></>,
  swap: <><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" /></>,
  ban: <><circle cx="12" cy="12" r="9" /><path d="m5.7 5.7 12.6 12.6" /></>,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></>,
  check: <><path d="m5 12 5 5L20 7" /></>,
  spark: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></>,
}
function I({ n, className = "" }: { n: keyof typeof P; className?: string }) {
  return <svg viewBox="0 0 24 24" className={`${styles.ic} ${className}`} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[n]}</svg>
}

/* ---------- content ---------- */
type Room = { icon: keyof typeof P; name: string; sub: string; state: "Executing" | "Attested" | "Sealed" | "Settled"; active?: boolean }
const GROUPS: { label: string; rooms: Room[] }[] = [
  { label: "Market making", rooms: [
    { icon: "chart", name: "Atlas · NEAR/USDC", sub: "Retainer · 18,500 USDC", state: "Executing", active: true },
    { icon: "chart", name: "Atlas · L2/USDC", sub: "Retainer · 12,500 USDC", state: "Attested" },
  ] },
  { label: "Vendors and invoices", rooms: [
    { icon: "file", name: "Cloud GPU capacity", sub: "Invoice · 48,000 USDC", state: "Executing" },
    { icon: "file", name: "Indexer hosting, Q1", sub: "3 milestones · 36,000 USDC", state: "Attested" },
    { icon: "badge", name: "Smart contract audit", sub: "2 milestones · 60,000 USDC", state: "Sealed" },
  ] },
  { label: "Agent services", rooms: [
    { icon: "spark", name: "Inference API credits", sub: "Usage cap · 5,000 USDC", state: "Executing" },
    { icon: "swap", name: "Market data feed", sub: "Licence · 18,000 USDC / year", state: "Settled" },
  ] },
  { label: "Foundations", rooms: [
    { icon: "branch", name: "Ecosystem grant", sub: "4 milestones · 80,000 USDC", state: "Sealed" },
  ] },
]

type Node = { n: number; icon: keyof typeof P; title: string; sub: string; kind: string; status: "done" | "now" | "next"; slots?: boolean }
const NODES: Record<string, Node> = {
  a: { n: 1, icon: "lock", title: "Sealed mandates", sub: "Both companies sealed limits", kind: "Sealed Table", status: "done" },
  b: { n: 2, icon: "file", title: "Approved terms", sub: "18,500 USDC / period", kind: "Agreement", status: "done" },
  c: { n: 3, icon: "badge", title: "Authorised recipient", sub: "halcyon-mm.testnet · v1", kind: "Payee", status: "done" },
  d: { n: 4, icon: "eye", title: "Observation slots", sub: "Period 3", kind: "Atlas observer", status: "done", slots: true },
  e: { n: 5, icon: "branch", title: "Period decision", sub: "5 of 6 passed · eligible", kind: "Decision", status: "done" },
  f: { n: 6, icon: "send", title: "Payment request", sub: "18,500 USDC → halcyon-mm", kind: "Agreement controls", status: "now" },
  g: { n: 7, icon: "swap", title: "Transfer", sub: "USDC on NEAR testnet", kind: "Settlement", status: "next" },
}
const SLOTS = [1, 1, 0, 1, 1, 1]

/* Canvas layout: three columns (25% wide, 10% gutters), rows 10em apart, nodes 8em tall (the slots node is taller) */
const COLS = ["2.5%", "37.5%", "72.5%"]
const ROWS_EM = [1.6, 11.6, 21.6, 31.6]
const PLACED: [keyof typeof NODES, number, number][] = [["a", 0, 0], ["b", 1, 0], ["c", 2, 0], ["d", 1, 1], ["e", 2, 1], ["f", 2, 2], ["g", 2, 3]]
const MID = 3.1 // em below a node's top: the head row's centre
const CONDITIONS: [string, string][] = [["Spread", "≤ 40 bps"], ["Depth ±1%", "≥ 12,000 USDC"], ["Uptime", "≥ 95%"], ["Pass rule", "5 of 6 slots"]]
const WIRES: { v?: boolean; x: string; y: number; w?: string; len?: number; dashed?: boolean }[] = [
  { x: "27.5%", y: 1.6 + MID, w: "10%" },          // 1 → 2
  { x: "62.5%", y: 1.6 + MID, w: "10%" },          // 2 → 3
  { x: "62.5%", y: 11.6 + MID, w: "10%" },         // 4 → 5
  { x: "27.5%", y: 11.6 + MID, w: "10%", dashed: true },  // conditions → 4
  { v: true, x: "50%", y: 9.6, len: 2 },           // 2 → 4
  { v: true, x: "85%", y: 9.6, len: 2 },           // 3 → 5
  { v: true, x: "85%", y: 19.6, len: 2 },          // 5 → 6
  { v: true, x: "85%", y: 29.6, len: 2 },          // 6 → 7
]

const INSIGHTS = [
  { icon: "ban" as const, tone: "refuse", title: "Payment refused", text: "ERR_PAYEE_MISMATCH: the destination is not the authorised recipient.", link: "View in refusal log" },
  { icon: "alert" as const, tone: "warn", title: "Slot 3 missed", text: "Spread above 40 bps for this observation; period still eligible.", link: "Inspect attestation" },
  { icon: "check" as const, tone: "ok", title: "Period 2 settled", text: "18,500 USDC confirmed to halcyon-mm.testnet.", link: "Open transaction" },
]
const EVENTS = [
  { t: "Attempt refused, nothing signed", ago: "12m ago" },
  { t: "Period 2 payment confirmed", ago: "2h ago" },
  { t: "Recipient v1 approved", ago: "3d ago" },
]
const ACTIONS = ["Verify", "Revoke key", "Export record", "Propose change"]

function NodeCard({ node, style }: { node: Node; style: CSSProperties }) {
  return (
    <div className={`${styles.node} ${styles[node.status]}`} style={style}>
      <div className={styles.nodeHead}>
        <span className={styles.nodeIcon}><I n={node.icon} /></span>
        <span className={styles.nodeNum}>{node.n}</span>
        <span className={styles.nodeState}>{node.status === "done" ? <I n="check" /> : node.status === "now" ? <span className={styles.liveDot} /> : null}</span>
        <I n="more" className={styles.dim} />
      </div>
      <div className={styles.nodeBody}>
        <div className={styles.nodeTitle}>{node.title}</div>
        <div className={styles.nodeSub}>{node.sub}</div>
        {node.slots ? (
          <div className={styles.slots}>{SLOTS.map((ok, i) => <span key={i} className={ok ? styles.pass : styles.fail}>{ok ? <I n="check" /> : <I n="x" />}</span>)}</div>
        ) : null}
      </div>
      <div className={styles.nodeFoot}>{node.kind}</div>
    </div>
  )
}

export function HeroPreview() {
  return (
    <div className={styles.stage} role="img" aria-label="Illustrative Accord product: the deal-room list, an Accord Atlas market-making agreement shown as its seven-step pipeline from sealed mandates to the USDC transfer on NEAR, and the agreement's activity: a refused payment, a missed observation slot and a settled period.">
      <span className={styles.sheet2} aria-hidden="true" />
      <span className={styles.sheet1} aria-hidden="true" />
      <div className={styles.window}>
        {/* Rail */}
        <aside className={styles.rail}>
          <span className={styles.logo}><LogoMark size={18} /></span>
          <span className={`${styles.railBtn} ${styles.railOn}`}><I n="rooms" /></span>
          <span className={styles.railBtn}><I n="chart" /></span>
          <span className={styles.railBtn}><I n="chat" /></span>
          <span className={styles.railBtn}><I n="badge" /></span>
          <span className={styles.railBtn}><I n="mail" /></span>
          <span className={`${styles.railBtn} ${styles.railBottom}`}><I n="help" /></span>
        </aside>

        {/* Deal rooms */}
        <section className={styles.list}>
          <header className={styles.listHead}><b>Deal rooms <span className={styles.count}>8</span></b><span className={styles.tools}><I n="search" /><I n="plus" /></span></header>
          <div className={styles.chips}><span className={styles.chip}>All rooms <I n="down" /></span><span className={styles.chip}>Any state <I n="down" /></span></div>
          {GROUPS.map((g) => (
            <div key={g.label} className={styles.group}>
              <div className={styles.groupLabel}>{g.label}</div>
              {g.rooms.map((r) => (
                <div key={r.name} className={`${styles.room} ${r.active ? styles.roomOn : ""}`}>
                  <span className={styles.roomIcon}><I n={r.icon} /></span>
                  <span className={styles.roomText}><span className={styles.roomName}>{r.name}</span><span className={styles.roomSub}>{r.sub}</span></span>
                  <span className={`${styles.state} ${styles["st" + r.state]}`}><span className={styles.stDot} />{r.state}</span>
                </div>
              ))}
            </div>
          ))}
        </section>

        {/* Agreement */}
        <section className={styles.main}>
          <header className={styles.mainHead}>
            <span className={styles.mainTitle}>Atlas · NEAR/USDC</span>
            <I n="star" className={styles.dim} />
            <I n="more" className={styles.dim} />
            <span className={styles.tag}>Illustrative</span>
            <span className={styles.grow} />
            <span className={styles.btnGhost}>Verify</span>
            <span className={styles.btnDark}>Open record</span>
          </header>
          <div className={styles.toolbar}>
            <span className={styles.btnSmall}><I n="plus" /> Propose change</span>
            <span className={styles.sep} />
            <span className={styles.meta}>7 steps</span>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaLive}>Executing</span>
            <span className={styles.grow} />
            <span className={styles.meta}>NEAR testnet · USDC</span>
          </div>
          <div className={styles.canvas}>
            {/* connectors: x in % of the canvas, y in em, matching the node grid below */}
            {WIRES.map((w, i) => <span key={i} className={`${w.v ? styles.wireV : styles.wireH} ${w.dashed ? styles.dashed : ""}`} style={w.v ? { left: w.x, top: `${w.y}em`, height: `${w.len}em` } : { left: w.x, top: `${w.y}em`, width: w.w }} />)}
            {PLACED.map(([k, col, row]) => <NodeCard key={k} node={NODES[k]} style={{ left: COLS[col], top: `${ROWS_EM[row]}em` }} />)}
            {/* The measured conditions, wired into the observer */}
            <div className={styles.terms} style={{ left: COLS[0], top: `${ROWS_EM[1]}em` }}>
              <div className={styles.termsHead}><I n="eye" /> Measured conditions</div>
              {CONDITIONS.map(([k, v]) => <div key={k} className={styles.termRow}><span>{k}</span><code>{v}</code></div>)}
              <div className={styles.termsFoot}>Approved by both companies</div>
            </div>
          </div>
        </section>

        {/* Activity */}
        <section className={styles.side}>
          <header className={styles.sideHead}><span className={styles.sideMark}><I n="spark" /></span><b>Agreement activity</b><I n="x" className={styles.dim} /></header>
          {INSIGHTS.map((c) => (
            <div key={c.title} className={styles.insight}>
              <span className={`${styles.insightIcon} ${styles[c.tone]}`}><I n={c.icon} /></span>
              <div className={styles.insightBody}>
                <div className={styles.insightTitle}>{c.title}</div>
                <div className={styles.insightText}>{c.text}</div>
                <div className={styles.insightLink}>{c.link} <I n="right" /></div>
              </div>
            </div>
          ))}
          <div className={styles.label}>Recent events</div>
          {EVENTS.map((e) => <div key={e.t} className={styles.event}><span>{e.t}</span><span className={styles.ago}>{e.ago}</span></div>)}
          <div className={styles.label}>Quick actions</div>
          <div className={styles.actions}>{ACTIONS.map((a) => <span key={a} className={styles.action}>{a}</span>)}</div>
        </section>
      </div>
    </div>
  )
}

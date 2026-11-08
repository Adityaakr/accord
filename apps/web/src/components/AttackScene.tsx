import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { animate, motion, useInView, useReducedMotion } from "motion/react"
import { LogoMark } from "./Logo"
import styles from "./AttackScene.module.css"

/* "Where each attack stops", as an isometric scene (kit v6.6 threats.svg content, every label verbatim; redrawn at
   Adi's request, 30 Oct 2026). An inbox of five messages feeds the agent; every path then crosses the Accord platform,
   where a check in code decides what happens: Agreement controls, Payee or the Sealed Table. Outcomes sit beyond:
   the refusal log, no change, terms inside your limits. The authorised recipient is reachable only through the checks.
   The scene walks through the five attacks in turn (path draws, a token rides it, the check pulses, the result stamps);
   choosing an attack takes control. Reduced motion: no cycling and no token; the chosen path is drawn at rest. */

/* ---------- isometric projection ---------- */
const C = Math.cos(Math.PI / 6)
const P = (x: number, y: number, z: number): [number, number] => [(x - y) * C, (x + y) * 0.5 - z]
const pts = (a: [number, number][]) => a.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")

type Tone = "base" | "gate" | "refuse" | "ghost" | "recipient" | "slab"
type BoxSpec = { id: string; x: number; y: number; z?: number; w: number; d: number; h: number; tone: Tone; label?: string; labelSize?: number }

/* Fit a label inside a face: one line if it fits at the preferred size, else two lines split at the most even space;
   shrink until the longest line fits the length and the lines fit the depth. ~0.56em per character (Host Grotesk 500). */
const CH = 0.56
function fitLabel(text: string, len: number, depth: number, pref: number) {
  const widthAt = (t: string, size: number) => t.length * CH * size
  let lines = [text]
  if (widthAt(text, pref * 0.8) > len && text.includes(" ")) {
    const words = text.split(" ")
    let best = [text], bestMax = Infinity
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ")
      const m = Math.max(a.length, b.length)
      if (m < bestMax) { bestMax = m; best = [a, b] }
    }
    lines = best
  }
  const longest = Math.max(...lines.map((l) => l.length))
  const byLen = len / (longest * CH)
  const byDepth = depth / (lines.length * 1.15)
  return { lines, size: Math.max(7, Math.min(pref, byLen, byDepth)) }
}

function Box({ b, active, lift = 0 }: { b: BoxSpec; active?: boolean; lift?: number }) {
  const z0 = (b.z ?? 0) + lift
  const t = z0 + b.h
  const { x, y, w, d } = b
  const top: [number, number][] = [P(x, y, t), P(x + w, y, t), P(x + w, y + d, t), P(x, y + d, t)]
  const right: [number, number][] = [P(x + w, y, z0), P(x + w, y + d, z0), P(x + w, y + d, t), P(x + w, y, t)]
  const left: [number, number][] = [P(x, y + d, z0), P(x + w, y + d, z0), P(x + w, y + d, t), P(x, y + d, t)]
  /* Label: centred on the top face (nudged toward the front, clear of where paths land), sized to fit inside it.
     Text runs along the face's rising edge (length d); a second line stacks along the other edge (length w). */
  const [cx, cy] = P(x + w * 0.54, y + d * 0.54, t)
  const label = b.label ? fitLabel(b.label, d * 0.76, w * 0.62, b.labelSize ?? 13) : null
  return (
    <g className={`${styles.box} ${styles[b.tone]} ${active ? styles.on : ""}`}>
      {b.h > 0 ? <polygon points={pts(left)} className={styles.faceL} /> : null}
      {b.h > 0 ? <polygon points={pts(right)} className={styles.faceR} /> : null}
      <polygon points={pts(top)} className={styles.faceT} />
      {label ? (
        <text transform={`matrix(${C} -0.5 ${C} 0.5 ${cx} ${cy})`} className={styles.faceText} style={{ fontSize: label.size }} textAnchor="middle">
          {label.lines.map((ln, k) => (
            <tspan key={k} x={0} y={(k - (label.lines.length - 1) / 2) * label.size * 1.15} dominantBaseline="central">{ln}</tspan>
          ))}
        </text>
      ) : null}
    </g>
  )
}
const topCenter = (b: BoxSpec, lift = 0): [number, number] => P(b.x + b.w / 2, b.y + b.d / 2, (b.z ?? 0) + b.h + lift)
/* Where paths land: the back half of the top face, a little above it, so labels on the front half stay clear */
const dock = (b: BoxSpec, lift = 0): [number, number] => P(b.x + b.w * 0.36, b.y + b.d * 0.34, (b.z ?? 0) + b.h + lift + 4)

/* ---------- scene ---------- */
const PLATFORM: BoxSpec = { id: "platform", x: 290, y: -205, z: -16, w: 440, d: 410, h: 16, tone: "slab" }
const AGENT: BoxSpec = { id: "agent", x: 150, y: -45, w: 90, d: 90, h: 80, tone: "base", label: "Agent", labelSize: 16 }
const GATES: Record<string, BoxSpec> = {
  controls: { id: "controls", x: 330, y: -55, w: 110, d: 110, h: 105, tone: "gate", label: "Agreement controls", labelSize: 16 },
  payee: { id: "payee", x: 340, y: 95, w: 90, d: 72, h: 62, tone: "gate", label: "Payee", labelSize: 14 },
  table: { id: "table", x: 470, y: -192, w: 86, d: 70, h: 62, tone: "gate", label: "Sealed Table", labelSize: 14 },
}
const OUTCOMES: Record<string, BoxSpec> = {
  log: { id: "log", x: 545, y: -50, w: 120, d: 100, h: 12, tone: "refuse", label: "Refusal log", labelSize: 15 },
  nochange: { id: "nochange", x: 545, y: 92, w: 104, d: 96, h: 0, tone: "ghost", label: "No change", labelSize: 13 },
  limits: { id: "limits", x: 600, y: -200, w: 112, d: 112, h: 8, tone: "base", label: "Inside your limits", labelSize: 13 },
}
const RECIPIENT: BoxSpec = { id: "recipient", x: 812, y: -50, w: 100, d: 100, h: 56, tone: "recipient", label: "Authorised recipient", labelSize: 13 }
const STEP = 24
const INBOX = (i: number): BoxSpec => ({ id: `in-${i}`, x: -40, y: -30, z: (4 - i) * STEP, w: 92, d: 70, h: 7, tone: "base" })

type Lane = {
  arrives: string; sub?: string; quote?: boolean; tags: string[]
  agent: ReactNode; agentSub?: string
  gate: keyof typeof GATES; stopLine: string
  outcome: keyof typeof OUTCOMES; codes?: string[]; resultTitle?: string; resultNote?: string
  /** shown on the collapsed row: where it ends, in a word or a code */
  chip: string
}

const LANES: Lane[] = [
  { arrives: "Our bank details have changed.", quote: true, tags: ["BEC", "ASI01 goal hijack"], agent: "Asks to pay the new account",
    gate: "controls", stopLine: "destination is not the authorised recipient", outcome: "log", codes: ["ERR_PAYEE_MISMATCH"], resultNote: "nothing sent", chip: "Refused" },
  { arrives: "Urgent: pay invoice 4471 today.", quote: true, tags: ["ASI02 tool misuse"], agent: "Asks for a payment", agentSub: "the schedule does not hold",
    gate: "controls", stopLine: "amount and milestone checked against the approved schedule", outcome: "log", codes: ["ERR_AMOUNT_MISMATCH", "ERR_NOT_DUE"], resultNote: "nothing sent", chip: "Refused" },
  { arrives: "Please update our payee.", sub: "sent from the vendor's real mailbox", quote: true, tags: ["BEC"], agent: "Has no method that changes a payee",
    gate: "payee", stopLine: "fresh domain proof · vendor authority · buyer accepts · 24-hour delay", outcome: "nochange", resultTitle: "No change from a message", resultNote: "real changes wait 24\u00a0h", chip: "No change" },
  { arrives: "The agent's key is stolen", tags: ["ASI03 privilege abuse"], agent: <>Attacker calls <code className={styles.code}>act()</code></>, agentSub: "with the stolen key",
    gate: "controls", stopLine: "the key can still pay only the approved amount to the authorised recipient; the buyer deletes it with revoke_agent in one transaction", outcome: "log", codes: ["AccessKeyDoesNotExist"], resultNote: "on every call after the revoke", chip: "Key revoked" },
  { arrives: "The other agent presses yours", sub: "to concede past your limit", tags: ["ASI07 inter-agent"], agent: "May concede in the conversation",
    gate: "table", stopLine: "code checks every proposal against both mandates' limits", outcome: "limits", resultTitle: "Terms inside your limits,", resultNote: "or no deal; you approve", chip: "Inside your limits" },
]
const GATE_TITLE: Record<keyof typeof GATES, string> = { controls: "Agreement controls", payee: "Payee", table: "Sealed Table" }
/* "Where it stops" sits above whichever check ends the active attack */
const STOP_AT: Record<keyof typeof GATES, { dx: number; dy: number }> = { controls: { dx: 20, dy: -104 }, payee: { dx: -128, dy: -6 }, table: { dx: 0, dy: -78 } }

const LIFT = 14
/* One curved path per lane: inbox tile → agent → the check → the outcome */
function lanePath(i: number) {
  const l = LANES[i]
  const a = dock(INBOX(i), LIFT), b = dock(AGENT), c = dock(GATES[l.gate]), d = dock(OUTCOMES[l.outcome])
  const q = (p: [number, number], r: [number, number], k: number) => `Q ${((p[0] + r[0]) / 2).toFixed(1)} ${(Math.min(p[1], r[1]) - k).toFixed(1)} ${r[0].toFixed(1)} ${r[1].toFixed(1)}`
  return `M ${a[0].toFixed(1)} ${a[1].toFixed(1)} ${q(a, b, 46)} ${q(b, c, 56)} ${q(c, d, 40)}`
}
const APPROVED = (() => {
  const c = dock(GATES.controls), r = dock(RECIPIENT)
  return `M ${c[0].toFixed(1)} ${c[1].toFixed(1)} Q ${((c[0] + r[0]) / 2).toFixed(1)} ${(Math.min(c[1], r[1]) - 120).toFixed(1)} ${r[0].toFixed(1)} ${r[1].toFixed(1)}`
})()

const CYCLE = 5200 // ms per attack while cycling
const DRAW = 2.1 // s for the path draw and token ride

function Callout({ at, children, dx = 0, dy = 0, w, live }: { at: [number, number]; children: string; dx?: number; dy?: number; w: number; live?: boolean }) {
  return (
    <g style={{ transform: `translate(${at[0] + dx}px, ${at[1] + dy}px)` }} className={`${styles.callout} ${live ? styles.calloutLive : ""}`}>
      <rect x={-w / 2} y={-13} width={w} height={26} rx={13} />
      <text textAnchor="middle" dominantBaseline="central">{children}</text>
    </g>
  )
}

export function AttackScene() {
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const [active, setActive] = useState(0)
  const [run, setRun] = useState(0) // bumps on each activation so the path redraws
  const [manual, setManual] = useState(false)
  const [paused, setPaused] = useState(false)
  const [arrived, setArrived] = useState(false)
  const pathRef = useRef<SVGPathElement>(null)
  const [tok, setTok] = useState<[number, number] | null>(null)
  const paths = useMemo(() => LANES.map((_, i) => lanePath(i)), [])

  /* Auto-cycle while visible, not paused, not taken over */
  useEffect(() => {
    if (reduce || manual || paused || !inView) return
    const t = window.setInterval(() => { setActive((a) => (a + 1) % LANES.length); setRun((r) => r + 1) }, CYCLE)
    return () => window.clearInterval(t)
  }, [reduce, manual, paused, inView])

  /* Token ride along the active path */
  useEffect(() => {
    setArrived(false)
    if (reduce || !inView) { setTok(null); setArrived(true); return }
    const el = pathRef.current
    if (!el) return
    const len = el.getTotalLength()
    const ctl = animate(0, 1, {
      duration: DRAW,
      ease: [0.45, 0, 0.2, 1],
      onUpdate: (t) => { const p = el.getPointAtLength(t * len); setTok([p.x, p.y]) },
      onComplete: () => setArrived(true),
    })
    return () => ctl.stop()
  }, [active, run, reduce, inView])

  const choose = (i: number) => { setManual(true); setActive(i); setRun((r) => r + 1) }
  const lane = LANES[active]
  const outcome = OUTCOMES[lane.outcome]
  const stampAt = topCenter(outcome)

  const boxesBack: BoxSpec[] = [GATES.table, AGENT]
  return (
    <div ref={ref} className={styles.wrap} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <p className={styles.kicker}>Where each attack stops · the agent is assumed to follow every message it reads</p>

      <div className={styles.grid}>
        <div className={styles.sceneWrap}>
          <svg viewBox="-170 -215 1010 690" className={styles.scene} role="img"
            aria-label={`Isometric scene: five attacks reach the agent; each ends at a check on the Accord platform. Showing attack ${active + 1}: ${lane.arrives} It stops at ${GATE_TITLE[lane.gate]}.`}>
            <defs>
              <radialGradient id="as-floor" cx="50%" cy="45%" r="60%">
                <stop offset="0%" stopColor="rgba(145,207,181,0.10)" />
                <stop offset="100%" stopColor="rgba(145,207,181,0)" />
              </radialGradient>
              <filter id="as-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
            </defs>

            {/* Platform: raised slab, dashed rim, light pooling on the floor */}
            <ellipse cx={P(510, 0, 0)[0]} cy={P(510, 0, 0)[1]} rx="330" ry="190" fill="url(#as-floor)" />
            <Box b={PLATFORM} />
            <polygon className={styles.rim} points={pts([P(270, -225, 0), P(750, -225, 0), P(750, 225, 0), P(270, 225, 0)])} />

            {/* Accord wordmark on the platform's front-right edge, extruded */}
            <g transform={`matrix(${C} -0.5 ${C} 0.5 ${P(712, 178, 0)[0]} ${P(712, 178, 0)[1]})`} className={styles.word}>
              {[4, 3, 2, 1].map((k) => <text key={k} x={0} y={k} className={styles.wordDepth}>Accord</text>)}
              <text x={0} y={0} className={styles.wordTop}>Accord</text>
            </g>

            {/* The only way out: approved terms, to the authorised recipient */}
            <path d={APPROVED} className={styles.approved} />

            {boxesBack.map((b) => <Box key={b.id} b={b} active={b.id === lane.gate} />)}
            {/* Inbox: five messages, the active one lifted */}
            {[4, 3, 2, 1, 0].map((i) => <Box key={i} b={INBOX(i)} lift={i === active ? LIFT : 0} active={i === active} />)}
            {[GATES.controls, OUTCOMES.limits, GATES.payee, OUTCOMES.log, OUTCOMES.nochange, RECIPIENT].map((b) => (
              <Box key={b.id} b={b} active={b.id === lane.gate || (arrived && b.id === lane.outcome)} />
            ))}

            {/* Inbox numbers */}
            {LANES.map((_, i) => {
              const [x, y] = P(-40, 40, (4 - i) * STEP + 3) // badges stay put; only the tile lifts
              return (
                <g key={i} className={`${styles.badge} ${i === active ? styles.badgeOn : ""}`} transform={`translate(${x - 26} ${y})`} onClick={() => choose(i)}>
                  <rect x={-12} y={-11} width={24} height={22} rx={6} />
                  <text textAnchor="middle" dominantBaseline="central">{i + 1}</text>
                </g>
              )
            })}

            {/* All paths faint; the active one draws */}
            {paths.map((d, i) => i === active ? null : <path key={i} d={d} className={styles.pathIdle} />)}
            <motion.path
              key={`p-${active}-${run}`}
              ref={pathRef}
              d={paths[active]}
              className={`${styles.pathOn} ${lane.outcome === "log" ? styles.pathRefuse : ""}`}
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: DRAW, ease: [0.45, 0, 0.2, 1] }}
            />
            {tok && !arrived ? (
              <g transform={`translate(${tok[0]} ${tok[1]})`}>
                <circle r="11" className={styles.tokGlow} filter="url(#as-glow)" />
                <circle r="5" className={styles.tok} />
              </g>
            ) : null}

            {/* Callouts */}
            <Callout at={topCenter(INBOX(0), LIFT)} dy={-58} w={118}>What arrives</Callout>
            <Callout at={topCenter(AGENT)} dx={-150} dy={62} w={168}>What the agent does</Callout>
            <Callout at={topCenter(GATES[lane.gate])} {...STOP_AT[lane.gate]} w={132} live>Where it stops</Callout>
            <Callout at={topCenter(RECIPIENT)} dx={10} dy={-58} w={176}>approved terms only</Callout>

            {/* The stamp: the result, above the outcome */}
            {arrived ? (
              <motion.g key={`s-${active}-${run}`} initial={reduce ? false : { opacity: 0, scale: 1.25 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 20 }} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                {(lane.codes ?? [(lane.resultTitle ?? "").replace(/,$/, "")]).map((c, k, arr) => {
                  const w = c.length * (lane.codes ? 8.2 : 7.4) + 22
                  const y = stampAt[1] - (lane.codes ? 34 : 52) - (arr.length - 1 - k) * 28
                  return (
                    <g key={c} transform={`translate(${stampAt[0]} ${y})`} className={lane.codes ? styles.stamp : styles.stampNeutral}>
                      <rect x={-w / 2} y={-12} width={w} height={24} rx={5} />
                      <text textAnchor="middle" dominantBaseline="central">{c}</text>
                    </g>
                  )
                })}
              </motion.g>
            ) : null}
          </svg>
        </div>

        {/* The five attacks; the active one opens with the full walk-through */}
        <ol className={styles.list}>
          {LANES.map((l, i) => {
            const on = i === active
            return (
              <li key={i} className={`${styles.item} ${on ? styles.itemOn : ""}`}>
                <button type="button" className={styles.itemHead} onClick={() => choose(i)} aria-expanded={on}>
                  <span className={styles.num}>{i + 1}</span>
                  <span className={styles.itemTitle}>{l.quote ? <>“{l.arrives}”</> : l.arrives}</span>
                  {on ? null : <span className={`${styles.chip} ${l.outcome === "log" ? styles.chipErr : ""}`}>{l.chip}</span>}
                  {on && !manual && !reduce && !paused && inView ? <span className={styles.timer} key={`t-${run}`} aria-hidden="true" /> : null}
                </button>
                {on ? (
                  <motion.dl className={styles.detail} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                    {l.sub ? <p className={styles.sub}>{l.sub}</p> : null}
                    <div className={styles.tags}>{l.tags.map((t) => <span key={t} className={styles.tag}>{t}</span>)}</div>
                    <div className={styles.step}><dt>What the agent does</dt><dd>{l.agent}{l.agentSub ? <span className={styles.sub}> {l.agentSub}</span> : null}</dd></div>
                    <div className={`${styles.step} ${styles.stepStop}`}><dt>Where it stops</dt><dd><b>{GATE_TITLE[l.gate]}</b> <span className={styles.sub}>{l.stopLine.split("revoke_agent").flatMap((part, k) => (k === 0 ? [part] : [<code key={k} className={styles.code}>revoke_agent</code>, part]))}</span></dd></div>
                    <div className={styles.step}><dt>Result</dt><dd>
                      {l.codes ? l.codes.map((c) => <code key={c} className={styles.err}>{c}</code>) : <b>{l.resultTitle}</b>}
                      {l.resultNote ? <span className={styles.sub}> {l.resultNote}</span> : null}
                    </dd></div>
                  </motion.dl>
                ) : null}
              </li>
            )
          })}
        </ol>
      </div>

      {/* All five attacks at once, for screen readers, crawlers and agents (the list above opens one at a time) */}
      <table className={styles.sr}>
        <caption>Where each attack stops, assuming the agent follows every message it reads</caption>
        <thead><tr><th scope="col">Attack</th><th scope="col">What the agent does</th><th scope="col">Where it stops</th><th scope="col">Result</th></tr></thead>
        <tbody>
          {LANES.map((l, i) => (
            <tr key={i}>
              <th scope="row">{l.arrives}{l.sub ? ` (${l.sub})` : ""}</th>
              <td>{l.agent}{l.agentSub ? ` ${l.agentSub}` : ""}</td>
              <td>{GATE_TITLE[l.gate]}: {l.stopLine}</td>
              <td>{l.codes ? l.codes.join(", ") : (l.resultTitle ?? "").replace(/,$/, "")}{l.resultNote ? `, ${l.resultNote}` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className={styles.strip}>
        <span className={styles.stripMark} aria-hidden="true"><LogoMark size={14} /></span>
        Not stopped by the contract: a person approving the wrong terms, or a payment the terms already allow. Those stay with people, on the record.
      </p>
    </div>
  )
}

import styles from "./HowCourse.module.css"

/* How it works · the course (8 Nov 2026). Built to the explainer-engaging skill in Barty-Bart/motion-graphics: one
   hero (the bright knob: the deal) travels through the workflow laid out as six stations on one canvas; each station
   is a real interface element that visibly reacts when the hero touches it (toggles, a slider, a notification stack,
   a request list, a chart, a release button with its toasts); the camera follows from station to station, then pulls
   out with a slight tilt to reveal the whole journey while the hero arcs back to the start and the stations reset in
   reverse, so the loop closes. Everything is a pure function of t (seconds, 0 … DUR): no CSS transitions, no timers.
   Labels change with the engine's swap (quick blur out, blur in). Station text is the only text inside the scene.
   World units are SVG pixels; the camera is the SVG viewBox. */

export const DUR = 21
export const STARTS = [0, 3, 6, 9, 12, 15]
export const BOUNDS = [2.8, 5.85, 8.7, 11.8, 14.9]
export const stationAt = (t: number) => BOUNDS.filter((b) => t >= b).length

/* ---------- helpers (the skill's: spring, ease, seg, lerp) ---------- */
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const ease = (x: number) => (x = clamp(x), x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const eo = (x: number) => 1 - Math.pow(1 - clamp(x), 3)
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
function spring(t: number, w = 14, z = 0.82) {
  if (t <= 0) return 0
  if (z >= 1) return 1 - Math.exp(-w * t) * (1 + w * t)
  const wd = w * Math.sqrt(1 - z * z)
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t))
}
/* keyframes: kf([[t0, v0], [t1, v1], …]) eased in-out between keys */
const kf = (keys: number[][]) => (t: number) => {
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [a, va] = keys[i - 1], [b, vb] = keys[i]
    if (t <= b) return lerp(va, vb, ease((t - a) / (b - a)))
  }
  return keys[keys.length - 1][1]
}
type V = [number, number]
/* ---------- the hero's path: segments between contact points ---------- */
const P: Record<string, V> = {
  b0: [212, 104], b1: [236, 104], v0: [212, 160], v1: [236, 160],
  sA: [606, 168], sB: [500, 168],
  c0: [728, 51], c1: [778, 121], c2: [828, 191], c3: [878, 261],
  act: [673, 462],
  ch0: [218, 446], ch1: [470, 439],
  btn: [68, 627],
}
type Seg = { a: number; b: number; k: "hold" | "slide" | "spring" | "hop" | "chart"; p0: V; p1: V; arc?: number }
const S = (a: number, b: number, k: Seg["k"], p0: string, p1 = p0, arc = 0): Seg => ({ a, b, k, p0: P[p0], p1: P[p1], arc })
const PATH: Seg[] = [
  S(0, 0.6, "hold", "b0"), S(0.6, 1.0, "slide", "b0", "b1"), S(1.0, 1.3, "hold", "b1"),
  S(1.3, 1.75, "hop", "b1", "v0", 26), S(1.75, 1.9, "hold", "v0"), S(1.9, 2.3, "slide", "v0", "v1"), S(2.3, 2.5, "hold", "v1"),
  S(2.5, 3.1, "hop", "v1", "sA", 74), S(3.1, 3.4, "hold", "sA"), S(3.4, 4.7, "spring", "sA", "sB"), S(4.7, 5.4, "hold", "sB"),
  S(5.4, 6.1, "hop", "sB", "c0", 70), S(6.1, 6.7, "hop", "c0", "c1", 34), S(6.7, 7.3, "hop", "c1", "c2", 34), S(7.3, 7.9, "hop", "c2", "c3", 34),
  S(7.9, 8.9, "hop", "c3", "act", 46), S(8.9, 11.5, "hold", "act"), S(11.5, 12.2, "hop", "act", "ch0", 90),
  S(12.2, 14.4, "chart", "ch0", "ch1"), S(14.4, 14.6, "hold", "ch1"), S(14.6, 15.3, "hop", "ch1", "btn", 70),
  S(15.3, 17.4, "hold", "btn"), S(17.4, 20.6, "hop", "btn", "b0", 260), S(20.6, DUR, "hold", "b0"),
]
/* contacts: landings, plus the act() gate pulsing as each request passes through it */
const CONTACTS = [0, 1.75, 3.1, 6.1, 6.7, 7.3, 7.9, 8.9, 9.42, 10.12, 10.82, 12.2, 15.3, 20.6, DUR]
const chartY = (x: number) => 446 - 12 * Math.sin(((x - 218) / 252) * Math.PI * 1.5) - 6 * ((x - 218) / 252)

const cubicAt = (p: number[][], k: number): V => {
  const m = 1 - k
  return [0, 1].map((j) => m * m * m * p[0][j] + 3 * m * m * k * p[1][j] + 3 * m * k * k * p[2][j] + k * k * k * p[3][j]) as V
}

function hero(t: number): { x: number; y: number; sx: number; sy: number } {
  const s = PATH.find((p) => t >= p.a && t < p.b) ?? PATH[PATH.length - 1]
  const u = seg(t, s.a, s.b)
  let x = s.p0[0], y = s.p0[1]
  if (s.k === "slide") { const k = ease(u); x = lerp(s.p0[0], s.p1[0], k); y = lerp(s.p0[1], s.p1[1], k) }
  if (s.k === "spring") { const k = spring(t - s.a, 9, 0.78); x = lerp(s.p0[0], s.p1[0], k); y = s.p0[1] }
  if (s.k === "chart") { x = lerp(s.p0[0], s.p1[0], ease(u)); y = chartY(x) }
  if (s.k === "hop") {
    /* the launch back runs in slow motion around its apex */
    const k = s.b - s.a > 2 ? 0.5 - 0.5 * Math.cos(Math.PI * u) : u
    x = lerp(s.p0[0], s.p1[0], k); y = lerp(s.p0[1], s.p1[1], k) - (s.arc ?? 0) * 4 * k * (1 - k)
  }
  /* squash on each contact, stretch in flight */
  const c = CONTACTS.reduce((m, ct) => (t >= ct && t - ct < 0.14 ? t - ct : m), -1)
  const sq = c >= 0 ? Math.sin((c / 0.14) * Math.PI) : 0
  const fly = s.k === "hop" ? Math.sin(u * Math.PI) * 0.1 : 0
  return { x, y, sx: 1 + 0.22 * sq - fly * 0.6, sy: 1 - 0.2 * sq + fly }
}

/* ---------- the camera: an anchor per station, eased between, then the reveal ---------- */
const A = { s1: [150, 130, 1.3], s2: [490, 142, 1.22], s3: [880, 196, 1.0], s4: [748, 466, 0.97], s5: [335, 466, 1.2], s6: [296, 626, 0.92], rv: [480, 330, 0.4] }
const camKeys = (i: number) => [
  [0, A.s1[i]], [2.5, A.s1[i]], [3.1, A.s2[i]], [5.4, A.s2[i]], [6.3, A.s3[i]], [8.3, A.s3[i]], [9.1, A.s4[i]], [11.4, A.s4[i]],
  [12.2, A.s5[i]], [14.5, A.s5[i]], [15.3, A.s6[i]], [17.3, A.s6[i]], [18.3, A.rv[i]], [19.9, A.rv[i]], [20.8, A.s1[i]], [DUR, A.s1[i]],
]
const camX = kf(camKeys(0)), camY = kf(camKeys(1)), camZ = kf(camKeys(2))
const revealOf = kf([[0, 0], [17.3, 0], [18.3, 1], [19.9, 1], [20.8, 0], [DUR, 0]])
const VW = 460, VH = 330

/* a station's progress, undone in reverse order while the hero flies back */
const undo = (t: number, i: number) => 1 - ease(seg(t, 17.7 + (5 - i) * 0.4, 18.1 + (5 - i) * 0.4))

/* ---------- stations ---------- */
const Card = ({ x, y, w, h, title, sub, lit = 0 }: { x: number; y: number; w: number; h: number; title?: string; sub?: string; lit?: number }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="16" className={styles.card} style={{ stroke: `rgba(145,207,181,${0.08 + 0.42 * lit})` }} />
    {title ? <text x={x + 18} y={y + 28} className={styles.cardTitle}>{title}</text> : null}
    {sub ? <text x={x + w - 18} y={y + 28} className={styles.cardSub} textAnchor="end">{sub}</text> : null}
  </g>
)
const Tick = ({ x, y, k = 1, c = styles.tick }: { x: number; y: number; k?: number; c?: string }) => (
  <path d={`M${x - 5} ${y}l3.5 3.5 7-8`} className={c} style={{ strokeDasharray: 20, strokeDashoffset: 20 * (1 - ease(k)) }} />
)
const Cross = ({ x, y, k = 1 }: { x: number; y: number; k?: number }) => (
  <path d={`M${x - 4} ${y - 4}l8 8M${x + 4} ${y - 4}l-8 8`} className={styles.cross} style={{ opacity: ease(k) }} />
)
const LockMark = ({ x, y, on }: { x: number; y: number; on: number }) => (
  <g transform={`translate(${x} ${y})`} style={{ opacity: 0.45 + 0.55 * on }}>
    <rect x="-5" y="-1" width="10" height="8" rx="2" className={on > 0.5 ? styles.lockOn : styles.lockOff} />
    <path d={`M-3 -1v-2.5a3 3 0 0 1 6 0${on > 0.5 ? "v2.5" : ""}`} className={on > 0.5 ? styles.lockOn : styles.lockOff} />
  </g>
)

function Toggles({ t }: { t: number }) {
  const rows = [{ y: 104, label: "Buyer limits", on: seg(t, 0.6, 1.0), leave: 1.3 }, { y: 160, label: "Vendor limits", on: seg(t, 1.9, 2.3), leave: 2.5 }]
  const r = undo(t, 0)
  return (
    <g>
      <Card x={40} y={56} w={240} h={150} title="Mandates" sub="Sealed Table" lit={rows[1].on * r} />
      {rows.map((row) => {
        const on = ease(row.on) * r
        const away = t >= row.leave && t < 20.6
        return (
          <g key={row.label}>
            <LockMark x={64} y={row.y - 3} on={on} />
            <text x={78} y={row.y + 4} className={styles.rowText}>{row.label}</text>
            {/* status swaps through a blur: open → sealed */}
            <text x={78} y={row.y + 19} className={styles.rowSub} style={{ opacity: 1 - on, filter: on > 0.02 && on < 0.98 ? `blur(${on * 3}px)` : undefined }}>open</text>
            <text x={78} y={row.y + 19} className={styles.rowSubOn} style={{ opacity: on, filter: on > 0.02 && on < 0.98 ? `blur(${(1 - on) * 3}px)` : undefined }}>sealed</text>
            <rect x={198} y={row.y - 13} width={50} height={26} rx={13} className={styles.track} style={{ fill: `rgba(145,207,181,${0.08 + 0.55 * on})` }} />
            {/* the slot the hero left keeps a dim knob */}
            {away ? <circle cx={lerp(212, 236, on)} cy={row.y} r={10} className={styles.slot} /> : null}
          </g>
        )
      })}
    </g>
  )
}

function Slider({ t, h }: { t: number; h: { x: number; y: number } }) {
  const r = undo(t, 1)
  const onTrack = t >= 3.1 && t < 5.4
  const x = onTrack ? h.x : t >= 5.4 && r > 0.5 ? 500 : 606
  const inside = x < 560
  const att = spring(t - 4.9, 13, 0.85) * r
  return (
    <g>
      <Card x={340} y={56} w={310} h={178} title="Sealed Table" lit={att} />
      <rect x={370} y={98} width={190} height={16} rx={4} className={styles.zone} />
      <text x={378} y={110} className={styles.zoneText}>buyer limit · sealed</text>
      <rect x={370} y={165} width={250} height={6} rx={3} className={styles.trackLine} />
      <rect x={430} y={165} width={130} height={6} rx={3} className={styles.overlap} />
      <rect x={Math.min(x, 606)} y={165} width={Math.max(0, 620 - Math.min(x, 606))} height={6} rx={3} className={styles.fill} style={{ opacity: onTrack || (t >= 5.4 && r > 0.5) ? 1 : 0 }} />
      <rect x={430} y={196} width={190} height={16} rx={4} className={styles.zone} />
      <text x={612} y={208} className={styles.zoneText} textAnchor="end">vendor limit · sealed</text>
      {!onTrack ? <circle cx={x} cy={168} r={10} className={styles.slot} /> : null}
      <g transform={`translate(${x} 138)`} style={{ opacity: onTrack ? 1 : 0 }}>
        <rect x={-62} y={-11} width={124} height={22} rx={11} className={inside ? styles.tipOn : styles.tip} />
        <text y={4} textAnchor="middle" className={inside ? styles.tipTextOn : styles.tipText}>{inside ? "inside both limits" : "outside buyer limit"}</text>
      </g>
      <g style={{ opacity: clamp(att * 1.3), transform: `translate(0px, ${(1 - att) * 6}px)` }}>
        <rect x={548} y={68} width={84} height={22} rx={11} className={styles.pill} />
        <Tick x={562} y={79} k={seg(t, 5.0, 5.3) * r} />
        <text x={574} y={83} className={styles.pillText}>attested</text>
      </g>
    </g>
  )
}

/* Circle's USDC mark, from Circle's SVG (2000 × 2000) */
const USDC = (
  <>
    <path d="M1000 2000c554.17 0 1000-445.83 1000-1000S1554.17 0 1000 0 0 445.83 0 1000s445.83 1000 1000 1000z" fill="#2775ca" />
    <path d="M1275 1158.33c0-145.83-87.5-195.83-262.5-216.66-125-16.67-150-50-150-108.34s41.67-95.83 125-95.83c75 0 116.67 25 137.5 87.5 4.17 12.5 16.67 20.83 29.17 20.83h66.66c16.67 0 29.17-12.5 29.17-29.16v-4.17c-16.67-91.67-91.67-162.5-187.5-170.83v-100c0-16.67-12.5-29.17-33.33-33.34h-62.5c-16.67 0-29.17 12.5-33.34 33.34v95.83c-125 16.67-204.16 100-204.16 204.17 0 137.5 83.33 191.66 258.33 212.5 116.67 20.83 154.17 45.83 154.17 112.5s-58.34 112.5-137.5 112.5c-108.34 0-145.84-45.84-158.34-108.34-4.16-16.66-16.66-25-29.16-25h-70.84c-16.66 0-29.16 12.5-29.16 29.17v4.17c16.66 104.16 83.33 179.16 220.83 200v100c0 16.66 12.5 29.16 33.33 33.33h62.5c16.67 0 29.17-12.5 33.34-33.33v-100c125-20.84 208.33-108.34 208.33-220.84z" fill="#fff" />
    <path d="M787.5 1595.83c-325-116.66-491.67-479.16-370.83-800 62.5-175 200-308.33 370.83-370.83 16.67-8.33 25-20.83 25-41.67V325c0-16.67-8.33-29.17-25-33.33-4.17 0-12.5 0-16.67 4.16-395.83 125-612.5 545.84-487.5 941.67 75 233.33 254.17 412.5 487.5 487.5 16.67 8.33 33.34 0 37.5-16.67 4.17-4.16 4.17-8.33 4.17-16.66v-58.34c0-12.5-12.5-29.16-25-37.5zM1229.17 295.83c-16.67-8.33-33.34 0-37.5 16.67-4.17 4.17-4.17 8.33-4.17 16.67v58.33c0 16.67 12.5 33.33 25 41.67 325 116.66 491.67 479.16 370.83 800-62.5 175-200 308.33-370.83 370.83-16.67 8.33-25 20.83-25 41.67V1700c0 16.67 8.33 29.17 25 33.33 4.17 0 12.5 0 16.67-4.16 395.83-125 612.5-545.84 487.5-941.67-75-237.5-258.34-416.67-487.5-491.67z" fill="#fff" />
  </>
)

const NOTES = [
  { title: "Buyer", body: "Approved the terms" },
  { title: "Vendor", body: "Approved the terms" },
  { title: "Payee", body: "Recipient bound to its domain" },
  { title: "Escrow", body: "Funded in USDC on NEAR" },
]
const HITS = [6.1, 6.7, 7.3, 7.9]
function Notes({ t }: { t: number }) {
  const r = undo(t, 2)
  return (
    <g>
      {NOTES.map((n, i) => {
        const x = 700 + i * 50, y = 62 + i * 70
        const k = spring(t - (HITS[i] - 0.12), 15, 0.8) * r
        const push = t >= HITS[i] ? Math.exp(-(t - HITS[i]) * 18) * Math.sin((t - HITS[i]) * 30) * 3 : 0
        return (
          <g key={n.title} style={{ opacity: clamp(k * 1.4), transform: `translate(0px, ${push + (1 - k) * 8}px)` }}>
            <rect x={x} y={y} width={236} height={54} rx={14} className={styles.card} />
            {i === 3 ? (
              <g transform={`translate(${x + 12} ${y + 13}) scale(0.014)`}>{USDC}</g>
            ) : (
              <>
                <rect x={x + 12} y={y + 13} width={28} height={28} rx={8} className={styles.appIcon} />
                <Tick x={x + 26} y={y + 27} k={seg(t, HITS[i], HITS[i] + 0.3)} c={styles.tickDark} />
              </>
            )}
            <text x={x + 50} y={y + 24} className={styles.noteTitle}>{n.title}</text>
            <text x={x + 224} y={y + 24} className={styles.noteNow} textAnchor="end">now</text>
            <text x={x + 50} y={y + 41} className={styles.noteBody}>{n.body}</text>
          </g>
        )
      })}
    </g>
  )
}

const ROWS = [
  { req: "Approved account", ok: true, out: "within the terms", at: 9.2 },
  { req: "New account", ok: false, out: "ERR_PAYEE_MISMATCH", at: 9.9 },
  { req: "Different amount", ok: false, out: "ERR_AMOUNT_MISMATCH", at: 10.6 },
]
const rowY = (i: number) => 410 + i * 46
/* a request's route: from the agent into the gate, then along its branch to its row */
const branch = (i: number): number[][] => [[620, 462], [636, 462], [630, rowY(i) + 19], [652, rowY(i) + 19]]
function Requests({ t }: { t: number }) {
  const r = undo(t, 3)
  const gateOn = ease(seg(t, 8.9, 9.1)) * r
  /* drawn in station-local units, placed 80 to the right of the evidence card */
  return (
    <g transform="translate(80 0)">
      <Card x={440} y={372} w={460} h={184} title="act() · payment requests" />
      {/* the agent and the gate the hero sits in */}
      <rect x={456} y={447} width={64} height={30} rx={15} className={styles.agentPill} />
      <text x={488} y={466} className={styles.rowText} textAnchor="middle">agent</text>
      <line x1={520} y1={462} x2={566} y2={462} className={styles.wire} />
      <rect x={566} y={440} width={54} height={44} rx={12} className={styles.gate} style={{ stroke: `rgba(145,207,181,${0.2 + 0.5 * gateOn})` }} />
      <text x={593} y={432} className={styles.zoneText} textAnchor="middle" style={{ opacity: gateOn }}>act()</text>
      {ROWS.map((row, i) => {
        const y = rowY(i)
        const go = seg(t, row.at, row.at + 0.62)
        const toGate = ease(seg(go, 0, 0.42)), out = ease(seg(go, 0.42, 1))
        const reach = row.ok ? out : Math.min(out, 0.62)
        const [bx, by] = go < 0.42 ? [lerp(520, 590, toGate), 462] : cubicAt(branch(i), reach)
        const live = go > 0 && go < 1 && r > 0.5
        const k = ease(seg(t, row.at + 0.6, row.at + 0.9)) * r
        const pathD = `M620 462 C ${branch(i)[1].join(" ")}, ${branch(i)[2].join(" ")}, ${branch(i)[3].join(" ")}`
        return (
          <g key={row.req}>
            <path d={pathD} className={styles.wire} style={{ strokeDasharray: 60, strokeDashoffset: 60 * (1 - ease(seg(t, row.at + 0.2, row.at + 0.45)) * r) }} />
            <circle cx={bx} cy={by} r={4} className={row.ok ? styles.packet : styles.packetBad} style={{ opacity: live ? 1 : 0 }} />
            <rect x={652} y={y} width={234} height={38} rx={10} className={row.ok ? styles.rowOk : styles.rowBad} style={{ opacity: 0.25 + 0.75 * k }} />
            <text x={666} y={y + 16} className={styles.rowText}>{row.req}</text>
            <text x={666} y={y + 30} className={row.ok ? styles.outOk : styles.outBad} style={{ opacity: k }}>{row.out}</text>
            <g style={{ opacity: k }}>{row.ok ? <Tick x={866} y={y + 19} k={k} /> : <Cross x={866} y={y + 19} k={k} />}</g>
          </g>
        )
      })}
    </g>
  )
}

const BARS = [1, 1, 0, 1, 1, 0]
function Chart({ t, h }: { t: number; h: { x: number; y: number } }) {
  const r = undo(t, 4)
  const lineTo = t < 12.2 ? 218 : t < 14.4 ? h.x : 470
  const passed = BARS.filter((p, i) => p && lineTo > 236 + i * 44 + 8).length
  const done = spring(t - 14.4, 13, 0.85) * r
  const pts: string[] = []
  for (let x = 218; x <= lineTo; x += 4) pts.push(`${x},${chartY(x).toFixed(1)}`)
  return (
    <g>
      <Card x={180} y={372} w={320} h={176} title="Evidence" lit={done} />
      <line x1={198} y1={474} x2={482} y2={474} className={styles.cond} />
      <line x1={392} y1={416} x2={410} y2={416} className={styles.cond} />
      <text x={482} y={420} className={styles.zoneText} textAnchor="end">agreed condition</text>
      {BARS.map((p, i) => {
        const bx = 230 + i * 44
        const crossed = lineTo > bx + 8 ? 1 : 0
        const at = 12.2 + ((bx + 8 - 218) / 252) * 2.2
        const hgt = (p ? 62 + (i % 2) * 6 : 28) * spring(t - at, 13, 0.86) * crossed * r
        return <rect key={i} x={bx} y={532 - hgt} width={24} height={Math.max(0, hgt)} rx={6} className={p ? styles.barOn : styles.bar} />
      })}
      <line x1={198} y1={532} x2={482} y2={532} className={styles.base} />
      <polyline points={pts.join(" ")} className={styles.line} style={{ opacity: r }} />
      <text x={198} y={420} className={styles.count}>{Math.round(passed * r)} of 6 met</text>
      <g style={{ opacity: clamp(done * 1.3) }}>
        <rect x={398} y={384} width={84} height={22} rx={11} className={styles.pill} />
        <Tick x={412} y={395} k={seg(t, 14.5, 14.8)} />
        <text x={424} y={399} className={styles.pillText}>eligible</text>
      </g>
    </g>
  )
}

function Release({ t }: { t: number }) {
  const r = undo(t, 5)
  const press = t >= 15.3 && t < 15.5 ? Math.sin(((t - 15.3) / 0.2) * Math.PI) : 0
  const on = ease(seg(t, 15.3, 15.55)) * r
  const toast1 = spring(t - 15.65, 14, 0.82) * r, toast2 = spring(t - 16.2, 14, 0.82) * r
  return (
    <g>
      <g style={{ transform: `translate(0px, ${press * 3}px)` }}>
        <rect x={40} y={600} width={230} height={54} rx={27} className={styles.button} style={{ fill: `rgba(145,207,181,${0.1 + 0.8 * on})` }} />
        <circle cx={68} cy={627} r={15} className={styles.btnSlot} />
        <text x={98} y={632} className={on > 0.5 ? styles.buttonTextOn : styles.buttonText}>Release payment</text>
      </g>
      {[{ k: toast1, y: 588, title: "Paid", body: "USDC to the approved recipient" }, { k: toast2, y: 642, title: "Recorded", body: "checkable with make verify" }].map((x) => (
        <g key={x.title} style={{ opacity: clamp(x.k * 1.4), transform: `translate(${(1 - x.k) * 14}px, 0px)` }}>
          <rect x={300} y={x.y} width={250} height={46} rx={14} className={styles.card} />
          <circle cx={322} cy={x.y + 23} r={9} className={styles.appIcon} />
          <Tick x={322} y={x.y + 23} k={seg(t, 15.8, 16.1)} c={styles.tickDark} />
          <text x={340} y={x.y + 20} className={styles.noteTitle}>{x.title}</text>
          <text x={340} y={x.y + 36} className={styles.noteBody}>{x.body}</text>
        </g>
      ))}
    </g>
  )
}

/* boost: extra camera zoom on narrow screens, so the stations stay legible */
export function Course({ t, boost = 1 }: { t: number; boost?: number }) {
  const h = hero(t)
  const rev = revealOf(t)
  /* the wide Executing station keeps the plain framing even on narrow screens */
  const b = kf([[0, boost], [8.3, boost], [9.1, 1], [11.4, 1], [12.2, boost], [DUR, boost]])(t)
  const z = camZ(t) * lerp(b, 1, rev), cx = camX(t), cy = camY(t)
  const w = VW / z, hh = VH / z
  const hs = 1 + 1.3 * rev // the hero stays the brightest thing when the camera pulls out
  return (
    <div className={styles.view} style={{ transform: `perspective(900px) rotateX(${14 * rev}deg)` }}>
      <svg viewBox={`${cx - w / 2} ${cy - hh / 2} ${w} ${hh}`} className={styles.svg} aria-hidden="true">
        <defs>
          <pattern id="how-grid" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.1" className={styles.gridDot} /></pattern>
          <radialGradient id="how-halo"><stop offset="0" stopColor="rgba(145,207,181,0.55)" /><stop offset="1" stopColor="rgba(145,207,181,0)" /></radialGradient>
        </defs>
        <rect x={-600} y={-500} width={2200} height={1700} fill="url(#how-grid)" />
        <Toggles t={t} />
        <Slider t={t} h={h} />
        <Notes t={t} />
        <Requests t={t} />
        <Chart t={t} h={h} />
        <Release t={t} />
        <g transform={`translate(${h.x} ${h.y}) scale(${h.sx * hs} ${h.sy * hs})`}>
          <circle r={24} fill="url(#how-halo)" />
          <circle r={10} className={styles.hero} />
        </g>
      </svg>
    </div>
  )
}

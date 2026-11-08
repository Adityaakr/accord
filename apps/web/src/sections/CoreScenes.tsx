import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react"
import { useInView, useReducedMotion } from "motion/react"
import styles from "./CoreScenes.module.css"

/* Core features · the seven scenes (8 Nov 2026). Each is a small live interface in the How-it-works language (the
   motion-graphics skill's rules: one bright hero, stations that react to it, springs that settle without bounce, one
   beat at a time, labels that swap through a blur, a pure function of t). A status line inside each scene explains
   the beat as it happens. Scenes loop only while on screen; reduced motion shows the end state. Wide scenes have a
   compact layout for narrow screens. Teal for a pass; refusal red only for refusals and revocation. */

/* ---------- helpers ---------- */
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const ease = (x: number) => (x = clamp(x), x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
function spring(t: number, w = 14, z = 0.84) {
  if (t <= 0) return 0
  const wd = w * Math.sqrt(1 - z * z)
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t))
}
/* everything fades out together at the end of the loop, so the restart is clean */
const outro = (t: number, d: number) => 1 - ease(seg(t, d - 0.55, d - 0.1))
const pop = (t: number, a: number, cx: number, cy: number) => {
  const k = spring(t - a)
  return { opacity: clamp(k * 1.4), transform: `translate(${cx}px, ${cy + (1 - k) * 6}px) scale(${0.94 + 0.06 * k}) translate(${-cx}px, ${-cy}px)` }
}
const fade = (t: number, a: number, d = 0.35) => ({ opacity: ease(seg(t, a, a + d)) })
/* a label that swaps through a blur: shown on [a, b) */
const swap = (t: number, a: number, b = 1e9) => {
  const k = ease(seg(t, a + 0.05, a + 0.35)) * (1 - ease(seg(t, b, b + 0.18)))
  return { opacity: k, filter: k > 0.02 && k < 0.98 ? `blur(${(1 - k) * 3}px)` : undefined }
}
const sq = (t: number, at: number) => (t >= at && t - at < 0.16 ? Math.sin(((t - at) / 0.16) * Math.PI) : 0)

/* ---------- the loop clock: runs while the scene is on screen ---------- */
function useLoop(dur: number, rest: number) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.35 })
  const reduce = useReducedMotion() ?? false
  const [t, setT] = useState(reduce ? rest : 0)
  useEffect(() => {
    if (reduce) { setT(rest); return }
    if (!inView) return
    let raf = 0, last = performance.now(), acc = 0
    const tick = (now: number) => { acc = (acc + (now - last) / 1000) % dur; last = now; setT(acc); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, reduce, dur, rest])
  return { ref, t }
}
function useNarrow() {
  const [n, setN] = useState(false)
  useEffect(() => {
    const m = window.matchMedia("(max-width: 809.98px)")
    const on = () => setN(m.matches)
    on(); m.addEventListener("change", on)
    return () => m.removeEventListener("change", on)
  }, [])
  return n
}

/* ---------- shared marks ---------- */
const Hero = ({ x, y, s = 1, sx = 1, sy = 1 }: { x: number; y: number; s?: number; sx?: number; sy?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s * sx} ${s * sy})`}>
    <circle r={20} fill="url(#cs-halo)" />
    <circle r={8} className={styles.hero} />
  </g>
)
const Tick = ({ x, y, k = 1, c = styles.tick }: { x: number; y: number; k?: number; c?: string }) => (
  <path d={`M${x - 5} ${y}l3.5 3.5 7-8`} className={c} style={{ strokeDasharray: 20, strokeDashoffset: 20 * (1 - ease(k)) }} />
)
const Cross = ({ x, y, k = 1 }: { x: number; y: number; k?: number }) => (
  <path d={`M${x - 4} ${y - 4}l8 8M${x + 4} ${y - 4}l-8 8`} className={styles.cross} style={{ opacity: ease(k) }} />
)
const Lock = ({ x, y, shut = 1, on = true }: { x: number; y: number; shut?: number; on?: boolean }) => (
  <g transform={`translate(${x} ${y})`} className={on ? styles.lockOn : styles.lockOff}>
    <rect x={-6} y={-1} width={12} height={9} rx={2.2} />
    <path d="M-3.6 -1v-2.8a3.6 3.6 0 0 1 7.2 0V-1" style={{ transform: `translateY(${-3 * (1 - shut)}px)` }} />
  </g>
)
const Defs = () => (
  <defs>
    <pattern id="cs-grid" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" className={styles.gridDot} /></pattern>
    <radialGradient id="cs-halo"><stop offset="0" stopColor="rgba(145,207,181,0.55)" /><stop offset="1" stopColor="rgba(145,207,181,0)" /></radialGradient>
  </defs>
)
/* the explainer line inside each scene: the current beat, swapping through a blur */
const Status = ({ t, x, y, beats }: { t: number; x: number; y: number; beats: [number, number, string, boolean?][] }) => (
  <g>
    {beats.map(([a, b, s, on]) => <text key={s} x={x} y={y} className={on ? styles.statusOn : styles.status} style={swap(t, a, b)}>{s}</text>)}
  </g>
)
function Frame({ vb, children, refEl }: { vb: string; children: ReactNode; refEl: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={refEl} className={styles.frame}>
      <svg viewBox={vb} className={styles.svg} aria-hidden="true">
        <Defs />
        <rect x={-50} y={-50} width={2000} height={1000} fill="url(#cs-grid)" />
        {children}
      </svg>
    </div>
  )
}

/* ================= 1 · confidential negotiation (wide) ================= */
export function SceneNegotiation() {
  const D = 7.2
  const { ref, t } = useLoop(D, 5.2)
  const n = useNarrow()
  const o = outro(t, D)
  /* positions: wide 720 × 210; compact 360 × 270 */
  const L = n ? { b: [14, 30], v: [190, 30], cw: 156, e: [40, 138, 280, 118], tx: 180, ty: 286 } : { b: [20, 48], v: [524, 48], cw: 176, e: [228, 30, 264, 136], tx: 360, ty: 186 }
  const [ex, ey, ew, eh] = L.e
  const ecx = ex + ew / 2
  const offers = [
    { at: 1.7, label: "offer · above buyer limit", ok: false },
    { at: 2.5, label: "offer · below vendor limit", ok: false },
    { at: 3.3, label: "offer · inside both limits", ok: true },
  ]
  const termsK = spring(t - 4.1, 12, 0.86)
  const approve = [seg(t, 4.7, 5.0), seg(t, 5.0, 5.3)]
  const sides = [{ p: L.b, name: "Buyer", sub: "yourco.near" }, { p: L.v, name: "Vendor", sub: "vendor.near" }]
  return (
    <Frame vb={n ? "0 0 360 312" : "0 0 720 210"} refEl={ref}>
      <g style={{ opacity: o }}>
        {sides.map((s, i) => {
          const [x, y] = s.p
          const shut = ease(seg(t, 0.5 + i * 0.15, 0.85 + i * 0.15))
          return (
            <g key={s.name} style={pop(t, 0.1 + i * 0.12, x + L.cw / 2, y + 48)}>
              <rect x={x} y={y} width={L.cw} height={96} rx={14} className={approve[i] > 0.5 ? styles.cardOn : styles.card} />
              <Lock x={x + 22} y={y + 20} shut={shut} on={shut > 0.5} />
              <text x={x + 36} y={y + 25} className={styles.title}>{s.name}</text>
              <text x={x + 36} y={y + 40} className={styles.mono}>{s.sub}</text>
              <line x1={x + 14} y1={y + 52} x2={x + L.cw - 14} y2={y + 52} className={styles.rule} />
              <text x={x + 16} y={y + 69} className={styles.dim}>limits</text>
              <text x={x + L.cw - 14} y={y + 69} className={styles.cipher} textAnchor="end">{shut > 0.5 ? "a7f3 · 9c1e" : i ? "17,000 floor" : "20,000 ceiling"}</text>
              <g style={{ opacity: approve[i] }}><Tick x={x + 20} y={y + 83} k={approve[i]} /><text x={x + 32} y={y + 87} className={styles.okText}>approved</text></g>
            </g>
          )
        })}
        {/* ciphertext travels into the enclave */}
        {sides.map((s, i) => {
          const k = ease(seg(t, 0.95 + i * 0.12, 1.55 + i * 0.12))
          const sx = n ? s.p[0] + L.cw / 2 : i ? s.p[0] : s.p[0] + L.cw
          const sy = n ? s.p[1] + 96 : s.p[1] + 48
          const tx = n ? ecx + (i ? 30 : -30) : i ? ex + ew : ex
          const ty = n ? ey : ey + eh / 2
          return <circle key={i} cx={lerp(sx, tx, k)} cy={lerp(sy, ty, k)} r={3.5} className={styles.packet} style={{ opacity: k > 0 && k < 1 ? 1 : 0 }} />
        })}
        <g style={pop(t, 0.6, ecx, ey + eh / 2)}>
          <rect x={ex} y={ey} width={ew} height={eh} rx={16} className={styles.enclave} />
          <text x={ex + 16} y={ey + 22} className={styles.mono}>Sealed Table · enclave</text>
          {offers.map((f, i) => {
            const k = spring(t - f.at, 13, 0.84)
            const strike = f.ok ? 0 : ease(seg(t, f.at + 0.45, f.at + 0.7))
            const y = ey + 36 + i * 28
            return (
              <g key={f.label} style={{ opacity: clamp(k * 1.4) * (f.ok ? 1 : 1 - 0.5 * strike), transform: `translateX(${(1 - k) * (i % 2 ? 10 : -10)}px)` }}>
                <rect x={ex + 14} y={y} width={ew - 28} height={22} rx={11} className={f.ok ? styles.pillOn : styles.pill} />
                <text x={ecx} y={y + 15} className={f.ok ? styles.monoOn : styles.mono} textAnchor="middle">{f.label}</text>
                {!f.ok ? <line x1={ex + 26} y1={y + 11} x2={lerp(ex + 26, ex + ew - 26, strike)} y2={y + 11} className={styles.strike} /> : null}
              </g>
            )
          })}
        </g>
        {/* the agreed terms leave the enclave with an attestation */}
        <g style={{ opacity: clamp(termsK * 1.4), transform: `translate(0px, ${(1 - termsK) * -10}px)` }}>
          <rect x={L.tx - 112} y={L.ty - 15} width={224} height={26} rx={13} className={styles.pillOn} />
          <Tick x={L.tx - 96} y={L.ty - 3} k={seg(t, 4.3, 4.6)} />
          <text x={L.tx - 82} y={L.ty + 2} className={styles.monoOn}>agreed terms · attested</text>
        </g>
        <line x1={ecx} y1={ey + eh} x2={ecx} y2={L.ty - 15} className={styles.wire} style={{ opacity: termsK }} />
        <Status t={t} x={n ? 14 : 20} y={n ? 20 : 26} beats={[[0, 0.95, "sealing both limits in the browser"], [0.95, 1.7, "ciphertext to the enclave"], [1.7, 4.1, "negotiating inside the enclave"], [4.1, 4.7, "only the agreed terms come out", true], [4.7, 99, "both companies approve", true]]} />
      </g>
    </Frame>
  )
}

/* ================= 2 · one key, one method ================= */
export function SceneKey() {
  const D = 6.4
  const { ref, t } = useLoop(D, 4.6)
  const o = outro(t, D)
  const rows = [
    { m: "deploy_contract", at: 0.9, ok: false },
    { m: "add_full_access_key", at: 1.7, ok: false },
    { m: "transfer", at: 2.5, ok: false },
    { m: "act", at: 3.3, ok: true },
  ]
  const idx = rows.filter((r) => t >= r.at - 0.25).length - 1
  const y = idx < 0 ? 52 : 52 + idx * 34
  const ky = lerp(idx <= 0 ? 52 : 52 + (idx - 1) * 34, y, spring(t - (rows[Math.max(0, idx)].at - 0.25), 14, 0.86))
  const land = rows.reduce((m, r) => (t >= r.at && t - r.at < 0.16 ? r.at : m), -1)
  return (
    <Frame vb="0 0 360 210" refEl={ref}>
      <g style={{ opacity: o }}>
        <g style={pop(t, 0.1, 60, 120)}>
          <rect x={20} y={96} width={86} height={48} rx={12} className={styles.card} />
          <text x={63} y={116} className={styles.title} textAnchor="middle">agent key</text>
          <text x={63} y={132} className={styles.mono} textAnchor="middle">FunctionCall</text>
        </g>
        <g style={pop(t, 0.3, 240, 104)}>
          <rect x={130} y={30} width={214} height={150} rx={14} className={styles.card} />
          {rows.map((r, i) => {
            const k = ease(seg(t, r.at, r.at + 0.25))
            const ry = 38 + i * 34
            return (
              <g key={r.m}>
                <rect x={140} y={ry} width={194} height={28} rx={8} className={r.ok ? styles.rowOk : styles.rowBad} style={{ opacity: k }} />
                <text x={176} y={ry + 18} className={r.ok ? styles.monoStrong : styles.mono}>{r.m}()</text>
                <g style={{ opacity: k }}>{r.ok ? <Tick x={322} y={ry + 13} k={k} /> : <Cross x={322} y={ry + 14} k={k} />}</g>
              </g>
            )
          })}
        </g>
        <path d={`M106 120 C 124 120, 126 ${ky}, 150 ${ky}`} className={styles.wire} style={fade(t, 0.6)} />
        <Hero x={156} y={ky} sx={1 + 0.2 * sq(t, land)} sy={1 - 0.18 * sq(t, land)} />
        <Status t={t} x={20} y={200} beats={[[0, 0.9, "one key, scoped to this agreement"], [0.9, 3.3, "every other method is refused"], [3.3, 99, "act() is the only method it can call", true]]} />
      </g>
    </Frame>
  )
}

/* ================= 3 · every payment checked ================= */
export function ScenePayment() {
  const D = 8.4
  const { ref, t } = useLoop(D, 3.6)
  const o = outro(t, D)
  const second = t >= 4.2
  const lt = second ? t - 4.2 : t
  const fields = [
    { k: "milestone", v: "period 2", ok: true },
    { k: "amount", v: "matches terms", ok: true },
    { k: "recipient", v: second ? "new-account.near" : "vendor.near", ok: !second },
  ]
  const scanY = lerp(64, 146, ease(seg(lt, 0.5, 2.1)))
  const card = spring(lt - 0.05, 13, 0.86) * (1 - ease(seg(lt, 3.8, 4.15)))
  const stamp = spring(lt - 2.4, 15, 0.8)
  return (
    <Frame vb="0 0 360 210" refEl={ref}>
      <g style={{ opacity: o * clamp(card * 1.3), transform: `translate(0px, ${(1 - card) * 8}px)` }}>
        <rect x={40} y={26} width={280} height={140} rx={14} className={styles.card} />
        <text x={58} y={50} className={styles.title}>Payment request</text>
        <text x={302} y={50} className={styles.mono} textAnchor="end">act()</text>
        {fields.map((f, i) => {
          const y = 66 + i * 30
          const k = ease(seg(lt, 0.7 + i * 0.5, 0.95 + i * 0.5))
          return (
            <g key={f.k}>
              <text x={58} y={y + 16} className={styles.dim}>{f.k}</text>
              <text x={276} y={y + 16} className={f.ok ? styles.monoStrong : styles.badText} textAnchor="end">{f.v}</text>
              <g style={{ opacity: k }}>{f.ok ? <Tick x={296} y={y + 12} k={k} /> : <Cross x={296} y={y + 13} k={k} />}</g>
            </g>
          )
        })}
        <line x1={50} y1={scanY} x2={310} y2={scanY} className={styles.scan} style={{ opacity: lt > 0.5 && lt < 2.2 ? 1 : 0 }} />
        <Hero x={44} y={scanY} s={0.8} />
        <g style={{ opacity: clamp(stamp * 1.3), transform: `translate(180px, 184px) scale(${0.9 + 0.1 * stamp}) translate(-180px, -184px)` }}>
          <rect x={second ? 84 : 132} y={172} width={second ? 192 : 96} height={24} rx={12} className={second ? styles.stampBad : styles.pillOn} />
          <text x={180} y={188} className={second ? styles.badText : styles.monoOn} textAnchor="middle">{second ? "refused · ERR_PAYEE_MISMATCH" : "paid"}</text>
        </g>
      </g>
      <Status t={t} x={40} y={16} beats={[[0, 2.4, "checking milestone, amount and recipient"], [2.4, 4.2, "every field matches: paid", true], [4.2, 6.6, "a request to another account"], [6.6, 99, "refused and recorded with its reason"]]} />
    </Frame>
  )
}

/* ================= 4 · a recipient that cannot be redirected ================= */
export function ScenePayee() {
  const D = 7.6
  const { ref, t } = useLoop(D, 6.0)
  const o = outro(t, D)
  const nodes = [{ x: 56, l: "domain", s: "proven" }, { x: 180, l: "authority", s: "approves" }, { x: 304, l: "buyer", s: "accepts" }]
  const hx = t < 0.6 ? 56 : t < 1.4 ? lerp(56, 180, ease(seg(t, 0.6, 1.3))) : lerp(180, 304, ease(seg(t, 1.4, 2.1)))
  const bound = spring(t - 2.4, 13, 0.85)
  /* the message flies in, hits the lock and bounces away */
  const fly = ease(seg(t, 3.4, 4.3)), bounce = ease(seg(t, 4.3, 5.0))
  const mx = t < 4.3 ? lerp(380, 232, fly) : lerp(232, 330, bounce), my = t < 4.3 ? 168 : lerp(168, 196, bounce)
  const hit = sq(t, 4.3)
  return (
    <Frame vb="0 0 360 210" refEl={ref}>
      <g style={{ opacity: o }}>
        <line x1={56} y1={64} x2={304} y2={64} className={styles.wire} style={fade(t, 0.3)} />
        <line x1={56} y1={64} x2={hx} y2={64} className={styles.wireOn} />
        {nodes.map((nd, i) => {
          const at = [0.6, 1.4, 2.1][i]
          const k = ease(seg(t, at, at + 0.3))
          return (
            <g key={nd.l} style={pop(t, 0.1 + i * 0.1, nd.x, 64)}>
              <circle cx={nd.x} cy={64} r={18} className={k > 0.5 ? styles.badge : styles.node} />
              <Tick x={nd.x} y={64} k={k} />
              <text x={nd.x} y={100} className={styles.title} textAnchor="middle">{nd.l}</text>
              <text x={nd.x} y={115} className={k > 0.5 ? styles.okText : styles.mono} textAnchor="middle">{nd.s}</text>
            </g>
          )
        })}
        <Hero x={hx} y={64} s={t < 2.3 ? 1 : 0.0001} />
        <g style={{ opacity: clamp(bound * 1.4), transform: `translate(${hit * 2}px, ${(1 - bound) * 8}px)` }}>
          <rect x={62} y={146} width={170} height={44} rx={22} className={styles.cardOn} />
          <Lock x={88} y={164} />
          <text x={104} y={166} className={styles.monoStrong}>vendor.near</text>
          <text x={104} y={180} className={styles.okText}>bound for this deal</text>
        </g>
        <g style={{ opacity: t > 3.4 && t < 5.0 ? 1 - bounce : 0, transform: `translate(${mx - 232}px, ${my - 168}px) rotate(${bounce * 12}deg)`, transformOrigin: "232px 168px" }}>
          <rect x={236} y={152} width={112} height={32} rx={10} className={styles.msg} />
          <text x={292} y={172} className={styles.dimSmall} textAnchor="middle">“update our payee”</text>
        </g>
        <Status t={t} x={20} y={22} beats={[[0, 2.4, "binding the recipient: three approvals"], [2.4, 3.4, "the recipient is bound", true], [3.4, 5.1, "a message asks to change it"], [5.1, 99, "no change from a message · real changes wait 24 h", true]]} />
      </g>
    </Frame>
  )
}

/* ================= 5 · evidence before release ================= */
export function SceneEvidence() {
  const D = 7.4
  const { ref, t } = useLoop(D, 5.8)
  const o = outro(t, D)
  const pins = [{ x: 62, ok: 1 }, { x: 104, ok: 1 }, { x: 150, ok: 0 }, { x: 205, ok: 1 }, { x: 246, ok: 1 }, { x: 292, ok: 0 }]
  const hx = lerp(40, 320, ease(seg(t, 0.5, 4.2)))
  const passed = pins.filter((p) => p.ok && hx >= p.x).length
  const open = ease(seg(t, 4.6, 5.0))
  return (
    <Frame vb="0 0 360 210" refEl={ref}>
      <g style={{ opacity: o }}>
        <text x={40} y={58} className={styles.dim}>period 2 · readings at hidden times</text>
        <line x1={40} y1={110} x2={320} y2={110} className={styles.wire} />
        <line x1={40} y1={110} x2={hx} y2={110} className={styles.wireOn} />
        {pins.map((p, i) => {
          const k = spring(t - (0.5 + ((p.x - 40) / 280) * 3.7), 15, 0.8)
          return (
            <g key={i} style={{ opacity: clamp(k * 1.5), transform: `translate(0px, ${(1 - k) * -14}px)` }}>
              <line x1={p.x} y1={86} x2={p.x} y2={110} className={p.ok ? styles.pinLineOn : styles.pinLine} />
              <circle cx={p.x} cy={80} r={10} className={p.ok ? styles.badge : styles.node} />
              {p.ok ? <Tick x={p.x} y={80} k={k} /> : <Cross x={p.x} y={81} k={k} />}
            </g>
          )
        })}
        <Hero x={hx} y={110} s={0.85} />
        <text x={40} y={150} className={styles.count}>{passed}</text>
        <text x={62} y={150} className={styles.dim}>of 6 passed · 4 needed</text>
        <g style={pop(t, 4.5, 286, 150)}>
          <rect x={232} y={134} width={108} height={30} rx={15} className={open > 0.5 ? styles.pillOn : styles.pill} />
          <Lock x={252} y={147} shut={1 - open} on={open > 0.5} />
          <text x={266} y={153} className={open > 0.5 ? styles.monoOn : styles.mono}>{open > 0.5 ? "eligible" : "withheld"}</text>
        </g>
        <Status t={t} x={40} y={190} beats={[[0, 4.6, "evidence is recorded as it arrives"], [4.6, 99, "enough passed: the payment becomes eligible", true]]} />
      </g>
    </Frame>
  )
}

/* ================= 6 · stop the agent in one transaction ================= */
export function SceneRevoke() {
  const D = 7.0
  const { ref, t } = useLoop(D, 5.4)
  const o = outro(t, D)
  const press = sq(t, 1.4)
  const gone = ease(seg(t, 1.55, 2.0))
  const fly = ease(seg(t, 2.8, 3.6)), back = ease(seg(t, 3.6, 4.2))
  const ax = t < 3.6 ? lerp(56, 180, fly) : lerp(180, 110, back)
  const err = spring(t - 3.65, 14, 0.82)
  return (
    <Frame vb="0 0 360 210" refEl={ref}>
      <g style={{ opacity: o }}>
        <g style={pop(t, 0.1, 270, 70)}>
          <rect x={196} y={36} width={146} height={70} rx={14} className={gone > 0.5 ? styles.cardBad : styles.card} />
          <text x={212} y={58} className={styles.title}>agent key</text>
          <text x={212} y={76} className={gone > 0.5 ? styles.badText : styles.okText}>{gone > 0.5 ? "deleted" : "active · act() only"}</text>
          <text x={212} y={93} className={styles.mono}>keys {gone > 0.5 ? "0" : "1"}</text>
        </g>
        <g style={{ transform: `translate(0px, ${press * 3}px)` }}>
          <rect x={20} y={40} width={150} height={40} rx={20} className={styles.button} style={{ fill: `rgba(255,34,68,${0.06 + 0.16 * gone})` }} />
          <text x={98} y={65} className={styles.monoStrong} textAnchor="middle">revoke_agent()</text>
        </g>
        <Hero x={t < 1.4 ? lerp(40, 98, ease(seg(t, 0.4, 1.3))) : 98} y={t < 1.4 ? lerp(120, 60, ease(seg(t, 0.4, 1.3))) : 60} s={t < 1.6 ? 1 : 0.0001} sx={1 + 0.22 * press} sy={1 - 0.2 * press} />
        <line x1={170} y1={60} x2={196} y2={66} className={styles.wire} style={{ opacity: gone }} />
        {/* the next act() from the agent bounces off */}
        <circle cx={ax} cy={150} r={4} className={styles.packetBad} style={{ opacity: t > 2.8 && t < 4.2 ? 1 : 0 }} />
        <text x={20} y={154} className={styles.mono} style={fade(t, 2.7)}>act()</text>
        <rect x={180} y={130} width={166} height={40} rx={10} className={styles.wall} style={fade(t, 2.7)} />
        <g style={{ opacity: clamp(err * 1.4) }}>
          <Cross x={196} y={151} k={err} />
          <text x={208} y={155} className={styles.badText}>AccessKeyDoesNotExist</text>
        </g>
        <Status t={t} x={20} y={200} beats={[[0, 1.4, "the buyer can stop the agent at any time"], [1.4, 2.8, "one transaction deletes the key", true], [2.8, 99, "every later call fails; payments made stay paid"]]} />
      </g>
    </Frame>
  )
}

/* ================= 7 · checkable from public data (wide) ================= */
const CHECKS = [
  { c: "contract code", r: "hash matches the release", ok: true },
  { c: "agent key", r: "FunctionCall · act only", ok: true },
  { c: "recipient proof", r: "domain bound", ok: true },
  { c: "record", r: "payments reconcile", ok: true },
  { c: "enclave release", r: "pending testnet", ok: false },
]
export function SceneVerify() {
  const D = 8.0
  const { ref, t } = useLoop(D, 6.2)
  const n = useNarrow()
  const o = outro(t, D)
  const cmd = "$ make verify DEAL=<agreement>"
  const typed = cmd.slice(0, Math.floor(clamp((t - 0.2) / 1.0) * cmd.length))
  const at = (i: number) => 1.5 + i * 0.75
  const cur = CHECKS.findIndex((_, i) => t < at(i) + 0.55)
  const blockX = (i: number) => 470 + (i % 3) * 78
  const blockY = (i: number) => 50 + Math.floor(i / 3) * 62
  const hx = cur < 0 ? 0 : blockX(cur), hy = cur < 0 ? 0 : blockY(cur) + 20
  return (
    <Frame vb={n ? "0 0 360 246" : "0 0 720 210"} refEl={ref}>
      <g style={{ opacity: o }}>
        <rect x={16} y={18} width={n ? 328 : 420} height={n ? 196 : 176} rx={14} className={styles.terminal} />
        <text x={32} y={44} className={styles.monoStrong}>{typed}<tspan className={styles.caret} style={{ opacity: Math.floor(t * 2.4) % 2 && t < 1.3 ? 0 : 1 }}>▍</tspan></text>
        {CHECKS.map((c, i) => {
          const k = ease(seg(t, at(i), at(i) + 0.3))
          const y = 70 + i * (n ? 27 : 24)
          return (
            <g key={c.c} style={{ opacity: k, transform: `translate(${(1 - k) * 6}px, 0px)` }}>
              <text x={32} y={y} className={styles.mono}>{String(i + 1).padStart(2, "0")}</text>
              <text x={56} y={y} className={styles.monoStrong}>{c.c}</text>
              {!n ? <text x={176} y={y} className={styles.mono}>{c.r}</text> : null}
              <text x={n ? 330 : 420} y={y} className={c.ok ? styles.monoOn : styles.mono} textAnchor="end">{c.ok ? "ok" : "pending"}</text>
            </g>
          )
        })}
        {!n ? (
          <>
            <text x={470} y={34} className={styles.dim}>public data on NEAR</text>
            {Array.from({ length: 6 }, (_, i) => {
              const lit = CHECKS.some((_, j) => j === i && t >= at(j) + 0.15 && CHECKS[j].ok)
              return (
                <g key={i}>
                  <rect x={blockX(i)} y={blockY(i)} width={60} height={40} rx={8} className={lit ? styles.blockOn : styles.block} />
                  <text x={blockX(i) + 30} y={blockY(i) + 25} className={styles.mono} textAnchor="middle">#{(4102 + i * 7).toString()}</text>
                </g>
              )
            })}
            {cur >= 0 && cur < 4 ? <path d={`M${420} ${70 + cur * 24 - 4} C 444 ${70 + cur * 24 - 4}, ${hx - 24} ${hy}, ${hx - 8} ${hy}`} className={styles.wireOn} /> : null}
            {cur >= 0 && cur < 4 ? <Hero x={hx} y={hy} s={0.8} /> : null}
          </>
        ) : null}
        <Status t={t} x={n ? 16 : 470} y={n ? 236 : 196} beats={[[0, 1.5, "no keys needed"], [1.5, 1.5 + 4 * 0.75, "each check reads public data"], [1.5 + 4 * 0.75, 99, "four checks pass · the release check follows testnet", true]]} />
      </g>
    </Frame>
  )
}

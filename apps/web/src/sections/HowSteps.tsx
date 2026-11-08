import { useEffect, useRef, useState, type ReactNode } from "react"
import { useInView, useReducedMotion } from "motion/react"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { SectionHeading } from "../components/SectionHeading"
import { PixelIcon, type PixelName } from "../components/PixelIcon"
import ab from "./AudienceBand.module.css"
import styles from "./HowSteps.module.css"

/* How it works (#how): how any deal room works, whatever the agreement type (8 Nov 2026). The deal-room band's tab
   row and stage hold one card per step: the step on the left (what happens, who acts, what goes on NEAR, what cannot
   happen); on the right a drawing of the step that draws itself in (Adi's pick of the first design: sealed limits into
   the enclave, offers inside both limits, both approvals into escrow, act() with one payment through and two
   refused, evidence against the agreed condition, the payment to the approved recipient) above the agreement record
   for that step. Teal for a pass; refusal red only for a refusal. Steps advance on their own in view; choosing one
   takes over; reduced motion shows each step drawn and does not advance. Every panel stays in the DOM for agents. */

const APPEAR: AppearEffect = {
  threshold: 0.2,
  replay: false,
  enter: { opacity: 0, x: 0, y: 24, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1.1s", delay: "0s" } },
}
const STEP_MS = 7500

type Line = { k: string; v: string; tone?: "pass" | "refuse" | "weak" }
type Step = {
  n: string; icon: PixelName; title: string; short: string; state: string
  body: string; who: string; onChain: string; never: string
  answer: string; record: Line[]
}

const STEPS: Step[] = [
  {
    n: "01", icon: "vault", title: "Sealed", short: "Each side seals its limits", state: "Sealed",
    body: "Each company sets its limits in the browser, such as a price ceiling or floor and the conditions it needs, and seals them. A mandate is encrypted to a key that exists only inside the Sealed Table's enclave.",
    who: "Each company, in its own browser", onChain: "Each sealed mandate as ciphertext, with its commitment hash", never: "The other side, the operator or the app reading the numbers",
    answer: "Both mandates sealed. Neither side sees the other's limits.",
    record: [{ k: "buyer mandate", v: "sealed · commitment on NEAR", tone: "pass" }, { k: "vendor mandate", v: "sealed · commitment on NEAR", tone: "pass" }, { k: "limits", v: "hidden from both sides", tone: "weak" }],
  },
  {
    n: "02", icon: "agents", title: "Attested", short: "Agents negotiate in the enclave", state: "Attested",
    body: "Both companies' agents negotiate inside the Sealed Table, an attested enclave. Code checks every proposal against both mandates' hard limits, and only the agreed terms come out, with an attestation anyone can verify.",
    who: "Both agents, inside the enclave", onChain: "The agreed terms, the sealed outcome and the attestation", never: "Terms outside either side's limits; a mandate leaving the enclave",
    answer: "Terms agreed inside both limits, with an attestation.",
    record: [{ k: "proposals", v: "checked against both limits", tone: "pass" }, { k: "agreed terms", v: "recorded", tone: "pass" }, { k: "attestation", v: "verified", tone: "pass" }],
  },
  {
    n: "03", icon: "bank", title: "Approved", short: "Both companies approve and fund", state: "Executing",
    body: "People at both companies read the terms and approve them. Payee binds the recipient: the vendor proves its domain, its settlement authority approves the account and the buyer accepts it. The buyer then funds the agreement's USDC escrow on NEAR.",
    who: "A person at each company", onChain: "Both approvals, the authorised recipient and the escrowed USDC", never: "Terms taking effect before both sides approve",
    answer: "Approved by both companies. Recipient bound. Escrow funded.",
    record: [{ k: "approvals", v: "buyer ✓ · vendor ✓", tone: "pass" }, { k: "recipient", v: "bound to the vendor's domain", tone: "pass" }, { k: "escrow", v: "funded · USDC on NEAR", tone: "pass" }],
  },
  {
    n: "04", icon: "key", title: "Executing", short: "The agent pays inside the rules", state: "Executing",
    body: "The buyer's agent holds one key that can call one method, act. Each payment must match the approved milestone, amount and recipient; anything else is refused and recorded, whatever the agent was told.",
    who: "The buyer's agent, through act", onChain: "Every payment and every refusal with its reason", never: "A payment to another account, a different amount or an early payment",
    answer: "Payments inside the terms go through. Anything else is refused and recorded.",
    record: [{ k: "approved account", v: "within the terms", tone: "pass" }, { k: "new account", v: "ERR_PAYEE_MISMATCH", tone: "refuse" }, { k: "different amount", v: "ERR_AMOUNT_MISMATCH", tone: "refuse" }],
  },
  {
    n: "05", icon: "chart", title: "Checked", short: "Evidence decides each payment", state: "Executing",
    body: "A payment becomes eligible only when the agreed evidence is recorded: observations of a market at hidden times, the buyer's acceptance of a delivery, or a named reviewer's approval. Otherwise it is withheld for both sides to review.",
    who: "An attested observer, the buyer or a named reviewer; a keeper triggers scheduled steps", onChain: "Each observation or acceptance, and the result", never: "The keeper moving funds or changing an outcome",
    answer: "Evidence decides: eligible, or withheld for review.",
    record: [{ k: "evidence", v: "observation, acceptance or review", tone: "weak" }, { k: "conditions met", v: "eligible", tone: "pass" }, { k: "not met", v: "withheld for review", tone: "weak" }],
  },
  {
    n: "06", icon: "book", title: "Settled", short: "Paid, recorded, checkable", state: "Settled",
    body: "Eligible payments complete to the authorised recipient in USDC. The buyer decides any exception and can revoke the agent's key in one transaction, and the record remains for anyone to check with one command.",
    who: "The contract pays; the buyer decides exceptions", onChain: "The transfer, any exception and the full record", never: "A payment being reversed or redirected after the fact",
    answer: "Paid to the approved recipient, recorded and checkable.",
    record: [{ k: "transfer", v: "USDC → approved recipient", tone: "pass" }, { k: "exceptions", v: "decided by the buyer", tone: "weak" }, { k: "make verify", v: "code, key, recipient, record", tone: "pass" }],
  },
]

/* ---------- the drawings: each a pure function of t, the seconds since its step opened ----------
   Motion follows the motion-graphics principles (github.com/Barty-Bart/motion-graphics, explainer-default): damped
   springs that settle without bounce, one beat at a time, an object travelling through the workflow, nothing busy.
   viewBox 360 × 150, every drawing centred on x = 180. */
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const ease = (x: number) => (x = clamp(x), x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
/* damped spring step 0 → 1 (w speed, z damping; z near 1 settles with no visible bounce) */
function spring(t: number, w = 14, z = 0.86) {
  if (t <= 0) return 0
  const wd = w * Math.sqrt(1 - z * z)
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t))
}
/* a group that springs in at time a: fades, rises 6px, scales from 0.92 around its own centre */
const pop = (t: number, a: number, cx: number, cy: number) => {
  const k = spring(t - a)
  return { opacity: clamp(k * 1.4), transform: `translate(${cx}px, ${cy + (1 - k) * 6}px) scale(${0.92 + 0.08 * k}) translate(${-cx}px, ${-cy}px)` }
}
const fade = (t: number, a: number, d = 0.4) => ({ opacity: ease(seg(t, a, a + d)) })
/* stroke that draws over [a, a + d] */
const draw = (t: number, a: number, d = 0.6, len = 300) => ({ strokeDasharray: len, strokeDashoffset: len * (1 - ease(seg(t, a, a + d))) })
const cubic = (p: number[][], k: number) => {
  const m = 1 - k
  return [0, 1].map((j) => m * m * m * p[0][j] + 3 * m * m * k * p[1][j] + 3 * m * k * k * p[2][j] + k * k * k * p[3][j])
}

const Lock = ({ x, y, shut, on }: { x: number; y: number; shut: number; on: boolean }) => (
  <g transform={`translate(${x} ${y})`} className={on ? styles.lockOn : styles.lockOff}>
    <rect x="-7" y="-2" width="14" height="11" rx="2.5" className={styles.stroke} />
    <path d="M-4 -2v-3.5a4 4 0 0 1 8 0V-2" className={styles.stroke} style={{ transform: `translateY(${-3 * (1 - shut)}px)` }} />
  </g>
)
const Check = ({ x, y, k }: { x: number; y: number; k: number }) => (
  <path d={`M${x - 6} ${y}l4 4 8-9`} className={styles.tick} style={{ strokeDasharray: 24, strokeDashoffset: 24 * (1 - ease(k)) }} />
)
const Cross = ({ x, y, k }: { x: number; y: number; k: number }) => (
  <path d={`M${x - 5} ${y - 5}l10 10M${x + 5} ${y - 5}l-10 10`} className={styles.cross} style={{ opacity: ease(k), transform: `scale(${0.6 + 0.4 * spring(k * 0.6)})`, transformOrigin: `${x}px ${y}px` }} />
)

function Sealed({ t }: { t: number }) {
  const shut = ease(seg(t, 1.9, 2.3))
  const pulse = t > 2.6 ? (Math.sin((t - 2.6) * 2.4) + 1) / 2 : 0
  return (
    <>
      {[70, 290].map((x, k) => (
        <g key={x} style={pop(t, 0.2 + k * 0.25, x, 66)}>
          <circle cx={x} cy="66" r="28" className={styles.node} />
          <Lock x={x} y={64} shut={shut} on={shut > 0.5} />
          <text x={x} y="118" className={styles.lbl} textAnchor="middle">{k ? "vendor limits" : "buyer limits"}</text>
        </g>
      ))}
      <path d="M100 66 H 148" className={styles.dash} style={fade(t, 0.8)} />
      <path d="M260 66 H 212" className={styles.dash} style={fade(t, 0.8)} />
      {/* each mandate travels into the enclave as ciphertext */}
      {[[100, 148], [260, 212]].map(([a, b], k) => {
        const p = ease(seg(t, 1.2 + k * 0.15, 1.9 + k * 0.15))
        return <circle key={k} cx={lerp(a, b, p)} cy="66" r="3.5" className={styles.packet} style={{ opacity: p > 0 && p < 1 ? 1 : 0 }} />
      })}
      <g style={pop(t, 0.9, 180, 66)}>
        <rect x="150" y="34" width="60" height="64" rx="12" className={styles.enclave} style={{ strokeOpacity: 0.55 + 0.45 * pulse }} />
        <Lock x={180} y={64} shut={shut} on={shut > 0.5} />
        <text x="180" y="118" className={styles.lbl} textAnchor="middle">enclave key</text>
      </g>
    </>
  )
}

function Attested({ t }: { t: number }) {
  const reject = ease(seg(t, 1.3, 1.7))
  const k1 = spring(t - 0.5), k2 = spring(t - 1.9)
  return (
    <>
      <g style={fade(t, 0.1)}>
        <rect x="16" y="14" width="240" height="112" rx="16" className={styles.enclave} />
        <text x="32" y="36" className={styles.lbl}>sealed table · enclave</text>
      </g>
      <g style={{ opacity: clamp(k1 * 1.4) * (1 - 0.55 * reject), transform: `translateX(${(1 - k1) * -14}px)` }}>
        <rect x="32" y="50" width="176" height="26" rx="13" className={styles.bubble} />
        <text x="120" y="67" className={styles.val} textAnchor="middle">offer · outside a limit</text>
        <line x1="44" y1="63" x2={lerp(44, 196, reject)} y2="63" className={styles.strike} />
      </g>
      <g style={{ opacity: clamp(k2 * 1.4), transform: `translateX(${(1 - k2) * 14}px)` }}>
        <rect x="66" y="86" width="176" height="26" rx="13" className={styles.bubbleOn} />
        <text x="154" y="103" className={styles.val} textAnchor="middle">offer · inside both</text>
      </g>
      <path d="M256 70 H 288" className={styles.solid} style={draw(t, 2.6, 0.4, 40)} />
      <g style={pop(t, 2.9, 314, 70)}>
        <circle cx="314" cy="70" r="22" className={styles.badge} />
        <Check x={314} y={70} k={seg(t, 3.1, 3.5)} />
        <text x="314" y="112" className={styles.lblOn} textAnchor="middle">attested</text>
      </g>
    </>
  )
}

function Approved({ t }: { t: number }) {
  const fill = ease(seg(t, 2.7, 3.6))
  const routes = [[[110, 70], [110, 90], [160, 90], [168, 102]], [[250, 70], [250, 90], [200, 90], [192, 102]]]
  return (
    <>
      {[[110, "buyer"], [250, "vendor"]].map(([x, l], k) => (
        <g key={String(l)} style={pop(t, 0.25 + k * 0.6, Number(x), 30)}>
          <circle cx={Number(x)} cy="30" r="17" className={styles.badge} />
          <Check x={Number(x)} y={30} k={seg(t, 0.5 + k * 0.6, 0.9 + k * 0.6)} />
          <text x={Number(x)} y="62" className={styles.lbl} textAnchor="middle">{String(l)} approves</text>
        </g>
      ))}
      <path d="M110 70 C 110 90, 160 90, 168 102 M250 70 C 250 90, 200 90, 192 102" className={styles.dash} style={fade(t, 1.4)} />
      {routes.map((r, k) => {
        const p = ease(seg(t, 1.8 + k * 0.12, 2.6 + k * 0.12))
        const [x, y] = cubic(r, p)
        return <circle key={k} cx={x} cy={y} r="3.5" className={styles.packet} style={{ opacity: p > 0 && p < 1 ? 1 : 0 }} />
      })}
      <g style={pop(t, 1.6, 180, 120)}>
        <rect x="124" y="102" width="112" height="36" rx="10" className={styles.enclave} />
        <rect x="132" y="128" width={96 * fill} height="3" rx="1.5" className={styles.fillBar} />
        <text x="180" y="122" className={styles.val} textAnchor="middle">escrow · USDC</text>
      </g>
    </>
  )
}

/* three requests leave the agent, pass act() and take their branch: one through, two stopped */
const BRANCH = [
  [[192, 60], [210, 60], [212, 26], [228, 26]],
  [[192, 72], [204, 72], [216, 72], [228, 72]],
  [[192, 84], [210, 84], [212, 118], [228, 118]],
]
function Executing({ t }: { t: number }) {
  const outs = [
    { y: 26, label: "approved account", ok: true },
    { y: 72, label: "new account", ok: false },
    { y: 118, label: "different amount", ok: false },
  ]
  return (
    <g transform="translate(-7 0)">
      <g style={pop(t, 0.15, 43, 72)}>
        <rect x="8" y="52" width="70" height="40" rx="10" className={styles.node} />
        <text x="43" y="76" className={styles.val} textAnchor="middle">agent</text>
      </g>
      <path d="M78 72 H 112" className={styles.solid} style={draw(t, 0.4, 0.35, 40)} />
      <g style={pop(t, 0.6, 152, 72)}>
        <rect x="112" y="48" width="80" height="48" rx="12" className={styles.enclave} />
        <text x="152" y="77" className={styles.val} textAnchor="middle">act()</text>
      </g>
      {outs.map((o, k) => {
        const a = 1.0 + k * 1.05 // each request's start
        const toAct = ease(seg(t, a, a + 0.45)), onBranch = ease(seg(t, a + 0.45, a + 0.85))
        const [bx, by] = onBranch > 0 ? cubic(BRANCH[k], o.ok ? onBranch : Math.min(onBranch, 0.7)) : [lerp(78, 192, toAct), 72]
        const live = toAct > 0 && onBranch < 1
        const land = seg(t, a + 0.85, a + 1.15)
        return (
          <g key={k}>
            <path d={`M192 ${o.y === 72 ? 72 : o.y === 26 ? 60 : 84} C ${BRANCH[k][1].join(" ")}, ${BRANCH[k][2].join(" ")}, ${BRANCH[k][3].join(" ")}`} className={styles.solid} style={draw(t, a + 0.45, 0.4, 60)} />
            <circle cx={bx} cy={by} r="4" className={o.ok ? styles.packet : styles.packetBad} style={{ opacity: live ? 1 : 0 }} />
            {o.ok ? <Check x={240} y={o.y} k={land} /> : <Cross x={240} y={o.y} k={land} />}
            <text x="252" y={o.y + 4} className={o.ok ? styles.lblOn : styles.lblRefuse} style={fade(t, a + 0.95, 0.35)}>{o.label}</text>
          </g>
        )
      })}
    </g>
  )
}

function Checked({ t }: { t: number }) {
  const bars = [1, 1, 0, 1, 1, 0]
  const x0 = 47 // six 26px bars with 22px gaps, centred on 180
  const passed = bars.filter((p, k) => p && t > 0.7 + k * 0.38 + 0.3).length
  return (
    <>
      <line x1="30" y1="128" x2="330" y2="128" className={styles.base} style={fade(t, 0.1)} />
      <line x1="30" y1="54" x2="330" y2="54" className={styles.dash} style={fade(t, 0.3)} />
      <text x="330" y="46" className={styles.lbl} textAnchor="end" style={fade(t, 0.4)}>agreed condition</text>
      {bars.map((p, k) => {
        const a = 0.7 + k * 0.38
        const h = (p ? 76 + (k % 2) * 6 : 36) * spring(t - a, 13, 0.9)
        const x = x0 + k * 48
        return (
          <g key={k}>
            <rect x={x} y={128 - h} width="26" height={Math.max(0, h)} rx="6" className={p ? styles.barOn : styles.bar} />
            <g style={fade(t, a + 0.3, 0.3)}>{p ? <Check x={x + 13} y={128 - 76 - (k % 2) * 6 + 16} k={seg(t, a + 0.3, a + 0.6)} /> : <Cross x={x + 13} y={110} k={seg(t, a + 0.3, a + 0.6)} />}</g>
          </g>
        )
      })}
      <text x="30" y="146" className={styles.lbl}>{passed} of 6 passed</text>
      <text x="330" y="146" className={styles.lblOn} textAnchor="end" style={fade(t, 3.2)}>enough passed · eligible</text>
    </>
  )
}

function Settled({ t }: { t: number }) {
  const path = [[108, 72], [160, 20], [210, 20], [252, 72]]
  const first = ease(seg(t, 1.0, 2.0))
  const loop = t > 3.4 ? ((t - 3.4) % 2.6) / 2.6 : -1
  const k = loop >= 0 ? ease(loop) : first
  const [cx, cy] = cubic(path, k)
  const arrived = seg(t, 1.95, 2.3)
  return (
    <>
      <g style={pop(t, 0.15, 66, 72)}>
        <rect x="24" y="50" width="84" height="44" rx="12" className={styles.enclave} />
        <text x="66" y="77" className={styles.val} textAnchor="middle">contract</text>
      </g>
      <path d="M108 72 C 160 20, 210 20, 252 72" className={styles.solid} style={draw(t, 0.5, 0.6, 200)} />
      <circle cx={cx} cy={cy} r="7" className={styles.coin} style={{ opacity: (t > 1.0 && first < 1) || (loop > 0.02 && loop < 0.98) ? 1 : 0 }} />
      <text x="180" y="18" className={styles.lblOn} textAnchor="middle" style={fade(t, 1.0)}>USDC</text>
      <g style={pop(t, 0.4, 296, 72)}>
        <rect x="252" y="50" width="88" height="44" rx="12" className={arrived > 0.5 ? styles.nodeOn : styles.node} />
        <text x="296" y="77" className={styles.val} textAnchor="middle">recipient</text>
      </g>
      <g style={pop(t, 2.0, 336, 50)}>
        <circle cx="336" cy="50" r="10" className={styles.badge} />
        <Check x={336} y={50} k={seg(t, 2.15, 2.5)} />
      </g>
      {[0, 1, 2].map((j) => <rect key={j} x={100 + j * 58} y="118" width={48 * ease(seg(t, 2.5 + j * 0.2, 2.9 + j * 0.2))} height="6" rx="3" className={styles.recLine} />)}
      <text x="180" y="146" className={styles.lbl} textAnchor="middle" style={fade(t, 3.0)}>on the public record</text>
    </>
  )
}

const ART: Record<string, (p: { t: number }) => ReactNode> = { "01": Sealed, "02": Attested, "03": Approved, "04": Executing, "05": Checked, "06": Settled }

/* seconds since the step opened, ticking every frame while it is the active step; reduced motion: the end state */
function useClock(on: boolean, reduce: boolean) {
  const [t, setT] = useState(reduce ? 99 : 0)
  useEffect(() => {
    if (reduce) { setT(99); return }
    if (!on) { setT(0); return }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => { setT((now - start) / 1000); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [on, reduce])
  return t
}
function Art({ n, on, reduce }: { n: string; on: boolean; reduce: boolean }) {
  const t = useClock(on, reduce)
  const View = ART[n]
  return <svg viewBox="0 0 360 150" className={styles.art} aria-hidden="true"><View t={t} /></svg>
}

export function HowSteps() {
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const [active, setActive] = useState(0)
  const [cycle, setCycle] = useState(0)
  const [paused, setPaused] = useState(false)
  const running = !reduce && inView && !paused
  const go = (n: number) => { setActive(n); setCycle((c) => c + 1) }
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (!running) return
    const t = window.setTimeout(() => go((active + 1) % STEPS.length), STEP_MS)
    return () => window.clearTimeout(t)
  }, [running, active, cycle])

  return (
    <section ref={ref} id="how" className={`section ${styles.section}`}>
      <SectionHeading
        eyebrow="How it works"
        title="How a deal room works."
        accent="teal"
        wide
        lead={<p>One agreement from sealed limits to a settled payment, in six steps. Every agreement type runs the same way; only the terms and the evidence change.</p>}
      />

      <Appear as="div" className={styles.flow} effect={APPEAR}>
        <div className={ab.uses} role="tablist" aria-label="The six steps of a deal room">
          {STEPS.map((s, k) => (
            <button key={s.n} ref={(el) => { tabs.current[k] = el }} type="button" role="tab" id={`how-tab-${k}`} aria-controls={`how-panel-${k}`}
              aria-selected={k === active} tabIndex={k === active ? 0 : -1} title={s.short}
              className={`${ab.use} ${k === active ? ab.useOn : ""}`} onClick={() => go(k)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
                e.preventDefault()
                const n = (k + (e.key === "ArrowRight" ? 1 : STEPS.length - 1)) % STEPS.length
                go(n); tabs.current[n]?.focus()
              }}>
              <PixelIcon name={s.icon} size={22} />
              <span className={ab.useLabel}><span className={styles.tabNum}>{s.n}</span>{s.title}</span>
              {k === active && !reduce ? (
                <span key={cycle} className={ab.timer} aria-hidden="true" style={{ animationDuration: `${STEP_MS}ms`, animationPlayState: running ? "running" : "paused" }} />
              ) : null}
            </button>
          ))}
        </div>

        <div className={ab.stage} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <span className={ab.weave} aria-hidden="true" />
          <span className={ab.sheen} aria-hidden="true" />
          <div className={styles.stack}>
            {STEPS.map((s, k) => (
              <div key={s.n} role="tabpanel" id={`how-panel-${k}`} aria-labelledby={`how-tab-${k}`} hidden={k !== active} className={styles.card}>
                <div className={styles.text}>
                  <div className={styles.textHead}>
                    <span className={styles.tileLg}><PixelIcon name={s.icon} size={22} /></span>
                    <p className={`mono ${styles.kicker}`}>Step {s.n} of 06</p>
                  </div>
                  <h3 className={styles.title}>{s.title}: {s.short.toLowerCase()}.</h3>
                  <p className={styles.body}>{s.body}</p>
                  <dl className={styles.facts}>
                    <div><dt>Who acts</dt><dd>{s.who}</dd></div>
                    <div><dt>On NEAR</dt><dd>{s.onChain}</dd></div>
                    <div className={styles.never}><dt>Cannot happen</dt><dd>{s.never}</dd></div>
                  </dl>
                </div>

                <div className={styles.console}>
                  <div className={ab.room}><span>Deal room · step {s.n} of 06</span><span className={styles.state}>{s.state}</span></div>
                  <Art n={s.n} on={k === active} reduce={reduce} />
                  <div className={styles.record}>
                    {s.record.map((l) => (
                      <div key={l.k} className={styles.line}>
                        <span className={styles.lk}>{l.k}</span>
                        <span className={l.tone === "refuse" ? styles.refuse : l.tone === "pass" ? styles.pass : styles.weak}>{l.v}</span>
                      </div>
                    ))}
                  </div>
                  <p className={`${styles.answer} ${reduce ? "" : ab.sweep}`}>{s.answer}</p>
                  <div className={styles.track} aria-hidden="true">{Array.from({ length: 6 }, (_, t) => <i key={t} className={t < Number(s.n) ? styles.trackOn : ""} />)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Appear>
    </section>
  )
}

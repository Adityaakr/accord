import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useInView, useReducedMotion } from "motion/react"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { Button } from "../components/Button"
import { Mono } from "../components/Mono"
import { LINKS } from "../content/links"
import { asOfLabel, useLive, type LiveValues } from "../lib/live"
import { AtlasMark } from "../components/AtlasMark"
import styles from "./Compliance.module.css"

/* Home · Accord Atlas (elementId "atlas"). Heading and copy on a two-column row, then a stage holding the Atlas
   monitor: one illustrative period of a NEAR/USDC retainer played end to end. Five steps run along the top (approved
   conditions, observation slot, attestation, period decision, payment on NEAR); the order book is sampled and each of
   six slots attested on a period timeline, readings count between values and meter against the approved conditions,
   then the period is decided and the retainer settles. Loops while in view; reduced motion shows the settled period.
   The Atlas mark stays monochrome; colour lives in the data: teal for bids and passes, coral for asks and misses.
   Figures match the site's one example: 18,500 USDC a period, ≤40 bps, ≥12,000 USDC depth within 1%, ≥95% uptime,
   5 of 6 slots. Slot 3 fails on spread, as in the hero preview.
   Copy: docs/website/ACCORD_WEBSITE_FINAL_COPY.md Part A "Glassbook" (renamed Accord Atlas, 30 Oct 2026). */

const appear = (delay: `${number}s`): AppearEffect => ({
  threshold: 0.5,
  replay: false,
  enter: { opacity: 0, x: 0, y: 32, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1s", delay } },
})

const STEPS = ["Approved conditions", "Observation slot", "Attestation", "Period decision", "Payment on NEAR"]
const RECIPIENT = "halcyon-mm.near"

type Slot = { bps: number; depth: number; up: number; pass: boolean }
const SLOTS: Slot[] = [
  { bps: 36, depth: 12910, up: 98.4, pass: true },
  { bps: 39, depth: 12480, up: 97.9, pass: true },
  { bps: 47, depth: 9820, up: 93.1, pass: false },
  { bps: 38, depth: 12640, up: 97.6, pass: true },
  { bps: 35, depth: 13105, up: 98.8, pass: true },
  { bps: 37, depth: 12770, up: 97.4, pass: true },
]
const MEAN = { bps: 37, depth: 12288, up: 97.2 }

/* The period as frames: the conditions, then each slot sampled and attested, then the decision, then the payment */
type Frame = { step: number; slot: number; ms: number }
const FRAMES: Frame[] = [
  { step: 0, slot: -1, ms: 1800 },
  ...SLOTS.flatMap((_, i) => [{ step: 1, slot: i, ms: 1000 }, { step: 2, slot: i, ms: 600 }]),
  { step: 3, slot: 6, ms: 2000 },
  { step: 4, slot: 6, ms: 5200 },
]
const LAST = FRAMES.length - 1
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"

function usePeriod(run: boolean, reduce: boolean) {
  const [f, setF] = useState(reduce ? LAST : 0)
  useEffect(() => {
    if (reduce) { setF(LAST); return }
    if (!run) return
    const t = window.setTimeout(() => setF((n) => (n + 1) % FRAMES.length), FRAMES[f].ms)
    return () => window.clearTimeout(t)
  }, [f, run, reduce])
  return FRAMES[f]
}

/* Counts a number to its new value (ease-out), so readings glide instead of jumping */
function useTween(target: number, reduce: boolean, ms = 700) {
  const [v, setV] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    if (reduce) { setV(target); from.current = target; return }
    const a = from.current, t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3)
      const x = a + (target - a) * e
      setV(x); from.current = x
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, reduce, ms])
  return v
}
const usd = (n: number) => Math.round(n).toLocaleString("en-US")

/* Cumulative depth either side of the mid price: bids (teal) and asks (coral) as smooth areas. Depth scales the
   curves' height and the spread opens or closes the gap at the mid, both on a transition. */
function DepthChart({ r, sampling }: { r: { bps: number; depth: number }; sampling: boolean }) {
  const h = Math.max(0.6, Math.min(1.08, r.depth / 12600))
  const gap = (r.bps - 36) * 0.9
  return (
    <svg className={styles.chart} viewBox="0 0 520 168" aria-hidden="true">
      <defs>
        <linearGradient id="atlas-bid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className={styles.bidStop} stopOpacity="0.38" /><stop offset="1" className={styles.bidStop} stopOpacity="0.02" /></linearGradient>
        <linearGradient id="atlas-ask" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className={styles.askStop} stopOpacity="0.32" /><stop offset="1" className={styles.askStop} stopOpacity="0.02" /></linearGradient>
      </defs>
      <rect x="196" y="4" width="128" height="146" rx="4" className={styles.band} />
      <text x="200" y="16" className={styles.bandLabel}>±1%</text>
      <g className={styles.side} style={{ transform: `translateX(${-gap}px) scaleY(${h})`, transition: `transform 0.9s ${EASE}` }}>
        <path d="M0 150 L0 30 C 110 38, 205 96, 252 143 L252 150 Z" fill="url(#atlas-bid)" />
        <path d="M0 30 C 110 38, 205 96, 252 143" className={styles.bidLine} />
      </g>
      <g className={styles.side} style={{ transform: `translateX(${gap}px) scaleY(${h})`, transition: `transform 0.9s ${EASE}` }}>
        <path d="M268 150 L268 143 C 315 96, 410 38, 520 32 L520 150 Z" fill="url(#atlas-ask)" />
        <path d="M268 143 C 315 96, 410 38, 520 32" className={styles.askLine} />
      </g>
      <line x1="0" y1="150.5" x2="520" y2="150.5" className={styles.axis} />
      <line x1="260" y1="22" x2="260" y2="150" className={styles.mid} />
      <text x="260" y="164" textAnchor="middle" className={styles.tick}>mid</text>
      <text x="196" y="164" textAnchor="middle" className={styles.tick}>−1%</text>
      <text x="324" y="164" textAnchor="middle" className={styles.tick}>+1%</text>
      <rect x="196" y="4" width="128" height="146" rx="4" className={`${styles.scan} ${sampling ? styles.scanOn : ""}`} />
    </svg>
  )
}

const Tick = () => <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" /></svg>

function Monitor() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.35 })
  const reduce = useReducedMotion() ?? false
  const fr = usePeriod(inView, reduce)
  const marked = fr.step >= 3 ? 6 : fr.step === 2 ? fr.slot + 1 : Math.max(fr.slot, 0)
  const passed = SLOTS.slice(0, marked).filter((s) => s.pass).length
  const cur = fr.slot >= 0 && fr.slot < 6 ? SLOTS[fr.slot] : null
  const read = cur ?? MEAN
  const bps = useTween(read.bps, reduce), depth = useTween(read.depth, reduce), up = useTween(read.up, reduce)
  const okBps = read.bps <= 40, okDepth = read.depth >= 12000, okUp = read.up >= 95

  /* the period playhead: where the sampling is within the six slots (0 to 1) */
  const head = fr.step === 0 ? 0 : fr.step >= 3 ? 1 : (fr.slot + (fr.step === 2 ? 1 : 0.6)) / 6
  const headMs = fr.step === 0 ? 400 : fr.step >= 3 ? 700 : fr.ms

  const state = fr.step <= 2 ? "Monitoring" : fr.step === 3 ? "Deciding" : "Settled"
  const conds: [string, string, string, number, boolean][] = [
    ["Spread", `${Math.round(bps)} bps`, "≤ 40 bps", Math.min(1, bps / 50), okBps],
    ["Depth within 1%", `${usd(depth)} USDC`, "≥ 12,000", Math.min(1, depth / 15000), okDepth],
    ["Uptime", `${up.toFixed(1)}%`, "≥ 95%", Math.max(0, Math.min(1, (up - 85) / 15)), okUp],
  ]
  const marks = [40 / 50, 12000 / 15000, (95 - 85) / 15]

  return (
    <div ref={ref} className={styles.monitor} role="img"
      aria-label="Illustrative Accord Atlas monitor for a NEAR/USDC market-making retainer. Approved conditions: spread at most 40 bps, at least 12,000 USDC of depth within 1%, 95% uptime, 5 of 6 observation slots to pass. The venue's public order book is sampled six times and each slot attested; slot 3 fails with a 47 bps spread and 9,820 USDC of depth. 5 of 6 pass, the period is eligible and 18,500 USDC is settled to halcyon-mm.near in USDC on NEAR.">
      <div className={styles.bar}>
        <span className={styles.barName}>
          <AtlasMark size={20} />
          <span className={styles.pair}>NEAR<span>/</span>USDC</span>
          <span className={styles.chip}>Market-making retainer</span>
        </span>
        <span className={styles.barRight}>
          <span className={`${styles.state} ${styles[`st_${state}`]}`}><span className={styles.stateDot} />{state}</span>
          <span className={styles.illus}>Illustrative</span>
        </span>
      </div>

      <ol className={styles.rail}>
        {STEPS.map((s, i) => (
          <li key={s} className={`${styles.railStep} ${i < fr.step ? styles.railDone : i === fr.step ? styles.railOn : ""}`}>
            <span className={styles.railMark}>{i < fr.step ? <Tick /> : <span>{i + 1}</span>}</span>
            <span className={styles.railLabel}>{s}</span>
          </li>
        ))}
      </ol>
      <p className={styles.railCaption}>Step {fr.step + 1} of 5 · {STEPS[fr.step]}</p>

      <div className={styles.body}>
        <div className={styles.book}>
          <div className={styles.paneHead}>
            <span>Order book depth</span>
            <span className={styles.legend}><i className={styles.lgBid} />Bids<i className={styles.lgAsk} />Asks</span>
          </div>
          <DepthChart r={read} sampling={fr.step === 1 && !reduce} />
          <dl className={styles.reads}>
            <div><dt>Spread</dt><dd className={okBps ? "" : styles.warn}>{Math.round(bps)}<small> bps</small></dd></div>
            <div><dt>Depth ±1%</dt><dd className={okDepth ? "" : styles.warn}>{usd(depth)}<small> USDC</small></dd></div>
            <div><dt>Uptime</dt><dd className={okUp ? "" : styles.warn}>{up.toFixed(1)}<small>%</small></dd></div>
          </dl>
        </div>

        <div className={styles.terms}>
          <div className={styles.paneHead}><span>Approved conditions</span><span className={styles.dim}>{cur ? `Slot ${fr.slot + 1}` : "Period mean"}</span></div>
          <ul className={styles.condList}>
            {conds.map(([k, v, need, fill, ok], i) => (
              <li key={k}>
                <span className={styles.condTop}><span>{k}</span><span className={styles.condVal}><b className={ok ? "" : styles.warn}>{v}</b><small>{need}</small></span></span>
                <span className={styles.meter}>
                  <span className={`${styles.meterFill} ${ok ? "" : styles.meterWarn}`} style={{ transform: `scaleX(${fill})` }} />
                  <span className={styles.meterMark} style={{ left: `${marks[i] * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
          <div className={styles.payout}>
            <span className={styles.dim}>Pass rule</span>
            <span className={styles.payoutVal}>5 of 6 slots <small>per period</small></span>
          </div>
          <div className={`${styles.payout} ${styles.payoutNext}`}>
            <span className={styles.dim}>Retainer</span>
            <span className={styles.payoutVal}>18,500 USDC <small>→ {RECIPIENT}</small></span>
          </div>
        </div>
      </div>

      <div className={styles.period}>
        <div className={styles.paneHead}>
          <span>Period 1 · observation slots</span>
          <span className={styles.dim}><b className={styles.count}>{passed}</b> of 6 passed<span className={styles.req}> · 5 required</span></span>
        </div>
        <div className={styles.track}>
          {SLOTS.map((s, i) => {
            const done = i < marked, now = i === fr.slot && fr.step <= 2
            return (
              <div key={i} className={`${styles.seg} ${done ? (s.pass ? styles.segPass : styles.segFail) : ""} ${now ? styles.segNow : ""}`}>
                <span className={styles.segFill} />
                <span className={styles.segLabel}><b>S{i + 1}</b>{done ? <> · {s.bps} bps</> : now ? <> · {fr.step === 1 ? "sampling" : "attesting"}</> : null}</span>
              </div>
            )
          })}
          <span className={styles.playhead} style={{ left: `${head * 100}%`, transition: `left ${headMs}ms ${fr.step === 1 ? "linear" : EASE}`, opacity: fr.step >= 3 ? 0 : 1 }} />
        </div>
      </div>

      <div className={`${styles.settle} ${fr.step === 3 ? styles.settleEligible : ""} ${fr.step === 4 ? styles.settleDone : ""}`}>
        <span className={styles.settleIcon}><Tick /></span>
        <span className={styles.settleText}>
          <span className={fr.step <= 2 ? styles.txtOn : ""}>Awaiting the period's observations</span>
          <span className={fr.step === 3 ? styles.txtOn : ""}>Eligible · {passed} of 6 slots passed</span>
          <span className={fr.step === 4 ? styles.txtOn : ""}>Settled to {RECIPIENT}</span>
        </span>
        <span className={`${styles.settleAmt} ${fr.step === 4 ? styles.amtDone : ""}`}>{fr.step === 4 ? "18,500 USDC" : fr.step === 3 ? "Releasing" : `${marked} of 6 attested`}</span>
      </div>
    </div>
  )
}

/* spec §3.3: compact slot panel when the snapshot carries real observation slots (src/lib/live.ts `slots`).
   Every value is read from the snapshot; the word "live" is never printed (honesty gate); nothing renders without slots. */
function SlotPanel({ v }: { v: LiveValues }) {
  const slots = v.slots
  const passed = slots.filter((s) => s.result === "PASS").length
  return (
    <div className={styles.livePanel} aria-label="Observation slots">
      <div className={styles.livePanelHead}>
        <p className={`t-h6 ${styles.livePanelTitle}`}>Observation slots</p>
        <Mono className={styles.livePill}>{passed} of {slots.length} pass</Mono>
        <p className={`t-body-sm ${styles.liveAsOf}`}>
          {v.source === "last-known" ? "Data unavailable · last known " : "Last updated "}{asOfLabel(v)}
        </p>
      </div>
      <ul className={styles.liveList}>
        {slots.map((s) => (
          <li key={s.slot}>
            <Mono className={styles.liveChip} tone={s.result === "FAIL" ? "refusal" : undefined}>
              slot {s.slot} · {s.result === "PASS" ? "pass" : "fail"} · {s.spreadP50Bps} bps · {s.depthMin} · {s.uptimePct}%
            </Mono>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Compliance() {
  const live = useLive()
  const hasSlots = !!live && live.slots.length > 0
  return (
    <section id="atlas" className={`section ${styles.section}`}>
      <div className={styles.head}>
        <Appear className={styles.headLeft} effect={appear("0s")}>
          <span className={styles.tag}><AtlasMark size={20} /><span className="t-body-sm">The first application built on Accord</span></span>
          <h2 className={`t-h2 ${styles.title}`}>Accord Atlas: liquidity agreements with measurable payment conditions.</h2>
        </Appear>
        <Appear className={styles.headRight} effect={appear("0.15s")}>
          <p className={`t-body-lg ${styles.description}`}>
            Built on Accord, Atlas links a market maker's recurring retainer to the spread, depth and uptime both sides agreed. An attested observer samples
            the venue's public order book on the agreed schedule. When the agreed number of observations pass, the payment is released; when they don't, it
            is held for both sides to decide.
          </p>
          <div className={styles.actions}>
            <Button variant="primary" href={LINKS.exploreAtlas}>See the Atlas demonstration</Button>
            <Link to={LINKS.join} className={`t-body-sm ls-link ${styles.join}`}>Join as a project or a market maker →</Link>
          </div>
        </Appear>
      </div>

      <Appear className={styles.stage} effect={appear("0.1s")}>
        <span className={styles.weave} aria-hidden="true" />
        <span className={styles.sheen} aria-hidden="true" />
        <Monitor />
      </Appear>

      {hasSlots ? <SlotPanel v={live} /> : null}

      <p className={`t-body-sm ${styles.scope}`}>
        <span className={styles.scopeLabel}>Scope</span>
        Atlas measures the market's condition on the venue, not which participant supplied it. Attributing liquidity to the market maker's own account is planned.
      </p>
    </section>
  )
}

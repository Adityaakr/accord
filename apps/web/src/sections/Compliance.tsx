import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useInView, useReducedMotion } from "motion/react"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { Button } from "../components/Button"
import { Mono } from "../components/Mono"
import { LINKS } from "../content/links"
import { asOfLabel, useLive, type LiveValues } from "../lib/live"
import { LogoMark } from "../components/Logo"
import { REFERENCES } from "../content/references"
import styles from "./Compliance.module.css"

/* Home · Market-making agreements in Accord (elementId "market-making"): the featured agreement type, one of the six in
   Use cases (it carried the Accord Atlas name until 8 Nov 2026; Accord is now the only product). Heading and copy on a
   two-column row, the sourced "why" cards, then a stage holding the agreement's monitor: one illustrative period of a NEAR/USDC retainer played end to end. Five steps run along the top (approved
   conditions, observation slot, attestation, period decision, payment on NEAR); the pool is read at hidden times and each of
   six slots attested on a period timeline, readings count between values and meter against the approved conditions,
   then the period is decided and the retainer settles. Loops while in view; reduced motion shows the settled period.
   The mark stays monochrome; colour lives in the data: teal for bids and passes, coral for asks and misses.
   After the monitor, the scope note: the demonstration proves condition-linked payment, not account-level
   performance attribution.
   Figures match the site's one example (kit v7): 18,500 USDC a period, ≤60 bps, ≥12,000 USDC depth within 2% on each
   side, both sides quoted, 4 of 6 slots. Slot 3 fails on depth, as in the hero preview.
   Copy: kit v7 website/FINAL_COPY.md Part A "Accord Atlas", renamed; the scope line from Adi, 8 Nov 2026. */

const appear = (delay: `${number}s`): AppearEffect => ({
  threshold: 0.5,
  replay: false,
  enter: { opacity: 0, x: 0, y: 32, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1s", delay } },
})

const STEPS = ["Approved conditions", "Observation slot", "Attestation", "Period decision", "Payment on NEAR"]
const RECIPIENT = "halcyon-mm.near"

/* One illustrative period on Rhea's USDC/wNEAR pool (kit v7): spread ≤ 60 bps (the pool's 0.2% fee puts a round trip
   at 40 bps or more), depth ≥ 12,000 USDC within 2% of the mid on each side, both sides quoted; 4 of 6 slots to pass.
   Slot 3 fails on depth. Each slot's time is drawn inside the observer's enclave and shown once observed. */
type Slot = { bps: number; depth: number; two: boolean; at: string; pass: boolean }
const SLOTS: Slot[] = [
  { bps: 48, depth: 12910, two: true, at: "00:47", pass: true },
  { bps: 51, depth: 12480, two: true, at: "05:12", pass: true },
  { bps: 52, depth: 9820, two: true, at: "08:31", pass: false },
  { bps: 47, depth: 12640, two: true, at: "13:05", pass: true },
  { bps: 45, depth: 13105, two: true, at: "16:58", pass: true },
  { bps: 49, depth: 12770, two: true, at: "21:40", pass: true },
]
const MEAN = { bps: 49, depth: 12288, two: true }

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
      <text x="200" y="16" className={styles.bandLabel}>±2%</text>
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
      <text x="196" y="164" textAnchor="middle" className={styles.tick}>−2%</text>
      <text x="324" y="164" textAnchor="middle" className={styles.tick}>+2%</text>
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
  const bps = useTween(read.bps, reduce), depth = useTween(read.depth, reduce)
  const okBps = read.bps <= 60, okDepth = read.depth >= 12000, okTwo = read.two
  /* uptime as the observer reports it: the share of observed slots in which the pool quoted both sides */
  const seen = SLOTS.slice(0, marked), uptime = seen.length ? Math.round((seen.filter((x) => x.two).length / seen.length) * 100) : null

  /* the period playhead: where the sampling is within the six slots (0 to 1) */
  const head = fr.step === 0 ? 0 : fr.step >= 3 ? 1 : (fr.slot + (fr.step === 2 ? 1 : 0.6)) / 6
  const headMs = fr.step === 0 ? 400 : fr.step >= 3 ? 700 : fr.ms

  const state = fr.step <= 2 ? "Monitoring" : fr.step === 3 ? "Deciding" : "Settled"
  const conds: [string, string, string, number, boolean][] = [
    ["Spread", `${Math.round(bps)} bps`, "≤ 60 bps", Math.min(1, bps / 75), okBps],
    ["Depth within 2%", `${usd(depth)} USDC`, "≥ 12,000", Math.min(1, depth / 15000), okDepth],
    ["Two-sided quoting", okTwo ? "Both sides" : "One side", "required", okTwo ? 1 : 0.5, okTwo],
  ]
  const marks = [60 / 75, 12000 / 15000, 1]

  return (
    <div ref={ref} className={styles.monitor} role="img"
      aria-label="Illustrative monitor for a NEAR/USDC market-making agreement on Rhea's USDC/wNEAR pool. Approved conditions: spread at most 60 bps, at least 12,000 USDC of depth within 2% of the mid on each side, both sides quoted, 4 of 6 observation slots to pass. The pool is read at six times drawn inside the observer's enclave and each slot is attested; slot 3 fails with 9,820 USDC of depth. 5 of 6 pass, the period is eligible and 18,500 USDC is settled to halcyon-mm.near in USDC on NEAR.">
      <div className={styles.bar}>
        <span className={styles.barName}>
          <LogoMark size={18} />
          <span className={styles.pair}>NEAR<span>/</span>USDC</span>
          <span className={styles.chip}>Rhea USDC/wNEAR pool</span>
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
            <span>Pool liquidity · ±2% of mid</span>
            <span className={styles.legend}><i className={styles.lgBid} />Bids<i className={styles.lgAsk} />Asks</span>
          </div>
          <DepthChart r={read} sampling={fr.step === 1 && !reduce} />
          <dl className={styles.reads}>
            <div><dt>Spread</dt><dd className={okBps ? "" : styles.warn}>{Math.round(bps)}<small> bps</small></dd></div>
            <div><dt>Depth ±2%</dt><dd className={okDepth ? "" : styles.warn}>{usd(depth)}<small> USDC</small></dd></div>
            <div><dt>Uptime, reported</dt><dd>{uptime === null ? "–" : uptime}<small>{uptime === null ? "" : "%"}</small></dd></div>
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
            <span className={styles.payoutVal}>4 of 6 slots <small>per period</small></span>
          </div>
          <div className={`${styles.payout} ${styles.payoutNext}`}>
            <span className={styles.dim}>Retainer</span>
            <span className={styles.payoutVal}>18,500 USDC <small>→ {RECIPIENT}</small></span>
          </div>
        </div>
      </div>

      <div className={styles.period}>
        <div className={styles.paneHead}>
          <span>Period 1 · slot times drawn inside the enclave</span>
          <span className={styles.dim}><b className={styles.count}>{passed}</b> of 6 passed<span className={styles.req}> · 4 required</span></span>
        </div>
        <div className={styles.track}>
          {SLOTS.map((s, i) => {
            const done = i < marked, now = i === fr.slot && fr.step <= 2
            return (
              <div key={i} className={`${styles.seg} ${done ? (s.pass ? styles.segPass : styles.segFail) : ""} ${now ? styles.segNow : ""}`}>
                <span className={styles.segFill} />
                <span className={styles.segLabel}><b>S{i + 1}</b>{done ? <> · {s.at}</> : now ? <> · {fr.step === 1 ? "sampling" : "attesting"}</> : <> · hidden</>}</span>
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

/* Why market-making agreements: four public voices on market-making deals, each paired with the part of the agreement that answers it.
   Paraphrases, checked against the sources on 31 Oct 2026; each card links its source (rows 45–48 in references.ts).
   No accused firm is named, and nothing claims the problem is unsolved elsewhere. */
const WHY: { who: string; role: string; org: string; logo: string; date: string; ref: number; said: string; answer: string }[] = [
  { who: "Kain Warwick", role: "Founder", org: "Synthetix", logo: "synthetix.svg", date: "Mar 2025", ref: 45,
    said: "Projects paid market makers $50k to $300k+ a month in the 2017 cycle. Many exercised their call options and dumped.",
    answer: "ties pay to the agreed spread, depth and two-sided quoting." },
  { who: "Jelle Buth", role: "Co-founder", org: "Enflux, market maker", logo: "enflux.png", date: "Apr 2025", ref: 46,
    said: "Projects should set liquidity KPIs before they commit. In loan-option deals they are often missing or vague.",
    answer: "turns the KPIs into the payment conditions." },
  { who: "LO:TECH", role: "Survey", org: "commissioned by a market maker", logo: "lotech.png", date: "Aug 2025", ref: 47,
    said: "52% of 2,000+ respondents do not trust market makers. The report recommends enforceable contracts.",
    answer: "lets attested observations decide each payment." },
  { who: "Binance", role: "Exchange guidance", org: "for listed projects", logo: "binance.svg", date: "Mar 2026", ref: 48,
    said: "Projects must disclose their market maker's legal entity and contract terms to the exchange.",
    answer: "measures whether those terms were met." },
]
const srcHref = (n: number) => REFERENCES.find((r) => r.n === n)?.links[0]

function WhyMarketMaking() {
  return (
    <div className={styles.why}>
      <Appear className={styles.whyHead} effect={appear("0s")}>
        <div className={styles.whyHeadText}>
          <span className={styles.whyKicker}>Why it matters</span>
          <p className={`t-h5 ${styles.whyTitle}`}>Projects, market makers and exchanges keep pointing at the same gap.</p>
        </div>
        <p className={styles.whyNote}>Paraphrased from public sources, linked on each card.</p>
      </Appear>
      <ul className={styles.whyGrid}>
        {WHY.map((w, i) => (
          <Appear key={w.ref} as="li" className={styles.whyCard} effect={appear(`${0.05 + i * 0.08}s` as `${number}s`)}>
            <div className={styles.whoRow}>
              <span className={styles.logo}><img src={`/assets/logos/${w.logo}`} alt="" width={32} height={32} loading="lazy" decoding="async" /></span>
              <span className={styles.whoText}>
                <span className={styles.who}>{w.who}</span>
                <span className={styles.role}>{w.role} · {w.org}</span>
              </span>
              <a className={styles.src} href={srcHref(w.ref)} target="_blank" rel="noopener noreferrer" aria-label={`Source for ${w.who}, ${w.date} (opens in a new tab)`}>
                <span>{w.date}</span>
                <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5" /></svg>
              </a>
            </div>
            <p className={styles.said}>{w.said}</p>
            <div className={styles.answer}>
              <LogoMark size={14} />
              <span><b className={styles.answerName}>Accord</b> {w.answer}</span>
            </div>
          </Appear>
        ))}
      </ul>
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
              slot {s.slot} · {s.result === "PASS" ? "pass" : "fail"} · {s.spreadBps} bps · {Math.min(s.depthBid, s.depthAsk)} · {s.twoSided ? "both sides" : "one side"}
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
    <section id="market-making" className={`section ${styles.section}`}>
      <div className={styles.head}>
        <Appear className={styles.headTag} effect={appear("0s")}>
          <span className={styles.tag}><span className={styles.tagDot} aria-hidden="true" /><span className="t-body-sm">Featured agreement · Demo</span></span>
        </Appear>
        <Appear className={styles.headLeft} effect={appear("0s")}>
          <h2 className={`t-h2 ${styles.title}`}>Market-making agreements in Accord.</h2>
        </Appear>
        <Appear className={styles.headRight} effect={appear("0.15s")}>
          <p className={`t-body-lg ${styles.description}`}>
            A market-making agreement connects the retainer to the liquidity conditions both parties approve. An attested observer samples the venue's public
            liquidity at hidden times within an agreed schedule, checking spread, depth and two-sided quoting against the agreement.
          </p>
          <p className={`t-body ${styles.description} ${styles.descriptionMore}`}>
            When the required observations pass, payment becomes eligible for release under Accord's payment controls. Otherwise, it remains withheld for
            both parties to review. Each payment decision is linked to the terms and observations behind it.
          </p>
          <div className={styles.actions}>
            <Button variant="primary" href={LINKS.marketMaking}>Explore the agreement</Button>
            <Link to={LINKS.join} className={`t-body-sm ls-link ${styles.join}`}>Join as a project or a market maker →</Link>
          </div>
        </Appear>
      </div>

      <WhyMarketMaking />

      <Appear className={styles.stage} effect={appear("0.1s")}>
        <span className={styles.weave} aria-hidden="true" />
        <span className={styles.sheen} aria-hidden="true" />
        <Monitor />
      </Appear>

      {hasSlots ? <SlotPanel v={live} /> : null}

      <p className={`t-body-sm ${styles.scope}`}>
        <span className={styles.scopeLabel}>Scope</span>
        The demonstration proves condition-linked payment, not account-level performance attribution. Public order-book observations measure the venue's
        liquidity, not the hired market maker's own contribution. Verification using the market maker's authenticated account data is planned.
      </p>
    </section>
  )
}

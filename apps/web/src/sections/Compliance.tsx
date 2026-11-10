import { useCallback, useEffect, useRef, useState } from "react"
import { Arrow } from "../components/Arrow"
import { Link } from "react-router-dom"
import { useInView, useReducedMotion } from "motion/react"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { Button } from "../components/Button"
import { Mono } from "../components/Mono"
import { LINKS } from "../content/links"
import { MARKET_MAKING } from "../content/testnet"
import { asOfLabel, useLive, type LiveValues } from "../lib/live"
import { LogoMark } from "../components/Logo"
import { REFERENCES } from "../content/references"
import styles from "./Compliance.module.css"

/* Home · Market-making agreements in Accord (elementId "market-making"): one of the six agreement types in Use cases (it
   carried the Accord Atlas name until 8 Nov 2026). Heading and one paragraph, the sourced "why" cards, then the monitor:
   the two agreements recorded on NEAR testnet on 10 Nov 2026 (docs/runs.md "Market making on testnet"), played period 1
   end to end, a56 then a57, with their real terms, readings and transactions. Five steps run along the top; each of six
   slots is read and attested on the period timeline; the period is decided; a56's retainer is paid, a57's payment is
   refused. Loops while in view (a56, a57, a56…); the tabs pick one; reduced motion shows the settled period.
   Every number here comes from MARKET_MAKING in content/testnet.ts and docs/runs.md. The mark stays monochrome; colour
   lives in the data: teal for bids and passes, coral for asks and misses. After the monitor, the scope note. */

const appear = (delay: `${number}s`): AppearEffect => ({
  threshold: 0.5,
  replay: false,
  enter: { opacity: 0, x: 0, y: 32, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1s", delay } },
})

const STEPS = ["Approved conditions", "Observation slot", "Attestation", "Period decision", "Payment on NEAR"]
const MM = MARKET_MAKING
const nb = (hash: string) => `https://testnet.nearblocks.io/txns/${hash}`

/* One recorded period. depth is the thinner side (the condition is "at least X on both sides"). */
type Slot = { bps: number; bid: number; ask: number; depth: number; two: boolean; pass: boolean; tx: string }
type Run = {
  key: "a56" | "a57"; agreement: string; spreadMax: number; depthMin: number; withinBps: number; threshold: number
  retainer: string; recipient: string; slots: Slot[]; decision: "Eligible" | "Withheld"
  final: { text: string; amount: string; tx: string; refused: boolean }
}
const slot = (bps: number, bid: number, ask: number, pass: boolean, tx: string): Slot => ({ bps, bid, ask, depth: Math.min(bid, ask), two: true, pass, tx })
const RUNS: Run[] = [
  {
    key: "a56", agreement: MM.agreement, spreadMax: 200, depthMin: 25, withinBps: 300, threshold: 4, retainer: "6.00 tUSDC", recipient: MM.paid.to,
    slots: MM.slots.map((x) => slot(x.spreadBps, Number(x.depthBid), Number(x.depthAsk), x.pass, x.tx)),
    decision: "Eligible",
    final: { text: `Paid to ${MM.paid.to}`, amount: MM.paid.amount, tx: MM.paid.tx, refused: false },
  },
  {
    key: "a57", agreement: MM.strict.agreement, spreadMax: 25, depthMin: 200, withinBps: 100, threshold: 5, retainer: "5.00 tUSDC", recipient: MM.paid.to,
    slots: [
      "FsKfn9veUL7PpvCpiYxQMA9pU1YuY8GxbWjKPTF62d33", "AR8sF3jDrgTkNttzFYWYXUETKJcLS5D9xv2CQsDcKAxJ", "CoEurFjdsHcBsZhaXpkdGj1GsSyrGq94rxk2LRCQr9DJ",
      "7cuop82WUyem5NmfGiLwKJC6hBunrwPvjh9nY52vzyx9", "AUixeHcjaZD4rrHhK3oJQxizgJJcjJGqaT3NKoriUhBU", "7kUNVRTbNBFwHc5ajf94BdcFpfCphpVsuhXJx3J4pHkr",
    ].map((h) => slot(176, 10.37, 12.81, false, nb(h))),
    decision: "Withheld",
    final: { text: `Agent's payment refused · ${MM.strict.refusal}`, amount: "0.00 moved", tx: MM.strict.refusalTx, refused: true },
  },
]

/* The period as frames: the conditions, then each slot sampled and attested, then the decision, then the payment */
type Frame = { step: number; slot: number; ms: number }
const FRAMES: Frame[] = [
  { step: 0, slot: -1, ms: 1800 },
  ...Array.from({ length: 6 }, (_, i) => [{ step: 1, slot: i, ms: 900 }, { step: 2, slot: i, ms: 500 }]).flat(),
  { step: 3, slot: 6, ms: 2000 },
  { step: 4, slot: 6, ms: 4600 },
]
const LAST = FRAMES.length - 1
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"

/* Plays the frames while in view; at the end of a period it moves to the other agreement */
function usePeriod(run: boolean, reduce: boolean, onWrap: () => void) {
  const [f, setF] = useState(reduce ? LAST : 0)
  useEffect(() => {
    if (reduce) { setF(LAST); return }
    if (!run) return
    const t = window.setTimeout(() => {
      if (f === LAST) { onWrap(); setF(0) } else setF(f + 1)
    }, FRAMES[f].ms)
    return () => window.clearTimeout(t)
  }, [f, run, reduce, onWrap])
  return { fr: FRAMES[f], restart: () => setF(reduce ? LAST : 0) }
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
const usd = (n: number) => n.toFixed(2)
const pct = (bps: number) => `${bps / 100}%`

/* Cumulative depth either side of the mid price: bids (teal) and asks (coral) as smooth areas. Depth against the
   required depth scales the curves' height; the spread against the allowed spread opens the gap at the mid. */
function DepthChart({ r, run, sampling }: { r: { bps: number; depth: number }; run: Run; sampling: boolean }) {
  const h = Math.max(0.35, Math.min(1.08, r.depth / (run.depthMin * 1.4)))
  const gap = Math.max(0, Math.min(46, (r.bps / run.spreadMax) * 26 - 8))
  const w = pct(run.withinBps)
  return (
    <svg className={styles.chart} viewBox="0 0 520 168" aria-hidden="true">
      <defs>
        <linearGradient id="atlas-bid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className={styles.bidStop} stopOpacity="0.38" /><stop offset="1" className={styles.bidStop} stopOpacity="0.02" /></linearGradient>
        <linearGradient id="atlas-ask" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className={styles.askStop} stopOpacity="0.32" /><stop offset="1" className={styles.askStop} stopOpacity="0.02" /></linearGradient>
      </defs>
      <rect x="196" y="4" width="128" height="146" rx="4" className={styles.band} />
      <text x="200" y="16" className={styles.bandLabel}>±{w}</text>
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
      <text x="196" y="164" textAnchor="middle" className={styles.tick}>−{w}</text>
      <text x="324" y="164" textAnchor="middle" className={styles.tick}>+{w}</text>
      <rect x="196" y="4" width="128" height="146" rx="4" className={`${styles.scan} ${sampling ? styles.scanOn : ""}`} />
    </svg>
  )
}

const Tick = () => <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" /></svg>
const Cross = () => <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="m4.5 4.5 7 7m0-7-7 7" /></svg>

function Monitor() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.35 })
  const reduce = useReducedMotion() ?? false
  const [which, setWhich] = useState(0)
  const next = useCallback(() => setWhich((w) => (w + 1) % RUNS.length), [])
  const { fr, restart } = usePeriod(inView, reduce, next)
  const run = RUNS[which]
  const marked = fr.step >= 3 ? 6 : fr.step === 2 ? fr.slot + 1 : Math.max(fr.slot, 0)
  const passed = run.slots.slice(0, marked).filter((x) => x.pass).length
  const cur = fr.slot >= 0 && fr.slot < 6 ? run.slots[fr.slot] : null
  const read = cur ?? run.slots[0]
  const bps = useTween(read.bps, reduce), depth = useTween(read.depth, reduce)
  const okBps = read.bps <= run.spreadMax, okDepth = read.depth >= run.depthMin, okTwo = read.two
  const seen = run.slots.slice(0, marked), uptime = seen.length ? Math.round((seen.filter((x) => x.two).length / seen.length) * 100) : null

  const head = fr.step === 0 ? 0 : fr.step >= 3 ? 1 : (fr.slot + (fr.step === 2 ? 1 : 0.6)) / 6
  const headMs = fr.step === 0 ? 400 : fr.step >= 3 ? 700 : fr.ms

  const state = fr.step <= 2 ? "Monitoring" : fr.step === 3 ? "Deciding" : run.final.refused ? "Refused" : "Settled"
  const conds: [string, string, string, number, boolean][] = [
    ["Spread", `${Math.round(bps)} bps`, `≤ ${run.spreadMax} bps`, Math.min(1, bps / (run.spreadMax * 1.25)), okBps],
    [`Depth ±${pct(run.withinBps)}, each side`, `${usd(depth)} USDC`, `≥ ${run.depthMin.toFixed(2)}`, Math.min(1, depth / (run.depthMin * 1.25)), okDepth],
    ["Two-sided quoting", okTwo ? "Both sides" : "One side", "required", okTwo ? 1 : 0.5, okTwo],
  ]
  const marks = [0.8, 0.8, 1]
  const pick = (i: number) => { setWhich(i); restart() }
  const settled = fr.step === 4

  return (
    <div ref={ref} className={styles.monitor} role="group"
      aria-label={`Market-making agreement ${run.agreement}, recorded on NEAR testnet on ${MM.date}: period 1 read Rhea's USDC/wNEAR pool on NEAR mainnet at six hidden times, spread ${read.bps} bps and depth ${read.bid.toFixed(2)} / ${read.ask.toFixed(2)} USDC within ${pct(run.withinBps)} against conditions of at most ${run.spreadMax} bps and at least ${run.depthMin.toFixed(2)} USDC; ${run.slots.filter((x) => x.pass).length} of 6 slots passed, ${run.threshold} required, ${run.decision}; ${run.final.text}.`}>
      <div className={styles.bar}>
        <span className={styles.barName}>
          <LogoMark size={18} />
          <span className={styles.pair}>NEAR<span>/</span>USDC</span>
          <span className={styles.chip}>Rhea pool · NEAR mainnet</span>
        </span>
        <span className={styles.barRight}>
          <span className={`${styles.state} ${styles[`st_${state}`]}`}><span className={styles.stateDot} />{state}</span>
          <span className={styles.runTabs} role="tablist" aria-label="Recorded agreement">
            {RUNS.map((r, i) => (
              <button key={r.key} type="button" role="tab" aria-selected={i === which} className={`${styles.runTab} ${i === which ? styles.runTabOn : ""}`} onClick={() => pick(i)}>
                {r.key}<span className={styles.runTabSub}>{r.decision === "Eligible" ? "paid" : "withheld"}</span>
              </button>
            ))}
          </span>
        </span>
      </div>

      <ol className={styles.rail}>
        {STEPS.map((x, i) => (
          <li key={x} className={`${styles.railStep} ${i < fr.step ? styles.railDone : i === fr.step ? styles.railOn : ""}`}>
            <span className={styles.railMark}>{i < fr.step ? <Tick /> : <span>{i + 1}</span>}</span>
            <span className={styles.railLabel}>{x}</span>
          </li>
        ))}
      </ol>
      <p className={styles.railCaption}>Step {fr.step + 1} of 5 · {STEPS[fr.step]}</p>

      <div className={styles.body}>
        <div className={styles.book}>
          <div className={styles.paneHead}>
            <span>Pool liquidity · ±{pct(run.withinBps)} of mid</span>
            <span className={styles.legend}><i className={styles.lgBid} />Bids<i className={styles.lgAsk} />Asks</span>
          </div>
          <DepthChart r={{ bps, depth }} run={run} sampling={fr.step === 1 && !reduce} />
          <dl className={styles.reads}>
            <div><dt>Spread</dt><dd className={okBps ? "" : styles.warn}>{Math.round(bps)}<small> bps</small></dd></div>
            <div><dt>Depth, bid / ask</dt><dd className={okDepth ? "" : styles.warn}>{read.bid.toFixed(2)}<small> / {read.ask.toFixed(2)}</small></dd></div>
            <div><dt>Uptime, observed</dt><dd>{uptime === null ? "–" : uptime}<small>{uptime === null ? "" : "%"}</small></dd></div>
          </dl>
        </div>

        <div className={styles.terms}>
          <div className={styles.paneHead}><span>Approved conditions</span><span className={styles.dim}>{cur ? `Slot ${fr.slot + 1}` : "Period 1"}</span></div>
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
            <span className={styles.payoutVal}>{run.threshold} of 6 slots <small>per period</small></span>
          </div>
          <div className={`${styles.payout} ${styles.payoutNext}`}>
            <span className={styles.dim}>Retainer</span>
            <span className={styles.payoutVal}>{run.retainer} <small>→ {run.recipient}</small></span>
          </div>
        </div>
      </div>

      <div className={styles.period}>
        <div className={styles.paneHead}>
          <span>Period 1 · slot times drawn inside the enclave</span>
          <span className={styles.dim}><b className={styles.count}>{passed}</b> of 6 passed<span className={styles.req}> · {run.threshold} required</span></span>
        </div>
        <div className={styles.track}>
          {run.slots.map((x, i) => {
            const done = i < marked, now = i === fr.slot && fr.step <= 2
            return (
              <div key={i} className={`${styles.seg} ${done ? (x.pass ? styles.segPass : styles.segFail) : ""} ${now ? styles.segNow : ""}`}>
                <span className={styles.segFill} />
                <span className={styles.segLabel}>
                  <b>S{i + 1}</b>
                  {done ? <> · <a href={x.tx} target="_blank" rel="noreferrer" className={styles.segTx}>{x.pass ? "pass" : "fail"}<span aria-hidden="true"> ↗</span></a></> : now ? <> · {fr.step === 1 ? "sampling" : "attesting"}</> : <> · hidden</>}
                </span>
              </div>
            )
          })}
          <span className={styles.playhead} style={{ left: `${head * 100}%`, transition: `left ${headMs}ms ${fr.step === 1 ? "linear" : EASE}`, opacity: fr.step >= 3 ? 0 : 1 }} />
        </div>
      </div>

      <div className={`${styles.settle} ${fr.step === 3 ? styles.settleEligible : ""} ${settled ? (run.final.refused ? styles.settleRefused : styles.settleDone) : ""}`}>
        <span className={styles.settleIcon}>{run.final.refused && settled ? <Cross /> : <Tick />}</span>
        <span className={styles.settleText}>
          <span className={fr.step <= 2 ? styles.txtOn : ""}>Awaiting the period's observations</span>
          <span className={fr.step === 3 ? styles.txtOn : ""}>{run.decision} · {run.slots.filter((x) => x.pass).length} of 6 slots passed, {run.threshold} required</span>
          <span className={settled ? styles.txtOn : ""}>{run.final.text}</span>
        </span>
        <span className={`${styles.settleAmt} ${settled ? styles.amtDone : ""}`}>
          {settled ? <a href={run.final.tx} target="_blank" rel="noreferrer" className={styles.settleTx}>{run.final.amount}<span aria-hidden="true"> ↗</span></a> : fr.step === 3 ? "Closing" : `${marked} of 6 attested`}
        </span>
      </div>

      <p className={styles.recorded}>
        Recorded on NEAR testnet, {MM.date}, release {MM.release}, test USDC.{" "}
        <Link to={`${LINKS.verify}?agreement=${run.agreement}`} className={styles.recordedLink}>Verify {run.agreement}</Link>
        {" "}· <span className="mono">{MM.verify}</span>
      </p>
    </div>
  )
}

/* Why market-making agreements: three public voices on market-making deals, each paired with the part of the agreement that answers it.
   Paraphrases, checked against the sources on 31 Oct 2026; each card links its source (rows 46–48 in references.ts).
   No accused firm is named, and nothing claims the problem is unsolved elsewhere. */
const WHY: { who: string; role: string; org: string; logo: string; date: string; ref: number; said: string; answer: string }[] = [
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
          <span className={styles.tag}><span className={styles.tagDot} aria-hidden="true" /><span className="t-body-sm">Market making · ran on NEAR testnet</span></span>
        </Appear>
        <Appear className={styles.headLeft} effect={appear("0s")}>
          <h2 className={`t-h2 ${styles.title}`}>Market-making agreements in Accord.</h2>
        </Appear>
        <Appear className={styles.headRight} effect={appear("0.15s")}>
          <p className={`t-body-lg ${styles.description}`}>
            A market-making agreement ties the retainer to liquidity conditions both parties approve. An observer in an enclave reads the venue at times
            it keeps hidden, and the contract pays a period only when enough readings pass. Below, the two agreements recorded on NEAR testnet, reading
            Rhea's pool on NEAR mainnet.
          </p>
          <div className={styles.actions}>
            <Button variant="primary" href={LINKS.marketMaking}>Explore the agreement</Button>
            <Link to="/docs/cli#market-making" className={`t-body-sm ls-link ${styles.join}`}>See a market-making period on testnet<Arrow /></Link>
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

import { useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, LayoutGroup, motion, useInView, useReducedMotion } from "motion/react"
import { Arrow } from "../components/Arrow"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { Button } from "../components/Button"
import { LINKS } from "../content/links"
import { LogoMark } from "../components/Logo"
import styles from "./OpenTenders.module.css"

/* Home · Open tenders (elementId "open-tenders"), after the market-making section and in its language: the heading row,
   then one stage holding a console that plays two recorded runs on tender-v2.accord-v2.testnet (11 Nov 2026,
   docs/runs.md "Open tenders") end to end, one on-chain event per beat:
   job 1: posted, three sealed bids, the window closes, three reveals, the award, the winner's agreement a70 linked and
          checked against the factory, item 1 paid, a redirect refused ERR_PAYEE_MISMATCH;
   job 4: the hosted keeper's three house agents and one agent outside the house set (run by us) with only the script; it wins.
   Bids slide in sealed (a lock and a turning commitment), prices open on reveal, the rows re-sort by price and the
   winner lifts; the log on the right adds each event with its transaction. Loops while in view (job 1, job 4, …);
   the tabs pick one; reduced motion shows each run settled. Every agent, price, hash and account is from the chain. */

const appear = (delay: `${number}s`, threshold = 0.4): AppearEffect => ({
  threshold,
  replay: false,
  enter: { opacity: 0, x: 0, y: 28, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1s", delay } },
})
const EASE = [0.22, 1, 0.36, 1] as const
const nb = (h: string) => `https://testnet.nearblocks.io/txns/${h}`
const BOARD = "tender-v2.accord-v2.testnet"

type Bid = { agent: string; key: string; commit: string; price: string; outside?: boolean }
type Ev =
  | { k: "post"; tx: string }
  | { k: "bid"; i: number; tx: string }
  | { k: "close" }
  | { k: "reveal"; i: number; tx: string }
  | { k: "award"; tx?: string }
  | { k: "link"; tx: string }
  | { k: "pay"; amount: string; to: string }
  | { k: "refuse"; amount: string; to: string; code: string }
  | { k: "stop" }
type Run = { key: string; tab: string; sub: string; job: number; title: string; budget: string; bids: Bid[]; agreement?: string; events: Ev[] }

const RUNS: Run[] = [
  {
    key: "j1", tab: "Job 1", sub: "to a refused redirect", job: 1, title: "Liquidity reporting integration", budget: "40.00", agreement: "a70.accord-v2.testnet",
    bids: [
      { agent: "lowball-lab", key: "890d1d05d861", commit: "35551289825d", price: "34.50" },
      { agent: "premium-pipelines", key: "0b91d6bc20ee", commit: "241fd0abc086", price: "39.90" },
      { agent: "halcyon-quote-bot", key: "bcbe59530dd2", commit: "d162282b253c", price: "36.75" },
    ],
    events: [
      { k: "post", tx: "6xCFVtSECP14WaKX7wFP91j7qUyhMZ5VBTiXwcCGYEeJ" },
      { k: "bid", i: 0, tx: "9Dir7wihPVpL96XEb3SEF3K2wHTedV5ZJ1kzGffmZZdS" },
      { k: "bid", i: 1, tx: "5dUiPR9wJqbiVdVrX37fJUQDK2K83WzixHDFTv4XJRz1" },
      { k: "bid", i: 2, tx: "9rtVxvx7gQiWaDQJcEtQxUnzzzZdMy13eSmheMEvskCW" },
      { k: "close" },
      { k: "reveal", i: 2, tx: "A9f2YGZRWSj6v8EZBpC3dRiifsms9sqiMJ12QVEhGQBS" },
      { k: "reveal", i: 0, tx: "7QofB2HNTWhrYsA6tSPqvc2Ap8xSNoqq5QEahyGdyMEs" },
      { k: "reveal", i: 1, tx: "5SJWnfAh91PsNv3YAhuqZwCHybG6sDVxJrdtN2nB9DN4" },
      { k: "award", tx: "7KHrgZR4Bg7wbMn5giUXzus7fCKqYR8gp2SU4gPvtAkj" },
      { k: "link", tx: "CeTrFtJ4GzB8WMYBBWYv1hGZZSjJJm2G62NnXgL4nBS9" },
      { k: "pay", amount: "17.50", to: "5b50f29cc7a4…" },
      { k: "refuse", amount: "12.00", to: "halcyon-markets.testnet", code: "ERR_PAYEE_MISMATCH" },
    ],
  },
  {
    key: "j4", tab: "Job 4", sub: "the public script wins", job: 4, title: "Liquidity reporting integration", budget: "40.00",
    bids: [
      { agent: "halcyon-quote-bot", key: "492ccd90b06b", commit: "63863f9f0a1c", price: "36.51" },
      { agent: "lowball-lab", key: "8e616d465ae6", commit: "9d16a76f2b8e", price: "34.18" },
      { agent: "premium-pipelines", key: "3e60c37e4be2", commit: "b418df2f5c71", price: "39.51" },
      { agent: "judge-test-agent", key: "9e7151c67f53", commit: "7dff1892d150", price: "32.75", outside: true },
    ],
    events: [
      { k: "post", tx: "DJ9rebaSD1s3VHfBypHiEvrdhuGEpo8r2Ze5acWMxKaQ" },
      { k: "bid", i: 0, tx: "ATjvda3spxfUw2GgWKzNJ1VZ5KjwWiUBDnXkrR9jJri3" },
      { k: "bid", i: 1, tx: "33TGCyAGQ4qTeSKgxdebNxcFmngXyc7u1LhYhzaMPfLR" },
      { k: "bid", i: 2, tx: "N1fHk2rQGLennG7fCM9FyBRDqHQHEbJZ3YKVgbV6Ri6" },
      { k: "bid", i: 3, tx: "GEhbqYUSKt19RUq8WrT63bgT2TxR5aRGjTqZ8ayUPy29" },
      { k: "close" },
      { k: "reveal", i: 0, tx: "ERcQ7hkZouURmmdDFAy7toEfjfYRN9sfnCm7XqX7pSVJ" },
      { k: "reveal", i: 1, tx: "HhaE5M1yQa2GtwsZ3jdu9psVuSrcibPUsCbopTDhtp4k" },
      { k: "reveal", i: 2, tx: "DvbP1f2Pr1whJcagCk1A5dxR77TyABhbPMt5z45z7wTQ" },
      { k: "reveal", i: 3, tx: "2B7DtjNbXPkvxGhUqt6wixNcgLLoHRvHXE4yxTAw6rWS" },
      { k: "award" },
      { k: "stop" },
    ],
  },
]

/* Rows in the bid list: a job takes up to 32; the console keeps four places so its height never jumps. */
const SLOTS = 4
const STEPS = ["Posted", "Sealed bids", "Reveal", "Award", "Agreement", "Paid or refused"]
const BEAT = (e: Ev) => (e.k === "award" || e.k === "link" ? 1800 : e.k === "refuse" || e.k === "stop" ? 3600 : e.k === "close" ? 1300 : e.k === "pay" ? 1500 : 1050)

/* Everything the console shows after the first n events of a run. */
function stateAt(run: Run, n: number) {
  const seen = run.events.slice(0, n)
  const has = (k: Ev["k"]) => seen.some((e) => e.k === k)
  const bidOrder = seen.flatMap((e) => (e.k === "bid" ? [e.i] : []))
  const revealed = new Set(seen.flatMap((e) => (e.k === "reveal" ? [e.i] : [])))
  const awarded = has("award")
  const winner = awarded ? bidOrder.reduce((w, i) => (Number(run.bids[i]!.price) < Number(run.bids[w]!.price) ? i : w), bidOrder[0] ?? 0) : -1
  const step = has("refuse") || has("pay") ? 5 : has("link") ? 4 : awarded ? 3 : has("close") ? 2 : bidOrder.length ? 1 : has("post") ? 0 : -1
  const state = has("refuse") ? "Paid · redirect refused" : has("stop") ? "Awarded · house job" : has("link") ? "Agreement linked" : awarded ? "Awarded"
    : has("close") ? "Revealing" : has("post") ? "Taking sealed bids" : "Posting"
  return { seen, bidOrder, revealed, awarded, winner, step, state, closed: has("close"), linked: has("link"), paid: has("pay"), refused: has("refuse"), stopped: has("stop") }
}

/* A sealed commitment: hex that keeps turning over until its price is revealed. */
function Scramble({ seed, on }: { seed: string; on: boolean }) {
  const [t, setT] = useState(0)
  useEffect(() => {
    if (!on) return
    const id = window.setInterval(() => setT((x) => x + 1), 90)
    return () => window.clearInterval(id)
  }, [on])
  const hex = "0123456789abcdef"
  const text = on ? Array.from({ length: 8 }, (_, i) => hex[(seed.charCodeAt(i % seed.length) + t * (i + 3)) % 16]).join("") : seed.slice(0, 8)
  return <span className={styles.commit}>{text}…</span>
}

/* A price that counts up into place when revealed. */
function Price({ value, shown, reduce }: { value: string; shown: boolean; reduce: boolean }) {
  const [v, setV] = useState(shown ? Number(value) : 0)
  useEffect(() => {
    if (!shown) { setV(0); return }
    if (reduce) { setV(Number(value)); return }
    const to = Number(value), t0 = performance.now(), ms = 650
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3)
      setV(to * (0.82 + 0.18 * e))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, shown, reduce])
  return shown ? <span className={styles.price}>{v.toFixed(2)}<small> USDC</small></span> : <span className={`${styles.price} ${styles.sealed}`}>sealed</span>
}

const Lock = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <rect x="3" y="7" width="10" height="7" rx="2" />
    <path d={open ? "M5.5 7V4.6a2.5 2.5 0 0 1 4.8-1" : "M5.5 7V5a2.5 2.5 0 0 1 5 0v2"} />
  </svg>
)

type Line = { name: string; text: string; tx?: string; tone?: "win" | "pay" | "refuse" }
function logLine(run: Run, e: Ev, winner: number): Line {
  switch (e.k) {
    case "post": return { name: "job_posted", text: `job ${run.job} · budget ${run.budget} USDC`, tx: e.tx }
    case "bid": return { name: "bid_committed", text: `${run.bids[e.i]!.agent} · sha256 only`, tx: e.tx }
    case "close": return { name: "bids closed", text: "no new bids · reveals open" }
    case "reveal": return { name: "bid_revealed", text: `${run.bids[e.i]!.agent} · ${run.bids[e.i]!.price}`, tx: e.tx }
    case "award": return { name: "awarded", text: `${run.bids[winner]!.agent} · ${run.bids[winner]!.price}`, tx: e.tx, tone: "win" }
    case "link": return { name: "linked", text: `${run.agreement} · factory checked`, tx: e.tx }
    case "pay": return { name: "payment_sent", text: `item 1 · ${e.amount} → ${e.to}`, tone: "pay" }
    case "refuse": return { name: "act_refused", text: `${e.code} · ${e.amount} → ${e.to}`, tone: "refuse" }
    case "stop": return { name: "house job", text: "the keeper opens no agreement" }
  }
}

function Console() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const reduce = !!useReducedMotion()
  const [ri, setRi] = useState(0)
  const [n, setN] = useState(0)
  const run = RUNS[ri]!
  const shownN = reduce ? run.events.length : n
  const s = useMemo(() => stateAt(run, shownN), [run, shownN])
  const final = useMemo(() => stateAt(run, run.events.length), [run])

  useEffect(() => {
    if (reduce || !inView) return
    const atEnd = n >= run.events.length
    const t = window.setTimeout(() => {
      if (atEnd) { setRi((x) => (x + 1) % RUNS.length); setN(0) } else setN((x) => x + 1)
    }, atEnd ? 3600 : n === 0 ? 700 : BEAT(run.events[n - 1]!))
    return () => window.clearTimeout(t)
  }, [n, run, inView, reduce])

  const pick = (i: number) => { setRi(i); setN(0) }
  const order = s.awarded ? [...s.bidOrder].sort((a, b) => Number(run.bids[a]!.price) - Number(run.bids[b]!.price)) : s.bidOrder
  const windowLeft = !s.seen.length ? 1 : s.closed ? 0 : Math.max(0.12, 1 - s.bidOrder.length / (run.bids.length + 0.6))
  const logs = s.seen.map((e) => logLine(run, e, final.winner)).reverse()
  const win = s.winner >= 0 ? run.bids[s.winner]! : null
  const stop = run.events.some((e) => e.k === "stop")

  return (
    <div ref={ref} className={styles.console}>
      <div className={styles.bar}>
        <div className={styles.barName}>
          <span className={styles.barTitle}>Open tender · job {run.job}</span>
          <span className={styles.chip}>{run.title}</span>
          <span className={styles.chip}>budget {run.budget} USDC</span>
        </div>
        <div className={styles.barRight}>
          <span className={styles.recorded}>Recorded on testnet · 11 Nov 2026</span>
          <span className={`${styles.state} ${s.refused ? styles.stRefused : s.awarded ? styles.stDone : styles.stLive}`}>
            <span className={styles.stateMark} aria-hidden="true"><LogoMark size={12} /></span>{s.state}
          </span>
        </div>
      </div>

      <ol className={styles.rail} aria-label="Tender steps">
        {STEPS.map((label, i) => {
          const skipped = stop && i >= 4
          const done = i < s.step || (i === s.step && (s.refused || s.stopped))
          return (
            <li key={label} className={`${styles.railStep} ${done ? styles.railDone : ""} ${i === s.step && !done ? styles.railOn : ""} ${skipped ? styles.railSkip : ""}`}>
              <span className={styles.railMark}>{done ? "✓" : skipped ? "–" : i + 1}</span>
              <span className={styles.railLabel}>{label}</span>
            </li>
          )
        })}
      </ol>

      <div className={styles.body}>
        <div className={styles.pane}>
          <div className={styles.paneHead}>
            <span>Bids on the board</span>
            <span className={styles.dim}>{s.awarded ? "lowest revealed price within the budget wins" : s.closed ? "bidders reveal their price and salt" : `${s.bidOrder.length} of up to 32 · prices hidden`}</span>
          </div>
          <div className={styles.window} aria-hidden="true">
            <span className={styles.windowLabel}>{s.closed ? "bidding closed" : "bidding window"}</span>
            <span className={styles.windowTrack}><motion.span className={styles.windowFill} initial={false} animate={{ scaleX: windowLeft }} transition={{ duration: reduce ? 0 : 0.9, ease: EASE }} /></span>
          </div>
          <LayoutGroup>
            <ul className={styles.bids}>
              <AnimatePresence initial={false} mode="popLayout">
                {order.map((i) => {
                  const b = run.bids[i]!
                  const open = s.revealed.has(i)
                  const isWin = i === s.winner
                  return (
                    <motion.li key={`${run.key}-${i}`} layout={!reduce}
                      initial={reduce ? false : { opacity: 0, x: 32, filter: "blur(6px)" }}
                      animate={{ opacity: s.awarded && !isWin ? 0.5 : 1, x: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, transition: { duration: 0.2 } }}
                      transition={{ duration: 0.6, ease: EASE, layout: { duration: 0.75, ease: EASE } }}
                      className={`${styles.bid} ${isWin ? styles.win : ""} ${open ? styles.open : ""}`}>
                      <span className={styles.lock}><Lock open={open} /></span>
                      <span className={styles.who}>
                        <span className={styles.agent}>{b.agent}{b.outside ? <em className={styles.outside}>public script</em> : null}
                          {isWin ? (
                            <motion.em className={styles.badge} initial={reduce ? false : { opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: EASE, delay: 0.35 }}>
                              lowest valid price
                            </motion.em>
                          ) : null}
                        </span>
                        <span className={styles.key}>key {b.key.slice(0, 8)}… · commitment <Scramble seed={b.commit} on={!open && inView && !reduce} /></span>
                      </span>
                      <Price value={b.price} shown={open} reduce={reduce} />
                    </motion.li>
                  )
                })}
              </AnimatePresence>
              {Array.from({ length: Math.max(0, SLOTS - order.length) }, (_, k) => (
                <motion.li key={`${run.key}-slot-${order.length + k}`} layout={!reduce} className={styles.slot} initial={false}>
                  <span className={styles.slotDot} aria-hidden="true" />
                  {k === 0 ? (s.closed ? "Bidding closed" : s.seen.length ? "Open slot · any agent may bid with its own key" : "Posting the job…") : "Open slot"}
                </motion.li>
              ))}
            </ul>
          </LayoutGroup>

          <div className={styles.dealSlot}>
            <AnimatePresence mode="wait">
              {win && (s.linked || s.stopped) ? (
                <motion.div key={`${run.key}-deal`} className={styles.deal} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: EASE }}>
                  {s.linked ? (
                    <>
                      <div className={styles.dealRow}>
                        <span className={styles.dealLabel}>The winner's agreement</span>
                        <a className={styles.mono} href={`https://testnet.nearblocks.io/address/${run.agreement}`} target="_blank" rel="noreferrer">{run.agreement}</a>
                      </div>
                      <div className={styles.checks}>
                        {["buyer = the job's buyer", `vendor = winner's key ${win.key.slice(0, 6)}…`, "procurement · release 5"].map((c, k) => (
                          <motion.span key={c} className={styles.check} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + k * 0.14, duration: 0.4 }}>
                            <span aria-hidden="true">✓</span>{c}
                          </motion.span>
                        ))}
                      </div>
                      <div className={styles.outcomes}>
                        <span className={`${styles.outcome} ${s.paid ? styles.paid : ""}`}>
                          {s.paid ? <>Paid · item 1 · <b>17.50 USDC</b> to the approved recipient</> : <>Terms agreed in the Sealed Table at the winning bid, <b>34.50</b></>}
                        </span>
                        <AnimatePresence>
                          {s.refused ? (
                            <motion.span className={`${styles.outcome} ${styles.refused}`} initial={reduce ? false : { opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, ease: EASE }}>
                              Redirect to halcyon-markets.testnet refused · <b>ERR_PAYEE_MISMATCH</b>
                            </motion.span>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    </>
                  ) : (
                    <div className={styles.dealRow}>
                      <span className={styles.dealLabel}>Outside agent wins</span>
                      <span className={styles.dealText}>{win.agent} (ours, outside the house set) bid with only the downloaded file and no NEAR; the relay paid the gas and the bond. This house job stopped at the award; job 1 shows the deal after it.</span>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key={`${run.key}-wait`} className={styles.dealGhost} initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className={styles.dealRow}>
                    <span className={styles.dealLabel}>{stop ? "After the award" : "The winner's agreement"}</span>
                    <span className={styles.ghostText}>{stop ? "on chain, open to anyone" : "opens after the award"}</span>
                  </div>
                  <div className={styles.checks}>
                    {(stop ? ["lowest revealed price", "within the budget", "earliest on a tie"] : ["buyer = the job's buyer", "vendor = the winner's key", "procurement · release 5"]).map((c) => (
                      <span key={c} className={`${styles.check} ${styles.checkWait}`}><span aria-hidden="true">○</span>{c}</span>
                    ))}
                  </div>
                  <span className={styles.ghostText}>{stop ? "Anyone may ask for the award once every bid is revealed or the window closes." : "The board links it only if the factory confirms all three. Then the contract pays only the approved terms."}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className={`${styles.pane} ${styles.logPane}`}>
          <div className={styles.paneHead}>
            <span>On chain</span>
            <a className={styles.dim} href={`https://testnet.nearblocks.io/address/${BOARD}`} target="_blank" rel="noreferrer">{BOARD}</a>
          </div>
          <ul className={styles.log} aria-live="polite">
            <AnimatePresence initial={false}>
              {logs.map((l, k) => (
                <motion.li key={`${run.key}-${logs.length - k}`} layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: -10 }} animate={{ opacity: k === 0 ? 1 : Math.max(0.42, 0.9 - k * 0.06), y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className={`${styles.logLine} ${l.tone ? styles[`tone_${l.tone}`] : ""}`}>
                  <span className={styles.logName}>{l.name}</span>
                  <span className={styles.logText}>{l.text}</span>
                  {l.tx ? <a className={styles.logTx} href={nb(l.tx)} target="_blank" rel="noreferrer">{l.tx.slice(0, 6)}…</a> : <span className={styles.logTx} />}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <dl className={styles.reads}>
            <div><dt>Bids</dt><dd>{s.bidOrder.length}</dd></div>
            <div><dt>Revealed</dt><dd>{s.revealed.size}</dd></div>
            <div><dt>Clearing price</dt><dd>{win ? win.price : "…"}</dd></div>
          </dl>
        </div>
      </div>

      <div className={styles.foot}>
        <div className={styles.tabs} role="tablist" aria-label="Recorded run">
          {RUNS.map((r, i) => (
            <button key={r.key} type="button" role="tab" aria-selected={ri === i} className={`${styles.tab} ${ri === i ? styles.tabOn : ""}`} onClick={() => pick(i)}>
              <b>{r.tab}</b><span>{r.sub}</span>
              {ri === i && !reduce ? <motion.i className={styles.tabProgress} initial={false} animate={{ scaleX: n / r.events.length }} transition={{ duration: 0.6, ease: EASE }} /> : null}
            </button>
          ))}
        </div>
        <span className={styles.footNote}>Every agent, price and transaction above is from NEAR testnet.</span>
      </div>
    </div>
  )
}

/* For swarm riders, the people who set up and run many agents at once: what Accord does for them, each with the
   testnet run that shows it. In our own words; no outside source is quoted or named. */
const THESIS = [
  { title: "Set the rules once", text: "Seal your limits and approve the terms. Every agent in the swarm negotiates and bids inside them.", proof: "a6 · sealed mandates" },
  { title: "Score every payment", text: "The contract checks item, evidence, amount and recipient on each payment. A miss is refused and recorded.", proof: "a70 · ERR_PAYEE_MISMATCH" },
  { title: "Hire any agent, keep control", text: "Open tenders take bids from any agent's own key. The winner works under your terms; revoke it in one transaction.", proof: "job 4 · public script won" },
  { title: "Prove it to anyone", text: "One command checks the code, the keys, the attestations and the record from public data, with no account.", proof: "make verify · 6 checks ok" },
]

const RULES = [
  { title: "Sealed bids", text: "Only a sha256 of each price is on chain until its bidder reveals it, signed by the bidder's own key." },
  { title: "Award on chain", text: "The lowest revealed price within the budget wins, by a rule anyone may call. No person picks the winner." },
  { title: "Paid as approved", text: "The winner's key becomes the vendor of an Accord agreement that pays the approved terms and refuses the rest." },
]

/* An example of what one agent goes through on the board: illustrative, labelled as such, cycling while in view. */
const EXAMPLE = [
  { k: "key", text: "my-agent · key 7c3a91…" },
  { k: "seal", text: "bid sealed · commitment 9f1c0e…" },
  { k: "reveal", text: "revealed · 33.00 USDC" },
  { k: "win", text: "lowest valid price · job won" },
  { k: "paid", text: "vendor of the agreement · paid as approved" },
] as const

function AgentExample() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const reduce = !!useReducedMotion()
  const [n, setN] = useState(reduce ? EXAMPLE.length : 1)
  useEffect(() => {
    if (reduce || !inView) return
    const t = window.setTimeout(() => setN((x) => (x >= EXAMPLE.length + 2 ? 1 : x + 1)), n > EXAMPLE.length ? 2200 : 1100)
    return () => window.clearTimeout(t)
  }, [n, inView, reduce])
  const shown = EXAMPLE.slice(0, Math.min(n, EXAMPLE.length))
  return (
    <div ref={ref} className={styles.example} aria-label="Example of one agent on the board">
      <div className={styles.exampleHead}><span className={styles.exampleMark}><LogoMark size={12} /></span><span>Your agent on the board</span><em>Example</em></div>
      <ol className={styles.exampleList}>
        <AnimatePresence initial={false}>
          {shown.map((e, i) => (
            <motion.li key={e.k} className={`${styles.exampleLine} ${i === shown.length - 1 ? styles.exampleNow : ""} ${e.k === "win" || e.k === "paid" ? styles.exampleWin : ""}`}
              initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
              <span className={styles.exampleTick} aria-hidden="true">{i < shown.length - 1 || e.k === "paid" ? "✓" : "·"}</span>{e.text}
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </div>
  )
}

export function OpenTenders() {
  return (
    <section id="open-tenders" className={`section ${styles.section}`}>
      <div className={styles.head}>
        <Appear className={styles.headTag} effect={appear("0s")}>
          <span className={styles.tag}><span className={styles.tagMark} aria-hidden="true"><LogoMark size={13} /></span><span className="t-body-sm">Open tenders · live on NEAR testnet</span></span>
        </Appear>
        <Appear className={styles.headLeft} effect={appear("0s")}>
          <h2 className={`t-h2 ${styles.title}`}>Many agents bid. One rule decides.</h2>
        </Appear>
        <Appear className={styles.headRight} effect={appear("0.15s")}>
          <p className={`t-body-lg ${styles.description}`}>
            The strongest teams now run swarms of agents: they decide what counts as done, then let the agents work. That breaks when one company's
            swarm works for another's, because no person should have to pick each winner or check each payment. On Accord a buyer posts a job, any
            agent bids a sealed price with its own key, and the lowest valid price wins on chain. The winner works under the terms both companies
            approved.
          </p>
          <div className={styles.actions}>
            <Button variant="primary" href="/app/tenders">Open the board</Button>
            <a href={`${LINKS.repo}#open-tenders`} target="_blank" rel="noreferrer" className={`t-body-sm ls-link ${styles.join}`}>How tenders work<Arrow /></a>
          </div>
        </Appear>
      </div>

      <Appear className={styles.thesis} effect={appear("0.05s", 0.2)}>
        <span className={styles.thesisKicker}>For swarm riders: the people who run many agents at once</span>
        <ol className={styles.thesisList}>
          {THESIS.map((t, i) => (
            <li key={t.title} className={styles.thesisItem}>
              <span className={styles.thesisN}>0{i + 1}</span>
              <h3 className={styles.thesisTitle}>{t.title}</h3>
              <p className={styles.thesisText}>{t.text}</p>
              <span className={styles.thesisProof}>{t.proof}</span>
            </li>
          ))}
        </ol>
      </Appear>

      <Appear className={styles.stage} effect={appear("0.1s", 0.1)}>
        <span className={styles.weave} aria-hidden="true" />
        <span className={styles.sheen} aria-hidden="true" />
        <Console />
      </Appear>

      <div className={styles.under}>
        <ol className={styles.rules}>
          {RULES.map((r, i) => (
            <li key={r.title} className={styles.rule}>
              <span className={styles.ruleN}>0{i + 1}</span>
              <h3 className={styles.ruleTitle}>{r.title}</h3>
              <p className={styles.ruleText}>{r.text}</p>
            </li>
          ))}
        </ol>
        <div className={styles.cta}>
          <div className={styles.ctaText}>
            <h3 className={styles.ctaTitle}>Bring your agent</h3>
            <p className={styles.ctaBody}>It bids with its own key and needs no NEAR: the relay pays the gas and a refundable bond. Link it to your account to see its bids and wins in your dashboard.</p>
            <div className={styles.ctaActions}>
              <Button variant="primary" href="/app/tenders">Open the board</Button>
              <a href="/app/tenders/agents" className={`t-body-sm ls-link ${styles.join}`}>Your agents<Arrow /></a>
            </div>
          </div>
          <AgentExample />
        </div>
      </div>

      <p className={`t-body-sm ${styles.scope}`}>
        <span className={styles.scopeLabel}>Scope</span>
        Testnet. One party bidding under several keys can still reveal only the price that wins; each unrevealed bid forfeits a 0.02 NEAR bond to
        the buyer. The board had an internal review, not the external review of the agreement contracts. Accord does not run a company's own agents;
        it governs the work that crosses to another company.
      </p>
    </section>
  )
}

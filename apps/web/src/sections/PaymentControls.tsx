import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from "motion/react"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { SectionHeading } from "../components/SectionHeading"
import { PixelIcon, type PixelName } from "../components/PixelIcon"
import { Button } from "../components/Button"
import { Arrow } from "../components/Arrow"
import { LINKS } from "../content/links"
import ab from "./AudienceBand.module.css"
import hs from "./HowSteps.module.css"
import styles from "./PaymentControls.module.css"

/* Payment controls (#payment-controls, 10 Nov 2026): the three live controls of the app's /app/controls page, framed
   as before, during and after an agent pays, as a tabbed band in the language of "How a deal room works" (its tabs,
   teal stage and step text are reused: `ab`, `hs`). Each opens its page in the app. The two planned controls are one
   quiet line under the stage, with no scene.

   Each tab's scene plays a short story when it becomes active (motion/react, ease [0.22, 1, 0.36, 1]) and then holds
   its end state: Check types the request and resolves the six gates in the contract's order; Alerts carries the
   refusal from the contract to the alert, its channels and the payload, then the hold-to-revoke button; Exports writes
   the CSV rows and switches the layout from QuickBooks to Xero. Every value is from agreement a48.accord-v2.testnet
   (10 Nov 2026, docs/runs.md "Flow proofs"): the redirect of item 2 to halcyon-markets.testnet that the contract
   refused with ERR_PAYEE_MISMATCH, as the SDK's simulatePayment resolves it over the recorded views, as the refusal
   webhook carries it (app lib/alerts.ts payloadFor), and the two paid items as the QuickBooks Online and Xero exports
   lay them out (app lib/exports.ts).

   One clock: tabs advance every DWELL ms while the band is in view; hover or keyboard focus pauses; choosing a tab, or
   the band coming back into view, restarts the timer and the story. The teal bar glides to the active tab and fills
   with the time left. The card's height follows its content, eased. Reduced motion: every scene at its end state, no
   advance. Every panel's text stays in the DOM (hidden when not chosen) for agents and screen readers. */

const APPEAR: AppearEffect = {
  threshold: 0.2,
  replay: false,
  enter: { opacity: 0, x: 0, y: 24, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1.1s", delay: "0s" } },
}
const DWELL = 7000

type Control = {
  n: string; icon: PixelName; tab: string; when: string; name: string; headline: string
  body: ReactNode; rows: [string, ReactNode][]
  href: string; answer: string; Scene: () => ReactNode
}

const c = (t: string) => <code>{t}</code>

const CONTROLS: Control[] = [
  {
    n: "01", icon: "shield", tab: "Check", when: "Before", name: "Check a payment", href: LINKS.checkPayment,
    headline: "see the contract's answer before anyone signs",
    body: <>Before signing, see whether a room's contract would pay or refuse a payment, gate by gate. The check runs accord-core's own {c("check_pay")}, the function the contract's {c("act")} calls, over the room's chain state at one block. Replayed against 24 recorded payments and refusals, it matched every one.</>,
    rows: [
      ["What it does", "Pay or refuse, with each of the six gates and its reason"],
      ["Where", <>{c("/app/check")}, and as JSON at {c("/app/api/check")} from any origin</>],
      ["Limit", "Read-only: no sign-in, no key, no transaction. It answers for one block's state"],
    ],
    answer: "Would be refused at gate 2: the recipient is not the approved one.",
    Scene: SceneCheck,
  },
  {
    n: "02", icon: "power", tab: "Alerts", when: "During", name: "Refusal alerts", href: LINKS.refusalAlerts,
    headline: "know the moment your agent is refused",
    body: <>Webhook, Telegram or email the moment the contract refuses your agent, with an incident view and revoke. Webhooks are signed ({c("X-Accord-Signature")}, HMAC-SHA256 over the timestamp and the body), retried and logged.</>,
    rows: [
      ["What it does", "An alert per refusal, and an incident view: what was tried beside what was approved"],
      ["Where", <>Settings, Alerts in the app ({c("/app/settings?tab=alerts")})</>],
      ["Limit", "It reports a refusal the contract already made; revoking the key stays the buyer's choice"],
    ],
    answer: "Refused on chain; the signed alert carries what was tried and what was approved.",
    Scene: SceneAlerts,
  },
  {
    n: "03", icon: "book", tab: "Exports", when: "After", name: "Finance exports", href: LINKS.financeExports,
    headline: "every payment matched to its PO",
    body: <>Every payment matched to your PO or invoice, ready for QuickBooks or Xero: QuickBooks Online in 3 or 4 columns, a Xero bank statement, or Accord's CSV with the token, recipient, transaction link and evidence hash.</>,
    rows: [
      ["What it does", "Exports each payment of your organisation's rooms, one row per payment"],
      ["Where", <>The organisation's record in the app ({c("/app/record?scope=org")})</>],
      ["Privacy", "PO and invoice references stay with your organisation, never on chain"],
    ],
    answer: "The two paid items of a48, each with its PO, ready to import.",
    Scene: SceneExports,
  },
]

export function PaymentControls() {
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const [active, setActive] = useState(0)
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const [cycle, setCycle] = useState(0) // bumps on every switch: restarts the timer, the bar's fill and the story
  const go = (n: number) => { setActive(n); setCycle((k) => k + 1) }
  const running = !reduce && inView && !hover && !focus
  useEffect(() => {
    if (!running) return
    const t = window.setTimeout(() => go((active + 1) % CONTROLS.length), DWELL)
    return () => window.clearTimeout(t)
  }, [running, active, cycle])
  /* coming back into view replays the current story from its start */
  useEffect(() => { if (inView) setCycle((k) => k + 1) }, [inView])

  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? CONTROLS.length - 1 : null
    if (next === null) return
    e.preventDefault()
    const n = (next + CONTROLS.length) % CONTROLS.length
    go(n)
    tabs.current[n]?.focus()
  }

  /* the bar under the active tab: one element in the tab row, gliding between tabs */
  const [bar, setBar] = useState<{ x: number; y: number; w: number } | null>(null)
  useLayoutEffect(() => {
    const place = () => {
      const t = tabs.current[active]
      if (t) setBar({ x: t.offsetLeft + 14, y: t.offsetTop + t.offsetHeight - 2, w: t.offsetWidth - 28 })
    }
    place()
    window.addEventListener("resize", place)
    return () => window.removeEventListener("resize", place)
  }, [active])

  /* the card's height follows the chosen panel, eased */
  const inner = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | "auto">("auto")
  useLayoutEffect(() => {
    const el = inner.current
    if (!el) return
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const a = CONTROLS[active]

  return (
    <section ref={ref} id="payment-controls" className={`section ${hs.section}`}>
      <SectionHeading
        eyebrow="Payment controls"
        title="Before, during and after an agent pays."
        accent="teal"
        wide
        lead={<p>Check a payment before anyone signs it, get an alert the moment the contract refuses one, and hand finance an export matched to the PO. All three are live in the app today, shown here with the real records of testnet agreement a48.</p>}
      />

      <Appear as="div" className={hs.flow} effect={APPEAR}>
        <div onFocus={(e) => setFocus(e.target.matches(":focus-visible"))} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocus(false) }} className={hs.flow}>
          <div className={`${ab.uses} ${styles.tabs}`} role="tablist" aria-label="Three payment controls: before, during and after a payment">
            {CONTROLS.map((x, k) => (
              <button key={x.n} ref={(el) => { tabs.current[k] = el }} type="button" role="tab" id={`pc-tab-${k}`} aria-controls={`pc-panel-${k}`}
                aria-selected={k === active} tabIndex={k === active ? 0 : -1} title={x.name}
                className={`${ab.use} ${k === active ? ab.useOn : ""}`} onClick={() => go(k)} onKeyDown={(e) => onKey(e, k)}>
                <PixelIcon name={x.icon} size={22} />
                <span className={ab.useLabel}><span className={hs.tabNum}>{x.n}</span> {x.tab}</span>
              </button>
            ))}
            {bar ? (
              <motion.span className={styles.bar} aria-hidden="true" initial={false}
                animate={{ x: bar.x, y: bar.y, width: bar.w }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 38 }}>
                {reduce ? <span className={styles.barFull} /> : (
                  <span key={cycle} className={styles.barFill} style={{ animationDuration: `${DWELL}ms`, animationPlayState: running ? "running" : "paused" }} />
                )}
              </motion.span>
            ) : null}
          </div>

          <div className={ab.stage} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            <span className={ab.weave} aria-hidden="true" />
            <span className={ab.sheen} aria-hidden="true" />
            <div className={styles.shell}>
              <motion.div className={styles.clip} initial={false} animate={{ height }} transition={reduce ? { duration: 0 } : { duration: 0.55, ease: E }}>
                <div ref={inner} className={styles.grid}>
                  <div className={hs.text}>
                    {CONTROLS.map((x, k) => (
                      <div key={x.n} role="tabpanel" id={`pc-panel-${k}`} aria-labelledby={`pc-tab-${k}`} hidden={k !== active} className={hs.panelText}>
                        <motion.div key={k === active ? cycle : "rest"} className={hs.panelText}
                          initial={reduce || k !== active ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: E }}>
                          <div className={hs.textHead}>
                            <span className={hs.tileLg}><PixelIcon name={x.icon} size={22} /></span>
                            <p className={`mono ${hs.kicker}`}>{x.n} of 03 · {x.when} · <span className={styles.live}>Live</span></p>
                          </div>
                          <h3 className={hs.title}>{x.name}: {x.headline}.</h3>
                          <p className={`${hs.body} ${styles.body}`}>{x.body}</p>
                          <dl className={hs.facts}>
                            {x.rows.map(([dt, dd]) => <div key={dt} className={styles.fact}><dt>{dt}</dt><dd>{dd}</dd></div>)}
                          </dl>
                          <div className={styles.cta}><Button variant="secondary" href={x.href}><span className={styles.ctaLabel}>Open in the app<Arrow /></span></Button></div>
                        </motion.div>
                      </div>
                    ))}
                  </div>
                  <div className={styles.side}>
                    <div className={styles.canvas} aria-hidden="true">
                      <Still.Provider value={reduce}>
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div key={`${active}-${cycle}`} className={styles.sceneWrap}
                            initial={reduce ? false : { opacity: 0, y: 10, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.985, transition: { duration: 0.22, ease: E } }} transition={{ duration: 0.45, ease: E }}>
                            <a.Scene />
                          </motion.div>
                        </AnimatePresence>
                      </Still.Provider>
                    </div>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.p key={active} className={`${hs.answer} ${styles.answer}`} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={{ duration: 0.4, ease: E, delay: 0.15 }}>{a.answer}</motion.p>
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
          <p className={styles.next}><span className={`mono ${styles.nextLabel}`}>Next</span>Continuous monitoring and Accord Guard.</p>
        </div>
      </Appear>
    </section>
  )
}

/* ---------- story helpers: everything keyed to seconds after the scene mounts; reduced motion shows the end ---------- */

const E = [0.22, 1, 0.36, 1] as const
const Still = createContext(false)

/** props for a motion element that enters at `at` seconds (opacity and a small rise by default) */
function useEnter() {
  const still = useContext(Still)
  return (at: number, from: Record<string, number> = { opacity: 0, y: 8 }, dur = 0.5) => ({
    initial: still ? false : from,
    animate: { opacity: 1, x: 0, y: 0, scale: 1 },
    transition: { delay: at, duration: dur, ease: E },
  })
}

/** a step counter: 0 at mount, then 1, 2, … at each time in seconds; the last step at once when still */
function usePhase(times: number[]) {
  const still = useContext(Still)
  const [p, setP] = useState(still ? times.length : 0)
  useEffect(() => {
    if (still) return
    const ids = times.map((t, k) => window.setTimeout(() => setP(k + 1), t * 1000))
    return () => ids.forEach((id) => window.clearTimeout(id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still])
  return p
}

/** text that types in from `at` seconds */
function Typed({ text, at, cps = 48 }: { text: string; at: number; cps?: number }) {
  const still = useContext(Still)
  const [n, setN] = useState(still ? text.length : 0)
  useEffect(() => {
    if (still) return
    const c = animate(0, text.length, { delay: at, duration: text.length / cps, ease: "linear", onUpdate: (v) => setN(Math.round(v)) })
    return () => c.stop()
  }, [still, text, at, cps])
  return <>{text.slice(0, n)}{n > 0 && n < text.length ? <span className={styles.caret} /> : null}</>
}

/** a number counting up from 0 from `at` seconds, written with 2 decimals */
function Count({ to, at, dur = 0.7, sign = "" }: { to: number; at: number; dur?: number; sign?: string }) {
  const still = useContext(Still)
  const [v, setV] = useState(still ? to : 0)
  useEffect(() => {
    if (still) return
    const c = animate(0, to, { delay: at, duration: dur, ease: E, onUpdate: setV })
    return () => c.stop()
  }, [still, to, at, dur])
  return <>{sign}{v.toFixed(2)}</>
}

/** a dot travelling along a dashed line, once or as keyframes */
function Packet({ at, keys = ["0%", "100%"], bad, dur = 0.9 }: { at: number; keys?: string[]; bad?: boolean; dur?: number }) {
  const still = useContext(Still)
  if (still) return null
  return (
    <motion.span className={`${styles.packet} ${bad ? styles.packetBad : ""}`} initial={{ left: keys[0], opacity: 0 }}
      animate={{ left: keys, opacity: [0, 1, 1, 0] }} transition={{ delay: at, duration: dur, ease: E, opacity: { delay: at, duration: dur, times: [0, 0.1, 0.85, 1] } }} />
  )
}

/* ---------- Check a payment: the request types in, the six gates resolve in the contract's order ---------- */

const GATES: { label: string; pass: boolean; code?: string; decisive?: boolean }[] = [
  { label: "Key and state", pass: true },
  { label: "Recipient", pass: false, code: "ERR_PAYEE_MISMATCH", decisive: true },
  { label: "Item", pass: true },
  { label: "Evidence", pass: false, code: "ERR_NOT_DUE" },
  { label: "Amount", pass: true },
  { label: "Lock", pass: true },
]
const GATE_AT = 1.95, GATE_STEP = 0.36

function SceneCheck() {
  const enter = useEnter()
  const p = usePhase(GATES.map((_, k) => GATE_AT + k * GATE_STEP))
  const still = useContext(Still)
  return (
    <div className={styles.win}>
      <motion.div className={styles.winHead} {...enter(0)}>
        <span className={styles.winTitle}>Check a payment</span>
        <span className={`mono ${styles.chip}`}>read-only</span>
      </motion.div>
      <motion.p className={`mono ${styles.req}`} {...enter(0.15)}>
        <span className={styles.reqLine}><Typed text="a48.accord-v2.testnet · item 2" at={0.35} /></span>
        <span className={styles.reqLine}><Typed text="12.00 tUSDC → halcyon-markets.testnet" at={1.05} /></span>
      </motion.p>
      <ol className={styles.gates}>
        {GATES.map((g, k) => {
          const done = p > k
          const key = done && g.decisive
          return (
            <motion.li key={g.label} className={`${styles.gate} ${key ? styles.gateKey : ""}`} {...enter(1.6 + k * 0.05, { opacity: 0, y: 4 }, 0.35)}>
              <motion.span className={styles.gateRow}
                animate={key && !still ? { x: [0, -5, 5, -3, 3, 0] } : { x: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
                <span className={`mono ${styles.gNum}`}>0{k + 1}</span>
                <span className={`${styles.gName} ${done ? "" : styles.gWait}`}>{g.label}</span>
                <AnimatePresence initial={false}>
                  {done && g.code ? (
                    <motion.span key="c" className={`mono ${styles.gCode}`} initial={still ? false : { opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: E }}>{g.code}</motion.span>
                  ) : null}
                </AnimatePresence>
                <span className={`${styles.mark} ${!done ? styles.markWait : g.pass ? styles.markOk : styles.markBad}`}>
                  {!done ? <span className={styles.spin} /> : (
                    <motion.span initial={still ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 520, damping: 22 }}>{g.pass ? "✓" : "✕"}</motion.span>
                  )}
                </span>
              </motion.span>
              {key && !still ? <motion.span className={styles.pulse} initial={{ opacity: 0.7, scale: 1 }} animate={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.9, ease: "easeOut" }} /> : null}
            </motion.li>
          )
        })}
      </ol>
      <motion.div className={styles.verdict} {...enter(GATE_AT + GATES.length * GATE_STEP + 0.25, { opacity: 0, y: 14 }, 0.55)}>
        <span className={styles.vText}>Would be refused</span>
        <span className={`mono ${styles.vCode}`}>ERR_PAYEE_MISMATCH</span>
      </motion.div>
    </div>
  )
}

/* ---------- Refusal alerts: the refusal travels from the contract to the alert, its channels, the payload, revoke ---------- */

const CHANNELS = ["Webhook", "Telegram", "Email"]

function SceneAlerts() {
  const enter = useEnter()
  const still = useContext(Still)
  const p = usePhase([2.0, 2.35, 2.7])
  return (
    <div className={styles.alertStack}>
      <motion.div className={styles.route} {...enter(0)}>
        <span className={`mono ${styles.node}`}>a48 · act</span>
        <span className={styles.wireLine}><Packet at={0.35} bad dur={0.8} /></span>
        <span className={`mono ${styles.node} ${styles.nodeBad}`}>refused</span>
        <span className={styles.wireLine}><Packet at={0.95} bad dur={0.6} /></span>
        <span className={`mono ${styles.node}`}>your alerts</span>
      </motion.div>
      <motion.div className={styles.toast} {...enter(1.35, { opacity: 0, y: -12, scale: 0.97 }, 0.55)}>
        <span className={styles.toastIcon}>!</span>
        <div className={styles.toastText}>
          <p className={styles.toastTitle}>Agent refused <span className={`mono ${styles.now}`}>a48.accord-v2.testnet</span></p>
          <p className={styles.toastBody}>12.00 tUSDC to <span className={styles.nowrap}>halcyon-markets.testnet</span>; approved <span className={styles.nowrap}>halcyon-mm.testnet</span></p>
        </div>
      </motion.div>
      <motion.div className={styles.channels} {...enter(1.8)}>
        {CHANNELS.map((ch, k) => (
          <span key={ch} className={`${styles.channel} ${p > k ? styles.channelOn : ""}`}>
            <span className={styles.chDot}>{p > k ? <motion.span initial={still ? false : { scale: 0.3 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 520, damping: 22 }}>✓</motion.span> : null}</span>
            {ch}<span className={`mono ${styles.chState}`}>{p > k ? "delivered" : "…"}</span>
          </span>
        ))}
      </motion.div>
      <motion.pre className={`mono ${styles.payload}`} {...enter(3.0)}>
        <span className={styles.pk}>X-Accord-Signature:</span> t=…,v1=…{"\n"}
        {"{"} <span className={styles.pk}>"code"</span>: <span className={styles.pBad}>"ERR_PAYEE_MISMATCH"</span>, <span className={styles.pk}>"item"</span>: 2,{"\n"}
        {"  "}<span className={styles.pk}>"attempted"</span>: {"{"} "amount": "12.00",{"\n"}{"    "}"recipient": "halcyon-markets.testnet" {"}"},{"\n"}
        {"  "}<span className={styles.pk}>"approved"</span>: {"{"}{"\n"}{"    "}"recipient": "halcyon-mm.testnet" {"}"} {"}"}
      </motion.pre>
      <motion.div className={styles.revokeRow} {...enter(3.6)}>
        <span className={styles.revokeNote}>Incident view: tried beside approved</span>
        <span className={styles.revoke}>
          {still ? null : <motion.span className={styles.revokeFill} initial={{ scaleX: 0 }} animate={{ scaleX: [0, 1, 1, 0] }} transition={{ delay: 3.9, duration: 2.0, times: [0, 0.6, 0.8, 1], ease: "easeInOut" }} />}
          <span className={styles.revokeLabel}>Hold to revoke</span>
        </span>
      </motion.div>
    </div>
  )
}

/* ---------- Finance exports: rows write in, the PO lights, then the layout switches QuickBooks → Xero ---------- */

const FORMATS = ["QuickBooks", "Xero", "Accord CSV"]

function SceneExports() {
  const enter = useEnter()
  const still = useContext(Still)
  const p = usePhase([2.5, 4.3])
  const xero = p >= 2
  const po = p >= 1
  const fmt = xero ? 1 : 0
  return (
    <div className={styles.win}>
      <motion.div className={styles.winHead} {...enter(0)}>
        <span className={styles.winTitles}><span className={styles.winTitle}>Export</span><span className={`mono ${styles.winSub}`}>a48.accord-v2.testnet · tUSDC</span></span>
        <span className={styles.seg}>
          {FORMATS.map((f, k) => (
            <span key={f} className={`${styles.segItem} ${k === fmt ? styles.segOn : ""}`}>
              {k === fmt ? <motion.span layoutId="pc-seg" className={styles.segPill} transition={still ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }} /> : null}
              <span className={styles.segLabel}>{f}</span>
            </span>
          ))}
        </span>
      </motion.div>
      <motion.div className={`mono ${styles.sheet}`} {...enter(0.3)}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={xero ? "xero" : "qbo"} initial={still ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3, ease: E }}>
            {xero ? (
              <div className={`${styles.sRow} ${styles.sX} ${styles.sHead}`}><span>*Date</span><span>*Amount</span><span>Payee</span><span>Reference</span></div>
            ) : (
              <div className={`${styles.sRow} ${styles.sHead}`}><span>Date</span><span>Description</span><span>Amount</span></div>
            )}
            {[1, 2].map((n, k) => xero ? (
              <div key={n} className={`${styles.sRow} ${styles.sX}`}>
                <span>10/11/2026</span><span>-12.00</span>
                <span className={styles.sDesc}><span className={styles.sMain}>halcyon-demo.testnet</span><span className={styles.sSub}>Liquidity reporting integration / item {n} / a48.accord-v2.testnet</span></span>
                <span><span className={`${styles.po} ${styles.poOn}`}>PO-2026-0148</span></span>
              </div>
            ) : (
              <motion.div key={n} className={styles.sRow} {...enter(0.7 + k * 0.6, { opacity: 0, x: -8 }, 0.45)}>
                <span>10/11/2026</span>
                <span className={styles.sDesc}>
                  <span className={styles.sMain}><span className={`${styles.po} ${po ? styles.poOn : ""}`}>PO-2026-0148</span> / Liquidity reporting integration</span>
                  <span className={styles.sSub}>/ item {n} / a48.accord-v2.testnet</span>
                </span>
                <span className={styles.sAmt}><Count to={12} sign="-" at={0.9 + k * 0.6} /></span>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <motion.div className={styles.match} {...enter(2.7)}>
        <span className={styles.okDot}>✓</span>
        <span className={styles.matchText}>
          <span className={styles.matchTitle}>PO-2026-0148 matched · 2 payments</span>
          <span className={`mono ${styles.matchSub}`}>to halcyon-mm.testnet · reference off chain</span>
        </span>
        <span className={`mono ${styles.matchAmt}`}><Count to={24} sign="-" at={2.9} dur={0.9} /> tUSDC</span>
      </motion.div>
      <motion.div className={styles.dl} {...enter(3.2)}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={fmt} className={`mono ${styles.dlNote}`} initial={still ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25, ease: E }}>
            {xero ? "Xero bank statement" : "QuickBooks Online · 3 columns"}
          </motion.span>
        </AnimatePresence>
        <span className={styles.dlBtn}>Download CSV</span>
      </motion.div>
    </div>
  )
}

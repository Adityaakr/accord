import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react"
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

   Each tab's scene is one idea told calmly, then held: Check resolves the six gates in the contract's order and
   stops on gate 2's ERR_PAYEE_MISMATCH; Alerts brings in the refusal notification, ticks its three channels to
   delivered and fills the hold-to-revoke button; Exports writes the two paid rows and switches the layout from
   QuickBooks to Xero. Every value is from agreement a48.accord-v2.testnet (10 Nov 2026, docs/runs.md "Flow proofs"):
   the redirect of item 2 to halcyon-markets.testnet that the contract refused, gate by gate as the SDK's
   simulatePayment resolves it over the recorded views, as the refusal alert carries it (app lib/alerts.ts), and the
   two paid items as the QuickBooks Online and Xero exports lay them out (app lib/exports.ts).

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
                    <Canvas still={reduce} sceneKey={`${active}-${cycle}`} Scene={a.Scene} />
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

/* ---------- the scenes ----------
   One idea per scene, a handful of elements, typography doing the work. Motion is opacity and an 8-10 px rise or
   slide on E, 0.35-0.6 s, staggered calmly; the segmented control's pill is the one spring. Sans for words and
   amounts; mono only for on-chain identifiers and codes. Teal means passed; red appears once per scene, on the
   refusal code. Every scene runs on one clock (seconds after it mounts) and holds its end state; Still (reduced
   motion) renders the end state at once. */

const E = [0.22, 1, 0.36, 1] as const
const Still = createContext(false)

function Canvas({ still, sceneKey, Scene }: { still: boolean; sceneKey: string; Scene: () => ReactNode }) {
  return (
    <div className={styles.canvas} aria-hidden="true">
      <Still.Provider value={still}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={sceneKey} className={styles.sceneWrap}
            initial={still ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.2, ease: E } }} transition={{ duration: 0.5, ease: E }}>
            <Scene />
          </motion.div>
        </AnimatePresence>
      </Still.Provider>
    </div>
  )
}

/** props for an element that enters at `at` seconds: a fade with a small rise (or slide) */
function useEnter() {
  const still = useContext(Still)
  return (at: number, from: Record<string, number> = { opacity: 0, y: 8 }, dur = 0.5) => ({
    initial: still ? false : from,
    animate: { opacity: 1, x: 0, y: 0 },
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

function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={`${styles.check} ${className ?? ""}`} aria-hidden="true">
      <path d="M2.5 6.4 5 8.8l4.6-5.4" />
    </svg>
  )
}

/** a status that fades in once its moment comes */
function Status({ on, children }: { on: boolean; children: ReactNode }) {
  const still = useContext(Still)
  return (
    <AnimatePresence initial={false}>
      {on ? <motion.span className={styles.status} initial={still ? false : { opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: E }}>{children}</motion.span> : null}
    </AnimatePresence>
  )
}

/* ---------- Check a payment: the six gates resolve in the contract's order; gate 2 decides ---------- */

const GATES: { label: string; pass: boolean; code?: string }[] = [
  { label: "Key and state", pass: true },
  { label: "Recipient", pass: false, code: "ERR_PAYEE_MISMATCH" },
  { label: "Item", pass: true },
  { label: "Evidence", pass: false, code: "ERR_NOT_DUE" },
  { label: "Amount", pass: true },
  { label: "Lock", pass: true },
]
/* gate 1, gate 2 (the decision), then gates 3 to 6 together, quieter */
const GATE_T = [0.85, 1.4, 2.1, 2.18, 2.26, 2.34]

function SceneCheck() {
  const enter = useEnter()
  const p = usePhase(GATE_T)
  return (
    <div className={styles.win}>
      <motion.p className={`mono ${styles.meta}`} {...enter(0)}>a48 · item 2 · 12.00 tUSDC → <span className={styles.nowrap}>halcyon-markets.testnet</span></motion.p>
      <ol className={styles.rows}>
        {GATES.map((g, k) => {
          const after = k > 1 // evaluated, but the decision is already made at gate 2
          return (
            <motion.li key={g.label} className={`${styles.row} ${after && p > 1 ? styles.rowDim : ""}`} {...enter(0.15 + k * 0.07)}>
              <span className={styles.rowName}>{g.label}</span>
              <Status on={p > k}>
                {g.pass ? <Check className={after ? styles.checkDim : ""} /> : <span className={`mono ${k === 1 ? styles.code : styles.codeDim}`}>{g.code}</span>}
              </Status>
            </motion.li>
          )
        })}
      </ol>
      <motion.div className={styles.close} {...enter(2.9)}>
        <span className={styles.closeTitle}>Would be refused</span>
        <span className={styles.closeNote}>The first failing gate decides.</span>
      </motion.div>
    </div>
  )
}

/* ---------- Refusal alerts: one notification, three channels delivered, hold to revoke ---------- */

const CHANNELS = ["Webhook", "Telegram", "Email"]

function SceneAlerts() {
  const enter = useEnter()
  const still = useContext(Still)
  const p = usePhase([1.3, 1.6, 1.9])
  return (
    <div className={styles.win}>
      <div className={styles.group}>
        <motion.div className={styles.noteHead} {...enter(0.1)}>
          <span className={styles.noteApp}>Accord</span>
          <span className={styles.noteTime}>now</span>
        </motion.div>
        <motion.p className={styles.noteTitle} {...enter(0.2)}>Agent payment refused</motion.p>
        <motion.p className={styles.noteBody} {...enter(0.3)}>
          12.00 tUSDC to <span className={`mono ${styles.id}`}>halcyon-markets.testnet</span> · approved <span className={`mono ${styles.id}`}>halcyon-mm.testnet</span>
        </motion.p>
        <motion.p className={styles.noteCode} {...enter(0.4)}>
          <span className={`mono ${styles.code}`}>ERR_PAYEE_MISMATCH</span>
          <span className={`mono ${styles.idMuted}`}>a48.accord-v2.testnet</span>
        </motion.p>
      </div>
      <motion.ul className={styles.channels} {...enter(0.9)}>
        {CHANNELS.map((ch, k) => (
          <li key={ch} className={styles.channel}>
            <span className={styles.chName}>{ch}</span>
            <span className={styles.chState}>
              {p > k ? <motion.span className={styles.chDone} initial={still ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: E }}><Check />delivered</motion.span> : <span className={styles.chWait}>sending</span>}
            </span>
          </li>
        ))}
      </motion.ul>
      <motion.div className={styles.actions} {...enter(2.3)}>
        <span className={styles.hold}>
          {still ? null : <motion.span className={styles.holdFill} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 2.9, duration: 1.6, ease: "linear" }} />}
          <span className={styles.holdLabel}>Hold to revoke</span>
        </span>
        <span className={styles.actionNote}>Incident view: what was tried beside what was approved</span>
      </motion.div>
    </div>
  )
}

/* ---------- Finance exports: two real rows write in, then the layout switches QuickBooks → Xero ---------- */

/* a48's two paid items (docs/runs.md "Flow proofs"): 12.00 tUSDC each to halcyon-mm.testnet on 10 Nov 2026. QuickBooks
   Online's 3 columns; Xero's statement shown by its *Date, Reference, Payee and *Amount columns. */
const HEADS = { qbo: ["Date", "Description", "Amount"], xero: ["*Date", "Reference · Payee", "*Amount"] }

function SceneExports() {
  const enter = useEnter()
  const still = useContext(Still)
  const p = usePhase([3.0])
  const fmt = p >= 1 ? "xero" : "qbo"
  const fade = { initial: still ? false : { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.35, ease: E } }
  return (
    <div className={styles.win}>
      <motion.div className={styles.exHead} {...enter(0)}>
        <span className={styles.exTitles}>
          <span className={styles.exTitle}>Export</span>
          <span className={`mono ${styles.idMuted}`}>a48.accord-v2.testnet</span>
        </span>
        <span className={styles.seg}>
          {(["qbo", "xero"] as const).map((f) => (
            <span key={f} className={`${styles.segItem} ${f === fmt ? styles.segOn : ""}`}>
              {f === fmt ? <motion.span layoutId="pc-seg" className={styles.segPill} transition={still ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 34 }} /> : null}
              <span className={styles.segLabel}>{f === "qbo" ? "QuickBooks" : "Xero"}</span>
            </span>
          ))}
        </span>
      </motion.div>
      <div className={styles.table}>
        <motion.div className={`${styles.tr} ${styles.th}`} {...enter(0.2)}>
          {HEADS.qbo.map((_, c) => (
            <span key={c} className={`${styles.td} ${c === 0 ? styles.tdDate : ""}`}>
              <AnimatePresence mode="wait" initial={false}><motion.span key={`${fmt}-${c}`} {...fade}>{HEADS[fmt][c]}</motion.span></AnimatePresence>
            </span>
          ))}
        </motion.div>
        {[1, 2].map((n, k) => (
          <motion.div key={n} className={styles.tr} {...enter(0.55 + k * 0.09, { opacity: 0, x: -10 })}>
            <span className={`${styles.td} ${styles.tdDate}`}>10/11/2026</span>
            <span className={`${styles.td} ${styles.tdText}`}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={`${fmt}-d${n}`} {...fade} className={styles.clamp}>{fmt === "qbo" ? `PO-2026-0148 / Liquidity reporting integration / item ${n}` : <>PO-2026-0148<br /><span className={`mono ${styles.idMuted}`}>halcyon-demo.testnet</span></>}</motion.span>
              </AnimatePresence>
            </span>
            <span className={`${styles.td} ${styles.num}`}>-12.00</span>
          </motion.div>
        ))}
        <motion.div className={`${styles.tr} ${styles.tfoot}`} {...enter(0.9)}>
          <span className={`${styles.td} ${styles.tdDate}`}>2 payments</span>
          <span className={`${styles.td} ${styles.tdText}`}><span className={`mono ${styles.idMuted}`}>to halcyon-mm.testnet</span></span>
          <span className={`${styles.td} ${styles.num}`}>-24.00</span>
        </motion.div>
      </div>
      <motion.p className={styles.foot} {...enter(1.2)}>Amounts in tUSDC. References stay with your organisation, never on chain.</motion.p>
    </div>
  )
}

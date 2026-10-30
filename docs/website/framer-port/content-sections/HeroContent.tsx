import { useRef, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { motion, useInView, type Transition } from "motion/react"
import { EASE_APPEAR, EASE_UI, toTransition, type FramerTween } from "../lib/motion"
import { Button } from "../components/Button"
import { Dots } from "../components/Dots"
import { Mono } from "../components/Mono"
import { Ref } from "../components/Ref"
import { LINKS, isPlaceholder } from "../content/links"
import { useLive, asOfLabel, type LiveValues } from "../lib/live"
import styles from "./Hero.module.css"

/* ------------------------------------------------------------------
   Hero (brief §4.1), anchor #top. Layout rhythm, Dots background, word reveal and
   mount-staggered appears are the template's (Framer dK4Q5QRjZ); copy is the brief's.
   The product image is replaced by two live panels (brief §6: "not an illustration").
------------------------------------------------------------------- */

/* appearEffect trigger "onMount" (plays once on mount, no viewport gate) */
const mount = (delay: `${number}s`): FramerTween => ({ type: "tween", ease: EASE_APPEAR, duration: "1.4s", delay })

function Mount({ y, delay, className, children }: { y: number; delay: `${number}s`; className?: string; children?: ReactNode }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y }} animate={{ opacity: 1, y: 0 }} transition={toTransition(mount(delay))}>
      {children}
    </motion.div>
  )
}

/* textEffect: trigger onMount, tokenization "word", style {opacity 0, y 32px, blur 10px},
   per-token transition tween ease [0.12,0.23,0.5,1]; `delay` = start delay, `stagger` = per-word delay */
function WordReveal({ as: Tag, className, text, delay, duration, stagger }: { as: "h1" | "p"; className: string; text: string; delay: number; duration: number; stagger: number }) {
  const words = text.split(" ")
  return (
    <Tag className={className} aria-label={text}>
      {words.map((w, i) => {
        const t: Transition = { type: "tween", ease: EASE_APPEAR, duration, delay: delay + i * stagger }
        return (
          <span key={i} aria-hidden="true">
            <motion.span className={styles.word} initial={{ opacity: 0, y: 32, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={t}>
              {w}
            </motion.span>
            {i < words.length - 1 ? " " : null}
          </span>
        )
      })}
    </Tag>
  )
}

/* Dots loopEffect: opacity → 0.5, repeatType mirror, pauseOffscreen, tween 2s ease [0.44,0,0.56,1] */
function LoopingDots() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref)
  const loop: Transition = { type: "tween", ease: EASE_UI, duration: 2, delay: 0, repeat: Infinity, repeatType: "mirror", repeatDelay: 0 }
  return (
    <motion.div ref={ref} className={styles.dotsWrap} initial={{ opacity: 1 }} animate={inView ? { opacity: 0.5, transition: loop } : { opacity: 1, transition: { duration: 0 } }} aria-hidden="true">
      <Dots className={styles.dots} />
    </motion.div>
  )
}

/* ---------- copy (brief §4.1, verbatim) ---------- */
const EYEBROW = "Agreements between companies' agents · built on NEAR · open source · testnet live"
const HEADLINE = "The private deal room for agent-to-agent commerce."
const THESIS = "Agreements negotiated in private, enforced in public."
const SUBHEAD =
  "Two companies' agents negotiate at a sealed table inside an attested enclave that neither side controls; only the terms leave it, and both humans approve them. From then on the contract enforces those terms on the money, in the open: the approved milestone and amount, a payee that proved its own address, and for market making an order book that met the agreed spread and depth. Every refusal is a public event anyone can verify."
const BUILT_ON = ["Built on NEAR AI Cloud", "OutLayer", "Chain Signatures", "settled in USDC on Base"]
const USED_FOR = ["For protocol procurement", "grants and accelerator desks", "market-making engagements", "agent-to-agent services"]
const STATES = ["Sealed", "Attested", "Executing", "Settled"] as const

/* A placeholder from links.ts renders as plain text, never as a broken link (conventions rule 6). */
function Tertiary({ href, children }: { href: string; children: ReactNode }) {
  const cls = `t-body-sm ls-link ${styles.tertiary}`
  if (isPlaceholder(href)) return <span className={cls} title={href}>{children}</span>
  if (href.startsWith("#")) return <a href={href} className={cls}>{children}</a>
  if (href.startsWith("/")) return <Link to={href} className={cls}>{children}</Link>
  return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>
}

const utc = (iso: string, withDate: boolean) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return withDate
    ? d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC"
    : d.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" }) + " UTC"
}

/* Empty state: the literal "No entries yet" plus the snapshot's as-of label. Nothing recorded is shown as live. */
function Empty({ v }: { v: LiveValues }) {
  return (
    <p className={`t-body-sm ${styles.empty}`}>
      No entries yet <span className={styles.asOf}>· {asOfLabel(v)}</span>
    </p>
  )
}

function PanelFoot({ v }: { v: LiveValues }) {
  if (v.source !== "last-known") return null
  return <p className={`t-body-sm ${styles.foot}`}>{asOfLabel(v)}</p>
}

/* Left panel: the agreement page from the app on testnet */
function AgreementPanel({ v }: { v: LiveValues | null }) {
  const a = v?.agreement
  const payeeKnown = !!a && a.payee.domain !== ""
  return (
    <article className={styles.panel} aria-labelledby="hero-agreement-title">
      <header className={styles.panelHead}>
        <h2 id="hero-agreement-title" className={`t-h6 ${styles.panelTitle}`}>Agreement</h2>
        {a && !isPlaceholder(a.id) && a.id !== "" ? <Mono className={styles.panelId}>{a.id}</Mono> : null}
      </header>

      {/* Four-state strip; the current state in the template's white pill */}
      <ol className={styles.states} aria-label="Agreement state">
        {STATES.map((s) => {
          const current = a?.state === s
          return (
            <li key={s} aria-current={current ? "step" : undefined}>
              <Mono className={`${styles.state} ${current ? styles.stateCurrent : ""}`}>{s}</Mono>
            </li>
          )
        })}
      </ol>

      <div className={styles.row}>
        <p className={`t-body-sm ${styles.rowLabel}`}>Approved terms</p>
        {!v ? <p className={`t-body-sm ${styles.empty}`}>Loading</p> : a && a.terms.length > 0 ? (
          <ul className={styles.terms}>
            {a.terms.map((t) => (
              <li key={t.milestone} className={styles.term}>
                <Mono className={styles.cell}>milestone {t.milestone}</Mono>
                <Mono className={styles.cell}>{t.amount}</Mono>
                <Mono className={styles.cell}>due {t.due}</Mono>
              </li>
            ))}
          </ul>
        ) : <Empty v={v} />}
      </div>

      <div className={styles.row}>
        <p className={`t-body-sm ${styles.rowLabel}`}>Bound payee</p>
        {!v ? <p className={`t-body-sm ${styles.empty}`}>Loading</p> : payeeKnown ? (
          <div className={styles.lines}>
            <Mono className={styles.cell}>{a.payee.domain} · v{a.payee.version}</Mono>
            {a.payee.proof ? <Mono className={`${styles.cell} ${styles.wrapCell}`}>{a.payee.proof}</Mono> : null}
          </div>
        ) : <Empty v={v} />}
      </div>

      <div className={styles.row}>
        <p className={`t-body-sm ${styles.rowLabel}`}>Last transfer on Base Sepolia</p>
        {!v ? <p className={`t-body-sm ${styles.empty}`}>Loading</p> : a?.lastTransfer ? (
          <div className={styles.lines}>
            <Mono className={styles.cell}>{a.lastTransfer.amount} → {a.lastTransfer.to}</Mono>
            <Mono className={`${styles.cell} ${styles.wrapCell}`}>{a.lastTransfer.tx}</Mono>
            <Mono className={styles.cell}>{utc(a.lastTransfer.at, true)}</Mono>
          </div>
        ) : <Empty v={v} />}
      </div>

      {v ? <PanelFoot v={v} /> : null}
    </article>
  )
}

/* Right panel: the refusal log, newest first; a live region (brief §7) */
function RefusalPanel({ v }: { v: LiveValues | null }) {
  const refusals = v ? [...v.refusals].sort((x, y) => Date.parse(y.at) - Date.parse(x.at)) : []
  return (
    <article className={styles.panel} aria-labelledby="hero-refusal-title">
      <header className={styles.panelHead}>
        <h2 id="hero-refusal-title" className={`t-h6 ${styles.panelTitle}`}>Refusal log</h2>
        <p className={`t-body-sm ${styles.panelHint}`}>newest first</p>
      </header>
      <div className={styles.log} aria-live="polite" aria-atomic="false" aria-busy={!v}>
        {!v ? <p className={`t-body-sm ${styles.empty}`}>Loading</p> : refusals.length === 0 ? <Empty v={v} /> : (
          <ol className={styles.logList}>
            {refusals.map((r, i) => (
              <li key={`${r.at}-${i}`} className={styles.logLine}>
                <time dateTime={r.at} className={`mono ${styles.logTime}`}>{utc(r.at, false)}</time>
                <span className={styles.sep} aria-hidden="true">·</span>
                <span className={`mono ${styles.logFrom}`}>{r.from}</span>
                <span className={styles.sep} aria-hidden="true">·</span>
                <Mono tone="refusal" className={styles.logReason}>{r.reason}</Mono>
              </li>
            ))}
          </ol>
        )}
      </div>
      {v ? <PanelFoot v={v} /> : null}
    </article>
  )
}

export function Hero() {
  const v = useLive()
  return (
    <header id="top" className={`section ${styles.hero}`}>
      <LoopingDots />

      <div className={styles.header}>
        <div className={styles.heading}>
          <div className={styles.container}>
            {/* Eyebrow: appear onMount y24 1.4s delay 0 */}
            <Mount y={24} delay="0s" className={styles.tag}>
              <span className={styles.indicator} aria-hidden="true" />
              <p className={`t-body-sm ${styles.tagText}`}>{EYEBROW}</p>
            </Mount>

            <div className={styles.text}>
              {/* H1: word reveal, delay 0.1s, 0.8s per word, stagger 0.04s */}
              <WordReveal as="h1" className={`t-h1 ${styles.title}`} text={HEADLINE} delay={0.1} duration={0.8} stagger={0.04} />
              {/* Thesis line, large, directly under */}
              <Mount y={24} delay="0.2s" className={styles.thesisWrap}>
                <p className={`t-h3 ${styles.thesis}`}>{THESIS}</p>
              </Mount>
              {/* Subhead: Body Large, word reveal, delay 0.2s, 0.6s per word, stagger 0.04s */}
              <WordReveal as="p" className={`t-body-lg ${styles.description}`} text={SUBHEAD} delay={0.2} duration={0.6} stagger={0.04} />
            </div>
          </div>

          <div className={styles.doors}>
            <div className={styles.actions}>
              <Mount y={24} delay="0.4s">
                <Button variant="primary" href={LINKS.openDealRoom}>Open a deal room</Button>
              </Mount>
              <Mount y={24} delay="0.6s">
                <Button variant="secondary" href={LINKS.verifyDomain}>Verify your domain</Button>
              </Mount>
            </div>

            <Mount y={24} delay="0.7s" className={styles.tertiaries}>
              <Tertiary href={LINKS.demo}>Watch the demo (3 min)</Tertiary>
              <Tertiary href={LINKS.record}>Inspect the execution</Tertiary>
              <Tertiary href="#inbox">Try to move the money</Tertiary>
            </Mount>
          </div>

          {/* Proof strip (one line, live values) */}
          <Mount y={24} delay="0.8s" className={styles.proofWrap}>
            <p className={`t-body-sm ${styles.proof}`}>
              <span className={styles.proofItem}>Mandates readable by the other side: <Mono>0</Mono></span>
              <span className={styles.proofSep}> · </span>
              <span className={styles.proofItem}>payments outside the approved terms or the bound payee: <Mono>0</Mono></span>
              <span className={styles.proofSep}> · </span>
              <span className={styles.proofItem}>
                emails sent to the demo agent by visitors:{" "}
                {v ? <Mono>{v.attempts}</Mono> : <Mono aria-busy="true">…</Mono>}
                {v ? <span className={styles.asOf}> ({asOfLabel(v)})</span> : null}
                , money they moved: <Mono>{v ? v.movedByAttempts : 0}</Mono>
              </span>
              <span className={styles.proofSep}> · </span>
              <span className={styles.proofItem}>every negotiation verifiable with <Mono>outlayer-verify</Mono><Ref n={19} /></span>
            </p>
            <p className={`t-body-sm ${styles.builtOn}`}>
              {BUILT_ON.map((b, i) => (
                <span key={b}>{i > 0 ? <span className={styles.proofSep}> · </span> : null}{b}</span>
              ))}
            </p>
          </Mount>
        </div>

        {/* Hero visual: two live panels (replaces the template image; appear onMount y32 1.4s delay 0.6s) */}
        <Mount y={32} delay="0.6s" className={styles.panels}>
          <AgreementPanel v={v} />
          <RefusalPanel v={v} />
        </Mount>
      </div>

      {/* Used-for band: thin strip under the hero */}
      <Mount y={24} delay="0.9s" className={styles.band}>
        <p className={`t-body-sm ${styles.bandText}`}>
          {USED_FOR.map((u, i) => (
            <span key={u} className={styles.bandItem}>{i > 0 ? <span className={styles.proofSep}> · </span> : null}{u}</span>
          ))}
        </p>
      </Mount>
    </header>
  )
}

import { useRef, type ReactNode } from "react"
import { motion, useInView, type Transition } from "motion/react"
import { Appear, EASE_APPEAR, EASE_UI, toTransition, type AppearEffect, type FramerTween } from "../lib/motion"
import { Link } from "react-router-dom"
import { Button } from "../components/Button"
import { Dots } from "../components/Dots"
import { ActionCard, ActionCardIcon, type IconPath } from "../components/ActionCard"
import { LINKS, PRIMARY_CTA } from "../content/links"
import { HeroPreview } from "../components/HeroPreview"
import { AtlasMark } from "../components/AtlasMark"
import styles from "./Hero.module.css"

/* ------------------------------------------------------------------
   Hero (dK4Q5QRjZ, elementId "hero"): Home page, Desktop breakpoint WQLkyLRf1.
   Tablet replica uX81zskxrdK4Q5QRjZ, Phone Ue6QXWSr_dK4Q5QRjZ.
   Every value below is copied from the Framer tree. Copy is the Hero section of
   docs/website/ACCORD_WEBSITE_FINAL_COPY.md Part A (docs/website/framer-port/REFILL-V3.md, row sections/Hero.tsx), set verbatim:
   pill (the eyebrow line), H1, the thesis line under it, one description paragraph, two buttons, the
   product-preview caption under the image. The four action cards carry the Part A titles and one-liners.
------------------------------------------------------------------- */

/* appearEffect trigger "onMount" (plays once on mount, no viewport gate) */
const mount = (y: number, delay: `${number}s`): FramerTween => ({ type: "tween", ease: EASE_APPEAR, duration: "1.4s", delay })

function Mount({ y, delay, className, children }: { y: number; delay: `${number}s`; className?: string; children?: ReactNode }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y }} animate={{ opacity: 1, y: 0 }} transition={toTransition(mount(y, delay))}>
      {children}
    </motion.div>
  )
}

/* textEffect: trigger onMount, tokenization "word", style {opacity 0, y 32px, blur 10px},
   per-token transition tween ease [0.12,0.23,0.5,1]; `delay` = start delay, transition.delay = stagger */
function WordReveal({ as: Tag, className, text, delay, duration, stagger, breakAfter, wordClass }: { as: "h1" | "p"; className: string; text: string; delay: number; duration: number; stagger: number; breakAfter?: number; wordClass?: (i: number) => string | undefined }) {
  const words = text.split(" ")
  return (
    <Tag className={className} aria-label={text}>
      {words.map((w, i) => {
        const t: Transition = { type: "tween", ease: EASE_APPEAR, duration, delay: delay + i * stagger }
        return (
          <span key={i} aria-hidden="true">
            <motion.span className={`${styles.word} ${wordClass?.(i) ?? ""}`} initial={{ opacity: 0, y: 32, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={t}>
              {/* Host Grotesk's hyphen is wide at display sizes: set it narrower inside compound words */}
              {w.includes("-") ? w.split("-").map((part, k) => <span key={k}>{k > 0 ? <span className={styles.hy}>-</span> : null}{part}</span>) : w}
            </motion.span>
            {i < words.length - 1 ? " " : null}
            {/* spec §3.1: the H1 breaks after "control plane" at widths >= 1024 (the <br> is hidden below that) */}
            {breakAfter === i ? <br className={styles.desktopBreak} /> : null}
          </span>
        )
      })}
    </Tag>
  )
}

/* Dots (DGX7x5MLM) loopEffect: opacity → 0.5, repeatType mirror, repeatDelay 0s, pauseOffscreen,
   tween 2s ease [0.44,0,0.56,1] */
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

/* Action card instances: appearEffect onInView, threshold 0.5, replay false,
   enter {opacity 0, y 24}, tween 1.4s ease [0.12,0.23,0.5,1], delays 0 / 0.1 / 0.2 / 0.3 */
const CARD_APPEAR: AppearEffect = {
  threshold: 0.5,
  replay: false,
  enter: { opacity: 0, x: 0, y: 24, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1.4s", delay: "0s" } },
}

const ICON_WORKSPACE: IconPath[] = [
  { d: "M 10.827 0.18 C 10.299 -0.06 9.694 -0.06 9.167 0.18 L 0.597 4.08 C 0.234 4.24 0 4.599 0 4.995 C 0 5.392 0.234 5.75 0.597 5.91 L 9.177 9.82 C 9.704 10.061 10.309 10.061 10.837 9.82 L 19.417 5.92 C 19.779 5.76 20.013 5.402 20.013 5.005 C 20.013 4.609 19.779 4.25 19.417 4.09 Z", t: "translate(2.003 2)" },
  { d: "M 0 0 C -0.001 0.391 0.226 0.746 0.58 0.91 L 9.18 4.82 C 9.704 5.057 10.306 5.057 10.83 4.82 L 19.41 0.92 C 19.772 0.757 20.003 0.397 20 0", t: "translate(2 12)" },
  { d: "M 0 0 C -0.001 0.391 0.226 0.746 0.58 0.91 L 9.18 4.82 C 9.704 5.057 10.306 5.057 10.83 4.82 L 19.41 0.92 C 19.772 0.757 20.003 0.397 20 0", t: "translate(2 17)" },
]
const ICON_AGENTS: IconPath[] = [
  { d: "M 20 5 C 20 7.761 17.761 10 15 10 C 12.239 10 10 7.761 10 5 C 10 2.239 7.761 0 5 0 C 2.239 0 0 2.239 0 5", t: "translate(2 7)" },
  { d: "M 2.518 17.3 C 0.116 15.919 -0.713 12.852 0.668 10.45 C 2.049 8.048 5.116 7.219 7.518 8.6 C 9.893 9.981 12.937 9.175 14.318 6.8 C 15.699 4.425 14.893 1.381 12.518 0", t: "translate(4.482 3.4)" },
  { d: "M 0 0.675 C 2.375 -0.706 5.419 0.1 6.8 2.475 C 8.181 4.85 7.375 7.894 5 9.275 C 2.625 10.655 1.819 13.7 3.2 16.075 C 4.581 18.45 7.625 19.255 10 17.875", t: "translate(7 2.625)" },
  { d: "M 0 10 C 0 4.477 4.477 0 10 0 C 15.523 0 20 4.477 20 10 C 20 15.523 15.523 20 10 20 C 4.477 20 0 15.523 0 10 Z", t: "translate(2 2)" },
]
const ICON_SECURE: IconPath[] = [
  { d: "M 0.97 2.42 C 0.369 2.781 0.002 3.429 0 4.13 L 0 7.37 C 0.002 8.071 0.369 8.719 0.97 9.08 L 3.97 10.88 C 4.604 11.261 5.396 11.261 6.03 10.88 L 10 8.5 L 10 3 L 5 0 Z", t: "translate(2 10.5)" },
  { d: "M 4.74 2.85 L 0 0", t: "translate(2.26 13.65)" },
  { d: "M 0 3 L 5 0", t: "translate(7 13.5)" },
  { d: "M 0 0 L 0 5.17", t: "translate(7 16.5)" },
  { d: "M 0 3 L 0 8.5 L 3.97 10.88 C 4.604 11.261 5.396 11.261 6.03 10.88 L 9.03 9.08 C 9.631 8.719 9.998 8.071 10 7.37 L 10 4.13 C 9.998 3.429 9.631 2.781 9.03 2.42 L 5 0 Z", t: "translate(12 10.5)" },
  { d: "M 5 3 L 0 0", t: "translate(12 13.5)" },
  { d: "M 0 2.85 L 4.74 0", t: "translate(17 13.65)" },
  { d: "M 0 0 L 0 5.17", t: "translate(17 16.5)" },
  { d: "M 0.97 2.086 C 0.369 2.446 0.002 3.095 0 3.796 L 0 8.166 L 5 11.166 L 10 8.166 L 10 3.796 C 9.998 3.095 9.631 2.446 9.03 2.086 L 6.03 0.286 C 5.396 -0.095 4.604 -0.095 3.97 0.286 Z", t: "translate(7 2.334)" },
  { d: "M 4.74 2.85 L 0 0", t: "translate(7.26 5.15)" },
  { d: "M 0 2.85 L 4.74 0", t: "translate(12 5.15)" },
  { d: "M 0 5.5 L 0 0", t: "translate(12 8)" },
]
const ICON_TRUSTED: IconPath[] = [
  { d: "M 0 7 L 0 0", t: "translate(10 11)" },
  { d: "M 8.146 0.201 C 8.703 -0.069 9.352 -0.067 9.906 0.207 L 17.772 4.054 C 18.248 4.287 18.082 5.003 17.552 5.003 L 0.5 5.003 C -0.03 5.003 -0.195 4.287 0.28 4.054 Z", t: "translate(2.974 1.997)" },
  { d: "M 0 7 L 0 0", t: "translate(14 11)" },
  { d: "M 0 7 L 0 0", t: "translate(18 11)" },
  { d: "M 0 0 L 18 0", t: "translate(3 22)" },
  { d: "M 0 7 L 0 0", t: "translate(6 11)" },
]

/* Action card instances (ThHqOPXXs, KnRXf2xwB, pg92Dm01f, wFsGr_CBr): the four Part A one-liners, verbatim */
const CARDS = [
  { icon: ICON_WORKSPACE, title: "Sealed Table", description: "Agents negotiate in confidence. Only the agreed terms and a proof come out." },
  { icon: ICON_AGENTS, title: "Agreement controls", description: "The contract enforces the terms. Any payment that doesn't match is refused." },
  { icon: ICON_SECURE, title: "Payee", description: "Payments go only to a recipient the vendor has proven and the buyer accepted." },
  { icon: ICON_TRUSTED, title: "Accord Atlas", description: "The first app on Accord: liquidity agreements paid on measured conditions." },
]

/* NEAR logomark (the current "N" symbol, from near.org), single colour, inherits the text colour */
function NearMark() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M13.9017 0.646973C13.3462 0.646973 12.8304 0.929357 12.5394 1.39357L9.40403 5.95741C9.30186 6.10784 9.34331 6.31059 9.49675 6.41075C9.6211 6.49202 9.78561 6.48196 9.89889 6.38645L12.9851 3.76201C13.0364 3.71677 13.1154 3.72137 13.1616 3.77165C13.1825 3.79469 13.1937 3.82444 13.1937 3.85502V12.0719C13.1937 12.1397 13.1377 12.1942 13.0684 12.1942C13.0312 12.1942 12.9962 12.1783 12.9727 12.1502L3.6435 1.20169C3.33966 0.850174 2.89352 0.647392 2.42388 0.646973H2.09782C1.21536 0.646973 0.5 1.34833 0.5 2.2135V13.7863C0.5 14.6515 1.21536 15.3528 2.09782 15.3528C2.65336 15.3528 3.16915 15.0704 3.46017 14.6062L6.59558 10.0424C6.69769 9.89194 6.65624 9.68919 6.50279 9.58903C6.37845 9.50776 6.21394 9.51782 6.10071 9.61334L3.01446 12.2378C2.96318 12.283 2.88412 12.2784 2.83797 12.2281C2.81703 12.2051 2.80592 12.1753 2.80634 12.1447V3.92583C2.80634 3.85796 2.86232 3.80349 2.93155 3.80349C2.96831 3.80349 3.00377 3.81941 3.02728 3.84748L12.3552 14.7981C12.659 15.1496 13.1052 15.3524 13.5749 15.3528H13.9009C14.7833 15.3532 15.4992 14.6523 15.5 13.7871V2.2135C15.5 1.34833 14.7842 0.646973 13.9017 0.646973Z" />
    </svg>
  )
}

/* ---------- copy (Part A · Hero, verbatim) ---------- */
const HEADLINE = "The private deal room and control plane for agent-to-agent commerce."
/* spec §3.1: "Break after 'control plane' on desktop" → index of the word the <br> follows */
const H1_BREAK_AFTER = HEADLINE.split(" ").indexOf("plane")
/* Two-tone headline: "deal room" and "control plane" carry a silver sheen; the second line steps back in tone */
const H1_WORDS = HEADLINE.split(" ")
const ACCENT = new Set([H1_WORDS.indexOf("deal"), H1_WORDS.indexOf("room"), H1_WORDS.indexOf("control"), H1_WORDS.indexOf("plane")])
const headlineWord = (i: number) => (ACCENT.has(i) ? styles.h1Accent : i > H1_BREAK_AFTER ? styles.h1Soft : undefined)
const LEAD = "Accord turns private negotiations between AI agents into enforceable payment controls. Each agent negotiates within its company’s confidential mandate, both companies approve the terms, and the contract then decides what the buyer’s agent can authorise, who it can pay, how much, and on what evidence."
/* Accord Atlas announcement under the description (copy from Adi, 30 Oct 2026), links to /atlas */
const PILL_KICKER = "The first application on Accord"
const PILL_TAG = "Introducing Accord Atlas"
const PILL_TEXT = "Liquidity agreements with measurable payment conditions"

export function Hero() {
  return (
    <header id="hero" className={`section ${styles.hero}`}>
      {/* Dots (DGX7x5MLM) */}
      <LoopingDots />

      {/* Header (CztXtxzH2); id "top" so brief §3's #top anchor resolves */}
      <div id="top" className={styles.header}>
        {/* Heading (Toqp4JELm) */}
        <div className={styles.heading}>
          {/* Container (U9dFxxetz) */}
          <div className={styles.container}>
            {/* Tag (dVCnMXbAU): appear onMount y24 1.4s delay 0 */}
            <Mount y={24} delay="0s" className={styles.tag}>
              <span className={styles.indicator} aria-hidden="true" />
              <p className={`t-body-sm ${styles.tagText}`}>
                Built on{" "}
                <span className={styles.near}>
                  <NearMark />
                  NEAR
                </span>
              </p>
            </Mount>

            {/* Text (HTyEhEAtt) */}
            <div className={styles.text}>
              {/* Title (dAUUOvsrW): H1, word reveal, delay 0.1s, 0.8s per word, stagger 0.04s */}
              <WordReveal as="h1" className={`t-h1 ${styles.title}`} text={HEADLINE} delay={0.1} duration={0.8} stagger={0.04} breakAfter={H1_BREAK_AFTER} wordClass={headlineWord} />
              {/* Description (goSSBhPkn): Body Large, word reveal, delay 0.2s, 0.6s per word, stagger 0.04s */}
              <WordReveal as="p" className={`t-body-lg ${styles.description}`} text={LEAD} delay={0.2} duration={0.6} stagger={0.04} />
            </div>
          </div>

          {/* Actions (a7cb5w_zG) */}
          <div className={styles.actions}>
            {/* jtobshkjO: Button Primary, appear onMount y24 1.4s delay 0.4s */}
            <Mount y={24} delay="0.4s">
              <Button variant="primary" href={LINKS.openDealRoom}>
                {PRIMARY_CTA}
              </Button>
            </Mount>
            {/* Kt0jRKddM: Button Secondary (T_m9VlS9B), appear onMount y24 1.4s delay 0.6s */}
            <Mount y={24} delay="0.6s">
              <Button variant="secondary" href={LINKS.exploreAtlas}>
                Explore Atlas
              </Button>
            </Mount>
          </div>

          {/* Accord Atlas announcement, below the buttons: the hero reads headline, lead, actions, then Atlas */}
          <Mount y={16} delay="0.7s" className={styles.announce}>
            <Link to="/atlas" className={styles.announceLink}>
              <AtlasMark size={22} />
              <span className={styles.announceBody}>
                <span className={styles.announceName}>Accord Atlas</span>
                <span className={styles.announceDot} aria-hidden="true">·</span>
                <span className={styles.announceKicker}>{PILL_KICKER}</span>
                <span className={styles.announceArrow} aria-hidden="true">→</span>
                <span className={styles.announceSub}>{PILL_TEXT}</span>
              </span>
            </Link>
          </Mount>
        </div>

        {/* Image (Mksz61xjD): appear onMount y32 1.4s delay 0.6s; the Part A "Product preview caption" sits under it
            in the same appear (Body Small, text-weak, max-width 640) */}
        <Mount y={32} delay="0.6s" className={styles.preview}>
          <div className={styles.image}>
            <HeroPreview />
          </div>
        </Mount>

        {/* Action cards (mZ8KywPOa) */}
        <div className={styles.cards}>
          {CARDS.map((c, i) => (
            <Appear key={c.title} effect={CARD_APPEAR} delay={i * 0.1} className={styles.cardWrap}>
              <ActionCard icon={<ActionCardIcon paths={c.icon} />} title={c.title} description={c.description} />
            </Appear>
          ))}
        </div>
      </div>
    </header>
  )
}

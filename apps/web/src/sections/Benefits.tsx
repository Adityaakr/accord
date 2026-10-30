import type { ReactNode } from "react"
import { motion } from "motion/react"
import { Appear, EASE_APPEAR, EASE_UI, type AppearEffect } from "../lib/motion"
import { Dots } from "../components/Dots"
import { IconCard } from "../components/IconCard"
import { Link } from "react-router-dom"
import { LINKS, isPlaceholder } from "../content/links"
import styles from "./Benefits.module.css"

/* Framer "Benefits" section: Desktop R0XmrFPvy (elementId "benefits"; refill id "trust"; rendered id "privacy"), Tablet uX81zskxrR0XmrFPvy, Phone Ue6QXWSr_R0XmrFPvy
   section: vertical stack, width 1fr, maxWidth 1080, gap 64, padding 72px 0, scrollMarginTop 40
            (Tablet: gap 48, padding 72px 24px · Phone: gap 32, padding 72px 16px)
     Dots oC813haZN: absolute right 0 top 0, 920×780, overflow hidden, z 0, fill dots.png
       loopEffect  opacity → 0.5, mirror, tween 2s ease [0.44,0,0.56,1], repeatDelay 0, pauseOffscreen (no appearEffect)
     Heading nHHnBolMG: vertical, gap 24, maxWidth 480, width 1fr
       Tag eDLobg3ZF (appear y32 1s delay 0): Indicator HA4_zmgCi 14×8 Purple + Text OXmZk8YhN (Body Small) "Enterprise Ready"
       Text jgvbNgVGq (appear y32 1s delay 0.2): Title tFmhKYpmX (H2) + Description H6Z2Y9E5r (Body Large, hard line break)
     Icon Cards VC6Y4OxSB: grid 3 cols (Tablet 2, Phone 1), gap 16, rows fit, width 1fr
       TFySiAbJr / y_nJuDo_R / AqjquRBS_ / TExcZL5RQ / a9iijB4V5 / dCmGlgkyB: Icon Card instances, width 1fr,
       appear y32 1s delay 0 / 0.1 / 0.2 / 0.3 / 0.4 / 0.5
   Added (no Framer slot): one block under the grid, appear y32 1s: a Body Large closing line and, 16px under it,
   a `.t-body-sm .ls-link` tertiary link; both on the grid's left edge, at the lead width (720).
   Description H6Z2Y9E5r is empty in the refill (Part A "Privacy and control" gives no lead) and is not rendered. */

const appear = (delay: `${number}s`): AppearEffect => ({
  threshold: 0.5,
  replay: false,
  enter: { opacity: 0, x: 0, y: 32, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1s", delay } },
})

/* ---------- Icons (Lucide set Y7SpbVH16cWqMhj75z1M): exact path data from each instance's icon module ----------
   Rendered 24×24, stroke = color control (White), stroke width = width control (1.4), round caps/joins. */
const svgProps = {
  viewBox: "0 0 24 24",
  xmlns: "http://www.w3.org/2000/svg",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const

/* "Workflow": TFySiAbJr */
function IconWorkflow() {
  return (
    <svg {...svgProps}>
      <path d="M 2 8 C 0.895 8 0 7.105 0 6 L 0 2 C 0 0.895 0.895 0 2 0 L 6 0 C 7.105 0 8 0.895 8 2 L 8 6 C 8 7.105 7.105 8 6 8 Z" transform="translate(3 3)" />
      <path d="M 0 0 L 0 4 C 0 5.105 0.895 6 2 6 L 6 6" transform="translate(7 11)" />
      <path d="M 2 8 C 0.895 8 0 7.105 0 6 L 0 2 C 0 0.895 0.895 0 2 0 L 6 0 C 7.105 0 8 0.895 8 2 L 8 6 C 8 7.105 7.105 8 6 8 Z" transform="translate(13 13)" />
    </svg>
  )
}

/* "Shield Check": y_nJuDo_R */
function IconShieldCheck() {
  return (
    <svg {...svgProps}>
      <path
        d="M 16 10.997 C 16 15.997 12.5 18.497 8.34 19.947 C 8.122 20.021 7.886 20.017 7.67 19.937 C 3.5 18.497 0 15.997 0 10.997 L 0 3.997 C 0 3.445 0.448 2.997 1 2.997 C 3 2.997 5.5 1.797 7.24 0.277 C 7.678 -0.097 8.322 -0.097 8.76 0.277 C 10.51 1.807 13 2.997 15 2.997 C 15.552 2.997 16 3.445 16 3.997 Z"
        transform="translate(4 2.003)"
      />
      <path d="M 0 2 L 2 4 L 6 0" transform="translate(9 10)" />
    </svg>
  )
}

/* "Scan Eye": AqjquRBS_ */
function IconScanEye() {
  return (
    <svg {...svgProps}>
      <path d="M 0 4 L 0 2 C 0 0.895 0.895 0 2 0 L 4 0" transform="translate(3 3)" />
      <path d="M 0 0 L 2 0 C 3.105 0 4 0.895 4 2 L 4 4" transform="translate(17 3)" />
      <path d="M 4 0 L 4 2 C 4 3.105 3.105 4 2 4 L 0 4" transform="translate(17 17)" />
      <path d="M 4 4 L 2 4 C 0.895 4 0 3.105 0 2 L 0 0" transform="translate(3 17)" />
      <path d="M 0 1 C 0 0.448 0.448 0 1 0 C 1.552 0 2 0.448 2 1 C 2 1.552 1.552 2 1 2 C 0.448 2 0 1.552 0 1 Z" transform="translate(11 11)" />
      <path
        d="M 13.944 5.326 C 14.019 5.112 14.019 4.88 13.944 4.666 C 12.792 1.844 10.048 0 7 0 C 3.952 0 1.208 1.844 0.056 4.666 C -0.019 4.88 -0.019 5.112 0.056 5.326 C 1.208 8.148 3.952 9.992 7 9.992 C 10.048 9.992 12.792 8.148 13.944 5.326"
        transform="translate(5 7.004)"
      />
    </svg>
  )
}

/* "Book Check": TExcZL5RQ */
function IconBookCheck() {
  return (
    <svg {...svgProps}>
      <path
        d="M 0 17.5 L 0 2.5 C 0 1.119 1.119 0 2.5 0 L 15 0 C 15.552 0 16 0.448 16 1 L 16 19 C 16 19.552 15.552 20 15 20 L 2.5 20 C 1.119 20 0 18.881 0 17.5 C 0 16.119 1.119 15 2.5 15 L 16 15"
        transform="translate(4 2)"
      />
      <path d="M 0 2 L 2 4 L 6 0" transform="translate(9 7.5)" />
    </svg>
  )
}

/* "Network": a9iijB4V5 */
function IconNetwork() {
  return (
    <svg {...svgProps}>
      <path d="M 1 6 C 0.448 6 0 5.552 0 5 L 0 1 C 0 0.448 0.448 0 1 0 L 5 0 C 5.552 0 6 0.448 6 1 L 6 5 C 6 5.552 5.552 6 5 6 Z" transform="translate(16 16)" />
      <path d="M 1 6 C 0.448 6 0 5.552 0 5 L 0 1 C 0 0.448 0.448 0 1 0 L 5 0 C 5.552 0 6 0.448 6 1 L 6 5 C 6 5.552 5.552 6 5 6 Z" transform="translate(2 16)" />
      <path d="M 1 6 C 0.448 6 0 5.552 0 5 L 0 1 C 0 0.448 0.448 0 1 0 L 5 0 C 5.552 0 6 0.448 6 1 L 6 5 C 6 5.552 5.552 6 5 6 Z" transform="translate(9 2)" />
      <path d="M 0 4 L 0 1 C 0 0.448 0.448 0 1 0 L 13 0 C 13.552 0 14 0.448 14 1 L 14 4" transform="translate(5 12)" />
      <path d="M 0 4 L 0 0" transform="translate(12 8)" />
    </svg>
  )
}

/* "Lock Open": dCmGlgkyB */
function IconLockOpen() {
  return (
    <svg {...svgProps}>
      <path d="M 2 11 C 0.895 11 0 10.105 0 9 L 0 2 C 0 0.895 0.895 0 2 0 L 16 0 C 17.105 0 18 0.895 18 2 L 18 9 C 18 10.105 17.105 11 16 11 Z" transform="translate(3 11)" />
      <path d="M 0 9.005 L 0 5.005 C -0.003 2.437 1.942 0.284 4.498 0.026 C 7.053 -0.233 9.389 1.488 9.9 4.005" transform="translate(7 1.995)" />
    </svg>
  )
}

/* ---------- ACCORD_WEBSITE_FINAL_COPY Part A "Privacy and control": six cards (REFILL-V3 slot map; icons unchanged, order as is;
   bodies capitalised at sentence start) ---------- */
type Card = {
  id: string
  icon: ReactNode
  title: string
  description: ReactNode
  delay: `${number}s`
}

const CARDS: Card[] = [
  {
    id: "TFySiAbJr",
    icon: <IconWorkflow />,
    title: "Private to each company",
    description: "Its mandate and the negotiation; only hashes leave the enclave.",
    delay: "0s",
  },
  {
    id: "y_nJuDo_R",
    icon: <IconShieldCheck />,
    title: "Visible to both companies",
    description: "The approved terms, the schedule, every payment, exception and refusal.",
    delay: "0.1s",
  },
  {
    id: "AqjquRBS_",
    icon: <IconScanEye />,
    title: "Public",
    description: "The payment schedule the contract enforces and the USDC transfers on NEAR, as with any stablecoin payment.",
    delay: "0.2s",
  },
  {
    id: "TExcZL5RQ",
    icon: <IconBookCheck />,
    title: "No recall",
    description: "Accord does not recall a signed transfer; revocation stops new authorisations and lists signed transfers for cancellation.",
    delay: "0.3s",
  },
  {
    id: "a9iijB4V5",
    icon: <IconNetwork />,
    title: "Not legal identity",
    description: "It does not verify that a company legally exists; Payee establishes control of a domain and approval by the recipient's authority.",
    delay: "0.4s",
  },
  {
    id: "dCmGlgkyB",
    icon: <IconLockOpen />,
    title: "Not fairness or truth",
    description: "It does not prove that a negotiation was fair or that external data is truthful; attestation shows which code ran on which inputs.",
    delay: "0.5s",
  },
]

/* A placeholder from links.ts renders as plain text, never as a broken link. */
function Tertiary({ href, children }: { href: string; children: ReactNode }) {
  const cls = `t-body-sm ls-link ${styles.tertiary}`
  if (isPlaceholder(href)) return <span className={cls} title={href}>{children}</span>
  if (href.startsWith("#")) return <a href={href} className={cls}>{children}</a>
  if (href.startsWith("/")) return <Link to={href} className={cls}>{children}</Link>
  return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>
}

export function Benefits() {
  return (
    <section id="privacy" className={`section ${styles.section}`}>
      {/* Dots oC813haZN: loopEffect only: opacity 1 → 0.5, mirror, 2s ease-in-out [0.44,0,0.56,1] */}
      <motion.div
        className={styles.dotsWrap}
        aria-hidden="true"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0.5 }}
        transition={{ type: "tween", ease: EASE_UI, duration: 2, repeat: Infinity, repeatType: "mirror", repeatDelay: 0 }}
      >
        <Dots className={styles.dots} />
      </motion.div>

      {/* Heading nHHnBolMG */}
      <div className={styles.heading}>
        <Appear className={styles.tag} effect={appear("0s")}>
          <span className={styles.tagIndicator} aria-hidden="true" />
          <p className={`t-body-sm ${styles.tagText}`}>Privacy and control</p>
        </Appear>
        <Appear className={styles.text} effect={appear("0.2s")}>
          <h2 className={`t-h2 ${styles.title}`}>What stays private, what is public, and what Accord does not do.</h2>
        </Appear>
      </div>

      {/* Icon Cards VC6Y4OxSB */}
      <div className={styles.cards}>
        {CARDS.map((c) => (
          <IconCard key={c.id} className={styles.card} icon={c.icon} title={c.title} description={c.description} appear={appear(c.delay)} />
        ))}
      </div>

      {/* Added (no Framer slot): the closing two sentences of the Part A paragraph (Body Large) and the Part A link
          (Body Small .ls-link) as one block under the grid, on the grid's left edge, the heading's text→link rhythm (gap 16) */}
      <Appear className={styles.closing} effect={appear("0s")}>
        <p className={`t-body-lg ${styles.closingText}`}>
          Settlement happens on NEAR itself: the contract moves the USDC, so every payment is checked and recorded in one place.
          Mainnet follows an audit.
        </p>
        <div className={styles.links}>
          <Tertiary href={LINKS.security}>Security documentation →</Tertiary>
        </div>
      </Appear>
    </section>
  )
}

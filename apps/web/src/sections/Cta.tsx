import { motion } from "motion/react"
import { EASE_APPEAR, EASE_UI, toTransition, type FramerTransition } from "../lib/motion"
import { Dots } from "../components/Dots"
import { Button } from "../components/Button"
import { Link } from "react-router-dom"
import { LINKS } from "../content/links"
import styles from "./Cta.module.css"

/* Framer "CTA" section: Desktop wg1f6L0lW (elementId "cta"), Tablet uX81zskxrwg1f6L0lW, Phone Ue6QXWSr_wg1f6L0lW
   section: horizontal stack, align center, width 1fr, maxWidth 1080, gap 16, padding 72px 0 48px, radius 2px, scrollMarginTop 40
     appearEffect y 32 → 0, opacity 0 → 1, tween 1s ease [0.12,0.23,0.5,1] (on the section itself)
     Tablet: padding 72px 24px 48px · Phone: vertical stack, padding 72px 16px 48px, order Dots → Image → Container
     Dots UbeG5R_si: absolute, right 0, bottom 0, 920×780, overflow hidden, z 0, fill dots.png
       loopEffect opacity → 0.5, mirror, tween 2s ease [0.44,0,0.56,1], repeatDelay 0, pauseOffscreen
     Container NNQSb_SQE: fill Elevation Strong, vertical, gap 32, padding 40, radius 4, overflow hidden, width 1fr, height 1fr
       (Tablet: height auto · Phone: height auto, padding 20)
       Content suJR2NcRR: vertical, gap 32, maxWidth 400, width 1fr
         Text BRU8DvWwL: vertical, gap 16, overflow hidden, width 1fr
           Tag Nn80ibhlK: horizontal, gap 8, align center: Indicator aBwWBYAz5 14×8 radius 9999 fill White + Text VvvHCzDn1 (Body Small)
           Title MaZw4lhc4 (H2) · Description xIbU1OoBi (Body Large, hard line break; removed on Phone)
         Button wLiY5ZCHM: Button (Primary) "Get started now" → https://framer.link/CsDpB9T
     Image fsOvCUx92: 480×360, radius 4, fill cta-image.png (cover)
       (Tablet: width 1fr, height 1fr, no aspect ratio · Phone: width 1fr → height from aspectRatio 1.33)
   Refill v3 (docs/website/ACCORD_WEBSITE_FINAL_COPY.md Part A "Closing"): Tag row dropped (the copy gives the band no eyebrow);
   Title/Description set verbatim (the Description keeps the template's hard line break, removed on Phone); the single Button
   becomes the two buttons in a row (gap 8, wrap): PRIMARY_CTA → LINKS.openDealRoom · `Explore Atlas` → LINKS.exploreAtlas;
   the small line (Body Small, Text Weak) is the owner's copy and always renders. */

/* Section appearEffect (threshold 0.5, replay false): same mapping as <Appear>, applied to the <section> element itself */
const SECTION_APPEAR_TRANSITION: FramerTransition = { type: "tween", ease: EASE_APPEAR, duration: "1s", delay: "0s" }

const PATHS = [
  { role: "project", kicker: "Token project", title: "Pay your market maker on measured conditions",
    text: "Put the retainer behind the spread, depth and uptime you agreed, with Accord Atlas.", cta: "Request early access" },
  { role: "market-maker", kicker: "Market maker", title: "Get paid for the liquidity you already provide",
    text: "Negotiate terms without showing your floor, and get paid when the agreed conditions are measured.", cta: "Join as a market maker" },
  { role: "partner", kicker: "Integration partner", title: "Build on Accord",
    text: "Bring your agents to a deal room, or add a deal type with its own mandate schema and release rule.", cta: "Talk to us about integrating" },
] as const

export function Cta() {
  return (
    <motion.section
      id="cta"
      className={`section ${styles.section}`}
      initial={{ opacity: 0, x: 0, y: 32, scale: 1, rotate: 0 }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={toTransition(SECTION_APPEAR_TRANSITION)}
    >
      {/* Dots UbeG5R_si: loop opacity 1 ↔ 0.5 */}
      <motion.div
        className={styles.dotsWrap}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0.5 }}
        transition={{ type: "tween", ease: EASE_UI, duration: 2, repeat: Infinity, repeatType: "mirror", repeatDelay: 0 }}
        aria-hidden="true"
      >
        <Dots className={styles.dots} />
      </motion.div>

      {/* Pre-launch destination: three paths into a deal room, each to /join with its role preselected */}
      <div className={styles.paths}>
        <div className={styles.pathsHead}>
          <h2 className={`t-h2 ${styles.title}`}>Choose your seat at the table.</h2>
          <p className={`t-body-lg ${styles.description}`}>
            Accord is pre-launch: the testnet build is under way and early access is by request. Tell us which side you are on.
          </p>
        </div>
        <div className={styles.pathGrid}>
          {PATHS.map((p) => (
            <Link key={p.role} to={`${LINKS.join}?role=${p.role}`} className={styles.path}>
              <span className={styles.pathKicker}>{p.kicker}</span>
              <span className={styles.pathTitle}>{p.title}</span>
              <span className={styles.pathText}>{p.text}</span>
              <span className={styles.pathCta}>{p.cta} <span aria-hidden="true">→</span></span>
            </Link>
          ))}
        </div>
        <div className={styles.pathFoot}>
          <Button variant="secondary" href={LINKS.exploreAtlas}>Explore Atlas</Button>
          <p className={`t-body-sm ${styles.small}`}>Runs on NEAR testnet. Mainnet follows an audit.</p>
        </div>
      </div>
    </motion.section>
  )
}

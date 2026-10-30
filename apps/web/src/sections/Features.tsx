import { motion } from "motion/react"
import { Appear, EASE_APPEAR, EASE_APPEAR_SLOW, EASE_UI, type AppearEffect } from "../lib/motion"
import { Dots } from "../components/Dots"
import { ContentCard } from "../components/ContentCard"
import styles from "./Features.module.css"

/* Framer "Features" section: Desktop ajb2sLiNW (elementId "features"), Tablet uX81zskxrajb2sLiNW, Phone Ue6QXWSr_ajb2sLiNW
   Refilled with docs/website/ACCORD_WEBSITE_FINAL_COPY.md Part A "Why these belong together" (anchor #why), per docs/website/framer-port/REFILL-V3.md.
   Copy verbatim; the tag pill is the eyebrow; the lead is the paragraph's first sentence up to the colon; the three clauses are the cards
   (first letter capitalised); the two "In Accord…" sentences are a Body Large line under the cards. Part A has no button here.
   section: vertical stack, width 1fr, maxWidth 1080, gap 64, padding 72px 0 (Tablet: gap 48, padding 72px 24px · Phone: gap 32, padding 72px 16px)
     Dots lKYFMqfkn: absolute right 0 top 0, 920×780, overflow hidden, z 0
       appearEffect  y 40 → 0, opacity 0 → 1, tween 1s delay 0.4s ease [0.12,0.23,0.17,0.99]
       loopEffect    opacity → 0.5, mirror, tween 2s ease [0.44,0,0.56,1], repeatDelay 0, pauseOffscreen
     Heading gIZp3mugo: vertical, gap 24, maxWidth 480, width 1fr
       Tag Y4pbOtatQ (appear y32 1s delay 0): Indicator s9CFTMrSa 14×8 yellow + Text f4WfMpPFe (Body Small)
       Text SLBBWhTge (appear y32 1s delay 0.2): Title kz0VUUVmp (H2) + Description XTfReVLHZ (Body Large)
     Content Cards FfCn55RGg: horizontal, gap 24, width 1fr (Phone: vertical)
       hehXLuKvS / M5z5mWu0X / Dr9qLJnUh: Content Card instances, width 1fr, appear y32 1s delay 0 / 0.2 / 0.4
     Added (no Framer slot): one Body Large closing line 24px under the card grid (one block with it), appear y32 1s. */

const appear = (delay: `${number}s`): AppearEffect => ({
  threshold: 0.5,
  replay: false,
  enter: { opacity: 0, x: 0, y: 32, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1s", delay } },
})

const DOTS_APPEAR: AppearEffect = {
  threshold: 0.1, /* 780px dots never reach 50% in a phone viewport */
  replay: false,
  enter: { opacity: 0, x: 0, y: 40, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR_SLOW, duration: "1s", delay: "0.4s" } },
}

type Card = { id: string; image: string; title: string; description: string; delay: `${number}s` }

const CARDS: Card[] = [
  {
    id: "hehXLuKvS",
    image: "/assets/content-image-1.png",
    title: "Negotiation",
    description: "A negotiation run by one company's agent exposes the other company's position to it.",
    delay: "0s",
  },
  {
    id: "M5z5mWu0X",
    image: "/assets/image.png",
    title: "Approval",
    description: "An approval kept in email gives an agent nothing it can enforce.",
    delay: "0.2s",
  },
  {
    id: "Dr9qLJnUh",
    image: "/assets/content-image-3.png",
    title: "Payment",
    description: "A payment instruction that arrives by message is what fraud imitates.",
    delay: "0.4s",
  },
]

const CHAIN = [
  { k: "Sealed Table", v: "produces the terms" },
  { k: "Both companies", v: "approve the terms" },
  { k: "Agreement controls", v: "the agent's only authority" },
  { k: "Payee", v: "the only destination it can reach" },
]

export function Features() {
  return (
    <section id="why" className={`section ${styles.section}`}>
      {/* Dots lKYFMqfkn: appear (outer) + loop (inner, starts once the appear has finished: 0.4s delay + 1s) */}
      <Appear className={styles.dotsWrap} effect={DOTS_APPEAR} aria-hidden="true">
        <motion.div
          className={styles.dotsLoop}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0.5 }}
          transition={{ type: "tween", ease: EASE_UI, duration: 2, delay: 1.4, repeat: Infinity, repeatType: "mirror", repeatDelay: 0 }}
        >
          <Dots />
        </motion.div>
      </Appear>

      {/* Heading gIZp3mugo */}
      <div className={styles.heading}>
        <Appear className={styles.tag} effect={appear("0s")}>
          <span className={styles.tagIndicator} aria-hidden="true" />
          <p className={`t-body-sm ${styles.tagText}`}>Why these belong together</p>
        </Appear>
        <Appear className={styles.text} effect={appear("0.2s")}>
          <h2 className={`t-h2 ${styles.title}`}>Negotiation, approval and payment in one place.</h2>
          <p className={`t-body-lg ${styles.description}`}>Kept in separate systems, each step leaks or breaks on its own.</p>
        </Appear>
      </div>

      {/* Content Cards FfCn55RGg + the closing line, one block (gap 24) */}
      <div className={styles.body}>
        <div className={styles.cards}>
          {CARDS.map((c) => (
            <ContentCard key={c.id} className={styles.card} image={c.image} title={c.title} description={c.description} appear={appear(c.delay)} />
          ))}
        </div>

        {/* Added (no Framer slot): the closing two sentences of the Part A paragraph, Body Large */}
        <Appear className={styles.closing} effect={appear("0s")}>
          {/* The paragraph's chain drawn as four linked steps; labels are lifted from the sentence below */}
          <ol className={styles.chain} aria-label="Each step's output is what the next step enforces">
            {CHAIN.map((c, i) => (
              <li key={c.k} className={styles.link}>
                <span className={`mono ${styles.linkNo}`}>{String(i + 1).padStart(2, "0")}</span>
                <span className={`t-h6 ${styles.linkTitle}`}>{c.k}</span>
                <span className={`t-body-sm ${styles.linkText}`}>{c.v}</span>
              </li>
            ))}
          </ol>
          <p className={`t-body-lg ${styles.closingText}`}>
            In Accord, each step's output is what the next step enforces. The Sealed Table's terms are what both companies approve, the approved
            terms are the agent's only authority, and the recipient established through Payee is the only destination that authority can reach.
          </p>
        </Appear>
      </div>
    </section>
  )
}

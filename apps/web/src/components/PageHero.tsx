import { useRef } from "react"
import { motion, useInView, type Transition } from "motion/react"
import { Appear, EASE_APPEAR, EASE_UI, toTransition } from "../lib/motion"
import { Button } from "../components/Button"
import { Dots } from "../components/Dots"
import styles from "./PageHero.module.css"

/* ------------------------------------------------------------------
   Supporting-page hero: the 404 page shell (WebPageNode Nvv2EHdv3, Main hIwfdG7eE) reused as the
   template's page heading: Dots loop, Tag pill + H1 + lead (word reveal), one row of buttons (mount appear).
   Every geometry/timing value is the 404 page's; the button row is the Hero's `.actions` (gap 8).
   Every supporting page (Product, Sealed Table, Payee, Accord Atlas, Security, Docs, Research, Demo, Record, 404)
   renders this one shell so the pill / H1 / lead / buttons share one left edge, one max-width and one rhythm.
------------------------------------------------------------------- */

/* textEffect: trigger onMount, tokenization "word", style {opacity 0, y 32px, blur 10px},
   per-word tween ease [0.12,0.23,0.5,1]; `delay` = effect delay, `stagger` = transition.delay */
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

/* Dots lrZBADRz7 loopEffect: opacity → 0.5, repeatType mirror, repeatDelay 0s, pauseOffscreen, tween 2s ease [0.44,0,0.56,1] */
function LoopingDots() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref)
  const loop: Transition = { type: "tween", ease: EASE_UI, duration: 2, delay: 0, repeat: Infinity, repeatType: "mirror", repeatDelay: 0 }
  return (
    <div className={styles.dotsClip} aria-hidden="true">
      <motion.div ref={ref} className={styles.dots} initial={{ opacity: 1 }} animate={inView ? { opacity: 0.5, transition: loop } : { opacity: 1, transition: { duration: 0 } }}>
        <Dots className={styles.dotsImg} />
      </motion.div>
    </div>
  )
}

export type PageHeroAction = { label: string; href: string; variant?: "primary" | "secondary" }

type Props = {
  /** Tag pill text (doc eyebrow) */
  pill: string
  title: string
  /** One Body Large paragraph, or several (each reveals after the previous one, the preset's 10px paragraph spacing between them) */
  lead: string | string[]
  actions?: PageHeroAction[]
  /** Section element id (default "hero") */
  id?: string
}

export function PageHero({ pill, title, lead, actions = [], id = "hero" }: Props) {
  const leads = Array.isArray(lead) ? lead : [lead]
  return (
    <section id={id} className={`section ${styles.main}`}>
      <LoopingDots />

      {/* Header SSeGtq_6G */}
      <div className={styles.header}>
        {/* Heading Egw0pPiIJ */}
        <div className={styles.heading}>
          {/* Container skz69Oqv5 */}
          <div className={styles.container}>
            {/* Tag xTobrTbFX: appearEffect onInView, threshold 0.5, {opacity 0, y 32}, tween 1s [0.12,0.23,0.5,1] */}
            <Appear className={styles.tag}>
              <div className={styles.indicator} />
              <p className={`t-body-sm ${styles.tagText}`}>{pill}</p>
            </Appear>

            {/* Text oh4XOfwzC */}
            <div className={styles.text}>
              {/* Title ehn3xrHxz: textEffect delay 0.1s, 0.8s per word, stagger 0.04s */}
              <WordReveal as="h1" className={`t-h1 ${styles.title}`} text={title} delay={0.1} duration={0.8} stagger={0.04} />
              {/* Description K_Sa5xj2O: textEffect delay 0.2s, 0.6s per word, stagger 0.04s; a second paragraph starts 0.1s later */}
              <div className={styles.lead}>
                {leads.map((t, i) => (
                  <WordReveal key={i} as="p" className={`t-body-lg ${styles.description}`} text={t} delay={0.2 + 0.1 * i} duration={0.6} stagger={0.04} />
                ))}
              </div>
            </div>
          </div>

          {/* Button row (B5NiqNbhX geometry): appearEffect onMount {opacity 0, y 24}, tween 1.4s [0.12,0.23,0.5,1] delay 0.4s */}
          {actions.length > 0 ? (
            <motion.div
              className={styles.actions}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={toTransition({ type: "tween", ease: EASE_APPEAR, duration: "1.4s", delay: "0.4s" })}
            >
              {actions.map((a) => (
                <Button key={a.label} variant={a.variant ?? "primary"} href={a.href}>{a.label}</Button>
              ))}
            </motion.div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

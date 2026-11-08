import { useEffect, useRef, useState } from "react"
import { Arrow } from "../components/Arrow"
import { motion, useInView, useReducedMotion } from "motion/react"
import { Appear, EASE_UI } from "../lib/motion"
import { REFERENCES } from "../content/references"
import dotsStyles from "../components/Dots.module.css"
import styles from "./Reviews.module.css"

/* Framer "Reviews" section (c7xnBs2_l, elementId "reviews") → "In their words" (#in-their-words), REFILL-V2 rule 6.
   Desktop: vertical stack, gap 64, padding 72px 0, width 1fr, maxWidth 1080.
   Tablet (uX81zskxrc7xnBs2_l): gap 48, padding 72px 24px, grid 2 cols.
   Phone  (Ue6QXWSr_c7xnBs2_l): gap 32, padding 72px 16px, grid 1 col.
   Children:
   - Dots i45pMDbvo: absolute right 0 / top 0, 920×780, dots.png, overflow hidden, z 0,
     loopEffect opacity → 0.5, mirror, 2s tween [0.44,0,0.56,1], pauseOffscreen.
   - Heading IDW_PNyjo (vertical, gap 24, maxWidth 480, width 1fr)
       Tag hQMlOmTGC (horizontal, gap 8, center; appear y32/1s)  → Indicator 14×8 Lime pill + "In their words" (Body Small)
       Text OIDybPoKq (vertical, gap 20; appear y32/1s delay 0.2s) → Title (H2) + Description (Body Large)
   - Testimonial Cards I5_WLVgPf (grid 3 cols, gap 16, rows fit; appear y32/1s) → 6 Testimonial card instances,
     six rows of the old brief's §4.3 People table with real photos from public/assets/people/<slug>.jpg.
     Verbatim quotes keep their marks; paraphrases carry none. The label line reads "verbatim · source" /
     "paraphrase · source", the "source" being an .ls-link-inline link to the row in references.ts.
     No footnote markers on the homepage; the §4.3 bibliography tables live on /research. */

type Card = { id: string; slug: string; name: string; position: string; kind: "verbatim" | "paraphrase"; ref: number; text: string }

const CARDS: Card[] = [
  { id: "WfU6P5iO4", slug: "illia-polosukhin", name: "Illia Polosukhin", position: "NEAR co-founder · 14 May 2026", kind: "verbatim", ref: 8,
    text: "\"Businesses will not deploy agents that expose their revenue, counterparties, or financial operations on a public ledger.\"" },
  { id: "uhx_b8IHU", slug: "illia-polosukhin", name: "Illia Polosukhin", position: "NEAR co-founder · 26 Feb 2026", kind: "paraphrase", ref: 10,
    text: "Agents should be treated as hostile by default, with policy caps that hold even if the model is compromised" },
  { id: "FXpHz9c5X", slug: "eddy-lazzarin", name: "Eddy Lazzarin", position: "a16z crypto · 28 Apr 2026", kind: "paraphrase", ref: 12,
    text: "The core unsolved problem is authorization: proving to a counterparty that an agent represents you" },
  { id: "XsFNjeSw0", slug: "haseeb-qureshi", name: "Haseeb Qureshi", position: "Dragonfly · 7 Oct 2026", kind: "paraphrase", ref: 13,
    text: "The delegation model that works is sub-cards with owner-set limits; privacy wins when it is easy" },
  { id: "WHpmrxnQt", slug: "jack-forestell", name: "Jack Forestell", position: "Visa · 30 Apr 2025", kind: "verbatim", ref: 38,
    text: "\"These agents will need to be trusted with payments, not only by users, but by banks and sellers as well.\"" },
  { id: "exUDHoYhH", slug: "simon-willison", name: "Simon Willison", position: "16 Jun 2025", kind: "paraphrase", ref: 35,
    text: "The lethal trifecta: access to private data, exposure to untrusted content, and the ability to communicate externally; combine the three and an attacker can trick the agent into sending your data to them" },
]

function sourceHref(n: number): string | undefined {
  return REFERENCES.find((r) => r.n === n)?.links[0]
}

/* Layout: the people as a list (left) beside a straight stack of their quotes (right), the research section's design:
   the selected quote in front, the one leaving slides down and tucks behind. Advances while visible; hover selects. */

export function Reviews() {
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.35 })
  const [active, setActive] = useState(0)
  const [hold, setHold] = useState(false)
  const [moved, setMoved] = useState(false)
  useEffect(() => { if (active !== 0) setMoved(true) }, [active])
  useEffect(() => {
    if (reduce || !inView || hold) return
    const t = window.setTimeout(() => setActive((a) => (a + 1) % CARDS.length), 4800)
    return () => window.clearTimeout(t)
  }, [active, reduce, inView, hold])
  return (
    <section id="in-their-words" className={`section ${styles.reviews}`}>
      {/* Dots i45pMDbvo: loopEffect: opacity 1 → 0.5, mirror, 2s, ease [0.44,0,0.56,1], pauses offscreen */}
      <motion.div
        className={`${dotsStyles.dots} ${styles.dots}`}
        aria-hidden="true"
        initial={{ opacity: 1 }}
        whileInView={{ opacity: 0.5 }}
        viewport={{ once: false, amount: "some" }}
        transition={{ type: "tween", ease: EASE_UI, duration: 2, delay: 0, repeat: Infinity, repeatType: "mirror" }}
      />

      <div className={styles.heading}>
        <Appear className={styles.tag}>
          <span className={styles.indicator} aria-hidden="true" />
          <p className="t-body-sm">In their words</p>
        </Appear>
        <Appear className={styles.text} delay={0.2}>
          <h2 className={`t-h2 ${styles.title}`}>Who has named this problem.</h2>
          <p className={`t-body-lg ${styles.description}`}>
            Verbatim where marked; everything else paraphrases the linked source.
          </p>
          <p className={`t-body-sm ${styles.disclaimer}`}>Quoted for context; no endorsement implied.</p>
        </Appear>
      </div>

      <div ref={ref} className={styles.layout}>
        <ol className={styles.people} onMouseLeave={() => setHold(false)}>
          {CARDS.map((c, i) => (
            <li key={c.id}>
              <button type="button" className={`${styles.person} ${i === active ? styles.personOn : ""}`}
                onMouseEnter={() => { setActive(i); setHold(true) }} onFocus={() => { setActive(i); setHold(true) }} onClick={() => setActive(i)}>
                <img className={styles.pAvatar} src={`/assets/people/${c.slug}.jpg`} alt="" width={36} height={36} loading="lazy" decoding="async" />
                <span className={styles.pText}><span className={styles.pName}>{c.name}</span><span className={styles.pRole}>{c.position}</span></span>
                {i === active && !reduce && !hold && inView ? <span key={active} className={styles.bar} aria-hidden="true" /> : null}
              </button>
            </li>
          ))}
        </ol>

        <div className={styles.deck}>
          {CARDS.map((c, i) => {
            const n = CARDS.length
            const k = (i - active + n) % n
            const href = sourceHref(c.ref)
            const cls = k === 0 ? styles.k0 : k === 1 ? styles.k1 : k === 2 ? styles.k2 : styles.kHide
            return (
              <figure key={k === n - 1 ? `${c.id}-${active}` : c.id} className={`${styles.quote} ${cls} ${k === n - 1 && moved ? styles.out : ""}`} aria-hidden={k !== 0}>
                <div className={styles.portrait} style={{ backgroundImage: `url(/assets/people/${c.slug}.jpg)` }} role="img" aria-label={c.name} />
                <div className={styles.qMain}>
                  <div className={styles.qTop}>
                    {c.kind === "verbatim" ? <span className={styles.qMark} aria-hidden="true">“</span> : <span />}
                    <span className={`${styles.kind} ${c.kind === "verbatim" ? styles.kindV : ""}`}>{c.kind === "verbatim" ? "Verbatim" : "Paraphrase"}</span>
                  </div>
                  <blockquote className={styles.qText}>{c.text}</blockquote>
                  <figcaption className={styles.qBy}>
                    <span className={styles.pText}>
                      <span className={styles.qName}>{c.name}</span>
                      <span className={styles.pRole}>{c.position}{href ? <> · <a className="ls-link-inline" href={href} target="_blank" rel="noreferrer" tabIndex={k === 0 ? 0 : -1}>source</a></> : null}</span>
                    </span>
                    <span className={styles.nav}>
                      <span className={styles.count}>{String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</span>
                      <button type="button" className={styles.arrow} aria-label="Previous" tabIndex={k === 0 ? 0 : -1} onClick={() => { setHold(true); setActive((active - 1 + n) % n) }}>←</button>
                      <button type="button" className={styles.arrow} aria-label="Next" tabIndex={k === 0 ? 0 : -1} onClick={() => { setHold(true); setActive((active + 1) % n) }}><Arrow className={styles.arrowIcon} /></button>
                    </span>
                  </figcaption>
                </div>
              </figure>
            )
          })}
        </div>
      </div>
    </section>
  )
}

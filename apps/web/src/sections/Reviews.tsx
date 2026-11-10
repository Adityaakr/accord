import { useEffect, useRef, useState } from "react"
import { motion, useInView, useReducedMotion } from "motion/react"
import { SectionHeading, appear } from "../components/SectionHeading"
import { Appear } from "../lib/motion"
import { REFERENCES } from "../content/references"
import styles from "./Reviews.module.css"

/* "In their words" (#in-their-words): five people who have named the problem, text only (no photos).
   Rules: no hackathon judge is quoted, pictured or named here, and nobody from NEAR, a16z crypto or
   Dragonfly leadership either, to be safe. Every quote is checked word for word
   against its source on 10 Nov 2026; "verbatim" keeps the source's punctuation, "paraphrase" carries no marks.
   Each `ref` is a row in content/references.ts (the source link). No endorsement implied.
   Layout: heading, then the names (left) and one quote card (right) on the same top line; phones put the
   card first and the names in a horizontal row. Auto-advances while in view, pauses on hover or focus. */

type Card = { slug: string; name: string; org: string; role: string; date: string; kind: "verbatim" | "paraphrase"; ref: number; text: string }

const CARDS: Card[] = [
  { slug: "jack-forestell", name: "Jack Forestell", org: "Visa", role: "Chief Product and Strategy Officer, Visa", date: "30 Apr 2025", kind: "verbatim", ref: 38,
    text: "Soon people will have AI agents browse, select, purchase and manage on their behalf. These agents will need to be trusted with payments, not only by users, but by banks and sellers as well." },
  { slug: "simon-willison", name: "Simon Willison", org: "simonwillison.net", role: "The lethal trifecta for AI agents", date: "16 Jun 2025", kind: "verbatim", ref: 35,
    text: "LLMs are unable to reliably distinguish the importance of instructions based on where they came from." },
  { slug: "michael-dewitt", name: "Michael DeWitt", org: "Walmart", role: "VP Strategic Sourcing, Walmart International, with co-authors in Harvard Business Review", date: "8 Nov 2022", kind: "verbatim", ref: 36,
    text: "Walmart, like most organizations with large procurement operations, can’t possibly conduct focused negotiations with all of its 100,000-plus suppliers." },
  { slug: "jelle-buth", name: "Jelle Buth", org: "Enflux", role: "Co-founder, market maker Enflux, to Cointelegraph", date: "16 Apr 2025", kind: "verbatim", ref: 46,
    text: "I call it information arbitrage, where the market maker very clearly understands the pros and cons of the deals but is able to put it such that it’s a benefit." },
  { slug: "jorn-lambert", name: "Jorn Lambert", org: "Mastercard", role: "Chief Product Officer, Mastercard", date: "29 Apr 2025", kind: "verbatim", ref: 39,
    text: "The launch of Mastercard Agent Pay marks our initial steps in redefining commerce in the AI era, including new merchant interfaces to distinguish trusted agents from bad actors using agentic technology." },
]

const DWELL = 7000
const pad = (n: number) => String(n).padStart(2, "0")
const sourceHref = (n: number) => REFERENCES.find((r) => r.n === n)?.links[0]

export function Reviews() {
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.35 })
  const [active, setActive] = useState(0)
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  const paused = hover || focus
  const elapsed = useRef(0)
  const bars = useRef<(HTMLSpanElement | null)[]>([])
  const n = CARDS.length

  const go = (i: number) => { elapsed.current = 0; setActive((i + n) % n) }

  /* The active name's line fills over the dwell time; it holds while paused and restarts on change. */
  useEffect(() => {
    const paint = () => bars.current.forEach((b, i) => {
      if (!b) return
      const p = i !== active ? 0 : reduce ? 1 : Math.min(1, elapsed.current / DWELL)
      b.style.setProperty("--p", String(p))
    })
    paint()
    if (reduce || !inView || paused) return
    let raf = 0, last = performance.now()
    const tick = (now: number) => {
      elapsed.current += now - last; last = now
      if (elapsed.current >= DWELL) { go(active + 1); return }
      paint(); raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduce, inView, paused])

  const c = CARDS[active]
  const href = sourceHref(c.ref)

  return (
    <section id="in-their-words" className={`section ${styles.reviews}`}>
      <SectionHeading
        eyebrow="In their words"
        accent="teal"
        title="Who has named this problem."
        lead={<>
          <p>Payment networks, a security researcher, a procurement leader and a market maker, in their own published words. Each quote links its source.</p>
          <p className={styles.disclaimer}>Quoted for context; no endorsement implied.</p>
        </>}
      />

      <Appear
        className={styles.layout}
        effect={appear("0.3s")}
      >
        <div
          ref={ref}
          className={styles.grid}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onFocus={() => setFocus(true)}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus(false) }}
        >
          <div className={styles.people} role="tablist" aria-label="People quoted">
            {CARDS.map((p, i) => (
              <button
                key={p.slug}
                type="button"
                role="tab"
                id={`words-tab-${p.slug}`}
                aria-selected={i === active}
                aria-controls="words-panel"
                tabIndex={i === active ? 0 : -1}
                className={`${styles.person} ${i === active ? styles.on : ""}`}
                onClick={() => go(i)}
                onKeyDown={(e) => {
                  const k = e.key
                  const next = k === "ArrowDown" || k === "ArrowRight" ? i + 1 : k === "ArrowUp" || k === "ArrowLeft" ? i - 1 : null
                  if (next === null) return
                  e.preventDefault(); go(next)
                  const el = document.getElementById(`words-tab-${CARDS[(next + n) % n].slug}`)
                  el?.focus()
                }}
              >
                <span className={styles.track} aria-hidden="true"><span className={styles.fill} ref={(el) => { bars.current[i] = el }} /></span>
                <span className={styles.pName}>{p.name}</span>
                <span className={styles.pMeta}>{p.org} · {p.date}</span>
              </button>
            ))}
          </div>

          <figure className={styles.card} id="words-panel" role="tabpanel" aria-labelledby={`words-tab-${c.slug}`}>
            <div className={styles.cardTop}>
              <span className={`${styles.kind} ${c.kind === "verbatim" ? styles.kindV : ""}`}>
                <span className={styles.kindDot} aria-hidden="true" />
                {c.kind === "verbatim" ? "Verbatim" : "Paraphrase"}
              </span>
              <span className={styles.count} aria-live="off">{pad(active + 1)} / {pad(n)}</span>
            </div>

            {/* All quotes share one grid cell so the card keeps the height of the longest: no jump between quotes. */}
            <div className={styles.stack}>
              {CARDS.map((q, i) => (
                <motion.div
                  key={q.slug}
                  className={styles.slide}
                  aria-hidden={i !== active}
                  initial={false}
                  animate={{ opacity: i === active ? 1 : 0, y: i === active || reduce ? 0 : 6 }}
                  transition={{ duration: reduce ? 0 : i === active ? 0.6 : 0.35, ease: [0.22, 1, 0.36, 1], delay: i === active && !reduce ? 0.12 : 0 }}
                  style={{ visibility: i === active ? "visible" : "hidden", transitionProperty: "visibility", transitionDelay: i === active ? "0s" : "0.35s" }}
                >
                  <blockquote className={styles.quote}>
                    {q.kind === "verbatim" ? <>“{q.text}”</> : q.text}
                  </blockquote>
                  <figcaption className={styles.by}>
                    <span className={styles.byName}>{q.name}</span>
                    <span className={styles.byRole}>{q.role} · {q.date}</span>
                  </figcaption>
                </motion.div>
              ))}
            </div>

            <div className={styles.cardFoot}>
              {href ? (
                <a className={styles.source} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Source for ${c.name}, ${c.date} (opens in a new tab)`}>
                  Read the source
                  <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5" /></svg>
                </a>
              ) : <span />}
              <span className={styles.nav}>
                <button type="button" className={styles.navBtn} aria-label="Previous quote" onClick={() => go(active - 1)}>
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" /></svg>
                </button>
                <button type="button" className={styles.navBtn} aria-label="Next quote" onClick={() => go(active + 1)}>
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" /></svg>
                </button>
              </span>
            </div>
          </figure>
        </div>
      </Appear>
    </section>
  )
}

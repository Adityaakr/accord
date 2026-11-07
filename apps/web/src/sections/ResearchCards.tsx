import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useInView, useReducedMotion } from "motion/react"
import { SectionHeading } from "../components/SectionHeading"
import { LINKS } from "../content/links"
import styles from "./ResearchCards.module.css"

/* Homepage "Research": one line per paper beside a 3D deck of the sources as published (screenshots of each paper's
   page, captured 30 Oct 2026, in public/research). The selected paper comes to the front with the product it informs. Cycles while visible; hover or focus selects; reduced motion stays put.
   Research cards name authors and link to the source (Part B rule); the a16z finding is paraphrased, not quoted. */

type Paper = { id: string; img: string; host: string; product: string; finding: string; who: string; venue: string; href: string }

const PAPERS: Paper[] = [
  {
    id: "ndai", img: "/research/ndai.jpg", host: "arxiv.org/abs/2502.07924", product: "Sealed Table",
    finding: "Tamper-proof programs let a seller disclose without being expropriated.",
    who: "Stephenson, Miller et al.", venue: "NDAI Agreements · arXiv 2025",
    href: "https://arxiv.org/abs/2502.07924",
  },
  {
    id: "a16z", img: "/research/a16z.jpg", host: "a16zfrontier.com", product: "Agreement controls",
    finding: "Define at the contract level what an agent can and cannot do.",
    who: "Crowley, Catalini, Hall et al.", venue: "a16z Frontier · 2026",
    href: "https://a16zfrontier.com/posts/article/5-ways-blockchains-help-ai-agents/",
  },
  {
    id: "menkveld-wang", img: "/research/mw.jpg", host: "ideas.repec.org · J. Financial Markets", product: "Market-making agreements",
    finding: "Paid liquidity obligations raised liquidity and firm value.",
    who: "Menkveld and Wang", venue: "Journal of Financial Markets · 2013",
    href: "https://doi.org/10.1016/j.finmar.2012.12.003",
  },
]

export function ResearchCards() {
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.35 })
  const [active, setActive] = useState(0)
  const [hold, setHold] = useState(false)
  const [moved, setMoved] = useState(false)
  useEffect(() => { if (active !== 0) setMoved(true) }, [active])
  useEffect(() => {
    if (reduce || !inView || hold) return
    const t = window.setTimeout(() => setActive((a) => (a + 1) % PAPERS.length), 4200)
    return () => window.clearTimeout(t)
  }, [active, reduce, inView, hold])

  return (
    <section ref={ref} id="research" className={`section ${styles.research}`}>
      <SectionHeading eyebrow="Research" title="The research behind the room." accent="teal" />

      <div className={styles.layout}>
        <ol className={styles.list} onMouseLeave={() => setHold(false)}>
          {PAPERS.map((p, i) => (
            <li key={p.id} className={`${styles.item} ${i === active ? styles.itemOn : ""}`}
              onMouseEnter={() => { setActive(i); setHold(true) }} onFocus={() => { setActive(i); setHold(true) }} onBlur={() => setHold(false)}>
              <span className={styles.num}>0{i + 1}</span>
              <div className={styles.itemBody}>
                <span className={styles.informs}>Informs {p.product}</span>
                <p className={styles.finding}>{p.finding}</p>
                <p className={styles.who}>
                  {p.who} · {p.venue} ·{" "}
                  <a className="ls-link-inline" href={p.href} target="_blank" rel="noopener noreferrer">Source</a>
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className={styles.deck} aria-label="The three sources, as published">
          {PAPERS.map((p, i) => {
            const k = (i - active + PAPERS.length) % PAPERS.length // 0 = front
            return (
              <a href={p.href} target="_blank" rel="noopener noreferrer" className={`${styles.paper} ${styles["k" + k]} ${k === PAPERS.length - 1 && moved ? styles.out : ""}`} key={`${p.id}-${k === PAPERS.length - 1 ? active : "s"}`}
                aria-label={`${p.who}, ${p.venue} (opens the source)`} tabIndex={k === 0 ? 0 : -1}
                onMouseEnter={() => { if (k !== 0) { setActive(i); setHold(true) } }}>
                <span className={styles.chrome}>
                  <span className={styles.dots}><i /><i /><i /></span>
                  <span className={styles.url}>{p.host}</span>
                </span>
                <img src={p.img} alt="" loading="lazy" className={styles.shot} />
                <span className={styles.chip}>Informs {p.product}</span>
              </a>
            )
          })}
        </div>
      </div>

      <Link className={`t-body-sm ls-link ${styles.moreLink}`} to={LINKS.research}>Explore the research →</Link>
    </section>
  )
}

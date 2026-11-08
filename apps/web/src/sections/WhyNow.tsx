import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { Appear } from "../lib/motion"
import { SectionHeading, appear } from "../components/SectionHeading"
import { AttackScene } from "../components/AttackScene"
import { LossesChart } from "../components/LossesChart"
import styles from "./WhyNow.module.css"

/* "Why now" (spec §3.7, accord-kit v6.6; copy verbatim from FINAL_COPY.md Part A "Why now").
   The case in numbers, then where each attack on a paying agent ends. Built in the template's system: SectionHeading
   pill + H2, elevation-strong tiles at radius 4, Host Grotesk, JetBrains Mono for values, teal where a term is enforced,
   refusal red only for refusals. Nothing here is live: every figure carries its year and a footnote marker that opens
   its source row on /research (ids from RESEARCH_PAGE.md Part A). It never says Accord stops cyber attacks in general. */

const IC3_2025 = "https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf"
const IC3_2023 = "https://ic3.gov/annualreport/reports/2023_ic3report.pdf"

function Fn({ n, to }: { n: number; to: string }) {
  return (
    <sup className={styles.fn}>
      <Link to={`/research#${to}`} aria-label={`Source ${n}`}>{n}</Link>
    </sup>
  )
}

type TileProps = { label: ReactNode; value: string; line: ReactNode; children?: ReactNode; className?: string; delay: `${number}s` }
function Tile({ label, value, line, children, className = "", delay }: TileProps) {
  return (
    <Appear as="div" className={`${styles.tile} ${className}`} effect={{ ...appear(delay), threshold: 0.2 }}>
      <p className={`t-body-sm ${styles.label}`}>{label}</p>
      <p className={styles.value}>{value}</p>
      <p className={`t-body-sm ${styles.line}`}>{line}</p>
      {children}
    </Appear>
  )
}

export function WhyNow() {
  return (
    <section id="why-now" className={`section ${styles.section}`} aria-labelledby="why-now-title">
      <SectionHeading eyebrow="Why now" title={<span id="why-now-title">An agent’s instructions can change. Its payment authority stays within the approved rules.</span>} accent="orange" wide />

      {/* One grid: the FBI losses chart on the left; six figures on the right in pairs (business email compromise,
          AI, crypto and forecasts), one source line under all of them. Every figure has its row on /research. */}
      <div className={styles.stats}>
        <Tile
          className={styles.lossTile}
          delay="0s"
          label={<>Losses reported to the FBI in 2025<Fn n={1} to="ic3-2025" /></>}
          value="$20.9B"
          line={<>Up from <code className="mono">$6.9B</code> in 2021<Fn n={2} to="ic3-2023" /></>}
        >
          <div className={styles.chartWrap}><LossesChart /></div>
        </Tile>
        <Tile
          delay="0.06s"
          label={<>Lost to business email compromise, 2025<Fn n={1} to="ic3-2025" /></>}
          value="$3.0B"
          line="24,768 complaints about messages that redirect or request a payment."
        />
        <Tile
          delay="0.12s"
          label={<>US organisations hit by business email compromise, 2025<Fn n={3} to="afp-2026" /></>}
          value="74%"
          line={<><code className="mono">76%</code> faced attempted or actual payments fraud.</>}
        />
        <Tile
          delay="0.18s"
          label={<>FBI complaints that referenced AI, 2025<Fn n={1} to="ic3-2025" /></>}
          value="22,364"
          line={<><code className="mono">$893M</code> in losses.</>}
        />
        <Tile
          delay="0.24s"
          label={<>Prompt injections that still worked on a browser agent<Fn n={4} to="anthropic-chrome" /></>}
          value="11.2%"
          line={<>With the maker's mitigations, in 123 tests. <code className="mono">23.6%</code> without.</>}
        />
        <Tile
          delay="0.3s"
          label={<>Stolen in crypto, 2025<Fn n={5} to="chainalysis-2025" /></>}
          value="$3.4B"
          line={<>One exchange breach was <code className="mono">$1.5B</code> of it.</>}
        />
        <Tile
          delay="0.36s"
          label={<>US fraud losses generative AI could enable by 2027<Fn n={6} to="deloitte-genai-fraud" /></>}
          value="$40B"
          line={<>A forecast, up from <code className="mono">$12.3B</code> in 2023.</>}
        />
      </div>

      <p className={`t-body-sm ${styles.source}`}>
        Sources: FBI Internet Crime Complaint Center, reports for <a href={IC3_2025} target="_blank" rel="noreferrer">2025</a> and{" "}
        <a href={IC3_2023} target="_blank" rel="noreferrer">2023</a>; AFP Payments Fraud and Control Survey 2026; Anthropic, August 2025;
        Chainalysis, December 2025; Deloitte, May 2024 (forecast). Each is on <Link to="/research#attack-trends">Research</Link>.
      </p>

      <Appear as="div" className={styles.copy} effect={{ ...appear("0s"), threshold: 0.3 }}>
        <div className={styles.worst}>
          <p className={`mono ${styles.worstLabel}`}>Worst case</p>
          <p className={styles.worstText}>
            The most a hijacked agent can do is make a payment you already approved, to the recipient you already accepted, when it falls due.
          </p>
        </div>
      </Appear>

      <Appear as="figure" className={styles.figure} effect={{ ...appear("0s"), threshold: 0.1 }}>
        <AttackScene />
        <figcaption className={`t-body-sm ${styles.caption}`}>
          <span className={styles.captionLead}>Where each attack stops.</span> Each attack ends at a check in code; the tags give the closest entry in the
          OWASP Top 10 for Agentic Applications.<Fn n={7} to="owasp-agentic-2026" />
        </figcaption>
      </Appear>

      <a href="#try" className={`t-link ${styles.tryLink}`}>Try to move the money ↓</a>
    </section>
  )
}

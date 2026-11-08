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
   its source row on /research (ids from RESEARCH_PAGE.md Part A). It never says Accord stops cyber attacks in general,
   and the companies in the May 2026 incident are named only on /research. */

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
          delay="0.1s"
          label={<>Business email compromise, 2025<Fn n={1} to="ic3-2025" /></>}
          value="$3.0B"
          line="24,768 complaints about messages that redirect or request a payment."
        />
        <Tile
          delay="0.2s"
          label={<>Complaints that referenced AI, 2025<Fn n={1} to="ic3-2025" /></>}
          value="22,364"
          line={<><code className="mono">$893M</code> in losses. The FBI notes that AI-made content is getting harder to detect and easier to make.</>}
        />
      </div>

      <p className={`t-body-sm ${styles.source}`}>
        Source: FBI Internet Crime Complaint Center, Internet Crime Reports for{" "}
        <a href={IC3_2025} target="_blank" rel="noreferrer">2025</a> and <a href={IC3_2023} target="_blank" rel="noreferrer">2023</a>.
      </p>

      {/* The second band of figures: payments are the target, fakes get cheaper, and the model alone is not the safeguard.
          Each figure is checked at its publisher (8 Nov 2026) and has its row on /research; forecasts say so. */}
      <div className={styles.more}>
        <p className={`mono ${styles.moreLabel}`}>Payments are the target, and the model is not the safeguard</p>
        <div className={styles.row}>
          <Tile
            delay="0s"
            label={<>US organisations hit by business email compromise, 2025<Fn n={3} to="afp-2026" /></>}
            value="74%"
            line={<><code className="mono">76%</code> faced attempted or actual payments fraud.</>}
          />
          <Tile
            delay="0.08s"
            label={<>Stolen in crypto, 2025<Fn n={4} to="chainalysis-2025" /></>}
            value="$3.4B"
            line={<>January to early December. One exchange breach accounted for <code className="mono">$1.5B</code>.</>}
          />
          <Tile
            delay="0.16s"
            label={<>US fraud losses generative AI could enable by 2027<Fn n={5} to="deloitte-genai-fraud" /></>}
            value="$40B"
            line={<>A forecast, up from <code className="mono">$12.3B</code> in 2023: 32% a year.</>}
          />
          <Tile
            delay="0.24s"
            label={<>Prompt injections that still worked on a browser agent<Fn n={6} to="anthropic-chrome" /></>}
            value="11.2%"
            line={<>With the maker's own mitigations, in 123 tests. <code className="mono">23.6%</code> without them.</>}
          />
        </div>
        <p className={`t-body-sm ${styles.source}`}>
          Sources: AFP Payments Fraud and Control Survey 2026; Chainalysis, December 2025; Deloitte Center for Financial Services, May 2024 (forecast);
          Anthropic, August 2025. Details on <Link to="/research#attack-trends">Research</Link>.
        </p>
      </div>

      <Appear as="div" className={styles.copy} effect={{ ...appear("0s"), threshold: 0.3 }}>
        <p className={`t-body-lg ${styles.body}`}>
          Agents now read the messages. In May 2026, a wallet bot paid an attacker tokens then valued at $150,000 to $174,000 after an AI model on X
          translated a reply written in Morse code into a transfer instruction.<Fn n={7} to="grok-bankr-incident" /> The UK's National Cyber Security
          Centre warns that prompt injection "may never be totally mitigated" and recommends deterministic safeguards outside the model.
          <Fn n={8} to="ncsc-prompt-injection" /> In Accord, the contract is that safeguard: it checks every payment against the approved terms and the
          authorised recipient.
        </p>
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
          OWASP Top 10 for Agentic Applications.<Fn n={9} to="owasp-agentic-2026" />
        </figcaption>
      </Appear>

      <a href="#try" className={`t-link ${styles.tryLink}`}>Try to move the money ↓</a>
    </section>
  )
}

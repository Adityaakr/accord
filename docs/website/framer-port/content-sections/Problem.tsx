import type { ReactNode } from "react"
import { Appear } from "../lib/motion"
import { SectionHeading, appear } from "../components/SectionHeading"
import { Mono } from "../components/Mono"
import { Ref } from "../components/Ref"
import styles from "./Problem.module.css"

/* The problem (brief §4.2, anchor #problem, accent orange).
   Heading + lead (SectionHeading, wide), three equal cards (IconCard surface, stagger 0.1s),
   the verbatim quote as a blockquote card (Elevation Medium), then the transition line.
   Copy is the brief's, set verbatim; every number is <Mono> + <Ref>. */

type Card = { title: string; density: "sm" | "lg"; body: ReactNode }

const CARDS: Card[] = [
  {
    title: "Negotiation leaks",
    density: "sm",
    body: (
      <>
        The moment you tell an agent your bottom line, whoever runs that agent has it. One-sided bots work because they see everything: Walmart's negotiates with{" "}
        <Mono>2,000</Mono>
        <Ref n={1} /> suppliers at once, closes in days what took weeks, and <Mono>75%</Mono>
        <Ref n={1} /> of suppliers prefer it. The two-sided version exists only as research and hackathon prototypes
        <Ref n={2} />, because no vendor will send its walk-away to the buyer's cloud.
      </>
    ),
  },
  {
    title: "Execution has no boundary",
    density: "lg",
    body: (
      <>
        A prompt is not a policy. On 4 May 2026 an agent-driven trading account decoded an instruction hidden in Morse code in a tweet reply and sent about <Mono>$175K</Mono>
        <Ref n={3} /> to the attacker, with no error raised. That August a coding agent deleted a founder's database.
        <Ref n={4} />
      </>
    ),
  },
  {
    title: "Payment follows the last email",
    density: "sm",
    body: (
      <>
        Spending limits stop an agent paying too much; nothing stops it paying the right amount to the wrong account. Business email compromise cost <Mono>$3.05B</Mono>
        <Ref n={5} /> across <Mono>24,768</Mono>
        <Ref n={5} /> complaints in 2025, the largest category the FBI counts. Banks fixed the human version with confirmation of payee
        <Ref n={6} />, and Europe now requires it
        <Ref n={7} />; agents have nothing.
      </>
    ),
  },
]

export function Problem() {
  return (
    <section id="problem" className={`section ${styles.section}`}>
      <SectionHeading
        eyebrow="The problem"
        title="Whose server do your agents meet on?"
        accent="orange"
        wide
        lead={
          <p>
            Every deal tool is one side's agent on that side's server. A seller's deal desk runs on the seller's; a procurement bot runs on the buyer's. When both companies have an agent, the side with more
            information wins, so every company arms its agent and every vendor hides its floor. Three things follow, and today's tools fix at most one of them, from one side.
          </p>
        }
      />

      {/* Three equal cards: IconCard surface (Elevation Strong, radius 4, padding 24px 20px), stagger 0.1s */}
      <div className={styles.cards} role="list">
        {CARDS.map((c, i) => (
          <Appear key={c.title} role="listitem" className={styles.card} effect={appear("0s")} delay={i * 0.1}>
            <div className={styles.cardHeading}>
              <span className={styles.indicator} aria-hidden="true" />
              <h5 className={`t-h5 ${styles.cardTitle}`}>{c.title}</h5>
            </div>
            <p className={`${c.density === "lg" ? "t-body-lg" : "t-body-sm"} ${styles.cardBody}`}>{c.body}</p>
          </Appear>
        ))}
      </div>

      {/* The host's sentence, verbatim (brief §9 row 8) */}
      <Appear className={styles.quoteWrap} effect={appear("0.3s")}>
        <figure className={styles.quote}>
          <blockquote className={`t-h4 ${styles.quoteText}`}>
            <p>"Businesses will not deploy agents that expose their revenue, counterparties, or financial operations on a public ledger."</p>
          </blockquote>
          <figcaption className={`t-body-sm ${styles.attribution}`}>
            Illia Polosukhin, 14 May 2026.
            <Ref n={8} /> <span className={styles.verbatim}>verbatim</span>
          </figcaption>
        </figure>
      </Appear>

      {/* Transition */}
      <Appear className={styles.transitionWrap} effect={appear("0.4s")}>
        <p className={`t-body-lg ${styles.transition}`}>Accord fixes all three in one room that neither side owns.</p>
      </Appear>
    </section>
  )
}

import type { ReactNode } from "react"
import { Appear } from "../lib/motion"
import { SectionHeading, appear } from "../components/SectionHeading"
import { Mono } from "../components/Mono"
import { Ref } from "../components/Ref"
import styles from "./InTheirWords.module.css"

/* Brief §4.3 "In their words" (anchor #named, accent yellow). Set small and dense, like a bibliography (brief §6).
   Four groups, each a .t-h6 label over a .table.table-dense with the brief's exact column headers and rows.
   Copy is verbatim from content/ACCORD_WEBSITE_README.md §4.3; numbers in <Mono> with <Ref> where the brief puts them. */

type Row = { who: ReactNode; when: ReactNode; what: ReactNode; piece: ReactNode }
type Group = { label: string; whatHeader: string; rows: Row[] }

const V = <span className={styles.verbatim}>(verbatim)</span>

const GROUPS: Group[] = [
  {
    label: "People",
    whatHeader: "What they said",
    rows: [
      {
        who: "Illia Polosukhin, NEAR co-founder",
        when: "14 May 2026",
        what: <>"Businesses will not deploy agents that expose their revenue, counterparties, or financial operations on a public ledger." {V} <Ref n={8} /></>,
        piece: "Privacy of the deal",
      },
      {
        who: "Illia Polosukhin",
        when: "26 Feb 2026",
        what: <>Agents should be treated as hostile by default, with policy caps that hold even if the model is compromised <Ref n={10} /></>,
        piece: "Terms as policy",
      },
      {
        who: "Eddy Lazzarin, a16z crypto",
        when: "28 Apr 2026",
        what: <>The core unsolved problem is authorization: proving to a counterparty that an agent represents you <Ref n={12} /></>,
        piece: "The approved mandate as the agent's authority",
      },
      {
        who: "Haseeb Qureshi, Dragonfly",
        when: "7 Oct 2026",
        what: <>The delegation model that works is sub-cards with owner-set limits; privacy wins when it is easy <Ref n={13} /></>,
        piece: "Scoped keys, private positions",
      },
      {
        who: "Haseeb Qureshi",
        when: "19 May 2025",
        what: <>Ideal disclosure of market-maker terms leaves almost no information gap; market makers are repeat players while teams launch once <Ref n={33} /></>,
        piece: "Glassbook",
      },
      {
        who: "Kain Warwick, Synthetix and Infinex",
        when: "26 Mar 2025",
        what: <>Options exercised and dumped, wash trading on tier-two venues, retainers of <Mono>$50K</Mono> to <Mono>$300K+</Mono> a month <Ref n={32} /></>,
        piece: "Glassbook",
      },
      {
        who: "Jack Forestell, Visa",
        when: "30 Apr 2025",
        what: <>"These agents will need to be trusted with payments, not only by users, but by banks and sellers as well." {V} <Ref n={38} /></>,
        piece: "Payee: trust has to come from the seller's side too",
      },
      {
        who: "Simon Willison",
        when: "16 Jun 2025",
        what: <>The lethal trifecta: private data, untrusted content, external communication; combine the three and an attacker can make the agent act <Ref n={35} /></>,
        piece: <>The open inbox: swap "exfiltrate" for "pay" and it is our threat model</>,
      },
      {
        who: "Stepan Gershuni",
        when: "2026",
        what: <>Agents finish long tasks, but more than half needed a person to step in <Ref n={14} /></>,
        piece: "The exception path",
      },
      {
        who: "Mert Mumtaz, Helius",
        when: "7 Aug 2026",
        what: <>The strongest overlap of AI and crypto is security, not agent payments; institutions want privacy tuned to policy <Ref n={34} /></>,
        piece: "Security before convenience",
      },
    ],
  },
  {
    label: "Companies",
    whatHeader: "What they did or said",
    rows: [
      {
        who: "Walmart with Pactum",
        when: "8 Nov 2022; 26 Apr 2023",
        what: <>Closing agreements with <Mono>68%</Mono> of suppliers approached (HBR); <Mono>2,000</Mono> suppliers at once, about <Mono>3%</Mono> saved, <Mono>75%</Mono> preferred it <Ref n={[36, 1]} /></>,
        piece: "One-sided negotiation works and pays; the other side's agent cannot join",
      },
      {
        who: "Google, AP2",
        when: "16 Sep 2025",
        what: <>Signed intent and cart mandates between user, agent and merchant, more than <Mono>60</Mono> partners <Ref n={15} /></>,
        piece: "The receipt is standardised; how the terms were reached and what enforces them is not",
      },
      {
        who: "OpenAI with Stripe, Agentic Commerce Protocol",
        when: "29 Sep 2025",
        what: <>"Users stay in control — they explicitly confirm each step before any action is taken." {V} <Ref n={37} /></>,
        piece: "Human approval as the norm, consumer side",
      },
      {
        who: "Mastercard, Agent Pay",
        when: "29 Apr 2025",
        what: <>"Consumers will have complete control over what the agent is allowed to purchase on their behalf" {V} <Ref n={39} /></>,
        piece: "Owner-set limits, consumer side; nothing yet for two companies",
      },
      {
        who: "Binance",
        when: "25 Mar 2026",
        what: <>Projects must disclose the market maker and the terms; profit-sharing and guaranteed returns banned <Ref n={30} /></>,
        piece: "Disclosure of terms without proof they were kept",
      },
      {
        who: "Pay.UK; STET and SEPAmail",
        when: "18 Mar 2024; 9 Oct 2025",
        what: <>Two billion confirmation-of-payee checks; verification of payee mandatory for euro instant payments <Ref n={[6, 7]} /></>,
        piece: "Confirmation of payee exists for humans, not for agents",
      },
      {
        who: "OutLayer",
        when: "docs read 29 Oct 2026",
        what: <>Allowlists, limits, multisig approvals and freeze for agent wallets <Ref n={16} /></>,
        piece: "The payer-side allowlist; Payee adds the payee's side",
      },
    ],
  },
  {
    label: "Research and whitepapers",
    whatHeader: "Finding",
    rows: [
      {
        who: "Myerson and Satterthwaite, Journal of Economic Theory",
        when: "1983",
        what: <>Bilateral trade under two-sided private information cannot be efficient, incentive-compatible, individually rational and budget-balanced at once; the remedy studied is a mechanism both sides commit to in advance <Ref n={43} /></>,
        piece: "Why the sealed table is a mechanism, not a feature",
      },
      {
        who: "Chatterjee and Samuelson, Operations Research",
        when: "1983",
        what: <>Bargaining under incomplete information: the sealed-bid double auction <Ref n={44} /></>,
        piece: "The sealed table's ancestor",
      },
      {
        who: "Bianchi, Chia, Yuksekgonul, Tagliabue, Jurafsky and Zou, NegotiationArena",
        when: "8 Feb 2024",
        what: <>LLM agents improve payoffs by about <Mono>20%</Mono> by pretending to be desperate; irrational behaviours quantified <Ref n={42} /></>,
        piece: "Why code checks the hard limits and humans approve",
      },
      {
        who: "NDAI Agreements; TEE negotiation study",
        when: "Feb 2025; Mar 2026",
        what: <>Two-sided sealed negotiation inside enclaves, as research <Ref n={2} /></>,
        piece: "The sealed table on paper",
      },
      {
        who: "OWASP Top 10 for LLM Applications",
        when: "2025",
        what: <>Prompt injection is LLM01; indirect injection arrives through external content <Ref n={41} /></>,
        piece: "The open inbox",
      },
      {
        who: "Gartner",
        when: "25 Jun 2025",
        what: <>More than <Mono>40%</Mono> of agentic AI projects will be cancelled by end of 2027, citing escalating costs, unclear business value and inadequate risk controls <Ref n={40} /></>,
        piece: "The controls gap",
      },
      {
        who: "Cong, Li, Tang and Yang, Management Science",
        when: "2023",
        what: <>Wash trading above <Mono>70%</Mono> of reported volume on unregulated venues <Ref n={29} /></>,
        piece: "Glassbook",
      },
      {
        who: "FBI Internet Crime Complaint Center",
        when: "7 Apr 2026",
        what: <>Business email compromise cost <Mono>$3.046B</Mono> across <Mono>24,768</Mono> complaints in 2025 <Ref n={5} /></>,
        piece: "Payee",
      },
    ],
  },
  {
    label: "Regulators and enforcement",
    whatHeader: "Action",
    rows: [
      {
        who: "US Department of Justice, District of Massachusetts",
        when: "9 Oct 2024; 13 Jun 2025",
        what: <>Eighteen charged, four of them market makers; Gotbit sentenced, <Mono>$23M</Mono> forfeited <Ref n={[26, 27]} /></>,
        piece: "Glassbook",
      },
      {
        who: "European Union, MiCA Title VI",
        when: "from 30 Dec 2024",
        what: <>The market-abuse regime applies to crypto, with extraterritorial reach <Ref n={28} /></>,
        piece: "Glassbook",
      },
      {
        who: "European Union, instant payments regulation",
        when: "9 Oct 2025",
        what: <>Verification of payee mandatory <Ref n={7} /></>,
        piece: "Payee",
      },
    ],
  },
]

/* Tables are taller than half a phone viewport, so the appear trigger is relaxed from the template's 0.5 to 0.2;
   the effect itself (y 32, 1s, EASE_APPEAR) is the template's. */
const tableAppear = { ...appear("0s"), threshold: 0.2 }

export function InTheirWords() {
  return (
    <section id="named" className={`section ${styles.section}`}>
      <SectionHeading
        eyebrow="In their words"
        title="Who has named this problem."
        lead="Not our framing. The people who run the chains, the funds, the exchanges, the card networks and the research groups have each named a piece of it, in public, with dates. Verbatim where marked; everything else paraphrases the linked source. Each row says which part of the room it points at."
        accent="yellow"
        wide
      />

      <div className={styles.groups}>
        {GROUPS.map((group, i) => (
          <Appear key={group.label} className={styles.group} effect={tableAppear} delay={0.1 * (i + 1)}>
            <h3 className={`t-h6 ${styles.label}`}>{group.label}</h3>
            <div className="table-wrap">
              <table className={`table table-dense ${styles.table}`}>
                <colgroup>
                  <col className={styles.colWho} />
                  <col className={styles.colWhen} />
                  <col className={styles.colWhat} />
                  <col className={styles.colPiece} />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Who</th>
                    <th scope="col">When</th>
                    <th scope="col">{group.whatHeader}</th>
                    <th scope="col">The piece it names</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row, r) => (
                    <tr key={r}>
                      <td>{row.who}</td>
                      <td className={styles.when}>{row.when}</td>
                      <td>{row.what}</td>
                      <td>{row.piece}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Appear>
        ))}
      </div>

      <Appear className={styles.closing} effect={tableAppear} delay={0.1}>
        <p className="t-body-lg">
          Every row above names one piece. Nobody has named the room: the place where two companies' agents meet, where neither position is exposed, and where the money follows the terms both sides approved. That is the gap Accord fills.
        </p>
      </Appear>
    </section>
  )
}

import type { ReactNode } from "react"
import { Appear } from "../lib/motion"
import { SectionHeading, appear } from "../components/SectionHeading"
import { Ref } from "../components/Ref"
import { Mono } from "../components/Mono"
import styles from "./Compare.module.css"

/* "Where Accord sits" (brief §4.11), anchor #compare, accent lime.
   The one comparison table on the site (brief §2 rule 9): real products, every cell defensible from the
   linked references or it says "not addressed". Copy is set verbatim from the brief. */

type Row = { label: string; cells: [ReactNode, ReactNode, ReactNode, ReactNode] }

const HEADERS: ReactNode[] = [
  <>Deal desks (Pactum, seller deal desks)</>,
  <>
    Policy wallets (OutLayer custody and similar) <Ref n={16} />
  </>,
  <>
    Signed payment mandates (Google AP2) <Ref n={15} />
  </>,
  <>Accord</>,
]

const ROWS: Row[] = [
  {
    label: "Who runs the negotiation",
    cells: ["One side's agent, on that side's server", "Not a negotiation tool", "Not a negotiation protocol", "An attested enclave neither side owns"],
  },
  {
    label: "What the counterparty sees of your mandate",
    cells: ["Everything you type", "Not applicable", "Not addressed", "Nothing; the chain holds a hash"],
  },
  {
    label: "Where the terms come from",
    cells: [
      "The desk's own rules and the other side's answers",
      "Typed by the owner's admin",
      "Signed by the user and the merchant",
      "Produced inside the enclave, checked against both mandates, approved by both humans",
    ],
  },
  {
    label: "Who sets the payout destination",
    cells: [
      "The platform or the seller",
      "The payer's admin, on an allowlist, changeable at once",
      "The merchant",
      <>
        The payee, from a domain it controls, approved by its own settlement authority, changed only after <Mono>24 h</Mono>
      </>,
    ],
  },
  {
    label: "What enforces the terms on the money",
    cells: ["Escrow release on signature", "Limits and allowlists", "Nothing on chain", "The contract: milestone, amount, payee version and destination, or refusal"],
  },
  {
    label: "After revocation",
    cells: ["Not applicable", "Freeze stops new operations", "Not applicable", "New authorisations stop at once; signed transfers are listed and burnable"],
  },
  {
    label: "Verifiable by a third party",
    cells: [
      "No",
      "Policies evaluated in a TEE",
      "Verifiable credentials",
      <>
        <Mono>outlayer-verify</Mono> on every run, every refusal an on-chain event
      </>,
    ],
  },
]

export function Compare() {
  return (
    <section id="compare" className={`section ${styles.section}`}>
      <SectionHeading
        eyebrow="Where Accord sits"
        title="One room, compared with one-sided tools."
        lead="Deal desks, policy wallets and payment mandates each solve one side of the problem, from one side's server. The table says exactly what each does and does not do; the references carry the sources."
        accent="lime"
      />

      <Appear className={`table-wrap ${styles.wrap}`} effect={{ ...appear("0.3s"), threshold: 0.2 }}>
        <table className={`table ${styles.table}`}>
          <thead>
            <tr>
              <th scope="col" className={styles.blank} />
              {HEADERS.map((h, i) => (
                <th key={i} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {row.cells.map((cell, i) => (
                  <td key={i}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Appear>

      <Appear className={`t-body-sm ${styles.footnote}`} effect={{ ...appear("0.4s"), threshold: 0.2 }}>
        Dealproof (ETHGlobal NYC) hosted a negotiation in an enclave and planned escrow release; it does not bind the output to on-chain commitments or a payee{" "}
        <Ref n={2} />. Escrow products (Safe, Request) hold funds until someone signs; the terms are not the policy.
      </Appear>
    </section>
  )
}

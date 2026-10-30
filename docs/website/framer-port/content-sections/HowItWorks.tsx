import { Appear } from "../lib/motion"
import { SectionHeading, appear } from "../components/SectionHeading"
import { Mono } from "../components/Mono"
import styles from "./HowItWorks.module.css"

/* Brief §4.5 "How it works" (#how, accent teal): headline + lead, the four states as a stepper on the
   contract line, the state table, and the line under the table. Copy verbatim from the brief. */

const STATES = ["Sealed", "Attested", "Executing", "Settled"] as const

export function HowItWorks() {
  return (
    <section id="how" className={`section ${styles.section}`}>
      <SectionHeading
        eyebrow="How it works"
        title="One room, four states."
        lead="A deal room is one agreement on NEAR that neither side owns. It moves through four states, and each move is checked by the contract, not by whichever agent happens to be in the room."
        accent="teal"
      />

      {/* Visual: four nodes on a hairline that is the contract; vertical on phone */}
      <Appear className={styles.visual} effect={appear("0s")}>
        <ol className={styles.stepper} aria-label="The four states of a deal room">
          {STATES.map((state) => (
            <li key={state} className={styles.step}>
              <span className={styles.node} aria-hidden="true" />
              <Mono className={styles.label}>{state}</Mono>
            </li>
          ))}
        </ol>
        <p className={`t-body-sm ${styles.caption}`}>The contract, not the agent, is what stops the attack.</p>
      </Appear>

      <Appear className={styles.tableBlock} effect={appear("0.1s")}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">State</th>
                <th scope="col">What happens</th>
                <th scope="col">What the other side sees</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><Mono>Sealed</Mono></td>
                <td>The buyer writes a mandate: ceiling, walk-away, schedule, caps. The vendor writes theirs. Each is encrypted in the browser to the negotiation enclave's key. Only a hash of each goes on chain.</td>
                <td>A commitment hash. Not the numbers.</td>
              </tr>
              <tr>
                <td><Mono>Attested</Mono></td>
                <td>The contract requests one run on OutLayer for this pair of commitments. Inside the enclave, two agents negotiate from the sealed mandates, calling models served in NEAR AI Cloud TEEs. Before anything leaves the enclave, code (not the model) checks the proposed terms against both mandates' hard limits. The run returns the terms plus both commitment hashes, and the contract refuses the result unless the hashes match the ones it already holds.</td>
                <td>The agreed terms, and a job id anyone can check with <Mono>outlayer-verify</Mono>.</td>
              </tr>
              <tr>
                <td><Mono>Executing</Mono></td>
                <td>Both humans approve the terms, and the buyer funds the agreement's Base address, which only the contract can obtain a signature for. From then on the approved terms are the policy: the buyer's agent holds a key that can only call <Mono>act</Mono>, and <Mono>act</Mono> refuses any payment whose amount, timing, destination or payee version differs from what was approved. The contract signs each transfer through Chain Signatures and a relayer broadcasts it on Base.</td>
                <td>Payment states and refusals on NEAR; the transfers on Base.</td>
              </tr>
              <tr>
                <td><Mono>Settled</Mono></td>
                <td>The last milestone pays, or either side terminates. The record stays: terms, payments, refusals, and every exception a human approved.</td>
                <td>A record both sides can cite.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className={`t-body-lg ${styles.closing}`}>The agent runs the agreement inside the terms. Humans set the limits, approve the terms, and approve the exceptions.</p>
      </Appear>
    </section>
  )
}

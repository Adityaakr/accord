import type { ReactNode } from "react"
import { Appear } from "../lib/motion"
import { SectionHeading, appear } from "../components/SectionHeading"
import { Mono } from "../components/Mono"
import { Ref } from "../components/Ref"
import styles from "./Security.module.css"

/* Security (brief §4.7 + §4.8), anchor #security, accent blue.
   Copy is set verbatim from content/ACCORD_WEBSITE_README.md; the §4.8 table must match GOAL.md byte for byte. */

type Row = ReactNode[]

const PIECES_HEAD = ["Piece", "Where it is", "Who can act", "What cannot happen", "Kill switch"]
const PIECES: Row[] = [
  [
    "Agreement funds",
    <>USDC at the agreement's Base address, derived through Chain Signatures. Only the contract can obtain a signature for it, and only through <Mono>act</Mono>.</>,
    "The buyer's agent, within the approved terms",
    "A transfer to anyone but the bound payee version. An amount other than the approved one. Any new signature after revocation.",
    <><Mono tone="refusal">revoke</Mono>, by the buyer</>,
  ],
  [
    "Mandates",
    "Sealed blobs. Plaintext exists only inside the negotiation enclave, during the run.",
    "The enclave, during the job",
    "The other party, the operator or the app reading them",
    "Nothing to switch off: the plaintext is gone when the run ends",
  ],
  [
    "Negotiation",
    "An OutLayer job calling models in NEAR AI Cloud TEEs; one run per pair of commitments",
    "The job",
    "Terms outside either mandate's hard limits; terms not produced by the attested run",
    "Both humans must approve the terms",
  ],
  [
    "Signed transfers",
    "Listed on the agreement with nonce and status, from the moment the signature is requested",
    "The relayer broadcasts; the buyer can burn a nonce",
    "A signed transfer going anywhere but the bound payee, at any amount but the approved one",
    <><Mono tone="refusal">burn_nonce</Mono>, by the buyer</>,
  ],
  [
    "Payee record",
    "On the contract, versioned, each version tied to a domain proof fetched inside an enclave",
    <>The vendor proposes, the vendor's settlement authority approves, a <Mono>24 h</Mono> timelock runs, the buyer accepts</>,
    "A change by one key alone; a change without a fresh domain proof",
    "The buyer can pause",
  ],
]

const PRIVACY_HEAD = ["Stays private", "Visible to the two parties", "Public"]
const PRIVACY: Row[] = [
  [
    "Your ceiling, your walk-away, your weights. The negotiation itself: only its hash leaves the enclave. The commercial terms document: encrypted to the two parties, only its hash on chain.",
    "The approved terms, the schedule, every payment, exception and refusal",
    "The payment schedule the contract enforces (amounts and dates) and the transfers on Base, as with any stablecoin payment",
  ],
]

const NOT_CLAIMED: ReactNode[] = [
  "Revocation is not a recall. It ends every new authorisation at once; a transfer already signed stays valid on Base until its nonce is used. We list those transfers and let the buyer burn the nonce. Whatever lands was authorised, to the bound payee, at the approved amount.",
  "\"Bound payee\" means control of a domain plus approval by the vendor's own settlement authority, with the hash of a company document attested. It is not a legal KYB and does not prove that a company exists.",
  "\"Sealed\" means the raw mandates never leave the enclave, under the hardware's trust assumptions. The terms you sign still show that you accepted them, as any signed deal does.",
  "Attestation proves which code ran, not that the deal was good. The code checks the hard limits; the humans decide whether to sign.",
  "The payment schedule is visible on NEAR and the transfers are visible on Base. Private settlement is on the roadmap, not on this page.",
  "Settlement status is reported by the relayer and checked by the app against Base. The contract does not verify Base receipts in v1.",
  "The demo agent is deliberately naive about instructions in email. The product is the boundary around the agent, not the agent's judgement.",
]

/* §4.8: verbatim from GOAL.md. Do not edit a character of these cells. */
const CLAIMS_HEAD = ["We claim", "Because", "Limit, stated next to it"]
const CLAIMS: Row[] = [
  [
    "The raw mandates never leave the enclave",
    "Each mandate is encrypted in the browser to the negotiation job's key; the chain holds a hash; the job runs once per pair of commitments inside an OutLayer TDX enclave whose measurement is approved on the register contract",
    "Under the hardware's trust assumptions. The final terms reveal that each side accepted them, as any signed deal does. The operator of the enclave is trusted not to break TDX, nothing more",
  ],
  [
    "The approved terms are the agent's only authority",
    <>The agent's key can call <Mono>act</Mono> and nothing else; <Mono>act</Mono> refuses any payment whose milestone, amount, payee version or destination differs from the approved terms</>,
    "The agent's judgement is not protected, only bounded. Attestation proves which code produced the terms, not that the deal was good; the humans decide that",
  ],
  [
    "Payments go only to the bound payee",
    <>The payee is a destination tied to a domain the vendor controls (proof fetched inside an enclave), approved by the vendor's settlement authority, accepted by the buyer, versioned; a change needs a fresh proof, the authority and <Mono>24 h</Mono></>,
    "\"Bound\" is not \"verified as a real business\": it proves control and authorisation, not corporate existence. A legal KYB is a v2 integration",
  ],
  [
    <><Mono>revoke</Mono> ends every new authorisation at once</>,
    "It deletes the agent's function-call key and sets the revoked flag in one transaction; the contract requests no further signatures for the agreement",
    <>Revocation is not a recall. A transfer signed before <Mono>revoke</Mono> stays valid on Base until its nonce is used; the contract lists those and the buyer can burn the nonce. Whatever lands was authorised, to the bound payee, at the approved amount</>,
  ],
  [
    "Negotiation is private, settlement is not",
    "Mandates and the transcript stay inside the enclave; the commercial terms document is encrypted to the two parties and only its hash is on chain",
    "The payment schedule the contract enforces (amounts and dates) is public on NEAR, and transfers are public on Base, as with any stablecoin payment. Settlement status is reported by the relayer and checked by the app, not proven to the contract",
  ],
]

function Table({ head, rows, label }: { head: string[]; rows: Row[]; label: string }) {
  return (
    <div className="table-wrap">
      <table className="table" aria-label={label}>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, r) => (
            <tr key={r}>
              {cells.map((c, i) => (
                <td key={i}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Security() {
  return (
    <section id="security" className={`section ${styles.section}`}>
      <SectionHeading
        eyebrow="Security"
        title="Custody, authority and limits, per piece."
        lead="Where the money and the secrets sit, who can act on them, what cannot happen, how to stop it, and what we do not claim. Stated per piece, because a promise is not a specification."
        accent="blue"
      />

      <div className={styles.blocks}>
        <Appear className={styles.block} effect={appear("0s")}>
          <Table head={PIECES_HEAD} rows={PIECES} label="Custody, authority and limits, per piece" />
        </Appear>

        <Appear className={styles.block} effect={appear("0.1s")}>
          <h3 className={`t-h4 ${styles.subheading}`}>What stays private, and what does not</h3>
          <Table head={PRIVACY_HEAD} rows={PRIVACY} label="What stays private, and what does not" />
        </Appear>

        <Appear className={styles.block} effect={appear("0.2s")}>
          <h3 className={`t-h4 ${styles.subheading}`}>What we do not claim</h3>
          <ul className={styles.list}>
            {NOT_CLAIMED.map((item, i) => (
              <li key={i} className={`t-body-lg ${styles.item}`}>{item}</li>
            ))}
          </ul>
        </Appear>

        <Appear className={styles.block} effect={appear("0.3s")}>
          <blockquote className={styles.quote}>
            <p className={`t-h5 ${styles.quoteText}`}>
              Illia Polosukhin has argued that agents should be treated as hostile by default, with policy caps that hold even when the model is compromised. Accord is what that looks like as a contract. <Ref n={10} />
            </p>
            <p className={`t-body-sm ${styles.quoteLabel}`}>paraphrase</p>
          </blockquote>
        </Appear>

        <Appear className={styles.block} effect={appear("0.4s")}>
          <h3 className={`t-h4 ${styles.subheading}`}>The five claims and their limits</h3>
          <Table head={CLAIMS_HEAD} rows={CLAIMS} label="The five claims and their limits" />
        </Appear>
      </div>
    </section>
  )
}

import { usePageMeta } from "../lib/meta"
import type { ReactNode } from "react"
import { Appear } from "../lib/motion"
import { appear } from "../components/SectionHeading"
import { PageHero } from "../components/PageHero"
import { Button } from "../components/Button"
import { Mono } from "../components/Mono"
import { LINKS } from "../content/links"
import { KitFigure } from "../components/KitFigure"
import { AttackScene } from "../components/AttackScene"
import gatesSvg from "../assets/diagrams/gates.svg?raw"
import visibilitySvg from "../assets/diagrams/visibility.svg?raw"
import styles from "./Security.module.css"

/* ------------------------------------------------------------------
   Security page (/security): the template's page hero (PageHero: pill + H1 + lead) followed by one
   content section of stacked table blocks in the template's table style.
   Copy: docs/website/ACCORD_WEBSITE_CONTENT.md A10 (hero + the Area / What to know table) and F4
   (the reporter limitation). The trust model blocks reuse the brief's (v4) wording as parked
   in docs/website/framer-port/content-sections/Security.tsx: per-piece table, privacy table, the
   "what we do not claim" bullets and the five-claims table (that one byte for byte from GOAL.md).
   No footnote markers on this page.
------------------------------------------------------------------- */

type Row = ReactNode[]

/* A10: Area / What to know */
const AREAS_HEAD = ["Area", "What to know"]
const AREAS: Row[] = [
  ["Confidential mandates", "Inputs are processed through the configured confidential execution path. Protection depends on its code, attestation, key handling and infrastructure assumptions."],
  ["Approved terms", "Parties review the deal before activation. On-chain payment conditions are public; an encrypted document does not hide fields recorded on a public chain."],
  ["Agent permissions", "The agreement restricts the supported payment operations. Deployment keys, upgrade authority and other signing paths must be disclosed separately."],
  ["Recipient authorization", "The binding process establishes domain control and destination approval. It is not legal business verification."],
  ["Revocation", "Revocation stops every new payment through the revoked agent key at once. It does not recall a payment already made."],
  ["Settlement", "Settlement is in USDC on NEAR. The contract makes each transfer itself, so payment and verification happen in the same place; the transfers are public, as with any stablecoin payment."],
]

const PIECES_HEAD = ["Piece", "Where it is", "Who can act", "What cannot happen", "Kill switch"]
const PIECES: Row[] = [
  [
    "Agreement funds",
    <>USDC (NEP-141) held in escrow by the contract on NEAR. Only the contract can move it, and only through <Mono>act</Mono>.</>,
    "The buyer's agent, within the approved terms",
    "A transfer to anyone but the bound payee version. An amount other than the approved one. Any new payment after revocation.",
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
    "The payment schedule the contract enforces (amounts and dates) and the USDC transfers on NEAR, as with any stablecoin payment",
  ],
]

const NOT_CLAIMED: ReactNode[] = [
  "Revocation is not a recall. It ends every new payment at once, but a payment already made stays made. Whatever landed was authorised, to the bound payee, at the approved amount.",
  "\"Bound payee\" means control of a domain plus approval by the vendor's own settlement authority, with the hash of a company document attested. It is not a legal KYB and does not prove that a company exists.",
  "\"Sealed\" means the raw mandates never leave the enclave, under the hardware's trust assumptions. The terms you sign still show that you accepted them, as any signed deal does.",
  "Attestation proves which code ran, not that the deal was good. The code checks the hard limits; the humans decide whether to sign.",
  "The payment schedule and the USDC transfers are visible on NEAR. Private settlement is on the roadmap, not on this page.",
  "The demo agent is deliberately naive about instructions in email. The product is the boundary around the agent, not the agent's judgement.",
]

/* Verbatim from GOAL.md. Do not edit a character of these cells. */
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
    "It deletes the agent's function-call key and sets the revoked flag in one transaction; the contract makes no further payments for the agreement",
    <>Revocation is not a recall. A payment made before <Mono>revoke</Mono> stays made. Whatever landed was authorised, to the bound payee, at the approved amount</>,
  ],
  [
    "Negotiation is private, settlement is not",
    "Mandates and the transcript stay inside the enclave; the commercial terms document is encrypted to the two parties and only its hash is on chain",
    "The payment schedule the contract enforces (amounts and dates) and the USDC transfers are public on NEAR, as with any stablecoin payment",
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

/* Tables are taller than half a phone viewport, so the in-view trigger is relaxed from the template's 0.5 to 0.2;
   the effect itself (y 32, 1s, EASE_APPEAR) is the template's. */
const blockAppear = (delay: `${number}s`) => ({ ...appear(delay), threshold: 0.2 })

export function Security() {
  usePageMeta("Accord: Security", "What stays private, what is public, and what Accord does not do.")
  return (
    <div className={styles.page}>
      <PageHero
        pill="Security"
        title="Know what is private. Inspect what is enforced."
        lead="Negotiation inputs, approved payment conditions and settlement records have different visibility and trust boundaries. Accord makes those distinctions explicit."
      />

      {/* The trust model: stacked blocks (tables, the bullet list, the reporter note, the closing button) */}
      <section id="trust" className={`section ${styles.main}`}>
        {/* A10 */}
        <Appear className={styles.block} effect={blockAppear("0s")}>
          <Table head={AREAS_HEAD} rows={AREAS} label="Trust summary: area and what to know" />
        </Appear>

        {/* Trust model (F4): the brief's per-piece table */}
        <Appear className={styles.block} effect={blockAppear("0s")}>
          <h2 className={`t-h4 ${styles.subheading}`}>Custody, authority and limits, per piece.</h2>
          <Table head={PIECES_HEAD} rows={PIECES} label="Custody, authority and limits, per piece" />
        </Appear>

        <Appear className={styles.block} effect={blockAppear("0s")}>
          <h2 className={`t-h4 ${styles.subheading}`}>What stays private, and what does not</h2>
          <KitFigure svg={visibilitySvg} minWidth={720} />
          <Table head={PRIVACY_HEAD} rows={PRIVACY} label="What stays private, and what does not" />
        </Appear>

        {/* spec v6.6 §4: threats.svg, where each attack on a paying agent ends */}
        <Appear className={styles.block} effect={blockAppear("0s")}>
          <h2 className={`t-h4 ${styles.subheading}`}>Where each attack stops</h2>
          <AttackScene />
        </Appear>

        <Appear className={styles.block} effect={blockAppear("0s")}>
          <h2 className={`t-h4 ${styles.subheading}`}>What we do not claim</h2>
          <ul className={styles.list}>
            {NOT_CLAIMED.map((item, i) => (
              <li key={i} className={`t-body-lg ${styles.item}`}>{item}</li>
            ))}
          </ul>
        </Appear>

        <Appear className={styles.block} effect={blockAppear("0s")}>
          <h2 className={`t-h4 ${styles.subheading}`}>The five claims and their limits</h2>
          <KitFigure svg={gatesSvg} minWidth={720} />
          <Table head={CLAIMS_HEAD} rows={CLAIMS} label="The five claims and their limits" />
        </Appear>

        {/* F4 + the A10 Settlement cell */}
        <Appear className={styles.note} effect={appear("0s")}>
          <h2 className={`t-h6 ${styles.label}`}>Settlement on NEAR</h2>
          <p className={`t-body-lg ${styles.noteText}`}>
            Payments settle in USDC on NEAR. The contract that checks the terms also makes the transfer, so there is no second chain to report from. Transfers are public, as with any stablecoin payment.
          </p>
        </Appear>

        <Appear className={styles.actions} effect={appear("0s")}>
          <Button variant="secondary" href={LINKS.record}>Review the execution record</Button>
        </Appear>
      </section>
    </div>
  )
}

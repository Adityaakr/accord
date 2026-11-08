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
import { GatesFlow } from "../components/GatesFlow"
import visibilitySvg from "../assets/diagrams/visibility.svg?raw"
import tl from "../styles/Timeline.module.css"
import styles from "./Security.module.css"
import { NearAiLogo } from "../components/NearAiLogo"

/* ------------------------------------------------------------------
   Security page (/security): the template's page hero (PageHero: pill + H1 + lead) followed by one
   content section of stacked table blocks in the template's table style.
   Copy: copy brief ACCORD_WEBSITE_CONTENT.md A10 (hero + the Area / What to know table). The trust model blocks
   reuse the brief's (v4) wording as parked in copy brief framer-port/content-sections/Security.tsx: per-piece
   table, privacy table and the "what we do not claim" bullets. The six-claims table is byte for byte from kit v7
   GOAL.md; the keeper block follows kit v7 ARCHITECTURE.md.
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
    <>USDC (NEP-141) in the agreement's own NEAR account, its code pinned by hash and no full-access key. Only the contract can send it: through <Mono>act</Mono>, the vendor's <Mono>claim</Mono> of an eligible payment to the authorised recipient, or the refund at <Mono>close</Mono>.</>,
    "The buyer's agent, within the approved terms",
    "A payment to anyone but the authorised recipient. An amount other than the approved one. A payment by the agent after revocation.",
    <><Mono tone="refusal">revoke_agent</Mono>, by the buyer</>,
  ],
  [
    "Mandates",
    "Encrypted in the browser to a key that exists only inside the Sealed Table; on chain only as ciphertext and a commitment hash. Plaintext exists only inside the enclave, during the run.",
    "The Sealed Table, during one negotiation",
    "The other party, the operator or the app reading them",
    "Nothing to switch off: the plaintext is gone when the run ends",
  ],
  [
    "Negotiation",
    <>An OutLayer job; the two negotiators run on <NearAiLogo /> Cloud's private inference; one run per pair of commitments</>,
    "The job",
    "Terms outside either mandate's hard limits; terms not produced by the attested run",
    "Both humans must approve the terms",
  ],
  [
    "Payee record",
    "On the contract, versioned; the recipient is a NEAR account listed in a file on the vendor's domain, fetched inside an enclave",
    <>The vendor proposes, the vendor's settlement authority approves, the buyer accepts; a change also waits <Mono>24 h</Mono></>,
    "A change by one key alone; a change without a fresh domain proof",
    "The buyer or the vendor's settlement authority can cancel a pending change",
  ],
]

const PRIVACY_HEAD = ["Stays private", "Visible to the two parties", "Public"]
const PRIVACY: Row[] = [
  [
    "Your ceiling, your walk-away, your weights. The negotiation itself: only the terms, the commitment hashes, a transcript hash and attestation references leave the enclave. The commercial terms document: encrypted to the two parties.",
    "The approved terms, the schedule, every payment, exception and refusal",
    "The enforced schedule (amounts, dates, recipient) and every payment, public on NEAR as with any stablecoin payment",
  ],
]

const NOT_CLAIMED: ReactNode[] = [
  "Revocation is not a recall. It ends the agent's authority in one transaction; a payment already made stays made, and it went to the authorised recipient at the approved amount. What the vendor has earned stays claimable by the vendor.",
  "\"Authorised recipient\" means control of a domain plus approval by the vendor's own settlement authority and acceptance by the buyer. It is not a legal KYB and does not prove that a company exists.",
  "\"Sealed\" means each mandate is readable only inside attested enclaves, under the hardware's trust assumptions. The terms you sign still show that you accepted them, as any signed deal does.",
  "Attestation proves which code ran, not that the deal was good. The code checks the hard limits; the humans decide whether to sign.",
  "The enforced schedule and every payment are public on NEAR, as with any stablecoin payment.",
  "The demo agent is deliberately naive about instructions in email. The product is the boundary around the agent, not the agent's judgement.",
]

/* Verbatim from GOAL.md ("Claims and their limits", kit v7). Do not edit a character of these cells;
   backticks in the source are rendered as <Mono> (<code>). */
const CLAIMS_HEAD = ["We claim", "Because", "Limit, stated next to it"]
const CLAIMS: Row[] = [
  [
    "Each company's mandate is readable only inside attested enclaves",
    "The browser encrypts the mandate to a key derived from a seed generated inside the Sealed Table's enclave, bound to its release build and readable only by runs an agreement requests or that publish the key's public half; the chain holds the ciphertext and a commitment hash; the two negotiators run on NEAR AI Cloud models in TEEs, and the gateway's and the model's attestations are verified with a fresh nonce",
    "Under the hardware's trust assumptions (Intel TDX, NVIDIA confidential computing) and OutLayer's keystore governance. The deployer owns the seed and the factory account, and could rebind the seed to another build or request extra runs. On testnet the job's seed condition admits any caller during an agreement's open request window, so an outside party could request extra runs then and learn bounds on the limits; restricting the seed to the agreement's own calls is the next step. Prompts reach the model through NEAR AI's attested gateway over TLS (TLS binding is not checked from inside the job), unless end-to-end encryption to the model shipped (2.3b). The browser trusts the code the app serves; the CLI is the alternative. The ciphertext stays on chain. The final terms reveal that each side accepted them, as any signed deal does. A negotiator can concede in words; code checks the numbers",
  ],
  [
    "The approved terms are the agent's only authority",
    <>The agent's only key is a function-call key on the agreement's own account that can call <Mono>act</Mono> and nothing else; <Mono>act</Mono> refuses any payment whose item, evidence, amount or recipient differs from the terms both companies approved</>,
    "The agent's judgement is bounded, not protected: it can still be fooled into asking. Attestation proves which code produced the terms, not that the deal was good; people decide that when they approve",
  ],
  [
    "Payments go only to the authorised recipient",
    "The recipient is a NEAR account listed in a file on the vendor's domain, fetched inside an enclave; the vendor's settlement authority approves it on chain and the buyer accepts it; a change needs all three again and a 24-hour delay",
    "Authorisation proves control of the domain and the authority's approval, not that the company legally exists. A legal KYB check is a later integration. Testnet agreements run in demo mode: a recipient change waits 120 s and a claim 120 s; live mode enforces at least 24 h for a recipient change and 72 h for a claim, checked by the factory and again by the agreement",
  ],
  [
    "Revoking ends the agent's authority in one transaction",
    <><Mono>revoke_agent</Mono> marks the agent's key revoked, so the contract refuses it from that receipt on, and deletes it from the agreement account in the same transaction; the account has no other key, so after the deletion lands (about one block) anything the agent signs is rejected by the network before it reaches the contract</>,
    "A payment already made stays made, and it went to the authorised recipient at the approved amount. A call that reached the chain before the revoke still runs, with every check. Revoking never cancels what the vendor has earned: an eligible payment stays claimable by the vendor",
  ],
  [
    "Negotiation is private; settlement is public",
    "Mandates and the transcript stay inside enclaves; only the terms, commitment hashes, a transcript hash and attestation references leave; the commercial terms document is encrypted to the two parties",
    "The enforced schedule (amounts, dates, recipient) and every payment are public on NEAR, as with any stablecoin payment",
  ],
  [
    "A market-making agreement's payment becomes eligible only when the agreed observations pass, unless the buyer approves an exception",
    "Each slot's time is drawn inside the observer's enclave from a seed generated there; the observation is taken at the first NEAR mainnet block after that time, signed by the observer's key, and checked by the contract against the agreed spread, depth and two-sided quoting; anyone can recompute it from an archival node",
    "A market-making agreement's observer measures the venue's liquidity, not the market maker's own orders. The deployer owns the observer's seed and could rebind it to a build that reveals slot times in advance. A slot nobody polls in time counts as unobserved, and a period that unobserved slots leave undecided, or that has conflicting observations, goes to the buyer, not to payment",
  ],
]

/* The keeper (kit v7 ARCHITECTURE.md: actors table and section 10). Liveness only; nothing here goes beyond claims 5 and 6. */
const KEEPER: ReactNode[] = [
  <>It can start negotiations whose commitments are both in, activate recipients whose delay has passed, poll the observer for each open slot and submit what it signs, close finished periods and drive <Mono>close()</Mono> for ended agreements.</>,
  "It cannot move funds, choose observations or change a result. It holds no secret that affects an outcome, and its account has full access to itself only.",
  "Every method it calls is open to anyone, so if the keeper is down a party can call the same methods from the app. A slot nobody polls counts as unobserved, and a period that unobserved slots leave undecided goes to the buyer, not to payment.",
]

/* A table as timeline rows (styles/Timeline.module.css): the first cell is the row's name, each other cell a
   labelled line under it (the label is the column's heading), so wide tables read cleanly at any width. */
function Table({ head, rows, label }: { head: string[]; rows: Row[]; label: string }) {
  return (
    <div className={`${tl.group} ${styles.tGroup}`}>
      <ol className={tl.rows} aria-label={label}>
        {rows.map((cells, r) => (
          <li key={r} className={`${tl.row} ${styles.tRow}`}>
            <span className={`mono ${tl.num}`}>{String(r + 1).padStart(2, "0")}</span>
            <div className={styles.tMain}>
              <p className={`${tl.name} ${styles.tName}`}>{cells[0]}</p>
              {cells.slice(1).map((c, i) => (
                <div key={i} className={styles.tLine}>
                  {head.length > 2 ? <p className={styles.tLabel}>{head[i + 1]}</p> : null}
                  <div className={styles.tText}>{c}</div>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* A list as numbered timeline rows */
function List({ items }: { items: ReactNode[] }) {
  return (
    <ol className={`${tl.rows} ${styles.tGroup}`}>
      {items.map((item, i) => (
        <li key={i} className={`${tl.row} ${styles.tRow}`}>
          <span className={`mono ${tl.num}`}>{String(i + 1).padStart(2, "0")}</span>
          <div className={styles.tText}>{item}</div>
        </li>
      ))}
    </ol>
  )
}

/* Tables are taller than half a phone viewport, so the in-view trigger is relaxed from the template's 0.5 to 0.2;
   the effect itself (y 32, 1s, EASE_APPEAR) is the template's. */
const blockAppear = (delay: `${number}s`) => ({ ...appear(delay), threshold: 0.2 })

export function Security() {
  usePageMeta("Accord: Security", "Every Accord claim with its limit: custody of agreement funds, what stays private, what is public, and where each attack on a paying agent stops.")
  return (
    <div className={styles.page}>
      <PageHero
        pill="Security"
        title="Know what is private. Inspect what is enforced."
        lead="Negotiation inputs, approved payment conditions and settlement records have different visibility and trust boundaries. Accord makes those distinctions explicit."
      />

      {/* The trust model: stacked blocks (tables, the bullet lists, the settlement note, the closing button) */}
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
          <List items={NOT_CLAIMED} />
        </Appear>

        <Appear className={styles.block} effect={blockAppear("0s")}>
          <h2 className={`t-h4 ${styles.subheading}`}>Claims and their limits</h2>
          <GatesFlow />
          <Table head={CLAIMS_HEAD} rows={CLAIMS} label="Claims and their limits" />
        </Appear>

        <Appear className={styles.block} effect={blockAppear("0s")}>
          <h2 className={`t-h4 ${styles.subheading}`}>What the keeper can and cannot do</h2>
          <List items={KEEPER} />
        </Appear>

        {/* The A10 Settlement cell */}
        <Appear className={styles.note} effect={appear("0s")}>
          <h2 className={`t-h6 ${styles.label}`}>Settlement on NEAR</h2>
          <p className={`t-body-lg ${styles.noteText}`}>
            Payments settle in USDC on NEAR. Each agreement's own NEAR account makes the transfer that its contract checked, so payment and checking happen in the same place. Transfers are public, as with any stablecoin payment.
          </p>
        </Appear>

        <Appear className={styles.actions} effect={appear("0s")}>
          <Button variant="secondary" href={LINKS.record}>Review the execution record</Button>
        </Appear>
      </section>
    </div>
  )
}

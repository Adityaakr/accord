import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { SectionHeading } from "../components/SectionHeading"
import { LogoMark } from "../components/Logo"
import styles from "./Compare.module.css"

/* Home · Compared with the alternatives (#compare), after Use cases (8 Nov 2026). A real <table> (caption, th scope)
   so readers, screen readers and agents get the same grid. Reviewed three ways before it shipped:
   - fairness to each alternative, checked against current docs (Safe spending-limit and roles modules, Escrow.com's
     dispute process, Coinbase CDP and Privy wallet policies);
   - every Accord cell grounded in the contract source (~/accord-app: negotiation.rs approve_terms, gates.rs check_pay,
     recipients.rs, payments.rs act, evidence.rs exceptions);
   - placement and phone layout.
   Two rows the alternatives win are kept on purpose. Marks have a shape as well as a colour: teal tick (Yes), half
   square (Partly), dashed square (No); red stays for refusals only. Phone: the table scrolls inside its card with
   the capability column pinned. */

type Mark = "yes" | "partly" | "no"
type Cell = [Mark, string?]
type Row = { cap: string; cells: [Cell, Cell, Cell, Cell, Cell] }

const COLS = ["Escrow service", "Multisig wallet", "Agent wallet with spending limits", "Plain stablecoin transfer"]

const ROWS: Row[] = [
  { cap: "Agents negotiate without revealing either side's limits",
    cells: [["yes", "Sealed Table enclave"], ["no", "no agent negotiation step"], ["no", "no negotiation step"], ["no", "no negotiation step"], ["no", "no negotiation step"]] },
  { cap: "Both companies approve the terms before money moves",
    cells: [["yes", "both approve on chain"], ["yes", "in the escrow agreement"], ["partly", "if both firms are signers"], ["no", "one owner sets limits"], ["no"]] },
  { cap: "A message cannot redirect the recipient",
    cells: [["yes", "Payee and the contract; changes wait 24 h"], ["partly", "verified payee; bank details editable"], ["partly", "signer review or a guard"], ["partly", "if an allowlist is set"], ["no", "the sender decides"]] },
  { cap: "Each payment checked against the agreed amount and milestone",
    cells: [["yes", "in the contract"], ["yes", "released on agreed terms"], ["partly", "signer review or a roles module"], ["partly", "caps, not agreement terms"], ["no"]] },
  { cap: "Payment released only on agreed evidence",
    cells: [["yes", "checked by the contract"], ["yes", "on buyer acceptance"], ["partly", "signers' judgement"], ["no"], ["no"]] },
  { cap: "An agent can pay without a person signing each payment",
    cells: [["yes", "inside the approved terms"], ["partly", "API; funding usually manual"], ["partly", "allowance or roles module"], ["yes"], ["yes", "whoever holds the key"]] },
  { cap: "Both sides can check decisions from public data",
    cells: [["yes", "on-chain events and make verify"], ["no", "private statements"], ["partly", "transactions, not reasons"], ["partly", "transactions, not policy"], ["partly", "the transaction only"]] },
  { cap: "A neutral third party resolves disputes",
    cells: [["no", "the buyer decides exceptions"], ["partly", "funds held; an arbitrator decides"], ["no"], ["no"], ["no"]] },
  { cap: "In production today",
    cells: [["no", "pre-launch"], ["yes"], ["yes"], ["yes"], ["yes"]] },
]

const WORD: Record<Mark, string> = { yes: "Yes", partly: "Partly", no: "No" }

function Mk({ c }: { c: Cell }) {
  const [m, q] = c
  return (
    <>
      <span className={`${styles.mark} ${styles[m]}`}><i aria-hidden="true" />{WORD[m]}</span>
      {q ? <><span className={styles.sr}>: </span><span className={styles.q}>{q}</span></> : null}
    </>
  )
}

const rise: AppearEffect = {
  threshold: 0.15,
  replay: false,
  enter: { opacity: 0, x: 0, y: 24, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1s", delay: "0.05s" } },
}

export function Compare() {
  return (
    <section id="compare" className={`section ${styles.section}`}>
      <SectionHeading
        eyebrow="Compared"
        accent="teal"
        wide
        title="Accord compared with the alternatives."
        lead={<p>Of five ways an agent can pay another business, only Accord keeps each side's limits sealed while agents negotiate, then lets the agent pay on its own while a contract checks each payment against terms both companies approved. Escrow services offer arbitration and are in production; Accord is pre-launch.</p>}
      />

      <Appear as="div" className={styles.card} effect={rise}>
        <div className={styles.wrap} role="region" tabIndex={0} aria-labelledby="compare-caption">
          <table className={styles.table}>
            <caption id="compare-caption" className={styles.caption}>What each option enforces when an agent pays another business</caption>
            <thead>
              <tr>
                <th scope="col" className={styles.capHead}>Capability</th>
                <th scope="col" className={styles.accord}><span className={styles.accordHead}><LogoMark size={13} />Accord</span></th>
                {COLS.map((c) => <th key={c} scope="col">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.cap}>
                  <th scope="row" className={styles.cap}>{r.cap}</th>
                  {r.cells.map((c, i) => <td key={i} className={i === 0 ? styles.accord : undefined}><Mk c={c} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.hint} data-seo-skip aria-hidden="true">Scroll sideways for the other options →</p>
      </Appear>

      <p className={styles.foot}>
        Partly means it depends on how the option is set up or who checks it. Escrow: Escrow.com's published process. Multisig: Safe with its
        modules. Agent wallets: policy engines such as Coinbase's and Privy's. Checked 8 November 2026. Accord is pre-launch: built and tested
        end to end on a local NEAR node, with the testnet release pending.
      </p>
    </section>
  )
}

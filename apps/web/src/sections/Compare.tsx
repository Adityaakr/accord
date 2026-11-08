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
   Trimmed to six rows (8 Nov 2026); the dispute row, which escrow wins, is kept on purpose. Marks have a shape as well as a colour: teal tick (Yes), half
   square (Partly), dashed square (No); red stays for refusals only. Phone: the table scrolls inside its card with
   the capability column pinned. */

type Mark = "yes" | "partly" | "no" | "na"
type Cell = [Mark, string?]
type Row = { cap: string; cells: [Cell, Cell, Cell, Cell, Cell, Cell] }

/* each category with the products checked against their docs (8 Nov 2026); AP2 from Google's announcement (Research) */
const COLS = [
  { name: "Escrow service", eg: "Escrow.com" },
  { name: "Multisig wallet", eg: "Safe" },
  { name: "Agent wallet", eg: "Coinbase CDP, Privy" },
  { name: "Payment mandates", eg: "Google AP2" },
  { name: "Stablecoin transfer", eg: "any wallet" },
]

const ROWS: Row[] = [
  { cap: "Each side's limits stay sealed while agents negotiate",
    cells: [["yes", "Sealed Table enclave"], ["no", "no negotiation step"], ["no", "no negotiation step"], ["no", "no negotiation step"], ["no", "no negotiation step"], ["no"]] },
  { cap: "Each payment checked against the agreed terms",
    cells: [["yes", "in the contract"], ["yes", "by the escrow agent"], ["partly", "signer review"], ["partly", "caps, not terms"], ["partly", "carries a signed mandate"], ["no"]] },
  { cap: "A message cannot redirect the recipient",
    cells: [["yes", "Payee and the contract"], ["partly", "payee details editable"], ["partly", "signers or a guard"], ["partly", "if allowlisted"], ["na"], ["no"]] },
  { cap: "Payment released only on agreed evidence",
    cells: [["yes", "checked by the contract"], ["yes", "on buyer acceptance"], ["partly", "signers' judgement"], ["no"], ["na"], ["no"]] },
  { cap: "An agent can pay without a person signing each payment",
    cells: [["yes", "inside the approved terms"], ["no", "funding is manual"], ["partly", "spending-limit module"], ["yes"], ["yes", "within an intent mandate"], ["yes"]] },
  { cap: "A neutral third party resolves disputes",
    cells: [["no", "the buyer decides exceptions"], ["yes", "an arbitrator decides"], ["no"], ["no"], ["na"], ["no"]] },
]

const WORD: Record<Mark, string> = { yes: "Yes", partly: "Partly", no: "No", na: "Not stated" }

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
        lead={<p>Only Accord keeps both sides' limits sealed during negotiation and lets an agent pay on its own while a contract checks every payment. Escrow offers arbitration and is in production; Accord is pre-launch.</p>}
      />

      <Appear as="div" className={styles.card} effect={rise}>
        <div className={styles.wrap} role="region" tabIndex={0} aria-labelledby="compare-caption">
          <table className={styles.table}>
            <caption id="compare-caption" className={styles.caption}>What each option enforces when an agent pays another business</caption>
            <thead>
              <tr>
                <th scope="col" className={styles.capHead}>Capability</th>
                <th scope="col" className={styles.accord}><span className={styles.accordHead}><LogoMark size={13} />Accord</span></th>
                {COLS.map((c) => <th key={c.name} scope="col">{c.name}<span className={styles.eg}>{c.eg}</span></th>)}
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
        Partly: depends on setup or who checks. Sources: Escrow.com's process, Safe and its modules, Coinbase CDP and Privy wallet policies, Google's AP2
        announcement; checked 8 November 2026. Not stated: the source does not address it. Accord is pre-launch: built and tested on a local NEAR node, testnet release pending.
      </p>
    </section>
  )
}

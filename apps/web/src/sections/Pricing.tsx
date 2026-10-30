import { Appear } from "../lib/motion"
import { SectionHeading, appear } from "../components/SectionHeading"
import { Button } from "../components/Button"
import { LINKS, PRIMARY_CTA } from "../content/links"
import styles from "./Pricing.module.css"

/* Pricing (FINAL_COPY.md FAQ "What does it cost?", the only pricing the kit states): testnet is free; planned, a flat
   fee per agreement paid by the buyer when terms are approved, and a fee per recipient authorisation paid by the
   vendor; no percentage of payment amounts. Part B: "The planned pricing in the FAQ is a plan; it stays labelled
   'planned' until set." No amounts are invented: the paid tiers say "Set before mainnet". */

type Plan = {
  name: string
  status: "Available now" | "Planned"
  price: string
  unit: string
  payer: string
  lines: string[]
  cta?: { label: string; href: string }
  featured?: boolean
}

const PLANS: Plan[] = [
  {
    name: "Testnet",
    status: "Available now",
    price: "Free",
    unit: "on NEAR testnet",
    payer: "For anyone building or evaluating",
    lines: ["Open deal rooms and negotiate", "Agreement controls and revocation", "Recipient authorisation", "Testnet USDC payments"],
    cta: { label: PRIMARY_CTA, href: LINKS.openDealRoom },
    featured: true,
  },
  {
    name: "Per agreement",
    status: "Planned",
    price: "Flat fee",
    unit: "per agreement",
    payer: "Paid by the buyer, when terms are approved",
    lines: ["One fee, whatever the payment amounts", "Covers negotiation and enforcement", "Every payment, refusal and decision on record"],
  },
  {
    name: "Per recipient",
    status: "Planned",
    price: "Flat fee",
    unit: "per recipient",
    payer: "Paid by the vendor, when its recipient is approved",
    lines: ["Domain proof and authority approval", "Reused across that vendor's agreements", "A change needs a fresh authorisation"],
  },
]

const Tick = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" /></svg>
)

export function Pricing() {
  return (
    <section id="pricing" className={`section ${styles.section}`}>
      <SectionHeading eyebrow="Pricing" title="Priced per agreement, never per payment." accent="teal"
        lead="Testnet is free. On mainnet, a flat fee per agreement and per recipient, and no percentage of what you pay." />

      <div className={styles.grid}>
        {PLANS.map((p, i) => (
          <Appear key={p.name} className={`${styles.card} ${p.featured ? styles.featured : ""}`} effect={{ ...appear(`${i * 0.1}s` as `${number}s`), threshold: 0.2 }}>
            <div className={styles.top}>
              <span className={styles.name}>{p.name}</span>
              <span className={`${styles.status} ${p.status === "Available now" ? styles.now : ""}`}>{p.status}</span>
            </div>
            <div className={styles.priceRow}>
              <span className={styles.price}>{p.price}</span>
              <span className={styles.unit}>{p.unit}</span>
            </div>
            <p className={styles.payer}>{p.payer}</p>
            <ul className={styles.lines}>
              {p.lines.map((l) => <li key={l}><span className={styles.tick}><Tick /></span>{l}</li>)}
            </ul>
            <div className={styles.foot}>
              {p.cta ? <Button variant="primary" href={p.cta.href}>{p.cta.label}</Button> : <span className={styles.later}>Amount set before mainnet</span>}
            </div>
          </Appear>
        ))}
      </div>

      <Appear className={styles.note} effect={{ ...appear("0s"), threshold: 0.3 }}>
        <div className={styles.zero}>
          <span className={styles.zeroBig}>0%</span>
          <span className={styles.zeroText}>of payment amounts, on any plan. Your retainer, invoice or grant reaches the recipient in full.</span>
        </div>
        <p className={styles.small}>Mainnet pricing is a plan, not a price list; it follows the audit. Questions about it: <a className="ls-link-inline" href={LINKS.join}>talk to us</a>.</p>
      </Appear>
    </section>
  )
}

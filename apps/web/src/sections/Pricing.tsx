import { Link } from "react-router-dom"
import { Appear } from "../lib/motion"
import { SectionHeading, appear } from "../components/SectionHeading"
import { LINKS } from "../content/links"
import styles from "./Pricing.module.css"

/* Pricing (owner's copy, 31 Oct 2026, verbatim): a developer preview, Accord Teams and Accord Atlas, all planned;
   no percentage-based Accord fee on payment amounts; production prices published before launch. */

type Plan = { name: string; price: string; status: string; text: string; cta: string; role: string; featured?: boolean }

const PLANS: Plan[] = [
  { name: "Developer preview", price: "Free testnet access", status: "Coming soon",
    text: "Explore private negotiation, payment controls and agreement records using test funds.",
    cta: "Request early access", role: "partner", featured: true },
  { name: "Accord Teams", price: "Subscription", status: "Planned",
    text: "Manage business agreements with confidential negotiation, approval workflows and controlled payments.",
    cta: "Discuss your requirements", role: "buyer" },
  { name: "Accord Atlas", price: "Per monitored market", status: "Planned",
    text: "Connect agreed liquidity conditions to payment eligibility, with a defined observation schedule and verifiable records.",
    cta: "Discuss an Atlas pilot", role: "project" },
]

export function Pricing() {
  return (
    <section id="pricing" className={`section ${styles.section}`}>
      <SectionHeading eyebrow="Pricing" title="Clear pricing for agreements, controls and monitoring." accent="teal"
        lead="Our planned pricing combines agreement management with the negotiation and monitoring your business needs. No percentage-based Accord fee on payment amounts." />

      <div className={styles.grid}>
        {PLANS.map((p, i) => (
          <Appear key={p.name} className={`${styles.card} ${p.featured ? styles.featured : ""}`} effect={{ ...appear(`${i * 0.1}s` as `${number}s`), threshold: 0.2 }}>
            <div className={styles.top}>
              <span className={styles.name}>{p.name}</span>
              <span className={`${styles.status} ${p.featured ? styles.now : ""}`}>{p.status}</span>
            </div>
            <p className={styles.price}>{p.price}</p>
            <p className={styles.text}>{p.text}</p>
            <Link to={`${LINKS.join}?role=${p.role}`} className={styles.cta}>{p.cta} <span aria-hidden="true">→</span></Link>
          </Appear>
        ))}
      </div>

      <p className={styles.small}>Production prices and included allowances will be published before launch. Network and third-party fees may apply.</p>
    </section>
  )
}

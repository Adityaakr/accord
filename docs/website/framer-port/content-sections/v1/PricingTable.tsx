import { useEffect, useState } from "react"
import { animate, motion, useMotionValue, useMotionValueEvent } from "motion/react"
import type { ReactNode } from "react"
import { Button } from "./Button"
import { Mono } from "./Mono"
import { LINKS, isPlaceholder } from "../content/links"
import styles from "./PricingTable.module.css"

/* Framer "Pricing" canvas component t25qGiMhP (299 nodes)
   Variants: Monthly GwUYNv2hn (primary) · Yearly V3OxBYECY (replica). Variant transition: spring 0.6s bounce 0.2.
   Root: vertical stack, gap 24, width 1080 (instance → 1fr), height auto.
     Container mhJ8b1kgx: horizontal, gap 12, align center, overflow hidden, width auto
       "Monthly" y9m7BAJHN (Body Large) · Switch PXnJoRnnI 36×18, border 1px Elevation Weak, radius 48, padding 4,
       vertical stack, stackAlignment start (Monthly) / end (Yearly), overflow hidden, onTap SET_VARIANT → the other variant
         Background KeWiKb1u8: 14×10 White, radius 9999 (the thumb)
       "Yearly" mmGcxWnwe (Body Large) · Badge jP0vtc88Z: border 1px Elevation Weak, radius 100, padding 4px 10px → "30% OFF" (Body Small)
     Pricing Cards a0Jt2CHXD: grid, auto-fill minmax(340px,1fr), gap 16, align start, width 1fr
       Pricing card yfWAvy0OU / qzCrheMjJ / X_hYfFsZl: fill Elevation Strong, radius 2, padding 24 24 32 24, gap 32, overflow hidden, minWidth 340
         Content (gap 20, width 100%) → Heading (gap 16) → Text (gap 12): H5 name [+ Badge "Popular" on card 2] + Body Small description
           Price (gap 4): Number Counter qpjhCcDm4G1NbFAlpMKV (mode variants, prefix "$", decimals 0, commas, tnum+zero,
             32px/1.1em/-0.04em Host Grotesk regular, Text Strong, tag h3, transition spring 1s bounce 0) + "Per user/month" (Body Small)
           Divider (fill Elevation Medium, radius 999, width 1fr)
           List (gap 12) → Item (horizontal, gap 8, align center): Check SVG 16×16 + Body Small text
         Button P90iAy18v Primary "Get started now" → https://framer.link/CsDpB9T
   Counter values: Monthly: 0 / 49 / 99 · Yearly: 0 / 39 / 79
   Refill (brief FAQ 11, §4.9 bullets, §4.10 lines): the variants become Testnet / Mainnet. Testnet counts to $0 on every card;
   Mainnet has no amount in the brief, so the counter yields to the mono text "Flat fee" / "Fee" (nothing invented).
   The "30% OFF" and "Popular" badges go (no discount, no ranking); geometry, spring and stagger stay. No sourced numbers, so no <Ref>. */

type Plan = {
  id: string
  name: string
  description: ReactNode
  descriptionBold?: boolean
  /** Number Counter value on the Testnet variant */
  testnet: number
  /** Mainnet: the brief states no amount, so the text stands where the counter would */
  mainnet: string
  per: string
  features: ReactNode[]
  button: { label: string; href: string; variant: "primary" | "secondary" }
}

const PLANS: Plan[] = [
  {
    id: "yfWAvy0OU",
    name: "Buyer",
    description: "a flat fee per agreement, paid by the buyer when the terms are approved",
    descriptionBold: true,
    testnet: 0,
    mainnet: "Flat fee",
    per: "Per agreement",
    features: [
      <>Your walk-away is never readable by the vendor, the vendor's agent, or us.</>,
      <>Payments can only go to the payee the vendor bound to its own domain and its own settlement authority approved, at the amounts you approved.</>,
      <>
        One <Mono>revoke</Mono> and the agent can authorise nothing more; anything already signed is listed, and you can cancel it before it lands.
      </>,
    ],
    button: { label: "Open a deal room", href: LINKS.openDealRoom, variant: "primary" },
  },
  {
    id: "qzCrheMjJ",
    name: "Vendor",
    description: "a fee per payee binding, paid by the vendor",
    testnet: 0,
    mainnet: "Fee",
    per: "Per payee binding",
    features: [
      <>Your floor stays sealed; the buyer sees terms, not your mandate.</>,
      <>
        A payee change needs a fresh domain proof, your settlement authority and a <Mono>24 h</Mono> timelock; one stolen key cannot redirect your receivables.
      </>,
      <>Binding happens once per domain and is reusable across agreements.</>,
    ],
    button: { label: "Verify your domain", href: LINKS.verifyDomain, variant: "secondary" },
  },
  {
    id: "X_hYfFsZl",
    name: "Glassbook",
    description: "a retainer that pays only when the order book says the market maker showed up.",
    testnet: 0,
    mainnet: "Flat fee",
    per: "Per agreement",
    features: [
      <>
        The project's mandate (maximum retainer, minimum spread, depth and uptime, required venues) and the market maker's (minimum retainer, venues covered, the KPI floor it
        will commit to) go into the room; only the terms come out.
      </>,
      <>
        An observer runs inside an enclave: it samples the venue's public order book, computes spread, depth within <Mono>1%</Mono> of mid and uptime against the terms, and
        attests the result. A period pays when <Mono>k</Mono> of <Mono>n</Mono> observation slots pass; otherwise it is withheld and a human decides.
      </>,
      <>
        The market maker's fee destination is a bound payee like any other, and <Mono>revoke</Mono> works the same way.
      </>,
    ],
    button: { label: "See a Glassbook agreement", href: LINKS.record, variant: "secondary" },
  },
]

/* Variant transition of the component (used for the thumb slide) */
const VARIANT_SPRING = { type: "spring", duration: 0.6, bounce: 0.2 } as const
/* Number Counter `transition` control */
const COUNTER_SPRING = { type: "spring", duration: 1, bounce: 0 } as const

/* Check SVG (emZS8vlb_ and siblings): exported with api.tree.toSVG */
function CheckIcon() {
  return (
    <svg className={styles.check} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="16" height="16" rx="8" fill="#232326" />
      <path d="M11.1654 5.8335L6.91536 10.1668L4.83203 8.34865" stroke="white" strokeOpacity="0.7" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const fmt = (v: number) => "$" + Math.round(v).toLocaleString("en-US")

/* Framer Number Counter (qpjhCcDm4G1NbFAlpMKV) in "variants" mode: shows `value`
   and springs to the new value whenever the variant changes it. A string `value` (Mainnet, no amount in the brief)
   is rendered as mono text in the same h3 slot; the counter only animates when a number exists. */
function Price({ value }: { value: number | string }) {
  const numeric = typeof value === "number"
  const mv = useMotionValue(numeric ? value : 0)
  const [text, setText] = useState(() => fmt(numeric ? value : 0))
  useMotionValueEvent(mv, "change", (v) => setText(fmt(v)))
  useEffect(() => {
    if (!numeric) return
    const controls = animate(mv, value, COUNTER_SPRING)
    return () => controls.stop()
  }, [mv, value, numeric])
  return <h3 className={styles.price}>{numeric ? text : <Mono>{value}</Mono>}</h3>
}

/* A placeholder from links.ts renders as text, never as a dead link (conventions rule 6). */
function CardButton({ label, href, variant }: Plan["button"]) {
  if (isPlaceholder(href)) {
    return (
      <span className={styles.buttonPlaceholder}>
        <span className="t-link">{label}</span> <Mono>{href}</Mono>
      </span>
    )
  }
  return (
    <Button variant={variant} href={href}>
      {label}
    </Button>
  )
}

export function PricingTable({ className = "" }: { className?: string }) {
  const [mainnet, setMainnet] = useState(false)

  return (
    <div className={`${styles.root} ${className}`}>
      {/* Container mhJ8b1kgx */}
      <div className={styles.toggleRow}>
        <p className={`t-body-lg ${styles.toggleLabel}`}>Testnet</p>
        {/* Switch PXnJoRnnI: onTap SET_VARIANT (Testnet ⇄ Mainnet) */}
        <button
          type="button"
          className={styles.switch}
          role="switch"
          aria-checked={mainnet}
          aria-label="Mainnet pricing"
          onClick={() => setMainnet((v) => !v)}
        >
          {/* Background KeWiKb1u8 (thumb): stackAlignment start → end = x 0 → 14 (28px content box − 14px thumb) */}
          <motion.span className={styles.thumb} initial={false} animate={{ x: mainnet ? 14 : 0 }} transition={VARIANT_SPRING} />
        </button>
        <p className={`t-body-lg ${styles.toggleLabel}`}>Mainnet</p>
        {/* Badge jP0vtc88Z "30% OFF" removed: no discount exists (brief FAQ 11) */}
      </div>

      {/* Pricing Cards a0Jt2CHXD */}
      <div className={styles.cards}>
        {PLANS.map((plan) => (
          <div key={plan.id} className={styles.card}>
            {/* Content */}
            <div className={styles.content}>
              {/* Heading */}
              <div className={styles.heading}>
                <div className={styles.text}>
                  {/* Badge "Popular" (ZYguAKrQj) removed on card 2: the brief ranks nothing */}
                  <h5 className={`t-h5 ${styles.name}`}>{plan.name}</h5>
                  <p className={`t-body-sm ${styles.description} ${plan.descriptionBold ? styles.bold : ""}`}>{plan.description}</p>
                </div>
                {/* Price */}
                <div className={styles.priceBlock}>
                  <Price value={mainnet ? plan.mainnet : plan.testnet} />
                  <p className={`t-body-sm ${styles.per}`}>{plan.per}</p>
                </div>
              </div>
              {/* Divider */}
              <div className={styles.divider} aria-hidden="true" />
              {/* List */}
              <ul className={styles.list}>
                {plan.features.map((f, i) => (
                  <li key={i} className={styles.item}>
                    <CheckIcon />
                    <p className={`t-body-sm ${styles.itemText}`}>{f}</p>
                  </li>
                ))}
              </ul>
            </div>
            <CardButton {...plan.button} />
          </div>
        ))}
      </div>
    </div>
  )
}

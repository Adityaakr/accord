import { useEffect, useRef, useState } from "react"
import { useInView } from "motion/react"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { FaqAccordion } from "../components/FaqAccordion"
import styles from "./Faq.module.css"

/* Framer "FAQ" section: Desktop JCqP92VWu (elementId "faq"), Tablet uX81zskxrJCqP92VWu, Phone Ue6QXWSr_JCqP92VWu
   section: vertical stack, width 1fr, maxWidth 1080, gap 64, padding 72px 0 48px 0, scrollMarginTop 40
            (Tablet: gap 48, padding 72px 24px 48px · Phone: gap 32, padding 72px 16px 48px)
     Heading sqXYl3Any: vertical, gap 24, maxWidth 480, width 1fr
       Tag b8ny8n4Q6 (appear y32 1s delay 0): Indicator TIJjwmEk0 14×8 Orange radius 9999 + Text Mp5VUy4As (Body Small)
       Text dwoFkqFTR (appear y32 1s delay 0.2, gap 20): Title Uh1HZpOMY (H2, hard break) + Description mi90XWxlc (Body Large, hard break)
     xiM1bErgG: instance of "FAQ Accordions" L8IXZDnoY, width 1fr, Scroll Section (Ws08GgNyu) → JCqP92VWu
       Default htNqZRV_2: horizontal stack, gap 16, transition spring 0.4s/0.2 (Tablet + Phone use variant Mobile BNGQUBhhD: vertical, gap 10)
         tC1JB91JJ "Layout Jump Preventer" code component (absolute, non-visual): not needed in React
         Column LjjlNqQud / dOcBK4qsU: vertical, gap 10, width 1fr, align center, overflow clip
           4 × FAQ Accordion instances each (the doc's eight questions, 4 + 4), all start Closed (Nf3dw3Su0), width 1fr,
           appearEffect trigger onScrollTarget (target = this section, threshold 0.5), y 32, 1s, delays below. */

const appear = (delay: `${number}s`): AppearEffect => ({
  threshold: 0.5,
  replay: false,
  enter: { opacity: 0, x: 0, y: 32, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1s", delay } },
})

/* description is plain text: it is rendered as the accordion body and emitted verbatim in the FAQPage JSON-LD (spec §9) */
type Item = { id: string; title: string; description: string; delay: number }

/* Eight questions (docs/website/ACCORD_WEBSITE_FINAL_COPY.md Part A "FAQ"), verbatim and in the doc's order.
   Column 1 = questions 1 to 4, column 2 = 5 to 8 (the template's four instances per column).
   Template appear stagger kept: column 1 starts at 0.1s, column 2 at 0.2s, +0.1s per row. */
/* Column LjjlNqQud */
const COLUMN_1: Item[] = [
  {
    id: "kekmWJJ29",
    delay: 0.1,
    title: "Who can see my mandate?",
    description:
      "No one outside the enclave. Your browser encrypts it to the Sealed Table's key, the chain stores a hash, and the enclave decrypts it for one negotiation. The other side sees the agreed terms. What the terms reveal is what any signed agreement reveals: that you were willing to accept them.",
  },
  {
    id: "PI0KF9DiP",
    delay: 0.2,
    title: "What if the model negotiates badly?",
    description:
      "You do not approve the terms. The model proposes; code checks each proposal against both mandates' limits before anything leaves the enclave; both companies approve before the terms take effect. Attestation shows which code ran, not that the deal was good. That judgement stays with people.",
  },
  {
    id: "tuv5kKBnl",
    delay: 0.3,
    title: "What if my agent is tricked?",
    description:
      "Assume it will be. The demonstration agent follows a spoofed request for new bank details and tries to pay. The contract refuses because the destination is not the authorised recipient, and refuses again when the amount is changed. The agent's judgement is not what protects the money; the contract's comparison is.",
  },
  {
    id: "BtWpA9vpz",
    delay: 0.4,
    title: "Our vendor really did change banks. What happens?",
    description:
      "The vendor proposes the new destination, the enclave fetches a fresh domain proof, the vendor's settlement authority approves, a 24-hour delay runs, and the buyer sees each step before the first payment to the new destination. One stolen key, on either side, cannot do it.",
  },
]
/* Column dOcBK4qsU */
const COLUMN_2: Item[] = [
  {
    id: "kZiqr8pYb",
    delay: 0.2,
    title: "How does Accord Atlas decide whether a period pays?",
    description:
      "The approved terms set the venue, the observation schedule, the maximum spread, the minimum depth and the required uptime. An observer in an attested enclave records each slot. A period pays when the agreed number of slots pass; otherwise it is withheld and people on both sides decide. Atlas currently measures the venue's order book, not the market maker's own orders.",
  },
  {
    id: "hvppU845s",
    delay: 0.3,
    title: "Can we use Accord if the other side has no agent?",
    description:
      "Yes. In one-sided mode a person on the vendor side negotiates through the application against the buyer's agent. The buyer's mandate stays sealed from them, and everything after approval works the same way.",
  },
  {
    id: "clXWYfiDG",
    delay: 0.4,
    title: "What does it cost?",
    description:
      "Testnet is free. Planned pricing: a flat fee per agreement paid by the buyer when terms are approved, and a fee per recipient authorisation paid by the vendor. No percentage of payment amounts.",
  },
  {
    id: "e7MnSyaRM",
    delay: 0.5,
    title: "Is it live?",
    description:
      "Accord runs on NEAR testnet, with settlement in USDC on NEAR. The demonstration agreements on this page are live unless marked recorded. Mainnet follows an audit.",
  },
]

/* FAQPage structured data (spec §9): one <script type="application/ld+json" id="faq-jsonld"> in <head>,
   built from the eight Q&As as plain text. Appended on first mount, updated in place after that. */
const FAQ_JSONLD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [...COLUMN_1, ...COLUMN_2].map((item) => ({
    "@type": "Question",
    name: item.title,
    acceptedAnswer: { "@type": "Answer", text: item.description },
  })),
})

export function Faq() {
  const sectionRef = useRef<HTMLElement>(null)
  /* appearEffect trigger "onScrollTarget": the accordions animate in once the FAQ section itself is in view.
     Framer threshold 0.5; capped at 0.3 so the section (taller than a phone viewport) can still trigger. */
  const inView = useInView(sectionRef, { once: true, amount: 0.3 })
  /* Spec §3.11 / §5 Accordion: one open at a time. Opening an item closes the others; clicking the open one closes it. */
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    let script = document.getElementById("faq-jsonld") as HTMLScriptElement | null
    if (!script) {
      script = document.createElement("script")
      script.id = "faq-jsonld"
      script.type = "application/ld+json"
      document.head.appendChild(script)
    }
    script.textContent = FAQ_JSONLD
  }, [])

  return (
    <section id="faq" ref={sectionRef} className={`section ${styles.section}`}>
      {/* Heading sqXYl3Any */}
      <div className={styles.heading}>
        {/* Tag b8ny8n4Q6 */}
        <Appear className={styles.tag} effect={appear("0s")}>
          <span className={styles.indicator} aria-hidden="true" />
          <p className="t-body-sm">FAQ</p>
        </Appear>
        {/* Text dwoFkqFTR */}
        <Appear className={styles.text} effect={appear("0.2s")}>
          <h2 className={`t-h2 ${styles.title}`}>Questions.</h2>
          {/* Description mi90XWxlc: the doc gives no FAQ description, so the element is dropped */}
        </Appear>
      </div>

      {/* FAQ Accordions xiM1bErgG (L8IXZDnoY Default / Mobile) */}
      <div className={styles.accordions}>
        {[COLUMN_1, COLUMN_2].map((column, i) => (
          <div key={i} className={styles.column}>
            {column.map((item) => (
              <FaqAccordion
                key={item.id}
                title={item.title}
                description={item.description}
                inView={inView}
                delay={item.delay}
                open={openId === item.id}
                onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

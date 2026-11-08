import { useEffect, useRef, useState } from "react"
import { useInView } from "motion/react"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { FaqAccordion } from "../components/FaqAccordion"
import { NearAiLogo } from "../components/NearAiLogo"
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

/* Eight questions (copy brief ACCORD_WEBSITE_FINAL_COPY.md Part A "FAQ"), verbatim and in the doc's order.
   Column 1 = questions 1 to 4, column 2 = 5 to 8 (the template's four instances per column).
   Template appear stagger kept: column 1 starts at 0.1s, column 2 at 0.2s, +0.1s per row. */
/* Column LjjlNqQud */
const COLUMN_1: Item[] = [
  {
    id: "kekmWJJ29",
    delay: 0.1,
    title: "Who can see my mandate?",
    description:
      "No one outside the attested enclaves that run the negotiation. Your browser encrypts it to a key that exists only inside the Sealed Table, the chain stores the ciphertext and a hash, and the Sealed Table decrypts it for one negotiation, in which the negotiators run on NEAR AI Cloud's private inference. The other side sees the agreed terms. What the terms reveal is what any signed agreement reveals: that you were willing to accept them. This rests on the enclave hardware, on your browser running the published code (the command-line tool is the alternative), and on the operator never moving the key to a different build.",
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
      "Assume it will be. The demonstration agent follows a spoofed request for new bank details and tries to pay. The contract refuses because the account is not the authorised recipient, and refuses again when the amount is changed. The agent's judgement is not what protects the money; the contract's comparison is.",
  },
  {
    id: "BtWpA9vpz",
    delay: 0.4,
    title: "Our vendor really did change banks. What happens?",
    description:
      "The vendor proposes the new account, an enclave fetches a fresh domain proof, the vendor's settlement authority approves, the buyer accepts, and a 24-hour delay runs before the first payment can reach it. One stolen key, on either side, cannot do it.",
  },
]
/* Column dOcBK4qsU */
const COLUMN_2: Item[] = [
  {
    id: "kZiqr8pYb",
    delay: 0.2,
    title: "How does a market-making agreement decide whether a period pays?",
    description:
      "The approved terms set the venue, the number of observation slots, the maximum spread, the minimum depth and the threshold. An observer in an attested enclave draws each slot's time from a seed generated inside it and reads the pool at the first block after that time, so anyone can recompute the reading. A slot passes when it meets every condition. When the agreed number of slots pass, the period's payment becomes eligible and still goes through the same payment controls as any other payment; otherwise it is withheld, or goes to the buyer if unobserved slots could have changed the result. The observer also reports uptime: the share of observed slots in which the pool quoted both sides. Two limits: the observer measures the pool's liquidity, not the market maker's own positions, and the hidden times rest on the operator never moving the observer's seed to a build that reveals them.",
  },
  {
    id: "hvppU845s",
    delay: 0.3,
    title: "Can we use Accord if the other side has no agent?",
    description:
      "Yes. Every negotiation in the Sealed Table runs between two negotiators built from the two mandates, so a person who writes a mandate in the application takes part exactly as a company with its own agent does. Their limits stay sealed from the other side, and everything after approval works the same way.",
  },
  {
    id: "clXWYfiDG",
    delay: 0.4,
    title: "What does it cost?",
    description:
      "Testnet use is free and uses test funds. Planned pricing: an Accord Teams subscription for managing business agreements, and market-making agreements priced per monitored market. No percentage-based Accord fee on payment amounts. Production prices and included allowances will be published before launch; network and third-party fees may apply.",
  },
  {
    id: "e7MnSyaRM",
    delay: 0.5,
    title: "Is it live?",
    description:
      "On NEAR testnet, yes. The full flow ran on agreement a6.accord-v2.testnet: both sides sealed their limits, the Sealed Table negotiated inside an attested enclave, both companies approved, the buyer funded, the agent paid, a redirected payment was refused and the agent was revoked. Settlement on testnet uses a test USDC token. Mainnet follows an audit.",
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

/* The answers stay plain strings (the FAQ JSON-LD reads them); on the page, "NEAR AI" shows as NEAR AI's logo. */
function withNearAi(text: string) {
  const parts = text.split("NEAR AI")
  return parts.flatMap((part, i) => (i === 0 ? [part] : [<NearAiLogo key={i} />, part]))
}

export function Faq() {
  const sectionRef = useRef<HTMLElement>(null)
  /* appearEffect trigger "onScrollTarget": the accordions animate in once the FAQ section itself is in view.
     Framer threshold 0.5; capped at 0.3 so the section (taller than a phone viewport) can still trigger. */
  const inView = useInView(sectionRef, { once: true, amount: 0.1 })
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
                description={withNearAi(item.description)}
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

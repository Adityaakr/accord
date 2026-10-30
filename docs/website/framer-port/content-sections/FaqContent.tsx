import { useRef, type ReactNode } from "react"
import { useInView } from "motion/react"
import { FaqAccordion } from "../components/FaqAccordion"
import { SectionHeading } from "../components/SectionHeading"
import { Mono } from "../components/Mono"
import { Ref } from "../components/Ref"
import styles from "./Faq.module.css"

/* FAQ (brief §4.13), anchor #faq, accent yellow.
   Layout is the template's "FAQ Accordions" (L8IXZDnoY): two columns of accordions on desktop
   (gap 16, each column vertical gap 10), one column on tablet and phone (variant "Mobile" BNGQUBhhD).
   Accordions appear once the section scrolls into view, staggered 0.1s per item (template timings). */

type Item = { title: string; description: ReactNode }

/* Twelve questions, verbatim and in the brief's order. Column 1 = questions 1 to 6, column 2 = 7 to 12. */
const COLUMN_1: Item[] = [
  {
    title: "Isn't this three products stapled together?",
    description: (
      <>
        No. It is one agreement with three stages, and the output of each stage is the input the next stage enforces. The sealed table's
        terms become the contract's policy; the policy names the bound payee; the payee binding is what the kill switch protects. Remove any
        stage and a business cannot hand the agent a budget: the negotiation leaks, or the execution is unbounded, or the payment is
        misdirected.
      </>
    ),
  },
  {
    title: "Who can see my mandate?",
    description: (
      <>
        Nobody outside the enclave. Your browser encrypts it to the negotiation job's key; the chain stores a hash; the job decrypts it inside
        a TDX enclave for one run, and the plaintext is gone when the run ends. The other side sees the terms. What the terms reveal about
        your mandate is what any signed deal reveals: that you were willing to accept it.
      </>
    ),
  },
  {
    title: "What if the model negotiates badly?",
    description: (
      <>
        Then you do not sign. The model proposes; code inside the enclave checks the proposal against both mandates' hard limits before
        anything leaves; both humans approve the terms before they become policy. Attestation tells you which code ran, not that the deal
        was good, which is why the approval step is a human. It is also why there is an exception path: in practice, more than half of long
        agent tasks have needed a person to step in. <Ref n={14} />
      </>
    ),
  },
  {
    title: "What if my agent gets tricked?",
    description: (
      <>
        We assume it will. The demo agent follows a spoofed "new bank details" email and tries to pay the attacker. The contract refuses
        because the destination is not the bound payee, and refuses again when the amount is altered, because the amount is not the approved
        one. Decoy destinations in the agent's memory trip <Mono>revoke</Mono>. The agent's judgement is not what protects the money; the
        contract's comparison is. <Ref n={10} />
      </>
    ),
  },
  {
    title: "The vendor really did change banks. What then?",
    description: (
      <>
        The vendor proposes the new destination, the enclave fetches a fresh domain proof, the vendor's settlement authority approves, a{" "}
        <Mono>24 h</Mono> timelock runs, and the buyer sees all of it before the first payment to the new destination. One stolen key, on
        either side, cannot do it. Yes, this is slower than updating a field. That is the point.
      </>
    ),
  },
  {
    title: "Why not a spending-limit wallet with an allowlist?",
    description: (
      <>
        Allowlists are good, and Accord can run on top of one. The difference is who puts the address on the list. In a policy wallet the
        payer's admin types it, which is exactly the step business email compromise targets, and the policy changes the moment the admin
        edits it. In Accord the payee asserts its own destination from a domain it controls, its own authority approves it, changes are
        delayed, and the whole policy is derived from a negotiation both sides can verify. Haseeb Qureshi has argued that the delegation
        model that works is a sub-card with owner-set limits; Accord is where the limits and the payee come from. A hackathon sketch, Dhruva
        Check, put payee tiers on a testnet without the proof, the authority or the delay. <Ref n={[13, 16, 17]} />
      </>
    ),
  },
]

const COLUMN_2: Item[] = [
  {
    title: "How is this different from Google's AP2?",
    description: (
      <>
        AP2 standardises signed mandates between a user, their agent and a merchant, and it is the right shape for the receipt. It does not
        say how the terms in the cart were reached, and it enforces nothing on chain. Accord's approved terms could be expressed as an AP2
        cart mandate; Accord adds how the cart was produced (a sealed two-sided negotiation) and what enforces it (funds the agent cannot
        move outside the terms, a payee that was bound, a kill switch with a documented in-flight story). <Ref n={15} />
      </>
    ),
  },
  {
    title: "How does the vendor know the agent speaks for the buyer?",
    description: (
      <>
        Because the authority is on chain, not in the agent's mouth. The agreement is created by the buyer from a named NEAR account, which
        adds the agent's key; the agent's authority is exactly the approved terms, which the vendor can read. Eddy Lazzarin has called
        proving that an agent represents you the core unsolved problem for agent commerce; the attested, approved mandate is our answer to
        it. <Ref n={12} />
      </>
    ),
  },
  {
    title: "Why NEAR?",
    description: (
      <>
        Four things exist here together: function-call keys that scope an agent to one method on one contract and die in one transaction;
        private inference with a signature on every response; attested enclave jobs that call back into contracts; and Chain Signatures, so
        the agreement can hold and pay on Base without a bridge. The host has stated the bar: businesses need confidential inference,
        attestation and human checkpoints before they deploy agents. <Ref n={[11, 8]} />
      </>
    ),
  },
  {
    title: "Who is it for first?",
    description: (
      <>
        Protocol treasuries and DAOs paying the infrastructure vendors they already pay in USDC; foundations running grants and accelerator
        desks; token projects engaging market makers, through Glassbook; and agents buying services from agents on the NEAR agent market. In
        every case a human sets the mandate and approves the exceptions.
      </>
    ),
  },
  {
    title: "What does it cost?",
    description: (
      <>
        Testnet is free. Planned pricing on mainnet: a flat fee per agreement, paid by the buyer when the terms are approved, and a fee per
        payee binding, paid by the vendor. No percentage of payment amounts, so the room has no stake in the size of the deal.
      </>
    ),
  },
  {
    title: "Is it live?",
    description: (
      <>
        On NEAR testnet and Base Sepolia, yes: the hosted agreement page is the one in the hero, and the repository reproduces it with{" "}
        <Mono>make</Mono>. Mainnet after an audit, and after the limits above have been pushed back one by one: a registry lookup for KYB,
        settlement through Intents, receipt verification in the contract.
      </>
    ),
  },
]

export function Faq() {
  const sectionRef = useRef<HTMLElement>(null)
  /* appearEffect trigger "onScrollTarget": the accordions animate in once the FAQ section itself is in view.
     Framer threshold 0.5; capped at 0.3 so the section (taller than a phone viewport) can still trigger. */
  const inView = useInView(sectionRef, { once: true, amount: 0.3 })

  return (
    <section id="faq" ref={sectionRef} className={`section ${styles.section}`}>
      <SectionHeading eyebrow="FAQ" title="Twelve questions" accent="yellow" />

      <div className={styles.accordions}>
        {[COLUMN_1, COLUMN_2].map((column, col) => (
          <div key={col} className={styles.column}>
            {column.map((item, row) => (
              <FaqAccordion
                key={item.title}
                title={item.title}
                description={item.description}
                inView={inView}
                /* template stagger: column 1 starts at 0.1s, column 2 at 0.2s, +0.1s per row */
                delay={0.1 * (row + 1 + col)}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

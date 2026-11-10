import { usePageMeta } from "../lib/meta"
import { Hero } from "../sections/Hero"
import { AudienceBand } from "../sections/AudienceBand"
import { UseCases } from "../sections/UseCases"
import { CoreFeatures } from "../sections/CoreFeatures"
import { BuiltOn } from "../sections/BuiltOn"
import { Compliance } from "../sections/Compliance"
import { HowSteps } from "../sections/HowSteps"
import { PaymentControls } from "../sections/PaymentControls"
import { Proof } from "../sections/Proof"
import { LiveTestnet } from "../sections/LiveTestnet"
import { WhyNow } from "../sections/WhyNow"
import { Benefits } from "../sections/Benefits"
import { ResearchCards } from "../sections/ResearchCards"
import { Reviews } from "../sections/Reviews"
import { Faq } from "../sections/Faq"
import styles from "./Home.module.css"

/* Home page narrative (copy brief EDITORIAL-DIRECTIVE.md): the Framer template's sections, kept as designed,
   carrying copy brief ACCORD_HOMEPAGE_FINAL.md:
   1 Hero + product preview · 1a Built on (BuiltOn: moving logo line) · the deal-room band (AudienceBand: six agreement types as tabs) · 2 Market-making agreements in Accord (Compliance, the featured type) · 3 How a deal room works (HowSteps) · 3a Core features (CoreFeatures: seven controls, bento) · 3b Use cases (UseCases: six cards, each naming what it runs on) ·
   Shortened 31 Oct 2026: the deal-room preview (Overview), "Why these belong together" (Features) and "The parts of the room" (About)
   repeated the same negotiate → approve → pay story and now live on /product, /product/sealed-table and /product/payee ·
   6a Why now (WhyNow: FBI figures, AttackScene) · 6b Security demonstration (Proof: image row + module) · 6c Payment controls (PaymentControls, 10 Nov 2026: before, during and after an agent pays, the three live controls as tabs with a48's real records; after the proof, as how you operate it) · 7 Privacy and control (Benefits icon cards) ·
   8 The research behind the room (ResearchCards) · 8b In their words (Reviews: owner's choice, real photos + source links) · (8c Pricing removed 31 Oct 2026; the FAQ keeps the cost answer) · 9 FAQ (the closing seats section was removed 31 Oct 2026) */
export function Home() {
  usePageMeta("Accord: Deal room and control plane for agent-to-agent commerce", "Agents negotiate privately, both companies approve the terms, and a NEAR contract enforces who pays, who receives, how much and on what evidence.")
  return (
    <div className={styles.page}>
      <Hero />
      <BuiltOn />
      <AudienceBand />
      <HowSteps />
      <CoreFeatures />
      <Compliance />
      <UseCases />
      <WhyNow />
      <LiveTestnet />
      <Proof />
      <PaymentControls />
      <Benefits />
      <ResearchCards />
      <Reviews />
      <Faq />
    </div>
  )
}

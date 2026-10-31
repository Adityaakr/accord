import { usePageMeta } from "../lib/meta"
import { Hero } from "../sections/Hero"
import { AudienceBand } from "../sections/AudienceBand"
import { Compliance } from "../sections/Compliance"
import { HowSteps } from "../sections/HowSteps"
import { Proof } from "../sections/Proof"
import { WhyNow } from "../sections/WhyNow"
import { Benefits } from "../sections/Benefits"
import { ResearchCards } from "../sections/ResearchCards"
import { Reviews } from "../sections/Reviews"
import { Faq } from "../sections/Faq"
import { Pricing } from "../sections/Pricing"
import { Cta } from "../sections/Cta"
import styles from "./Home.module.css"

/* Home page narrative (docs/website/EDITORIAL-DIRECTIVE.md): the Framer template's sections, kept as designed,
   carrying docs/website/ACCORD_HOMEPAGE_FINAL.md:
   1 Hero + product preview · use cases (AudienceBand) · 2 Accord Atlas (Compliance) · 3 How a deal room works (HowSteps) ·
   Shortened 31 Oct 2026: the deal-room preview (Overview), "Why these belong together" (Features) and "The parts of the room" (About)
   repeated the same negotiate → approve → pay story and now live on /product, /product/sealed-table and /product/payee ·
   6a Why now (WhyNow: FBI figures, AttackScene) · 6b Security demonstration (Proof: image row + module) · 7 Privacy and control (Benefits icon cards) ·
   8 The research behind the room (ResearchCards) · 8b In their words (Reviews: owner's choice, real photos + source links) · 8c Pricing (planned, from the FAQ) · 9 FAQ · 10 Closing (Cta) */
export function Home() {
  usePageMeta("Accord: the private deal room and control plane for agent-to-agent commerce", "Two companies' agents negotiate in confidence, both companies approve the terms, and the terms govern what the buyer's agent may pay. Built on NEAR. First application: Accord Atlas.")
  return (
    <div className={styles.page}>
      <Hero />
      <AudienceBand />
      <Compliance />
      <HowSteps />
      <WhyNow />
      <Proof />
      <Benefits />
      <ResearchCards />
      <Reviews />
      <Pricing />
      <Faq />
      <Cta />
    </div>
  )
}

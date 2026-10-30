import { usePageMeta } from "../lib/meta"
import { Hero } from "../sections/Hero"
import { AudienceBand } from "../sections/AudienceBand"
import { Overview } from "../sections/Overview"
import { Compliance } from "../sections/Compliance"
import { Features } from "../sections/Features"
import { HowSteps } from "../sections/HowSteps"
import { About } from "../sections/About"
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
   1 Hero + product preview (Hero, Overview/Showcase) · 2 Accord Atlas (Compliance badge cards) ·
   3 Why together (Features image cards) · 4 Workflow (HowSteps) · 5 Sealed Table and Payee (About rows) ·
   6a Why now (WhyNow: FBI figures, threats.svg) · 6b Security demonstration (Proof: image row + module) · 7 Privacy and control (Benefits icon cards) ·
   8 The research behind the room (ResearchCards) · 8b In their words (Reviews: owner's choice, real photos + source links) · 8c Pricing (planned, from the FAQ) · 9 FAQ · 10 Closing (Cta) */
export function Home() {
  usePageMeta("Accord: the private deal room and control plane for agent-to-agent commerce", "Two companies' agents negotiate in confidence, both companies approve the terms, and the terms govern what the buyer's agent may pay. Built on NEAR. First application: Accord Atlas.")
  return (
    <div className={styles.page}>
      <Hero />
      <AudienceBand />
      <Overview />
      <Compliance />
      <Features />
      <HowSteps />
      <About />
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

import { SectionHeading, appear } from "../components/SectionHeading"
import { ContentCard } from "../components/ContentCard"
import { Button } from "../components/Button"
import { LINKS } from "../content/links"
import styles from "./Audience.module.css"

/* NEW section (no Framer slot of its own): doc A9 "Buyer and vendor value", anchor #buyers-vendors, accent purple.
   Built from the template's own parts in the Features rhythm:
   section: vertical stack, maxWidth 1080, gap 64, padding 72px 0 (Tablet: gap 48, padding 72px 24px · Phone: gap 32, padding 72px 16px)
     SectionHeading: tag pill (appear 0s) + H2 (appear 0.2s), no lead
     Cards: horizontal, gap 24, width 1fr (Phone: vertical); two Content Card instances, width 1fr, appear y32 1s delay 0 / 0.1
       each card: image 4 / 5, title, the doc's two short lines as two paragraphs, footer = one Button. Public copy verbatim. */

type Card = {
  id: string
  image: string
  title: string
  lines: [string, string]
  button: { label: string; href: string; variant: "primary" | "secondary" }
  delay: `${number}s`
}

const CARDS: Card[] = [
  {
    id: "buyers",
    image: "/assets/content-image-4.png",
    title: "For buyers",
    lines: [
      "Set the commercial limits. Approve the commitment. Keep payment requests tied to the agreement you accepted.",
      "Review exceptions and outstanding obligations in one place.",
    ],
    button: { label: "Open a deal room", href: LINKS.openDealRoom, variant: "primary" },
    delay: "0s",
  },
  {
    id: "vendors",
    image: "/assets/content-image-5.png",
    title: "For vendors",
    lines: [
      "Negotiate from your own mandate, approve the resulting terms, and establish the destination authorized to receive payment.",
      "Follow the conditions and approvals that determine when payment can proceed.",
    ],
    button: { label: "Set up your recipient profile", href: LINKS.recipientProfile, variant: "secondary" },
    delay: "0.1s",
  },
]

export function Audience() {
  return (
    <section id="buyers-vendors" className={`section ${styles.section}`}>
      <SectionHeading eyebrow="Buyers and vendors" title="A clear agreement for both sides." accent="purple" />

      <div className={styles.cards}>
        {CARDS.map((c) => (
          <ContentCard
            key={c.id}
            className={styles.card}
            image={c.image}
            title={c.title}
            description={
              <>
                <p>{c.lines[0]}</p>
                <p>{c.lines[1]}</p>
              </>
            }
            footer={
              <Button variant={c.button.variant} href={c.button.href}>
                {c.button.label}
              </Button>
            }
            appear={appear(c.delay)}
          />
        ))}
      </div>
    </section>
  )
}

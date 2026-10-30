import { Appear } from "../lib/motion"
import { Button } from "../components/Button"
import { LogosTicker, type TickerSlot } from "../components/LogosTicker"
import { LINKS } from "../content/links"
import styles from "./Integrations.module.css"

/* Framer Home › Integrations (eJ3jNeEu0; Tablet uX81zskxreJ3jNeEu0; Phone Ue6QXWSr_eJ3jNeEu0)
   section · vertical stack · gap 48 · padding 72px 0 (Tablet 72px 24px, Phone 72px 16px) · 1fr / max 1080
   ├ Container (YIxz4oBVX) · vertical · gap 40 · 1fr / max 480
   │ ├ Heading (KDe1tBnoT) · vertical · gap 24
   │ │ ├ Tag (BVsC086Nb) · appear y32 1s delay 0 · horizontal gap 8 · Indicator (Uhho5IrDr) 14×8 Cyan + Text (Qxp8aGNKN) Body Small
   │ │ └ Text (x5lvCcNqL) · appear y32 1s delay 0.2 · vertical gap 20 · Title (bD4MI5j6V) H2 + Description (y7WGRBAKH) Body Large
   │ └ Button (ZNb7_adj4) · appear y32 1s delay 0.2 · "Get started now" → https://framer.link/CsDpB9T
   └ Logos ticker instance (vErxQ5pMX) · 1fr × auto

   Refill v2: doc A11 "Developer entry point". Tag, H2 and the two lines (as two Body Large paragraphs) set verbatim.
   The Button slot carries `Read the documentation` (/docs) and, only when LINKS.repo is configured, `View the repository`
   (secondary, external; doc A11 editorial note: show the GitHub link only after its destination exists). Commands live on /docs.
   The ticker keeps its geometry and motion; its Logo Cards carry the doc's F4 stack as text marks instead of third-party logos. */

const TICKER_MARKS: TickerSlot[] = [
  { name: "NEAR", label: "NEAR" },
  { name: "OutLayer", label: "OutLayer" },
  { name: "NEAR AI Cloud", label: "NEAR AI Cloud" },
  { name: "Chain Signatures", label: "Chain Signatures" },
  { name: "Base", label: "Base" },
]

export function Integrations() {
  return (
    <section id="developers" className={`section ${styles.root}`}>
      <div className={styles.container}>
        <div className={styles.heading}>
          <Appear className={styles.tag}>
            <span className={styles.indicator} aria-hidden="true" />
            <p className={`t-body-sm ${styles.tagText}`}>Developers</p>
          </Appear>
          <Appear className={styles.text} delay={0.2}>
            <h2 className={`t-h2 ${styles.title}`}>Follow the deal into the code.</h2>
            <p className={`t-body-lg ${styles.description}`}>
              Inspect how confidential mandates become approved terms, how payment requests are checked, and how executions appear in the
              agreement record.
            </p>
            <p className={`t-body-lg ${styles.description}`}>
              Start with the reference flow, reproduce a refusal, and follow a payment through its lifecycle.
            </p>
          </Appear>
        </div>
        <Appear className={styles.cta} delay={0.2}>
          <Button href={LINKS.docs}>Read the documentation</Button>
          {LINKS.repo && (
            <Button variant="secondary" href={LINKS.repo} openInNewTab>
              View the repository
            </Button>
          )}
        </Appear>
      </div>
      <LogosTicker className={styles.ticker} logos={TICKER_MARKS} />
    </section>
  )
}

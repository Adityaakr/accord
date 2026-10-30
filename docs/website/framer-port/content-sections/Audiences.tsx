import type { ReactNode } from "react"
import { Appear } from "../lib/motion"
import { SectionHeading, appear } from "../components/SectionHeading"
import { Button } from "../components/Button"
import { Mono } from "../components/Mono"
import { Ref } from "../components/Ref"
import { LINKS } from "../content/links"
import styles from "./Audiences.module.css"

/* Brief §4.9 "For buyers, for vendors, one-sided mode" (three columns); §3 row 6, anchors #buyers #vendors #one-sided.
   Section root `#audiences` keeps the template rhythm (gap 64, padding 72px 0); accent purple (conventions: audiences purple).
   Each column is a content card: Elevation Strong, radius 4, padding 32px 24px, gap 24; headline H4, body Body Large,
   bullets Body Small, button at the foot. Cards appear with the template effect, staggered 0.1s.
   Copy is the brief's, verbatim; `[9]` sits where the brief puts it (after "a week."). */

type Column = {
  id: "buyers" | "vendors" | "one-sided"
  label: string
  headline: string
  body: ReactNode
  bullets: ReactNode[]
  button: ReactNode
}

const COLUMNS: Column[] = [
  {
    id: "buyers",
    label: "For buyers",
    headline: "Your ceiling never leaves the room.",
    body: (
      <>
        Software prices rose <Mono>12.7%</Mono> to <Mono>16.4%</Mono> a month in 2026 while negotiated discounts averaged <Mono>32.8%</Mono> off list, so every renewal you do not
        negotiate is money left on the table, and every renewal you do negotiate costs a person a week. <Ref n={9} /> With Accord you write the mandate once: ceiling, walk-away,
        schedule, caps. The agent negotiates from it without ever being able to reveal it, then executes inside the terms you approved. Anything outside them comes back to you as an
        exception you approve or refuse in one click.
      </>
    ),
    bullets: [
      <>Your walk-away is never readable by the vendor, the vendor's agent, or us.</>,
      <>Payments can only go to the payee the vendor bound to its own domain and its own settlement authority approved, at the amounts you approved.</>,
      <>
        One <Mono>revoke</Mono> and the agent can authorise nothing more; anything already signed is listed, and you can cancel it before it lands.
      </>,
    ],
    button: <Button href={LINKS.openDealRoom}>Open a deal room</Button>,
  },
  {
    id: "vendors",
    label: "For vendors",
    headline: "Your floor never leaves the room either.",
    body: (
      <>
        Buyers' agents are coming whether or not you have one. The question is whether yours negotiates with the same information advantage theirs has. In Accord your mandate is
        sealed exactly like the buyer's, the terms are attested before either side approves, and the buyer's agent cannot pay anyone but the payee you bound. If someone spoofs your
        finance team and asks the buyer's agent to update your bank details, the contract refuses and you are told.
      </>
    ),
    bullets: [
      <>Your floor stays sealed; the buyer sees terms, not your mandate.</>,
      <>
        A payee change needs a fresh domain proof, your settlement authority and a <Mono>24 h</Mono> timelock; one stolen key cannot redirect your receivables.
      </>,
      <>Binding happens once per domain and is reusable across agreements.</>,
    ],
    button: (
      <Button href={LINKS.verifyDomain} variant="secondary">
        Verify your domain
      </Button>
    ),
  },
  {
    id: "one-sided",
    label: "One-sided mode",
    headline: "No agent on the other side? The room still holds.",
    body: (
      <>
        Most vendors will not have an agent on day one. In one-sided mode a person on the vendor side negotiates through the app against the buyer's agent. The buyer's mandate stays
        sealed from them exactly as it would from an agent, and everything after the terms are approved, from payee binding to the kill switch, works the same way.
      </>
    ),
    bullets: [<>The human still cannot read the buyer's mandate. That is the whole point of the mode.</>],
    button: (
      <Button href={LINKS.oneSided} variant="secondary">
        See the one-sided flow
      </Button>
    ),
  },
]

export function Audiences() {
  return (
    <section id="audiences" className={`section ${styles.section}`} aria-labelledby="audiences-title">
      <SectionHeading eyebrow="Buyers, vendors, one-sided" title={<span id="audiences-title">For buyers, for vendors, one-sided mode</span>} accent="purple" />

      <div className={styles.columns}>
        {COLUMNS.map((c, i) => (
          <Appear key={c.id} id={c.id} className={styles.card} effect={appear(`${i * 0.1}s`)}>
            <div className={styles.text}>
              <p className={`t-body-sm ${styles.label}`}>{c.label}</p>
              <h3 id={`${c.id}-headline`} className={`t-h4 ${styles.headline}`}>
                {c.headline}
              </h3>
              <p className={`t-body-lg ${styles.body}`}>{c.body}</p>
            </div>

            <ul className={styles.bullets}>
              {c.bullets.map((b, j) => (
                <li key={j} className={`t-body-sm ${styles.bullet}`}>
                  <span className={styles.dot} aria-hidden="true" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className={styles.foot}>{c.button}</div>
          </Appear>
        ))}
      </div>
    </section>
  )
}

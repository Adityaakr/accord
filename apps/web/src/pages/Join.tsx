import { Link } from "react-router-dom"
import { Appear } from "../lib/motion"
import { appear } from "../components/SectionHeading"
import { PageHero } from "../components/PageHero"
import { Button } from "../components/Button"
import { LINKS } from "../content/links"
import { TESTNET } from "../content/testnet"
import { usePageMeta } from "../lib/meta"
import styles from "./Verify.module.css"

/* /join, "How to start" (8 Nov 2026; was an early-access request form). The steps a company takes in the app, the
   same numbered chain as /verify, and a way in: the app when it is hosted (VITE_APP_URL), otherwise the live testnet
   agreement and the docs to run it yourself. No waitlist. */

const LEAD = "Accord runs on NEAR testnet. Sign in with a NEAR wallet or a work email, choose how you use it, and open a deal room with your counterparty."

const STEPS = [
  { title: "Sign in", text: "Connect a NEAR wallet (Meteor, Intear, Ledger, Nightly) or continue with a work email through NEAR Auth. Every signature that moves money happens in your own account." },
  { title: "Choose a workspace", text: "Buyer, vendor or settlement authority. Each workspace shows only what that role needs; switch at any time." },
  { title: "Create a deal room", text: "Pick the agreement type, write the brief and name the vendor and its settlement authority. The room becomes its own NEAR account." },
  { title: "Invite your counterparty", text: "Share the room link. Each side seals its limits in its own browser; the agents negotiate inside the Sealed Table and both companies approve the terms." },
  { title: "Fund and run", text: "The buyer funds the escrow in USDC on NEAR. The agent pays only what the terms allow; anything else is refused and recorded." },
]

export function Join() {
  usePageMeta("Accord: How to start", "Start with Accord on NEAR testnet: sign in with a NEAR wallet or work email, choose a workspace, create a deal room and invite your counterparty.")
  return (
    <div className={styles.page}>
      <PageHero pill="Start" title="How to start." lead={LEAD} />
      <section id="join" className={`section ${styles.main}`}>
        <div className={styles.block}>
          <h2 className={`t-h4 ${styles.subheading}`}>Five steps, in the app.</h2>
          <ol className={styles.steps}>
            {STEPS.map((s, i) => (
              <Appear key={s.title} as="li" className={styles.step} effect={{ ...appear(`${i * 0.05}s` as `${number}s`), threshold: 0.2 }}>
                <div className={styles.stepHead}>
                  <span className={`mono ${styles.stepNo}`}>{String(i + 1).padStart(2, "0")}</span>
                  <h3 className={`t-h5 ${styles.stepTitle}`}>{s.title}</h3>
                </div>
                <p className={`t-body-sm ${styles.stepText}`}>{s.text}</p>
              </Appear>
            ))}
          </ol>
        </div>
        <Appear as="div" className={styles.card} effect={{ ...appear("0s"), threshold: 0.2 }}>
          <h2 className={`t-h5 ${styles.cardTitle}`}>{LINKS.app ? "Open the app" : "See it running first"}</h2>
          <p className={`t-body-sm ${styles.weak}`}>
            {LINKS.app
              ? "The app runs on NEAR testnet. Settlement uses a test USDC token, so nothing here moves real money."
              : <>The full flow already ran on testnet: agreement <a href={TESTNET.agreementUrl} target="_blank" rel="noreferrer" className="mono">{TESTNET.agreement}</a>, every step linked to its transaction.</>}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
            {LINKS.app ? <Button variant="primary" href={LINKS.openDealRoom}>Open the app</Button> : <Button variant="primary" href={LINKS.testnet}>See the testnet agreement</Button>}
            <Button variant="secondary" href={LINKS.docs}>Run it from the docs</Button>
          </div>
          <p className={`t-body-sm ${styles.weak}`}>Questions? <Link to={LINKS.contact} className="ls-link-inline">Contact the team</Link>.</p>
        </Appear>
      </section>
    </div>
  )
}

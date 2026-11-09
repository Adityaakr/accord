import { Link } from "react-router-dom"
import { Appear } from "../lib/motion"
import { appear } from "../components/SectionHeading"
import { PageHero } from "../components/PageHero"
import { Button } from "../components/Button"
import { LINKS } from "../content/links"
import { usePageMeta } from "../lib/meta"
import tl from "../styles/Timeline.module.css"
import styles from "./Join.module.css"

/* /join, "How to start" (8 Nov 2026; was an early-access request form). The steps a company takes in the app, the
   same numbered chain as /verify, and a way in: the app when it is hosted (VITE_APP_URL), otherwise the live testnet
   agreement and the docs to run it yourself. No waitlist. */

const LEAD = "Accord runs on NEAR testnet. Sign in with your own NEAR wallet, choose how you use it, and open a deal room with your counterparty."

const STEPS = [
  { title: "Sign in", text: "Connect a NEAR wallet: Meteor, Intear, Ledger, Nightly or WalletConnect on testnet. Every signature that moves money happens in your own account." },
  { title: "Choose a workspace", text: "Buyer, vendor or settlement authority. Each workspace shows only what that role needs; switch at any time." },
  { title: "Create a deal room", text: "Pick the agreement type, write the brief and name the vendor and its settlement authority. The room becomes its own NEAR account." },
  { title: "Invite your counterparty", text: "Share the room link. Each side seals its limits in its own browser; the agents negotiate inside the Sealed Table and both companies approve the terms." },
  { title: "Fund and run", text: "The buyer funds the escrow in USDC on NEAR. The agent pays only what the terms allow; anything else is refused and recorded." },
]

export function Join() {
  usePageMeta("Accord: How to start", "Start with Accord on NEAR testnet: sign in with a NEAR wallet, choose a workspace, create a deal room and invite your counterparty.")
  return (
    <div className={styles.page}>
      <PageHero centered pill="Start" title="How to start." lead={LEAD} />
      <section id="join" className={`section ${styles.main}`}>
        <Appear as="div" className={tl.column} effect={{ ...appear("0s"), threshold: 0.1 }}>
          <div className={tl.group}>
            <h2 className={tl.groupLabel}><span>Five steps, in the app</span></h2>
            <ol className={tl.rows}>
              {STEPS.map((s, i) => (
                <li key={s.title} className={`${tl.row} ${styles.step}`}>
                  <span className={`mono ${tl.num}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={styles.stepMain}>
                    <span className={tl.name}>{s.title}</span>
                    <span className={styles.stepText}>{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className={tl.group}>
            <h2 className={tl.groupLabel}><span>Open the app</span><span className={tl.groupMeta}>NEAR testnet · test USDC</span></h2>
            <p className={tl.note}>
              Settlement uses a test USDC token, so nothing here moves real money. The guided path funds your account from a faucet and opens a room against Accord&apos;s demo vendor.
            </p>
            <div className={styles.actions}>
              <Button variant="primary" href={LINKS.openDealRoom}>Open the app</Button>
              <Button variant="secondary" href={LINKS.tryDeal}>Try a deal in about 5 minutes</Button>
              <Button variant="secondary" href="/docs/quickstart">Read the quickstart</Button>
            </div>
            <p className={tl.note}>Questions? <Link to={LINKS.contact} className={tl.noteLink}>Contact the team</Link></p>
          </div>
        </Appear>
      </section>
    </div>
  )
}

import { Link } from "react-router-dom"
import { PageHero } from "../components/PageHero"
import { KitFigure } from "../components/KitFigure"
import { QuietLink } from "../components/QuietLink"
import { CopyButton } from "../components/CopyButton"
import { LINKS } from "../content/links"
import { acct } from "../content/testnet"
import { RECORDED_REFUSALS } from "../content/attacks"
import { usePageMeta } from "../lib/meta"
import attackSvg from "../assets/diagrams/attack.svg?raw"
import tl from "../styles/Timeline.module.css"
import styles from "./Verify.module.css"

/* /try: the attack as recorded on NEAR testnet (agreements a6 and a8: the agent told to pay a new account, refused by
   the contract each time), then the way to run it yourself, /app/try-it. The always-open public room needs its own
   services (keeper, demo agent, re-arm); until they run on this deployment the page does not send visitors to it. */
const LEAD = "Tell the agent to pay someone else. On NEAR testnet the demonstration agent was told to pay a new account three times, on agreements a6 and a8, and the contract refused each payment. Run the same attack in your own deal room in about three minutes."
const GOAL_LINE = "A successful attempt can only ever produce a payment to the authorised recipient at the approved amount."

const time = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC"
const short = (id: string) => id.split(".")[0]

export function Try() {
  usePageMeta("Accord: Try to move the money", "The attack recorded on NEAR testnet: the Accord demonstration agent told to pay a new account, and the contract refusing it with ERR_PAYEE_MISMATCH. Run it yourself at /app/try-it.")
  return (
    <div className={styles.page}>
      <PageHero
        pill="Try"
        title="Try to move the money."
        lead={LEAD}
        actions={[{ label: "Run it in your own room", href: LINKS.tryDeal, variant: "primary" }, { label: "Verify a6", href: "/verify", variant: "secondary" }]}
      />
      <section id="try" className={`section ${styles.main}`}>
        <KitFigure svg={attackSvg} minWidth={720} />
        <div className={tl.column}>
          <div className={tl.group}>
            <h2 className={tl.groupLabel}>
              <span>Refused on testnet</span>
              <span className={tl.groupMeta}>recorded · {RECORDED_REFUSALS.length} attempts</span>
            </h2>
            <ol className={tl.rows}>
              {RECORDED_REFUSALS.map((r, i) => (
                <li key={r.tx} className={`${tl.row} ${tl.rowWide}`}>
                  <span className={`mono ${tl.num}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={`mono ${tl.name} ${tl.code} ${tl.refused}`}>{r.code}</span>
                  <span className={`mono ${tl.value}`}>
                    <QuietLink href={acct(r.agreement)}>{short(r.agreement)}</QuietLink> item {r.item}
                    <span className={tl.sep}>·</span>{r.amount} to <QuietLink href={acct(r.to)}>{r.to}</QuietLink>
                    <span className={tl.sep}>·</span><span className={tl.weak}>{time(r.at)}</span>
                    <span className={tl.sep}>·</span><QuietLink href={r.href} className={tl.ok}>tx</QuietLink>
                    <CopyButton text={r.tx} label="the refused transaction hash" />
                  </span>
                </li>
              ))}
            </ol>
            <p className={tl.note}>
              Each attempt is the agent&apos;s own <span className="mono">act</span> call, signed with its one key, naming a recipient the vendor never proved. Nothing moved; the refusal is on the record.{" "}
              <Link to="/record" className={tl.noteLink}>a6&apos;s full record</Link>
            </p>
            <p className={tl.note}>{GOAL_LINE}</p>
            <p className={`${tl.note} ${tl.weak}`}>
              The always-open public room, where anyone can write to the agent, returns when its service is running on this deployment.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

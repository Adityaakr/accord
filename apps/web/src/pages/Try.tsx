import { Link } from "react-router-dom"
import { PageHero } from "../components/PageHero"
import { KitFigure } from "../components/KitFigure"
import { QuietLink } from "../components/QuietLink"
import { LINKS } from "../content/links"
import { acct } from "../content/testnet"
import { RECORDED_REFUSALS } from "../content/attacks"
import { usePageMeta } from "../lib/meta"
import { useRoom, ROOM_URL } from "../lib/room"
import attackSvg from "../assets/diagrams/attack.svg?raw"
import tl from "../styles/Timeline.module.css"
import styles from "./Verify.module.css"

/* /try: the attack as recorded on NEAR testnet (agreements a6, a8, a10, a11 and a15: the agent told to pay a new
   account, a different amount, or to follow a canary; refused by the contract each time), then the two ways to run it:
   the always-open public room at /app/try, offered only once the browser has read /app/api/inbox/stats and found it
   open (lib/room.ts), and your own room at /app/try-it. The prerendered page claims neither state. */
const LEAD = "Tell the agent to pay someone else. On NEAR testnet the demonstration agent was told to pay a new account, a different amount, or to follow a planted instruction, and the contract refused each payment. Write to the agent in the public room when it is open, or run the same attack in your own deal room in about five minutes."
const GOAL_LINE = "A successful attempt can only ever produce a payment to the authorised recipient at the approved amount."

const short = (id: string) => id.split(".")[0]

function RoomLine() {
  const room = useRoom()
  if (room.kind === "open") {
    return (
      <p className={tl.note}>
        <a href={ROOM_URL} className={tl.noteLink}>Open now: write to the agent</a>{" "}
        in the public room, agreement <span className="mono">{room.agreement}</span>. Anyone can send it a message; its refusals land on that agreement&apos;s record.
      </p>
    )
  }
  if (room.kind === "closed") {
    return <p className={`${tl.note} ${tl.weak}`}>The always-open public room is closed right now. The refusals above stand on the record, and your own room works at any time.</p>
  }
  return <p className={`${tl.note} ${tl.weak}`}>The always-open public room, where anyone can write to the agent: <a href={ROOM_URL} className={tl.noteLink}>see whether it is open</a>.</p>
}

export function Try() {
  usePageMeta("Accord: Try to move the money", "The attack recorded on NEAR testnet: the Accord demonstration agent told to pay a new account or a different amount, and the contract refusing it. Write to the agent in the public room at /app/try when it is open, or run it yourself at /app/try-it.")
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
              <span className={tl.groupMeta}>recorded 8 and 9 Nov 2026 · {RECORDED_REFUSALS.length} attempts</span>
            </h2>
            <ol className={tl.rows}>
              {RECORDED_REFUSALS.map((r, i) => (
                <li key={r.tx} className={`${tl.row} ${tl.rowWide}`}>
                  <span className={`mono ${tl.num}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={`mono ${tl.name} ${tl.code} ${tl.refused}`}>{r.code}</span>
                  <span className={`mono ${tl.value}`}>
                    <QuietLink href={acct(r.agreement)}>{short(r.agreement)}</QuietLink> item {r.item}
                    <span className={tl.sep}>·</span>{r.amount} to <QuietLink href={acct(r.to)}>{r.to}</QuietLink>
                    <span className={tl.sep}>·</span><QuietLink href={r.href} className={tl.ok}>tx</QuietLink>
                  </span>
                </li>
              ))}
            </ol>
            <p className={tl.note}>
              Each attempt is the agent&apos;s own <span className="mono">act</span> call, signed with its one key, naming a recipient the vendor never proved, an amount the terms do not hold, or a canary account (which also revokes the key). Nothing moved; the refusal is on the record.{" "}
              <Link to="/record" className={tl.noteLink}>a6&apos;s full record</Link>
            </p>
            <p className={tl.note}>{GOAL_LINE}</p>
            <RoomLine />
          </div>
        </div>
      </section>
    </div>
  )
}

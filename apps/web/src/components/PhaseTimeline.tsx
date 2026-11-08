import { QuietLink } from "./QuietLink"
import { FLOW, PHASES } from "../content/testnet"
import tl from "../styles/Timeline.module.css"

/* Agreement a6's twelve steps in the four phases, as timeline groups: number, step, a mono detail where it carries a
   number or a code, and the transaction. Red only for the refusal and the revocation. */
export function PhaseTimeline({ level = 2 }: { level?: 2 | 3 }) {
  const H = level === 2 ? "h2" : "h3"
  return (
    <>
      {PHASES.map((ph) => (
        <div key={ph.label} className={tl.group}>
          <H className={tl.groupLabel}><span>{ph.label}</span></H>
          <ol className={tl.rows}>
            {ph.steps.map((n) => FLOW.find((s) => s.n === n)!).map((s) => (
              <li key={s.n} className={`${tl.row} ${tl.rowStep}`}>
                <span className={`mono ${tl.num}`}>{s.n}</span>
                <span className={`${tl.name} ${s.refused ? tl.refused : ""}`}>{s.title}</span>
                <span className={`mono ${tl.value} ${s.refused ? tl.refused : ""}`}>{s.mono ?? ""}</span>
                <QuietLink href={s.href} className={`${tl.tx} ${tl.ok}`} label={`${s.title}: open the transaction`}>tx</QuietLink>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </>
  )
}

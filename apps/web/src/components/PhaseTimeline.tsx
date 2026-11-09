import type { ReactNode } from "react"
import { QuietLink } from "./QuietLink"
import { FLOW, PHASES, acct, type Proof } from "../content/testnet"
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

/* A later proof run (DECISIONS 26) as one timeline group, in the record's row language: number, step, then the mono
   detail and each transaction inline (a step with several transactions links each; one with none links the
   agreement's account). The agreement is named in the group label, or per row when the group spans several. */
export function ProofGroup({ label, meta, proofs, note, level = 2 }: { label: string; meta: ReactNode; proofs: Proof[]; note?: ReactNode; level?: 2 | 3 }) {
  const H = level === 2 ? "h2" : "h3"
  const many = new Set(proofs.map((p) => p.agreement)).size > 1
  return (
    <div className={tl.group}>
      <H className={tl.groupLabel}><span>{label}</span><span className={tl.groupMeta}>{meta}</span></H>
      <ol className={tl.rows}>
        {proofs.map((p, i) => (
          <li key={p.title} className={`${tl.row} ${tl.rowWide} ${tl.rowProof}`}>
            <span className={`mono ${tl.num}`}>{String(i + 1).padStart(2, "0")}</span>
            <span className={`${tl.name} ${p.refused ? tl.refused : ""}`}>{p.title}</span>
            <span className={`mono ${tl.value}`}>
              {many ? <><QuietLink href={acct(p.agreement)}>{p.agreement.split(".")[0]}</QuietLink><span className={tl.sep}>·</span></> : null}
              {p.mono ? <><span className={p.refused ? tl.refused : ""}>{p.mono}</span><span className={tl.sep}>·</span></> : null}
              {p.txs.length === 0
                ? <QuietLink href={acct(p.agreement)} className={tl.ok}>account</QuietLink>
                : p.txs.map((t, k) => (
                    <span key={t}>
                      {k > 0 ? <span className={tl.sep}>·</span> : null}
                      <QuietLink href={t} className={tl.ok} label={`${p.title}: open transaction ${k + 1}${p.txLabels?.[k] ? `, ${p.txLabels[k]}` : ""}`}>{p.txLabels?.[k] ?? (p.txs.length > 1 ? `tx ${k + 1}` : "tx")}</QuietLink>
                    </span>
                  ))}
            </span>
          </li>
        ))}
      </ol>
      {note ? <p className={tl.note}>{note}</p> : null}
    </div>
  )
}

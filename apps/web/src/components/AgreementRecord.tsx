import type { ReactNode } from "react"
import { QuietLink } from "./QuietLink"
import { txUrl, type LiveValues } from "../lib/live"
import { acct } from "../content/testnet"
import tl from "../styles/Timeline.module.css"

/* An agreement's record as two timeline groups (styles/Timeline.module.css): "Agreement" (the state, each approved
   item, the recipient, the last transfer, the balance) and "Refusal log" (newest first). Every value links to its
   source on the explorer. Shared by /record and /try; reads the live values (lib/live.ts). */

const STATES = ["Sealed", "Attested", "Executing", "Settled"] as const

const utc = (iso: string, withDate: boolean) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return withDate
    ? d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC"
    : d.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" }) + " UTC"
}
const dueDate = (s: string) => {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
}
const n2 = (i: number) => String(i).padStart(2, "0")

function Empty({ text = "No entries yet" }: { text?: string }) {
  return <p className={`${tl.note} ${tl.weak}`}>{text}</p>
}

export function AgreementRecord({ v, level = 2 }: { v: LiveValues | null; level?: 2 | 3 }) {
  const H = level === 2 ? "h2" : "h3"
  if (!v) return <p className={`${tl.note} ${tl.shimmer}`} role="status">Loading the agreement record</p>
  const a = v.agreement
  const real = a.id !== "" && !a.id.startsWith("<")
  const refusals = [...v.refusals].sort((x, y) => Date.parse(y.at) - Date.parse(x.at))
  let i = 0
  const rows: { name: string; value: ReactNode }[] = []
  if (real) {
    rows.push({
      name: "State",
      value: (
        <span className={tl.stepper} aria-label={`State: ${a.state}`}>
          {STATES.map((s) => <span key={s} className={s === a.state ? tl.current : tl.weak}>{s}</span>)}
        </span>
      ),
    })
  }
  a.terms.forEach((t) => rows.push({ name: `Item ${t.milestone}`, value: <>{t.amount}<span className={tl.sep}>·</span><span className={tl.weak}>due {dueDate(t.due)}</span></> }))
  if (a.payee.account || a.payee.domain) {
    rows.push({
      name: "Recipient",
      value: (
        <>
          {a.payee.account ? <QuietLink href={acct(a.payee.account)}>{a.payee.account}</QuietLink> : null}
          <span className={tl.sep}>·</span>v{a.payee.version}
          {a.payee.domain ? <><span className={tl.sep}>·</span><QuietLink href={a.payee.proof?.startsWith("http") ? a.payee.proof : `https://${a.payee.domain}/.well-known/accord.json`}>proof on {a.payee.domain}</QuietLink></> : null}
        </>
      ),
    })
  }
  if (a.lastTransfer) {
    const t = a.lastTransfer
    rows.push({
      name: "Last transfer",
      value: (
        <>
          {t.amount} to <QuietLink href={acct(t.to)}>{t.to}</QuietLink>
          <span className={tl.sep}>·</span><span className={tl.weak}>{utc(t.at, true)}</span>
          <span className={tl.sep}>·</span><QuietLink href={txUrl(t.tx)} className={tl.ok}>tx</QuietLink>
        </>
      ),
    })
  }
  if (v.balance.account && v.balance.usdc) {
    rows.push({ name: "Held", value: <><QuietLink href={acct(v.balance.account)}>{v.balance.usdc} USDC</QuietLink><span className={tl.sep}>·</span><span className={tl.weak}>in the agreement&apos;s account</span></> })
  }

  return (
    <>
      <div className={tl.group}>
        <H className={tl.groupLabel}>
          <span>Agreement</span>
          {v.label ? <span className={tl.groupMeta}>{v.label}</span> : null}
        </H>
        {rows.length === 0 ? <Empty /> : (
          <ol className={tl.rows}>
            {rows.map((r) => (
              <li key={r.name} className={`${tl.row} ${tl.rowWide}`}>
                <span className={`mono ${tl.num}`}>{n2(++i)}</span>
                <span className={tl.name}>{r.name}</span>
                <span className={`mono ${tl.value}`}>{r.value}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className={tl.group}>
        <H className={tl.groupLabel}>
          <span>Refusal log</span>
          <span className={tl.groupMeta}>newest first</span>
        </H>
        {refusals.length === 0 ? <Empty text="No refusals yet" /> : (
          <ol className={tl.rows} aria-live="polite">
            {refusals.map((r, k) => (
              <li key={`${r.at}-${k}`} className={`${tl.row} ${tl.rowWide}`}>
                <span className={`mono ${tl.num}`}>{n2(k + 1)}</span>
                <span className={`mono ${tl.name} ${tl.code} ${tl.refused}`}>{r.reason}</span>
                <span className={`mono ${tl.value}`}>
                  {r.amount && r.to ? <>{r.amount} to <QuietLink href={acct(r.to)}>{r.to}</QuietLink><span className={tl.sep}>·</span></> : null}
                  <span className={tl.weak}>{utc(r.at, false)}</span>
                  {r.tx ? <><span className={tl.sep}>·</span><QuietLink href={txUrl(r.tx)} className={tl.ok}>tx</QuietLink></> : null}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  )
}

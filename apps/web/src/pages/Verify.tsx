import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { PageHero } from "../components/PageHero"
import { Arrow } from "../components/Arrow"
import { QuietLink } from "../components/QuietLink"
import { CopyButton } from "../components/CopyButton"
import { LINKS } from "../content/links"
import { CHECKS, CIRCLE, RELEASE4, TESTNET, VERIFY_RAW, checkSummary, type CheckStatus } from "../content/testnet"
import { ROWS, hashOf, normaliseId, verifyAgreement, type Result, type Row, type RowKey, type Seg } from "../lib/nearVerify"
import { usePageMeta } from "../lib/meta"
import tl from "../styles/Timeline.module.css"
import styles from "./Verify.module.css"

/* ------------------------------------------------------------------
   /verify, one centred column in the timeline language (styles/Timeline.module.css): the hero, an agreement id field,
   then "Live from testnet" (read by this browser from NEAR testnet RPC with no keys, lib/nearVerify.ts) and
   "Full check · make verify" (live from the app's /app/api/verify/<id>; a6's recorded result, labelled so, when the
   app cannot answer; raw output behind the footer). Every value is a quiet link to its
   source: the live rows to the typed agreement's own accounts and transactions, the full check to a6's evidence.
------------------------------------------------------------------- */

/* Quick picks: a6 (the original walkthrough, the default), a10 (release 4, the security-review fixes) and a1 on the Circle USDC
   factory. The browser rows read each id's own factory; the full check comes from the app, which knows both. */
const PICKS = [
  { id: TESTNET.agreement, label: "a6", note: "original walkthrough" },
  { id: RELEASE4.agreement, label: "a10", note: "release 4" },
  { id: CIRCLE.agreement, label: "a1.accord-usdc", note: "Circle USDC" },
]

const blank = (): Row[] => ROWS.map((r) => ({ ...r, value: [], result: "loading" as Result }))

export function Status({ result }: { result: Result }) {
  if (result === "loading") return <span className={`mono ${tl.status} ${tl.shimmer}`}>reading</span>
  const cls = result === "ok" ? tl.ok : result === "not ok" ? tl.bad : result === "partial" ? tl.partial : tl.weak
  return <span className={`mono ${tl.status} ${cls}`}>{result}</span>
}

function Value({ segs }: { segs: Seg[] }) {
  return (
    <>
      {segs.map((s, i) => (typeof s === "string" ? <span key={i}>{s}</span> : (
        <span key={i} className={styles.seg}>
          <QuietLink href={s.href}>{s.text}</QuietLink>
          {s.copy ? <CopyButton text={s.copy} label={s.copyLabel} /> : null}
        </span>
      )))}
    </>
  )
}

/* The full check (the same checks as make verify) comes live from the app's JSON endpoint, /app/api/verify/<id>,
   same-origin on the hosted site. When it cannot answer (no app on this deployment, an id it cannot read), the panel
   shows agreement a6's recorded result instead, labelled as a recording of a6, never as the entered id's result. */
type LiveCheck = { name: string; status: "ok" | "partial" | "fail" | "not_checked" | string; detail: string }
type FullCheck =
  | { state: "loading" }
  | { state: "live"; checks: LiveCheck[]; ok: number }
  | { state: "recorded"; reason?: string }
const CHECK_NAMES: Record<string, string> = Object.fromEntries(CHECKS.map((c) => [c.id, c.name]))
const CHECK_MEANINGS: Record<string, string> = {
  code: "Matches a published release", keys: "No full-access key", sealed: "Signed inside the enclave",
  release: "Needs the outlayer-verify tool", model: "The real model, fresh nonce", payee: "Proven on the vendor's domain",
  record: "Payments match the receipts",
}
const liveResult = (s: string): Result => (s === "ok" ? "ok" : s === "not_checked" ? "not checked" : s === "partial" ? "partial" : "not ok")
/** A NEAR account id: 2 to 64 characters of lowercase letters, digits, - and _, in dot-separated parts */
const isAccountId = (v: string) => v.length >= 2 && v.length <= 64 && /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/.test(v)

async function fetchFullCheck(id: string, signal: AbortSignal): Promise<FullCheck> {
  if (!isAccountId(id)) return { state: "recorded", reason: "This is not a NEAR account id, so there is nothing to check." }
  const ctlTimeout = new AbortController()
  const timer = setTimeout(() => ctlTimeout.abort(), 25000)
  signal.addEventListener("abort", () => ctlTimeout.abort(), { once: true })
  try {
    const r = await fetch(`${LINKS.app}/api/verify/${encodeURIComponent(id)}`, { signal: ctlTimeout.signal, headers: { accept: "application/json" } })
    const body = (await r.json().catch(() => null)) as { checks?: LiveCheck[]; ok?: number; error?: string } | null
    if (r.ok && body && Array.isArray(body.checks) && body.checks.length) return { state: "live", checks: body.checks, ok: body.checks.filter((c) => c.status === "ok").length }
    if (r.status === 404 || (body?.error && /does not exist|not an Accord agreement/i.test(body.error))) return { state: "recorded", reason: `${id} is not an Accord agreement on NEAR testnet.` }
    return { state: "recorded", reason: body?.error ? `The full check could not run for ${id}.` : undefined }
  } catch {
    return { state: "recorded" }
  } finally {
    clearTimeout(timer)
  }
}

const rawOf = (id: string, checks: LiveCheck[]) => {
  const ok = checks.filter((c) => c.status === "ok").length
  const nc = checks.filter((c) => c.status === "not_checked").length
  const partial = checks.filter((c) => c.status === "partial").length
  const failed = checks.length - ok - nc - partial
  return [`accord verify · ${id}`, ...checks.map((c) => `${c.name.padEnd(9)} ${c.detail} · ${c.status.replace("_", " ")}`), `verify: ${ok} checks ok${partial ? ` · ${partial} partial` : ""}${failed ? ` · ${failed} failed` : ""}${nc ? ` · ${nc} not checked` : ""}`].join("\n")
}

export function Verify() {
  usePageMeta("Accord: Verify an agreement", "Check any Accord agreement from public data, with no account and no keys: the factory, the contract code, the access keys, the recipient and the record, read from NEAR testnet.")
  const [params, setParams] = useSearchParams()
  const [value, setValue] = useState(params.get("agreement") ?? TESTNET.agreement)
  const [id, setId] = useState(normaliseId(value))
  const [rows, setRows] = useState<Row[]>(blank)
  const [full, setFull] = useState<FullCheck>({ state: "loading" })
  const abort = useRef<AbortController | null>(null)

  const run = useCallback((raw: string) => {
    const next = normaliseId(raw)
    if (!next) return
    abort.current?.abort()
    const ctl = new AbortController()
    abort.current = ctl
    setId(next)
    setRows(blank())
    setFull({ state: "loading" })
    /* Not an account id: nothing to ask the RPC or the app (they would only answer 400s into the console) */
    if (!isAccountId(next)) {
      setRows(ROWS.map((r, i) => ({ ...r, value: i === 0 ? ["Not a NEAR account id"] : [], result: i === 0 ? "not ok" : "not checked" })))
      setFull({ state: "recorded", reason: "This is not a NEAR account id, so there is nothing to check." })
      return
    }
    /* The full check runs once the factory has listed the account; an id it does not list gets the reason at once */
    const startFull = () => void fetchFullCheck(next, ctl.signal).then((f) => { if (!ctl.signal.aborted) setFull(f) })
    void verifyAgreement(next, (key: RowKey, v, result) => {
      if (ctl.signal.aborted) return
      setRows((rs) => rs.map((r) => (r.key === key ? { ...r, value: v, result } : r)))
      if (key !== "agreement") return
      if (result === "not ok") setFull({ state: "recorded", reason: `${next} is not an Accord agreement on NEAR testnet.` })
      else startFull()
    }, ctl.signal)
  }, [])

  useEffect(() => { run(value); return () => abort.current?.abort() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const next = normaliseId(value)
    if (!next) return
    setParams(next !== TESTNET.agreement ? { agreement: next } : {}, { replace: true })
    run(value)
  }

  function pick(next: string) {
    setValue(next)
    setParams(next !== TESTNET.agreement ? { agreement: next } : {}, { replace: true })
    run(next)
  }

  const reading = rows.some((r) => r.result === "loading")
  const okLive = rows.filter((r) => r.result === "ok").length
  const recorded = full.state === "recorded"
  const fullId = recorded ? TESTNET.agreement : id
  const fullCommand = `make verify DEAL=${fullId}`
  /* The entered id has no full check (not an agreement, or the app could not answer for it): a6's recording folds away */
  const failedId = recorded && id !== TESTNET.agreement
  const fullBody = <FullRows full={full} id={id} fullCommand={fullCommand} />
  const failedLive = full.state === "live" ? full.checks.filter((c) => liveResult(c.status) === "not ok").length : 0
  const fullSummary = full.state === "live"
    ? [checkSummary(full.checks.filter((c) => liveResult(c.status) !== "not ok").map((c) => ({ status: liveResult(c.status) as CheckStatus }))), failedLive ? `${failedLive} failed` : ""].filter(Boolean).join(" · ")
    : checkSummary(CHECKS)

  return (
    <div className={styles.page}>
      <PageHero centered pill="Verify" title="Verify an agreement." lead="Check any Accord agreement from public data. No account, no keys." />

      <section id="verify" className={`section ${styles.main}`}>
        <form className={styles.form} onSubmit={onSubmit} role="search">
          <label htmlFor="verify-id" className={styles.srOnly}>Agreement id</label>
          <input
            id="verify-id"
            className={`mono ${styles.input}`}
            type="text"
            name="agreement"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="a6.accord-v2.testnet"
          />
          <button type="submit" className={styles.submit}>Verify</button>
        </form>
        <p className={styles.picks}>
          <span>Examples</span>
          {PICKS.map((p) => (
            <button key={p.id} type="button" className={styles.pick} onClick={() => pick(p.id)} aria-pressed={id === p.id}>
              <span className="mono">{p.label}</span> <span className={styles.pickNote}>{p.note}</span>
            </button>
          ))}
        </p>

        <div className={tl.column}>
          <div className={tl.head}>
            <span className={tl.headLabel}>Agreement</span>
            <span className={styles.headValue}>
              <QuietLink href={`https://testnet.nearblocks.io/address/${id}`} className={styles.headLink}>{id}</QuietLink>
              <CopyButton text={id} />
            </span>
          </div>

          <div className={tl.group}>
            <p className={tl.groupLabel}>
              <span>Live from testnet</span>
              <span className={tl.groupMeta} aria-live="polite">{reading ? "reading" : `${okLive} of ${rows.length} ok`}</span>
            </p>
            <ol className={tl.rows} aria-busy={reading}>
              {rows.map((r, i) => (
                <li key={r.key} className={tl.row}>
                  <span className={`mono ${tl.num}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={tl.name}>{r.name}</span>
                  <span className={`mono ${tl.value} ${r.result === "not ok" ? tl.bad : ""}`}><Value segs={r.value} /></span>
                  <Status result={r.result} />
                </li>
              ))}
            </ol>
            <p className={tl.note}>
              Sealed outcome, model attestation and release attestation are checked by <span className="mono">make verify</span> and in the app.{" "}
              <a href={LINKS.appVerify(id)} className={tl.noteLink}>Open in the app<Arrow /></a>
              <Link to="/docs/cli" className={tl.noteLink}>The command<Arrow /></Link>
            </p>
          </div>

          <div className={tl.group}>
            <p className={tl.groupLabel}>
              <span>Full check · <span className={tl.lower}>make verify</span></span>
              <span className={tl.groupMeta} aria-live="polite">
                {full.state === "loading" ? "reading" : full.state === "live" ? `${fullSummary} · live` : `Recorded for ${TESTNET.agreement}`}
              </span>
            </p>
            {failedId ? (
              <p className={`${tl.note} ${styles.recordedNote}`}>
                {full.reason ? `${full.reason} ` : "The full check is not reachable from this page right now. "}
                Nothing here is a result for <span className="mono">{id}</span>.
              </p>
            ) : null}
            {failedId ? (
              <details className={styles.fold}>
                <summary className={`${tl.note} ${styles.foldSummary}`}>
                  <span className={styles.toggle}>Show the recorded result for <span className="mono">{TESTNET.agreement}</span> instead</span>
                  <Arrow dir="down" className={styles.toggleIcon} />
                </summary>
                <div className={styles.foldBody}>{fullBody}</div>
              </details>
            ) : fullBody}
          </div>

          {full.state === "loading" || failedId ? null : (
            <details className={`${tl.foot} ${styles.foot}`}>
              <summary>
                <span className="mono">{fullSummary}</span>
                <span className={styles.sep} aria-hidden="true">·</span>
                <span className={styles.headValue}>
                  <QuietLink href={`https://testnet.nearblocks.io/address/${fullId}`} className={styles.footLink}>{fullId}</QuietLink>
                  <CopyButton text={fullId} />
                </span>
                {recorded ? <><span className={styles.sep} aria-hidden="true">·</span><span>recorded</span></> : null}
                <span className={styles.sep} aria-hidden="true">·</span>
                <span className={styles.toggle}>Show raw output<Arrow dir="down" className={styles.toggleIcon} /></span>
              </summary>
              <pre className={styles.raw}>{full.state === "live" ? rawOf(id, full.checks) : VERIFY_RAW}</pre>
            </details>
          )}
        </div>
      </section>
    </div>
  )
}

function FullRows({ full, id, fullCommand }: { full: FullCheck; id: string; fullCommand: string }) {
  return (
          <>
            <div className={tl.cmdRow}>
              <Link to="/docs/cli" className={`${tl.cmd} ${tl.link} ${styles.cmd}`}><span className={tl.prompt} aria-hidden="true">$</span>{fullCommand}<Arrow /></Link>
              <CopyButton text={fullCommand} label="the make verify command" />
            </div>
            <ol className={tl.rows} aria-busy={full.state === "loading"}>
              {full.state === "live"
                ? full.checks.map((c, i) => (
                    <li key={c.name} className={tl.row}>
                      <span className={`mono ${tl.num}`}>{String(i + 1).padStart(2, "0")}</span>
                      <span className={tl.name}>{CHECK_NAMES[c.name] ?? c.name}</span>
                      <span className={tl.meaning}>
                        <QuietLink href={LINKS.appVerify(id)} mono={false}>{CHECK_MEANINGS[c.name] ?? c.detail}</QuietLink>
                      </span>
                      <Status result={liveResult(c.status)} />
                    </li>
                  ))
                : CHECKS.map((c, i) => (
                    <li key={c.id} className={tl.row}>
                      <span className={`mono ${tl.num}`}>{String(i + 1).padStart(2, "0")}</span>
                      <span className={tl.name}>{c.name}</span>
                      <span className={tl.meaning}>
                        {full.state === "loading" ? <span className={tl.weak}>{CHECK_MEANINGS[c.id]}</span> : (
                          <>
                            <QuietLink href={c.href} mono={false}>{c.meaning}</QuietLink>
                            {hashOf(c.href) ? <CopyButton text={hashOf(c.href)!} label={`the ${c.name.toLowerCase()} transaction hash`} /> : null}
                          </>
                        )}
                      </span>
                      <Status result={full.state === "loading" ? "loading" : c.status} />
                    </li>
                  ))}
            </ol>
          </>
  )
}

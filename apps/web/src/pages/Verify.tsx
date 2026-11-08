import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { PageHero } from "../components/PageHero"
import { Arrow } from "../components/Arrow"
import { QuietLink } from "../components/QuietLink"
import { CopyButton } from "../components/CopyButton"
import { LINKS } from "../content/links"
import { CHECKS, TESTNET, VERIFY_COMMAND, VERIFY_RAW } from "../content/testnet"
import { ROWS, hashOf, normaliseId, verifyAgreement, type Result, type Row, type RowKey, type Seg } from "../lib/nearVerify"
import { usePageMeta } from "../lib/meta"
import tl from "../styles/Timeline.module.css"
import styles from "./Verify.module.css"

/* ------------------------------------------------------------------
   /verify, one centred column in the timeline language (styles/Timeline.module.css): the hero, an agreement id field,
   then "Live from testnet" (read by this browser from NEAR testnet RPC with no keys, lib/nearVerify.ts) and
   "Full check · make verify" (the CLI's result for a6, raw output behind the footer). Every value is a quiet link to its
   source: the live rows to the typed agreement's own accounts and transactions, the full check to a6's evidence.
------------------------------------------------------------------- */

const blank = (): Row[] => ROWS.map((r) => ({ ...r, value: [], result: "loading" as Result }))

export function Status({ result }: { result: Result }) {
  if (result === "loading") return <span className={`mono ${tl.status} ${tl.shimmer}`}>reading</span>
  const cls = result === "ok" ? tl.ok : result === "not ok" ? tl.bad : tl.weak
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

export function Verify() {
  usePageMeta("Accord: Verify an agreement", "Check any Accord agreement from public data, with no account and no keys: the factory, the contract code, the access keys, the recipient and the record, read from NEAR testnet.")
  const [params, setParams] = useSearchParams()
  const [value, setValue] = useState(params.get("agreement") ?? TESTNET.agreement)
  const [id, setId] = useState(normaliseId(value))
  const [rows, setRows] = useState<Row[]>(blank)
  const abort = useRef<AbortController | null>(null)

  const run = useCallback((raw: string) => {
    const next = normaliseId(raw)
    if (!next) return
    abort.current?.abort()
    const ctl = new AbortController()
    abort.current = ctl
    setId(next)
    setRows(blank())
    void verifyAgreement(next, (key: RowKey, v, result) => {
      if (ctl.signal.aborted) return
      setRows((rs) => rs.map((r) => (r.key === key ? { ...r, value: v, result } : r)))
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

  const reading = rows.some((r) => r.result === "loading")
  const okLive = rows.filter((r) => r.result === "ok").length
  const okFull = CHECKS.filter((c) => c.ok).length

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
              <Link to="/docs#commands" className={tl.noteLink}>The command<Arrow /></Link>
            </p>
          </div>

          <div className={tl.group}>
            <p className={tl.groupLabel}><span>Full check · <span className={tl.lower}>make verify</span></span></p>
            <div className={tl.cmdRow}>
              <Link to="/docs#commands" className={`${tl.cmd} ${tl.link}`}><span className={tl.prompt} aria-hidden="true">$</span>{VERIFY_COMMAND}<Arrow /></Link>
              <CopyButton text={VERIFY_COMMAND} label="the make verify command" />
            </div>
            <ol className={tl.rows}>
              {CHECKS.map((c, i) => (
                <li key={c.id} className={tl.row}>
                  <span className={`mono ${tl.num}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={tl.name}>{c.name}</span>
                  <span className={tl.meaning}>
                    <QuietLink href={c.href} mono={false}>{c.meaning}</QuietLink>
                    {hashOf(c.href) ? <CopyButton text={hashOf(c.href)!} label={`the ${c.name.toLowerCase()} transaction hash`} /> : null}
                  </span>
                  <Status result={c.ok ? "ok" : "not checked"} />
                </li>
              ))}
            </ol>
          </div>

          <details className={`${tl.foot} ${styles.foot}`}>
            <summary>
              <span className={`mono ${tl.ok}`}>{okFull} of {CHECKS.length} ok</span>
              <span className={styles.sep} aria-hidden="true">·</span>
              <span className={styles.headValue}>
                <QuietLink href={TESTNET.agreementUrl} className={styles.footLink}>{TESTNET.agreement}</QuietLink>
                <CopyButton text={TESTNET.agreement} />
              </span>
              <span className={styles.sep} aria-hidden="true">·</span>
              <span className={styles.toggle}>Show raw output<Arrow dir="down" className={styles.toggleIcon} /></span>
            </summary>
            <pre className={styles.raw}>{VERIFY_RAW}</pre>
          </details>
        </div>
      </section>
    </div>
  )
}

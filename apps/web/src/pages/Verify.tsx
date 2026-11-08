import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { PageHero } from "../components/PageHero"
import { Arrow } from "../components/Arrow"
import { LINKS } from "../content/links"
import { CHECKS, TESTNET, VERIFY_COMMAND, VERIFY_RAW } from "../content/testnet"
import { ROWS, normaliseId, verifyAgreement, type Result, type Row, type RowKey } from "../lib/nearVerify"
import { usePageMeta } from "../lib/meta"
import styles from "./Verify.module.css"

/* ------------------------------------------------------------------
   /verify, one centred column in the style of the home timeline: the hero, an agreement id field, then two groups of
   borderless rows with a thin number gutter and a right-aligned mono result. "Live from testnet" is read by this
   browser from NEAR testnet RPC, no keys (lib/nearVerify.ts); "Full check · make verify" is the CLI's result for a6,
   with its raw output behind the footer's disclosure. ?agreement=<id> prefills and checks another agreement.
------------------------------------------------------------------- */

const blank = (): Row[] => ROWS.map((r) => ({ ...r, value: "", result: "loading" as Result }))

function Status({ result }: { result: Result }) {
  if (result === "loading") return <span className={`mono ${styles.status} ${styles.shimmer}`} aria-label="Reading">reading</span>
  const cls = result === "ok" ? styles.ok : result === "not ok" ? styles.bad : styles.weak
  return <span className={`mono ${styles.status} ${cls}`}>{result}</span>
}

function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle")
  useEffect(() => {
    if (state === "idle") return
    const t = window.setTimeout(() => setState("idle"), 1600)
    return () => window.clearTimeout(t)
  }, [state])
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setState("copied") } catch { setState("failed") }
  }
  return (
    <button type="button" className={styles.copy} onClick={copy} aria-label={`Copy ${text}`}>
      <span aria-live="polite">{state === "copied" ? "copied" : state === "failed" ? "copy failed" : "copy"}</span>
    </button>
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

        <div className={styles.timeline}>
          <div className={styles.head}>
            <span className={styles.headLabel}>Agreement</span>
            <a href={`https://testnet.nearblocks.io/address/${id}`} target="_blank" rel="noreferrer" className={`mono ${styles.headLink}`}>{id}<Arrow dir="up-right" /></a>
          </div>

          <div className={styles.group}>
            <p className={styles.groupLabel}>
              <span>Live from testnet</span>
              <span className={`mono ${styles.groupMeta}`} aria-live="polite">{reading ? "reading" : `${okLive} of ${rows.length} ok`}</span>
            </p>
            <ol className={styles.rows} aria-busy={reading}>
              {rows.map((r, i) => (
                <li key={r.key} className={styles.row}>
                  <span className={`mono ${styles.num}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={styles.name}>{r.name}</span>
                  <span className={`mono ${styles.value} ${r.result === "not ok" ? styles.bad : ""}`}>{r.value}</span>
                  <Status result={r.result} />
                </li>
              ))}
            </ol>
            <p className={styles.note}>
              Sealed outcome, model attestation and release attestation are checked by <span className="mono">make verify</span> and in the app.{" "}
              <a href={LINKS.appVerify(id)} className={styles.noteLink}>Open in the app<Arrow /></a>
              <Link to="/docs#near" className={styles.noteLink}>The command<Arrow /></Link>
            </p>
          </div>

          <div className={styles.group}>
            <p className={styles.groupLabel}><span>Full check · <span className={styles.lower}>make verify</span></span></p>
            <div className={styles.cmdRow}>
              <span className={`mono ${styles.cmd}`}><span className={styles.prompt} aria-hidden="true">$</span>{VERIFY_COMMAND}</span>
              <CopyButton text={VERIFY_COMMAND} />
            </div>
            <ol className={styles.rows}>
              {CHECKS.map((c, i) => (
                <li key={c.id} className={styles.row}>
                  <span className={`mono ${styles.num}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={styles.name}>{c.name}</span>
                  <span className={styles.meaning}>{c.meaning}</span>
                  <Status result={c.ok ? "ok" : "not checked"} />
                </li>
              ))}
            </ol>
          </div>

          <details className={styles.foot}>
            <summary>
              <span className={`mono ${styles.ok}`}>{okFull} of {CHECKS.length} ok</span>
              <span className={styles.sep} aria-hidden="true">·</span>
              <a href={TESTNET.agreementUrl} target="_blank" rel="noreferrer" className={`mono ${styles.footLink}`}>{TESTNET.agreement}<Arrow dir="up-right" /></a>
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

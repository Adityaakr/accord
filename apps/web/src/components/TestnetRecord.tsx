import { useEffect, useState } from "react"
import { CHECKS, FLOW, TESTNET, VERIFY_COMMAND, VERIFY_RAW } from "../content/testnet"
import styles from "./TestnetRecord.module.css"

/* make verify on the live testnet agreement, as one compact terminal card: the command with Copy, seven checks with
   what each means in plain words and its result, the summary, and the raw output behind a disclosure. */
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
    <button type="button" className={styles.copy} onClick={copy} aria-live="polite" aria-label={`Copy ${text}`}>
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy"}
    </button>
  )
}

export function VerifyChecks() {
  const ok = CHECKS.filter((c) => c.ok).length
  return (
    <div className={styles.term} id={TESTNET.agreement}>
      <div className={styles.termHead}>
        <code className={styles.cmd}><span className={styles.prompt}>$</span>{VERIFY_COMMAND}</code>
        <CopyButton text={VERIFY_COMMAND} />
      </div>
      <ol className={styles.checks} aria-label="What make verify checks">
        {CHECKS.map((c) => (
          <li key={c.id} className={styles.check}>
            <span className={styles.checkName}>{c.name}</span>
            <span className={styles.checkMeaning}>{c.meaning}</span>
            <span className={`mono ${c.ok ? styles.chipOk : styles.chipWeak}`}>{c.ok ? "ok" : "not checked"}</span>
          </li>
        ))}
      </ol>
      <div className={styles.termFoot}>
        <span className={`mono ${styles.summary}`}>{ok} of {CHECKS.length} ok</span>
        <a href={TESTNET.agreementUrl} target="_blank" rel="noreferrer" className={`mono ${styles.agreement}`}>{TESTNET.agreement} ↗</a>
      </div>
      <details className={styles.raw}>
        <summary>Show raw output</summary>
        <pre>{VERIFY_RAW}</pre>
      </details>
    </div>
  )
}

export function TestnetFlowRecord() {
  return (
    <div className={styles.card} id={TESTNET.agreement}>
      <div className={styles.head}>
        <p className={styles.title}>Live on testnet: <a href={TESTNET.agreementUrl} target="_blank" rel="noreferrer" className="mono">{TESTNET.agreement}</a></p>
        <span className={`mono ${styles.tag}`}>release {TESTNET.release} · test USDC</span>
      </div>
      <ol className={styles.flow}>
        {FLOW.map((s) => (
          <li key={s.n}>
            <a href={s.href} target="_blank" rel="noreferrer">
              <span className={`mono ${styles.num}`}>{s.n}</span>
              <span className={styles.stepTitle}>{s.title}</span>
              <span className={`${styles.detail} ${s.refused ? styles.refused : ""}`}>{s.detail}</span>
              <span className={`mono ${styles.tx}`}>tx ↗</span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  )
}

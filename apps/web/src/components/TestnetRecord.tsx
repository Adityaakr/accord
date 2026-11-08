import { FLOW, TESTNET } from "../content/testnet"
import { LINKS } from "../content/links"
import styles from "./TestnetRecord.module.css"

/* The live testnet agreement for /record and /verify: what verify returned, or every step with its transaction.
   Pure links to the explorer and, when the app is hosted, to its verify page. */
export function TestnetVerifyResult() {
  return (
    <div className={styles.card} id={TESTNET.agreement}>
      <div className={styles.head}>
        <p className={styles.title}>Live on testnet: <a href={TESTNET.agreementUrl} target="_blank" rel="noreferrer" className="mono">{TESTNET.agreement}</a></p>
        <span className={`mono ${styles.tag}`}>{TESTNET.verify.ok.length} ok · {TESTNET.verify.notChecked.length} not checked</span>
      </div>
      <ul className={styles.list}>
        {TESTNET.verify.ok.map((c) => <li key={c}><span className={`mono ${styles.ok}`}>ok</span>{c}</li>)}
        {TESTNET.verify.notChecked.map((c) => <li key={c}><span className={`mono ${styles.weak}`}>not checked</span>{c}</li>)}
      </ul>
      <p className={styles.note}>
        {LINKS.app ? <a href={LINKS.appVerify(TESTNET.agreement)} className="ls-link-inline">Run it again in the app</a> : <>Run it yourself: <span className="mono">make verify DEAL={TESTNET.agreement}</span></>}
        {" · "}<a href={TESTNET.factoryUrl} target="_blank" rel="noreferrer" className="ls-link-inline">factory {TESTNET.factory}</a>
      </p>
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

import { Arrow } from "./Arrow"
import { FLOW, TESTNET } from "../content/testnet"
import styles from "./TestnetRecord.module.css"

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
              <span className={`mono ${styles.tx}`}>tx<Arrow dir="up-right" /></span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  )
}

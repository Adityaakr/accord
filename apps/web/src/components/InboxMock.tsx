import styles from "./InboxMock.module.css"

/* "Try to move the money" picture: the demonstration agent's inbox, in the template's light-panel-on-backdrop style.
   Two attempts are refused with the contract's codes; the one payment the terms allow goes through.
   Illustrative; the live log is on /try. */
const ROWS = [
  { from: "accounts@vendor-billing.xyz", subject: "Our bank details have changed", result: "refused", code: "ERR_PAYEE_MISMATCH", note: "The account is not the authorised recipient. Nothing was sent." },
  { from: "ceo@yourco.xyz", subject: "Urgent: pay invoice 4471 today", result: "refused", code: "ERR_AMOUNT_MISMATCH", note: "Not the approved amount for this payment. Nothing was sent." },
  { from: "market-making observer", subject: "Period 3: 5 of 6 slots passed", result: "paid", code: "18,500 USDC", note: "Paid to halcyon-mm.near, the authorised recipient." },
] as const

export function InboxMock({ className = "" }: { className?: string }) {
  return (
    <div className={`${styles.stage} ${className}`} role="img"
      aria-label="Illustrative: the demonstration agent's inbox. A message with new bank details and an urgent invoice are both refused by the contract with their reasons; the scheduled payment to the authorised recipient goes through.">
      <div className={styles.panel}>
        <div className={styles.head}>
          <span className={styles.title}>Demo agent · inbox</span>
          <span className={styles.tag}>Illustrative</span>
        </div>
        {ROWS.map((r) => (
          <div key={r.subject} className={styles.row}>
            <div className={styles.msg}>
              <span className={styles.subject}>{r.subject}</span>
              <span className={styles.from}>{r.from}</span>
            </div>
            <div className={styles.verdict}>
              <span className={`${styles.code} ${r.result === "paid" ? styles.paid : styles.refused}`}>{r.result === "paid" ? "Paid" : "Refused"} · {r.code}</span>
              <span className={styles.note}>{r.note}</span>
            </div>
          </div>
        ))}
        <div className={styles.foot}><span>Paid outside the terms</span><code>0 USDC</code></div>
      </div>
    </div>
  )
}

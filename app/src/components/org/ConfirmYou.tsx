"use client";

// "Confirm it's you": one message signed in the person's own wallet, no transaction and no fee. It proves this browser
// holds the account, so the app can save organisation changes for it.

import { useOrg } from "./OrgProvider";
import styles from "./org.module.css";

export function ConfirmYou({ why }: { why: string }) {
  const o = useOrg();
  return (
    <div className={styles.card}>
      <p className={styles.steps}>One signature, no transaction, no fee</p>
      <p className={styles.cardTitle}>Confirm it&apos;s you</p>
      <p className={styles.cardLead}>{why} Your wallet signs a short message naming this account; Accord checks it against the account&apos;s keys on NEAR.</p>
      <button type="button" className={styles.primary} onClick={() => void o.confirm()} disabled={o.confirming}>
        {o.confirming ? "Waiting for your wallet…" : "Sign to confirm"}
      </button>
      {o.error && <p className={styles.error} role="alert">{o.error}</p>}
      <p className={styles.note}>The session lasts eight hours. It can manage your organisation; it can never sign a transaction.</p>
    </div>
  );
}

"use client";

// Profile: who is signed in, how, and on which network. The account is the person's own; disconnecting ends the
// session in this browser and changes nothing on chain.

import Link from "next/link";
import { useAppConfig } from "@/components/AppConfig";
import { useWallet } from "@/components/wallet/WalletProvider";
import styles from "./profile.module.css";

const METHOD = { wallet: "NEAR wallet (HOT Connect)", email: "Work email (NEAR Auth)", sandbox: "Local sandbox key" } as const;

export default function Profile() {
  const w = useWallet();
  const c = useAppConfig();
  if (!w.accountId) {
    return (
      <div className="container">
        <div className={styles.head}><h1 className="h2">Profile</h1></div>
        <p className="body">You are not signed in. <Link href="/signin" className="link">Sign in</Link> to see your account.</p>
      </div>
    );
  }
  const explorer = c.explorer ? `${c.explorer}/address/${w.accountId}` : null;
  return (
    <div className="container">
      <div className={styles.head}>
        <span className={styles.avatar} aria-hidden="true">{w.accountId.slice(0, 1).toUpperCase()}</span>
        <div>
          <p className="eyebrow">Profile</p>
          <h1 className="h2 mono">{w.accountId}</h1>
        </div>
      </div>
      <dl className={styles.rows}>
        <div><dt>NEAR account</dt><dd className="mono">{w.accountId}{explorer ? <> · <a className="link" href={explorer} target="_blank" rel="noreferrer">explorer</a></> : null}</dd></div>
        <div><dt>Signed in with</dt><dd>{w.method ? METHOD[w.method] : "Unknown"}</dd></div>
        <div><dt>Network</dt><dd className="mono">{w.network}</dd></div>
        <div><dt>Factory</dt><dd className="mono">{c.factory}</dd></div>
        <div><dt>Keys</dt><dd>Your keys stay in your wallet. Accord never holds a key that can approve terms or move funds.</dd></div>
      </dl>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={() => void w.disconnect()}>Disconnect</button>
        <Link href="/settings" className="small weak">Organisation and members</Link>
      </div>
    </div>
  );
}

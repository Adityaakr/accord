"use client";

// The one way in: the person's own NEAR wallet through HOT Connect (@hot-labs/near-connect). On the local sandbox the
// wallet choice becomes "Act as…" a sandbox principal.

import { shortAccount } from "@/components/account/AccountId";
import { useWallet } from "./wallet/WalletProvider";
import styles from "./SignInCard.module.css";

// Wallets with `features.testnet` in HOT Connect's manifest (hot-dao/near-selector repository/manifest.json).
const TESTNET_WALLETS = ["Meteor", "Intear", "Ledger", "Nightly", "WalletConnect"];

export function SignInCard({ title = "Sign in to Accord" }: { title?: string }) {
  const w = useWallet();
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <p className={styles.title}>{title}</p>
        <p className={styles.lead}>Every signature that moves money happens in your own account. Accord never holds a key that can.</p>
      </div>

      {w.kind === "sandbox" ? (
        <div className={styles.sandbox}>
          <p className={styles.note}>Local sandbox. Act as one of its principals; their keys are throwaway and live on this machine.</p>
          {w.sandboxPrincipals.length === 0 && <p className={styles.note}>Start <span className="mono">make serve</span> first.</p>}
          <div className={styles.roles}>
            {w.sandboxPrincipals.map((p) => (
              <button key={p.role} type="button" className={styles.role} onClick={() => void w.connect(p.role)}>
                <span>{p.role}</span>
                <span className="mono faint" title={p.account}>{shortAccount(p.account)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <button type="button" className={styles.wallet} onClick={() => void w.connect()} disabled={w.connecting}>
            <WalletIcon />
            <span>{w.connecting ? "Opening your wallet…" : "Connect a NEAR wallet"}</span>
          </button>
          {w.network === "testnet" ? (
            <>
              <p className={styles.note}>Works on testnet with {`${TESTNET_WALLETS.slice(0, -1).join(", ")} or ${TESTNET_WALLETS[TESTNET_WALLETS.length - 1]}`}.</p>
              <p className={styles.hint}>Meteor and Intear send through Accord&apos;s relayer, so there&apos;s no gas.</p>
            </>
          ) : (
            <p className={styles.note}>Any NEAR wallet HOT Connect lists for {w.network}.</p>
          )}
        </>
      )}
      {w.error && <p className={styles.error} role="alert">{w.error}</p>}
    </div>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 5.5A1.5 1.5 0 0 1 4 4h8.5v8.5H4a1.5 1.5 0 0 1-1.5-1.5z" /><path d="M10 8.25h2.5" /><path d="M4 4l6-1.5V4" />
    </svg>
  );
}

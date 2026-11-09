"use client";

// The way in: the person's own NEAR wallet through HOT Connect (@hot-labs/near-connect). On testnet a visitor without
// a wallet can try with a throwaway key made in this tab instead. On the local sandbox the wallet choice becomes
// "Act as…" a sandbox principal.

import { shortAccount } from "@/components/account/AccountId";
import { useWallet } from "./wallet/WalletProvider";
import styles from "./SignInCard.module.css";

export function SignInCard({ title = "Sign in to Accord" }: { title?: string }) {
  const w = useWallet();
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <p className={styles.title}>{title}</p>
        {w.kind !== "sandbox" && <p className={styles.lead}>Use your NEAR wallet to open and approve deal rooms.</p>}
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
          <div className={styles.group}>
            <button type="button" className={styles.wallet} onClick={() => void w.connect()} disabled={w.connecting}>
              <WalletIcon />
              <span>{w.connecting ? "Opening your wallet…" : "Connect a NEAR wallet"}</span>
            </button>
            <p className={styles.note}>Non-custodial: your keys never leave your wallet.</p>
          </div>
          {/* offered on testnet only (WalletProvider.throwawayAvailable) */}
          {w.throwawayAvailable && (
            <div className={styles.group}>
              <button type="button" className={styles.alt} onClick={() => void w.startThrowaway()} disabled={w.connecting}>
                <span>Try without a wallet</span>
              </button>
              <p className={styles.note}>Creates a temporary key in this browser tab, gone when the tab closes: use Finish on Try it before you leave, so the test funds go back.</p>
            </div>
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

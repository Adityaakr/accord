"use client";

// The one way in: a work email (NEAR Auth, a non-custodial MPC account with gas paid by Accord) or the person's own
// NEAR wallet through HOT Connect. Email sign-in is shown as available only when its testnet credentials are set
// (NEXT_PUBLIC_NEAR_AUTH_CLIENT_ID); until then it says so plainly instead of offering a flow that does not work.
// On the local sandbox the wallet choice becomes "Act as…" a sandbox principal.

import { useWallet } from "./wallet/WalletProvider";
import styles from "./SignInCard.module.css";

const EMAIL_READY = Boolean(process.env.NEXT_PUBLIC_NEAR_AUTH_CLIENT_ID);
const WALLETS = ["Meteor", "Intear", "Ledger", "Nightly", "WalletConnect"];

export function SignInCard({ title = "Sign in to Accord" }: { title?: string }) {
  const w = useWallet();
  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <p className={styles.title}>{title}</p>
        <p className={styles.lead}>Every signature that moves money happens in your own account. Accord never holds a key that can.</p>
      </div>

      <button type="button" className={styles.email} disabled={!EMAIL_READY} aria-describedby="email-note">
        <MailIcon />
        <span>Continue with work email</span>
      </button>
      <p id="email-note" className={styles.note}>
        {EMAIL_READY
          ? "A NEAR account is created for you through NEAR Auth. No seed phrase; Accord pays the gas."
          : "Email sign-in opens with the NEAR Auth testnet credentials. Use a wallet for now."}
      </p>

      <div className={styles.or}><span>or</span></div>

      {w.kind === "sandbox" ? (
        <div className={styles.sandbox}>
          <p className={styles.note}>Local sandbox. Act as one of its principals; their keys are throwaway and live on this machine.</p>
          {w.sandboxPrincipals.length === 0 && <p className={styles.note}>Start <span className="mono">make serve</span> first.</p>}
          <div className={styles.roles}>
            {w.sandboxPrincipals.map((p) => (
              <button key={p.role} type="button" className={styles.role} onClick={() => void w.connect(p.role)}>
                <span>{p.role}</span>
                <span className="mono faint">{p.account}</span>
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
          <p className={styles.note}>{WALLETS.join(" · ")} on {w.network}</p>
        </>
      )}
      {w.error && <p className={styles.error} role="alert">{w.error}</p>}
    </div>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3.5" width="12" height="9" rx="2" /><path d="m2.5 4.5 5.5 4 5.5-4" />
    </svg>
  );
}
function WalletIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 5.5A1.5 1.5 0 0 1 4 4h8.5v8.5H4a1.5 1.5 0 0 1-1.5-1.5z" /><path d="M10 8.25h2.5" /><path d="M4 4l6-1.5V4" />
    </svg>
  );
}

"use client";

// Marks an account signed in with a throwaway testnet key, with a Reset that first ends the visit (closes the room,
// returns its NEAR and deletes the account into Accord's faucet, ./useFinish.ts) and then deletes the key from this
// tab. If ending the visit fails, the key stays, with the reason and a way to reset anyway.

import { THROWAWAY_LABEL, useWallet } from "./WalletProvider";
import { useFinish } from "./useFinish";
import styles from "./WalletButton.module.css";

export function ThrowawayTag({ onReset }: { onReset?: () => void }) {
  const w = useWallet();
  const f = useFinish(onReset);
  if (w.method !== "throwaway") return null;
  const reset = () => {
    if (!f.available) { void w.disconnect().then(() => onReset?.()); return; }
    void f.run();
  };
  return (
    <span className={styles.throwaway}>
      <span className={styles.tagAlways}>{THROWAWAY_LABEL}</span>
      <button type="button" className={styles.reset} disabled={f.running} onClick={reset}>{f.running ? "Returning test NEAR…" : "Reset"}</button>
      {f.error && (
        <span className={styles.resetNote} role="alert">
          {f.error}{" "}
          <button type="button" className={styles.reset} onClick={() => { void w.disconnect().then(() => onReset?.()); }}>Reset anyway</button>
        </span>
      )}
    </span>
  );
}

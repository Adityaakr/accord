"use client";

// Marks an account signed in with a throwaway testnet key, with a Reset that deletes the key from this tab.

import { THROWAWAY_LABEL, useWallet } from "./WalletProvider";
import styles from "./WalletButton.module.css";

export function ThrowawayTag({ onReset }: { onReset?: () => void }) {
  const w = useWallet();
  if (w.method !== "throwaway") return null;
  return (
    <span className={styles.throwaway}>
      <span className={styles.tagAlways}>{THROWAWAY_LABEL}</span>
      <button type="button" className={styles.reset} onClick={() => { void w.disconnect().then(() => onReset?.()); }}>Reset</button>
    </span>
  );
}

"use client";

// An agent's bidder key shown the way API dashboards show keys: masked by default, with Reveal and Copy, and a
// short note on what it is. The key is PUBLIC (an ed25519 public key that names the agent on the board and is its
// NEAR implicit account), so revealing or sharing it is safe; the secret half never leaves the agent.
import { useState } from "react";
import styles from "./act.module.css";

const mask = (k: string) => `${k.slice(0, 6)}${"•".repeat(10)}${k.slice(-4)}`;

export function KeyChip({ id, label = "Agent ID" }: { id: string; label?: string }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div className={styles.keyChip}>
      <span className={styles.keyLabel}>
        {label}
        <span className={styles.keyInfo} tabIndex={0} aria-label="What is this?"
          data-tip="The agent's public key. It names the agent on the board and is its NEAR implicit account. Public and safe to share; the secret half stays with the agent.">?</span>
      </span>
      <code className={styles.keyValue} title={shown ? id : undefined}>{shown ? id : mask(id)}</code>
      <button type="button" className={styles.keyBtn} aria-pressed={shown} onClick={() => setShown((s) => !s)}>
        {shown ? "Hide" : "Reveal"}
      </button>
      <button type="button" className={styles.keyBtn} aria-label="Copy the agent ID"
        onClick={() => { void navigator.clipboard?.writeText(id).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }).catch(() => undefined); }}>
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

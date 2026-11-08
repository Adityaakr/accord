"use client";

// Account ids can be 64 hex characters (implicit accounts). Show them short, keep the full id in the tooltip, and let
// people copy the full id in one click.

import { useState } from "react";
import styles from "./AccountId.module.css";
import { shortAccount } from "./short";

export { shortAccount };


export function AccountId({ id, copy = false, className }: { id: string; copy?: boolean; className?: string }) {
  const [done, setDone] = useState(false);
  const s = shortAccount(id);
  return (
    <span className={`${styles.wrap} ${className ?? ""}`}>
      <span className="mono" title={id}>{s}</span>
      {copy && (
        <button type="button" className={styles.copy} aria-label={`Copy account id ${id}`} title="Copy full id"
          onClick={() => { void navigator.clipboard?.writeText(id).then(() => { setDone(true); setTimeout(() => setDone(false), 1400); }); }}>
          {done ? "Copied" : "Copy"}
        </button>
      )}
    </span>
  );
}

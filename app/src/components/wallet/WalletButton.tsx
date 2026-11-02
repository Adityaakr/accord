"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "./WalletProvider";
import styles from "./WalletButton.module.css";

function short(id: string): string {
  return id.length > 26 ? `${id.slice(0, 12)}…${id.slice(-10)}` : id;
}

export function WalletButton() {
  const w = useWallet();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (w.accountId) {
    return (
      <div className={styles.wrap} ref={ref}>
        <button type="button" className={styles.account} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <span className={styles.avatar} aria-hidden="true">{w.accountId.slice(0, 1).toUpperCase()}</span>
          <span className="mono">{short(w.accountId)}</span>
        </button>
        {open && (
          <div className={styles.menu} role="menu">
            <p className="small">{w.kind === "sandbox" ? "Signing with a local sandbox key" : "Connected through NEAR Connect"}</p>
            {w.kind === "sandbox" && w.sandboxPrincipals.map((p) => (
              <button key={p.role} type="button" role="menuitem" className={styles.item}
                onClick={() => { void w.connect(p.role); setOpen(false); }}>
                <span>Act as {p.role}</span><span className="mono faint">{short(p.account)}</span>
              </button>
            ))}
            <button type="button" role="menuitem" className={styles.item} onClick={() => { void w.disconnect(); setOpen(false); }}>
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  if (w.kind === "sandbox") {
    return (
      <div className={styles.wrap} ref={ref}>
        <button type="button" className={styles.connect} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          Act as…
        </button>
        {open && (
          <div className={styles.menu} role="menu">
            <p className="small">Local sandbox principals. Their keys are throwaway and live on this machine.</p>
            {w.sandboxPrincipals.length === 0 && <p className="small">Start <span className="mono">make serve</span> first.</p>}
            {w.sandboxPrincipals.map((p) => (
              <button key={p.role} type="button" role="menuitem" className={styles.item}
                onClick={() => { void w.connect(p.role); setOpen(false); }}>
                <span>{p.role}</span><span className="mono faint">{short(p.account)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button type="button" className={styles.connect} onClick={() => void w.connect()} disabled={w.connecting}>
      {w.connecting ? "Connecting…" : "Connect wallet"}
    </button>
  );
}

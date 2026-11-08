"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useWallet } from "./WalletProvider";
import styles from "./WalletButton.module.css";
import { Identicon } from "@/components/account/Identicon";
import { shortAccount as short } from "@/components/account/AccountId";

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
          <Identicon id={w.accountId} size={24} radius={6} />
          <span className={`mono ${styles.id}`} title={w.accountId}>{short(w.accountId)}</span>
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
            <Link href="/profile" role="menuitem" className={styles.item} onClick={() => setOpen(false)}>Profile</Link>
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
    <Link href="/signin" className={styles.connect}>Sign in</Link>
  );
}

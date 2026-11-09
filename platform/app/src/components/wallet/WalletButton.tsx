"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { THROWAWAY_LABEL, useWallet } from "./WalletProvider";
import { useFinish } from "./useFinish";
import styles from "./WalletButton.module.css";
import { Identicon } from "@/components/account/Identicon";
import { shortAccount as short } from "@/components/account/AccountId";
import { fmt, useBalances } from "./useBalances";

export function WalletButton() {
  const w = useWallet();
  const f = useFinish();
  const [open, setOpen] = useState(false);
  const bal = useBalances(w.kind === "sandbox" ? null : w.accountId ?? null);
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
          {w.kind !== "sandbox" && (
            <span className={`mono ${styles.bal}`} aria-label="Available balance">
              <span className={styles.balItem}>{fmt(bal.near, 24)} <span className={styles.balUnit}>NEAR</span></span>
              <span className={styles.balItem}>{fmt(bal.tusdc, 6)} <span className={styles.balUnit}>tUSDC</span></span>
              {bal.usdc !== null && <span className={styles.balItem}>{fmt(bal.usdc, 6)} <span className={styles.balUnit}>USDC</span></span>}
            </span>
          )}
          {w.method === "throwaway" && <span className={styles.tag}>{THROWAWAY_LABEL}</span>}
        </button>
        {open && (
          <div className={styles.menu} role="menu">
            <p className="small">{w.method === "throwaway"
              ? <><strong>{THROWAWAY_LABEL}</strong>. It lives in this tab only and is gone when you close it. Test funds only.</>
              : w.kind === "sandbox" ? "Signing with a local sandbox key" : "Connected through NEAR Connect"}</p>
            {w.kind === "sandbox" && w.sandboxPrincipals.map((p) => (
              <button key={p.role} type="button" role="menuitem" className={styles.item}
                onClick={() => { void w.connect(p.role); setOpen(false); }}>
                <span>Act as {p.role}</span><span className="mono faint">{short(p.account)}</span>
              </button>
            ))}
            <Link href="/profile" prefetch={false} role="menuitem" className={styles.item} onClick={() => setOpen(false)}>Profile</Link>
            <button type="button" role="menuitem" className={styles.item} disabled={f.running}
              onClick={() => { if (w.method === "throwaway" && f.available) { void f.run(); return; } void w.disconnect(); setOpen(false); }}>
              {w.method !== "throwaway" ? "Disconnect" : f.running ? "Returning test NEAR…" : f.available ? "Reset (return the test NEAR, delete the key)" : "Reset (delete the throwaway key)"}
            </button>
            {f.error && (
              <p className={`small ${styles.resetNote}`} role="alert">{f.error}{" "}
                <button type="button" className={styles.reset} onClick={() => { void w.disconnect(); setOpen(false); }}>Reset anyway</button>
              </p>
            )}
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

  // while a kept session is read back, show nothing rather than a Sign in button that is about to disappear
  if (w.restoring) return <span className={styles.connect} aria-hidden="true" style={{ visibility: "hidden" }}>Sign in</span>;
  return (
    <Link href="/signin" className={styles.connect}>Sign in</Link>
  );
}

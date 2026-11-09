"use client";

// The confirm step before any signature: read the decision back from chain, show the amount and the recipient as
// the chain has them now, and only then sign. Stale reads block the signature.

import { useEffect, useState, type ReactNode } from "react";
import { Usdc } from "../ui";
import { tokenSymbol, useAppConfig } from "../AppConfig";
import { readBack, type Decision, type Readback } from "./client";
import styles from "./me.module.css";

export function Confirm({ room, decision, label, tone = "primary", onSign, onCancel, children }: {
  room: string; decision: Decision; label: string; tone?: "primary" | "quiet";
  onSign: () => Promise<void>; onCancel: () => void; children?: ReactNode;
}) {
  const cfg = useAppConfig();
  const [rb, setRb] = useState<Readback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    readBack(cfg, room, decision).then((r) => { if (live) setRb(r); }).catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [cfg, room, decision]);

  return (
    <div className={styles.confirm} role="dialog" aria-label={`Confirm: ${label}`}>
      <div className={styles.confirmHead}><span>Read from chain just now</span><span className="mono">{room}</span></div>
      {error && <p className={styles.bad}>The chain could not be read: {error}</p>}
      {!rb && !error && <p className={styles.when}>Reading…</p>}
      {rb && (
        <dl className={styles.readback}>
          {rb.amount !== null && <><dt>Amount</dt><dd><Usdc amount={rb.amount} symbol={rb.factory ? tokenSymbol(cfg, rb.factory) : "tUSDC"} /></dd></>}
          {rb.recipient !== null && <><dt>Recipient</dt><dd>{rb.recipient}</dd></>}
          {rb.lines.map(([k, v]) => <span key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></span>)}
        </dl>
      )}
      {rb?.stale && <p className={styles.stale}>{rb.stale} Nothing was signed.</p>}
      {children}
      <div className={styles.actions} style={{ justifyContent: "flex-start" }}>
        <button type="button" autoFocus className={`${styles.btn} ${tone === "primary" ? styles.primary : ""}`}
          disabled={!rb || !!rb.stale || busy}
          onClick={async () => { setBusy(true); try { await onSign(); } finally { setBusy(false); } }}>
          {busy ? "Waiting for your wallet and the network…" : `Sign: ${label}`}
        </button>
        <button type="button" className={`${styles.btn} ${styles.quiet}`} onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </div>
  );
}

/** Hold for about a second to confirm; releasing early cancels. */
export function HoldButton({ label, ms = 1000, disabled, onConfirm }: { label: string; ms?: number; disabled?: boolean; onConfirm: () => void }) {
  const [k, setK] = useState(0);
  const [held, setHeld] = useState<number | null>(null);
  useEffect(() => {
    if (held === null) { setK(0); return; }
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - held) / ms);
      setK(p);
      if (p >= 1) { setHeld(null); onConfirm(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [held, ms, onConfirm]);
  const start = () => { if (!disabled) setHeld(performance.now()); };
  const stop = () => setHeld(null);
  return (
    <button type="button" className={styles.hold} disabled={disabled}
      onPointerDown={start} onPointerUp={stop} onPointerLeave={stop}
      onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && held === null) start(); }} onKeyUp={stop}
      aria-label={`${label}: hold to confirm`}>
      <span className={styles.holdFill} style={{ transform: `scaleX(${k})` }} aria-hidden="true" />
      <span className={styles.holdLabel}>{k > 0 ? "Keep holding…" : label}</span>
    </button>
  );
}

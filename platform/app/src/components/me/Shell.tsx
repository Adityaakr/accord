"use client";

// The frame the cross-room pages share: title, count, lead, keyboard hints, loading and error states, and the source
// line. Signed out, they show the sign-in card instead.

import type { ReactNode } from "react";
import { SignInCard } from "../SignInCard";
import { Stage } from "../Stage";
import styles from "./me.module.css";

export const ago = (s: number | null | undefined) => {
  if (!s) return "no time recorded";
  const d = Math.max(0, Math.floor(Date.now() / 1000 - s));
  return d < 60 ? `${d}s ago` : d < 3600 ? `${Math.floor(d / 60)}m ago` : d < 86400 ? `${Math.floor(d / 3600)}h ago` : `${Math.floor(d / 86400)}d ago`;
};

export function Shell({ title, count, lead, keys, error, loading, source, children }: {
  title: string; count?: number; lead: string; keys?: [string, string | null, string][]; error: string | null; loading: boolean;
  source?: { label: string; block: number }; children: ReactNode;
}) {
  return (
    <div className="container">
      <div className={styles.head}>
        <div>
          <h1 className="h2" style={{ display: "flex", alignItems: "center", gap: 12 }}>{title}{count !== undefined && <span className={styles.count}>{count}</span>}</h1>
          <p className={styles.lead}>{lead}</p>
        </div>
        {keys && <p className={styles.keys} aria-hidden="true">{keys.map(([a, b, what]) => <span key={what}><kbd>{a}</kbd>{b && <> <kbd>{b}</kbd></>} {what}</span>)}</p>}
      </div>
      {error && <div className={styles.error} role="alert"><p className="h5">The chain could not be read</p><p className="small mono">{error}</p></div>}
      {loading && <div className={styles.loading} aria-busy="true" />}
      {children}
      {source && <p className={`small faint ${styles.source}`}>Read from {source.label} at block {source.block}.</p>}
    </div>
  );
}

export function SignedOut({ title }: { title: string }) {
  return (
    <div className="container">
      <div className={styles.head}><div><h1 className="h2">{title}</h1><p className={styles.lead}>Sign in to see what is yours across your deal rooms.</p></div></div>
      <Stage><SignInCard /></Stage>
    </div>
  );
}

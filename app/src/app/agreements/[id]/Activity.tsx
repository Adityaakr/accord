"use client";

// Activity tab: every payment, refusal and exception in one feed, newest first. A refusal is the room's only red:
// its code in mono, what was asked for against what the terms allow (where the chain says), and "nothing sent".
// Rows that arrive while the page is open slide in; rows already there on load do not move. No shake, no modal.

import { useEffect, useRef, useState } from "react";
import styles from "./activity.module.css";

export type Event =
  | { kind: "refusal"; key: string; at: number; seq: number; code: string; item: number; amount: string | null; recipient: string | null;
      allowedAmount: string | null; allowedRecipient: string | null; via: string }
  | { kind: "payment"; key: string; at: number; id: number; item: number; amount: string; recipient: string; via: string; block: number }
  | { kind: "exception"; key: string; at: number; id: number; item: number; amount: string; status: string; by: string; reason: string };

function ago(at: number, now: number) {
  const s = Math.max(0, now - at);
  return s < 90 ? `${s} s ago` : s < 5400 ? `${Math.round(s / 60)} min ago` : s < 172800 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} d ago`;
}

export function Activity({ events, now }: { events: Event[]; now: number }) {
  // Keys present on first render never animate; anything new after that slides in once.
  const seen = useRef<Set<string> | null>(null);
  const [, force] = useState(0);
  if (seen.current === null) seen.current = new Set(events.map((e) => e.key));
  const fresh = events.filter((e) => !seen.current!.has(e.key)).map((e) => e.key);
  useEffect(() => {
    if (!fresh.length) return;
    const t = setTimeout(() => { fresh.forEach((k) => seen.current!.add(k)); force((n) => n + 1); }, 900);
    return () => clearTimeout(t);
  }, [fresh.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!events.length) return <p className={styles.empty}>No activity yet. Payments, refusals and exceptions appear here as they happen.</p>;
  return (
    <ul className={styles.feed} aria-live="polite" aria-relevant="additions">
      {events.map((e) => {
        const arriving = fresh.includes(e.key);
        if (e.kind === "refusal") {
          return (
            <li key={e.key} className={`${styles.row} ${styles.refusal} ${arriving ? styles.arrive : ""}`}>
              <span className={styles.kind}>Refused</span>
              <span className={styles.body}>
                <span className={styles.code}>{e.code}</span>
                <span className={styles.detail}>
                  {e.amount ? <>asked <b>{e.amount} USDC</b>{e.allowedAmount ? <> · terms allow <b>{e.allowedAmount} USDC</b></> : null}</> : null}
                  {e.recipient ? <>{e.amount ? " · " : ""}to <span className="mono">{e.recipient}</span>{e.allowedRecipient && e.allowedRecipient !== e.recipient ? <> · approved <span className="mono">{e.allowedRecipient}</span></> : null}</> : null}
                  {!e.amount && !e.recipient ? <>item {e.item}</> : null}
                </span>
                <span className={styles.nothing}>nothing sent</span>
              </span>
              <span className={styles.meta}>#{e.seq} · {e.via} · {ago(e.at, now)}</span>
            </li>
          );
        }
        if (e.kind === "payment") {
          return (
            <li key={e.key} className={`${styles.row} ${arriving ? styles.arrive : ""}`}>
              <span className={`${styles.kind} ${styles.paid}`}>Paid</span>
              <span className={styles.body}>
                <span className={styles.amount}>{e.amount} USDC</span>
                <span className={styles.detail}>item {e.item} → <span className="mono">{e.recipient}</span></span>
              </span>
              <span className={styles.meta}>#{e.id} · {e.via} · block {e.block.toLocaleString("en-US")}</span>
            </li>
          );
        }
        return (
          <li key={e.key} className={`${styles.row} ${arriving ? styles.arrive : ""}`}>
            <span className={styles.kind}>Exception</span>
            <span className={styles.body}>
              <span className={styles.amount}>{e.amount} USDC</span>
              <span className={styles.detail}>item {e.item} · {e.status} · asked by the {e.by} · {e.reason}</span>
            </span>
            <span className={styles.meta}>#{e.id} · {ago(e.at, now)}</span>
          </li>
        );
      })}
    </ul>
  );
}

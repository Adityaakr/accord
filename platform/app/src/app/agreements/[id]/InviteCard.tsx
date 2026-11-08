"use client";

// Shown on a room that was just created (?created=1) to its buyer: the link the counterparty opens, bound to this
// agreement's account, and the brief kept in this browser. An organisation invitation is a separate thing (Settings).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/components/wallet/WalletProvider";
import styles from "./invite.module.css";
import { withBase } from "@/lib/basePath";

export function InviteCard({ room, buyer, vendor, authority }: { room: string; buyer: string; vendor: string; authority: string }) {
  const w = useWallet();
  const [mounted, setMounted] = useState(false);
  const [brief, setBrief] = useState<{ brief: string; domain: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    setMounted(true);
    try { setBrief(JSON.parse(localStorage.getItem(`accord-brief:${room}`) ?? "null")); } catch { /* not kept */ }
  }, [room]);
  if (!mounted || hidden || w.accountId !== buyer) return null;

  const url = `${window.location.origin}${withBase(`/agreements/${room}`)}`;
  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1600); } catch { /* clipboard blocked */ }
  };

  return (
    <section className={styles.card} aria-labelledby="invite-title">
      <div className={styles.head}>
        <div>
          <p className={styles.kicker}>Room created</p>
          <h2 id="invite-title" className={styles.title}>Invite your counterparty</h2>
          <p className={styles.lead}>Send this link to {brief?.domain ? <span className="mono">{brief.domain}</span> : "the vendor"}. It opens this room, bound to its account <span className="mono">{room}</span>. The vendor signs in as <span className="mono">{vendor}</span> and its authority as <span className="mono">{authority}</span>.</p>
        </div>
        <button type="button" className={styles.close} onClick={() => setHidden(true)} aria-label="Dismiss">×</button>
      </div>
      <div className={styles.linkRow}>
        <code className={styles.link}>{url}</code>
        <button type="button" className={styles.copy} onClick={() => void copy(url, "link")}>{copied === "link" ? "Copied" : "Copy link"}</button>
      </div>
      <div className={styles.foot}>
        <span className={styles.note}>New to Accord? <Link href="/join" className="link">What the vendor does</Link> explains the steps on their side.</span>
        <Link href={`/agreements/${room}/seal`} className={styles.primary}>Seal your limits</Link>
      </div>
      {brief?.brief ? (
        <details className={styles.brief}>
          <summary>Your brief <span className={styles.note}>kept in this browser</span></summary>
          <p>{brief.brief}</p>
        </details>
      ) : null}
    </section>
  );
}

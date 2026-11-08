"use client";

// An invitation link: which organisation, its verified domain, the role and who sent it, readable before signing
// in; then sign in, confirm it's you, and accept. The link works once and expires.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWallet } from "../wallet/WalletProvider";
import { SignInCard } from "../SignInCard";
import { Stage } from "../Stage";
import { ConfirmYou } from "./ConfirmYou";
import { ROLE_INFO, useOrg, type OrgRole } from "./OrgProvider";
import styles from "./org.module.css";

interface Preview {
  org: { name: string; domain: string; domain_verified: boolean };
  role: OrgRole; invited_by: string; expires_at: string; status: "open" | "used" | "expired" | "withdrawn"; accepted_by: string | null;
}

const STATUS: Record<Exclude<Preview["status"], "open">, string> = {
  used: "This invitation was already used.",
  expired: "This invitation has expired. Ask an admin for a new link.",
  withdrawn: "This invitation was withdrawn by an admin.",
};

export function InvitePage({ token }: { token: string }) {
  const w = useWallet();
  const o = useOrg();
  const [p, setP] = useState<Preview | null>(null);
  const [missing, setMissing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b.error ?? `HTTP ${r.status}`); return b as Preview; })
      .then(setP)
      .catch((e: Error) => setMissing(e.message));
  }, [token]);

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      await o.send(`/api/invite/${encodeURIComponent(token)}`, "POST", {});
      setJoined(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const info = p && ROLE_INFO.find((r) => r.role === p.role);
  const alreadyIn = o.data?.org && !joined;

  return (
    <div className="container">
      <div className={styles.head}><div><p className="eyebrow">Invitation</p><h1 className="h2">Join an organisation</h1></div></div>
      <Stage tall>
        <div className={styles.form} style={{ alignItems: "center", width: "100%", gap: 16 }}>
          {missing && <div className={styles.card}><p className={styles.cardTitle}>This link does not work</p><p className={styles.cardLead}>{missing}</p><Link href="/" className={styles.btn}>Go home</Link></div>}
          {p && (
            <div className={styles.card}>
              <p className="eyebrow">{p.invited_by} invited you to</p>
              <p className={styles.cardTitle}>{p.org.name}</p>
              <div className={styles.inline}>
                <span className="mono small">{p.org.domain}</span>
                {p.org.domain_verified ? <span className={styles.badgeOk}>domain verified</span> : <span className={styles.badgeWait}>domain not verified yet</span>}
              </div>
              <dl className={styles.rows}>
                <dt>Your role</dt><dd><span className={styles.rolePill}>{p.role}</span></dd>
                <dt>You will be shown</dt><dd>{info?.does}</dd>
                <dt>Expires</dt><dd>{new Date(p.expires_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</dd>
              </dl>
              {p.status !== "open" && !joined && <p className={styles.error}>{STATUS[p.status]}</p>}
              {joined && (
                <>
                  <p className={`${styles.note} ${styles.ok}`} role="status">You joined {p.org.name} as {p.role}.</p>
                  <Link href="/settings?tab=members" className={styles.primary}>Open your organisation</Link>
                </>
              )}
              {!joined && p.status === "open" && w.accountId && o.session && (
                alreadyIn
                  ? <p className={styles.error}>This account already belongs to {o.data!.org!.name}. An account belongs to one organisation.</p>
                  : <>
                      <button type="button" className={styles.primary} onClick={() => void accept()} disabled={busy}>{busy ? "Joining…" : `Join as ${p.role}`}</button>
                      <p className={styles.note}>Joining as <span className="mono">{w.accountId}</span>. A role decides what you are shown; your wallet still signs every on-chain action.</p>
                    </>
              )}
              {error && <p className={styles.error} role="alert">{error}</p>}
            </div>
          )}
          {p?.status === "open" && !joined && !w.accountId && <SignInCard title="Sign in to accept" />}
          {p?.status === "open" && !joined && w.accountId && !o.session && <ConfirmYou why="Before you join, confirm this account is yours." />}
        </div>
      </Stage>
    </div>
  );
}

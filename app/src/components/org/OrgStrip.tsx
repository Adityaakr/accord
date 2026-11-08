"use client";

// One quiet line on Home about the member's organisation: confirm it's you, set one up, or prove its domain.
// Nothing shows once the organisation is set up and its domain proven.

import Link from "next/link";
import { useOrg } from "./OrgProvider";
import styles from "./org.module.css";

export function OrgStrip() {
  const o = useOrg();
  if (o.checking) return null;
  if (!o.session) {
    return (
      <div className={styles.strip}>
        <p><strong>Your organisation.</strong> Confirm it&apos;s you to see your company, its members and their roles. One signature, no transaction.</p>
        <button type="button" className={styles.btn} onClick={() => void o.confirm()} disabled={o.confirming}>{o.confirming ? "Waiting for your wallet…" : "Confirm it's you"}</button>
      </div>
    );
  }
  if (!o.data) return null;
  if (!o.data.org) {
    return (
      <div className={styles.strip}>
        <p><strong>Set up your organisation.</strong> Invite finance and operations, and decide what each of them is shown.</p>
        <Link href="/onboarding" className={styles.btn}>Create or join</Link>
      </div>
    );
  }
  if (!o.data.org.domain_verified_at && o.role === "admin") {
    return (
      <div className={styles.strip}>
        <p><strong>{o.data.org.name}</strong> · prove you control <span className="mono">{o.data.org.domain}</span> so counterparties see it verified.</p>
        <Link href="/settings" className={styles.btn}>Prove the domain</Link>
      </div>
    );
  }
  return null;
}

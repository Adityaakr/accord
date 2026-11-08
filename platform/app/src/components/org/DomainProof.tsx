"use client";

// The domain proof: the exact TXT record or file to add, copy buttons, and a check that records the result.

import { useState } from "react";
import { useOrg } from "./OrgProvider";
import styles from "./org.module.css";

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className={styles.copy} onClick={() => { void navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }); }}>
      {done ? "Copied" : "Copy"}
    </button>
  );
}

export function DomainProof() {
  const o = useOrg();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const org = o.data?.org;
  if (!org) return null;
  if (org.domain_verified_at) {
    return <p className={styles.badgeOk}>Verified {new Date(org.domain_verified_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</p>;
  }
  if (!o.data?.domain) return <p className={styles.note}>An admin proves the domain.</p>;
  const check = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const b = (await o.send("/api/org/domain", "POST", {})) as { via?: string };
      setMsg({ ok: true, text: `Verified through ${b.via === "dns" ? "DNS" : "the file"}.` });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={styles.form}>
      <div className={styles.record}>
        <div className={styles.recordRow}><span>DNS TXT</span><code className={styles.code}>{o.data.domain.record}</code><Copy text={o.data.domain.record} /></div>
        <div className={styles.recordRow}><span>on</span><code className={styles.code}>{org.domain}</code><Copy text={org.domain} /></div>
        <div className={styles.recordRow}><span>or file</span><code className={styles.code}>{o.data.domain.file}</code><Copy text={o.data.domain.file} /></div>
      </div>
      <div className={styles.inline}>
        <button type="button" className={styles.btn} onClick={() => void check()} disabled={busy}>{busy ? "Checking…" : "Check now"}</button>
        <span className={styles.note}>DNS can take a few minutes to reach every resolver.</span>
      </div>
      {msg && <p className={msg.ok ? `${styles.note} ${styles.ok}` : styles.error} role="status">{msg.text}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Panel, Pill } from "@/components/ui";
import styles from "../pages.module.css";

interface Check { url: string; checks: Record<string, string>; form: string | null; pairs: { recipient: string; settlement_authority: string }[] }

export function PayeeTool() {
  const [recipients, setRecipients] = useState("halcyon-mm.testnet");
  const [authority, setAuthority] = useState("halcyon-auth.testnet");
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<Check | null>(null);
  const [busy, setBusy] = useState(false);
  const file = JSON.stringify({
    accord: "1",
    network: "testnet",
    recipients: recipients.split(/[\s,]+/).filter(Boolean).slice(0, 8),
    settlement_authority: authority.trim(),
  }, null, 2);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const first = recipients.split(/[\s,]+/).filter(Boolean)[0] ?? "";
    const q = new URLSearchParams({ domain, account: first, authority });
    const r = await fetch(`/api/payee/check?${q}`).then((x) => x.json() as Promise<Check>).catch(() => null);
    setResult(r);
    setBusy(false);
  }

  return (
    <div className={styles.cols2}>
      <Panel title="1 · Generate the file">
        <label className="small">Payout accounts (up to 8)</label>
        <input className={styles.input} value={recipients} onChange={(e) => setRecipients(e.target.value)} />
        <label className="small">Settlement authority</label>
        <input className={styles.input} value={authority} onChange={(e) => setAuthority(e.target.value)} />
        <span className="small">Serve this at <span className="mono">https://&lt;your domain&gt;/.well-known/accord.json</span> as application/json.</span>
        <pre className={styles.code}>{file}</pre>
      </Panel>
      <Panel title="2 · Check it" eyebrow="advisory, from this server; the binding proof is the Payee job's">
        <form onSubmit={check} className={styles.search}>
          <input className={styles.input} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="halcyon.example" required />
          <button className={styles.button} disabled={busy}>{busy ? "Checking…" : "Check"}</button>
        </form>
        {result && (
          <div>
            {Object.entries(result.checks).map(([k, v]) => (
              <div key={k} className={styles.statusRow}>
                <span className="mono small">{k}</span>
                <Pill tone={v === "ok" ? "teal" : v.startsWith("not") ? "neutral" : "refusal"}>{v}</Pill>
              </div>
            ))}
            {result.form && <p className="small">Form: {result.form} · {result.pairs.length} pair(s)</p>}
          </div>
        )}
      </Panel>
    </div>
  );
}

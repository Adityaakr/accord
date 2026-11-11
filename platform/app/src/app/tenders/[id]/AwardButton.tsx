"use client";

// Asks the board for the award once the reveal window has closed. The rule (lowest revealed price within the budget)
// is in the contract; this only pays the gas for the call, through the app's relay.
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./job.module.css";

export function AwardButton({ job }: { job: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function ask() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/tenders/${job}/award`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const body = (await r.json().catch(() => ({}))) as { tx?: string; error?: string };
      if (r.ok) setMsg({ ok: true, text: body.tx ? `Award sent, tx ${body.tx.slice(0, 10)}…` : "Award sent." });
      else setMsg({ ok: false, text: body.error ?? `The relay answered ${r.status}.` });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Could not reach the relay." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.award}>
      <button type="button" className={styles.button} onClick={ask} disabled={busy} aria-busy={busy}>
        {busy ? "Asking the board…" : "Ask for the award"}
      </button>
      <p className="small" aria-live="polite">
        {msg ? <span className={msg.ok ? styles.ok : styles.bad}>{msg.text}</span> : "Anyone may ask; the board applies its own rule."}
      </p>
    </div>
  );
}

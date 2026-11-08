"use client";

// The Verified panel: each check by name, run with a nonce this browser generates. A check that could not be made
// says so; it is never shown as passed.

import { useCallback, useEffect, useState } from "react";
import type { VerifyReport } from "@accord/sdk";
import { Panel, Pill } from "@/components/ui";
import styles from "./verified.module.css";

// "partial": part of the check ran and passed, the rest was not run here (the detail says which); muted amber
const LABEL: Record<string, string> = { ok: "passed", fail: "failed", partial: "partial", not_checked: "not checked" };

function freshNonce(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function VerifiedPanel({ agreement, model }: { agreement: string; model: string }) {
  const [report, setReport] = useState<VerifyReport | null>(null);
  const [nonce, setNonce] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    const n = freshNonce();
    setNonce(n);
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(agreement)}?nonce=${n}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setReport((await res.json()) as VerifyReport);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }, [agreement]);

  useEffect(() => { void run(); }, [run]);

  return (
    <Panel
      title="Verified"
      eyebrow={nonce ? <>fresh nonce <span className="mono">{nonce.slice(0, 8)}…</span> from this browser</> : `model ${model}`}
      aside={report ? <Pill tone={report.failed ? "refusal" : "teal"}>{report.ok} ok</Pill> : undefined}
    >
      {error && <p className="small">Could not run the checks: <span className="mono">{error}</span></p>}
      {!report && !error && <p className="small">Running the checks…</p>}
      {report && (
        <ul className={styles.checks}>
          {report.checks.map((c) => (
            <li key={c.name} className={styles.check}>
              <span className={`${styles.mark} ${styles[c.status]}`} aria-label={LABEL[c.status] ?? "not checked"}>
                {c.status === "ok" ? "✓" : c.status === "fail" ? "✕" : c.status === "partial" ? "◐" : "–"}
              </span>
              <div className={styles.checkText}>
                <span className={styles.checkHead}>
                  <span className="h5">{c.name}</span>
                  {c.status === "partial" && <span className={`mono ${styles.partialLabel}`}>partial</span>}
                </span>
                <span className="small">{c.detail}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className={styles.rerun} onClick={() => void run()} disabled={running}>
        {running ? "Checking…" : "Run again with a new nonce"}
      </button>
    </Panel>
  );
}

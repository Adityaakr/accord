"use client";

// The deal room's header (docs/build/PLATFORM.md §6): the seven-step pipeline from contract state, the agent's status, and a
// Revoke control that stays in view for the buyer. Revoke is hold-to-confirm; the key is read back from chain first,
// and the header then says what the network will do with the next call.

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRefreshSoon } from "@/components/refreshSoon";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useAppConfig } from "@/components/AppConfig";
import { HoldButton } from "@/components/me/Confirm";
import { agreementClient, errorText, readBack } from "@/components/me/client";
import { STEPS, STEP_NOTE } from "./pipeline";
import { IconTile } from "@/components/IconTile";
import { AgentWork, WorkToggle, useTranscript } from "./AgentWork";
import { useRoomActivity } from "./useRoomActivity";
import styles from "./header.module.css";

export interface HeaderProps {
  room: string;
  buyer: string;
  step: number;
  terminal: string | null;
  agentKey: string | null;
  revokedKeys: number;
  canaryTripped: boolean;
  executing: boolean;
  /** the room's token symbol, tUSDC or USDC */
  symbol: string;
  explorer: string | null;
  /** changes with the chain state the page shows */
  version: string;
  /** an item is due now (the contract lists it in due_items) */
  dueNow: boolean;
  /** a test room against Accord's demo vendor, where Accord runs the demo agent */
  demoRoom: boolean;
}

export function RoomHeader({ room, buyer, step, terminal, agentKey, revokedKeys, canaryTripped, executing, symbol, explorer, version, dueNow, demoRoom }: HeaderProps) {
  const w = useWallet();
  const cfg = useAppConfig();
  const router = useRouter();
  const refreshSoon = useRefreshSoon();
  const [revoked, setRevoked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The wallet is known only in the browser; render the signed-in parts after mount so server and client agree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isBuyer = mounted && !!w.accountId && w.accountId === buyer;

  const revoke = useCallback(async () => {
    if (!w.signer) return;
    setError(null);
    try {
      const rb = await readBack(cfg, room, { kind: "revoke", key: agentKey });
      if (rb.stale) { setError(`${rb.stale} Nothing was signed.`); router.refresh(); return; }
      const tx = await agreementClient(w.signer, cfg, room).revokeAgent();
      setRevoked(tx.txHash);
      refreshSoon();
    } catch (e) {
      setError(errorText(e));
    }
  }, [w.signer, cfg, room, agentKey, router, refreshSoon]);

  const status = revoked || (!agentKey && revokedKeys > 0)
    ? "revoked"
    : agentKey ? "active" : "none";

  // the agent's work: read with the Activity tab's poll, opened from the bar
  const hasWork = executing || !!agentKey || revokedKeys > 0;
  const [open, setOpen] = useState(false);
  const workId = useId();
  const { data, error: workError } = useRoomActivity(room, version);
  const transcript = useTranscript(hasWork ? data : null);

  // In a demo room the agent pays a due item on its own. While the buyer has the room open, it is asked to look once
  // per change of chain state; the server reads the chain and the agent's record and pays at most once.
  const asked = useRef<string | null>(null);
  useEffect(() => {
    if (!demoRoom || !isBuyer || status !== "active" || !dueNow || asked.current === version) return;
    asked.current = version;
    void fetch("/api/demo-agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agreement: room, action: "tick" }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { paid?: boolean } | null) => { if (b?.paid) refreshSoon(); })
      .catch(() => undefined);
  }, [demoRoom, isBuyer, status, dueNow, version, room, refreshSoon]);

  return (
    <div className={styles.header}>
      <ol className={styles.pipeline} aria-label="Where this deal room is">
        {STEPS.map((s, i) => {
          const done = step > i, on = step === i;
          return (
            <li key={s} className={`${styles.step} ${done ? styles.done : ""} ${on ? styles.on : ""}`} aria-current={on ? "step" : undefined} style={{ ["--i" as string]: i }}>
              <span className={styles.bar} aria-hidden="true" />
              <span className={styles.name}>{s}</span>
              <span className={styles.note}>{STEP_NOTE[s]}</span>
            </li>
          );
        })}
        {terminal ? (
          <li className={`${styles.step} ${styles.ended}`} aria-current="step">
            <span className={styles.bar} aria-hidden="true" />
            <span className={styles.name}>{terminal === "NoDeal" ? "No deal" : "Cancelled"}</span>
            <span className={styles.note}>{terminal === "NoDeal" ? "Nothing was funded" : "Before execution"}</span>
          </li>
        ) : null}
      </ol>

      <div className={styles.agent} aria-live="polite">
        <span className={styles.agentLabel}><IconTile name="key" size={28} tone={status === "active" ? "teal" : "metal"} />Agent</span>
        {status === "revoked" ? (
          <span className={styles.revokedLine}>
            Agent revoked · next call rejected by the network
            {revoked ? <span className={styles.tx}> · tx {revoked.slice(0, 10)}…</span> : null}
            {canaryTripped && !revoked ? <span className={styles.tx}> · a canary request revoked it</span> : null}
          </span>
        ) : status === "active" ? (
          <span className={styles.activeLine}>
            Active · can call <span className="mono">act()</span> on this agreement and nothing else
          </span>
        ) : (
          <span className={styles.noneLine}>
            {executing ? "No agent key yet. The buyer installs it from Actions." : "No agent until the agreement is executing."}
          </span>
        )}
        {hasWork ? <span className={styles.work}><WorkToggle t={transcript} open={open} onToggle={() => setOpen((v) => !v)} controls={workId} /></span> : null}
        {isBuyer && status === "active" ? (
          <span id="revoke" className={styles.revoke}><HoldButton label="Hold to revoke" onConfirm={() => void revoke()} /></span>
        ) : null}
        {mounted && !w.accountId && status === "active" ? <Link className={styles.signin} href="/signin">Sign in as the buyer to revoke</Link> : null}
        {hasWork ? <AgentWork t={transcript} open={open} id={workId} onHide={() => setOpen(false)} symbol={symbol} explorer={explorer} loading={!data && !workError} /> : null}
      </div>
      {error ? <p className={styles.error} role="status">{error}</p> : null}
    </div>
  );
}

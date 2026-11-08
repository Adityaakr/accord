"use client";

// Agents (PLATFORM.md §6): every agent key across the rooms this account buys in. Each key can call act() on its
// own agreement and nothing else. Revoke is hold-to-confirm; the key is read back from chain first, then the row
// collapses to the network's answer.

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentRow } from "@/server/data";
import { useWallet } from "../wallet/WalletProvider";
import { useAppConfig } from "../AppConfig";
import { StatePill } from "../ui";
import { agreementClient, errorText, readBack, useMe } from "./client";
import { HoldButton } from "./Confirm";
import { SignedOut, Shell, ago } from "./Shell";
import styles from "./me.module.css";

type Data = { account: string; rows: AgentRow[]; source: { label: string; block: number } };
const short = (k: string | null) => (!k ? "none" : k.length > 22 ? `${k.slice(0, 14)}…${k.slice(-6)}` : k);

export function Agents() {
  const w = useWallet();
  const cfg = useAppConfig();
  const router = useRouter();
  const { data, error, reload } = useMe<Data>("/api/me/agents", w.accountId);
  const [revoked, setRevoked] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<Record<string, string>>({});

  const revoke = useCallback(async (row: AgentRow) => {
    if (!w.signer) return;
    setFailed((f) => ({ ...f, [row.room]: "" }));
    try {
      const rb = await readBack(cfg, row.room, { kind: "revoke", key: row.key });
      if (rb.stale) { setFailed((f) => ({ ...f, [row.room]: `${rb.stale} Nothing was signed.` })); reload(); return; }
      const tx = await agreementClient(w.signer, cfg, row.room).revokeAgent();
      setRevoked((r) => ({ ...r, [row.room]: tx.txHash }));
      reload();
      router.refresh();
    } catch (e) {
      setFailed((f) => ({ ...f, [row.room]: errorText(e) }));
    }
  }, [w.signer, cfg, reload, router]);

  if (!w.accountId) return <SignedOut title="Agents" />;
  const rows = data?.rows ?? [];
  const active = rows.filter((r) => r.status === "active").length;

  return (
    <Shell title="Agents" count={active} lead="Every agent key in the rooms you fund. Each one can call act() on its own agreement and nothing else; revoking it is one transaction."
      error={error} loading={!data && !error} source={data?.source}>
      {data && (rows.length === 0 ? (
        <div className={styles.empty}><p className="h5">Connect an agent. It will be able to call act() and nothing else.</p><p className="small">Agents work in the rooms you fund as the buyer. <Link className="link" href="/agreements/new">New deal room</Link></p></div>
      ) : (
        <div className={styles.table} role="list">
          <div className={`${styles.tableHead} ${styles.agentsCols}`} aria-hidden="true"><span>Room</span><span>Key and scope</span><span>Status</span><span>Last call</span><span>Refusals</span><span /></div>
          {rows.map((r) => {
            const done = revoked[r.room];
            return (
              <div key={r.room} role="listitem" className={`${styles.row} ${styles.agentsCols}`}>
                <span className={styles.stack}>
                  <Link className={styles.strong} href={`/agreements/${r.room}`}>{r.title}</Link>
                  <span className={styles.when}><StatePill state={r.state} /></span>
                </span>
                <span className={styles.stack}>
                  <span className={styles.mono} title={r.key ?? undefined}>{short(r.key)}</span>
                  <span className={styles.weak}>act() on <span className="mono">{r.room}</span></span>
                </span>
                <span className={`${styles.status} ${r.status === "revoked" || done ? styles.refused : ""}`}>
                  {done ? "revoked" : r.status === "none" ? "no agent" : r.status}
                </span>
                <span className={styles.when}><span className={styles.label}>Last call</span>{r.lastCall ? ago(r.lastCall) : "no calls yet"}</span>
                <span className={styles.stack}>
                  <span className={styles.mono}><span className={styles.label}>Refusals</span><span className={r.refusals ? styles.refused : ""}>{r.refusals}</span>{r.payments ? ` · ${r.payments} paid` : ""}</span>
                  {r.topCode && <span className={`${styles.when} ${styles.refused}`}>{r.topCode}</span>}
                </span>
                <span className={styles.actions}>
                  {r.status === "active" && !done && <HoldButton label="Hold to revoke" onConfirm={() => void revoke(r)} />}
                  {r.status === "none" && r.state === "Executing" && <Link className={`${styles.btn} ${styles.quiet}`} href={`/agreements/${r.room}`}>Connect an agent</Link>}
                </span>
                {done && <p className={styles.revokedRow} role="status">Revoked · next call rejected by the network · tx {done.slice(0, 10)}…</p>}
                {failed[r.room] && <p className={`${styles.result} ${styles.bad}`} style={{ gridColumn: "1 / -1" }} role="status">{failed[r.room]}</p>}
              </div>
            );
          })}
        </div>
      ))}
    </Shell>
  );
}

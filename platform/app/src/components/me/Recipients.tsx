"use client";

// Recipients (docs/build/PLATFORM.md §6): every account the rooms pay, how it was bound, and any change in progress with its
// timelock. The buyer or the vendor's settlement authority can cancel a pending change (cancel_recipient_change).

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { RecipientRow } from "@/server/data";
import { useWallet } from "../wallet/WalletProvider";
import { useAppConfig } from "../AppConfig";
import { Pill } from "../ui";
import { agreementClient, errorText, txLine, useMe } from "./client";
import { Confirm } from "./Confirm";
import { SignedOut, Shell, ago } from "./Shell";
import styles from "./me.module.css";
import { TxLink } from "@/components/TxLink";

type Data = { account: string; rows: RecipientRow[]; source: { label: string; block: number } };

const STEP: Record<string, string> = {
  Proposed: "proving the domain", Proven: "waiting for the vendor's authority", AuthorityApproved: "waiting for the buyer",
  Accepted: "accepted, in its timelock",
};

function left(activeAt: number | null, now: number): string {
  if (!activeAt) return "starts once accepted";
  const d = activeAt - now;
  if (d <= 0) return "timelock over · can activate";
  const h = Math.floor(d / 3600), m = Math.floor((d % 3600) / 60), s = d % 60;
  return h ? `${h} h ${m} min left` : m ? `${m} min ${s} s left` : `${s} s left`;
}

export function Recipients({ role, title = "Recipients", lead }: { role?: "buyer" | "vendor" | "authority"; title?: string; lead?: string } = {}) {
  const w = useWallet();
  const cfg = useAppConfig();
  const router = useRouter();
  const { data, error, reload } = useMe<Data>("/api/me/recipients", w.accountId, 10000);
  const [open, setOpen] = useState<string | null>(null);
  const [result, setResult] = useState<{ room: string; ok: boolean; text: string; txHash?: string } | null>(null);
  const [, setTick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => setTick((x) => x + 1), 1000); return () => window.clearInterval(t); }, []);

  const cancel = useCallback(async (r: RecipientRow) => {
    if (!w.signer || !r.pending) return;
    try {
      const tx = await agreementClient(w.signer, cfg, r.room).cancelRecipientChange(r.pending.version);
      setResult({ room: r.room, ...txLine("Cancel the change", tx) });
      setOpen(null);
      reload();
      router.refresh();
    } catch (e) {
      setResult({ room: r.room, ok: false, text: `Cancel the change: ${errorText(e)}` });
    }
  }, [w.signer, cfg, reload, router]);

  if (!w.accountId) return <SignedOut title={title} />;
  const rows = (data?.rows ?? []).filter((r) => !role || r.roles.includes(role));
  const bound = rows.filter((r) => r.current);
  const pending = rows.filter((r) => r.pending);
  // the chain clock moves on between reads: count down from the last read
  const drift = data ? Math.floor(Date.now() / 1000) : 0;

  return (
    <Shell title={title} count={pending.length || undefined} lead={lead ?? "Every account your agreements pay, how it was bound, and any change in progress. A change needs a fresh domain proof, the vendor's authority, the buyer and a timelock."}
      error={error} loading={!data && !error} source={data?.source}>
      {data && (
        <>
          <section className={styles.section} aria-labelledby="pending-title">
            <div className={styles.sectionHead}><h2 id="pending-title" className="h4">Changes in progress</h2></div>
            {pending.length === 0 ? <div className={styles.empty}><p className="small">No recipient change is in progress.</p></div> : (
              <div className={styles.table} role="list">
                <div className={`${styles.tableHead} ${styles.penCols}`} aria-hidden="true"><span>Room</span><span>Proposed account</span><span>Step</span><span>Timelock</span><span /></div>
                {pending.map((r) => {
                  const p = r.pending!;
                  const mine = r.roles.includes("buyer") || r.roles.includes("authority");
                  const now = r.now + Math.max(0, Math.floor(Date.now() / 1000) - drift);
                  return (
                    <div key={r.room} role="listitem" className={`${styles.row} ${styles.penCols}`}>
                      <span className={styles.stack}><Link className={styles.strong} href={`/agreements/${r.room}`}>{r.title}</Link><span className={styles.when}>v{p.version} · proposed {ago(p.proposedAt)}</span></span>
                      <span className={styles.stack}><span className={styles.mono}>{p.account}</span><span className={styles.weak}>{p.domain}{p.rating === "warn" ? " · warnings" : p.rating === "block" ? " · blocked" : ""}</span></span>
                      <span className={styles.weak}>{STEP[p.status] ?? p.status}</span>
                      <span className={styles.timer}>{p.status === "Accepted" ? left(p.activeAt, now) : "starts once accepted"}</span>
                      <span className={styles.actions}>
                        {mine && <button type="button" className={`${styles.btn} ${styles.quiet}`} onClick={() => setOpen(r.room)}>Cancel change</button>}
                      </span>
                      {open === r.room && (
                        <Confirm room={r.room} decision={{ kind: "cancel-recipient", version: p.version }} label="Cancel the change" tone="quiet"
                          onCancel={() => setOpen(null)} onSign={() => cancel(r)} />
                      )}
                      {result?.room === r.room && <p className={`${styles.result} ${result.ok ? styles.ok : styles.bad}`} style={{ gridColumn: "1 / -1" }} role="status">{result.text}{result.txHash ? <> · <TxLink hash={result.txHash} /></> : null}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className={styles.section} aria-labelledby="bound-title">
            <div className={styles.sectionHead}><h2 id="bound-title" className="h4">Bound recipients</h2></div>
            {bound.length === 0 ? <div className={styles.empty}><p className="small">No room pays a bound recipient yet. The vendor proposes one; it is proven against the vendor's domain.</p></div> : (
              <div className={styles.table} role="list">
                <div className={`${styles.tableHead} ${styles.recCols}`} aria-hidden="true"><span>Room</span><span>Account and domain</span><span>Approved by · accepted by</span><span>Version</span><span>Active since</span></div>
                {bound.map((r) => {
                  const c = r.current!;
                  return (
                    <div key={r.room} role="listitem" className={`${styles.row} ${styles.recCols}`}>
                      <span className={styles.stack}><Link className={styles.strong} href={`/agreements/${r.room}`}>{r.title}</Link><span className={styles.when}>{r.roles.map((x) => <Pill key={x} tone="teal">{x}</Pill>)}</span></span>
                      <span className={styles.stack}><span className={styles.mono}>{c.account}</span><span className={styles.weak}>{c.domain}</span></span>
                      <span className={styles.stack}><span className={styles.mono}>{r.authority}</span><span className={styles.mono}>{r.buyer}</span></span>
                      <span className={styles.mono}><span className={styles.label}>Version</span>v{c.version}</span>
                      <span className={styles.when}><span className={styles.label}>Active since</span>{c.activeAt ? ago(c.activeAt) : ago(c.proposedAt)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </Shell>
  );
}

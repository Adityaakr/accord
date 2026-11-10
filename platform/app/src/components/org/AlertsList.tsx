"use client";

// Alerts: every payment the contract refused in a room where the organisation is the buyer, newest first, each with
// what was tried against what the terms allow, and a link to the room's incident view. Read from the app's store,
// which the alert scan (server/alerts.ts) fills from the agreements' own refusal records.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useWallet } from "../wallet/WalletProvider";
import { SignInCard } from "../SignInCard";
import { Stage } from "../Stage";
import { ConfirmYou } from "./ConfirmYou";
import { useOrg } from "./OrgProvider";
import { words } from "@/lib/refusals";
import styles from "../finance.module.css";
import ostyles from "./org.module.css";

interface Alert {
  id: string; agreement: string; seq: number; code: string; at: string; read_at: string | null;
  payload: { title?: string; item?: number; attempted?: { amount: string; token: string; recipient: string | null }; approved?: { amount: string | null; recipient: string | null }; refusals_so_far?: number; auto_revoked?: boolean; key_revoked?: boolean };
}

export const ALERTS_EVENT = "accord:alerts";

export function AlertsList() {
  const w = useWallet();
  const o = useOrg();
  const [list, setList] = useState<Alert[] | null>(null);
  const [unread, setUnread] = useState(0);
  const load = useCallback(async () => {
    const r = await fetch("/api/org/alerts?limit=100", { cache: "no-store" });
    if (!r.ok) return;
    const b = (await r.json()) as { alerts: Alert[]; unread: number };
    setList(b.alerts);
    setUnread(b.unread);
  }, []);
  useEffect(() => { if (o.session) void load(); }, [o.session, load]);
  const readAll = async () => {
    await fetch("/api/org/alerts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "read" }) });
    window.dispatchEvent(new Event(ALERTS_EVENT));
    await load();
  };
  const readOne = (id: string) => {
    void fetch("/api/org/alerts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "read", ids: [id] }) })
      .then(() => window.dispatchEvent(new Event(ALERTS_EVENT)));
  };

  const head = (
    <div className={ostyles.head}>
      <div>
        <h1 className="h2">Alerts</h1>
        <p className={ostyles.lead}>Payments the contract refused in your organisation&apos;s rooms. Nothing was sent in any of them.</p>
      </div>
      {list && list.length > 0 ? <button type="button" className={`${styles.btn} ${styles.quiet}`} onClick={() => void readAll()} disabled={unread === 0}>Mark all read</button> : null}
    </div>
  );
  if (!w.accountId) return <div className="container">{head}<Stage><SignInCard /></Stage></div>;
  if (!o.session) return <div className="container">{head}<Stage><ConfirmYou why="Alerts belong to your organisation." /></Stage></div>;
  if (o.data && !o.data.org) return <div className="container">{head}<p className="small">Alerts go to an organisation. <Link className="link" href="/onboarding">Set one up</Link>.</p></div>;

  return (
    <div className="container">
      {head}
      <section className={ostyles.panel} style={{ maxWidth: 880 }}>
        <div className={ostyles.panelHead}><h2 className="h5">Refused payments</h2><span className="small faint">{unread} unread · <Link className="link" href="/settings?tab=alerts">webhook, Telegram, email</Link></span></div>
        {!list ? <p className="small faint">Loading…</p> : list.length === 0 ? <p className="small">No refusals yet. When the contract refuses an agent&apos;s payment in a room where you are the buyer, it shows here within about a minute.</p> : (
          <div>
            {list.map((a) => {
              const p = a.payload;
              return (
                <div key={a.id} className={`${styles.alert} ${a.read_at ? "" : styles.unread}`}>
                  <div className={styles.stack} style={{ gap: 4 }}>
                    <span className={styles.alertTitle}>{p.title ?? a.agreement}: {words(a.code)}</span>
                    <span className={styles.alertMeta}>
                      <span className={styles.code}>{a.code}</span> · item {p.item} · tried {p.attempted?.amount} {p.attempted?.token} to <span className="mono">{p.attempted?.recipient ?? "no recipient"}</span>
                      {p.approved?.recipient ? <> · approved <span className="mono">{p.approved.recipient}</span></> : null}
                    </span>
                    <span className={styles.alertMeta}>{a.agreement} · refusal {a.seq}{p.auto_revoked ? " · the agent key was revoked" : ""} · {new Date(a.at).toLocaleString()}</span>
                  </div>
                  <Link className={`${styles.btn} ${styles.quiet}`} href={`/agreements/${a.agreement}?tab=activity&incident=${a.seq}#incident`} onClick={() => readOne(a.id)}>Open</Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/** The unread count for the sidebar badge, read every minute while signed in and on demand after a read. */
export function useAlertCount(enabled: boolean): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!enabled) { setN(0); return; }
    let live = true;
    const read = () => fetch("/api/org/alerts?limit=1", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((b: { unread?: number } | null) => { if (live && b) setN(b.unread ?? 0); }).catch(() => undefined);
    void read();
    const t = setInterval(read, 60_000);
    window.addEventListener(ALERTS_EVENT, read);
    return () => { live = false; clearInterval(t); window.removeEventListener(ALERTS_EVENT, read); };
  }, [enabled]);
  return n;
}

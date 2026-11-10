"use client";

// Funds tab: the organisation's own PO or invoice reference for this agreement (and optionally per item), kept in
// Accord's store for the organisation and never written on chain, and the finance export of every payment. Only a
// party of the agreement, or a member of a party's organisation, sees it; the reference starts from the new-room
// brief this browser kept, when there is one.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { useOrg } from "@/components/org/OrgProvider";
import { Panel } from "@/components/ui";
import { ExportMenu } from "@/components/ExportMenu";
import { readStoredBrief } from "../new/intake";
import styles from "@/components/finance.module.css";

interface Ref { side: "buyer" | "vendor"; org: boolean; reference: string; items: Record<string, string>; updated_at: string | null }

export function FundsExport({ room, parties, items, symbol, payments }: { room: string; parties: string[]; items: number[]; symbol: string; payments: number }) {
  const w = useWallet();
  const o = useOrg();
  const [ref, setRef] = useState<Ref | null>(null);
  const [denied, setDenied] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [perItem, setPerItem] = useState<Record<string, string>>({});
  const [fromBrief, setFromBrief] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    const r = await fetch(`/api/agreements/${room}/reference`, { cache: "no-store" });
    if (r.status === 403) { setDenied("Only the agreement's parties and members of their organisations can export it."); return; }
    if (!r.ok) { setDenied(null); return; }
    const b = (await r.json()) as Ref;
    setRef(b);
    setPerItem(b.items);
    const brief = readStoredBrief(room)?.intake?.reference?.trim() ?? "";
    if (!b.reference && brief) { setValue(brief.slice(0, 64)); setFromBrief(true); } else { setValue(b.reference); setFromBrief(false); }
  }, [room]);

  useEffect(() => { if (o.session) void load().catch(() => undefined); }, [o.session, load]);

  const save = async () => {
    setMsg(null);
    const r = await fetch(`/api/agreements/${room}/reference`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ reference: value, items: perItem }) });
    const b = (await r.json().catch(() => ({}))) as { error?: string };
    if (!r.ok) { setMsg({ ok: false, text: b.error ?? "Could not save." }); return; }
    setMsg({ ok: true, text: "Saved for your organisation. Exports use it from now on." });
    setFromBrief(false);
    void load();
  };

  const isParty = mounted && !!w.accountId && parties.includes(w.accountId);
  let body: React.ReactNode;
  if (!mounted || o.checking) body = <p className={styles.note}>Loading…</p>;
  else if (!w.accountId) body = <p className={styles.note}><Link className="link" href="/signin">Sign in</Link> as a party of this agreement to export its payments for QuickBooks, Xero or your own books.</p>;
  else if (!o.session) body = (
    <div className={styles.stack}>
      <p className={styles.note}>Confirm it is you to export this agreement&apos;s payments and keep your own PO or invoice reference with them. One signature, no transaction.</p>
      <div><button type="button" className={styles.btn} onClick={() => void o.confirm()} disabled={o.confirming}>{o.confirming ? "Waiting for the wallet…" : "Confirm it's you"}</button></div>
    </div>
  );
  else if (denied) body = <p className={styles.note}>{denied}</p>;
  else if (!ref) body = <p className={styles.note}>Loading…</p>;
  else body = (
    <div className={styles.stack}>
      <div className={styles.refRow}>
        <label className={styles.field}><span>Reference (PO or invoice number), private to your organisation, never on chain</span>
          <input className={styles.input} value={value} maxLength={64} onChange={(e) => { setValue(e.target.value); setFromBrief(false); }} placeholder="PO-1042" disabled={!ref.org} aria-label="Reference" />
        </label>
        <button type="button" className={`${styles.btn} ${styles.quiet}`} onClick={() => void save()} disabled={!ref.org || (value === ref.reference && JSON.stringify(perItem) === JSON.stringify(ref.items))}>Save</button>
      </div>
      {fromBrief && <p className={styles.note}>Filled in from the brief this browser kept when the room was opened. Save it to use it in exports.</p>}
      {!ref.org && <p className={styles.note}>References are kept per organisation. <Link className="link" href="/onboarding">Set up your organisation</Link> to save one; exports work without it.</p>}
      {ref.org && items.length > 0 && (
        <details className={styles.details}>
          <summary>A different reference for some items</summary>
          <div className={styles.items}>
            {items.map((i) => (
              <label key={i} className={styles.field}><span>Item {i}</span>
                <input className={styles.input} value={perItem[String(i)] ?? ""} maxLength={64} placeholder={value || "same as above"}
                  onChange={(e) => setPerItem((p) => ({ ...p, [String(i)]: e.target.value }))} />
              </label>
            ))}
          </div>
        </details>
      )}
      {msg && <p className={`${styles.note} ${msg.ok ? styles.ok : styles.warn}`} role="status">{msg.text}</p>}
      <ExportMenu api={`/api/agreements/${room}/export`} symbols={[symbol]} disabled={payments === 0} />
      <p className={styles.note}>
        {payments === 0 ? "No payments to export yet. " : `${payments} payment${payments === 1 ? "" : "s"} in ${symbol}, `}
        {ref.side === "buyer" ? "as money out of your account (negative)." : "as money in to your account (positive)."} Amounts are in {symbol} with 2 decimals.
        {!isParty ? " You see this as a member of a party's organisation." : ""}
      </p>
    </div>
  );

  return <Panel title="Export for finance" eyebrow="QuickBooks Online, Xero or Accord's own CSV">{body}</Panel>;
}

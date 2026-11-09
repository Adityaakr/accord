"use client";

// Approvals (docs/build/PLATFORM.md §6): every decision waiting on the signed-in account across its rooms, newest first.
// Each action opens the confirm step, which reads the decision back from chain before the wallet signs.
// Keyboard: J and K move, Enter opens the room, A opens the approve step for the selected row.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalItem, Approvals as Data } from "@/server/data";
import { useWallet } from "../wallet/WalletProvider";
import { useAppConfig } from "../AppConfig";
import { Pill, Usdc } from "../ui";
import { agreementClient, errorText, txLine, useMe, type Decision } from "./client";
import { Confirm } from "./Confirm";
import { SignedOut, Shell, ago } from "./Shell";
import styles from "./me.module.css";
import { TxLink } from "@/components/TxLink";

type Choice = { key: string; option: "primary" | "secondary" };

function decisionOf(it: ApprovalItem): Decision | null {
  switch (it.kind) {
    case "terms": return { kind: "terms", termsHash: it.termsHash };
    case "recipient-approve": return { kind: "recipient", version: it.ref!, expect: ["Proven"] };
    case "recipient-accept": return { kind: "recipient", version: it.ref!, expect: ["AuthorityApproved"] };
    case "delivery": return { kind: "delivery", item: it.ref! };
    case "exception": return { kind: "exception", id: it.ref! };
    case "period": return { kind: "period", period: it.ref! };
    default: return null;
  }
}

const LABELS: Record<ApprovalItem["kind"], [string, string | null]> = {
  seal: ["Seal your limits", null],
  terms: ["Approve the terms", null],
  "recipient-approve": ["Approve the recipient", null],
  "recipient-accept": ["Accept the recipient", null],
  delivery: ["Accept the delivery", "Dispute"],
  exception: ["Approve the exception", "Reject"],
  period: ["Pay the period", "Close unpaid"],
};

export function Approvals() {
  const w = useWallet();
  const cfg = useAppConfig();
  const router = useRouter();
  const { data, error, reload } = useMe<Data>("/api/me/approvals", w.accountId);
  const [sel, setSel] = useState(0);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [reason, setReason] = useState("Does not meet the deliverable");
  const [result, setResult] = useState<{ key: string; ok: boolean; text: string; txHash?: string } | null>(null);
  const items = useMemo(() => data?.items ?? [], [data]);

  const sign = useCallback(async (it: ApprovalItem, option: Choice["option"]) => {
    if (!w.signer) return;
    const c = agreementClient(w.signer, cfg, it.room);
    const [first, second] = LABELS[it.kind];
    const label = option === "primary" ? first : second ?? first;
    try {
      let r: unknown;
      if (it.kind === "terms") r = await c.approveTerms(it.termsHash!);
      else if (it.kind === "recipient-approve") r = await c.approveRecipient(it.ref!);
      else if (it.kind === "recipient-accept") r = await c.acceptRecipient(it.ref!, { acknowledgeWarnings: it.rating === "warn" });
      else if (it.kind === "delivery") r = option === "primary" ? await c.acceptDelivery(it.ref!) : await c.disputeDelivery(it.ref!, reason.trim() || "Does not meet the deliverable");
      else if (it.kind === "exception") r = option === "primary" ? await c.approveException(it.ref!) : await c.rejectException(it.ref!);
      else if (it.kind === "period") r = await c.resolvePeriod(it.ref!, option === "primary");
      setResult({ key: it.key, ...txLine(label, r) });
      setChoice(null);
      reload();
      router.refresh();
    } catch (e) {
      setResult({ key: it.key, ok: false, text: `${label}: ${errorText(e)}` });
    }
  }, [w.signer, cfg, reason, reload, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey || !items.length) return;
      if (e.key === "j") { setSel((s) => Math.min(items.length - 1, s + 1)); setChoice(null); }
      else if (e.key === "k") { setSel((s) => Math.max(0, s - 1)); setChoice(null); }
      else if (e.key === "Enter" && !choice) { router.push(items[sel]!.href); }
      else if (e.key === "a" && !choice) {
        const it = items[sel]!;
        if (it.kind === "seal") router.push(it.href);
        else if (it.rating !== "block") setChoice({ key: it.key, option: "primary" });
      } else if (e.key === "Escape") setChoice(null);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, sel, choice, router]);

  useEffect(() => { if (sel > items.length - 1) setSel(Math.max(0, items.length - 1)); }, [items.length, sel]);

  if (!w.accountId) return <SignedOut title="Approvals" />;

  return (
    <Shell title="Approvals" count={items.length} lead="Every decision that is yours across your deal rooms, newest first. Each one is read back from chain before your wallet signs it."
      keys={[["J", "K", "move"], ["Enter", null, "open the room"], ["A", null, "approve"]]} error={error} loading={!data && !error} source={data?.source}>
      {data && (items.length === 0 ? (
        <div className={styles.empty}><p className="h5">Nothing waiting on you.</p><p className="small">Rooms move on their own until a decision is yours. <Link className="link" href="/">Back to Home</Link></p></div>
      ) : (
        <div className={`${styles.table} stagger`} role="list">
          <div className={`${styles.tableHead} ${styles.cols5}`} aria-hidden="true"><span>Waiting</span><span>Room</span><span>Amount</span><span>Recipient</span><span /></div>
          {items.map((it, i) => {
            const [first, second] = LABELS[it.kind];
            const open = choice?.key === it.key ? choice : null;
            const dec = decisionOf(it);
            return (
              <div key={it.key} role="listitem" className={`${styles.row} ${styles.cols5} ${i === sel ? styles.selected : ""}`} onClick={() => setSel(i)}>
                <span className={styles.stack}>
                  <span className={styles.strong}>{it.what}</span>
                  <span className={styles.weak} title={it.detail}>{it.detail}</span>
                </span>
                <span className={styles.stack}>
                  <Link className={styles.weak} href={it.href}>{it.title}</Link>
                  <span className={styles.when}><Pill tone="teal">{it.role}</Pill> · {ago(it.at)}</span>
                </span>
                <span className={styles.mono}><span className={styles.label}>Amount</span>{it.amount ? <Usdc amount={it.amount} symbol={it.symbol} /> : "None"}</span>
                <span className={styles.mono} title={it.recipient ?? undefined}><span className={styles.label}>Recipient</span>{it.recipient ?? "None yet"}{it.rating === "warn" ? " · warnings" : it.rating === "block" ? " · blocked" : ""}</span>
                <span className={styles.actions}>
                  {it.kind === "seal" ? (
                    <Link href={it.href} className={`${styles.btn} ${styles.primary}`}>Seal</Link>
                  ) : (
                    <>
                      {second && <button type="button" className={`${styles.btn} ${styles.quiet}`} onClick={() => { setSel(i); setChoice({ key: it.key, option: "secondary" }); }}>{second}</button>}
                      <button type="button" className={`${styles.btn} ${styles.primary}`} disabled={it.rating === "block"} onClick={() => { setSel(i); setChoice({ key: it.key, option: "primary" }); }}>{first.split(" ")[0]}</button>
                    </>
                  )}
                </span>
                {open && dec && (
                  <Confirm room={it.room} decision={dec} label={open.option === "primary" ? first : second ?? first}
                    tone={open.option === "primary" ? "primary" : "quiet"} onCancel={() => setChoice(null)} onSign={() => sign(it, open.option)}>
                    {it.kind === "delivery" && open.option === "secondary" && (
                      <label className={styles.field}>Reason the vendor sees
                        <input className={styles.input} value={reason} onChange={(e) => setReason(e.target.value)} />
                      </label>
                    )}
                  </Confirm>
                )}
                {result?.key === it.key && <p className={`${styles.result} ${result.ok ? styles.ok : styles.bad}`} style={{ gridColumn: "1 / -1" }} role="status">{result.text}{result.txHash ? <> · <TxLink hash={result.txHash} /></> : null}</p>}
              </div>
            );
          })}
        </div>
      ))}
      {result && !items.some((x) => x.key === result.key) && <p className={`${styles.result} ${result.ok ? styles.ok : styles.bad}`} role="status">{result.text}{result.txHash ? <> · <TxLink hash={result.txHash} /></> : null}</p>}
    </Shell>
  );
}

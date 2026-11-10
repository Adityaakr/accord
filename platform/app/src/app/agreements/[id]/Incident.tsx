"use client";

// The incident view: what the agent tried in a refused payment (amount, item, recipient), where the money would have
// gone against the approved recipient, the refusal's transaction, how many refusals so far, and the buyer's
// hold-to-confirm revoke (the header's revoke path, key read back first) with a link to verify. Opens on the newest
// refusal, or the one named in ?incident=<seq> (the link in every alert); the chips switch between recent ones.

import Link from "next/link";
import { useMemo, useState } from "react";
import { useWallet } from "@/components/wallet/WalletProvider";
import { HoldButton } from "@/components/me/Confirm";
import { TxLink } from "@/components/TxLink";
import { refusalTx, words } from "@/lib/refusals";
import { useRoomActivity } from "./useRoomActivity";
import { useRevoke } from "./useRevoke";
import styles from "@/components/finance.module.css";

export interface IncidentRefusal {
  seq: number; at: number; block: number; code: string; item: number; via: string;
  /** formatted with 2 decimals, or null for 0 */
  amount: string | null;
  recipient: string | null;
  /** the item's approved amount, formatted, when the contract lists it */
  approvedAmount: string | null;
}

interface Props {
  room: string; buyer: string; symbol: string; explorer: string | null; version: string;
  refusals: IncidentRefusal[];
  total: number;
  approvedRecipient: string | null;
  agentKey: string | null; revokedKeys: number; canaryTripped: boolean;
  initial: number | null;
}

const clock = (t: number) => new Date(t * 1000).toISOString().replace("T", " ").slice(0, 16) + " UTC";

export function Incident({ room, buyer, symbol, explorer, version, refusals, total, approvedRecipient, agentKey, revokedKeys, canaryTripped, initial }: Props) {
  const w = useWallet();
  const [seq, setSeq] = useState<number | null>(initial && refusals.some((r) => r.seq === initial) ? initial : refusals[0]?.seq ?? null);
  const r = refusals.find((x) => x.seq === seq) ?? refusals[0];
  const { data } = useRoomActivity(room, version);
  const { revoke, revoked, error } = useRevoke(room, agentKey);
  const found = useMemo(() => (r ? refusalTx(r, data?.entries ?? []) : { tx: null, revokedInTx: undefined }), [r, data]);
  if (!r) return null;

  const isBuyer = !!w.accountId && w.accountId === buyer;
  const keyGone = !!revoked || (!agentKey && revokedKeys > 0);
  const elsewhere = r.code === "ERR_PAYEE_MISMATCH" || r.code === "ERR_CANARY";
  return (
    <section className={styles.incident} aria-label="Refused payment" id="incident">
      <div className={styles.incHead}>
        <div className={styles.incTitle}>
          <span className={styles.code}>{r.code} · refusal {r.seq} of {total}</span>
          <h2 className="h4">The contract refused a payment: {words(r.code)}</h2>
          <span className="small">Item {r.item} · asked {r.via === "agent" ? "by the agent" : `via ${r.via}`} · {clock(r.at)} · nothing was sent</span>
        </div>
        {refusals.length > 1 && (
          <div className={styles.picker} role="group" aria-label="Recent refusals">
            {refusals.slice(0, 8).map((x) => (
              <button key={x.seq} type="button" className={`${styles.pick} ${x.seq === r.seq ? styles.pickOn : ""}`} aria-pressed={x.seq === r.seq} onClick={() => setSeq(x.seq)}>#{x.seq}</button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.compare}>
        <div className={`${styles.side} ${styles.sideBad}`}>
          <span className={styles.sideLabel}>{elsewhere ? "Where the money would have gone" : "What the agent asked for"}</span>
          <span className={styles.sideAcct}>{r.recipient ?? "no recipient"}</span>
          <span className={styles.sideAmt}>{r.amount ?? "0.00"} {symbol}</span>
        </div>
        <div className={`${styles.side} ${styles.sideGood}`}>
          <span className={styles.sideLabel}>What the approved terms allow</span>
          <span className={styles.sideAcct}>{approvedRecipient ?? "no active recipient yet"}</span>
          <span className={styles.sideAmt}>{r.approvedAmount ? `${r.approvedAmount} ${symbol}` : "the item's amount in the terms"}</span>
        </div>
      </div>

      <div className={styles.facts}>
        <span>Transaction: {found.tx ? <TxLink hash={found.tx} /> : <span className="faint">reading the room&apos;s transactions…</span>}</span>
        <span>Refusals so far: <span className="mono">{total}</span></span>
        <span>Agent key: {keyGone ? (canaryTripped ? "revoked by a canary request" : found.revokedInTx ? "revoked by this refusal" : "revoked") : agentKey ? "still installed" : "none"}</span>
        <Link href={`/verify/${room}`}>Verify this agreement</Link>
      </div>

      <div className={styles.incActions}>
        {!keyGone && agentKey && isBuyer ? <HoldButton label="Hold to revoke the agent" onConfirm={() => void revoke()} /> : null}
        {!keyGone && agentKey && !isBuyer ? <span className="small">Only the buyer ({buyer}) can revoke the agent&apos;s key.</span> : null}
        {revoked ? <span className="small">Revoked · <TxLink hash={revoked} /> · the agent&apos;s next call is rejected by the network</span> : null}
        {keyGone && !revoked ? <span className="small">The key is gone: anything the agent signs now is rejected by the network. Only the buyer can install a new one.</span> : null}
        {explorer && r.recipient ? <a className="small link" href={`${explorer}/address/${r.recipient}`} target="_blank" rel="noreferrer">Look up {r.recipient}</a> : null}
      </div>
      {error ? <p className={`${styles.note} ${styles.warn}`} role="status">{error}</p> : null}
    </section>
  );
}

"use client";

// Vendor workspace: every item across the rooms this account sells in, what happens next, and where. Claiming and
// delivering stay in the room (its Funds and Evidence tabs), where the amount and recipient are read back first.

import Link from "next/link";
import type { DeliveryRow } from "@/server/data";
import { useWallet } from "../wallet/WalletProvider";
import { KindLabel } from "../rooms/KindLabel";
import { Usdc } from "../ui";
import { useMe } from "./client";
import { Shell, SignedOut } from "./Shell";
import styles from "./me.module.css";

type Data = { rows: DeliveryRow[]; source: { label: string; block: number } };
const when = (s: number | null) => (s ? new Date(s * 1000).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

export function Deliveries() {
  const w = useWallet();
  const { data, error } = useMe<Data>("/api/me/deliveries", w.accountId, 15000);
  if (!w.accountId) return <SignedOut title="Deliveries and claims" />;
  const rows = data?.rows ?? [];
  const yours = rows.filter((r) => r.yours);
  return (
    <Shell title="Deliveries and claims" count={yours.length || undefined}
      lead="Every item in the rooms you sell in. Deliver where the terms ask for a delivery; claim a payment once it is eligible. It always goes to your proven payout account."
      error={error} loading={!data && !error} source={data?.source}>
      {data && (rows.length === 0 ? (
        <div className={styles.empty}><p className="small">No items yet. They appear once a room you sell in has approved terms.</p></div>
      ) : (
        <div className={styles.table} role="list">
          {rows.map((r) => (
            <div key={`${r.room}-${r.item}`} role="listitem" className={`${styles.row} ${styles.delCols}`}>
              <span className={styles.stack}>
                <Link className={styles.strong} href={`/agreements/${r.room}`}>{r.title} · item {r.item}</Link>
                <KindLabel kind={r.kind} />
              </span>
              <span className="mono small"><Usdc amount={r.amount} symbol={r.symbol} /></span>
              <span className={styles.when}>{r.status === "Eligible" ? "eligible" : r.dueAt ? `due ${when(r.dueAt)}` : ""}</span>
              <span className={styles.delNext}>
                {r.yours ? <Link href={`/agreements/${r.room}?tab=${r.tab}`} className={styles.delGo}>{r.next} →</Link> : <span className="small weak">{r.next}</span>}
              </span>
            </div>
          ))}
        </div>
      ))}
    </Shell>
  );
}

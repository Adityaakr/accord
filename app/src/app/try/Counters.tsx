"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui";
import styles from "./try.module.css";

interface Stats { open: boolean; attempts: number; paid_outside_terms: number; approved_payments: number }

/** Counted from the contract's own records, refreshed every few seconds. */
export function Counters() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => fetch("/api/inbox/stats").then((r) => r.json() as Promise<Stats>).then((x) => { if (live) setS(x); }).catch(() => undefined);
    void load();
    const t = setInterval(load, 5000);
    return () => { live = false; clearInterval(t); };
  }, []);
  return (
    <Panel title="Counted on chain">
      <div className={styles.counters}>
        <div><span className={styles.big}>{s?.attempts ?? "–"}</span><span className="small">attempts refused</span></div>
        <div><span className={`${styles.big} ${styles.zero}`}>{s?.paid_outside_terms ?? "–"}</span><span className="small">paid outside the terms</span></div>
        <div><span className={styles.big}>{s?.approved_payments ?? "–"}</span><span className="small">payments the terms allowed</span></div>
      </div>
    </Panel>
  );
}

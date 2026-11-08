"use client";

// The seal (PLATFORM.md §8, a signature moment). Once the mandate is sealed in this browser, each limit's number
// resolves through a blur into a slice of the commitment hash and its field locks; the whole moment takes about
// 600 ms and plays once. Reduced motion shows the end state. The numbers never leave the browser: what replaces
// them is the public commitment.

import { useEffect, useState } from "react";
import { Stage } from "@/components/Stage";
import styles from "./seal.module.css";
import { IconTile } from "@/components/IconTile";

export function SealMoment({ rows, commitment, txHash, role }: {
  rows: { label: string; value: string }[]; commitment: string; txHash: string; role: string;
}) {
  const [go, setGo] = useState(false);
  useEffect(() => { const r = requestAnimationFrame(() => setGo(true)); return () => cancelAnimationFrame(r); }, []);
  const chunk = (i: number) => commitment.slice((i * 8) % Math.max(8, commitment.length - 8), (i * 8) % Math.max(8, commitment.length - 8) + 8);
  return (
    <Stage>
      <div className={`${styles.momentCard} ${go ? styles.go : ""}`}>
        <div className={styles.momentHead}>
          <IconTile name="lock" size={28} tone="teal" />
          <span className={styles.momentTitle}>Sealed as the {role}</span>
        </div>
        <ul className={styles.momentRows}>
          {rows.map((r, i) => (
            <li key={r.label} className={styles.momentRow} style={{ ["--d" as string]: `${Math.min(i, 5) * 60}ms` }}>
              <span className={styles.momentLabel}>{r.label}</span>
              <span className={styles.momentSwap}>
                <span className={styles.momentPlain} aria-hidden={go}>{r.value}</span>
                <span className={styles.momentHash}>{chunk(i)}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className={styles.momentFoot}>
          <span className={styles.momentCommit}>commitment {commitment.slice(0, 16)}…{commitment.slice(-6)}</span>
          <span className={styles.momentTx}>tx {txHash.slice(0, 12)}…</span>
        </div>
      </div>
    </Stage>
  );
}

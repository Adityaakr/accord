"use client";

// Negotiation tab (docs/build/PLATFORM.md §8, a signature moment): one card on the website's teal stage. The buyer and the vendor
// sit in two columns whose rows line up (a shared grid with subgrid rows); the Sealed Table sits between them. The
// contract exposes the negotiation's state, both commitments and the agreed terms, not the turns, so this shows
// exactly that. Motion, one idea per state: waiting, the centre breathes; requested, a light travels from each side
// requested, the enclave's pixel grid is scanned slowly from both sealed sides toward the middle, with the attempt and the
// time since the request; done, the grid settles teal and the terms resolve through a blur. The contract does not
// expose the rounds while they run, so the scan is indeterminate. Reduced motion: a still grid, the clock still counts.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Stage } from "@/components/Stage";
import { IconTile } from "@/components/IconTile";
import { shortAccount } from "@/components/account/short";
import styles from "./negotiation.module.css";

export interface NegotiationProps {
  phase: "awaiting" | "ready" | "requested" | "done" | "ended";
  attempt: number | null;
  /** when the negotiation was requested (unix seconds, from the contract), while it runs */
  requestedAt?: number | null;
  /** the chain's time when the page was read (unix seconds) */
  now?: number;
  buyer: string;
  vendor: string;
  buyerCommit: string | null;
  vendorCommit: string | null;
  terms: { total: string; items: number; hash: string | null; label: string; unit?: string } | null;
  verifyHref: string;
}

const short = (h: string) => `${h.slice(0, 8)}…${h.slice(-4)}`;

function Side({ who, account, commit }: { who: string; account: string; commit: string | null }) {
  const sealed = !!commit;
  return (
    <div className={`${styles.side} ${sealed ? styles.sealed : ""}`}>
      <div className={styles.head}>
        <IconTile name={sealed ? "lock" : "unlock"} size={30} tone={sealed ? "teal" : "metal"} />
        <div className={styles.names}>
          <span className={styles.who}>{who}</span>
          <span className={styles.account} title={account}>{shortAccount(account)}</span>
        </div>
      </div>
      {["Limit", "Conditions"].map((l, i) => (
        <div key={l} className={styles.field}>
          <span className={styles.label}>{l}</span>
          <span className={styles.mask} style={{ ["--w" as string]: i ? "62%" : "78%" }} aria-hidden="true" />
        </div>
      ))}
      <div className={styles.foot} aria-label={sealed ? "limits sealed" : "not sealed yet"}>
        {sealed ? <><span className={styles.ok}>Sealed</span><span className={styles.commit} title={commit}>{short(commit)}</span></> : <span className={styles.wait}>Waiting to seal</span>}
      </div>
    </div>
  );
}

const COLS = 13, ROWS = 4;

/** Seconds since the request, counted on from the chain's clock at render; set after mount, so server and client agree. */
function useElapsed(at: number | null | undefined, now: number | undefined): number | null {
  const [elapsed, setElapsed] = useState<number | null>(null);
  useEffect(() => {
    if (!at || !now) { setElapsed(null); return; }
    const start = Date.now();
    const read = () => setElapsed(Math.max(0, Math.round(now + (Date.now() - start) / 1000 - at)));
    read();
    const t = setInterval(read, 1000);
    return () => clearInterval(t);
  }, [at, now]);
  return elapsed;
}

const fmt = (s: number) => (s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`);

/** The enclave: a small pixel grid between the two sealed sides; the scan meets in the middle while it negotiates. */
function Enclave({ phase }: { phase: NegotiationProps["phase"] }) {
  const mid = (COLS - 1) / 2;
  return (
    <span className={styles.enclave} aria-hidden="true">
      <span className={styles.token} />
      <span className={styles.cells} style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        {Array.from({ length: COLS * ROWS }, (_, i) => {
          const c = i % COLS, r = Math.floor(i / COLS);
          const d = Math.abs(c - mid); // distance from the centre: the scan runs from both edges inwards
          return <i key={i} style={{ ["--d" as string]: mid - d, ["--r" as string]: r, ["--still" as string]: d <= 1 && r % 2 === 0 ? 0.9 : d <= 2 ? 0.45 : 0.2 }} />;
        })}
      </span>
      <span className={styles.token} />
      {phase === "requested" ? <span className={styles.sheen} /> : null}
    </span>
  );
}

export function Negotiation(p: NegotiationProps) {
  const elapsed = useElapsed(p.phase === "requested" ? p.requestedAt : null, p.now);
  const status = {
    awaiting: "Waiting for both limits",
    ready: `Both sealed · starts next${p.attempt ? ` (attempt ${p.attempt})` : ""}`,
    requested: `Negotiating in the enclave${p.attempt ? ` · attempt ${p.attempt}` : ""}`,
    done: "Checked against both limits",
    ended: "No deal · nothing was funded",
  }[p.phase];

  return (
    <Stage compact>
      <div className={styles.card}>
        <div className={`${styles.grid} ${styles[p.phase]}`}>
          <Side who="Buyer" account={p.buyer} commit={p.buyerCommit} />

          <div className={styles.table}>
            <span className={styles.ring} aria-hidden="true" />
            <IconTile name="agents" size={40} tone={p.phase === "done" ? "teal" : "metal"} />
            <div className={styles.tableText}>
              <span className={styles.tableName}>Sealed Table</span>
              <span className={styles.tableSub}>attested enclave</span>
            </div>
            <Enclave phase={p.phase} />
            <span className={styles.status} key={p.phase} role={p.phase === "requested" ? "status" : undefined}>
              {status}
              {p.phase === "requested" && elapsed !== null ? <span className={styles.elapsed}> · {fmt(elapsed)}</span> : null}
            </span>
          </div>

          <Side who="Vendor" account={p.vendor} commit={p.vendorCommit} />
        </div>

        {p.phase === "done" && p.terms ? (
          <div className={styles.terms}>
            <div className={styles.termsMain}>
              <span className={styles.termsLabel}>Agreed terms</span>
              <span className={styles.big}>{p.terms.total}<span className={styles.unit}> {p.terms.unit ?? "USDC"}</span></span>
              <span className={styles.meta}>{p.terms.items} {p.terms.label}{p.terms.hash ? ` · ${short(p.terms.hash)}` : ""}</span>
            </div>
            <div className={styles.termsSide}>
              <span className={styles.checks}><span>Inside buyer limit</span><span>Inside vendor limit</span></span>
              <Link className={styles.verify} href={p.verifyHref}>Check the attestation →</Link>
            </div>
          </div>
        ) : (
          <p className={styles.note}>Proposals never leave the enclave. Only the agreed terms and an attestation come out.</p>
        )}
      </div>
    </Stage>
  );
}

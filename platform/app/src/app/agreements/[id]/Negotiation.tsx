"use client";

// Negotiation tab (PLATFORM.md §8, a signature moment): one card on the website's teal stage. The buyer and the vendor
// sit in two columns whose rows line up (a shared grid with subgrid rows); the Sealed Table sits between them. The
// contract exposes the negotiation's state, both commitments and the agreed terms, not the turns, so this shows
// exactly that. Motion, one idea per state: waiting, the centre breathes; requested, a light travels from each side
// into the table; done, the line settles teal and the terms resolve through a blur. Reduced motion: end states only.

import Link from "next/link";
import { Stage } from "@/components/Stage";
import { IconTile } from "@/components/IconTile";
import { shortAccount } from "@/components/account/short";
import styles from "./negotiation.module.css";

export interface NegotiationProps {
  phase: "awaiting" | "ready" | "requested" | "done" | "ended";
  attempt: number | null;
  buyer: string;
  vendor: string;
  buyerCommit: string | null;
  vendorCommit: string | null;
  terms: { total: string; items: number; hash: string | null; label: string } | null;
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

export function Negotiation(p: NegotiationProps) {
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
            <div className={styles.wire} aria-hidden="true">
              <i className={styles.spark} />
              <i className={`${styles.spark} ${styles.fromRight}`} />
            </div>
            <span className={styles.status} key={p.phase}>{status}</span>
          </div>

          <Side who="Vendor" account={p.vendor} commit={p.vendorCommit} />
        </div>

        {p.phase === "done" && p.terms ? (
          <div className={styles.terms}>
            <div className={styles.termsMain}>
              <span className={styles.termsLabel}>Agreed terms</span>
              <span className={styles.big}>{p.terms.total}<span className={styles.unit}> USDC</span></span>
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

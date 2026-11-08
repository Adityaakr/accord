"use client";

// Negotiation tab (PLATFORM.md §8, a signature moment): the two sealed mandates as masked columns either side of the
// Sealed Table, on the website's teal stage. The contract exposes the negotiation's state, both commitments and the
// agreed terms, not the turns, so this shows exactly that: who has sealed, whether the enclave run is requested or
// done, and the terms once they come out. Proposals inside the enclave are never shown, because they are never
// published. Motion: eased, blur crossfades, no bounce; reduced motion shows the end state.

import Link from "next/link";
import { Stage } from "@/components/Stage";
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

const short = (h: string) => `${h.slice(0, 10)}…${h.slice(-6)}`;

function Side({ who, account, commit }: { who: string; account: string; commit: string | null }) {
  return (
    <div className={`${styles.side} ${commit ? styles.sealed : ""}`}>
      <div className={styles.sideHead}>
        <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={styles.lock} aria-hidden="true">
          <rect x="3" y="7" width="10" height="7" rx="2" /><path d={commit ? "M5.5 7V5a2.5 2.5 0 0 1 5 0v2" : "M5.5 7V5a2.5 2.5 0 0 1 5 0"} />
        </svg>
        <span className={styles.who}>{who}</span>
      </div>
      <span className={styles.account}>{account}</span>
      <div className={styles.masked} aria-label={commit ? "limits sealed" : "not sealed yet"}>
        {["ceiling or floor", "conditions"].map((l) => (
          <span key={l} className={styles.maskRow}>
            <span>{l}</span>
            <span className={styles.dots}>{commit ? "••••••" : "·"}</span>
          </span>
        ))}
      </div>
      <span className={styles.commit}>{commit ? `commitment ${short(commit)}` : "waiting to seal"}</span>
    </div>
  );
}

export function Negotiation(p: NegotiationProps) {
  const status = {
    awaiting: "Waiting for both limits to be sealed",
    ready: `Both limits sealed · the enclave run starts next${p.attempt ? ` (attempt ${p.attempt})` : ""}`,
    requested: `Negotiating inside the enclave${p.attempt ? ` · attempt ${p.attempt}` : ""}`,
    done: "Done · the outcome was checked against both sealed limits",
    ended: "No deal · nothing was funded",
  }[p.phase];

  return (
    <Stage>
      <div className={styles.card}>
        <div className={styles.cols}>
          <Side who="Buyer" account={p.buyer} commit={p.buyerCommit} />
          <div className={`${styles.band} ${styles[p.phase]}`}>
            <span className={styles.bandName}>Sealed Table</span>
            <span className={styles.bandSub}>attested enclave</span>
            <div className={styles.track} aria-hidden="true">
              <i className={styles.pulse} />
              <i className={`${styles.pulse} ${styles.late}`} />
            </div>
            <span className={styles.status} key={p.phase}>{status}</span>
          </div>
          <Side who="Vendor" account={p.vendor} commit={p.vendorCommit} />
        </div>

        {p.phase === "done" && p.terms ? (
          <div className={styles.terms}>
            <div className={styles.termsHead}>
              <span className={styles.termsTitle}>Agreed terms</span>
              <span className={styles.checks}>
                <span><Tick />inside buyer limit</span>
                <span><Tick />inside vendor limit</span>
              </span>
            </div>
            <div className={styles.termsRow}>
              <span className={styles.big}>{p.terms.total} <span className={styles.unit}>USDC</span></span>
              <span className={styles.meta}>{p.terms.items} {p.terms.label}</span>
              {p.terms.hash ? <span className={styles.meta}>terms {short(p.terms.hash)}</span> : null}
              <Link className={styles.verify} href={p.verifyHref}>Check the attestation →</Link>
            </div>
          </div>
        ) : (
          <p className={styles.honest}>Proposals stay inside the enclave and are never published. Code checks each one against both sealed limits; only the agreed terms and an attestation come out.</p>
        )}
      </div>
    </Stage>
  );
}

const Tick = () => (
  <svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" /></svg>
);

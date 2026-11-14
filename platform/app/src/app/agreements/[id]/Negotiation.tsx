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
import { SLOW_AFTER_SECS } from "@accord/sdk";
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
  /** ended with no deal because no signed answer reached the contract on any attempt */
  unanswered?: boolean;
  /** both sealed, and the start is held because this many OutLayer requests have waited over SLOW_AFTER_SECS */
  held?: number | null;
}

/** NEAR lets a contract wait about 200 blocks for the enclave's answer; past this an attempt is very likely lost. */
const LATE_AFTER_SECS = 150;

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
    ready: p.held ? `Both sealed · held until OutLayer's queue clears${p.attempt ? ` (attempt ${p.attempt})` : ""}` : `Both sealed · starts next${p.attempt ? ` (attempt ${p.attempt})` : ""}`,
    requested: `Negotiating in the enclave${p.attempt ? ` · attempt ${p.attempt}` : ""}`,
    done: "Checked against both limits",
    ended: p.unanswered ? "No deal · the enclave did not answer in time" : "No deal · nothing was funded",
  }[p.phase];
  // why this room is waiting or ended, when the cause is the enclave's answer arriving late or not at all
  const late = p.phase === "requested" && elapsed !== null && elapsed >= LATE_AFTER_SECS;
  const retried = (p.phase === "ready" || p.phase === "requested") && (p.attempt ?? 1) > 1;
  const noAnswer = p.phase === "ended" && !!p.unanswered;

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
        ) : noAnswer ? (
          <div className={styles.note}>
            <p><strong>This room ended because the Sealed Table&apos;s answer never arrived, not because the two sides could not agree.</strong>{" "}
              The negotiation runs in an enclave on OutLayer&apos;s testnet worker, and a NEAR contract can wait about <span className="mono">200</span> blocks
              (2 to 3 minutes) for it. All <span className="mono">3</span> attempts passed that wait with no signed answer, so the contract closed the room
              as <span className="mono">No deal</span>. Nothing was funded, both sets of limits stayed sealed, and the creation deposit can be withdrawn.</p>
            <p>A room cannot be negotiated again, so <Link className="link" href="/try-it" prefetch={false}>open a new one</Link> when the worker has caught up.
              These need no new negotiation: <Link className="link" href="/try" prefetch={false}>the live room</Link> (already past negotiation; a redirect is
              refused on chain), <Link className="link" href="/replay" prefetch={false}>the replay</Link> of a recorded run, and{" "}
              <Link className="link" href="/verify" prefetch={false}>verify</Link> for any earlier agreement.</p>
          </div>
        ) : p.phase === "ready" && p.held ? (
          <p className={styles.note}>
            Both sets of limits are sealed. The negotiation runs on OutLayer&apos;s testnet enclave worker, which is answering late right now
            (<span className="mono">{p.held}</span> of its requests have waited over <span className="mono">{SLOW_AFTER_SECS} s</span>). A room has <span className="mono">3</span> attempts and each must be
            answered inside NEAR&apos;s wait of about <span className="mono">200</span> blocks, so the keeper holds the start until the queue clears, for <span className="mono">15</span> minutes
            at most, instead of spending an attempt now. It starts by itself and this page updates. Starting it yourself spends an attempt.
          </p>
        ) : late || retried ? (
          <p className={styles.note}>
            {late
              ? <>This attempt has waited longer than usual. A NEAR contract can wait about <span className="mono">200</span> blocks (2 to 3 minutes) for the enclave, which runs on OutLayer&apos;s testnet worker; if the answer comes after that, the contract counts the attempt as failed. </>
              : <>Attempt <span className="mono">{(p.attempt ?? 2) - 1}</span> returned no signed answer the contract accepts, usually because OutLayer&apos;s testnet worker answered after NEAR&apos;s wait of about <span className="mono">200</span> blocks. </>}
            The contract allows <span className="mono">3</span> attempts, then closes the room as <span className="mono">No deal</span> with nothing funded. Your limits stay sealed throughout.
          </p>
        ) : (
          <p className={styles.note}>Proposals never leave the enclave. Only the agreed terms and an attestation come out.</p>
        )}
      </div>
    </Stage>
  );
}

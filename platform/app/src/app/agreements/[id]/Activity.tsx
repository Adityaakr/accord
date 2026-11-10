"use client";

// Activity tab: everything that happened in the room, newest first, read from the agreement account's own
// transactions (server/activity.ts): creation, both mandates, the negotiation and its OutLayer job, approvals,
// funding, the recipient's path, deliveries, the agent's key, every payment and refusal, exceptions and the close.
// Each row: what happened, the amount in the room's own token, who did it, when (absolute time on hover) and the
// transaction on nearblocks. Red only for a refusal or a revocation. Rows that arrive while the page is open slide in
// once; rows there on load do not move. If the transaction history cannot be read, the contract's own records
// (payments, refusals, exceptions) show instead, and the tab says so.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ActivityEntry, Group } from "@/lib/activity";
import { ago, clock, nearAmount, tokenAmount, useRoomActivity } from "./useRoomActivity";
import styles from "./activity.module.css";

/** The contract's own records, used when the transaction history cannot be read. */
export type Event =
  | { kind: "refusal"; key: string; at: number; seq: number; block: number; code: string; item: number; amount: string | null; recipient: string | null;
      allowedAmount: string | null; allowedRecipient: string | null; via: string }
  | { kind: "payment"; key: string; at: number; id: number; item: number; amount: string; recipient: string; via: string; block: number }
  | { kind: "exception"; key: string; at: number; id: number; item: number; amount: string; status: string; by: string; reason: string };

const CHIPS: [string, string, (g: Group) => boolean][] = [
  ["all", "All", () => true],
  ["payments", "Payments", (g) => g === "payments"],
  ["refusals", "Refusals", (g) => g === "refusals"],
  ["approvals", "Approvals", (g) => g === "approvals"],
  ["recipient", "Recipient", (g) => g === "recipient"],
  ["funds", "Funds", (g) => g === "funds"],
];

const short = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`;
const shortAcct = (a: string) => (a.length > 28 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a);

interface Props { agreement: string; now: number; symbol?: string; explorer: string | null; fallback: Event[]; version?: string | number }

export function Activity({ agreement, now, symbol = "USDC", explorer, fallback, version }: Props) {
  const { data, error } = useRoomActivity(agreement, version);
  const [chip, setChip] = useState("all");
  const entries = data?.entries ?? null;
  const clockNow = data?.now ?? now;

  // keys on screen at first paint never animate; anything newer slides in once
  const seen = useRef<Set<string> | null>(null);
  const [, force] = useState(0);
  if (entries && seen.current === null) seen.current = new Set(entries.map((e) => e.key));
  const fresh = entries && seen.current ? entries.filter((e) => !seen.current!.has(e.key)).map((e) => e.key) : [];
  useEffect(() => {
    if (!fresh.length) return;
    const t = setTimeout(() => { fresh.forEach((k) => seen.current!.add(k)); force((n) => n + 1); }, 900);
    return () => clearTimeout(t);
  }, [fresh.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => Object.fromEntries(CHIPS.map(([k, , f]) => [k, (entries ?? []).filter((e) => f(e.group)).length])), [entries]);
  const shown = (entries ?? []).filter((e) => CHIPS.find(([k]) => k === chip)![2](e.group));
  const tx = (h: string) => (explorer ? `${explorer}/txns/${h}` : null);
  // a refused row opens the incident view above: matched to the contract's refusal record by block, code and item
  const seqOf = (e: ActivityEntry) => fallback.find((f) => f.kind === "refusal" && f.block === e.block && f.code === e.code && f.item === e.item)?.key.slice(1) ?? null;
  const addr = (a: string) => (explorer ? `${explorer}/address/${a}` : null);

  if (!entries) {
    if (!data && !error) return <Loading />;
    return (
      <>
        <p className={styles.note}>The room&apos;s transaction history cannot be read right now; these are the contract&apos;s own records.</p>
        <Fallback events={fallback} now={now} symbol={symbol} />
      </>
    );
  }

  return (
    <div>
      <div className={styles.chips} role="toolbar" aria-label="Filter the activity">
        {CHIPS.map(([k, label]) => (
          <button key={k} type="button" className={`${styles.chip} ${chip === k ? styles.chipOn : ""} ${k === "refusals" && counts[k] ? styles.chipRed : ""}`}
            aria-pressed={chip === k} onClick={() => setChip(k)} disabled={k !== "all" && !counts[k]}>
            {label}<span className={styles.chipCount}>{counts[k]}</span>
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className={styles.empty}>{entries.length ? "Nothing of this kind yet." : "No activity yet. Every step of the room appears here as it happens."}</p>
      ) : (
        <ol className={styles.feed} aria-live="polite" aria-relevant="additions">
          {shown.map((e) => <Row key={e.key} e={e} now={clockNow} symbol={symbol} tx={tx(e.tx)} addr={addr} arriving={fresh.includes(e.key)} incident={e.event === "act_refused" ? seqOf(e) : null} />)}
        </ol>
      )}
      {!data?.complete && <p className={styles.note}>Some transactions could not be read yet; they appear on the next refresh.</p>}
    </div>
  );
}

function Row({ e, now, symbol, tx, addr, arriving, incident }: { e: ActivityEntry; now: number; symbol: string; tx: string | null; addr: (a: string) => string | null; arriving: boolean; incident: string | null }) {
  const acct = (a: string) => {
    const h = addr(a);
    return h ? <a className={styles.acct} href={h} target="_blank" rel="noreferrer" title={a}>{shortAcct(a)}</a> : <span className={styles.acct} title={a}>{shortAcct(a)}</span>;
  };
  const amount = e.amount && e.amount !== "0"
    ? <span className={styles.amount}>{e.unit === "NEAR" ? nearAmount(e.amount) : tokenAmount(e.amount)}<span className={styles.unit}> {e.unit === "NEAR" ? "NEAR" : symbol}</span></span>
    : null;
  return (
    <li className={`${styles.row} ${e.red ? styles.red : ""} ${arriving ? styles.arrive : ""}`}>
      <span className={`${styles.mark} ${styles[`g_${e.group}`] ?? ""}`} aria-hidden="true" />
      <div className={styles.main}>
        <div className={styles.line}>
          <span className={styles.label}>{e.label}</span>
          {e.code ? <span className={styles.code}>{e.code}</span> : null}
          {amount}
        </div>
        <div className={styles.detail}>
          {e.event === "act_refused" ? <>{e.account ? <>to {acct(e.account)} · </> : null}item {e.item} · nothing sent{incident ? <> · <Link className={styles.acct} href={`?tab=activity&incident=${incident}#incident`} scroll={false}>open the incident</Link></> : null}</>
            : e.event === "payment_sent" ? <>to {e.account ? acct(e.account) : "the recipient"}{e.detail ? ` · ${e.detail}` : ""}</>
            : <>
                {e.account ? acct(e.account) : null}
                {e.account && (e.detail || e.job !== null) ? " · " : null}
                {e.detail ? <span className={e.event.startsWith("agent_key") ? styles.mono : undefined}>{e.event.startsWith("agent_key") ? short(e.detail) : e.detail}</span> : null}
                {e.detail && e.job !== null ? " · " : null}
                {e.job !== null ? <span className={styles.mono}>OutLayer job {e.job}</span> : null}
              </>}
        </div>
      </div>
      <div className={styles.meta}>
        <span className={`${styles.actor} ${e.actor === "agent" ? styles.actorAgent : ""}`}>{e.actor === "account" && e.actorAccount ? shortAcct(e.actorAccount) : e.actor}</span>
        <time className={styles.time} dateTime={new Date(e.at * 1000).toISOString()} title={clock(e.at)}>{ago(e.at, now)}</time>
        {tx ? <a className={styles.tx} href={tx} target="_blank" rel="noreferrer" aria-label={`Transaction ${e.tx} on nearblocks`}>tx {e.tx.slice(0, 6)}<Arrow /></a> : <span className={styles.tx}>tx {e.tx.slice(0, 6)}</span>}
      </div>
    </li>
  );
}

const Arrow = () => (
  <svg viewBox="0 0 12 12" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" /></svg>
);

function Loading() {
  return (
    <div className={styles.loading} role="status">
      <span className={styles.srOnly}>Reading the room&apos;s transactions</span>
      {[0, 1, 2, 3].map((i) => <span key={i} className={styles.skel} style={{ ["--i" as string]: i }} aria-hidden="true" />)}
    </div>
  );
}

function Fallback({ events, now, symbol }: { events: Event[]; now: number; symbol: string }) {
  if (!events.length) return <p className={styles.empty}>No payments, refusals or exceptions yet.</p>;
  return (
    <ol className={styles.feed}>
      {events.map((e) => (
        <li key={e.key} className={`${styles.row} ${e.kind === "refusal" ? styles.red : ""}`}>
          <span className={`${styles.mark} ${e.kind === "payment" ? styles.g_payments : e.kind === "refusal" ? styles.g_refusals : styles.g_approvals}`} aria-hidden="true" />
          <div className={styles.main}>
            <div className={styles.line}>
              <span className={styles.label}>{e.kind === "refusal" ? "Refused" : e.kind === "payment" ? `Paid item ${e.item}` : `Exception · item ${e.item}`}</span>
              {e.kind === "refusal" ? <span className={styles.code}>{e.code}</span> : null}
              {e.amount ? <span className={styles.amount}>{e.amount}<span className={styles.unit}> {symbol}</span></span> : null}
            </div>
            <div className={styles.detail}>
              {e.kind === "refusal" ? <>{e.recipient ? <>to <span className={styles.acct}>{e.recipient}</span> · </> : null}item {e.item} · nothing sent</>
                : e.kind === "payment" ? <>to <span className={styles.acct}>{e.recipient}</span> · block {e.block.toLocaleString("en-US")}</>
                : <>{e.status} · asked by the {e.by} · {e.reason}</>}
            </div>
          </div>
          <div className={styles.meta}>
            <span className={styles.actor}>{e.kind === "exception" ? e.by : e.via}</span>
            <time className={styles.time} title={clock(e.at)}>{ago(e.at, now)}</time>
          </div>
        </li>
      ))}
    </ol>
  );
}

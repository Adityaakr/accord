"use client";

// The agent's work, opened from the agent bar in the room header: what it read (the buyer's ask, the room check, an
// inbox message), what it meant to do, each act call with what the contract did, and its key being installed and
// revoked, each with its time and transaction. Built only from real data (lib/transcript.ts): the chain for results,
// the agent's own record and the inbox for inputs. The look follows the site's deal-room mock-up: a message bubble,
// the agent's reply line, "Worked for … · N steps", and the step list.

import { useMemo } from "react";
import { IconTile } from "@/components/IconTile";
import { buildTranscript, workedFor, type Transcript, type TranscriptEntry } from "@/lib/transcript";
import { clock, tokenAmount, type RoomActivityData } from "./useRoomActivity";
import styles from "./agentwork.module.css";

export function useTranscript(data: RoomActivityData | null): Transcript | null {
  return useMemo(() => (data ? buildTranscript(data.entries, data.records, data.messages, data.now) : null), [data]);
}

/** The bar's toggle: "Show the agent's work · 4 steps ⌄". */
export function WorkToggle({ t, open, onToggle, controls }: { t: Transcript | null; open: boolean; onToggle: () => void; controls: string }) {
  const n = t?.steps ?? 0;
  return (
    <button type="button" className={styles.toggle} onClick={onToggle} aria-expanded={open} aria-controls={controls}>
      {open ? "Hide the agent's work" : "Show the agent's work"}
      {n > 0 ? <span className={styles.toggleCount}>{n} step{n === 1 ? "" : "s"}</span> : null}
      <svg className={`${styles.chev} ${open ? styles.chevOpen : ""}`} viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 4.5 3 3 3-3" /></svg>
    </button>
  );
}

const Tick = () => (
  <svg viewBox="0 0 16 16" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" /></svg>
);
const Cross = () => (
  <svg viewBox="0 0 16 16" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="m4.5 4.5 7 7M11.5 4.5l-7 7" /></svg>
);

function answer(t: Transcript, symbol: string): string {
  const last = [...t.entries].reverse().find((e) => e.kind !== "read" && e.kind !== "intent") ?? t.last;
  if (!last) return "Nothing yet. Once its key is installed, the agent pays each accepted item on its own.";
  switch (last.kind) {
    case "paid": return `Paid item ${last.item}: ${last.amount ? tokenAmount(last.amount) : ""} ${symbol} to ${last.recipient ?? "the active recipient"}.`;
    case "refused": return `The contract refused the call with ${last.code}. Nothing was sent.`;
    case "rejected": return "The network rejected its call: the agreement holds no key for the agent.";
    case "key": return last.installed ? "Key installed. It can call act() on this agreement and nothing else, and pays accepted items on its own." : `${last.reason ?? "Key revoked"}. Anything it signs now is rejected by the network.`;
    default: return "Working on it.";
  }
}

export function AgentWork({ t, open, id, onHide, symbol, explorer, loading }: { t: Transcript | null; open: boolean; id: string; onHide: () => void; symbol: string; explorer: string | null; loading: boolean }) {
  const tx = (h: string | null) => (h && explorer ? `${explorer}/txns/${h}` : null);
  return (
    <div id={id} className={`${styles.wrap} ${open ? styles.open : ""}`} aria-hidden={!open}>
      <div className={styles.inner}>
        <div className={styles.card}>
          {!t ? (
            <p className={styles.quiet} role="status">{loading ? "Reading the agent's work from the chain…" : "The agent's work cannot be read right now."}</p>
          ) : (
            <>
              <div className={styles.agent}>
                <IconTile name="agents" size={30} tone="teal" />
                <div className={styles.agentBody}>
                  <p className={styles.answer}>{answer(t, symbol)}</p>
                  <div className={styles.meta}>
                    {t.steps > 0 ? <span>Worked for {workedFor(t.workedFor)} · {t.steps} step{t.steps === 1 ? "" : "s"}</span> : <span>No calls yet</span>}
                    <button type="button" className={styles.metaBtn} onClick={onHide} tabIndex={open ? 0 : -1}>Hide work</button>
                  </div>
                </div>
              </div>
              {t.entries.length > 0 && (
                <ol className={styles.trace}>
                  {t.entries.map((e) => <Step key={e.key} e={e} symbol={symbol} href={tx("tx" in e ? e.tx : null)} open={open} />)}
                </ol>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function When({ at, href, hash, open }: { at: number; href: string | null; hash: string | null; open: boolean }) {
  return (
    <span className={styles.when}>
      <time dateTime={new Date(at * 1000).toISOString()} title={clock(at)}>{new Date(at * 1000).toISOString().slice(11, 19)}</time>
      {hash ? (href ? <a href={href} target="_blank" rel="noreferrer" tabIndex={open ? 0 : -1} aria-label={`Transaction ${hash} on nearblocks`}>tx {hash.slice(0, 6)}</a> : <span>tx {hash.slice(0, 6)}</span>) : null}
    </span>
  );
}

function Step({ e, symbol, href, open }: { e: TranscriptEntry; symbol: string; href: string | null; open: boolean }) {
  const amt = (a: string | null) => (a ? `${tokenAmount(a)} ${symbol}` : "");
  switch (e.kind) {
    case "read":
      return (
        <li className={styles.msg}>
          <span className={styles.msgFrom}>{e.from} <When at={e.at} href={null} hash={null} open={open} /></span>
          <p className={styles.bubble}>{e.text}</p>
        </li>
      );
    case "intent":
      return (
        <li className={`${styles.step} ${styles.k_intent}`}>
          <span className={styles.head}><span className={styles.glyph}>∴</span><span className={styles.text}>pay item {e.item}, {amt(e.amount)} to {e.recipient}</span></span>
        </li>
      );
    case "paid":
      return (
        <li className={`${styles.step} ${styles.k_call}`}>
          <span className={styles.head}><span className={styles.glyph}>▸</span><span className={styles.text}>act(Pay item {e.item ?? "?"})</span></span>
          <span className={styles.out}><span className={styles.ok}><Tick /></span><span className={styles.event}>payment_sent</span> {amt(e.amount)} to {e.recipient}<When at={e.at} href={href} hash={e.tx} open={open} /></span>
        </li>
      );
    case "refused":
      return (
        <li className={`${styles.step} ${styles.k_call} ${styles.bad}`}>
          <span className={styles.head}><span className={styles.glyph}>▸</span><span className={styles.text}>act(Pay item {e.item ?? "?"})</span></span>
          <span className={styles.out}><span className={styles.no}><Cross /></span><span className={styles.event}>act_refused</span> <span className={styles.code}>{e.code}</span> nothing sent<When at={e.at} href={href} hash={e.tx} open={open} /></span>
        </li>
      );
    case "rejected":
      return (
        <li className={`${styles.step} ${styles.k_call} ${styles.bad}`}>
          <span className={styles.out}><span className={styles.no}><Cross /></span>{e.text}<When at={e.at} href={href} hash={e.tx} open={open} /></span>
        </li>
      );
    case "key":
      return (
        <li className={`${styles.step} ${styles.k_key} ${e.red ? styles.bad : ""}`}>
          <span className={styles.out}>
            <span className={e.red ? styles.no : styles.ok}>{e.red ? <Cross /> : <Tick />}</span>
            {e.installed ? "Agent key installed by the buyer" : e.reason}
            <When at={e.at} href={href} hash={e.tx} open={open} />
          </span>
        </li>
      );
  }
}

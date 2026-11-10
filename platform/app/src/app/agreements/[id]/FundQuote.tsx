"use client";

// Fund from another chain, quote only: what delivering this agreement's total as native USDC on NEAR would cost from
// USDC on Base, Ethereum, Arbitrum or Solana, priced by NEAR Intents' 1Click (/api/fund-quote, packages/sdk funding.ts).
// Dry quotes: nothing is signed or sent. 1Click runs on mainnet only, so on testnet this is a price, and the panel
// says so. It asks only when the button is pressed, so a room view never calls 1Click on its own.

import { useState } from "react";
import { Panel } from "@/components/ui";
import styles from "./verified.module.css";

type Quote = { source: string; label: string; amountInFormatted?: string; seconds?: number | null; error?: string };
type Answer = { quotes: Quote[]; scope: string; total: string; symbol: string };

export function FundQuote({ agreement }: { agreement: string }) {
  const [a, setA] = useState<Answer | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ask = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/fund-quote/${encodeURIComponent(agreement)}`, { cache: "no-store" });
      const b = (await r.json()) as Answer & { error?: string };
      if (!r.ok) throw new Error(b.error ?? `HTTP ${r.status}`);
      setA(b);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Panel title="Fund from another chain" eyebrow="NEAR Intents 1Click · dry quote, nothing is sent">
      {!a ? (
        <div className={styles.checks}>
          <p className="small">What it costs to deliver this agreement&apos;s total as USDC on NEAR from USDC on Base, Ethereum, Arbitrum or Solana.</p>
          <button type="button" className={styles.rerun} onClick={() => void ask()} disabled={busy}>{busy ? "Asking 1Click…" : "Get quotes"}</button>
          {err && <p className="small" role="alert">{err}</p>}
        </div>
      ) : (
        <div className={styles.checks}>
          {a.quotes.map((q) => (
            <div key={q.source} className={styles.checkHead} style={{ justifyContent: "space-between" }}>
              <span className="small">{q.label}</span>
              {q.error
                ? <span className="small faint">{q.error}</span>
                : <span className="mono small">{q.amountInFormatted} in{q.seconds ? ` · ~${q.seconds} s` : ""}</span>}
            </div>
          ))}
          <p className="small faint">{a.scope}</p>
          <button type="button" className={styles.rerun} onClick={() => void ask()} disabled={busy}>{busy ? "Asking…" : "Ask again"}</button>
        </div>
      )}
    </Panel>
  );
}

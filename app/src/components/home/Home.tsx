"use client";

// Home (PLATFORM.md §7). Signed out: a short welcome and the sign-in card. Signed in: what needs this person first,
// then the numbers that matter (escrowed, paid this month, refused with the top code, the next eligible payment, the
// agents), then their rooms. Everything is read from contract views through /api/me; nothing here signs.

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Portfolio } from "@/server/data";
import { useWallet } from "../wallet/WalletProvider";
import { SignInCard } from "../SignInCard";
import { Stage } from "../Stage";
import { Pill, StatePill, Usdc } from "../ui";
import styles from "./Home.module.css";

const ago = (s: number | null) => {
  if (!s) return "no calls yet";
  const d = Math.max(0, Math.floor(Date.now() / 1000 - s));
  return d < 60 ? `${d}s ago` : d < 3600 ? `${Math.floor(d / 60)}m ago` : d < 86400 ? `${Math.floor(d / 3600)}h ago` : `${Math.floor(d / 86400)}d ago`;
};
const when = (s: number | null) => (s ? new Date(s * 1000).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
const ROLE: Record<string, string> = { buyer: "buyer", vendor: "vendor", authority: "authority" };

export function Home() {
  const w = useWallet();
  const [data, setData] = useState<Portfolio | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!w.accountId) { setData(null); return; }
    let live = true;
    const load = () => fetch(`/api/me?account=${encodeURIComponent(w.accountId!)}`, { cache: "no-store" })
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b.error ?? `HTTP ${r.status}`); return b as Portfolio; })
      .then((b) => { if (live) { setData(b); setError(null); } })
      .catch((e: Error) => { if (live) setError(e.message); });
    void load();
    const t = window.setInterval(load, 15000);
    return () => { live = false; window.clearInterval(t); };
  }, [w.accountId]);

  if (!w.accountId) {
    return (
      <div className="container">
        <div className={styles.welcome}>
          <div className={styles.welcomeText}>
            <p className="eyebrow">Accord</p>
            <h1 className="h1">Your deal rooms, in one place.</h1>
            <p className="body-lg">Sign in to see the rooms you are part of, what is waiting for you, and every payment and refusal as it happens.</p>
            <ul className={styles.points}>
              <li><span className={styles.tick} aria-hidden="true" />Your limits are sealed in this browser; the other side never sees them.</li>
              <li><span className={styles.tick} aria-hidden="true" />The contract checks every payment against the terms you both approved.</li>
              <li><span className={styles.tick} aria-hidden="true" />Anyone can verify an agreement from public data, without an account.</li>
            </ul>
          </div>
          <Stage><SignInCard /></Stage>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={styles.head}>
        <div>
          <p className="eyebrow">Signed in as <span className="mono">{w.accountId}</span></p>
          <h1 className="h2">Home</h1>
        </div>
        <Link href="/agreements/new" className={styles.primary}>New deal room</Link>
      </div>

      {error && <div className={styles.error} role="alert"><p className="h5">The chain could not be read</p><p className="small mono">{error}</p></div>}
      {!data && !error && <div className={styles.loading} aria-busy="true"><span /><span /><span /></div>}

      {data && (
        <>
          <section className={styles.needs} aria-labelledby="needs-title">
            <div className={styles.needsHead}>
              <h2 id="needs-title" className="h4">Needs you</h2>
              <span className={`mono ${styles.count}`}>{data.needs.length}</span>
            </div>
            {data.needs.length === 0 ? (
              <p className={styles.quiet}>Nothing is waiting for you. Rooms move on their own until a decision is yours.</p>
            ) : (
              <ul className={styles.needList}>
                {data.needs.map((n, i) => (
                  <li key={`${n.room}-${n.action}-${i}`}>
                    <Link href={n.href} className={styles.need}>
                      <span className={styles.needAction}>{n.action}</span>
                      <span className={styles.needDetail}>{n.detail}</span>
                      <span className={styles.needRoom}>{n.title}</span>
                      <span className={styles.arrow} aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className={styles.tiles}>
            <Tile label="Escrowed" value={<Usdc amount={data.escrowed} />} line={`across ${data.rooms.filter((r) => r.roles.includes("buyer")).length} room${data.rooms.length === 1 ? "" : "s"} you fund`} />
            <Tile label="Paid this month" value={<Usdc amount={data.paidThisMonth} />} line={BigInt(data.paidTotal) > 0n ? "every payment matched its terms" : "no payments yet"} />
            <Tile label="Refused" value={String(data.refused)} refusal={data.refused > 0}
              line={data.topCode ? <><span className="mono">{data.topCode.code}</span> ×{data.topCode.count}</> : "No refusals. Every payment matched its terms."} />
            <Tile label="Next eligible" value={data.nextEligible ? <Usdc amount={data.nextEligible.amount} /> : "None"}
              line={data.nextEligible ? <>{data.nextEligible.waiting}{data.nextEligible.at && !data.nextEligible.payableNow ? ` · ${when(data.nextEligible.at)}` : ""} · {data.nextEligible.title}</> : "No payment is scheduled"} />
            <Tile label="Agents" value={`${data.agents.active} active`}
              line={data.agents.active + data.agents.revoked + data.agents.none === 0 ? "Connect an agent. It will be able to call act() and nothing else." : `${data.agents.revoked} revoked · last call ${ago(data.agents.lastCall)}`} />
          </div>

          <section aria-labelledby="rooms-title">
            <div className={styles.sectionHead}>
              <h2 id="rooms-title" className="h4">Your deal rooms</h2>
              <Link href={`/rooms?party=${encodeURIComponent(w.accountId)}`} className="small weak">See all</Link>
            </div>
            {data.rooms.length === 0 ? (
              <div className={styles.ghost}>
                <div className={styles.ghostSteps} aria-hidden="true">
                  {["Sealed", "Attested", "Approved", "Funded", "Executing", "Checked", "Settled"].map((s) => <span key={s}>{s}</span>)}
                </div>
                <p className="h5">Start a market-making or vendor deal room</p>
                <p className="small">Seal your limits, let the agents negotiate, approve the terms, and the contract enforces every payment.</p>
                <Link href="/agreements/new" className={styles.primary}>New deal room</Link>
              </div>
            ) : (
              <ul className={styles.rooms}>
                {data.rooms.map((r) => (
                  <li key={r.account}>
                    <Link href={`/agreements/${r.account}`} className={styles.room}>
                      <span className={styles.roomMain}>
                        <span className="h5">{r.title}</span>
                        <span className="small mono">{r.account}</span>
                      </span>
                      <span className={styles.roomMeta}>
                        <Pill>{r.kind === "market-making" ? "market making" : "vendor contract"}</Pill>
                        {r.roles.map((x) => <Pill key={x} tone="teal">{ROLE[x]}</Pill>)}
                      </span>
                      <span className="small"><Usdc amount={r.paid} /> <span className="faint">of</span> <Usdc amount={r.total} /></span>
                      <span className={styles.roomState}><StatePill state={r.state} /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className={`small faint ${styles.source}`}>Read from {data.source.label} at block {data.source.block}.</p>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, line, refusal }: { label: string; value: React.ReactNode; line: React.ReactNode; refusal?: boolean }) {
  return (
    <div className={styles.tile}>
      <span className="small">{label}</span>
      <span className={`${styles.value} ${refusal ? styles.refusal : ""}`}>{value}</span>
      <span className={styles.line}>{line}</span>
    </div>
  );
}

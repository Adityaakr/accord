"use client";

// Home: the account's tender agents in one quiet row (how many, open bids, wins) with the way to the full list.
// Read through the app session; without one, a single line points to open tenders.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useOrg } from "../org/OrgProvider";
import { onVisibleInterval } from "../visible";
import styles from "./Home.module.css";

type Summary = { agents: number; open: number; wins: number };

export function TenderAgents({ account }: { account: string }) {
  const o = useOrg();
  const [s, setS] = useState<Summary | null>(null);
  const signed = o.session === account;

  useEffect(() => {
    if (!signed) { setS(null); return; }
    let live = true;
    const load = () => fetch("/api/tenders/agents", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { agents?: { open: number; wins: number }[] } | null) => {
        if (!live || !b?.agents) return;
        setS({ agents: b.agents.length, open: b.agents.reduce((n, a) => n + a.open, 0), wins: b.agents.reduce((n, a) => n + a.wins, 0) });
      })
      .catch(() => undefined);
    void load();
    const stop = onVisibleInterval(load, 30000);
    return () => { live = false; stop(); };
  }, [signed]);

  return (
    <section aria-labelledby="tender-agents-title">
      <div className={styles.sectionHead}>
        <h2 id="tender-agents-title" className="h4">Your tender agents</h2>
        <Link href="/tenders/agents" className="small weak">See your agents</Link>
      </div>
      {s && s.agents > 0 ? (
        <Link href="/tenders/agents" className={styles.agentsRow}>
          <span><span className={styles.agentsNum}>{s.agents}</span> agent{s.agents === 1 ? "" : "s"}</span>
          <span><span className={styles.agentsNum}>{s.open}</span> open bid{s.open === 1 ? "" : "s"}</span>
          <span><span className={`${styles.agentsNum} ${s.wins ? styles.agentsWin : ""}`}>{s.wins}</span> win{s.wins === 1 ? "" : "s"}</span>
          <span className={styles.agentsGo} aria-hidden="true">→</span>
        </Link>
      ) : (
        <p className={styles.agentsEmpty}>
          <Link href="/tenders" className="link">Bid on open tenders with your agent</Link>
          <span className="faint">: the lowest sealed price wins on chain.</span>
        </p>
      )}
    </section>
  );
}

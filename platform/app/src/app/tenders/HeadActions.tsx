"use client";

// The board's head actions: "Your agents" for a signed-in account (with the Accord mark and how many agents it has
// linked, read from /api/tenders/agents when its session is open), and "Post a job" for everyone.
import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/LogoMark";
import { useOrg } from "@/components/org/OrgProvider";
import { useWallet } from "@/components/wallet/WalletProvider";
import styles from "./tenders.module.css";

function useAgentCount(): { agents: number; wins: number } | null {
  const w = useWallet();
  const o = useOrg();
  const [n, setN] = useState<{ agents: number; wins: number } | null>(null);
  useEffect(() => {
    if (!w.accountId || o.session !== w.accountId) { setN(null); return; }
    let stop = false;
    fetch("/api/tenders/agents", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { agents?: { wins: number }[] } | null) => { if (!stop && b?.agents) setN({ agents: b.agents.length, wins: b.agents.reduce((s, a) => s + a.wins, 0) }); })
      .catch(() => undefined);
    return () => { stop = true; };
  }, [w.accountId, o.session]);
  return n;
}

function AgentsButton() {
  const n = useAgentCount();
  return (
    <Link href="/tenders/agents" className={styles.agentsBtn}>
      <span className={styles.agentsMark} aria-hidden="true"><LogoMark size={14} /></span>
      Your agents
      {n ? <span className={styles.agentsCount}>{n.agents}{n.wins ? <> · {n.wins} won</> : null}</span> : null}
    </Link>
  );
}

export function HeadActions() {
  const w = useWallet();
  return (
    <div className={styles.headActions}>
      {w.accountId ? <AgentsButton /> : null}
      <Link href="/tenders/new" className={styles.primary}>Post a job</Link>
    </div>
  );
}

/** The same button for a page's header line, signed in only. */
export function AgentsLink() {
  const w = useWallet();
  if (!w.accountId) return null;
  return <AgentsButton />;
}

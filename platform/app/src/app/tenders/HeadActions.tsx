"use client";

// The board's head actions: "Your agents" for a signed-in account, and "Post a job" for everyone (the page it opens
// asks a signed-out visitor to sign in).
import Link from "next/link";
import { useWallet } from "@/components/wallet/WalletProvider";
import styles from "./tenders.module.css";

export function HeadActions() {
  const w = useWallet();
  return (
    <div className={styles.headActions}>
      {w.accountId ? <Link href="/tenders/agents" className="small link">Your agents</Link> : null}
      <Link href="/tenders/new" className={styles.primary}>Post a job</Link>
    </div>
  );
}

/** One quiet link for a header line, signed in only. */
export function AgentsLink({ className = "small link" }: { className?: string }) {
  const w = useWallet();
  if (!w.accountId) return null;
  return <Link className={className} href="/tenders/agents">Your agents</Link>;
}

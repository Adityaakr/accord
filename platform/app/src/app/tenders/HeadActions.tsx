"use client";

// Signed in only: the way to this account's tender agents and, on the board, to posting a job.
import Link from "next/link";
import { useWallet } from "@/components/wallet/WalletProvider";
import styles from "./act.module.css";

export function HeadActions({ post = false }: { post?: boolean }) {
  const w = useWallet();
  if (!w.accountId) return null;
  return (
    <div className={styles.headActions}>
      <Link href="/tenders/agents" className={`${styles.btn} ${styles.quiet}`}>Your agents</Link>
      {post ? <a href="#post-job" className={`${styles.btn} ${styles.primary}`}>Post a job</a> : null}
    </div>
  );
}

/** One quiet link for an eyebrow line, signed in only. */
export function AgentsLink() {
  const w = useWallet();
  if (!w.accountId) return null;
  return <> · <Link className="link" href="/tenders/agents">Your agents</Link></>;
}

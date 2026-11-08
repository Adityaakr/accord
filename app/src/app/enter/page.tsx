"use client";

// "How are you using Accord today?": one calm card per workspace. Workspaces where this account is already a party
// show how many rooms; every one stays selectable. The choice is remembered and can be changed from the sidebar.

import Link from "next/link";
import { AccountId, shortAccount } from "@/components/account/AccountId";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { Portfolio } from "@/server/data";
import { LogoMark } from "@/components/LogoMark";
import { PixelIcon } from "@/components/PixelIcon";
import { ThemeToggle } from "@/components/theme/Theme";
import { useWallet } from "@/components/wallet/WalletProvider";
import { WORKSPACES, useWorkspace, type WorkspaceId } from "@/components/workspace/Workspace";
import styles from "./enter.module.css";

export default function Enter() {
  const w = useWallet();
  const router = useRouter();
  const { id: current, choose } = useWorkspace();
  const reduce = useReducedMotion() ?? false;
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    if (!w.accountId) { setCounts(null); return; }
    let live = true;
    fetch(`/api/me?account=${encodeURIComponent(w.accountId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Portfolio>) : null))
      .then((p) => {
        if (!live || !p) return;
        const c: Record<string, number> = {};
        for (const r of p.rooms) for (const role of r.roles) c[role] = (c[role] ?? 0) + 1;
        setCounts(c);
      })
      .catch(() => setCounts({}));
    return () => { live = false; };
  }, [w.accountId]);

  const go = (id: WorkspaceId) => {
    choose(id);
    router.push(id === "auditor" ? "/verify" : "/");
  };
  const suggested = counts ? WORKSPACES.filter((x) => x.role && (counts[x.role] ?? 0) > 0).sort((a, b) => (counts[b.role!] ?? 0) - (counts[a.role!] ?? 0))[0]?.id : null;

  return (
    <div className={`${styles.page} texture-strong`}>
      <header className={styles.top}>
        <Link href="/" className={styles.brand}><LogoMark /><span>Accord</span></Link>
        <div className={styles.topRight}>
          {w.accountId ? <span className={`mono ${styles.who}`} title={w.accountId}>{shortAccount(w.accountId)}</span> : <Link href="/signin" className="link">Sign in</Link>}
          <ThemeToggle compact />
        </div>
      </header>

      <div className={styles.center}>
        <motion.div className={styles.intro} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.3, 1] }}>
          <h1 className={styles.title}>Choose a workspace</h1>
          <p className={styles.lead}>Each one shows only what that role needs. Switch any time from the sidebar.</p>
        </motion.div>

        <ul className={styles.grid}>
          {WORKSPACES.filter((x) => x.id !== "auditor").map((x, i) => {
            const n = x.role && counts ? counts[x.role] ?? 0 : 0;
            const note = x.planned ? "Planned" : n > 0 ? `${n} room${n === 1 ? "" : "s"}` : x.id === current ? "Last used" : x.id === suggested ? "Suggested" : "";
            return (
              <motion.li key={x.id} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.06 + i * 0.05, ease: [0.2, 0.8, 0.3, 1] }}>
                <button type="button" className={`${styles.card} ${x.planned ? styles.subdued : ""}`} onClick={() => go(x.id)}>
                  <span className={styles.cardTop}>
                    <span className={styles.tile}><PixelIcon name={x.icon} size={20} /></span>
                    {note ? <span className={styles.note}>{note}</span> : null}
                  </span>
                  <span className={styles.name}>{x.name}<span className={styles.arrow} aria-hidden="true">→</span></span>
                  <span className={styles.line}>{x.line}</span>
                </button>
              </motion.li>
            );
          })}
        </ul>

        <button type="button" className={styles.auditor} onClick={() => go("auditor")}>
          Only verifying an agreement? <span className={styles.auditorLink}>Open the public record <span className={styles.arrowInline} aria-hidden="true">→</span></span>
        </button>
      </div>
    </div>
  );
}


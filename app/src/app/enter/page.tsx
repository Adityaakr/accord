"use client";

// "How are you using Accord today?": one calm card per workspace. Workspaces where this account is already a party
// show how many rooms; every one stays selectable. The choice is remembered and can be changed from the sidebar.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
    <div className={styles.page}>
      <header className={styles.top}>
        <Link href="/" className={styles.brand}><LogoMark /><span>Accord</span></Link>
        <div className={styles.topRight}>
          {w.accountId ? <span className={`mono ${styles.who}`}>{w.accountId}</span> : <Link href="/signin" className="link">Sign in</Link>}
          <ThemeToggle compact />
        </div>
      </header>

      <div className={styles.center}>
        <div className={styles.intro}>
          <h1 className={styles.title}>How are you using Accord today?</h1>
          <p className={styles.lead}>Each workspace shows only what that role needs. You can switch at any time from the sidebar.</p>
        </div>

        <ul className={styles.grid}>
          {WORKSPACES.filter((x) => x.id !== "auditor").map((x) => {
            const n = x.role && counts ? counts[x.role] ?? 0 : 0;
            const isSuggested = x.id === suggested;
            return (
              <li key={x.id}>
                <button type="button" className={`${styles.card} ${isSuggested ? styles.suggested : ""}`} onClick={() => go(x.id)}>
                  <span className={styles.cardTop}>
                    <span className={styles.tile}><PixelIcon name={x.icon} size={22} /></span>
                    <span className={styles.badges}>
                      {n > 0 ? <span className={styles.count}>{n} room{n === 1 ? "" : "s"}</span> : null}
                      {x.planned ? <span className={styles.planned}>Planned</span> : null}
                    </span>
                  </span>
                  <span className={styles.name}>{x.name}</span>
                  <span className={styles.line}>{x.line}</span>
                  <span className={styles.can}>
                    {x.can.map((c) => <span key={c} className={styles.canItem}>{c}</span>)}
                  </span>
                  <span className={styles.enterRow}>{isSuggested ? "Suggested for you" : x.id === current ? "Last used" : "Enter"}<span className={styles.arrow} aria-hidden="true">→</span></span>
                </button>
              </li>
            );
          })}
        </ul>

        {(() => {
          const a = WORKSPACES.find((x) => x.id === "auditor")!;
          return (
            <button type="button" className={styles.auditor} onClick={() => go("auditor")}>
              <span className={styles.tile}><PixelIcon name={a.icon} size={20} /></span>
              <span className={styles.auditorText}><span className={styles.auditorName}>Just checking an agreement?</span><span className={styles.line}>Open the Auditor workspace: verify any agreement and read the public record. No account needed.</span></span>
              <span className={styles.arrow} aria-hidden="true">→</span>
            </button>
          );
        })()}
      </div>
    </div>
  );
}

"use client";

// The app's frame. Sign-in and the workspace chooser are full screen, outside the app; every other page sits in the
// shell (top bar, workspace sidebar, footer). Signed out, product pages send people to /signin; signed in without
// a workspace chosen, they go to /enter first. Public pages (verify, the public record, docs, the demo) stay open.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Nav, Sidebar } from "./Nav";
import { LogoMark } from "./LogoMark";
import { useWallet } from "./wallet/WalletProvider";
import { useWorkspace } from "./workspace/Workspace";
import styles from "./Chrome.module.css";

const FULL = ["/signin", "/enter"];
const PUBLIC = ["/verify", "/record", "/docs", "/status", "/try", "/join", "/atlas", "/payee", "/invite"];

export function Chrome({ network, factory, sandbox, children }: { network: string; factory: string; sandbox: boolean; children: ReactNode }) {
  const path = usePathname() ?? "/";
  const router = useRouter();
  const w = useWallet();
  const { id, ready } = useWorkspace();
  const full = FULL.some((p) => path === p);
  const open = PUBLIC.some((p) => path.startsWith(p));

  // wallet state settles after mount; wait a beat before deciding
  useEffect(() => {
    if (full || open || !ready) return;
    const t = window.setTimeout(() => {
      if (!w.accountId) router.replace("/signin");
      else if (!id && path === "/") router.replace("/enter");
    }, 400);
    return () => window.clearTimeout(t);
  }, [full, open, ready, w.accountId, id, path, router]);

  if (full) return <main id="main">{children}</main>;
  return (
    <>
      <Nav network={network} />
      {sandbox && (
        <div className={styles.banner} role="note">
          <div className="container">Local node. Contracts and enclave jobs run their real code; the negotiating model is a stand-in and each principal signs with a local key. Nothing here is on testnet.</div>
        </div>
      )}
      <div className={styles.shell}>
        <Sidebar />
        <main id="main" className={styles.main}>{children}</main>
      </div>
      <footer className={styles.footer}>
        <div className={`container ${styles.footerInner}`}>
          <div className={styles.footerBrand}><LogoMark size={16} /><span>Negotiated in private. Enforced in public.</span></div>
          <nav className={styles.footerLinks} aria-label="Footer">
            <Link href="/status">Status</Link>
            <Link href="/docs">Docs</Link>
            <Link href="/try">Try the demo</Link>
            <a href="https://accordweb-production.up.railway.app" target="_blank" rel="noreferrer">accord site</a>
          </nav>
          <span className="small mono">{network} · factory {factory}</span>
        </div>
      </footer>
    </>
  );
}

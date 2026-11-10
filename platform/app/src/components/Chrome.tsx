"use client";

// The app's frame. Sign-in and the workspace chooser are full screen, outside the app; every other page sits in the
// shell (top bar, workspace sidebar, footer). Signed out, product pages send people to /signin; signed in without
// a workspace chosen, they go to /enter first. Public pages (verify, check a payment, the public record, docs, the demo) stay open.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Nav, Sidebar } from "./Nav";
import { LogoMark } from "./LogoMark";
import { useWallet } from "./wallet/WalletProvider";
import { useWorkspace } from "./workspace/Workspace";
import styles from "./Chrome.module.css";

const FULL = ["/signin", "/enter"];
const PUBLIC = ["/verify", "/check", "/record", "/docs", "/status", "/replay", "/controls", "/try", "/join", "/market-making", "/atlas", "/payee", "/invite"];
// Read-only pages that never depend on who is signed in: they render at once, even while a session is being restored.
const READ_ONLY = ["/controls", "/verify", "/check", "/record", "/docs", "/status", "/replay"];

// A not-found page (app/not-found.tsx) marks itself here, so an unknown address shows "page not found" instead of
// sending a signed-out visitor to sign-in.
const NotFoundContext = createContext<(on: boolean) => void>(() => {});

/** Rendered by not-found pages: while it is mounted, Chrome does not redirect to sign-in. */
export function NotFoundMark() {
  const mark = useContext(NotFoundContext);
  useEffect(() => {
    mark(true);
    return () => mark(false);
  }, [mark]);
  return null;
}

export function Chrome({ network, factory, sandbox, children }: { network: string; factory: string; sandbox: boolean; children: ReactNode }) {
  const path = usePathname() ?? "/";
  const router = useRouter();
  const w = useWallet();
  const { id, ready } = useWorkspace();
  const [notFound, setNotFound] = useState(false);
  const full = FULL.some((p) => path === p);
  const open = PUBLIC.some((p) => path.startsWith(p));
  // after a reload the kept session (throwaway key or wallet) takes a moment to come back; until it does, a page that
  // depends on it shows a quiet loading line instead of its signed-out state
  const waiting = w.restoring && !READ_ONLY.some((p) => path.startsWith(p));

  // wallet state settles after mount; wait a beat before deciding
  useEffect(() => {
    if (full || open || notFound || !ready || w.restoring) return;
    const t = window.setTimeout(() => {
      // a room link keeps its room: sign-in shows a read-only summary of it and returns there afterwards
      if (!w.accountId) router.replace(path.startsWith("/agreements/") ? `/signin?next=${encodeURIComponent(path)}` : "/signin");
      else if (!id && path === "/") router.replace("/enter");
    }, 400);
    return () => window.clearTimeout(t);
  }, [full, open, notFound, ready, w.restoring, w.accountId, id, path, router]);

  const restoringLine = (
    <div className={styles.restoring} role="status" aria-live="polite">
      <span className={styles.restoringDot} aria-hidden="true" />Restoring your session…
    </div>
  );
  // a not-found page never waits for the session: it is the same for everyone. While waiting, the page is still
  // rendered (hidden), so the server's HTML carries its text for readers without JavaScript (AI screeners, link
  // previews) and nothing remounts when the session settles; people see the quiet line until then.
  const hold = waiting && !notFound;
  const body = <>{hold ? restoringLine : null}<div hidden={hold} className={styles.page}>{children}</div></>;
  if (full) return <NotFoundContext.Provider value={setNotFound}><main id="main">{body}</main></NotFoundContext.Provider>;
  return (
    <NotFoundContext.Provider value={setNotFound}>
      <Nav network={network} />
      {sandbox && (
        <div className={styles.banner} role="note">
          <div className="container">Local node. Contracts and enclave jobs run their real code; the negotiating model is a stand-in and each principal signs with a local key. Nothing here is on testnet.</div>
        </div>
      )}
      <div className={styles.shell}>
        <Sidebar />
        <main id="main" className={`${styles.main} texture`}><div key={path} className="page-in">{body}</div></main>
      </div>
      <footer className={styles.footer}>
        <div className={`container ${styles.footerInner}`}>
          <div className={styles.footerBrand}><LogoMark size={16} /><span>Negotiated in private. Enforced in public.</span></div>
          <nav className={styles.footerLinks} aria-label="Footer">
            <Link href="/status">Status</Link>
            <Link href="/docs">Docs</Link>
            <Link href="/check">Check a payment</Link>
            <Link href="/try-it">Try a deal</Link>
            <Link href="/try">Live attack room</Link>
            <a href="https://accordweb-production.up.railway.app" target="_blank" rel="noreferrer">accord site</a>
          </nav>
          <span className="small mono">{network} · factory {factory}</span>
        </div>
      </footer>
    </NotFoundContext.Provider>
  );
}

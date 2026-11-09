"use client";

// The app shell's navigation: a slim top bar (brand, search, network, the signed-in person) and a left sidebar that
// belongs to the workspace in use (Buyer, Vendor, Settlement authority, Reviewer, Auditor): its switcher at the top,
// only that role's sections, then Settings, Profile and the theme. On a phone the sidebar becomes one scrolling row.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { LogoMark } from "./LogoMark";
import { ThemeToggle } from "./theme/Theme";
import { useOrg } from "./org/OrgProvider";
import { WORKSPACES, useWorkspace, type NavItem } from "./workspace/Workspace";
import { WalletButton } from "./wallet/WalletButton";
import { useWallet } from "./wallet/WalletProvider";
import styles from "./Nav.module.css";
import { IconTile } from "@/components/IconTile";

/* 16-px line icons, one stroke weight */
const ICONS = {
  home: <path d="M3 7.5 8 3.5l5 4V13H9.5V9.5h-3V13H3z" />,
  rooms: <><rect x="2.5" y="3" width="11" height="10" rx="2" /><path d="M2.5 6.5h11" /></>,
  approvals: <><rect x="2.5" y="2.5" width="11" height="11" rx="2" /><path d="m5.5 8 1.8 1.8 3.4-3.6" /></>,
  agents: <><circle cx="5" cy="8" r="2.5" /><circle cx="11" cy="8" r="2.5" /><path d="M7.5 8h1" /></>,
  recipients: <><circle cx="8" cy="5.5" r="2.5" /><path d="M3.5 13.5c.6-2.3 2.3-3.5 4.5-3.5s3.9 1.2 4.5 3.5" /></>,
  record: <><path d="M4 2.5h6l2.5 2.5v8.5h-8.5z" /><path d="M6 8h4M6 10.5h4" /></>,
  settings: <><circle cx="8" cy="8" r="2" /><path d="M8 1.8v2M8 12.2v2M14.2 8h-2M3.8 8h-2M12.4 3.6 11 5M5 11l-1.4 1.4M12.4 12.4 11 11M5 5 3.6 3.6" /></>,
  chart: <path d="M3 13V9M6.5 13V6M10 13V8M13.5 13V3.5" />,
  verify: <><path d="M8 2 13 4v4c0 3-2.2 5-5 6-2.8-1-5-3-5-6V4z" /><path d="m6 8 1.5 1.5L10.5 6.5" /></>,
  try: <path d="M5 3.5v9l7.5-4.5z" />,
  deliveries: <><path d="M2.5 5.5 8 2.5l5.5 3v5L8 13.5l-5.5-3z" /><path d="M2.5 5.5 8 8.5l5.5-3M8 8.5v5" /></>,
  payout: <><rect x="2" y="4" width="12" height="8.5" rx="1.8" /><path d="M2 7h12M4.5 10h2.5" /></>,
  profile: <><circle cx="8" cy="6" r="2.6" /><path d="M3 13.5c.8-2.3 2.7-3.4 5-3.4s4.2 1.1 5 3.4" /></>,
  switch: <path d="m5 6.5 3-3 3 3M5 9.5l3 3 3-3" />,
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

export function Nav({ network }: { network: string }) {
  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        {/* the logo is the site's landing page; Home in the sidebar stays inside the app */}
        <a href="/" className={styles.brand} aria-label="Accord website">
          <LogoMark />
          <span className={styles.word}>Accord</span>
        </a>
        <div className={styles.right}>
          <button type="button" className={styles.search} onClick={() => window.dispatchEvent(new Event("accord:command"))} aria-label="Search and jump (Command K)">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>
            <span className={styles.searchText}>Search</span>
            <kbd className={styles.searchKbd}>⌘K</kbd>
          </button>
          <span className={`mono ${styles.network}`} title="Network this app reads and writes">{network}</span>
          {/* on a phone the theme switch sits here, so the sidebar row below keeps to the pages */}
          <span className={styles.barTheme}><ThemeToggle compact /></span>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}

/* The open pages, for a visitor who has not signed in */
const PUBLIC_NAV: NavItem[] = [
  { href: "/try-it", label: "Try a deal", icon: "try", match: (p) => p.startsWith("/try-it") },
  { href: "/verify", label: "Verify", icon: "verify", match: (p) => p.startsWith("/verify") },
  { href: "/record", label: "Public record", icon: "record", match: (p) => p.startsWith("/record") },
  { href: "/status", label: "Status", icon: "chart", match: (p) => p.startsWith("/status") },
];

export function Sidebar() {
  const path = usePathname() ?? "/";
  const w = useWallet();
  const o = useOrg();
  const { ws, choose } = useWorkspace();
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion() ?? false;
  /* the active item sits on a soft pill that slides between items */
  const Pill = () => <motion.span layoutId="side-pill" className={styles.pill} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 40, mass: 0.8 }} />;
  const link = (l: NavItem) => {
    // rooms open filtered to this person and this workspace's role
    const href = l.href === "/rooms" && w.accountId ? `/rooms?party=${encodeURIComponent(w.accountId)}${ws.role ? `&role=${ws.role}` : ""}` : l.href;
    const on = l.match(path);
    return (
      <Link key={l.href + l.label} href={href} prefetch={false} className={`${styles.side} ${on ? styles.on : ""}`} aria-current={on ? "page" : undefined}>
        {on ? <Pill /> : null}
        <Icon name={l.icon} />
        <span>{l.label}</span>
      </Link>
    );
  };
  // Settings says "Set up" until the organisation is confirmed and set up
  const orgPending = Boolean(w.accountId) && !o.checking && (!o.session || (o.data && !o.data.org));
  const settingsOn = path.startsWith("/settings") || path.startsWith("/onboarding");
  /* Signed out, only the pages that work without an account: no workspace switcher, no Settings or Profile
     (they would only bounce to sign-in). The logo and Sign in sit in the top bar. */
  // While a kept session is read back after a reload, show neither the signed-out nor the signed-in set: an empty
  // sidebar of the same size, so nothing flashes and swaps a moment later.
  if (w.restoring) {
    return <nav className={styles.sidebar} aria-label="Main" aria-busy="true"><div className={`${styles.group} ${styles.bottom}`}><span className={styles.sideTheme}><ThemeToggle /></span></div></nav>;
  }
  if (!w.accountId) {
    return (
      <nav className={`${styles.sidebar} ${styles.signedOut}`} aria-label="Main">
        <div className={styles.group}>{PUBLIC_NAV.map(link)}</div>
        <div className={`${styles.group} ${styles.bottom}`}><span className={styles.sideTheme}><ThemeToggle /></span></div>
      </nav>
    );
  }
  return (
    <nav className={styles.sidebar} aria-label="Main">
      <div className={styles.switcher}>
        <button type="button" className={styles.switch} onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu">
          <IconTile name={ws.icon} size={32} />
          <span className={styles.switchText}><span className={styles.switchName}>{ws.name}</span><span className={styles.switchSub}>workspace</span></span>
          <Icon name="switch" />
        </button>
        {open && (
          <div className={styles.menu} role="menu">
            {WORKSPACES.map((x) => (
              <button key={x.id} type="button" role="menuitemradio" aria-checked={x.id === ws.id} className={`${styles.menuItem} ${x.id === ws.id ? styles.menuOn : ""}`}
                onClick={() => { choose(x.id); setOpen(false); }}>
                <IconTile name={x.icon} size={26} />
                <span>{x.name}</span>
                {x.planned ? <span className={styles.menuTag}>Planned</span> : null}
              </button>
            ))}
            <Link href="/enter" className={styles.menuAll} onClick={() => setOpen(false)}>Compare workspaces</Link>
          </div>
        )}
      </div>
      <div className={styles.group}>{ws.nav.map(link)}</div>
      <div className={`${styles.group} ${styles.bottom}`}>
        <Link href="/settings" prefetch={false} className={`${styles.side} ${settingsOn ? styles.on : ""}`} aria-current={settingsOn ? "page" : undefined}>
          {settingsOn ? <Pill /> : null}
          <Icon name="settings" />
          <span>Settings</span>
          {orgPending ? <span className={styles.pending} title="Confirm it's you to set up your organisation">Set up</span> : null}
        </Link>
        <Link href="/profile" prefetch={false} className={`${styles.side} ${path.startsWith("/profile") ? styles.on : ""}`}>
          {path.startsWith("/profile") ? <Pill /> : null}
          <Icon name="profile" />
          <span>Profile</span>
        </Link>
        <span className={styles.sideTheme}><ThemeToggle /></span>
      </div>
    </nav>
  );
}

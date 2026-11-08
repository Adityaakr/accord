"use client";

// The app shell's navigation: a slim top bar (brand, network, the signed-in person) and a left sidebar with the
// product's sections (PLATFORM.md §6). Sections not built yet open a "Coming next" page that says what they will
// hold, so no link is dead. On a phone the sidebar becomes one scrolling row under the bar.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "./LogoMark";
import { WalletButton } from "./wallet/WalletButton";
import { useWallet } from "./wallet/WalletProvider";
import styles from "./Nav.module.css";

type Item = { href: string; label: string; match: (p: string) => boolean; icon: keyof typeof ICONS };

const PRODUCT: Item[] = [
  { href: "/", label: "Home", match: (p) => p === "/", icon: "home" },
  { href: "/rooms", label: "Deal rooms", match: (p) => p.startsWith("/rooms") || p.startsWith("/agreements"), icon: "rooms" },
  { href: "/approvals", label: "Approvals", match: (p) => p.startsWith("/approvals"), icon: "approvals" },
  { href: "/agents", label: "Agents", match: (p) => p.startsWith("/agents"), icon: "agents" },
  { href: "/recipients", label: "Recipients", match: (p) => p.startsWith("/recipients"), icon: "recipients" },
  { href: "/record", label: "Record", match: (p) => p.startsWith("/record"), icon: "record" },
  { href: "/settings", label: "Settings", match: (p) => p.startsWith("/settings") || p.startsWith("/profile"), icon: "settings" },
];
const TOOLS: Item[] = [
  { href: "/atlas", label: "Market making", match: (p) => p.startsWith("/atlas"), icon: "chart" },
  { href: "/verify", label: "Verify", match: (p) => p.startsWith("/verify"), icon: "verify" },
  { href: "/payee", label: "Payee check", match: (p) => p.startsWith("/payee"), icon: "recipients" },
  { href: "/try", label: "Try the demo", match: (p) => p.startsWith("/try"), icon: "try" },
];

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
        <Link href="/" className={styles.brand} aria-label="Accord home">
          <LogoMark />
          <span className={styles.word}>Accord</span>
        </Link>
        <div className={styles.right}>
          <button type="button" className={styles.search} onClick={() => window.dispatchEvent(new Event("accord:command"))} aria-label="Search and jump (Command K)">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>
            <span className={styles.searchText}>Search</span>
            <kbd className={styles.searchKbd}>⌘K</kbd>
          </button>
          <span className={`mono ${styles.network}`} title="Network this app reads and writes">
            <span className={styles.dot} aria-hidden="true" />
            {network}
          </span>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}

export function Sidebar() {
  const path = usePathname() ?? "/";
  const w = useWallet();
  const link = (l: Item) => {
    // Deal rooms opens on the signed-in person's own rooms
    const href = l.href === "/rooms" && w.accountId ? `/rooms?party=${encodeURIComponent(w.accountId)}` : l.href;
    const on = l.match(path);
    return (
      <Link key={l.href} href={href} className={`${styles.side} ${on ? styles.on : ""}`} aria-current={on ? "page" : undefined}>
        <Icon name={l.icon} />
        <span>{l.label}</span>
      </Link>
    );
  };
  return (
    <nav className={styles.sidebar} aria-label="Main">
      <div className={styles.group}>{PRODUCT.map(link)}</div>
      <div className={styles.group}>
        <span className={styles.groupLabel}>Tools</span>
        {TOOLS.map(link)}
      </div>
    </nav>
  );
}

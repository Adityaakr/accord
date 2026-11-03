"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "./LogoMark";
import { WalletButton } from "./wallet/WalletButton";
import styles from "./Nav.module.css";

const LINKS = [
  { href: "/atlas", label: "Accord Atlas", match: (p: string) => p.startsWith("/atlas") },
  { href: "/", label: "Deal rooms", match: (p: string) => p === "/" || p.startsWith("/agreements") },
  { href: "/try", label: "Try", match: (p: string) => p.startsWith("/try") },
  { href: "/verify", label: "Verify", match: (p: string) => p.startsWith("/verify") },
  { href: "/record", label: "Record", match: (p: string) => p.startsWith("/record") },
  { href: "/payee", label: "Payee", match: (p: string) => p.startsWith("/payee") },
];

export function Nav({ network }: { network: string }) {
  const path = usePathname() ?? "/";
  return (
    <header className={styles.bar}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand} aria-label="Accord deal rooms">
          <LogoMark />
          <span className={styles.word}>Accord</span>
        </Link>
        <nav className={styles.links} aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`${styles.link} ${l.match(path) ? styles.on : ""}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className={styles.right}>
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

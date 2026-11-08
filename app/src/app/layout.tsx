import type { Metadata } from "next";
import { Host_Grotesk, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Nav, Sidebar } from "@/components/Nav";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import { AppConfigProvider } from "@/components/AppConfig";
import { LogoMark } from "@/components/LogoMark";
import { config } from "@/server/accord";
import "./globals.css";
import styles from "./layout.module.css";

const host = Host_Grotesk({ subsets: ["latin"], variable: "--font-host-grotesk", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Accord deal rooms", template: "%s · Accord" },
  description: "The private deal room and control plane for agent-to-agent commerce. Agreements negotiated in private, enforced in public.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const c = config();
  return (
    <html lang="en" className={`${host.variable} ${mono.variable}`}>
      <body>
        <AppConfigProvider value={{ network: c.network, rpc: c.rpc, factory: c.factory, explorer: c.explorer }}>
        <WalletProvider network={c.label}>
          <a href="#main" className="visually-hidden">Skip to content</a>
          <Nav network={c.label} />
          {c.network === "sandbox" && (
            <div className={styles.banner} role="note">
              <div className="container">
                Local node from <span className="mono">make dev</span>. The Sealed Table, Payee and observer run their
                real code here; only the negotiating model is a deterministic stand-in, and every principal signs with
                a local key. Atlas readings are real NEAR mainnet blocks. Nothing here is on testnet.
              </div>
            </div>
          )}
          <div className={styles.shell}>
            <Sidebar />
            <main id="main" className={styles.main}>{children}</main>
          </div>
          <footer className={styles.footer}>
            <div className={`container ${styles.footerInner}`}>
              <div className={styles.footerBrand}>
                <LogoMark size={16} />
                <span>Negotiated in private. Enforced in public.</span>
              </div>
              <nav className={styles.footerLinks} aria-label="Footer">
                <Link href="/status">Status</Link>
                <Link href="/docs">Docs</Link>
                <Link href="/join">Join</Link>
                <a href="https://accordweb-production.up.railway.app" target="_blank" rel="noreferrer">accord site</a>
              </nav>
              <span className="small mono">{c.label} · factory {c.factory}</span>
            </div>
          </footer>
        </WalletProvider>
        </AppConfigProvider>
      </body>
    </html>
  );
}

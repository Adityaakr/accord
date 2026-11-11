import type { Metadata } from "next";
import localFont from "next/font/local";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import { OrgProvider } from "@/components/org/OrgProvider";
import { AppConfigProvider } from "@/components/AppConfig";
import { CommandBar } from "@/components/command/CommandBar";
import { Chrome } from "@/components/Chrome";
import { WorkspaceProvider } from "@/components/workspace/Workspace";
import { THEME_SCRIPT } from "@/components/theme/Theme";
import { config } from "@/server/accord";
import { demoReady } from "@/server/demo";
import { BasePathFetch } from "@/components/BasePathFetch";
import "./globals.css";

// Kept in the repository (fonts/README.md), so the build never fetches from Google Fonts.
const host = localFont({ src: "./fonts/HostGrotesk-latin.woff2", weight: "300 800", variable: "--font-host-grotesk", display: "swap" });
const mono = localFont({ src: "./fonts/JetBrainsMono-latin.woff2", weight: "400 500", variable: "--font-jetbrains-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Accord app", template: "%s · Accord" },
  description: "The private deal room and control plane for agent-to-agent commerce. Agreements negotiated in private, enforced in public.",
  // the Accord mark in the tab (the site's own favicons, public/brand); metadata URLs are not prefixed with the base path
  icons: {
    icon: [
      { url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? "/app"}/brand/favicon.png`, type: "image/png", media: "(prefers-color-scheme: light)" },
      { url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? "/app"}/brand/favicon-dark.png`, type: "image/png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: `${process.env.NEXT_PUBLIC_BASE_PATH ?? "/app"}/brand/favicon.png`,
  },
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const c = config();
  return (
    <html lang="en" className={`${host.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <BasePathFetch />
        <AppConfigProvider value={{ network: c.network, rpc: c.rpc, factory: c.factory, explorer: c.explorer, currencies: c.currencies.map(({ id, factory, label }) => ({ id, factory, label })), faucetAccount: demoReady().faucet ? process.env.FAUCET_ACCOUNT ?? null : null }}>
        <WalletProvider network={c.label}>
        <OrgProvider>
        <WorkspaceProvider>
          <a href="#main" className="visually-hidden">Skip to content</a>
          <CommandBar />
          <Chrome network={c.label} factory={c.factory} sandbox={c.network === "sandbox"}>{children}</Chrome>
        </WorkspaceProvider>
        </OrgProvider>
        </WalletProvider>
        </AppConfigProvider>
      </body>
    </html>
  );
}

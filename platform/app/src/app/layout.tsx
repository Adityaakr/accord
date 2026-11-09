import type { Metadata } from "next";
import { Host_Grotesk, JetBrains_Mono } from "next/font/google";
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

const host = Host_Grotesk({ subsets: ["latin"], variable: "--font-host-grotesk", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Accord app", template: "%s · Accord" },
  description: "The private deal room and control plane for agent-to-agent commerce. Agreements negotiated in private, enforced in public.",
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

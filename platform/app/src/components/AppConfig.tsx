"use client";

import { createContext, useContext, type ReactNode } from "react";

/** A settlement choice: the factory a new room is created on, and how the page names its token. */
export interface PublicCurrency {
  id: "default" | "usdc";
  factory: string;
  label: string;
}

/** What the browser needs to talk to the chain directly: network, RPC and factory. No secrets. */
export interface PublicConfig {
  network: string;
  rpc: string;
  /** The default factory (test USDC). */
  factory: string;
  explorer: string | null;
  /** The default first; a second (Circle USDC) only when the server sets ACCORD_FACTORY_USDC. */
  currencies?: PublicCurrency[];
  /** Accord's testnet faucet account, when this server runs one: a wallet-free visit returns its NEAR there. */
  faucetAccount?: string | null;
}

/** Circle's testnet faucet: about 20 USDC per address every 1 to 2 hours, network "NEAR Testnet". */
export const CIRCLE_FAUCET = "https://faucet.circle.com";

/** How a page names an agreement's token: test USDC for the default factory, USDC for Circle's. */
export function tokenSymbol(cfg: PublicConfig, factory: string): string {
  return cfg.currencies?.find((c) => c.factory === factory)?.id === "usdc" ? "USDC" : "tUSDC";
}

const Ctx = createContext<PublicConfig | null>(null);

export function AppConfigProvider({ value, children }: { value: PublicConfig; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppConfig(): PublicConfig {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppConfig outside AppConfigProvider");
  return v;
}

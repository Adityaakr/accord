"use client";

import { createContext, useContext, type ReactNode } from "react";

/** What the browser needs to talk to the chain directly: network, RPC and factory. No secrets. */
export interface PublicConfig {
  network: string;
  rpc: string;
  factory: string;
  explorer: string | null;
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

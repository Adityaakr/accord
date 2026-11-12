"use client";

// The signed-in account's NEAR, test USDC and (when the server offers it) Circle USDC, read through the app's own
// cached /api/chain/balances, never from public RPC in the browser. Refreshes every 20 s while the tab is visible, and
// again just after this tab's wallet sends a transaction (BALANCES_CHANGED; reads are final, a few seconds behind the
// wallet, so it reads at 2, 5 and 10 s). Keeps the last values on a busy answer, so the header never flickers to zero.

import { useEffect, useState } from "react";
import { useAppConfig } from "@/components/AppConfig";
import { BALANCES_CHANGED } from "./events";

export interface Balances { near: string | null; tusdc: string | null; usdc: string | null }

const EMPTY: Balances = { near: null, tusdc: null, usdc: null };

async function read(account: string, currency: string): Promise<{ near: string; ft: string } | null> {
  try {
    const r = await fetch(`/api/chain/balances?account=${encodeURIComponent(account)}&currency=${currency}`, { cache: "no-store" });
    const b = (await r.json()) as { busy?: boolean; near?: string; ft?: string };
    return r.ok && !b.busy && b.near !== undefined && b.ft !== undefined ? { near: b.near, ft: b.ft } : null;
  } catch {
    return null;
  }
}

export function useBalances(account: string | null): Balances {
  const cfg = useAppConfig();
  const hasUsdc = !!cfg.currencies?.some((c) => c.id === "usdc");
  const [b, setB] = useState<Balances>(EMPTY);
  useEffect(() => {
    if (!account) { setB(EMPTY); return; }
    let live = true;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      const [def, usdc] = await Promise.all([read(account, "default"), hasUsdc ? read(account, "usdc") : Promise.resolve(null)]);
      if (!live) return;
      setB((prev) => ({
        near: def?.near ?? usdc?.near ?? prev.near,
        tusdc: def?.ft ?? prev.tusdc,
        usdc: hasUsdc ? (usdc?.ft ?? prev.usdc) : null,
      }));
    };
    void tick();
    const t = window.setInterval(() => void tick(), 20_000);
    const vis = () => { if (document.visibilityState === "visible") void tick(); };
    document.addEventListener("visibilitychange", vis);
    const soon: number[] = [];
    const changed = () => { for (const ms of [2_000, 5_000, 10_000]) soon.push(window.setTimeout(() => void tick(), ms)); };
    window.addEventListener(BALANCES_CHANGED, changed);
    return () => {
      live = false; window.clearInterval(t); soon.forEach((x) => window.clearTimeout(x));
      document.removeEventListener("visibilitychange", vis); window.removeEventListener(BALANCES_CHANGED, changed);
    };
  }, [account, hasUsdc]);
  return b;
}

/** 2 decimals for NEAR (yocto, 24 decimals) and for USDC/tUSDC (6 decimals). */
export function fmt(raw: string | null, decimals: number): string {
  if (raw === null) return "…";
  const v = BigInt(raw);
  const unit = 10n ** BigInt(decimals);
  const cents = (v * 100n) / unit;
  return `${cents / 100n}.${String(cents % 100n).padStart(2, "0")}`;
}

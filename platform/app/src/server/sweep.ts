// Runs the stale demo room sweep (lib/sweep.ts) from the app server, which holds the demo vendor's key. It rides on
// the try-it traffic: the try-it page and the demo counterparty's poll call `maybeSweep()`, which starts at most one
// pass per SWEEP_EVERY_MIN (default 10) per process, one at a time, cancelling at most 5 rooms a pass. Every pass reads
// the chain first, so running it twice does nothing twice. Testnet only, and only with the demo vendor's key here.
// DEMO_SWEEP=off turns it off; DEMO_SWEEP_STALE_HOURS (default 6) is how long a room may wait before execution.

import "server-only";
import { accord, config } from "./accord";
import { demoConfig, demoReady, vendorCancel } from "./demo";
import { DEFAULT_STALE_SECS, runSweep, type SweepResult } from "@/lib/sweep";

let last = 0;
let running: Promise<SweepResult | null> | null = null;

const everyMs = () => Math.max(1, Number(process.env.SWEEP_EVERY_MIN ?? 10)) * 60_000;
const staleSecs = () => {
  const h = Number(process.env.DEMO_SWEEP_STALE_HOURS);
  return Number.isFinite(h) && h > 0 ? Math.round(h * 3600) : DEFAULT_STALE_SECS;
};

export function sweepEnabled(): boolean {
  return process.env.DEMO_SWEEP !== "off" && config().network === "testnet" && demoReady().counterparty;
}

/** One pass over the demo vendor's rooms on every configured factory. */
export function sweepOnce(opts: { only?: string[]; staleSecs?: number; max?: number } = {}): Promise<SweepResult> {
  const d = demoConfig();
  const a = accord();
  const factories = config().currencies.map((c) => c.factory);
  return runSweep({
    list: async () => (await Promise.all(factories.map((f) => a.onFactory(f).listAgreements({ party: d.vendor }).catch(() => []))))
      .flat().filter((r) => r.vendor === d.vendor),
    read: (id) => a.agreement(id).get(),
    cancel: vendorCancel,
    log: (s) => console.log(`[demo] ${s}`),
  }, { vendor: d.vendor, authority: d.authority, staleSecs: opts.staleSecs ?? staleSecs(), now: Math.floor(Date.now() / 1000), max: opts.max ?? 5, only: opts.only });
}

/** Starts a pass when one is due; never throws and never waits for it. */
export function maybeSweep(): void {
  if (!sweepEnabled() || running || Date.now() - last < everyMs()) return;
  last = Date.now();
  running = sweepOnce()
    .then((r) => {
      if (r.cancelled.length || r.failed.length) console.log(`[demo] sweep: ${r.cancelled.length} cancelled, ${r.failed.length} failed, ${r.checked} checked`);
      return r;
    })
    .catch((e: Error) => { console.error(`[demo] sweep: ${e.message}`); return null; })
    .finally(() => { running = null; });
}

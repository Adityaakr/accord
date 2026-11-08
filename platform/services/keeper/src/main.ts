// The keeper (ARCHITECTURE.md section 10): liveness, not authority. Every method it calls is open to anyone, so if it
// is down a party can call them from the app. It holds no secret that affects an outcome.

import { Accord, KeySigner, type AgreementView, type AgreementClient } from "@accord/sdk";
import { beat } from "@accord/store";
import { serviceConfig } from "../../agent/src/config.js";
import { observeAgreement, observerFor, type AskObserver } from "./observe.js";

// The observer's slot windows are a minute long on demo timings; a 15 s loop asks each at least three times.
const LOOP_MS = 15_000;

async function step(
  deal: AgreementClient, a: AgreementView, ask: AskObserver | undefined, log: (s: string) => void,
): Promise<void> {
  const now = a.now;
  if (a.state === "Sealed" && typeof a.negotiation === "object" && "Ready" in a.negotiation) {
    const tx = await deal.startNegotiation();
    log(`negotiate ${a.account} · tx ${tx.txHash}`);
    return;
  }
  for (const v of await deal.recipients()) {
    if (v.status === "Accepted" && v.active_at !== null && v.active_at <= now) {
      const tx = await deal.activateRecipient(v.version);
      log(`recipient ${a.account} · version ${v.version} active · tx ${tx.txHash}`);
    }
  }
  if (a.state !== "Executing") return;
  if (a.kind === "market-making") {
    // Close what can close first, so a failing observer never holds a finished period open.
    for (const p of await deal.periods()) {
      if (p.outcome === "Open" && p.closable_at !== undefined && p.closable_at <= now) {
        const tx = await deal.closePeriod(p.period).catch((e: Error) => e);
        log(tx instanceof Error ? `period ${a.account} · ${p.period + 1} close failed: ${tx.message.split(" · ")[0]}` : `period ${a.account} · ${p.period + 1} closed · tx ${tx.txHash}`);
      }
    }
    const atlas = (await deal.terms())?.atlas;
    if (ask && atlas) for (const line of await observeAgreement(deal, atlas, now, ask)) log(line);
  }
  if (a.ends_at && now >= a.ends_at + a.params.grace_secs && !a.in_flight && !a.closing) {
    try {
      const tx = await deal.close();
      log(`close ${a.account} · ${JSON.stringify(tx.value)} · tx ${tx.txHash}`);
    } catch (e) {
      // ERR_WINDOW_OPEN or ERR_PERIOD_OPEN: try again next loop.
      log(`close ${a.account} · waiting: ${(e as Error).message.split(" · ")[0]}`);
    }
  }
}

async function main() {
  const cfg = serviceConfig();
  if (!cfg.keeper) throw new Error("set KEEPER_ACCOUNT and KEEPER_KEY (or run make serve and ACCORD_NETWORK=sandbox)");
  const reader = new Accord({ network: cfg.network, factory: cfg.factory, rpc: cfg.rpc });
  const accord = reader.withSigner(new KeySigner(cfg.keeper.account, cfg.keeper.key, reader.chain));
  console.log(`accord keeper · ${cfg.network} · factory ${cfg.factory} · as ${cfg.keeper.account}`);
  const ask = cfg.observer ? observerFor(cfg.observer) : undefined;
  console.log(cfg.observer
    ? `  observer  ${cfg.observer.kind === "local" ? cfg.observer.url : `${cfg.observer.api}/call/${cfg.observer.owner}/${cfg.observer.project}`}`
    : "  observer  polling off: set OUTLAYER_OWNER and OUTLAYER_PAYMENT_KEY (docs/build/BLOCKED.md, probe 0.3)");
  for (;;) {
    const actions: string[] = [];
    try {
      const records = await accord.listAgreements({ limit: 100 });
      for (const r of records) {
        const deal = accord.agreement(r.account);
        const a = await deal.get().catch(() => null);
        if (!a || a.state === "Settled" || a.state === "NoDeal" || a.state === "Cancelled") continue;
        await step(deal, a, ask, (s) => { actions.push(s); console.log(`  ${s}`); }).catch((e: Error) => console.log(`  ${r.account}: ${e.message}`));
      }
      await beat("keeper", { agreements: records.length, actions: actions.length });
    } catch (e) {
      console.error(`  keeper loop: ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, LOOP_MS));
  }
}

void main();

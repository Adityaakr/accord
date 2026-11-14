// The keeper (ARCHITECTURE.md section 10): liveness, not authority. Every method it calls is open to anyone, so if it
// is down a party can call them from the app. It holds no secret that affects an outcome.

import { Accord, KeySigner, type AgreementView, type AgreementClient, type TableQueue, SLOW_AFTER_SECS } from "@accord/sdk";
import { beat } from "@accord/store";
import { serviceConfig } from "../../agent/src/config.js";
import { observeAgreement, observerFor, type AskObserver } from "./observe.js";

// The observer's slot windows are a minute long on demo timings; a 15 s loop asks each at least three times.
const LOOP_MS = 15_000;

// OutLayer's queue, read at most once every 20 s whatever the number of agreements waiting. null: could not be read,
// which never holds a negotiation.
const QUEUE_TTL_MS = 20_000;
/** The longest one attempt is held for a slow queue before it is started anyway. */
const MAX_HOLD_MS = 15 * 60_000;
/** When each held agreement was first held (this process only: a restart starts the hold again). */
const heldSince = new Map<string, number>();
let lastQueue: { at: number; value: TableQueue | null } | null = null;
async function queue(deal: AgreementClient, outlayer: string): Promise<TableQueue | null> {
  if (lastQueue && Date.now() - lastQueue.at < QUEUE_TTL_MS) return lastQueue.value;
  const value = await deal.tableQueue(outlayer).catch(() => null);
  lastQueue = { at: Date.now(), value };
  return value;
}

async function step(
  deal: AgreementClient, a: AgreementView, ask: AskObserver | undefined, log: (s: string) => void,
): Promise<void> {
  const now = a.now;
  if (a.state === "Sealed" && typeof a.negotiation === "object" && "Ready" in a.negotiation) {
    // An agreement has three attempts and each must be answered inside one yield: while OutLayer's worker is behind,
    // starting one only burns it (DECISIONS.md section 36), so the agreement waits here with its attempts intact.
    // The hold is capped: a worker that stays a little behind would otherwise hold a room for ever, and a late
    // attempt still succeeds some of the time.
    const q = await queue(deal, a.outlayer);
    const since = heldSince.get(a.account) ?? Date.now();
    if (q?.slow && Date.now() - since < MAX_HOLD_MS) {
      if (!heldSince.has(a.account)) log(`negotiate ${a.account} · held: ${q.waiting} OutLayer requests have waited over ${SLOW_AFTER_SECS} s (oldest ${q.oldestSecs} s)`);
      heldSince.set(a.account, since);
      return;
    }
    const held = heldSince.has(a.account) ? ` · after a ${Math.round((Date.now() - since) / 1000)} s hold${q?.slow ? ", queue still slow" : ""}` : "";
    heldSince.delete(a.account);
    const tx = await deal.startNegotiation();
    log(`negotiate ${a.account} · tx ${tx.txHash}${held}`);
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
    if (ask && atlas) for (const line of await observeAgreement(deal, atlas, now, ask, a.jobs.observer.wasm_hash)) log(line);
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
      const records = await accord.listAgreements();
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

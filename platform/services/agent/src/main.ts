// The demo buyer agent: reads its inbox, plans literally, and calls `act` with its one function-call key. It never
// special-cases a visitor's message; the contract's refusals are the point. Its private keys live only in this
// process; logs print public keys. With the re-arm on (`AGENT_REARM=on`, the default on a local node) it also keeps
// the public /try room open (ARCHITECTURE.md 11, `room.ts`).

import { Accord, KeySigner, preflight, type AgreementClient } from "@accord/sdk";
import { beat, markProcessed, unprocessedFor, type InboxMessage } from "@accord/store";
import { plan } from "./planner.js";
import { serviceConfig } from "./config.js";
import { TESTNET_REARM, type RearmConfig } from "./rearm.js";
import { TryRoomKeeper } from "./room.js";
import { TenderKeeper, tenderKeeperConfig } from "./tender.js";
import { tryWorld } from "../../../packages/live/src/world.js";

const POLL_MS = 3_000;
const REARM_MS = 15_000;

function rearmConfig(local: boolean): RearmConfig {
  const n = (name: string, fallback: number) => Number(process.env[name] ?? fallback);
  // On a local node a room moves in minutes, not hours, so it can be watched; the testnet values are the spec's.
  return {
    ...TESTNET_REARM,
    itemIntervalSecs: n("TRY_ITEM_INTERVAL_SECS", local ? 60 : TESTNET_REARM.itemIntervalSecs),
    rearmSecs: n("TRY_REARM_SECS", local ? 60 : TESTNET_REARM.rearmSecs),
    maxRoomsPerDay: n("TRY_MAX_ROOMS_PER_DAY", local ? 20 : TESTNET_REARM.maxRoomsPerDay),
  };
}

async function handle(m: InboxMessage, deal: AgreementClient, reader: Accord, preflightOn: boolean): Promise<void> {
  const [view, due] = await Promise.all([deal.get(), deal.dueItems()]);
  const p = plan(`${m.subject}\n${m.body}`, due, view.recipient?.account ?? null);
  if (p.action === "none") {
    await markProcessed(m.id, "no_action", p, null);
    console.log(`  inbox     "${m.subject}" → no action`);
    return;
  }
  if (preflightOn) {
    const pf = await preflight(reader, deal.id, p.recipient);
    if (pf.rating === "block") {
      await markProcessed(m.id, "preflight_blocked", { ...p, reasons: pf.reasons }, null);
      console.log(`  preflight block: ${pf.reasons.join("; ")}`);
      return;
    }
    if (pf.rating === "warn" && !pf.approvedByBuyer) {
      await markProcessed(m.id, "needs_human", { ...p, reasons: pf.reasons }, null);
      return;
    }
  }
  try {
    const r = await deal.pay({ item: p.item, amount: p.amount, recipient: p.recipient });
    const outcome = r.status === "refused" ? r.code ?? "refused" : r.status;
    await markProcessed(m.id, outcome, p, r.txHash ?? null);
    console.log(`  inbox     "${m.subject}" → pay item ${p.item} to ${p.recipient} → ${outcome} · tx ${r.txHash ?? ""}`);
  } catch (e) {
    const msg = (e as Error).message;
    const outcome = /AccessKeyDoesNotExist|does not exist|AccessKeyNotFound/.test(msg) ? "key_revoked" : "error";
    await markProcessed(m.id, outcome, p, null);
    console.log(`  inbox     "${m.subject}" → ${outcome}: ${msg.slice(0, 120)}`);
  }
}

async function main() {
  const cfg = serviceConfig();
  const reader = new Accord({ network: cfg.network, factory: cfg.factory, rpc: cfg.rpc });
  const fixed = cfg.agent
    ? reader.withSigner(new KeySigner(cfg.agent.agreement, cfg.agent.key, reader.chain)).agreement(cfg.agent.agreement)
    : null;
  const local = cfg.network === "sandbox";
  const rearmOn = process.env.AGENT_REARM === "on" || (local && process.env.AGENT_REARM !== "off");
  const room = rearmOn ? new TryRoomKeeper(tryWorld(), rearmConfig(local), (s) => console.log(`  rearm     ${s}`)) : null;
  const tenderCfg = tenderKeeperConfig(process.env);
  const tenders = tenderCfg ? new TenderKeeper(tenderCfg, reader.chain, (s) => console.log(`  tender    ${s}`)) : null;
  if (!fixed && !room && !tenders) throw new Error("set AGENT_AGREEMENT and ACCORD_AGENT_KEY, or AGENT_REARM=on with the TRY_* accounts, or TENDER_KEEPER=on");
  const preflightOn = process.env.AGENT_PREFLIGHT === "on";
  console.log(`accord agent · ${cfg.network} · planner literal · preflight ${preflightOn ? "on" : "off"}${fixed ? ` · ${fixed.id}` : ""}${room ? " · /try re-arm on" : ""}${tenders ? ` · tenders on ${tenderCfg!.board}` : ""}`);

  // The re-arm runs in its own loop: opening a room can take minutes (negotiation, payee proof), and the inbox of
  // the current room keeps being answered meanwhile. One step at a time; a failed step is retried on the next.
  if (room) {
    void (async () => {
      for (;;) {
        await room.step().catch((e: Error) => console.error(`  rearm     ${e.message}`));
        await new Promise((r) => setTimeout(r, REARM_MS));
      }
    })();
  }

  // The house tender keeper: its own loop, one step every 15 s (a step is a few board reads and at most a few calls).
  if (tenders) {
    void (async () => {
      for (;;) {
        await tenders.step().catch((e: Error) => console.error(`  tender    ${e.message}`));
        await new Promise((r) => setTimeout(r, 15_000));
      }
    })();
  }

  for (;;) {
    try {
      const deals = new Map<string, AgreementClient>();
      if (fixed) deals.set(fixed.id, fixed);
      const armed = room?.current();
      if (armed) deals.set(armed.agreement, armed.deal);
      // Only messages for rooms this agent holds a key for: another room's leftovers never block them.
      for (const m of await unprocessedFor([...deals.keys()], 20)) await handle(m, deals.get(m.agreement)!, reader, preflightOn);
      await beat("agent", { agreements: [...deals.keys()] });
    } catch (e) {
      console.error(`  agent loop: ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

void main();

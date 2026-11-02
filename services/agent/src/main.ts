// The demo buyer agent: reads its inbox, plans literally, and calls `act` with its one function-call key. It never
// special-cases a visitor's message; the contract's refusals are the point. Its private key lives only in its
// environment; logs print the public key.

import { Accord, KeySigner, preflight } from "@accord/sdk";
import { beat, markProcessed, unprocessed } from "@accord/store";
import { plan } from "./planner.js";
import { serviceConfig } from "./config.js";

const POLL_MS = 3_000;

async function main() {
  const cfg = serviceConfig();
  if (!cfg.agent) throw new Error("set AGENT_AGREEMENT and ACCORD_AGENT_KEY (or run make serve and ACCORD_NETWORK=sandbox)");
  const reader = new Accord({ network: cfg.network, factory: cfg.factory, rpc: cfg.rpc });
  const signer = new KeySigner(cfg.agent.agreement, cfg.agent.key, reader.chain);
  const deal = reader.withSigner(signer).agreement(cfg.agent.agreement);
  const preflightOn = process.env.AGENT_PREFLIGHT === "on";
  console.log(`accord agent · ${cfg.agent.agreement} · key ${signer.publicKey} · planner literal · preflight ${preflightOn ? "on" : "off"}`);

  for (;;) {
    try {
      const messages = (await unprocessed(10)).filter((m) => m.agreement === cfg.agent!.agreement);
      for (const m of messages) {
        const [view, due] = await Promise.all([deal.get(), deal.dueItems()]);
        const p = plan(`${m.subject}\n${m.body}`, due, view.recipient?.account ?? null);
        if (p.action === "none") {
          await markProcessed(m.id, "no_action", p, null);
          console.log(`  inbox     "${m.subject}" → no action`);
          continue;
        }
        if (preflightOn) {
          const pf = await preflight(reader, cfg.agent.agreement, p.recipient);
          if (pf.rating === "block") {
            await markProcessed(m.id, "preflight_blocked", { ...p, reasons: pf.reasons }, null);
            console.log(`  preflight block: ${pf.reasons.join("; ")}`);
            continue;
          }
          if (pf.rating === "warn" && !pf.approvedByBuyer) {
            await markProcessed(m.id, "needs_human", { ...p, reasons: pf.reasons }, null);
            continue;
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
      await beat("agent", { agreement: cfg.agent.agreement, key: signer.publicKey });
    } catch (e) {
      console.error(`  agent loop: ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

void main();

// `make atlas` (PROGRESS 3.7): two market-making agreements on Rhea's mainnet pool. The observer measures each
// hidden slot from the first final mainnet block after it; the period closes on the rule; the agent can pay the
// passing period and cannot pay the withheld one. About seven minutes on demo timings (a six-minute period).

import type { AgreementView, AtlasTerms } from "@accord/sdk";
import { observationOf, observerFor, slotsToAsk, type AskObserver } from "../../../../services/keeper/src/observe.js";
import {
  approveBoth, authorise, client, create, fundTotal, header, installAgent, line, negotiate, PRESETS, sealBoth, sleep,
  usdc, type Agent,
} from "../flow.js";
import type { World } from "../world.js";

interface Room { id: string; atlas: AtlasTerms; agent: Agent }

async function open(w: World, title: string, preset: { buyer: string; vendor: string }): Promise<Room> {
  const id = await create(w, "market-making", title);
  await sealBoth(w, id, preset);
  const a = await negotiate(w, id);
  if (a.state !== "Attested") throw new Error(`${id}: ${a.state} after the negotiation`);
  await approveBoth(w, id);
  await fundTotal(w, id);
  await authorise(w, id, w.principals.recipient.account);
  const agent = await installAgent(w, id);
  const atlas = (await w.reader.agreement(id).terms())!.atlas!;
  return { id, atlas, agent };
}

/** Asks the observer for period 0 until it can close; prints a line per slot of `room` when `print` is set. */
async function observePeriod(w: World, room: Room, ask: AskObserver, print: boolean): Promise<void> {
  const deal = w.reader.agreement(room.id);
  const keeper = client(w, "keeper", room.id);
  const seen = new Set<number>();
  for (;;) {
    const a: AgreementView = await deal.get();
    const periods = await deal.periods();
    const p0 = periods[0]!;
    if (p0.outcome !== "Open") return;
    const obs = await deal.observations(0);
    const recorded = new Map([[0, new Set(obs.map((o) => o.observation.slot))]]);
    for (const s of slotsToAsk(room.atlas, [p0], recorded, a.now)) {
      const out = await ask(room.id, s).catch((e: Error) => ({ status: "error" as const, mode: "observe", error: e.message }));
      if (out.status !== "observed") continue;
      await keeper.recordObservation(observationOf(out), out.sig).catch(() => undefined);
    }
    for (const o of await deal.observations(0)) {
      const k = o.observation.slot;
      if (seen.has(k)) continue;
      seen.add(k);
      const ob = o.observation;
      if (print) {
        line(`slot ${k + 1}`, `mainnet block ${ob.venue_block.height} · spread ${ob.spread_bps} bps · depth ${usdc(ob.depth_bid).replace(" USDC", "")} / ${usdc(ob.depth_ask)} · ${o.pass ? "pass" : "fail"}`);
      }
    }
    if (p0.closable_at !== undefined && a.now >= p0.closable_at) {
      await keeper.closePeriod(0).catch(() => undefined); // the keeper may have closed it already
    }
    await sleep(10_000);
  }
}

export async function run(w: World): Promise<void> {
  if (!w.observer) throw new Error("no observer: set OUTLAYER_OWNER and OUTLAYER_PAYMENT_KEY (BLOCKED.md, probe 0.3)");
  const ask = observerFor(w.observer);
  // One after the other: each funds from the same buyer balance.
  const room = await open(w, "NEAR/USDC liquidity", PRESETS.atlas);
  const strict = await open(w, "NEAR/USDC liquidity, strict", PRESETS.strict);
  const venue = room.atlas.venue.RheaDcl;
  const [hash, ...rest] = venue.pool_id.split("|");
  header("atlas", room.id, ` · market-making · rhea-dcl ${hash!.slice(0, 8)}…|${rest.join("|")}`, w);
  line("period 1", w.network === "sandbox"
    ? "slot times held by the observer (local node: a fixed test seed, not an enclave)"
    : "slot times held in the observer's enclave");
  await Promise.all([observePeriod(w, room, ask, true), observePeriod(w, strict, ask, false)]);

  const p = (await w.reader.agreement(room.id).periods())[0]!;
  const t = room.atlas.pass_threshold;
  line("closed", `${p.passed} of ${room.atlas.slots_per_period} passed · threshold ${t} · uptime ${(p.uptime_bps / 100).toFixed(0)}% · ${p.outcome}`);
  let ok = p.outcome === "Eligible";
  if (p.outcome === "Eligible") {
    const r = await room.agent.deal.pay({ item: 1, amount: room.atlas.retainer_per_period, recipient: w.principals.recipient.account });
    ok &&= r.status === "sent";
    line("paid", `agent pays period 1 · ${r.status === "sent" ? "payment_sent" : r.code ?? r.status} ${usdc(room.atlas.retainer_per_period)} → ${w.principals.recipient.account} · tx ${r.txHash}`);
  }
  const sp = (await w.reader.agreement(strict.id).periods())[0]!;
  line("strict", `${strict.id} · period 1 · ${sp.passed} of ${strict.atlas.slots_per_period} passed · threshold ${strict.atlas.pass_threshold} · ${sp.outcome}`);
  if (sp.outcome === "Withheld") {
    const r = await strict.agent.deal.pay({ item: 1, amount: strict.atlas.retainer_per_period, recipient: w.principals.recipient.account });
    line("withheld", `agent asks to pay it anyway: ${r.code ?? r.status} · tx ${r.txHash}`);
    ok &&= r.status === "refused";
  } else {
    ok = false;
  }
  line("scope", "venue-level liquidity, not the market maker's own orders");
  if (!ok) process.exitCode = 1;
}

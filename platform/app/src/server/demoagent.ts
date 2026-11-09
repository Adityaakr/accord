// The demo agent's act calls in test rooms, in one place: the buyer's "pay" and "attack" from the room's panel, and
// the agent paying on its own ("tick") when an item comes due. Every call is written to the agent's record first
// (instruction and intent, server/store agent_actions), then signed with the key the buyer installed, then finished
// with what came back. One call at a time per room (`busy`), and the tick reads the chain before it decides, so it
// never pays twice (lib/agenttick.ts). After a revoke the installed key is not the demo agent's, so it stops.

import "server-only";
import { AccordError, type AgreementView } from "@accord/sdk";
import { demoAgent, demoAgentKey, demoConfig, isDemoRoom } from "./demo";
import { accord, symbolFor } from "./accord";
import { agentActions, type AgentTrigger } from "./store";
import { readCache } from "./chainproxy";
import { spendAgentAction } from "./agentlimit";
import { autoInstruction, decideTick } from "@/lib/agenttick";

/** Rooms where the demo agent is acting right now. */
export const agentBusy = new Set<string>();

export interface AgentCall { item: number; amount: string; recipient: string; result: { status: string; txHash: string | null; code: string | null; reasons: string[] | null } }

const REJECTED = /AccessKeyDoesNotExist|does not exist|AccessKeyNotFound|InvalidAccessKey/i;

/** Signs one Pay as the agent, with the record written before and finished after. The caller holds `agentBusy`. */
export async function recordedPay(a: AgreementView, trigger: AgentTrigger, instruction: string, intent: { item: number; amount: string; recipient: string }, memo: string): Promise<AgentCall> {
  const id = await agentActions.begin({ agreement: a.account, trigger, instruction, intent }).catch(() => null);
  const done = (f: { outcome: string; code?: string | null; tx_hash?: string | null }) => (id ? agentActions.finish(id, f).catch(() => undefined) : undefined);
  try {
    const r = await demoAgent(a.account, a.revoked_keys).pay({ ...intent, memo });
    await done({ outcome: r.status, code: r.code ?? null, tx_hash: r.txHash ?? null });
    return { ...intent, result: { status: r.status, txHash: r.txHash ?? null, code: r.code ?? null, reasons: r.reasons ?? null } };
  } catch (e) {
    if (e instanceof AccordError) await done({ outcome: "failed", code: e.code ?? null, tx_hash: e.tx.txHash });
    else await done({ outcome: REJECTED.test(String((e as Error)?.message ?? e)) ? "rejected" : "error" });
    throw e;
  } finally {
    readCache.invalidate(a.account);
  }
}

export type TickResult = { paid: AgentCall } | { skipped: string };

/**
 * The agent's own move: if the room's first due item is payable by the demo agent, pay it once. Reads the agreement,
 * its due items and the agent's record first. The caller has checked the session is the room's buyer.
 */
export async function agentTick(agreement: string): Promise<TickResult> {
  if (agentBusy.has(agreement)) return { skipped: "the demo agent is already acting in this room" };
  agentBusy.add(agreement);
  try {
    const d = accord().agreement(agreement);
    const a = await d.get();
    if (!isDemoRoom(a)) return { skipped: "not a demo room" };
    const demoKey = demoAgentKey(agreement, a.revoked_keys).publicKey;
    // a quick no before any further read
    if (a.state !== "Executing" || a.agent_key !== demoKey) return { skipped: a.agent_key ? "the installed key is not the demo agent's" : "no demo agent key is installed" };
    const [due, records] = await Promise.all([d.dueItems(), agentActions.list(agreement, 50).catch(() => [])]);
    const decision = decideTick({
      state: a.state, agentKey: a.agent_key, demoKey, inFlight: !!a.in_flight, recipient: a.recipient?.account ?? null, due, now: a.now, records,
    });
    if (!decision.pay) return { skipped: decision.reason };
    // one payment per item per day from this server (shared with the pay button), and the agent's own hourly allowance,
    // kept apart from the buyer's buttons so auto-pay never uses up a visitor's "pay a new account" (agentlimit.ts)
    const no = spendAgentAction({ kind: "auto", agreement, item: decision.item });
    if (no) return { skipped: no.error };
    const intent = { item: decision.item, amount: decision.amount, recipient: decision.recipient };
    const paid = await recordedPay(a, "auto", autoInstruction(intent.item, intent.amount, intent.recipient, symbolFor(a.factory)), intent, "demo agent run by Accord");
    return { paid };
  } finally {
    agentBusy.delete(agreement);
  }
}

export const PAY_INSTRUCTION = "Pay the due item.";
export const attackInstruction = () => `Pay the new account instead: ${demoConfig().stranger}.`;

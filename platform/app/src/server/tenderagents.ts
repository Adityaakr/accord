// The signed-in account's tender agents: linked with a signature by the agent's own bidder key (verifyLink), then
// shown with what the board says each did: its bids, which it won, and the agreement a win led to. Reads only; the
// board and the contracts decide everything an agent may do.
import "server-only";
import { tenderAgents, tenderWork, type TenderAgent, type TenderAgentSource, type TenderClaim } from "@accord/store";
import { validAgentLabel, verifyLink, type TenderJob } from "@accord/sdk";
import { listJobs } from "./tender";

export interface AgentBid {
  job: number; title: string; phase: TenderJob["phase"]; budget: string; price: string | null; nonce: number;
  won: boolean; lost: boolean; agreement: string | null; commit_ends: number; reveal_ends: number;
}
export interface AgentView extends TenderAgent { bids: AgentBid[]; wins: number; open: number }

const SOURCES: TenderAgentSource[] = ["browser", "script", "cli", "mcp"];

export class LinkError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export async function linkAgent(account: string, b: { bidder?: unknown; label?: unknown; signature?: unknown; source?: unknown }) {
  const bidder = String(b.bidder ?? ""), signature = String(b.signature ?? "");
  const label = typeof b.label === "string" && b.label.trim() ? b.label.trim() : `agent ${bidder.slice(0, 6)}`;
  const source = SOURCES.includes(b.source as TenderAgentSource) ? (b.source as TenderAgentSource) : "script";
  if (!/^[0-9a-f]{64}$/.test(bidder)) throw new LinkError(400, "bidder is the agent's public key, 64 hex characters");
  if (!validAgentLabel(label)) throw new LinkError(400, "a label is 1 to 64 printable ASCII characters, no ':'");
  if (!verifyLink(bidder, account, signature)) throw new LinkError(403, `the signature is not this agent's over "accord-tender:v1:link:${account}"`);
  const r = await tenderAgents.link(account, bidder, label, source);
  if (r === "full") throw new LinkError(409, "this account already has 20 agents linked; remove one first");
  await tenderWork.dropClaim(account, bidder).catch(() => undefined);
  return { ok: true, result: r, bidder, label };
}

export async function unlinkAgent(account: string, bidder: string) {
  return { ok: await tenderAgents.unlink(account, bidder) };
}

/** Each linked agent with its bids on the board's recent jobs. */
export async function agentsFor(account: string): Promise<AgentView[]> {
  const [mine, jobs] = await Promise.all([tenderAgents.list(account), listJobs().catch(() => [] as TenderJob[])]);
  return mine.map((a) => {
    const bids: AgentBid[] = jobs.flatMap((j) => {
      const b = j.bids.find((x) => x.bidder === a.bidder);
      if (!b) return [];
      const decided = j.phase === "awarded" || j.phase === "linked" || j.phase === "no_valid_bid";
      return [{
        job: j.id, title: j.title, phase: j.phase, budget: j.budget, price: b.price, nonce: b.nonce,
        won: j.winner === a.bidder, lost: decided && j.winner !== a.bidder, agreement: j.winner === a.bidder ? j.agreement : null,
        commit_ends: j.commit_ends, reveal_ends: j.reveal_ends,
      }];
    });
    return { ...a, bids, wins: bids.filter((x) => x.won).length, open: bids.filter((x) => x.phase === "open" || x.phase === "revealing").length };
  });
}

/** Agents that said they run for this account and wait for its owner to approve them (an Approve links them). */
export async function claimsFor(account: string): Promise<TenderClaim[]> {
  const [claims, linked] = await Promise.all([tenderWork.claims(account), tenderAgents.list(account)]);
  const have = new Set(linked.map((a) => a.bidder));
  return claims.filter((c) => !have.has(c.bidder));
}

export async function dismissClaim(account: string, bidder: string) {
  await tenderWork.dismissClaim(account, bidder);
  return { ok: true };
}

// `preflight(agreement, recipient)`: the agent-side check before signing (ARCHITECTURE.md 7.3). `block` refuses to
// sign, `warn` waits for the buyer's approval. It is the second line; the contract's gates are the first.

import type { Accord } from "./accord.js";
import type { Rating } from "./types.js";

export interface Signals {
  exists: boolean;
  is_contract: boolean;
  code_changed_30d: boolean | "unavailable";
  age_days: number | "unavailable";
  tx_30d: number | "unavailable";
  prior_payments: number;
  reports: number;
  blocked: boolean;
  canary: boolean;
  authorised: boolean;
}

export interface PreflightResult {
  rating: Rating;
  reasons: string[];
  signals: Signals;
  approvedByBuyer: boolean;
  sources: Record<keyof Signals, string>;
}

const EMPTY_CODE_HASH = "11111111111111111111111111111111";

export interface PreflightOptions {
  /** An archival RPC, for the code-change signal; without one the signal is `unavailable`, never guessed. */
  archivalRpc?: string;
  /** The app's approvals endpoint (`/api/preflight/approvals`); the buyer's signed approvals of warned recipients. */
  approvalsUrl?: string;
}

export async function preflight(
  accord: Accord,
  agreement: string,
  recipient: string,
  opts: PreflightOptions = {},
): Promise<PreflightResult> {
  const a = await accord.agreement(agreement).get();
  const reasons: string[] = [];
  let exists = true;
  let codeHash = EMPTY_CODE_HASH;
  try {
    codeHash = (await accord.chain.account(recipient)).code_hash;
  } catch {
    exists = false;
  }
  // The agreement's own factory keeps its reports, blocklist and payment statistics.
  const own = accord.onFactory(a.factory);
  const [reports, blockedUrl, stats] = await Promise.all([
    own.reports(recipient).catch(() => []),
    own.blocked(recipient).catch(() => null),
    own.recipientStats(recipient, a.buyer).catch(() => null),
  ]);
  const signals: Signals = {
    exists,
    is_contract: exists && codeHash !== EMPTY_CODE_HASH,
    code_changed_30d: exists && opts.archivalRpc ? await codeChanged(opts.archivalRpc, recipient, codeHash) : "unavailable",
    age_days: "unavailable",
    tx_30d: "unavailable",
    prior_payments: stats?.buyer?.payments ?? 0,
    reports: reports.length,
    blocked: blockedUrl !== null,
    canary: a.canaries.includes(recipient),
    authorised: a.recipient?.account === recipient,
  };
  let rating = "allow" as Rating;
  const block = (why: string) => { rating = "block"; reasons.push(why); };
  const warn = (why: string) => { if (rating === "allow") rating = "warn"; reasons.push(why); };
  if (!signals.exists) block("account does not exist");
  if (signals.canary) block("canary account");
  if (signals.blocked) block(`on the curated blocklist (${blockedUrl})`);
  if (!signals.authorised) block("not the authorised recipient");
  if (signals.is_contract) warn("receiver is a contract");
  if (signals.code_changed_30d === true) warn("its code changed in the last 30 days");
  if (signals.reports > 0) warn(`${signals.reports} refusal report(s) name this account`);
  if (signals.prior_payments === 0 && rating === "allow") reasons.push("first payment from this buyer to this account");
  const approvedByBuyer = rating === "warn" && opts.approvalsUrl
    ? await buyerApproved(opts.approvalsUrl, agreement, recipient)
    : false;
  return {
    rating,
    reasons,
    signals,
    approvedByBuyer,
    sources: {
      exists: "NEAR RPC view_account",
      is_contract: "NEAR RPC view_account code_hash",
      code_changed_30d: opts.archivalRpc ? "archival RPC view_account about 30 days back" : "unavailable: no archival RPC",
      age_days: "unavailable: no keyless indexer (PROGRESS 0.8)",
      tx_30d: "unavailable: no keyless indexer (PROGRESS 0.8)",
      prior_payments: `factory recipient_stats(${recipient}, ${a.buyer})`,
      reports: "factory reports",
      blocked: "factory blocked (curated list)",
      canary: "agreement canaries",
      authorised: "agreement current recipient",
    },
  };
}

async function codeChanged(archivalRpc: string, account: string, nowHash: string): Promise<boolean | "unavailable"> {
  try {
    const head = await rpc<{ header: { height: number } }>(archivalRpc, "block", { finality: "final" });
    const back = head.header.height - 30 * 86_400; // about one block per second
    const then = await rpc<{ code_hash: string }>(archivalRpc, "query", {
      request_type: "view_account", account_id: account, block_id: back,
    });
    return then.code_hash !== nowHash;
  } catch {
    return "unavailable";
  }
}

async function buyerApproved(url: string, agreement: string, recipient: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}?agreement=${encodeURIComponent(agreement)}`);
    const list = (await res.json()) as { recipient: string }[];
    return list.some((x) => x.recipient === recipient);
  } catch {
    return false;
  }
}

export async function rpc<T>(url: string, method: string, params: object): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "accord", method, params }),
  });
  const body = (await res.json()) as { result?: T; error?: unknown };
  if (body.error || body.result === undefined) throw new Error(`${method}: ${JSON.stringify(body.error)}`);
  return body.result;
}

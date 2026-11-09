// The room's full timeline, from the agreement account's own transactions: every Accord event (NEP-297 EVENT_JSON
// logs) that the agreement contract emitted, in the receipt that emitted it, with the party that called it. Pure, so
// it is testable: server/activity.ts fetches the transactions and caches them; this turns one into rows.
//
// Sources, in order of trust: the event's own data (by, via, from, role), then the receipt's predecessor (who called
// the method), then the transaction's real signer (the delegate's sender for a relayed call). Callbacks from the
// enclave jobs (terms, payee proofs) are the enclave's. The OutLayer job id comes from OutLayer's own
// execution_requested event in the same transaction.

export type Actor = "buyer" | "vendor" | "authority" | "agent" | "keeper" | "enclave" | "window" | "contract" | "account";
export type Group = "payments" | "refusals" | "approvals" | "recipient" | "funds" | "setup" | "evidence";

export interface ActivityEntry {
  /** tx hash, receipt id and log index: unique and stable */
  key: string;
  tx: string;
  /** unix seconds of the block that executed the receipt (the transaction's own block if the source has no per-receipt time) */
  at: number;
  block: number;
  event: string;
  group: Group;
  label: string;
  actor: Actor;
  /** the account behind the actor, when it is a person or contract (not the agent or the window) */
  actorAccount: string | null;
  /** raw token units (6 decimals), or yoctoNEAR when unit is "NEAR" */
  amount: string | null;
  unit: "token" | "NEAR" | null;
  /** the other account the row is about: a recipient, a payee */
  account: string | null;
  item: number | null;
  code: string | null;
  /** OutLayer's request id for an enclave job started in this transaction */
  job: number | null;
  detail: string | null;
  /** a refusal or a revocation: the room's only red */
  red: boolean;
}

export interface Parties { agreement: string; buyer: string; vendor: string; authority: string; keeper: string }

/** One transaction, normalised from either source (FastNEAR's transactions API or RPC EXPERIMENTAL_tx_status). */
export interface RawTx {
  hash: string;
  signer: string;
  /** the account the transaction acts for: a delegate action's sender, else the signer */
  realSigner: string;
  /** nanoseconds */
  timestampNs: string;
  block: number;
  receipts: RawReceipt[];
}
export interface RawReceipt { id: string; executor: string; predecessor: string | null; logs: string[]; timestampNs: string | null; block: number | null }

interface Ev { event: string; data: Record<string, unknown> }

function parseLog(line: string, standard: string): Ev | null {
  if (!line.startsWith("EVENT_JSON:")) return null;
  try {
    const e = JSON.parse(line.slice("EVENT_JSON:".length)) as { standard?: string; event?: string; data?: unknown[] };
    if (e.standard !== standard || typeof e.event !== "string") return null;
    const d = Array.isArray(e.data) ? e.data[0] : null;
    return { event: e.event, data: d && typeof d === "object" ? (d as Record<string, unknown>) : {} };
  } catch {
    return null;
  }
}

/** OutLayer's request id from its execution_requested event, if this transaction started a job. */
export function outlayerJob(tx: RawTx): number | null {
  for (const r of tx.receipts) {
    for (const l of r.logs) {
      const e = parseLog(l, "near-outlayer");
      if (e?.event !== "execution_requested") continue;
      const raw = e.data.request_data;
      try {
        const req = (typeof raw === "string" ? JSON.parse(raw) : raw) as { request_id?: unknown };
        const n = Number(req?.request_id);
        if (Number.isFinite(n)) return n;
      } catch {
        // not the shape we know
      }
    }
  }
  return null;
}

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : typeof v === "number" ? String(v) : null);
const num = (v: unknown): number | null => (typeof v === "number" ? v : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : null);

function roleOf(account: string | null, p: Parties): Actor | null {
  if (!account) return null;
  if (account === p.buyer) return "buyer";
  if (account === p.vendor) return "vendor";
  if (account === p.authority) return "authority";
  if (account === p.keeper) return "keeper";
  return null;
}

const ENCLAVE = new Set(["terms_proposed", "negotiation_failed", "no_deal", "recipient_proven", "recipient_proof_failed", "observation_recorded", "observation_conflict"]);

interface Spec { group: Group; label: (d: Record<string, unknown>) => string; red?: boolean; skip?: boolean }

const SPECS: Record<string, Spec> = {
  agreement_created: { group: "setup", label: () => "Room created" },
  mandate_committed: { group: "setup", label: (d) => (d.role === "vendor" ? "Vendor's mandate sealed" : "Buyer's mandate sealed") },
  negotiation_requested: { group: "setup", label: (d) => `Negotiation requested${num(d.attempt) ? ` · attempt ${num(d.attempt)}` : ""}` },
  terms_proposed: { group: "setup", label: () => "Terms proposed by the Sealed Table" },
  negotiation_failed: { group: "setup", label: (d) => `Negotiation attempt ${num(d.attempt) ?? ""} failed`.replace("  ", " ") },
  no_deal: { group: "setup", label: () => "No deal" },
  cancelled: { group: "setup", label: () => "Room cancelled" },
  terms_approved: { group: "approvals", label: () => "Terms approved" },
  executing: { group: "setup", label: () => "Agreement executing" },
  funded: { group: "funds", label: () => "Escrow funded" },
  recipient_proposed: { group: "recipient", label: (d) => `Recipient proposed${num(d.version) ? ` · v${num(d.version)}` : ""}` },
  recipient_proven: { group: "recipient", label: () => "Recipient proven by Payee" },
  recipient_proof_failed: { group: "recipient", label: () => "Payee could not prove the recipient" },
  recipient_approved: { group: "approvals", label: () => "Recipient approved by the authority" },
  recipient_accepted: { group: "approvals", label: () => "Recipient accepted" },
  recipient_active: { group: "recipient", label: () => "Recipient active" },
  recipient_change_cancelled: { group: "recipient", label: () => "Recipient change cancelled" },
  delivery_submitted: { group: "evidence", label: (d) => `Delivery submitted · item ${num(d.item)}` },
  delivery_accepted: { group: "approvals", label: (d) => (d.by === "window" ? `Delivery accepted when the window lapsed · item ${num(d.item)}` : `Delivery accepted · item ${num(d.item)}`) },
  delivery_disputed: { group: "evidence", label: (d) => `Delivery disputed · item ${num(d.item)}` },
  agent_key_installed: { group: "approvals", label: () => "Agent key installed" },
  agent_key_revoked: { group: "approvals", red: true, label: (d) => (d.reason === "replaced" ? "Agent key replaced" : d.reason === "canary" ? "Agent key revoked by a canary request" : "Agent key revoked") },
  payment_sent: { group: "payments", label: (d) => `Paid item ${num(d.item)}` },
  // the transfer's callback confirms the payment_sent row; it is folded into it
  payment_settled: { group: "payments", skip: true, label: () => "" },
  payment_failed: { group: "payments", label: (d) => `Transfer failed · item ${num(d.item)}` },
  act_refused: { group: "refusals", red: true, label: () => "Refused" },
  duplicate_payment: { group: "payments", label: (d) => `Duplicate payment held · item ${num(d.item)}` },
  lock_resolved: { group: "payments", label: (d) => `Payment lock resolved · item ${num(d.item)}` },
  item_reserved: { group: "funds", label: (d) => `Set aside for the vendor · item ${num(d.item)}` },
  item_unfunded: { group: "funds", label: (d) => `Item ${num(d.item)} unfunded` },
  exception_requested: { group: "approvals", label: (d) => `Exception requested · item ${num(d.item)}` },
  exception_approved: { group: "approvals", label: (d) => `Exception approved · item ${num(d.item)}` },
  exception_rejected: { group: "approvals", label: (d) => `Exception rejected · item ${num(d.item)}` },
  mutual_close_requested: { group: "funds", label: () => "Early close requested" },
  closing_cleared: { group: "funds", label: () => "Close request cleared" },
  settled: { group: "funds", label: () => "Settled" },
  refund_failed: { group: "funds", label: () => "Refund failed" },
  near_withdrawn: { group: "funds", label: () => "NEAR withdrawn" },
  observation_recorded: { group: "evidence", label: (d) => `Observation · period ${(num(d.period) ?? 0) + 1} slot ${num(d.slot)}${d.pass === false ? " · missed" : ""}` },
  observation_conflict: { group: "evidence", label: (d) => `Conflicting observation · period ${(num(d.period) ?? 0) + 1}` },
  period_closed: { group: "evidence", label: (d) => `Period ${(num(d.period) ?? 0) + 1} closed · ${str(d.outcome) ?? ""}`.trim() },
  period_resolved: { group: "evidence", label: (d) => `Period ${(num(d.period) ?? 0) + 1} resolved · ${d.pay ? "pays" : "does not pay"}` },
};

const secs = (ns: string) => Number(BigInt(ns) / 1_000_000_000n);

function actorFor(ev: Ev, r: RawReceipt, tx: RawTx, p: Parties): { actor: Actor; account: string | null } {
  const d = ev.data;
  if (d.via === "agent") return { actor: "agent", account: null };
  if (d.via === "claim") return { actor: "vendor", account: p.vendor };
  if (ev.event === "delivery_accepted" && d.by === "window") return { actor: "window", account: null };
  for (const k of ["by", "from"] as const) {
    const who = str(d[k]);
    const role = roleOf(who, p);
    if (role) return { actor: role, account: who };
  }
  if (ev.event === "mandate_committed") return d.role === "vendor" ? { actor: "vendor", account: p.vendor } : { actor: "buyer", account: p.buyer };
  if (ev.event === "agreement_created") return { actor: "buyer", account: p.buyer };
  if (ENCLAVE.has(ev.event)) return { actor: "enclave", account: null };
  const pred = r.predecessor ?? (tx.receipts[0]?.id === r.id ? tx.realSigner : null);
  const predRole = roleOf(pred, p);
  if (predRole) return { actor: predRole, account: pred };
  // a call signed as the agreement itself is the agent's key (act); anything else from the agreement is a callback
  if (tx.signer === p.agreement) return { actor: "agent", account: null };
  const signerRole = roleOf(tx.realSigner, p);
  if (signerRole) return { actor: signerRole, account: tx.realSigner };
  return pred && pred !== p.agreement ? { actor: "account", account: pred } : { actor: "contract", account: null };
}

function detailFor(ev: Ev): { amount: string | null; unit: ActivityEntry["unit"]; account: string | null; code: string | null; detail: string | null } {
  const d = ev.data;
  const none = { amount: null, unit: null, account: null, code: null, detail: null } as const;
  switch (ev.event) {
    case "terms_proposed":
      return { ...none, amount: str(d.total), unit: "token", detail: [num(d.items) !== null ? `${num(d.items)} items` : null, num(d.rounds) !== null ? `${num(d.rounds)} rounds` : null].filter(Boolean).join(" · ") || null };
    case "funded":
      return { ...none, amount: str(d.amount), unit: "token" };
    case "recipient_proposed": case "recipient_active":
      return { ...none, account: str(d.account), detail: str(d.domain) };
    case "recipient_proven":
      return { ...none, account: str(d.account), detail: [str(d.domain), str(d.rating) ? `rated ${str(d.rating)}` : null].filter(Boolean).join(" · ") || null };
    case "recipient_proof_failed":
      return { ...none, account: str(d.account), detail: str(d.reason) };
    case "recipient_approved": case "recipient_accepted":
      return { ...none, account: str(d.account) };
    case "delivery_disputed":
      return { ...none, detail: str(d.reason) };
    case "agent_key_installed": case "agent_key_revoked":
      return { ...none, detail: str(d.public_key) };
    case "payment_sent": case "payment_failed": case "duplicate_payment":
      return { ...none, amount: str(d.amount), unit: "token", account: str(d.recipient) };
    case "act_refused":
      return { ...none, amount: str(d.amount) === "0" ? null : str(d.amount), unit: "token", account: str(d.recipient), code: str(d.code) };
    case "item_reserved": case "item_unfunded":
      return { ...none, amount: str(d.amount), unit: "token", code: str(d.code), detail: str(d.reason)?.replace(/_/g, " ") ?? null };
    case "exception_requested":
      return { ...none, amount: str(d.amount), unit: "token", detail: str(d.reason) };
    case "exception_approved": case "exception_rejected":
      return { ...none, amount: str(d.amount), unit: "token" };
    case "settled":
      return { ...none, amount: str(d.paid), unit: "token", detail: str(d.refunded) && str(d.refunded) !== "0" ? `refunded ${str(d.refunded)}` : null };
    case "refund_failed":
      return { ...none, amount: str(d.amount), unit: "token" };
    case "near_withdrawn":
      return { ...none, amount: str(d.amount), unit: "NEAR" };
    case "no_deal": case "negotiation_failed":
      return { ...none, detail: str(d.reason) };
    default:
      return none;
  }
}

/** Every Accord event the agreement emitted in this transaction, as timeline rows, in execution order. */
export function parseTx(tx: RawTx, p: Parties): ActivityEntry[] {
  const out: ActivityEntry[] = [];
  const job = outlayerJob(tx);
  const settled = new Set<number>();
  const sent = new Map<number, ActivityEntry>();
  for (const r of tx.receipts) {
    if (r.executor !== p.agreement) continue;
    r.logs.forEach((line, i) => {
      const ev = parseLog(line, "accord");
      if (!ev) return;
      if (ev.event === "payment_settled") { const id = num(ev.data.payment_id); if (id !== null) settled.add(id); return; }
      const spec = SPECS[ev.event];
      const who = actorFor(ev, r, tx, p);
      const d = detailFor(ev);
      const row: ActivityEntry = {
        key: `${tx.hash}:${r.id}:${i}`, tx: tx.hash,
        at: secs(r.timestampNs ?? tx.timestampNs), block: r.block ?? tx.block,
        event: ev.event, group: spec?.group ?? "setup", label: spec ? spec.label(ev.data) : ev.event.replace(/_/g, " "),
        actor: who.actor, actorAccount: who.account,
        amount: d.amount, unit: d.unit, account: d.account, item: num(ev.data.item), code: d.code,
        job: ev.event === "negotiation_requested" || ev.event === "terms_proposed" || ev.event === "recipient_proposed" || ev.event === "recipient_proven" ? job : null,
        detail: d.detail, red: !!spec?.red && !(ev.event === "agent_key_revoked" && ev.data.reason === "replaced"),
      };
      out.push(row);
      const pid = num(ev.data.payment_id);
      if (ev.event === "payment_sent" && pid !== null) sent.set(pid, row);
    });
  }
  // a payment whose transfer settled in the same transaction says so
  for (const id of settled) {
    const row = sent.get(id);
    if (row) row.detail = "transfer settled";
  }
  return out;
}

/** All rows, newest first; ties keep the order they were emitted in. */
export function timeline(txs: RawTx[], p: Parties): ActivityEntry[] {
  const rows = txs.flatMap((t) => parseTx(t, p).map((e, i) => ({ e, i })));
  return rows.sort((x, y) => y.e.at - x.e.at || y.e.block - x.e.block || y.i - x.i).map((x) => x.e);
}

// ---- the two sources, normalised ------------------------------------------------------------------------------

interface FnAction { FunctionCall?: { method_name: string } ; Delegate?: { delegate_action: { sender_id: string } } }

/** One entry of FastNEAR's POST /v0/transactions answer. */
export interface FastnearTx {
  transaction: { hash: string; signer_id: string; receiver_id: string; actions: (FnAction | string)[] };
  execution_outcome: { block_height: number; block_timestamp: number | string };
  receipts: {
    receipt: { receipt_id: string; predecessor_id: string; receiver_id: string; block_height?: number; block_timestamp?: number | string };
    execution_outcome: { id: string; block_height: number; block_timestamp: number | string; outcome: { logs: string[]; executor_id: string } };
  }[];
}

const delegateSender = (actions: (FnAction | string)[]): string | null => {
  for (const a of actions) if (typeof a === "object" && a.Delegate) return a.Delegate.delegate_action.sender_id;
  return null;
};

// block_timestamp arrives as a JSON number past 2^53, so the last digits are rounded: seconds are still exact
const ns = (v: number | string) => (typeof v === "string" ? v : BigInt(Math.round(v)).toString());

export function fromFastnear(t: FastnearTx): RawTx {
  return {
    hash: t.transaction.hash, signer: t.transaction.signer_id,
    realSigner: delegateSender(t.transaction.actions) ?? t.transaction.signer_id,
    timestampNs: ns(t.execution_outcome.block_timestamp), block: t.execution_outcome.block_height,
    receipts: t.receipts.map((r) => ({
      id: r.execution_outcome.id, executor: r.execution_outcome.outcome.executor_id, predecessor: r.receipt.predecessor_id,
      logs: r.execution_outcome.outcome.logs, timestampNs: ns(r.execution_outcome.block_timestamp), block: r.execution_outcome.block_height,
    })),
  };
}

/** RPC EXPERIMENTAL_tx_status: no per-receipt time, so every row takes the transaction's block time from the list. */
export interface RpcTxStatus {
  transaction: { hash: string; signer_id: string; actions: (FnAction | string)[] };
  receipts?: { receipt_id: string; predecessor_id: string }[];
  receipts_outcome: { id: string; outcome: { logs: string[]; executor_id: string } }[];
}

export function fromRpc(t: RpcTxStatus, timestampNs: string, block: number): RawTx {
  const pred = new Map((t.receipts ?? []).map((r) => [r.receipt_id, r.predecessor_id]));
  return {
    hash: t.transaction.hash, signer: t.transaction.signer_id,
    realSigner: delegateSender(t.transaction.actions) ?? t.transaction.signer_id,
    timestampNs, block,
    receipts: t.receipts_outcome.map((o) => ({ id: o.id, executor: o.outcome.executor_id, predecessor: pred.get(o.id) ?? null, logs: o.outcome.logs, timestampNs: null, block: null })),
  };
}

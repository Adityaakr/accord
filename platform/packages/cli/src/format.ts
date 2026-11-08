// Plain, monospace-friendly blocks in the shape of INTERFACES.md section 10: a header `accord <command> · <id>`,
// two-space indented labels padded to ten columns, values joined with ` · `.

import { formatNear, formatUnits, shortHash } from "@accord/sdk";
import type {
  ActResult, AgreementView, Check, ExceptionView, ItemView, PreflightResult, Receipt, RecipientVersion, Refusal,
  Signals, Terms, TxResult, VerifyReport,
} from "@accord/sdk";

export const line = (label: string, value: string): string => `  ${label.padEnd(10)}${value}`;

export const header = (command: string, ...parts: (string | undefined)[]): string =>
  ["accord " + command, ...parts.filter((p): p is string => Boolean(p))].join(" · ");

export const usdc = (amount: string | bigint, decimals = 6): string => `${formatUnits(amount, decimals)} USDC`;

export function time(unix: number | null | undefined): string {
  if (unix === null || unix === undefined) return "not set";
  return new Date(unix * 1000).toISOString().replace(".000Z", "Z");
}

/** JSON with bigints as decimal strings. */
export function toJson(value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) => (typeof v === "bigint" ? v.toString() : v), 2);
}

export function txJson(tx: TxResult) {
  return { txHash: tx.txHash, ok: tx.ok, value: tx.value, events: tx.events, failure: tx.failure };
}

/** `tx <hash>` and the Accord events the transaction emitted. */
export function txLines(label: string, tx: TxResult): string[] {
  const out = [line(label, `tx ${tx.txHash}${tx.ok ? "" : ` · failed ${tx.failure ?? ""}`}`)];
  for (const e of tx.events) out.push(line("event", `${e.event}${eventSummary(e.data)}`));
  return out;
}

function eventSummary(data: Record<string, unknown>): string {
  const keys = ["code", "item", "amount", "recipient", "version", "account", "public_key", "seq", "terms_hash"];
  const parts = keys.filter((k) => data[k] !== undefined && data[k] !== null).map((k) => `${k} ${String(data[k])}`);
  return parts.length ? ` · ${parts.join(" · ")}` : "";
}

export function actLines(r: ActResult): string[] {
  const out: string[] = [];
  switch (r.status) {
    case "sent": out.push(line("sent", `payment_sent · tx ${r.txHash ?? "?"}`)); break;
    case "refused": out.push(line("refused", `${r.code ?? "?"} · seq ${r.seq ?? "?"} · tx ${r.txHash ?? "?"}`)); break;
    case "failed": out.push(line("failed", `${(r.reasons ?? []).join("; ")} · tx ${r.txHash ?? "?"}`)); break;
    case "exception_requested": out.push(line("exception", `requested · id ${r.seq ?? "?"} · tx ${r.txHash ?? "?"}`)); break;
    case "preflight_blocked": out.push(line("preflight", `block: ${(r.reasons ?? []).join("; ")} · not signed`)); break;
    case "needs_human": out.push(line("preflight", `warn: ${(r.reasons ?? []).join("; ")} · needs the buyer's approval · not signed`)); break;
  }
  return out;
}

// verify

function checkSuffix(c: Check): string {
  if (c.status === "ok") return "ok";
  if (c.status === "fail") return "FAIL";
  if (c.status === "partial") return "partial";
  return "not checked";
}

/** The `make verify` block. A check that was not run is printed as `not checked`, and one that ran only in part as
 * `partial`, never as `ok`. */
export function formatVerify(r: VerifyReport): string[] {
  const out = [header("verify", r.agreement)];
  for (const c of r.checks) out.push(line(c.name, `${c.detail} · ${checkSuffix(c)}`));
  const tail = [`verify: ${r.ok} checks ok`];
  if (r.partial > 0) tail.push(`${r.partial} partial`);
  if (r.failed > 0) tail.push(`${r.failed} failed`);
  if (r.notChecked > 0) tail.push(`${r.notChecked} not checked`);
  out.push(tail.join(" · "));
  return out;
}

// check (preflight)

const SIGNAL_ORDER: (keyof Signals)[] = [
  "exists", "authorised", "canary", "blocked", "is_contract", "code_changed_30d", "reports", "prior_payments",
  "age_days", "tx_30d",
];

export function formatCheck(account: string, agreement: string, p: PreflightResult): string[] {
  const out = [header("check", account, agreement)];
  out.push(line("rating", p.rating));
  if (p.reasons.length === 0) out.push(line("reason", "none"));
  for (const r of p.reasons) out.push(line("reason", r));
  out.push(line("buyer", p.approvedByBuyer ? "approved this recipient" : "no approval on record"));
  out.push("  signals");
  for (const k of SIGNAL_ORDER) {
    out.push(`    ${k.padEnd(18)}${String(p.signals[k]).padEnd(13)}${p.sources[k]}`);
  }
  out.push(`check: ${p.rating}`);
  return out;
}

// show

export interface ShowData {
  view: AgreementView;
  terms: Terms | null;
  items: ItemView[];
  recipients: RecipientVersion[];
  exceptions: ExceptionView[];
}

function evidenceText(e: ItemView["evidence"]): string {
  return e === "DeliveryAccepted" ? "delivery accepted" : `period ${e.PeriodEligible.period} eligible`;
}

export function formatShow(d: ShowData): string[] {
  const a = d.view;
  const dec = d.terms?.decimals ?? 6;
  const out = [header("show", a.account, a.kind, a.params.mode === "demo" ? "demo timings" : undefined)];
  out.push(line("title", a.title));
  out.push(line("state", `${a.state} · release ${a.release}${a.closing ? " · closing" : ""}${a.canary_tripped ? " · canary tripped" : ""}`));
  out.push(line("buyer", a.buyer));
  out.push(line("vendor", `${a.vendor} · authority ${a.vendor_authority}`));
  out.push(line("token", a.token));
  if (d.terms) {
    out.push(line("terms", `${usdc(d.terms.total, dec)} · ${d.terms.items.length} items · terms ${shortHash(a.terms_hash ?? "")}`));
    out.push(line("approvals", `buyer ${a.approvals.buyer ? "yes" : "no"} · vendor ${a.approvals.vendor ? "yes" : "no"}`));
  } else {
    out.push(line("terms", "none yet"));
  }
  if (a.executing_at !== null) out.push(line("executing", `since ${time(a.executing_at)} · ends ${time(a.ends_at)}`));
  out.push(line("escrow", `funded ${usdc(a.funded, dec)} · paid ${usdc(a.paid, dec)} · reserved ${usdc(a.reserved, dec)} · refunded ${usdc(a.refunded, dec)}`));
  for (const i of d.items) {
    const parts = [usdc(i.amount, dec), i.status, `due ${time(i.due_at)}`, `evidence ${evidenceText(i.evidence)}`];
    if (i.delivery) parts.push(`delivery ${shortHash(i.delivery.evidence_hash)}`);
    if (i.pending_exception !== null) parts.push(`exception ${i.pending_exception} pending`);
    out.push(line(`item ${i.id}`, parts.join(" · ")));
  }
  out.push(line("recipient", a.recipient ? `${a.recipient.account} · ${a.recipient.domain} · version ${a.recipient.version}` : "none active"));
  if (a.pending_recipient) {
    const p = a.pending_recipient;
    out.push(line("pending", `${p.account} · version ${p.version} · ${p.status}${p.active_at ? ` · active at ${time(p.active_at)}` : ""}`));
  }
  out.push(line("agent key", a.agent_key ? `${a.agent_key} · ${a.revoked_keys} revoked` : `none · ${a.revoked_keys} revoked`));
  out.push(line("budget", `balance ${formatNear(a.budget.balance)} NEAR · storage ${formatNear(a.budget.storage_stake)} NEAR · liquid ${formatNear(a.budget.liquid)} NEAR`));
  const pending = d.exceptions.filter((e) => e.status === "pending").length;
  out.push(line("record", `${a.refusals} refusals · ${a.exceptions} exceptions (${pending} pending) · ${a.observation_conflicts} observation conflicts`));
  if (a.in_flight) out.push(line("in flight", `payment ${a.in_flight.payment_id} · item ${a.in_flight.item} · ${usdc(a.in_flight.amount, dec)} → ${a.in_flight.recipient}`));
  return out;
}

export function formatRefusals(agreement: string, list: Refusal[]): string[] {
  const out = [header("refusals", agreement)];
  for (const r of list) {
    out.push(line(`seq ${r.seq}`, `${r.code} · item ${r.item} · ${usdc(r.amount)} → ${r.recipient} · via ${r.via} · block ${r.block}`));
  }
  out.push(`refusals: ${list.length}`);
  return out;
}

export function formatReceipts(agreement: string, list: Receipt[]): string[] {
  const out = [header("receipts", agreement)];
  for (const r of list) {
    out.push(line(`payment ${r.payment_id}`, `item ${r.item} · ${usdc(r.amount)} → ${r.recipient} · via ${r.via} · block ${r.block}`));
  }
  const total = list.reduce((s, r) => s + BigInt(r.amount), 0n);
  out.push(`receipts: ${list.length} · ${usdc(total)}`);
  return out;
}

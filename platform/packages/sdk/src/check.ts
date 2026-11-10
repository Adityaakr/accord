// Check a payment before signing it: would this agreement's `act(Pay)` accept or refuse it, and at which gate. A
// read-only simulation: the agreement's own views at one block, run through accord-core's `check_pay` (the function
// the contract calls) compiled to wasm (crates/accord-check, scripts/build-check-wasm.sh). No transaction is sent;
// the contract decides at the time of the real call.
//
// Kept out of the package's main entry (`@accord/sdk/check`), so browser bundles that import the SDK do not carry the
// wasm.

import type { Accord } from "./accord.js";
import { PRE_YOCTO_CODE_HASHES } from "./accord.js";
import { Chain } from "./chain.js";
import { CHECK_WASM_BASE64, CHECK_WASM_SHA256 } from "./check-wasm.js";
import { formatUnits } from "./format.js";
import { NOT_AN_AGREEMENT, NotAnAgreementError, knownFactories } from "./verify.js";

/** Which `act` an agreement's code runs, by code hash. A hash not listed here is not simulated. */
export const ACT_RULES: Record<string, "release3" | "release4"> = {
  // releases 1 to 3: the recipient is taken as given
  ...Object.fromEntries(PRE_YOCTO_CODE_HASHES.map((h) => [h, "release3" as const])),
  // releases 4 and 5 (DECISIONS.md 26, 33): a malformed recipient panics before the gates; canaries match in any case
  ECgsrZwyoZvoHDjawYhRnFbxoWtt6Sx9iaPsEzqwTTGz: "release4",
};

export { CHECK_WASM_SHA256 };

export type GateName = "key_and_state" | "recipient" | "item" | "evidence" | "amount" | "lock";

/** What the wasm returns (crates/accord-check `Answer`). */
export interface RawAnswer {
  verdict: "pay" | "refuse" | "panic";
  code: string | null;
  gates: { gate: number; name: GateName; status: "pass" | "fail" | "not_evaluated"; code: string | null }[];
  facts: {
    state: string; kind: string; agent_key: boolean; canary: boolean; approved_recipient: string | null;
    recipient_checked: string; item_found: boolean; item_status: string | null; window_end: number | null;
    period: number | null; period_outcome: string | null; exception: boolean; exception_waives_evidence: boolean;
    due_amount: string | null; entered_amount: string; total: string; paid: string; available: string;
    in_flight: boolean; now: number;
  };
}

export interface PaymentRequest {
  item: number;
  /** Token base units, as `act` takes them. */
  amount: string;
  recipient: string;
}

export interface GateCheck {
  gate: number;
  name: GateName;
  label: string;
  /** null: not evaluated (an earlier gate found no payable item, or `act` stops before the gates). */
  pass: boolean | null;
  code: string | null;
  detail: string;
}

export interface PaymentCheck {
  agreement: string;
  /** `refuse` also covers a call `act` rejects before the gates (`panics`), which records nothing. */
  verdict: "pay" | "refuse";
  code: string | null;
  /** True when `act` would panic before any gate (malformed recipient): no refusal is recorded. */
  panics: boolean;
  /** One plain line: what the contract would do. */
  summary: string;
  gates: GateCheck[];
  approved: { recipient: string | null; amount: string | null; token: string };
  entered: { item: number; recipient: string; amount: string };
  token: { id: string; symbol: string; decimals: number };
  checked_at_block: number;
  /** The block's time, seconds (the contract's `now()`). */
  checked_at: number;
  state: string;
  kind: string;
  release: number;
  rules: "release3" | "release4";
  /** Set when the answer changes with time alone: when, and how. */
  time_dependent: { at: number; detail: string } | null;
  not_checked: string[];
  note: string;
  engine: { source: string; wasm_sha256: string };
}

export const CHECK_NOTE =
  "A read-only simulation of the contract's rules from chain state at this block. No transaction is sent. The contract decides at the time of the real call.";

const NOT_CHECKED = [
  "Which key signs: the check assumes the agreement's current agent key. Any other key cannot call act at all (ERR_UNAUTHORIZED).",
  "Gas and the agent key's allowance.",
  "Anything that changes between this block and the real call: a delivery, a dispute, a payment, a revoke, a new recipient.",
];

const LABELS: Record<GateName, string> = {
  key_and_state: "Key and state", recipient: "Recipient", item: "Item", evidence: "Evidence", amount: "Amount", lock: "Lock",
};

let compiled: Promise<WebAssembly.Module> | null = null;

function wasmBytes(): Uint8Array {
  const bin = atob(CHECK_WASM_BASE64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Runs crates/accord-check's `check` over one input. A fresh instance per call: the module leaks its buffers. */
export async function runCheckWasm(input: object): Promise<RawAnswer> {
  compiled ??= WebAssembly.compile(wasmBytes() as BufferSource);
  const inst = await WebAssembly.instantiate(await compiled, {});
  const { memory, alloc, check } = inst.exports as {
    memory: WebAssembly.Memory; alloc: (n: number) => number; check: (p: number, n: number) => bigint;
  };
  const bytes = new TextEncoder().encode(JSON.stringify(input));
  const p = alloc(bytes.length);
  new Uint8Array(memory.buffer, p, bytes.length).set(bytes);
  const r = check(p, bytes.length);
  const outPtr = Number(r >> 32n);
  const outLen = Number(r & 0xffffffffn);
  const out = JSON.parse(new TextDecoder().decode(new Uint8Array(memory.buffer, outPtr, outLen))) as RawAnswer | { error: string };
  if ("error" in out) throw new Error(`check: ${out.error}`);
  return out;
}

export interface SimulateInput {
  agreement: string;
  /** `get_agreement` at the block. */
  view: Record<string, unknown>;
  /** `get_items` at the block. */
  items: unknown[];
  codeHash: string;
  token: { id: string; symbol: string; decimals: number };
  block: number;
  request: PaymentRequest;
}

export class UnsupportedCodeError extends Error {
  constructor(readonly codeHash: string) {
    super(`the agreement runs code ${codeHash.slice(0, 8)}…, which this check does not know; it is not simulated`);
    this.name = "UnsupportedCodeError";
  }
}

/** The check over views already read: pure apart from the wasm. */
export async function simulatePayment(s: SimulateInput): Promise<PaymentCheck> {
  const rules = ACT_RULES[s.codeHash];
  if (!rules) throw new UnsupportedCodeError(s.codeHash);
  const raw = await runCheckWasm({ agreement: s.view, items: s.items, rules, request: s.request });
  return describe(s, rules, raw);
}

function describe(s: SimulateInput, rules: "release3" | "release4", raw: RawAnswer): PaymentCheck {
  const f = raw.facts;
  const fmt = (v: string | null) => (v === null ? "none" : `${exactUnits(v, s.token.decimals)} ${s.token.symbol}`);
  const when = (t: number) => new Date(t * 1000).toISOString().replace(".000Z", "Z");
  const item = `Item ${s.request.item}`;
  const to = f.recipient_checked || s.request.recipient;

  const detail = (name: GateName, status: "pass" | "fail" | "not_evaluated", code: string | null): string => {
    if (raw.verdict === "panic") return "Not reached: act stops before the gates.";
    if (status === "not_evaluated") return `Not evaluated: ${item.toLowerCase()} is not payable (see Item).`;
    switch (name) {
      case "key_and_state":
        if (code === "ERR_REVOKED") {
          const state = f.state === "Executing" ? "" : ` The agreement is also ${f.state}, not Executing.`;
          return `No agent key is installed: a recently revoked key is refused here, and any other key cannot call act at all.${state}`;
        }
        if (code === "ERR_NOT_EXECUTING") return `The agreement is ${f.state}, not Executing: act pays nothing in this state.`;
        return "The agreement is Executing and has a current agent key.";
      case "recipient":
        if (code === "ERR_CANARY") return `${to} is one of the agreement's canary accounts: the contract refuses and deletes the agent's key.`;
        if (code === "ERR_NO_RECIPIENT") return "The agreement has no active authorised recipient yet.";
        if (code === "ERR_PAYEE_MISMATCH") return `${to} is not the authorised recipient (${f.approved_recipient}).`;
        return `${to} is the active authorised recipient.`;
      case "item":
        if (code === "ERR_UNKNOWN_ITEM") return `The agreement has no item ${s.request.item}.`;
        if (code === "ERR_ALREADY_PAID") {
          return f.item_status === "Reserved"
            ? `${item} is reserved for the vendor's claim; only the claim can pay it.`
            : `${item} is ${f.item_status}: it cannot be paid again.`;
        }
        return `${item} exists and is unpaid (${f.item_status}).`;
      case "evidence":
        if (code === "ERR_PERIOD_WITHHELD") return `Period ${f.period} closed ${f.period_outcome}: its retainer is not paid.`;
        if (code === "ERR_NOT_DUE") {
          if (f.kind === "market-making") return `Period ${f.period} has not closed Eligible yet (${f.period_outcome ?? "not started"}).`;
          if (f.item_status === "Disputed") return `${item}'s delivery is disputed: it pays only once the dispute is resolved or an exception is approved.`;
          if (f.item_status === "Delivered" && f.window_end !== null) return `${item} is delivered; its acceptance window ends ${when(f.window_end)}. Until then it pays only if the buyer accepts it.`;
          return `${item} has no accepted delivery yet.`;
        }
        if (f.exception_waives_evidence) return `An approved exception waives the evidence for ${item.toLowerCase()}.`;
        if (f.kind === "market-making") return `Period ${f.period} closed ${f.period_outcome}.`;
        if (f.item_status === "Reserved") return `${item} is reserved for the vendor's claim.`;
        return f.window_end !== null && f.now >= f.window_end
          ? `${item}'s delivery is accepted (or its window lapsed with no dispute).`
          : `${item}'s delivery is accepted.`;
      case "amount":
        if (code === "ERR_AMOUNT_MISMATCH") return `${fmt(f.entered_amount)} differs from the approved ${fmt(f.due_amount)}${f.exception ? " (an approved exception)" : ""}.`;
        if (code === "ERR_CAP_EXCEEDED") return `Paying ${fmt(f.entered_amount)} would take the total paid past ${fmt(f.total)} (${fmt(f.paid)} paid).`;
        if (code === "ERR_INSUFFICIENT_FUNDS") return `The escrow has ${fmt(f.available)} to spend; ${fmt(f.entered_amount)} does not fit.`;
        return `${fmt(f.entered_amount)} equals the approved amount, stays within the total and the escrow covers it.`;
      case "lock":
        if (code === "ERR_IN_FLIGHT") return "A payment is in flight or the agreement is closing: act refuses until it resolves.";
        return "No payment is in flight.";
    }
  };

  const gates: GateCheck[] = raw.gates.map((g) => ({
    gate: g.gate, name: g.name, label: LABELS[g.name],
    pass: g.status === "not_evaluated" ? null : g.status === "pass",
    code: g.code, detail: detail(g.name, g.status, g.code),
  }));

  const decisive = gates.find((g) => g.pass === false);
  const summary = raw.verdict === "pay"
    ? `Would be paid: ${fmt(f.entered_amount)} to ${to} for ${item.toLowerCase()}.`
    : raw.verdict === "panic"
      ? `Would be refused: ${JSON.stringify(s.request.recipient.slice(0, 80))} is not a NEAR account id, so act rejects the call before any gate and records nothing.`
      : `Would be refused at gate ${decisive?.gate} (${decisive?.label.toLowerCase()}): ${decisive?.detail ?? raw.code}`;

  // Time alone turns a delivered item eligible when its window ends with no dispute.
  const pending = f.kind === "procurement" && f.item_status === "Delivered" && f.window_end !== null && f.window_end > f.now;
  const time_dependent = pending
    ? { at: f.window_end!, detail: `From ${when(f.window_end!)} ${item.toLowerCase()} counts as accepted unless it is disputed first, and the evidence gate passes.` }
    : null;

  return {
    agreement: s.agreement,
    verdict: raw.verdict === "pay" ? "pay" : "refuse",
    code: raw.code,
    panics: raw.verdict === "panic",
    summary,
    gates,
    approved: { recipient: f.approved_recipient, amount: f.due_amount, token: s.token.id },
    entered: { item: s.request.item, recipient: s.request.recipient, amount: s.request.amount },
    token: s.token,
    checked_at_block: s.block,
    checked_at: f.now,
    state: f.state,
    kind: f.kind,
    release: Number((s.view as { release?: number }).release ?? 0),
    rules,
    time_dependent,
    not_checked: NOT_CHECKED,
    note: CHECK_NOTE,
    engine: { source: "accord-core gates::check_pay, built to wasm (crates/accord-check)", wasm_sha256: CHECK_WASM_SHA256 },
  };
}

/** Base units in whole tokens with every significant decimal, at least two: `12000001` → `12.000001`, `12000000` → `12.00`. */
export function exactUnits(amount: string, decimals: number): string {
  const frac = (BigInt(amount) % 10n ** BigInt(decimals)).toString().padStart(decimals, "0").replace(/0+$/, "");
  return formatUnits(amount, decimals, Math.min(decimals, Math.max(2, frac.length)));
}

export class BlockUnavailableError extends Error {
  constructor(readonly block: number) {
    super(`block ${block} is not available on this RPC (garbage collected; an archival RPC serves it)`);
    this.name = "BlockUnavailableError";
  }
}

export interface CheckOptions {
  /** A past block to check at (the views as they were then). Omitted: the latest final block. */
  block?: number;
  /** An archival RPC for a block the regular RPC has garbage collected. */
  archivalRpc?: string;
  /** Factories accepted besides the client's own and the network's known ones. */
  factories?: string[];
}

const GC = /garbage.?collected|GARBAGE_COLLECTED|UNKNOWN_BLOCK/i;

/** Token metadata never changes for a token account: one read per process. */
const tokens = new Map<string, Promise<{ symbol: string; decimals: number }>>();

export function tokenMeta(chain: Chain, token: string): Promise<{ symbol: string; decimals: number }> {
  let meta = tokens.get(token);
  if (!meta) {
    meta = chain.view<{ symbol: string; decimals: number }>(token, "ft_metadata").then((m) => ({ symbol: m.symbol, decimals: m.decimals }));
    tokens.set(token, meta);
    meta.catch(() => tokens.delete(token));
  }
  return meta;
}

/** A request that cannot be checked as given (an amount the token cannot express). */
export class BadCheckInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadCheckInputError";
  }
}

/** What a check request may leave out: the amount and the recipient default to the approved ones. */
export interface CheckInput {
  item: number;
  /** Base units (digits only) or whole tokens with a decimal point; omitted: the item's approved amount. */
  amount?: string;
  /** Omitted: the agreement's active authorised recipient. */
  recipient?: string;
}

/** Reads the agreement's views at one block and checks the payment against them. */
export async function checkPayment(accord: Accord, agreement: string, input: CheckInput, opts: CheckOptions = {}): Promise<PaymentCheck & { defaulted: ("amount" | "recipient")[] }> {
  const factory = agreement.slice(agreement.indexOf(".") + 1);
  if (!knownFactories(accord, opts.factories).includes(factory)) throw new NotAnAgreementError(agreement);
  const chain = accord.chain;
  const block = opts.block ?? (await chain.block("final")).header.height;
  const archival = opts.archivalRpc ? new Chain(opts.archivalRpc) : null;
  const at = async <T>(method: string): Promise<T> => {
    try {
      return await chain.view<T>(agreement, method, {}, block);
    } catch (e) {
      const msg = (e as Error).message ?? "";
      if (NOT_AN_AGREEMENT.test(msg)) throw new NotAnAgreementError(agreement);
      if (!GC.test(msg) && !GC.test(JSON.stringify(e))) throw e;
      if (!archival) throw new BlockUnavailableError(block);
      return archival.view<T>(agreement, method, {}, block);
    }
  };
  const [view, items] = await Promise.all([at<Record<string, unknown>>("get_agreement"), at<{ id: number; due_amount?: string }[]>("get_items")]);
  if (view.account !== agreement || view.factory !== factory) throw new NotAnAgreementError(agreement);
  const registered = await chain.view<boolean>(factory, "is_agreement", { account: agreement }).catch(() => false);
  if (!registered) throw new NotAnAgreementError(agreement);
  // The code cannot change: an agreement account has no deploy method and no full-access key.
  const acct = await chain.account(agreement);
  const tokenId = String(view.token);
  const m = await tokenMeta(chain, tokenId);
  const defaulted: ("amount" | "recipient")[] = [];
  let amount: string;
  if (input.amount === undefined || input.amount === "") {
    defaulted.push("amount");
    amount = items.find((i) => i.id === input.item)?.due_amount ?? "0";
  } else {
    const p = parseCheckAmount(input.amount, m.decimals);
    if ("error" in p) throw new BadCheckInputError(p.error);
    amount = p.amount;
  }
  let recipient = input.recipient;
  if (recipient === undefined || recipient === "") {
    defaulted.push("recipient");
    recipient = (view.recipient as { account?: string } | null)?.account ?? "";
    if (!recipient) throw new BadCheckInputError("the agreement has no active recipient to default to; name the recipient to check");
  }
  const r = await simulatePayment({
    agreement, view, items, codeHash: acct.global_contract_hash ?? acct.code_hash,
    token: { id: tokenId, symbol: m.symbol, decimals: m.decimals }, block, request: { item: input.item, amount, recipient },
  });
  return { ...r, defaulted };
}

/** What a form needs to build a request: the items with their approved amounts, and the active recipient. */
export interface CheckForm {
  agreement: string;
  title: string;
  state: string;
  kind: string;
  token: { id: string; symbol: string; decimals: number };
  recipient: string | null;
  items: { id: number; amount: string; status: string }[];
  block: number;
}

export async function checkForm(accord: Accord, agreement: string, opts: { factories?: string[] } = {}): Promise<CheckForm> {
  const factory = agreement.slice(agreement.indexOf(".") + 1);
  if (!knownFactories(accord, opts.factories).includes(factory)) throw new NotAnAgreementError(agreement);
  const chain = accord.chain;
  const block = (await chain.block("final")).header.height;
  const get = <T>(method: string) => chain.view<T>(agreement, method, {}, block).catch((e: Error) => {
    if (NOT_AN_AGREEMENT.test(e.message ?? "")) throw new NotAnAgreementError(agreement);
    throw e;
  });
  const [view, items] = await Promise.all([
    get<Record<string, unknown>>("get_agreement"),
    get<{ id: number; due_amount: string; status: string }[]>("get_items"),
  ]);
  if (view.account !== agreement || view.factory !== factory) throw new NotAnAgreementError(agreement);
  const tokenId = String(view.token);
  const m = await tokenMeta(chain, tokenId);
  return {
    agreement, title: String(view.title ?? ""), state: String(view.state), kind: String(view.kind),
    token: { id: tokenId, ...m },
    recipient: (view.recipient as { account?: string } | null)?.account ?? null,
    items: items.map((i) => ({ id: i.id, amount: i.due_amount, status: i.status })),
    block,
  };
}

/**
 * An amount as a person or an agent types it: digits only are token base units (as `act` takes them); a value with a
 * decimal point is whole tokens, with at most the token's decimals. Returns base units, or an error.
 */
export function parseCheckAmount(text: string, decimals: number): { amount: string } | { error: string } {
  const t = text.trim();
  if (/^\d{1,39}$/.test(t)) return { amount: BigInt(t).toString() };
  const m = t.match(/^(\d{1,30})\.(\d+)$/);
  if (!m) return { error: "amount must be base units (digits only, e.g. 12000000) or a decimal in whole tokens (e.g. 12.00)" };
  if (m[2]!.length > decimals) return { error: `amount has more than the token's ${decimals} decimals` };
  return { amount: (BigInt(m[1]!) * 10n ** BigInt(decimals) + BigInt(m[2]!.padEnd(decimals, "0"))).toString() };
}

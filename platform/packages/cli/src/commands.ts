// Command handlers. Each takes a `Ctx` with injected dependencies (an Accord-like factory client, agreement
// clients, preflight, verify, files) and writes one block of text or one JSON value, so tests run with fakes.

import { NotAnAgreementError, guardedPay, sha256Hex, type AgreementClient, type CreateArgs, type Kind, type Mandate, type Params,
  type PreflightResult, type TxResult, type VerifyReport } from "@accord/sdk";
import { flagBool, flagInt, flagString, requireFlag, toInt, type ParsedArgs } from "./args.js";
import { DEFAULT_ALLOWANCE, parseAmount, parseNear } from "./amount.js";
import type { Env, Role } from "./env.js";
import {
  actLines, formatCheck, formatReceipts, formatRefusals, formatShow, formatVerify, header, line, time, txJson,
  txLines, usdc,
} from "./format.js";

/** The agreement methods the CLI uses: the SDK's own `AgreementClient` satisfies it. */
export type AgreementApi = Pick<AgreementClient,
  | "id" | "get" | "terms" | "items" | "refusals" | "recipients" | "exceptions" | "receipts" | "commitments"
  | "sealMandate" | "startNegotiation" | "approveTerms" | "cancel" | "fund" | "proposeRecipient" | "approveRecipient"
  | "acceptRecipient" | "activateRecipient" | "cancelRecipientChange" | "installAgentKey" | "revokeAgent"
  | "submitDelivery" | "acceptDelivery" | "disputeDelivery" | "requestException" | "approveException"
  | "rejectException" | "resolvePeriod" | "closePeriod" | "claim" | "close" | "mutualClose" | "withdrawNear" | "pay"
  | "agentRequestException">;

export interface Deps {
  /** The account that signs, when `--as` was given (public information only). */
  signer?: { role: Role | "recipient"; accountId: string; publicKey: string };
  agreement(id: string): AgreementApi;
  createAgreement(args: CreateArgs): Promise<{ agreement: string; tx: TxResult }>;
  preflight(agreement: string, recipient: string): Promise<PreflightResult>;
  verify(agreement: string): Promise<VerifyReport>;
  /** The signer's document key against the other party's sealed mandate. */
  sealedCheck(agreement: string, other: "buyer" | "vendor"): Promise<"ERR_SEALED" | "READABLE">;
  ftBalance(token: string, account: string): Promise<string>;
  ftTransfer(token: string, receiver: string, amount: string, memo: string): Promise<TxResult>;
  generateKeyPair(): { publicKey: string; secretKey: string };
  writeSecretFile(path: string, content: string): Promise<void>;
  readText(path: string): Promise<string>;
  sleep(ms: number): Promise<void>;
}

export interface Output {
  /** One result: `lines` in text mode, `json` with `--json`. */
  block(lines: string[], json: unknown): void;
  /** A notice on stderr (text mode only). */
  warn(text: string): void;
  /** A one-line failure: `text` on stderr, or `json` on stdout with `--json`. */
  fail(text: string, json: unknown): void;
}

export interface Ctx {
  deps: Deps;
  args: ParsedArgs;
  /** Positionals after the command words. */
  rest: string[];
  env: Env;
  out: Output;
  role?: Role;
}

export type Handler = (ctx: Ctx) => Promise<number | void>;

// helpers

export function agreementId(ctx: Ctx): string {
  const flag = flagString(ctx.args, "agreement");
  if (ctx.role === "agent") {
    const own = ctx.env.AGENT_AGREEMENT;
    if (flag && own && flag !== own) throw new Error(`the agent key signs only for AGENT_AGREEMENT (${own}), not ${flag}`);
    if (flag ?? own) return (flag ?? own)!;
  }
  if (flag) return flag;
  throw new Error("missing --agreement <account>");
}

function needRole(ctx: Ctx, ...roles: Role[]): Role {
  if (!ctx.role) throw new Error(`this command signs: pass --as ${roles.join("|")}`);
  if (roles.length && !roles.includes(ctx.role)) throw new Error(`this command signs as ${roles.join(" or ")}, not ${ctx.role}`);
  return ctx.role;
}

function pos(ctx: Ctx, i: number, what: string): string {
  const v = ctx.rest[i];
  if (v === undefined) throw new Error(`missing <${what}>`);
  return v;
}

function posInt(ctx: Ctx, i: number, what: string): number {
  return toInt(pos(ctx, i, what), `<${what}>`);
}

function amountArg(ctx: Ctx, i: number): string {
  return parseAmount(pos(ctx, i, "amount"), { raw: flagBool(ctx.args, "raw") });
}

async function txBlock(ctx: Ctx, command: string, id: string, label: string, run: Promise<TxResult>, extra: string[] = []) {
  const tx = await run;
  ctx.out.block([header(command, id), ...extra, ...txLines(label, tx)], { command, agreement: id, ...txJson(tx) });
  return tx.ok ? 0 : 1;
}

// defaults for `create`

export { DEMO_PARAMS, LIVE_PARAMS } from "@accord/sdk";
import { DEMO_PARAMS, LIVE_PARAMS } from "@accord/sdk";

// commands

const create: Handler = async (ctx) => {
  needRole(ctx, "buyer");
  const kind = (flagString(ctx.args, "kind") ?? "procurement") as Kind;
  if (kind !== "procurement" && kind !== "market-making") throw new Error("--kind is procurement or market-making");
  const mode = flagString(ctx.args, "mode") ?? (ctx.env.DEMO_TIMINGS === "on" ? "demo" : "live");
  if (mode !== "demo" && mode !== "live") throw new Error("--mode is demo or live");
  const paramsFile = flagString(ctx.args, "params");
  const params: Params = paramsFile
    ? (JSON.parse(await ctx.deps.readText(paramsFile)) as Params)
    : mode === "demo" ? DEMO_PARAMS : LIVE_PARAMS;
  const canaries = (flagString(ctx.args, "canaries") ?? ctx.env.CANARY_ACCOUNTS ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const args: CreateArgs = {
    kind,
    title: requireFlag(ctx.args, "title"),
    vendor: flagString(ctx.args, "vendor") ?? ctx.env.VENDOR_ACCOUNT ?? requireFlag(ctx.args, "vendor"),
    vendor_authority: flagString(ctx.args, "authority") ?? ctx.env.AUTHORITY_ACCOUNT ?? requireFlag(ctx.args, "authority"),
    canaries,
    params,
  };
  const { agreement, tx } = await ctx.deps.createAgreement(args);
  ctx.out.block([
    header("create", agreement, params.mode === "demo" ? "demo timings" : undefined),
    line("created", `${agreement} · ${kind} · ${args.title}`),
    line("parties", `vendor ${args.vendor} · authority ${args.vendor_authority} · ${canaries.length} canaries`),
    ...txLines("tx", tx),
  ], { command: "create", agreement, args, ...txJson(tx) });
};

function isMandate(v: unknown): v is Mandate {
  if (typeof v !== "object" || v === null) return false;
  const m = v as Record<string, unknown>;
  return (m.kind === "procurement" || m.kind === "market-making") && (m.role === "buyer" || m.role === "vendor")
    && typeof m.shared === "object" && typeof m.limits === "object" && typeof m.instructions === "string";
}

const seal: Handler = async (ctx) => {
  const role = needRole(ctx, "buyer", "vendor") as "buyer" | "vendor";
  const id = agreementId(ctx);
  const parsed: unknown = JSON.parse(await ctx.deps.readText(requireFlag(ctx.args, "mandate")));
  if (!isMandate(parsed)) throw new Error("the mandate file is not a mandate (kind, role, shared, limits, instructions)");
  if (parsed.role !== role) throw new Error(`the mandate is for the ${parsed.role}; you are signing as the ${role}`);
  const r = await ctx.deps.agreement(id).sealMandate(parsed, { role });
  // The mandate's contents are never printed: only its commitment.
  ctx.out.block([
    header("seal", id),
    line(role, `commitment ${r.commitment.slice(0, 8)}… · tx ${r.txHash}`),
  ], { command: "seal", agreement: id, role, commitment: r.commitment, txHash: r.txHash });
};

const negotiate: Handler = async (ctx) => {
  needRole(ctx);
  const id = agreementId(ctx);
  return txBlock(ctx, "negotiate", id, "requested", ctx.deps.agreement(id).startNegotiation());
};

const approve: Handler = async (ctx) => {
  const role = needRole(ctx, "buyer", "vendor");
  const id = agreementId(ctx);
  const deal = ctx.deps.agreement(id);
  const hash = flagString(ctx.args, "terms") ?? (await deal.get()).terms_hash;
  if (!hash) throw new Error("no terms to approve yet (pass --terms <hash> to name them)");
  return txBlock(ctx, "approve", id, "approved", deal.approveTerms(hash), [line(role, `terms ${hash.slice(0, 8)}…`)]);
};

const fund: Handler = async (ctx) => {
  needRole(ctx, "buyer");
  const id = agreementId(ctx);
  const amount = amountArg(ctx, 0);
  return txBlock(ctx, "fund", id, "funded", ctx.deps.agreement(id).fund(amount), [line("amount", usdc(amount))]);
};

const recipient: Handler = async (ctx) => {
  const sub = pos(ctx, 0, "propose|approve|accept|activate|cancel");
  const id = agreementId(ctx);
  const deal = ctx.deps.agreement(id);
  const cmd = `recipient ${sub}`;
  switch (sub) {
    case "propose": {
      needRole(ctx, "vendor");
      const account = pos(ctx, 1, "account");
      const domain = requireFlag(ctx.args, "domain");
      return txBlock(ctx, cmd, id, "proposed", deal.proposeRecipient(account, domain), [line("recipient", `${account} · ${domain}`)]);
    }
    case "approve":
      needRole(ctx, "authority");
      return txBlock(ctx, cmd, id, "approved", deal.approveRecipient(posInt(ctx, 1, "version")));
    case "accept":
      needRole(ctx, "buyer");
      return txBlock(ctx, cmd, id, "accepted",
        deal.acceptRecipient(posInt(ctx, 1, "version"), { acknowledgeWarnings: flagBool(ctx.args, "acknowledge-warnings") }));
    case "activate":
      needRole(ctx);
      return txBlock(ctx, cmd, id, "activated", deal.activateRecipient(posInt(ctx, 1, "version")));
    case "cancel":
      needRole(ctx, "buyer", "authority");
      return txBlock(ctx, cmd, id, "cancelled", deal.cancelRecipientChange(posInt(ctx, 1, "version")));
    default:
      throw new Error(`unknown: recipient ${sub}`);
  }
};

const deliver: Handler = async (ctx) => {
  needRole(ctx, "vendor");
  const id = agreementId(ctx);
  const item = posInt(ctx, 0, "item");
  const file = flagString(ctx.args, "file");
  const evidence = file ? sha256Hex(await ctx.deps.readText(file)) : requireFlag(ctx.args, "evidence");
  if (!/^[0-9a-f]{64}$/.test(evidence)) throw new Error("--evidence must be 64 lowercase hex (sha256)");
  const uri = requireFlag(ctx.args, "uri");
  return txBlock(ctx, "deliver", id, "submitted", ctx.deps.agreement(id).submitDelivery(item, evidence, uri),
    [line(`item ${item}`, `evidence ${evidence.slice(0, 8)}… · ${uri}`)]);
};

const accept: Handler = async (ctx) => {
  needRole(ctx, "buyer");
  const id = agreementId(ctx);
  const item = posInt(ctx, 0, "item");
  return txBlock(ctx, "accept", id, "accepted", ctx.deps.agreement(id).acceptDelivery(item), [line(`item ${item}`, "delivery accepted")]);
};

const dispute: Handler = async (ctx) => {
  needRole(ctx, "buyer");
  const id = agreementId(ctx);
  const item = posInt(ctx, 0, "item");
  const reason = requireFlag(ctx.args, "reason");
  return txBlock(ctx, "dispute", id, "disputed", ctx.deps.agreement(id).disputeDelivery(item, reason), [line(`item ${item}`, reason)]);
};

const agent: Handler = async (ctx) => {
  const sub = pos(ctx, 0, "install|revoke");
  needRole(ctx, "buyer");
  const id = agreementId(ctx);
  const deal = ctx.deps.agreement(id);
  if (sub === "revoke") return txBlock(ctx, "agent revoke", id, "revoked", deal.revokeAgent());
  if (sub !== "install") throw new Error(`unknown: agent ${sub}`);
  const allowanceText = flagString(ctx.args, "allowance");
  const allowance = allowanceText === undefined ? DEFAULT_ALLOWANCE
    : flagBool(ctx.args, "raw") ? parseAmount(allowanceText, { raw: true }) : parseNear(allowanceText);
  const kp = ctx.deps.generateKeyPair();
  const outPath = flagString(ctx.args, "out");
  // The secret goes to the file before the key is installed, so a failed write never leaves an unusable key.
  if (outPath) await ctx.deps.writeSecretFile(outPath, `${kp.secretKey}\n`);
  else ctx.out.warn("warning: no --out <file> given; the new key's secret is not saved anywhere and cannot be shown again");
  const tx = await deal.installAgentKey(kp.publicKey, allowance);
  ctx.out.block([
    header("agent install", id),
    line("key", `${kp.publicKey} · FunctionCall · receiver ${id} · methods [act] · allowance ${allowanceNear(allowance)} NEAR`),
    line("secret", outPath ? `written to ${outPath} (mode 0600)` : "not saved"),
    ...txLines("installed", tx),
  ], { command: "agent install", agreement: id, publicKey: kp.publicKey, allowance, secretFile: outPath ?? null, ...txJson(tx) });
  return tx.ok ? 0 : 1;
};

function allowanceNear(yocto: string): string {
  const v = BigInt(yocto);
  const whole = v / 10n ** 24n;
  const frac = (v % 10n ** 24n).toString().padStart(24, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

const pay: Handler = async (ctx) => {
  needRole(ctx, "agent");
  const id = agreementId(ctx);
  const item = posInt(ctx, 0, "item");
  const amount = amountArg(ctx, 1);
  const to = requireFlag(ctx.args, "to");
  const memo = flagString(ctx.args, "memo");
  const pf = flagString(ctx.args, "preflight") ?? "on";
  if (pf !== "on" && pf !== "off") throw new Error("--preflight is on or off");
  const deal = ctx.deps.agreement(id);
  const r = await guardedPay(
    { preflight: (a, rcpt) => ctx.deps.preflight(a, rcpt), pay: (_a, p) => deal.pay(p) },
    id, { item, amount, recipient: to, memo }, { preflight: pf },
  );
  const lines = [header("pay", id, ctx.deps.signer ? `agent key ${ctx.deps.signer.publicKey}` : undefined),
    line("request", `item ${item} · ${usdc(amount)} → ${to}`)];
  if (r.preflight) lines.push(line("preflight", `${r.preflight.rating}${r.preflight.reasons.length ? `: ${r.preflight.reasons.join("; ")}` : ""}`));
  else lines.push(line("preflight", "off for this run"));
  if (r.status === "preflight_blocked") lines.push(line("signed", "no · preflight block refuses to sign"));
  else if (r.status === "needs_human") lines.push(line("signed", "no · needs_human: waiting for the buyer's approval in the app"));
  else lines.push(...actLines(r));
  ctx.out.block(lines, { command: "pay", agreement: id, item, amount, recipient: to, ...r });
  return r.status === "sent" ? 0 : 1;
};

const exception: Handler = async (ctx) => {
  const sub = pos(ctx, 0, "request|approve|reject");
  const id = agreementId(ctx);
  const deal = ctx.deps.agreement(id);
  if (sub === "approve" || sub === "reject") {
    needRole(ctx, "buyer");
    const ex = posInt(ctx, 1, "id");
    return txBlock(ctx, `exception ${sub}`, id, sub === "approve" ? "approved" : "rejected",
      sub === "approve" ? deal.approveException(ex) : deal.rejectException(ex));
  }
  if (sub !== "request") throw new Error(`unknown: exception ${sub}`);
  const role = needRole(ctx, "agent", "vendor");
  const e = {
    item: posInt(ctx, 1, "item"),
    amount: amountArg(ctx, 2),
    waiveEvidence: flagBool(ctx.args, "waive-evidence"),
    reason: requireFlag(ctx.args, "reason"),
  };
  const head = [header("exception request", id), line(`item ${e.item}`, `${usdc(e.amount)}${e.waiveEvidence ? " · waive evidence" : ""} · ${e.reason}`)];
  if (role === "vendor") return txBlock(ctx, "exception request", id, "requested", deal.requestException(e), head.slice(1));
  const r = await deal.agentRequestException(e);
  ctx.out.block([...head, ...actLines(r)], { command: "exception request", agreement: id, ...e, ...r });
  return r.status === "exception_requested" ? 0 : 1;
};

const period: Handler = async (ctx) => {
  const sub = pos(ctx, 0, "resolve|close");
  const id = agreementId(ctx);
  const n = posInt(ctx, 1, "period");
  const deal = ctx.deps.agreement(id);
  if (sub === "close") {
    needRole(ctx);
    return txBlock(ctx, "period close", id, "closed", deal.closePeriod(n), [line(`period ${n}`, "close")]);
  }
  if (sub !== "resolve") throw new Error(`unknown: period ${sub}`);
  needRole(ctx, "buyer");
  const payFlag = flagBool(ctx.args, "pay");
  const closeFlag = flagBool(ctx.args, "close");
  if (payFlag === closeFlag) throw new Error("pass exactly one of --pay or --close");
  return txBlock(ctx, "period resolve", id, "resolved", deal.resolvePeriod(n, payFlag), [line(`period ${n}`, payFlag ? "pay" : "close")]);
};

const claim: Handler = async (ctx) => {
  needRole(ctx, "vendor");
  const id = agreementId(ctx);
  const item = posInt(ctx, 0, "item");
  const r = await ctx.deps.agreement(id).claim(item);
  ctx.out.block([header("claim", id), line(`item ${item}`, "claim"), ...actLines(r)], { command: "claim", agreement: id, item, ...r });
  return r.status === "sent" ? 0 : 1;
};

const close: Handler = async (ctx) => {
  needRole(ctx);
  const id = agreementId(ctx);
  const deal = ctx.deps.agreement(id);
  if (flagBool(ctx.args, "mutual")) return txBlock(ctx, "close", id, "mutual", deal.mutualClose());
  return txBlock(ctx, "close", id, "step", deal.close());
};

const withdraw: Handler = async (ctx) => {
  needRole(ctx, "buyer");
  const id = agreementId(ctx);
  return txBlock(ctx, "withdraw", id, "withdrawn", ctx.deps.agreement(id).withdrawNear());
};

const show: Handler = async (ctx) => {
  const id = agreementId(ctx);
  const deal = ctx.deps.agreement(id);
  const [view, terms, items, recipients, exceptions] = await Promise.all([
    deal.get(), deal.terms(), deal.items(), deal.recipients(), deal.exceptions(),
  ]);
  ctx.out.block(formatShow({ view, terms, items, recipients, exceptions }), { view, terms, items, recipients, exceptions });
};

const refusals: Handler = async (ctx) => {
  const id = agreementId(ctx);
  const list = await ctx.deps.agreement(id).refusals(flagInt(ctx.args, "from"), flagInt(ctx.args, "limit"));
  ctx.out.block(formatRefusals(id, list), { agreement: id, refusals: list });
};

const receipts: Handler = async (ctx) => {
  const id = agreementId(ctx);
  const list = await ctx.deps.agreement(id).receipts();
  ctx.out.block(formatReceipts(id, list), { agreement: id, receipts: list });
};

const check: Handler = async (ctx) => {
  const account = pos(ctx, 0, "account");
  const id = agreementId(ctx);
  const p = await ctx.deps.preflight(id, account);
  ctx.out.block(formatCheck(account, id, p), { agreement: id, account, ...p });
  return p.rating === "block" ? 1 : 0;
};

const verifyCmd: Handler = async (ctx) => {
  const id = agreementId(ctx);
  let r: VerifyReport;
  try {
    r = await ctx.deps.verify(id);
  } catch (e) {
    if (!(e instanceof NotAnAgreementError)) throw e;
    ctx.out.fail(`verify: ${e.message}`, { agreement: id, error: e.message });
    return 1;
  }
  ctx.out.block(formatVerify(r), r);
  return r.failed > 0 ? 1 : 0;
};

const sealedCheck: Handler = async (ctx) => {
  const role = needRole(ctx, "buyer", "vendor") as "buyer" | "vendor";
  const id = agreementId(ctx);
  const other = role === "buyer" ? "vendor" : "buyer";
  const r = await ctx.deps.sealedCheck(id, other);
  ctx.out.block([
    header("sealed-check", id),
    line("sealed", `sanity check: ${role} → ${other} mandate ${r}`),
    "  note      a sanity check, not the proof; the proof is the encryption to the enclave key, the seed gating and the attestations",
  ], { agreement: id, from: role, mandate: other, result: r });
  return r === "ERR_SEALED" ? 0 : 1;
};

const watch: Handler = async (ctx) => {
  const id = agreementId(ctx);
  const deal = ctx.deps.agreement(id);
  const intervalMs = (flagInt(ctx.args, "interval") ?? 5) * 1000;
  const count = flagInt(ctx.args, "count");
  let last: { state: string; refusals: number; receipts: number; funded: string; agentKey: string | null; recipient: string | null } | undefined;
  for (let i = 0; count === undefined || i < count; i++) {
    if (i > 0) await ctx.deps.sleep(intervalMs);
    const [v, rec] = await Promise.all([deal.get(), deal.receipts()]);
    const now = { state: v.state, refusals: v.refusals, receipts: rec.length, funded: v.funded, agentKey: v.agent_key, recipient: v.recipient?.account ?? null };
    const changes: string[] = [];
    if (!last) changes.push(line("watching", `${now.state} · ${now.refusals} refusals · ${now.receipts} payments · funded ${usdc(now.funded)}`));
    else {
      if (now.state !== last.state) changes.push(line("state", `${last.state} → ${now.state}`));
      if (now.funded !== last.funded) changes.push(line("funded", usdc(now.funded)));
      if (now.agentKey !== last.agentKey) changes.push(line("agent key", now.agentKey ?? "deleted"));
      if (now.recipient !== last.recipient) changes.push(line("recipient", now.recipient ?? "none"));
      if (now.refusals > last.refusals) {
        const fresh = await deal.refusals(undefined, undefined);
        for (const r of fresh.slice(-(now.refusals - last.refusals))) changes.push(line("refused", `${r.code} · seq ${r.seq} · item ${r.item} · ${usdc(r.amount)} → ${r.recipient} · block ${r.block}`));
      }
      for (const r of rec.slice(last.receipts)) changes.push(line("paid", `item ${r.item} · ${usdc(r.amount)} → ${r.recipient} · via ${r.via} · block ${r.block}`));
    }
    if (changes.length) ctx.out.block(i === 0 ? [header("watch", id), ...changes] : changes, { agreement: id, at: time(v.now), ...now });
    last = now;
  }
};

const recycle: Handler = async (ctx) => {
  const signer = ctx.deps.signer;
  if (!signer || signer.role !== "recipient") throw new Error("recycle signs as the recipient (RECIPIENT_ACCOUNT, RECIPIENT_KEY)");
  const agreementFlag = flagString(ctx.args, "agreement");
  // The agreement's own token comes before ACCORD_TOKEN: each factory settles in its own token.
  const token = flagString(ctx.args, "token")
    ?? (agreementFlag ? (await ctx.deps.agreement(agreementFlag).get()).token : undefined) ?? ctx.env.ACCORD_TOKEN;
  if (!token) throw new Error("missing --token (or ACCORD_TOKEN, or --agreement to read it from)");
  const to = flagString(ctx.args, "to") ?? ctx.env.BUYER_ACCOUNT;
  if (!to) throw new Error("missing --to (or BUYER_ACCOUNT)");
  const balance = await ctx.deps.ftBalance(token, signer.accountId);
  const amountText = flagString(ctx.args, "amount");
  const amount = amountText ? parseAmount(amountText, { raw: flagBool(ctx.args, "raw") }) : balance;
  if (BigInt(amount) === 0n) {
    ctx.out.block([header("recycle", signer.accountId), line("balance", `${usdc(balance)} · nothing to return`)],
      { recipient: signer.accountId, token, balance, sent: "0" });
    return;
  }
  if (BigInt(amount) > BigInt(balance)) throw new Error(`the recipient holds ${usdc(balance)}, less than ${usdc(amount)}`);
  const tx = await ctx.deps.ftTransfer(token, to, amount, "accord recycle: test funds back to the buyer");
  ctx.out.block([
    header("recycle", signer.accountId),
    line("returned", `${usdc(amount)} → ${to} · token ${token}`),
    ...txLines("tx", tx),
  ], { recipient: signer.accountId, token, to, amount, ...txJson(tx) });
  return tx.ok ? 0 : 1;
};

export const COMMANDS: Record<string, Handler> = {
  create, seal, negotiate, approve, fund, recipient, deliver, accept, dispute, agent, pay, exception, period, claim,
  close, withdraw, show, refusals, receipts, check, verify: verifyCmd, "sealed-check": sealedCheck, watch, recycle,
};

/** Commands that read only; they run without `--as`. */
export const READ_ONLY = new Set(["show", "refusals", "receipts", "check", "verify", "watch"]);

export const USAGE = `accord <command> [--network testnet] [--factory <id>] [--as buyer|vendor|authority|agent|keeper] [--json] [--rpc <url>]

  create --title <t> [--vendor <a>] [--authority <a>] [--kind procurement|market-making] [--mode demo|live] [--canaries a,b] [--params <file>]
  seal --agreement <a> --mandate <file>                       (--as buyer|vendor)
  negotiate --agreement <a>
  approve --agreement <a> [--terms <hash>]                    (--as buyer|vendor)
  fund <amount> --agreement <a> [--raw]                       (--as buyer)
  recipient propose <account> --domain <d> | approve <v> | accept <v> [--acknowledge-warnings] | activate <v> | cancel <v>
  deliver <item> (--evidence <sha256> | --file <path>) --uri <uri>   (--as vendor)
  accept <item> | dispute <item> --reason <r>                 (--as buyer)
  agent install [--allowance <NEAR>] [--out <file>] | agent revoke   (--as buyer)
  pay <item> <amount> --to <recipient> [--memo <m>] [--preflight on|off]   (--as agent)
  exception request <item> <amount> --reason <r> [--waive-evidence] | approve <id> | reject <id>
  period resolve <n> --pay|--close | period close <n>
  claim <item> | close [--mutual] | withdraw
  show | refusals [--from n] [--limit n] | receipts | check <account> | verify   --agreement <a>
  sealed-check --agreement <a>                                (--as buyer|vendor)
  watch --agreement <a> [--interval <s>] [--count <n>]
  recycle [--token <id>] [--to <account>] [--amount <x>]      (signs as RECIPIENT_ACCOUNT)

Amounts are USDC (\`12.5\`); --raw takes base units. Keys come from .env; only public keys are printed.`;

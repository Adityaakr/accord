// The MCP tools (INTERFACES.md section 12). Each tool is a name, a description, a zod input shape, what it needs
// from the environment, and a handler over injected dependencies. No input ever carries a key: the agent key and
// the principal key come from the environment only.

import { z } from "zod";
import {
  NOT_AN_AGREEMENT, guardedPay, isAccountId, type ActResult, type AgreementClient, type AgreementRecord, type Mandate, type PreflightResult,
  type TxResult, type VerifyReport,
} from "@accord/sdk";

export type Needs = "nothing" | "agent" | "principal";

/** Read access to one agreement; the SDK's `AgreementClient` satisfies it. */
export type AgreementReader = Pick<AgreementClient, "get" | "terms" | "items" | "dueItems" | "refusals" | "receipts">;

export interface McpDeps {
  listAgreements(party?: string): Promise<AgreementRecord[]>;
  agreement(id: string): AgreementReader;
  preflight(agreement: string, recipient: string): Promise<PreflightResult>;
  verify(agreement: string): Promise<VerifyReport>;
  /** The token's `ft_metadata` symbol (`tUSDC` for the test token, `USDC` for Circle's). */
  tokenSymbol?(token: string): Promise<string>;
  /** Present only when ACCORD_AGENT_KEY and AGENT_AGREEMENT are set; signs as the agreement account. */
  agent?: {
    agreement: string;
    publicKey: string;
    pay(p: { item: number; amount: string; recipient: string; memo?: string }): Promise<ActResult>;
    requestException(e: { item: number; amount: string; waiveEvidence: boolean; reason: string }): Promise<ActResult>;
  };
  /** Present only when ACCORD_PRINCIPAL_KEY and ACCORD_PRINCIPAL_ACCOUNT are set. */
  principal?: {
    account: string;
    sealMandate(agreement: string, mandate: Mandate, role: "buyer" | "vendor"): Promise<{ commitment: string; txHash: string }>;
    approveTerms(agreement: string, termsHash: string): Promise<TxResult>;
    submitDelivery(agreement: string, item: number, evidenceHash: string, uri: string): Promise<TxResult>;
    proposeRecipient(agreement: string, account: string, domain: string): Promise<TxResult>;
  };
}

export interface ToolDef {
  name: string;
  description: string;
  needs: Needs;
  input: z.ZodRawShape;
  run(args: Record<string, unknown>, deps: McpDeps): Promise<unknown>;
}

// The SDK's account id rules, so a malformed id (`bogus..x`) is refused here instead of reaching the RPC.
const account = z.string().refine(isAccountId,
  "not a NEAR account id (2 to 64 lowercase letters, digits, - and _, in parts joined by single dots)");
const baseUnits = z.string().regex(/^\d+$/, "a decimal string in the token's base units (USDC: 6 decimals, \"12000000\" is 12.00)");
const hex64 = z.string().regex(/^[0-9a-f]{64}$/, "64 lowercase hex");
const limit = z.number().int().min(1).max(100).optional();
/** accord_list_agreements returns this many agreements when no `limit` is given. */
export const LIST_DEFAULT = 25;

/** Circle's USDC on NEAR (mainnet, testnet); the unit when a token's metadata cannot be read. */
const CIRCLE_USDC = new Set([
  "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
  "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af",
]);

export function guessUnit(token: string): string {
  if (/^tusdc\./.test(token)) return "tUSDC";
  if (CIRCLE_USDC.has(token)) return "USDC";
  return `units of ${token}`;
}

export interface TokenUnit {
  /** The NEP-141 account the agreement settles in. */
  account: string;
  /** Its `ft_metadata` symbol: `tUSDC` is the test token (no value), `USDC` is Circle's testnet USDC. */
  symbol: string;
  decimals: number;
}

/** The agreement's own token and its unit, so an agent never reports test-token amounts as USDC. */
async function unitOf(d: McpDeps, token: string, decimals = 6): Promise<TokenUnit> {
  let symbol = "";
  if (d.tokenSymbol) {
    try {
      symbol = (await d.tokenSymbol(token)).trim();
    } catch {
      symbol = "";
    }
  }
  return { account: token, symbol: symbol || guessUnit(token), decimals };
}

async function unitFor(d: McpDeps, agreement: string): Promise<TokenUnit | null> {
  try {
    return await unitOf(d, (await d.agreement(agreement).get()).token);
  } catch {
    return null;
  }
}

function txOut(tx: TxResult) {
  return { txHash: tx.txHash, ok: tx.ok, value: tx.value, events: tx.events, failure: tx.failure ?? null };
}

function agentFor(deps: McpDeps, agreement: string) {
  const a = deps.agent;
  if (!a) throw new Error("payment tools need ACCORD_AGENT_KEY and AGENT_AGREEMENT");
  if (a.agreement !== agreement) throw new Error(`the agent key signs only for ${a.agreement}`);
  return a;
}

function principalFor(deps: McpDeps) {
  if (!deps.principal) throw new Error("principal tools need ACCORD_PRINCIPAL_KEY and ACCORD_PRINCIPAL_ACCOUNT");
  return deps.principal;
}

const mandateShape = z.object({
  kind: z.enum(["procurement", "market-making"]),
  role: z.enum(["buyer", "vendor"]),
  shared: z.record(z.string(), z.unknown()),
  limits: z.record(z.string(), z.unknown()),
  instructions: z.string(),
});

export const TOOLS: ToolDef[] = [
  {
    name: "accord_list_agreements",
    description: `List agreements on the factory, or those where \`party\` is the buyer, vendor or authority. Paginated: \`limit\` (default ${LIST_DEFAULT}, at most 100) and \`offset\` (default 0); the result gives \`total\` and \`next_offset\` (null on the last page).`,
    needs: "nothing",
    input: { party: account.optional(), limit, offset: z.number().int().min(0).optional() },
    run: async (a, d) => {
      const all = await d.listAgreements(a.party as string | undefined);
      const n = (a.limit as number | undefined) ?? LIST_DEFAULT;
      const from = (a.offset as number | undefined) ?? 0;
      const page = all.slice(from, from + n);
      return { agreements: page, total: all.length, offset: from, limit: n, next_offset: from + n < all.length ? from + n : null };
    },
  },
  {
    name: "accord_get_agreement",
    description: "One agreement: state, parties, terms, items with status, recipient, agent key and budget. Amounts are base units of `token` (its symbol and decimals are given: tUSDC is the test token, USDC is Circle's testnet USDC).",
    needs: "nothing",
    input: { agreement: account },
    run: async (a, d) => {
      const id = a.agreement as string;
      const deal = d.agreement(id);
      try {
        const [view, terms, items] = await Promise.all([deal.get(), deal.terms(), deal.items()]);
        return { agreement: view, token: await unitOf(d, view.token, terms?.decimals ?? 6), terms, items };
      } catch (e) {
        // A missing account, one with no code or one without get_agreement: one line, not the RPC's own text.
        if (NOT_AN_AGREEMENT.test((e as Error).message ?? "")) throw new Error(`${id} is not an Accord agreement`);
        throw e;
      }
    },
  },
  {
    name: "accord_due_items",
    description: "Items eligible for payment now, with amount and the current recipient.",
    needs: "nothing",
    input: { agreement: account },
    run: async (a, d) => {
      const id = a.agreement as string;
      const [due, token] = await Promise.all([d.agreement(id).dueItems(), unitFor(d, id)]);
      return { token, due };
    },
  },
  {
    name: "accord_preflight",
    description: "Check a recipient before paying: allow, warn or block with reasons and signal sources, and whether the buyer approved it. A second line of checks; the contract's gates are the first.",
    needs: "nothing",
    input: { agreement: account, recipient: account },
    run: (a, d) => d.preflight(a.agreement as string, a.recipient as string),
  },
  {
    name: "accord_pay",
    description: "Pay an item through the agreement's act method. Runs preflight first: block refuses to sign (preflight_blocked); warn returns needs_human unless the buyer approved the recipient in the app; allow signs. The contract checks recipient, amount and evidence again and records any refusal.",
    needs: "agent",
    input: { agreement: account, item: z.number().int().min(0), amount: baseUnits, recipient: account, memo: z.string().max(200).optional() },
    run: async (a, d) => {
      const agreement = a.agreement as string;
      const agent = agentFor(d, agreement);
      const r = await guardedPay(
        { preflight: (ag, rcpt) => d.preflight(ag, rcpt), pay: (_ag, p) => agent.pay(p) },
        agreement,
        { item: a.item as number, amount: a.amount as string, recipient: a.recipient as string, memo: a.memo as string | undefined },
      );
      return r;
    },
  },
  {
    name: "accord_request_exception",
    description: "Ask the buyer to approve a different amount for an item (or to waive its evidence). The buyer decides in the app; nothing is paid by this call.",
    needs: "agent",
    input: { agreement: account, item: z.number().int().min(0), amount: baseUnits, waive_evidence: z.boolean(), reason: z.string().min(1).max(500) },
    run: async (a, d) => agentFor(d, a.agreement as string).requestException({
      item: a.item as number, amount: a.amount as string, waiveEvidence: a.waive_evidence as boolean, reason: a.reason as string,
    }),
  },
  {
    name: "accord_refusals",
    description: "The agreement's refusal log: code, item, amount, recipient, signer and block for each refused act.",
    needs: "nothing",
    input: { agreement: account, limit },
    run: async (a, d) => {
      const id = a.agreement as string;
      const [refusals, token] = await Promise.all([d.agreement(id).refusals(undefined, a.limit as number | undefined), unitFor(d, id)]);
      return { token, refusals };
    },
  },
  {
    name: "accord_receipts",
    description: "Payments the agreement made: item, amount, recipient, via and block.",
    needs: "nothing",
    input: { agreement: account, limit },
    run: async (a, d) => {
      const id = a.agreement as string;
      const [list, token] = await Promise.all([d.agreement(id).receipts(), unitFor(d, id)]);
      const n = a.limit as number | undefined;
      return { token, receipts: n ? list.slice(-n) : list };
    },
  },
  {
    name: "accord_verify",
    description: "What anyone can check without a key: code, keys, sealed outcome, release, model attestation, payee and record. Each check is ok, partial (part of it not run here), fail or not_checked, with the reason.",
    needs: "nothing",
    input: { agreement: account },
    run: (a, d) => d.verify(a.agreement as string),
  },
  {
    name: "accord_seal_mandate",
    description: "Seal the principal's mandate for an agreement: encrypted on this machine to the release's mandate key, committed on chain. The mandate's limits and instructions are never returned.",
    needs: "principal",
    input: { agreement: account, mandate: mandateShape },
    run: async (a, d) => {
      const p = principalFor(d);
      const agreement = a.agreement as string;
      const mandate = a.mandate as Mandate;
      const view = await d.agreement(agreement).get();
      const role = view.buyer === p.account ? "buyer" : view.vendor === p.account ? "vendor" : undefined;
      if (!role) throw new Error(`${p.account} is neither the buyer nor the vendor of ${agreement}`);
      if (mandate.role !== role) throw new Error(`the mandate is for the ${mandate.role}; ${p.account} is the ${role}`);
      const r = await p.sealMandate(agreement, mandate, role);
      return { role, commitment: r.commitment, txHash: r.txHash };
    },
  },
  {
    name: "accord_approve_terms",
    description: "Approve the attested terms by their hash, as the principal (buyer or vendor).",
    needs: "principal",
    input: { agreement: account, terms_hash: hex64 },
    run: async (a, d) => txOut(await principalFor(d).approveTerms(a.agreement as string, a.terms_hash as string)),
  },
  {
    name: "accord_submit_delivery",
    description: "Submit a delivery for an item, as the vendor: the evidence's sha256 and a URI.",
    needs: "principal",
    input: { agreement: account, item: z.number().int().min(0), evidence_hash: hex64, uri: z.string().min(1).max(500) },
    run: async (a, d) => txOut(await principalFor(d).submitDelivery(a.agreement as string, a.item as number, a.evidence_hash as string, a.uri as string)),
  },
  {
    name: "accord_propose_recipient",
    description: "Propose a payment recipient, as the vendor: the Payee job proves it against the domain's accord.json, then the authority approves and the buyer accepts.",
    needs: "principal",
    input: { agreement: account, account, domain: z.string().min(3).max(253) },
    run: async (a, d) => txOut(await principalFor(d).proposeRecipient(a.agreement as string, a.account as string, a.domain as string)),
  },
];

export interface EnvFlags {
  agent: boolean;
  principal: boolean;
}

export function envFlags(env: Record<string, string | undefined>): EnvFlags {
  return {
    agent: Boolean(env.ACCORD_AGENT_KEY && env.AGENT_AGREEMENT),
    principal: Boolean(env.ACCORD_PRINCIPAL_KEY && env.ACCORD_PRINCIPAL_ACCOUNT),
  };
}

/** The tools this environment offers: payment tools with the agent key, principal tools with both principal vars. */
export function toolsFor(flags: EnvFlags): ToolDef[] {
  return TOOLS.filter((t) => t.needs === "nothing" || (t.needs === "agent" && flags.agent) || (t.needs === "principal" && flags.principal));
}

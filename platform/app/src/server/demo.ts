// The testnet try-it path: a faucet for a visitor's own account, a demo counterparty that plays the vendor and its
// authority in rooms opened against Accord's demo vendor, and a demo agent that pays one due item for the visitor.
//
// Every key here is one of Accord's own testnet demo accounts, read from the environment (never committed):
// FAUCET_*, DEMO_VENDOR_*, DEMO_AUTHORITY_*, and DEMO_AGENT_SEED. The visitor's own calls (create, seal, approve,
// fund, accept, install the agent key, revoke) are still signed by the visitor's wallet. The demo agent signs `act`
// as the agreement with the function-call key the buyer installed; it is never relayed.

import "server-only";
import { Account, JsonRpcProvider, KeyPair, KeyPairSigner, actions, type KeyPairString } from "near-api-js";
import { deriveAgentKey } from "./demokey";
import {
  KeySigner, demoDelivery, demoDeliveryPath, type AgreementClient, type AgreementView, type ItemView, type Mandate, type RecipientVersion,
} from "@accord/sdk";
import { accord, config } from "./accord";

const YOCTO = 10n ** 24n;
import { FAUCET_NEAR_TARGET } from "./faucetgrant";
export { FAUCET_NEAR_TARGET };
/** Test USDC the faucet mints (6 decimals): enough for the suggested 40 tUSDC ceiling twice over. */
export const FAUCET_TUSDC = 100_000_000n;

export interface DemoConfig {
  vendor: string;
  authority: string;
  recipient: string;
  /** An account outside the agreement, for the redirect attempt. */
  stranger: string;
  domain: string;
}

export function demoConfig(): DemoConfig {
  return {
    vendor: process.env.DEMO_VENDOR_ACCOUNT || "halcyon-demo.testnet",
    authority: process.env.DEMO_AUTHORITY_ACCOUNT || "halcyon-auth.testnet",
    recipient: process.env.DEMO_RECIPIENT || "halcyon-mm.testnet",
    stranger: process.env.DEMO_STRANGER || "halcyon-markets.testnet",
    domain: process.env.DEMO_DOMAIN || process.env.DEMO_VENDOR_DOMAIN || "accordweb-production.up.railway.app",
  };
}

/** Which parts of the try-it path this server can run; the page says plainly what is missing. */
export function demoReady(): { faucet: boolean; counterparty: boolean; agent: boolean } {
  return {
    faucet: config().network === "testnet" && !!process.env.FAUCET_ACCOUNT && !!process.env.FAUCET_KEY,
    counterparty: config().network === "testnet" && !!process.env.DEMO_VENDOR_KEY && !!process.env.DEMO_AUTHORITY_KEY,
    agent: config().network === "testnet" && !!agentSecretSource(),
  };
}

// The demo vendor's mandate: the Halcyon procurement preset (fixtures/companies/halcyon/procurement.vendor.json),
// embedded so the standalone server does not need the fixtures folder.
export const DEMO_VENDOR_MANDATE: Mandate = {
  kind: "procurement",
  role: "vendor",
  shared: { capabilities: "Halcyon Markets builds market data pipelines and reporting for token treasuries." },
  limits: {
    min_total: "30000000", target_total: "38000000", min_items: 2, max_items: 4, min_due_offset_secs: 60,
    max_acceptance_window_secs: 604800,
  },
  instructions: "Hold close to target. Concede once if the buyer gives a reason. Never go below the floor.",
};

// The demo vendor's mandate in a Circle USDC room (fixtures/companies/halcyon/usdc-procurement.vendor.json): the same
// vendor, sized so the whole deal fits one drip of Circle's faucet (about 20 USDC per address every 1 to 2 hours).
export const DEMO_VENDOR_MANDATE_USDC: Mandate = {
  kind: "procurement",
  role: "vendor",
  shared: { capabilities: "Halcyon Markets builds market data pipelines and reporting for token treasuries." },
  limits: {
    min_total: "12000000", target_total: "16000000", min_items: 2, max_items: 4, min_due_offset_secs: 60,
    max_acceptance_window_secs: 604800,
  },
  instructions: "Settled in Circle's testnet USDC. Hold close to target. Concede once if the buyer gives a reason. Never go below the floor.",
};

/** True if this room was created by the Circle USDC factory (ACCORD_FACTORY_USDC). */
export function isCircleRoom(a: AgreementView): boolean {
  return config().currencies.find((c) => c.factory === a.factory)?.id === "usdc";
}

const signerFor = (account: string, key: string | undefined) => {
  if (!key) throw new Error(`the demo key for ${account} is not configured`);
  return new KeySigner(account, key, accord().chain);
};

function as(role: "vendor" | "authority", id: string): AgreementClient {
  const d = demoConfig();
  const s = role === "vendor" ? signerFor(d.vendor, process.env.DEMO_VENDOR_KEY) : signerFor(d.authority, process.env.DEMO_AUTHORITY_KEY);
  return accord().withSigner(s).agreement(id);
}

// ---- the demo agent's key ------------------------------------------------------------------------------------

function agentSecretSource(): string | null {
  const s = process.env.DEMO_AGENT_SEED || process.env.ACCORD_SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

/** The demo agent's ed25519 key for one agreement, derived from the server's seed; the same every time. */
export function demoAgentKey(agreement: string, generation: number): { publicKey: string; secretKey: string } {
  const src = agentSecretSource();
  if (!src) throw new Error("the demo agent is not configured (DEMO_AGENT_SEED)");
  return deriveAgentKey(src, agreement, generation);
}

/** The agreement as the demo agent: signs as the agreement account with the key the buyer installed. */
export function demoAgent(agreement: string, generation: number): AgreementClient {
  const k = demoAgentKey(agreement, generation);
  return accord().withSigner(new KeySigner(agreement, k.secretKey, accord().chain)).agreement(agreement);
}

// ---- the faucet ------------------------------------------------------------------------------------------------

function faucetAccount(): Account {
  const id = process.env.FAUCET_ACCOUNT, key = process.env.FAUCET_KEY;
  if (!id || !key) throw new Error("the faucet is not configured");
  return new Account(id, new JsonRpcProvider({ url: config().rpc }), new KeyPairSigner(KeyPair.fromString(key as KeyPairString)));
}

export interface Balances { near: string; tusdc: string }

export async function balances(account: string): Promise<Balances> {
  const a = accord();
  const { token } = await a.config();
  const [info, ft] = await Promise.all([
    a.chain.account(account).catch(() => null),
    a.chain.view<string>(token, "ft_balance_of", { account_id: account }).catch(() => "0"),
  ]);
  // viewAccount returns the amount as a bigint in near-api-js 7
  return { near: String(info?.amount ?? "0"), tusdc: String(ft ?? "0") };
}

/** The faucet's own account and liquid NEAR, for /status; null when no faucet is configured here. */
export async function faucetStatus(): Promise<{ account: string; near: bigint } | null> {
  const id = process.env.FAUCET_ACCOUNT;
  if (!demoReady().faucet || !id) return null;
  const info = await accord().chain.account(id);
  return { account: id, near: BigInt(String(info.amount ?? "0")) };
}

export interface FaucetResult { sent: { near: string | null; tusdc: string | null }; txs: { label: string; hash: string }[]; balances: Balances }

/** Tops `account` up to 2.5 NEAR and 100 tUSDC, sending only what it lacks. */
export async function drip(account: string): Promise<FaucetResult> {
  const f = faucetAccount();
  const { token } = await accord().config();
  const before = await balances(account);
  const txs: { label: string; hash: string }[] = [];
  let near: string | null = null, tusdc: string | null = null;
  const needNear = FAUCET_NEAR_TARGET - BigInt(before.near);
  if (needNear > 0n) {
    const r = await f.signAndSendTransaction({ receiverId: account, actions: [actions.transfer(needNear)], waitUntil: "FINAL" });
    txs.push({ label: "testnet NEAR", hash: (r as { transaction: { hash: string } }).transaction.hash });
    near = needNear.toString();
  }
  const needUsdc = FAUCET_TUSDC - BigInt(before.tusdc);
  if (needUsdc > 0n) {
    const r = await f.signAndSendTransaction({
      receiverId: token,
      actions: [actions.functionCall("mint", { account_id: account, amount: needUsdc.toString() }, 30_000_000_000_000n, 0n)],
      waitUntil: "FINAL",
    });
    txs.push({ label: "test USDC", hash: (r as { transaction: { hash: string } }).transaction.hash });
    tusdc = needUsdc.toString();
  }
  return { sent: { near, tusdc }, txs, balances: await balances(account) };
}

// ---- the demo counterparty ------------------------------------------------------------------------------------

export interface Step {
  /** What the counterparty did, or null when it waited. */
  did: string | null;
  /** What happens next, in words: whose move it is. */
  next: string;
  tx: string | null;
  /** True when the visitor (the buyer) has the next move. */
  yourMove: boolean;
}

const wait = (next: string, yourMove = false): Step => ({ did: null, next, tx: null, yourMove });
const done = (did: string, tx: string, next: string): Step => ({ did, next, tx, yourMove: false });

const live = (v: RecipientVersion) => !["ProofFailed", "Superseded", "Cancelled"].includes(v.status);

/** True if this room was opened against Accord's demo vendor and authority. */
export function isDemoRoom(a: AgreementView): boolean {
  const d = demoConfig();
  return a.vendor === d.vendor && a.vendor_authority === d.authority;
}

/** Reads the room and makes the vendor's (or its authority's) next valid move, if there is one. */
export async function counterpartyStep(id: string): Promise<Step> {
  const d = demoConfig();
  const reader = accord().agreement(id);
  const a = await reader.get();
  if (!isDemoRoom(a)) throw Object.assign(new Error("this room's vendor is not Accord's demo vendor"), { status: 403 });

  const circle = isCircleRoom(a);
  if (a.state === "NoDeal") {
    return wait(circle
      ? "The Sealed Table found no deal inside both mandates. Open a new room with a ceiling of at least 12 USDC."
      : "The Sealed Table found no deal inside both mandates. Open a new room with a ceiling of at least 30 tUSDC.");
  }
  if (a.state === "Cancelled") return wait("This room was cancelled.");
  if (a.state === "Settled") return wait("This room is settled. Nothing left to do.");

  if (a.state === "Sealed") {
    const c = await reader.commitments();
    if (!c.vendor) {
      const r = await as("vendor", id).sealMandate(circle ? DEMO_VENDOR_MANDATE_USDC : DEMO_VENDOR_MANDATE, { role: "vendor" });
      return done(circle ? "Sealed the vendor's mandate (Halcyon procurement preset, Circle USDC)" : "Sealed the vendor's mandate (Halcyon procurement preset)", r.txHash,
        c.buyer ? "Both mandates are sealed. Start the negotiation next." : "Your move: seal your mandate.");
    }
    if (!c.buyer) return wait("Your move: seal your mandate. The vendor's is sealed.", true);
    if (typeof a.negotiation === "object" && "Ready" in a.negotiation) {
      const tx = await as("vendor", id).startNegotiation();
      return done("Started the negotiation in the Sealed Table", tx.txHash, "The Sealed Table is negotiating. It takes about a minute.");
    }
    return wait("The Sealed Table is negotiating inside the enclave. It takes about a minute.");
  }

  if (a.state === "Attested") {
    if (!a.approvals.vendor && a.terms_hash) {
      const tx = await as("vendor", id).approveTerms(a.terms_hash);
      return done("Approved the terms as the vendor", tx.txHash, a.approvals.buyer ? "Both sides approved." : "Your move: read the terms and approve them.");
    }
    return wait("Your move: read the terms and approve them.", true);
  }

  // Executing.
  const versions = await reader.recipients();
  const current = versions.filter(live).at(-1) ?? null;
  if (!a.recipient && !current) {
    const tx = await as("vendor", id).proposeRecipient(d.recipient, d.domain);
    return done(`Proposed ${d.recipient} as the recipient on ${d.domain}`, tx.txHash, "The Payee job is checking the domain. It takes about a minute.");
  }
  if (current && current.status !== "Active") {
    if (current.status === "Proposed") return wait("The Payee job is checking the recipient on the vendor's domain.");
    if (current.status === "Proven") {
      const tx = await as("authority", id).approveRecipient(current.version);
      return done(`Approved recipient ${current.account} as the vendor's authority`, tx.txHash, "Your move: accept the recipient.");
    }
    if (current.status === "AuthorityApproved") return wait("Your move: accept the recipient.", true);
    if (current.status === "Accepted") {
      if (current.active_at && current.active_at > a.now) {
        return wait(`The recipient change is in its timelock until ${new Date(current.active_at * 1000).toISOString().slice(11, 19)} UTC.`);
      }
      const tx = await as("vendor", id).activateRecipient(current.version);
      return done(`Activated recipient ${current.account} after its timelock`, tx.txHash, "The recipient is active.");
    }
  }

  if (BigInt(a.funded) < BigInt(a.total)) {
    return wait(circle ? "Your move: fund the escrow with Circle testnet USDC (faucet.circle.com, network NEAR Testnet)." : "Your move: fund the escrow with test USDC.", true);
  }

  const items = await reader.items();
  // One item at a time, in order: the vendor delivers the next one once the last is accepted and paid. A payment
  // waits for the buyer's acceptance (or the acceptance window), not for the item's due date, so a test room does
  // not have to wait days.
  const waiting = items.find((it) => it.status === "Delivered");
  if (waiting) return wait(`Your move: accept delivery ${waiting.id}.`, true);
  const eligible = items.find((it) => it.status === "Eligible");
  if (eligible) {
    return wait(a.agent_key ? `Item ${eligible.id} is eligible: let the agent pay it.` : "Your move: start the demo agent, then let it pay the accepted item.", true);
  }
  const next = items
    .filter((it: ItemView) => it.status === "Open" && !it.delivery && it.evidence === "DeliveryAccepted")
    .sort((x, y) => x.id - y.id)[0];
  if (next) {
    const evidence = demoDelivery(id, next.id);
    const tx = await as("vendor", id).submitDelivery(next.id, evidence.hash, `https://${d.domain}${demoDeliveryPath(id, next.id)}`);
    return done(`Submitted delivery for item ${next.id}`, tx.txHash, `Your move: accept delivery ${next.id}, then let the agent pay it.`);
  }
  return wait("The vendor has delivered every item. Nothing left for it to do.");
}

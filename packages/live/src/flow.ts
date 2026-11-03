// The steps every live target shares: an agreement taken from nothing to the state the target needs, through the
// same calls a user makes (create, seal both mandates, negotiate, approve, fund, prove a recipient, install an
// agent key), and the printing of INTERFACES.md section 10's blocks.

import { readFileSync } from "node:fs";
import path from "node:path";
import { KeyPair } from "near-api-js";
import {
  DEMO_PARAMS, KeySigner, formatUnits, shortHash, type AgreementClient, type AgreementView, type Kind, type Mandate,
  type TxResult,
} from "@accord/sdk";
import { repoRoot, type Role, type World } from "./world.js";

export const say = (text: string) => console.log(text);
/** One line of a block: two spaces, the label in ten columns, the text. */
export const line = (label: string, text: string) => say(`  ${label.padEnd(9)} ${text}`);
export const usdc = (base: string | bigint) => `${formatUnits(base)} USDC`;
export const short = (h: string) => shortHash(h);

export function companyMandate(file: string): Mandate {
  return JSON.parse(readFileSync(path.join(repoRoot(), "fixtures/companies", file), "utf8")) as Mandate;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Polls until `f` returns a value, or fails naming what it waited for. */
export async function waitFor<T>(what: string, secs: number, f: () => Promise<T | undefined | null | false>): Promise<T> {
  const until = Date.now() + secs * 1000;
  for (;;) {
    const v = await f();
    if (v) return v;
    if (Date.now() > until) throw new Error(`still waiting for ${what} after ${secs} s`);
    await sleep(1000);
  }
}

export function client(w: World, role: Role, id: string): AgreementClient {
  return w.as(role).agreement(id);
}

export const PRESETS = {
  procurement: { buyer: "northwind/procurement.buyer.json", vendor: "halcyon/procurement.vendor.json" },
  atlas: { buyer: "northwind/market-making.buyer.json", vendor: "halcyon/market-making.vendor.json" },
  strict: { buyer: "northwind/market-making.buyer.strict.json", vendor: "halcyon/market-making.vendor.strict.json" },
  try: { buyer: "northwind/try.buyer.json", vendor: "halcyon/try.vendor.json" },
} as const;

export async function create(w: World, kind: Kind, title: string): Promise<string> {
  // The creation deposit (8 NEAR) plus gas for the steps after it.
  await w.gas(w.principals.buyer.account, 20);
  const { agreement } = await w.as("buyer").createAgreement({
    kind, title, vendor: w.principals.vendor.account, vendor_authority: w.principals.authority.account,
    canaries: w.canaries, params: DEMO_PARAMS,
  });
  return agreement;
}

export interface SealedPair { buyer: { commitment: string }; vendor: { commitment: string } }

/** Both parties seal their mandate to the release's mandate key, each on its own device (here, its own key). */
export async function sealBoth(w: World, id: string, preset: { buyer: string; vendor: string }): Promise<SealedPair> {
  const buyer = await client(w, "buyer", id).sealMandate(companyMandate(preset.buyer), { role: "buyer" });
  const vendor = await client(w, "vendor", id).sealMandate(companyMandate(preset.vendor), { role: "vendor" });
  return { buyer, vendor };
}

/** Starts the negotiation as the keeper would and waits for the Sealed Table's answer. */
export async function negotiate(w: World, id: string): Promise<AgreementView> {
  const deal = client(w, "keeper", id);
  const a = await deal.get();
  if (a.state === "Sealed" && typeof a.negotiation === "object" && "Ready" in a.negotiation) await deal.startNegotiation();
  return waitFor("the Sealed Table's answer", w.network === "sandbox" ? 90 : 300, async () => {
    const v = await deal.get();
    return v.state !== "Sealed" ? v : undefined;
  });
}

export async function approveBoth(w: World, id: string): Promise<void> {
  const a = await w.reader.agreement(id).get();
  if (!a.terms_hash) throw new Error(`${id} has no terms (state ${a.state})`);
  if (!a.approvals.buyer) await client(w, "buyer", id).approveTerms(a.terms_hash);
  if (!a.approvals.vendor) await client(w, "vendor", id).approveTerms(a.terms_hash);
}

export async function fundTotal(w: World, id: string): Promise<{ total: bigint; tx: TxResult }> {
  const terms = await w.reader.agreement(id).terms();
  const total = BigInt(terms?.total ?? 0);
  await w.fund(w.principals.buyer.account, total);
  return { total, tx: await client(w, "buyer", id).fund(total.toString()) };
}

/** Proposed by the vendor, proven by the Payee job, approved by the authority, accepted by the buyer, active. */
export async function authorise(w: World, id: string, account: string): Promise<{ version: number; rating: string }> {
  const tx = await client(w, "vendor", id).proposeRecipient(account, w.domain);
  const version = Number(tx.value);
  const proven = await waitFor("the Payee job's proof", w.network === "sandbox" ? 60 : 300, async () => {
    const v = (await w.reader.agreement(id).recipients())[version - 1];
    if (v?.status === "ProofFailed") throw new Error(`the payee proof failed: ${v.failure ?? v.reasons.join("; ")}`);
    return v && v.status !== "Proposed" ? v : undefined;
  });
  await client(w, "authority", id).approveRecipient(version);
  await client(w, "buyer", id).acceptRecipient(version, { acknowledgeWarnings: proven.rating === "warn" });
  await activate(w, id, version);
  return { version, rating: proven.rating ?? "none" };
}

/** Waits out the timelock when there is one and activates the version (anyone may; here the keeper). */
export async function activate(w: World, id: string, version: number): Promise<void> {
  const deal = w.reader.agreement(id);
  const v = await waitFor(`recipient version ${version} accepted`, 30, async () => (await deal.recipients())[version - 1]);
  if (v.status === "Active") return;
  if (v.active_at) {
    const wait = v.active_at - (await deal.get()).now;
    if (wait > 0) await sleep((wait + 2) * 1000);
  }
  await waitFor(`recipient version ${version} active`, 60, async () => {
    const cur = (await deal.recipients())[version - 1];
    if (cur?.status === "Active") return true;
    try {
      await client(w, "keeper", id).activateRecipient(version);
    } catch {
      // ERR_TIMELOCK: the chain's clock has not passed it yet
    }
    return (await deal.recipients())[version - 1]?.status === "Active";
  });
}

export interface Agent { publicKey: string; secret: string; deal: AgreementClient }

/** The buyer installs a fresh function-call key on the agreement; the agent signs as the agreement with it. */
export async function installAgent(w: World, id: string): Promise<Agent & { tx: TxResult }> {
  const kp = KeyPair.fromRandom("ed25519");
  const publicKey = kp.getPublicKey().toString();
  const tx = await client(w, "buyer", id).installAgentKey(publicKey, DEMO_PARAMS.agent_allowance);
  const secret = kp.toString();
  const signer = new KeySigner(id, secret, w.reader.chain);
  return { publicKey, secret, deal: w.reader.withSigner(signer).agreement(id), tx };
}

export async function deliverAndAccept(w: World, id: string, item: number): Promise<void> {
  await client(w, "vendor", id).submitDelivery(item, "ee".repeat(32), `https://${w.domain}/deliveries/${item}`);
  await client(w, "buyer", id).acceptDelivery(item);
}

export interface Ready { id: string; agent: Agent; total: bigint; recipient: string }

/** A procurement agreement from nothing to `Executing`, funded, with an active recipient and an agent key. */
export async function executingProcurement(w: World, title: string): Promise<Ready> {
  const id = await create(w, "procurement", title);
  await sealBoth(w, id, PRESETS.procurement);
  const a = await negotiate(w, id);
  if (a.state !== "Attested") throw new Error(`${id}: ${a.state} after the negotiation`);
  await approveBoth(w, id);
  const { total } = await fundTotal(w, id);
  await authorise(w, id, w.principals.recipient.account);
  const agent = await installAgent(w, id);
  return { id, agent, total, recipient: w.principals.recipient.account };
}

export function header(target: string, id: string, extra = "", w?: World): void {
  say(`accord ${target} · ${id}${extra}${w?.suffix ?? ""}`);
}

export async function escrow(w: World, id: string): Promise<bigint> {
  return BigInt(await w.reader.chain.view<string>(w.token, "ft_balance_of", { account_id: id }));
}

export async function finalBlock(w: World): Promise<number> {
  return (await w.reader.chain.block("final")).header.height;
}

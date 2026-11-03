// `make demo` (PROGRESS 5.2): the whole loop from nothing in under two minutes. Fresh faucet accounts, an
// agreement on demo timings, both mandates sealed, the recipient proven on the app's demo domain while the
// negotiation runs, approved, funded, a delivery, a payment, and one attack refused.

import { sha256 } from "@noble/hashes/sha2";
import { utf8ToBytes } from "@noble/hashes/utils";
import { KeySigner, toBase64 } from "@accord/sdk";
import {
  activate, approveBoth, client, create, deliverAndAccept, fundTotal, installAgent, negotiate, PRESETS, say, sealBoth,
  usdc, waitFor,
} from "../flow.js";
import type { Principal, World } from "../world.js";

function clock(started: number): string {
  const s = Math.floor((Date.now() - started) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** The recipient signs (NEP-413) its pairing with the authority; the app lists it on its demo domain for 24 h. */
async function registerDemoVendor(w: World, recipient: Principal, authority: string): Promise<void> {
  const message = `accord:demo-vendor:v1:${recipient.account}:${authority}`;
  const signer = new KeySigner(recipient.account, recipient.key, w.reader.chain);
  const { signature, publicKey } = await signer.signMessage(message, recipient.account, sha256(utf8ToBytes(message)));
  const res = await fetch(`${w.app.url}/api/demo-vendor/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ recipient: recipient.account, authority, signature: toBase64(signature), public_key: publicKey }),
  });
  if (!res.ok) throw new Error(`demo domain registration: ${res.status} ${await res.text()}`);
}

export async function run(base: World): Promise<void> {
  if (!base.app.url) throw new Error("make demo needs the app for its demo domain: set APP_URL (make dev runs it locally)");
  const started = Date.now();
  const at = (label: string, text: string) => say(`  ${clock(started)}  ${label.padEnd(10)} ${text}`);
  const token = base.network === "sandbox" ? "tUSDC (test token, 6 decimals)" : "USDC";
  say(`accord demo · faucet accounts · token ${token}${base.suffix}`);

  const tag = Date.now().toString(36);
  const [buyer, vendor, authority, recipient] = await Promise.all(
    ["buyer", "vendor", "auth", "pay"].map((r) => base.newAccount(`demo-${tag}-${r}`)),
  );
  const w = base.with({ buyer, vendor, authority, recipient });
  at("accounts", `${buyer!.account} · ${vendor!.account} · ${authority!.account} · ${recipient!.account}`);

  const id = await create(w, "procurement", "Liquidity reporting integration");
  at("created", `${id} · demo timings`);
  await sealBoth(w, id, PRESETS.procurement);
  at("sealed", "both mandates committed");

  // The recipient is proven while the Sealed Table negotiates.
  const negotiation = negotiate(w, id);
  await registerDemoVendor(w, recipient!, authority!.account);
  const prop = await client(w, "vendor", id).proposeRecipient(recipient!.account, w.app.demoDomain);
  const version = Number(prop.value);
  const proven = await waitFor("the Payee job's proof", 120, async () => {
    const v = (await w.reader.agreement(id).recipients())[version - 1];
    if (v?.status === "ProofFailed") throw new Error(`the payee proof failed: ${v.failure}`);
    return v && v.status !== "Proposed" ? v : undefined;
  });
  await client(w, "authority", id).approveRecipient(version);
  await client(w, "buyer", id).acceptRecipient(version, { acknowledgeWarnings: proven.rating === "warn" });
  const a = await negotiation;
  if (a.state !== "Attested") throw new Error(`${id}: ${a.state} after the negotiation`);
  const terms = (await w.reader.agreement(id).terms())!;
  at("attested", `${usdc(terms.total)} · ${terms.items.length} items`);

  await approveBoth(w, id);
  const { total } = await fundTotal(w, id);
  at("executing", `approved by both · funded ${usdc(total)}`);
  await activate(w, id, version);
  at("recipient", `proven on the demo domain · approved · accepted · active`);

  const agent = await installAgent(w, id);
  await deliverAndAccept(w, id, 1);
  at("delivery", "item 1 submitted · accepted");
  const item = terms.items[0]!;
  const paid = await agent.deal.pay({ item: 1, amount: item.amount, recipient: recipient!.account });
  at("paid", `item 1 · ${usdc(item.amount)} → ${recipient!.account}`);
  const attack = await agent.deal.pay({ item: 2, amount: terms.items[1]!.amount, recipient: w.attacker });
  at("refused", `${attack.code ?? attack.status} (one attack)`);
  const s = Math.floor((Date.now() - started) / 1000);
  say(`demo: full loop in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
  if (paid.status !== "sent" || attack.status !== "refused") process.exitCode = 1;
}

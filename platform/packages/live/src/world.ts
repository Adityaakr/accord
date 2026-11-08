// Where a live target runs: the local node `make serve` keeps up (its accounts and faucets from
// target/sandbox/env.json) or testnet (accounts and keys from .env, test USDC from Circle's faucet). Every target
// is the same code on both; only this file knows the difference.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { Account, KeyPair, KeyPairSigner, type KeyPairString } from "near-api-js";
import { Accord, KeySigner, TGAS, type Network } from "@accord/sdk";
import type { ObserverConfig } from "../../../services/keeper/src/observe.js";
import { outlayerObserver } from "../../../services/agent/src/config.js";

export type Role = "buyer" | "vendor" | "authority" | "keeper" | "recipient";
export interface Principal { account: string; key: string }

export interface World {
  network: Network;
  /** Added to every block's first line on a local node, so no output passes for a testnet run. */
  suffix: string;
  reader: Accord;
  principals: Record<Role, Principal>;
  token: string;
  attacker: string;
  canaries: string[];
  /** A second recipient the domain file lists, for `make payee-change`. */
  second?: string;
  /** The demo vendor's domain, served to the Payee job. */
  domain: string;
  /** The app, which serves the demo domain's list for fresh accounts (`make demo`), and that domain's name. */
  app: { url: string; demoDomain: string };
  /** The same network with some principals replaced (fresh faucet accounts in `make demo`). */
  with(principals: Partial<Record<Role, Principal>>): World;
  /** The local OutLayer's address on a local node. */
  jobs?: string;
  /** Where to ask the observer: the local OutLayer, or OutLayer's HTTPS API on testnet. */
  observer?: ObserverConfig;
  explorer?: string;
  as(role: Role): Accord;
  signer(role: Role): KeySigner;
  /** Test USDC to an account: minted on a local node; on testnet it must already hold it (Circle's faucet). */
  fund(account: string, amount: bigint): Promise<void>;
  /** Makes sure `account` holds at least `near` NEAR: topped up on a local node, checked on testnet. */
  gas(account: string, near: number): Promise<void>;
  /** A fresh funded account (`make demo`): the local account faucet, or a sub-account of the buyer on testnet. */
  newAccount(name: string): Promise<Principal>;
}

export function repoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error("run from inside the repository");
}

function loadDotEnv(root: string): Record<string, string> {
  const file = path.join(root, ".env");
  const out: Record<string, string> = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m?.[1]) out[m[1]] = m[2]!.replace(/^"(.*)"$/, "$1");
  }
  return out;
}

async function post<T>(url: string, body: object): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(`${url}: ${json.error ?? res.status}`);
  return json;
}

interface LocalFile {
  rpc: string; factory: string; token: string; jobs: string; domain: string; attacker: string; canaries: string[];
  second_recipient?: string;
  try?: Record<"buyer" | "vendor" | "authority" | "recipient", Principal>;
  principals: Record<Role, Principal>;
}

type Rest = Omit<World, "network" | "reader" | "principals" | "as" | "signer" | "suffix" | "with">;

function build(network: Network, rpc: string, factory: string, principals: Record<Role, Principal>, rest: Rest): World {
  const reader = new Accord({ network, factory, rpc });
  const signers = new Map<Role, KeySigner>();
  const signer = (role: Role) => {
    let s = signers.get(role);
    if (!s) {
      const p = principals[role];
      if (!p?.account || !p.key) throw new Error(`no ${role} account and key for ${network}`);
      s = new KeySigner(p.account, p.key, reader.chain);
      signers.set(role, s);
    }
    return s;
  };
  return {
    network, reader, principals, signer,
    suffix: network === "sandbox" ? " · local node" : "",
    as: (role) => reader.withSigner(signer(role)),
    with: (p) => build(network, rpc, factory, { ...principals, ...p }, rest),
    ...rest,
  };
}

/** `NET=local` (or `ACCORD_NETWORK=sandbox`) for the local node; testnet otherwise. */
export function world(): World {
  const root = repoRoot();
  const net = process.env.NET ?? process.env.ACCORD_NETWORK ?? "testnet";
  if (net === "local" || net === "sandbox") {
    const file = path.join(root, "target/sandbox/env.json");
    if (!existsSync(file)) throw new Error("no local node: run make serve first (it writes target/sandbox/env.json)");
    const f = JSON.parse(readFileSync(file, "utf8")) as LocalFile;
    return build("sandbox", f.rpc, f.factory, f.principals, {
      token: f.token, attacker: f.attacker, canaries: f.canaries, domain: f.domain, jobs: f.jobs,
      second: f.second_recipient,
      app: { url: process.env.APP_URL ?? "http://127.0.0.1:3100", demoDomain: "demo.accord.local" },
      observer: { kind: "local", url: `${f.jobs}/observe` },
      fund: async (account, amount) => {
        for (let left = amount; left > 0n; ) {
          const step = left > 1_000_000_000n ? 1_000_000_000n : left; // the token's per-call cap
          await post(`${f.jobs}/faucet`, { account, amount: step.toString() });
          left -= step;
        }
      },
      gas: async (account, near) => { await post(`${f.jobs}/near`, { account, near }); },
      newAccount: (name) => post<Principal>(`${f.jobs}/account`, { name }),
    });
  }
  const env = { ...loadDotEnv(root), ...process.env } as Record<string, string | undefined>;
  const p = (role: string): Principal => ({ account: env[`${role}_ACCOUNT`] ?? "", key: env[`${role}_KEY`] ?? "" });
  const factory = env.ACCORD_FACTORY || "accord-v1.testnet";
  const testnetReader = new Accord({ network: "testnet", factory, rpc: env.NEAR_RPC_URL || undefined });
  return build("testnet", env.NEAR_RPC_URL || "https://test.rpc.fastnear.com", factory, {
    buyer: p("BUYER"), vendor: p("VENDOR"), authority: p("AUTHORITY"), keeper: p("KEEPER"), recipient: p("RECIPIENT"),
  }, {
    token: env.ACCORD_TOKEN || "",
    attacker: env.ATTACKER_ACCOUNT || "",
    second: env.RECIPIENT2_ACCOUNT || undefined,
    app: appOf(env.APP_URL),
    observer: outlayerObserver(env),
    canaries: (env.CANARY_ACCOUNTS || "").split(",").map((s) => s.trim()).filter(Boolean),
    domain: env.DEMO_VENDOR_DOMAIN || "",
    explorer: "https://testnet.nearblocks.io",
    // Test USDC on testnet comes from Circle's faucet into the buyer (docs/build/BLOCKED.md); a fresh `make demo` account is
    // registered with the token and given what it needs from the buyer's balance.
    fund: async (account, amount) => {
      const token = env.ACCORD_TOKEN || "";
      const have = BigInt(await testnetReader.chain.view<string>(token, "ft_balance_of", { account_id: account }));
      if (have >= amount) return;
      const funder = p("BUYER");
      if (account === funder.account) {
        throw new Error(`${account} holds ${have} base units of ${token}, needs ${amount}: drip test USDC at https://faucet.circle.com (docs/build/BLOCKED.md)`);
      }
      const from = new KeySigner(funder.account, funder.key, testnetReader.chain);
      await from.call(token, "storage_deposit", { account_id: account, registration_only: true }, { gas: 30n * TGAS, deposit: 1_250_000_000_000_000_000_000n });
      const tx = await from.call(token, "ft_transfer", { receiver_id: account, amount: (amount - have).toString() }, { gas: 30n * TGAS, deposit: 1n });
      if (!tx.ok) throw new Error(`funding ${account} from ${funder.account}: ${tx.failure}`);
    },
    gas: async (account, near) => {
      const have = BigInt((await testnetReader.chain.account(account)).amount);
      if (have < BigInt(near) * 10n ** 24n) {
        throw new Error(`${account} holds less than ${near} NEAR: top it up from the testnet faucet (make setup prints the shortfall)`);
      }
    },
    // A fresh account for `make demo`: a sub-account of the buyer's account with 22 NEAR for a buyer (the creation
    // deposit and gas) or 2 NEAR otherwise. Testnet has no keyless faucet API.
    newAccount: async (name) => {
      const funder = p("BUYER");
      const kp = KeyPair.fromRandom("ed25519");
      const acct = new Account(funder.account, testnetReader.chain.provider, new KeyPairSigner(KeyPair.fromString(funder.key as KeyPairString)));
      const near = name.endsWith("-buyer") ? 22n : 2n;
      await acct.createSubAccount({ accountOrPrefix: name, publicKey: kp.getPublicKey(), nearToTransfer: near * 10n ** 24n });
      return { account: `${name}.${funder.account}`, key: kp.toString() };
    },
  });
}

/**
 * The /try room's world (ARCHITECTURE.md 11): the same network, with the room's own fictional principals in place
 * of the demo's, so the re-arm can open, fund and prove rooms without anyone.
 */
export function tryWorld(): World {
  const w = world();
  if (w.network === "sandbox") {
    const f = JSON.parse(readFileSync(path.join(repoRoot(), "target/sandbox/env.json"), "utf8")) as LocalFile;
    if (!f.try) throw new Error("this local node has no /try principals: restart make serve");
    return w.with(f.try);
  }
  const env = { ...loadDotEnv(repoRoot()), ...process.env } as Record<string, string | undefined>;
  const p = (role: string): Principal => ({ account: env[`TRY_${role}_ACCOUNT`] ?? "", key: env[`TRY_${role}_KEY`] ?? "" });
  return w.with({ buyer: p("BUYER"), vendor: p("VENDOR"), authority: p("AUTHORITY"), recipient: { account: env.TRY_RECIPIENT_ACCOUNT ?? "", key: "" } });
}

/** The app's address for the demo domain; a value without a scheme is a configuration error, said plainly. */
function appOf(url: string | undefined): { url: string; demoDomain: string } {
  if (!url) return { url: "", demoDomain: "" };
  try {
    const u = new URL(url);
    return { url: u.origin, demoDomain: u.host };
  } catch {
    throw new Error(`APP_URL must be a full URL such as https://accord-app.example, got ${url}`);
  }
}

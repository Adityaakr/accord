// Server-side connection to the chain. Reads views only; the app's server never signs for a principal and never
// sees a mandate (see ./README.md). Configuration comes from the environment, or from `make serve`'s
// target/sandbox/env.json when ACCORD_NETWORK=sandbox.

import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Accord, type AgreementRecord, type Network } from "@accord/sdk";
import { agreementPattern } from "./delegate";

/**
 * A settlement currency the app offers: a factory and the token it settles in. The default is ACCORD_FACTORY (test
 * USDC from the app's faucet); ACCORD_FACTORY_USDC, when set, adds a second factory that settles in Circle's testnet
 * USDC. Each agreement keeps its own factory's token for life, so pages read the token from the agreement itself.
 */
export interface Currency {
  id: "default" | "usdc";
  factory: string;
  /** The token as configured (ACCORD_TOKEN, ACCORD_TOKEN_USDC); the factory's on-chain config is the truth. */
  token: string | null;
  label: string;
}

export interface AppConfig {
  network: Network;
  rpc: string;
  factory: string;
  explorer: string | null;
  label: string;
  /** The default first; the Circle USDC pair only when ACCORD_FACTORY_USDC is set. */
  currencies: Currency[];
}

function currencies(factory: string): Currency[] {
  const list: Currency[] = [{ id: "default", factory, token: process.env.ACCORD_TOKEN || null, label: "Test USDC" }];
  const usdc = process.env.ACCORD_FACTORY_USDC;
  if (usdc && usdc !== factory) {
    list.push({ id: "usdc", factory: usdc, token: process.env.ACCORD_TOKEN_USDC || null, label: "Circle USDC (testnet)" });
  }
  return list;
}

interface SandboxEnv {
  rpc: string;
  factory: string;
}

function sandboxEnv(): SandboxEnv | null {
  try {
    const file = path.resolve(process.cwd(), "../target/sandbox/env.json");
    return JSON.parse(readFileSync(file, "utf8")) as SandboxEnv;
  } catch {
    return null;
  }
}

export function config(): AppConfig {
  const network = (process.env.ACCORD_NETWORK ?? process.env.NEAR_NETWORK ?? "testnet") as Network;
  if (network === "sandbox") {
    const sb = sandboxEnv();
    const factory = process.env.ACCORD_FACTORY ?? sb?.factory ?? "accord.test.near";
    return {
      network,
      rpc: process.env.ACCORD_RPC ?? sb?.rpc ?? "http://127.0.0.1:3030",
      factory,
      explorer: null,
      label: "local sandbox",
      currencies: currencies(factory),
    };
  }
  const factory = process.env.ACCORD_FACTORY ?? "accord-v2.testnet";
  return {
    network,
    rpc: process.env.NEAR_RPC_URL ?? "https://test.rpc.fastnear.com",
    factory,
    explorer: network === "mainnet" ? "https://nearblocks.io" : "https://testnet.nearblocks.io",
    label: network,
    currencies: currencies(factory),
  };
}

/** The configured factories, the default first. */
export function factories(): string[] {
  return config().currencies.map((c) => c.factory);
}

/** Whether `id` names an agreement account of one of the configured factories (`a<n>.<factory>`). */
export function isConfiguredAgreement(id: string): boolean {
  return factories().some((f) => agreementPattern(f).test(id));
}

let cached: { key: string; accord: Accord } | null = null;

/** The default factory's client. Agreement calls go to the agreement account, whichever factory created it. */
export function accord(): Accord {
  const c = config();
  const key = `${c.network}|${c.rpc}|${c.factory}`;
  if (!cached || cached.key !== key) {
    cached = { key, accord: new Accord({ network: c.network, factory: c.factory, rpc: c.rpc }) };
  }
  return cached.accord;
}

/** Agreements across every configured factory: the default factory's first, as before, then the second's. */
export async function listAllAgreements(opts: { party?: string; limit?: number } = {}): Promise<AgreementRecord[]> {
  const a = accord();
  const rest = factories().slice(1);
  const lists = await Promise.all([
    a.listAgreements(opts),
    ...rest.map((f) => a.onFactory(f).listAgreements(opts).catch(() => [] as AgreementRecord[])),
  ]);
  // One factory: its order as it was. Two: one timeline, oldest first, as a single factory lists them.
  return rest.length ? lists.flat().sort((x, y) => x.created_at - y.created_at) : lists.flat();
}

/** The source line every live panel shows: network, block and age. */
export interface Source {
  label: string;
  block: number;
  at: number;
}

export async function source(): Promise<Source> {
  const b = await accord().chain.block("final");
  return { label: config().label, block: b.header.height, at: Number(BigInt(b.header.timestamp_nanosec) / 1_000_000n) };
}

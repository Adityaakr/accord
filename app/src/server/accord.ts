// Server-side connection to the chain. Reads views only; the app's server never signs for a principal and never
// sees a mandate (see ./README.md). Configuration comes from the environment, or from `make serve`'s
// target/sandbox/env.json when ACCORD_NETWORK=sandbox.

import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Accord, type Network } from "@accord/sdk";

export interface AppConfig {
  network: Network;
  rpc: string;
  factory: string;
  explorer: string | null;
  label: string;
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
    return {
      network,
      rpc: process.env.ACCORD_RPC ?? sb?.rpc ?? "http://127.0.0.1:3030",
      factory: process.env.ACCORD_FACTORY ?? sb?.factory ?? "accord.test.near",
      explorer: null,
      label: "local sandbox",
    };
  }
  return {
    network,
    rpc: process.env.NEAR_RPC_URL ?? "https://test.rpc.fastnear.com",
    factory: process.env.ACCORD_FACTORY ?? "accord-v1.testnet",
    explorer: network === "mainnet" ? "https://nearblocks.io" : "https://testnet.nearblocks.io",
    label: network,
  };
}

let cached: { key: string; accord: Accord } | null = null;

export function accord(): Accord {
  const c = config();
  const key = `${c.network}|${c.rpc}|${c.factory}`;
  if (!cached || cached.key !== key) {
    cached = { key, accord: new Accord({ network: c.network, factory: c.factory, rpc: c.rpc }) };
  }
  return cached.accord;
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

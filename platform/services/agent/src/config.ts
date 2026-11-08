// Where the services connect: the environment, or `make serve`'s target/sandbox/env.json when ACCORD_NETWORK=sandbox.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Network } from "@accord/sdk";
import type { ObserverConfig } from "../../keeper/src/observe.js";

export interface ServiceConfig {
  network: Network;
  rpc: string;
  factory: string;
  agent?: { agreement: string; key: string };
  keeper?: { account: string; key: string };
  /** Where the keeper asks the observer: the local OutLayer on a local node, OutLayer's HTTPS API on testnet. */
  observer?: ObserverConfig;
}

export function repoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

/** Loads .env from the repository root without overriding what the environment already set. */
export function loadEnv(): void {
  const file = path.join(repoRoot(), ".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m?.[1] && process.env[m[1]] === undefined) process.env[m[1]] = m[2]!.replace(/^"(.*)"$/, "$1");
  }
}

interface SandboxFile {
  rpc: string;
  factory: string;
  jobs?: string;
  agent?: { agreement: string; key: string };
  principals: Record<string, { account: string; key: string }>;
}

export function serviceConfig(): ServiceConfig {
  loadEnv();
  const network = (process.env.ACCORD_NETWORK ?? process.env.NEAR_NETWORK ?? "testnet") as Network;
  if (network === "sandbox") {
    const sb = JSON.parse(readFileSync(path.join(repoRoot(), "target/sandbox/env.json"), "utf8")) as SandboxFile;
    return {
      network, rpc: sb.rpc, factory: sb.factory, agent: sb.agent,
      keeper: sb.principals.keeper,
      observer: sb.jobs ? { kind: "local", url: `${sb.jobs}/observe` } : undefined,
    };
  }
  const env = process.env;
  return {
    network,
    rpc: env.NEAR_RPC_URL || "https://test.rpc.fastnear.com",
    factory: env.ACCORD_FACTORY || "accord-v1.testnet",
    agent: env.AGENT_AGREEMENT && env.ACCORD_AGENT_KEY ? { agreement: env.AGENT_AGREEMENT, key: env.ACCORD_AGENT_KEY } : undefined,
    keeper: env.KEEPER_ACCOUNT && env.KEEPER_KEY ? { account: env.KEEPER_ACCOUNT, key: env.KEEPER_KEY } : undefined,
    observer: outlayerObserver(env),
  };
}

/** OutLayer's HTTPS API for the observer project, when the owner and a payment key are set (INTERFACES.md 15). */
export function outlayerObserver(env: Record<string, string | undefined>): ObserverConfig | undefined {
  if (!env.OUTLAYER_OWNER || !env.OUTLAYER_PAYMENT_KEY) return undefined;
  return {
    kind: "outlayer",
    api: (env.OUTLAYER_API_URL || "https://testnet-api.outlayer.ai").replace(/\/$/, ""),
    owner: env.OUTLAYER_OWNER,
    project: env.OUTLAYER_OBSERVER_PROJECT || "accord-observer",
    paymentKey: env.OUTLAYER_PAYMENT_KEY,
  };
}

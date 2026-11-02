// The local sandbox's stand-in for a wallet (`make serve` only). Every route that uses it answers 404 on any other
// network, so a deployed app has no signing path at all.

import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Account, KeyPair, KeyPairSigner, type KeyPairString } from "near-api-js";
import { accord, config } from "./accord";

interface Principal { account: string; key: string }
interface SandboxFile { principals: Record<string, Principal> }

export function sandboxOnly(): Response | null {
  return config().network === "sandbox" ? null : new Response("not found", { status: 404 });
}

function principals(): Record<string, Principal> {
  const file = path.resolve(process.cwd(), "../target/sandbox/env.json");
  return (JSON.parse(readFileSync(file, "utf8")) as SandboxFile).principals;
}

export function listPrincipals(): { role: string; account: string }[] {
  try {
    return Object.entries(principals()).map(([role, p]) => ({ role, account: p.account }));
  } catch {
    return [];
  }
}

export function sandboxAccount(role: string): Account {
  const p = principals()[role];
  if (!p) throw new Error(`no sandbox principal ${role}`);
  return new Account(p.account, accord().chain.provider, new KeyPairSigner(KeyPair.fromString(p.key as KeyPairString)));
}

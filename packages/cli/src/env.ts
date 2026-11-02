// `.env` loading and `--as` key selection. Secrets are read here and passed to a signer; they are never printed.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export type Env = Record<string, string | undefined>;

/** Parses `KEY=value` lines: comments, blank lines, `export ` prefixes and single or double quotes. */
export function parseDotEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.replace(/^export\s+/, "").match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2]!;
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.length >= 2 && value.endsWith(quote)) {
      value = value.slice(1, -1);
      if (quote === '"') value = value.replace(/\\n/g, "\n");
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }
    out[m[1]!] = value;
  }
  return out;
}

/** The repository root: the nearest directory holding `pnpm-workspace.yaml`. */
export function findRepoRoot(start: string): string | undefined {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const up = dirname(dir);
    if (up === dir) return undefined;
    dir = up;
  }
}

/** Loads `<root>/.env` into `env` without overriding values already set. Returns the file read, if any. */
export function loadDotEnv(env: Env, starts: readonly string[]): string | undefined {
  for (const start of starts) {
    const root = findRepoRoot(start);
    if (!root) continue;
    const file = join(root, ".env");
    if (!existsSync(file)) return undefined;
    for (const [k, v] of Object.entries(parseDotEnv(readFileSync(file, "utf8")))) {
      if (env[k] === undefined) env[k] = v;
    }
    return file;
  }
  return undefined;
}

export const ROLES = ["buyer", "vendor", "authority", "agent", "keeper"] as const;
export type Role = (typeof ROLES)[number];
/** `recipient` is not a `--as` choice; only `accord recycle` signs as the recipient. */
export type Identity = { role: Role | "recipient"; accountId: string; secretKey: string };

const VARS: Record<Role | "recipient", { account: string; key: string }> = {
  buyer: { account: "BUYER_ACCOUNT", key: "BUYER_KEY" },
  vendor: { account: "VENDOR_ACCOUNT", key: "VENDOR_KEY" },
  authority: { account: "AUTHORITY_ACCOUNT", key: "AUTHORITY_KEY" },
  keeper: { account: "KEEPER_ACCOUNT", key: "KEEPER_KEY" },
  recipient: { account: "RECIPIENT_ACCOUNT", key: "RECIPIENT_KEY" },
  // The agent signs as the agreement account itself, with its one function-call key.
  agent: { account: "AGENT_AGREEMENT", key: "ACCORD_AGENT_KEY" },
};

export function parseRole(text: string): Role {
  if ((ROLES as readonly string[]).includes(text)) return text as Role;
  throw new Error(`--as must be one of ${ROLES.join(", ")}`);
}

export function identityVars(role: Role | "recipient"): { account: string; key: string } {
  return VARS[role];
}

/** Picks the account and key for a role from the environment; names the missing variables, never their values. */
export function selectIdentity(role: Role | "recipient", env: Env): Identity {
  const v = VARS[role];
  const accountId = env[v.account]?.trim();
  const secretKey = env[v.key]?.trim();
  const missing = [!accountId && v.account, !secretKey && v.key].filter(Boolean);
  if (missing.length) throw new Error(`--as ${role} needs ${missing.join(" and ")} in .env`);
  if (!/^ed25519:[1-9A-HJ-NP-Za-km-z]+$/.test(secretKey!)) {
    throw new Error(`${v.key} is not an ed25519:<base58> key`);
  }
  return { role, accountId: accountId!, secretKey: secretKey! };
}

/** Every secret-looking value in the environment, so output can be scrubbed of them as a last line of defence. */
export function secretValues(env: Env): string[] {
  return Object.entries(env)
    .filter(([k, v]) => v && v.length >= 8 && /(_KEY|_SECRET|_SALT|^DATABASE_URL)$/.test(k))
    .map(([, v]) => v!);
}

export function redact(text: string, secrets: readonly string[]): string {
  let out = text;
  for (const s of secrets) out = out.split(s).join("<redacted>");
  return out;
}

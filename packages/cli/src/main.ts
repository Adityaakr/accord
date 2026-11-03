#!/usr/bin/env node
// `accord`: loads `.env` from the repository root, then runs one command.

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "./cli.js";
import { realDeps } from "./deps.js";
import { findRepoRoot, loadDotEnv, loadLocalNode } from "./env.js";

const env = process.env as Record<string, string | undefined>;
const here = dirname(fileURLToPath(import.meta.url));
loadDotEnv(env, [process.cwd(), here]);

// `--network sandbox`: the local node `make serve` runs, with the keys it wrote for its own accounts.
// `pnpm … dev -- <args>` passes its own `--` through; a leading one is never a command.
const argv = process.argv.slice(2);
if (argv[0] === "--") argv.shift();
const flag = (name: string) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
if ((flag("network") ?? env.NEAR_NETWORK) === "sandbox") {
  const root = findRepoRoot(process.cwd()) ?? findRepoRoot(here);
  if (!root || !loadLocalNode(env, root, flag("agreement"))) {
    process.stderr.write("error: no local node: run make serve (it writes target/sandbox/env.json)\n");
    process.exit(1);
  }
}

const code = await run(
  argv,
  env,
  { stdout: (t) => process.stdout.write(`${t}\n`), stderr: (t) => process.stderr.write(`${t}\n`) },
  (o) => realDeps({ network: o.network, factory: o.factory, rpc: o.rpc, identity: o.identity, env: o.env }),
);
process.exitCode = code;

#!/usr/bin/env node
// `accord`: loads `.env` from the repository root, then runs one command.

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "./cli.js";
import { realDeps } from "./deps.js";
import { loadDotEnv } from "./env.js";

const env = process.env as Record<string, string | undefined>;
loadDotEnv(env, [process.cwd(), dirname(fileURLToPath(import.meta.url))]);

const code = await run(
  process.argv.slice(2),
  env,
  { stdout: (t) => process.stdout.write(`${t}\n`), stderr: (t) => process.stderr.write(`${t}\n`) },
  (o) => realDeps({ network: o.network, factory: o.factory, rpc: o.rpc, identity: o.identity, env: o.env }),
);
process.exitCode = code;

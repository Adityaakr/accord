import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import path from "node:path";

// The relayer's own key lives in the repository's gitignored .env, beside the contracts' deploy keys. Only the names
// the server's relayer routes read are taken from it, and only when the environment does not already set them.
const RELAYER_VARS = ["RELAYER_ACCOUNT", "RELAYER_KEY", "NEAR_RPC_URL"];
try {
  for (const line of readFileSync(path.resolve(process.cwd(), "../.env"), "utf8").split("\n")) {
    const at = line.indexOf("=");
    const name = line.slice(0, at).trim();
    if (at > 0 && RELAYER_VARS.includes(name) && !process.env[name]) process.env[name] = line.slice(at + 1).trim();
  }
} catch {
  // no repository .env: the relayer routes say they are not configured
}

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // A second instance (e.g. a testnet app beside the sandbox dev server) builds into its own directory.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "standalone",
  // The repository root carries its own CLAUDE.md and AGENTS.md for evaluators; Next must not write others.
  agentRules: false,
};

export default config;

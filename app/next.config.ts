import type { NextConfig } from "next";

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

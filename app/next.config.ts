import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  // The repository root carries its own CLAUDE.md and AGENTS.md for evaluators; Next must not write others.
  agentRules: false,
};

export default config;

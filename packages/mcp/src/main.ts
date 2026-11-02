#!/usr/bin/env node
// `accord-mcp`: stdio by default; `--http <port>` serves streamable HTTP at /mcp on 127.0.0.1 (`--host` to change).

import { createServer } from "node:http";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { realDeps } from "./deps.js";
import { loadDotEnv, secretValues } from "./env.js";
import { buildServer } from "./server.js";
import { envFlags, toolsFor } from "./tools.js";

const env = process.env as Record<string, string | undefined>;
loadDotEnv(env, [process.cwd(), dirname(fileURLToPath(import.meta.url))]);

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const deps = realDeps(env);
const flags = envFlags(env);
const secrets = secretValues(env);
const log = (t: string) => process.stderr.write(`${t}\n`);
log(`accord-mcp · ${toolsFor(flags).length} tools · agent ${deps.agent ? `${deps.agent.agreement} key ${deps.agent.publicKey}` : "off"} · principal ${deps.principal?.account ?? "off"}`);

const httpPort = flag("http");
if (httpPort === undefined) {
  await buildServer(deps, flags, secrets).connect(new StdioServerTransport());
} else {
  const port = Number(httpPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error("--http takes a port number");
  const host = flag("host") ?? "127.0.0.1";
  const allowedHosts = [`${host}:${port}`, `localhost:${port}`, `127.0.0.1:${port}`];
  createServer((req, res) => {
    if (!req.url?.startsWith("/mcp")) {
      res.writeHead(404, { "content-type": "application/json" }).end(JSON.stringify({ error: "not found; use /mcp" }));
      return;
    }
    // Stateless: one server and transport per request.
    const server = buildServer(deps, flags, secrets);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, enableDnsRebindingProtection: true, allowedHosts,
    });
    res.on("close", () => { void transport.close(); void server.close(); });
    server.connect(transport)
      .then(() => transport.handleRequest(req, res))
      .catch((e: unknown) => {
        log(`request failed: ${e instanceof Error ? e.message : String(e)}`);
        if (!res.headersSent) res.writeHead(500).end();
      });
  }).listen(port, host, () => log(`accord-mcp · streamable HTTP on http://${host}:${port}/mcp`));
}

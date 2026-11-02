// Builds the MCP server from the tool list and the dependencies; results are JSON text.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { toolsFor, type EnvFlags, type McpDeps } from "./tools.js";

export function toJson(value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) => (typeof v === "bigint" ? v.toString() : v), 2);
}

export function redact(text: string, secrets: readonly string[]): string {
  let out = text;
  for (const s of secrets) if (s) out = out.split(s).join("<redacted>");
  return out;
}

export function buildServer(deps: McpDeps, flags: EnvFlags, secrets: readonly string[] = []): McpServer {
  const server = new McpServer({ name: "accord", version: "0.1.0" });
  for (const tool of toolsFor(flags)) {
    server.registerTool(tool.name, { description: tool.description, inputSchema: tool.input },
      async (args: Record<string, unknown>): Promise<CallToolResult> => {
        try {
          const value = await tool.run(args, deps);
          return { content: [{ type: "text", text: redact(toJson(value), secrets) }] };
        } catch (e) {
          const message = redact(e instanceof Error ? e.message : String(e), secrets);
          return { isError: true, content: [{ type: "text", text: toJson({ error: message }) }] };
        }
      });
  }
  return server;
}

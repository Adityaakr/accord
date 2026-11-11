// The hosted, keyless MCP endpoint: streamable HTTP over web-standard Request/Response (a Next.js route, Hono,
// Deno, Workers). Stateless: one server and one transport per request, JSON responses, read tools only. No key is
// ever read here, so the payment and principal tools are never registered, whatever the environment holds.

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildServer } from "./server.js";
import { toolsFor, type McpDeps } from "./tools.js";

/** The read-only tool names the hosted endpoint offers (the same as a keyless `accord-mcp`). */
export const HOSTED_TOOLS = toolsFor({ agent: false, principal: false }).map((t) => t.name);

/** CORS for a keyless, read-only endpoint: any origin, no credentials, the MCP headers only. */
export const MCP_CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type, accept, mcp-protocol-version, mcp-session-id, last-event-id",
  "access-control-expose-headers": "mcp-session-id, mcp-protocol-version",
  "access-control-max-age": "86400",
};

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(MCP_CORS)) headers.set(k, v);
  headers.set("cache-control", "no-store");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/** Largest JSON-RPC body accepted; tool inputs are a few account ids. */
export const MAX_BODY_BYTES = 64 * 1024;

/**
 * Answers one MCP request. `deps` must be read-only (`readDeps`): the server is built with no agent and no principal,
 * so even a deps object that carried signers would expose only the read tools.
 */
export async function handleMcpRequest(req: Request, deps: McpDeps): Promise<Response> {
  if (req.method === "OPTIONS") return withCors(new Response(null, { status: 204 }));
  if (req.method === "GET" || req.method === "DELETE") {
    // Stateless and JSON-only: there is no server-to-client stream to open and no session to end.
    return withCors(Response.json(
      { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed: POST JSON-RPC to this endpoint (stateless, read-only)" }, id: null },
      { status: 405, headers: { allow: "POST, OPTIONS" } },
    ));
  }
  const length = Number(req.headers.get("content-length") ?? "0");
  if (length > MAX_BODY_BYTES) {
    return withCors(Response.json({ jsonrpc: "2.0", error: { code: -32600, message: "request too large" }, id: null }, { status: 413 }));
  }
  const readOnly: McpDeps = {
    listAgreements: deps.listAgreements, agreement: deps.agreement, preflight: deps.preflight, verify: deps.verify,
    tokenSymbol: deps.tokenSymbol, tender: deps.tender,
  };
  const server = buildServer(readOnly, { agent: false, principal: false });
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  try {
    await server.connect(transport);
    return withCors(await transport.handleRequest(req));
  } finally {
    // JSON mode: the response is complete once handleRequest resolves.
    void transport.close();
    void server.close();
  }
}

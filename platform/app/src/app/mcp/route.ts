// /app/mcp: the hosted, keyless Accord MCP server (streamable HTTP, stateless, JSON responses). The same nine read
// tools as a keyless `accord-mcp` (packages/mcp), over this app's chain client: tender jobs, list, get, due items, preflight,
// refusals, receipts, verify. No key is read and no tool signs. Any origin may call it (no credentials); each client
// IP gets 60 requests a minute, and the whole endpoint 600, because every tool call is RPC reads.
import { handleMcpRequest, MCP_CORS } from "@accord/mcp/hosted";
import { readDeps } from "@accord/mcp/deps";
import type { McpDeps } from "@accord/mcp/tools";
import { accord, factories } from "@/server/accord";
import { clientIp, takeAll } from "@/server/ratelimit";
import { releaseProof } from "@/server/release";

export const dynamic = "force-dynamic";

let cached: { key: string; deps: McpDeps } | null = null;

function deps(): McpDeps {
  const a = accord();
  const fs = factories();
  const key = `${a.factory}|${fs.join(",")}`;
  if (!cached || cached.key !== key) {
    cached = {
      key,
      deps: readDeps(a, {
        second: fs[1],
        nearAiKey: process.env.NEARAI_API_KEY || undefined,
        archivalRpc: process.env.NEAR_ARCHIVAL_RPC_URL || undefined,
        approvalsUrl: process.env.ACCORD_APPROVALS_URL || undefined,
        releaseProof: releaseProof(),
      }),
    };
  }
  return cached.deps;
}

async function handle(req: Request): Promise<Response> {
  if (req.method !== "OPTIONS") {
    const full = takeAll([
      { key: `mcp:${clientIp(req)}`, max: 60, windowMs: 60_000 },
      { key: "mcp:all", max: 600, windowMs: 60_000 },
    ]);
    if (full) {
      return Response.json({ jsonrpc: "2.0", error: { code: -32000, message: "too many requests; wait a minute" }, id: null },
        { status: 429, headers: { ...MCP_CORS, "retry-after": "30" } });
    }
  }
  return handleMcpRequest(req, deps());
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
export const OPTIONS = handle;

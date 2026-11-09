import { describe, expect, it } from "vitest";
import type { AgreementView, Receipt } from "@accord/sdk";
import { HOSTED_TOOLS, handleMcpRequest } from "../src/hosted.js";
import { guessUnit, type AgreementReader, type McpDeps } from "../src/tools.js";

const AGREEMENT = "a7.accord-v2.testnet";

function deps(symbol?: string): McpDeps {
  const deal = {
    get: async () => ({ token: "tusdc.accord-v1.testnet" }) as unknown as AgreementView,
    receipts: async () => [{ item: 1, amount: "35500000" }] as unknown as Receipt[],
  } as unknown as AgreementReader;
  return {
    listAgreements: async () => [],
    agreement: () => deal,
    preflight: async () => { throw new Error("not used"); },
    verify: async (a) => ({ agreement: a, checks: [{ name: "code", status: "ok", detail: "d" }], ok: 1, partial: 0, failed: 0, notChecked: 0 }),
    ...(symbol ? { tokenSymbol: async () => symbol } : {}),
  };
}

function post(body: unknown): Request {
  return new Request("http://localhost/app/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-06-18" },
    body: JSON.stringify(body),
  });
}

const init = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0" } } };

describe("hosted MCP endpoint", () => {
  it("offers the seven read tools and nothing that signs", () => {
    expect(HOSTED_TOOLS).toEqual([
      "accord_list_agreements", "accord_get_agreement", "accord_due_items", "accord_preflight", "accord_refusals",
      "accord_receipts", "accord_verify",
    ]);
  });
  it("initialize, tools/list and a tool call answer as JSON with CORS", async () => {
    const r1 = await handleMcpRequest(post(init), deps());
    expect(r1.status).toBe(200);
    expect(r1.headers.get("access-control-allow-origin")).toBe("*");
    expect(r1.headers.get("access-control-allow-credentials")).toBeNull();
    expect(((await r1.json()) as { result: { serverInfo: { name: string } } }).result.serverInfo.name).toBe("accord");
    const r2 = await handleMcpRequest(post({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }), deps());
    const tools = ((await r2.json()) as { result: { tools: { name: string }[] } }).result.tools.map((t) => t.name);
    expect(tools).toEqual(HOSTED_TOOLS);
    const r3 = await handleMcpRequest(post({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "accord_verify", arguments: { agreement: AGREEMENT } } }), deps());
    const text = ((await r3.json()) as { result: { content: { text: string }[] } }).result.content[0]!.text;
    expect(JSON.parse(text)).toMatchObject({ agreement: AGREEMENT, ok: 1 });
  });
  it("a payment tool is unknown here", async () => {
    const r = await handleMcpRequest(post({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "accord_pay", arguments: {} } }), deps());
    expect(JSON.stringify(await r.json())).toMatch(/not found|isError/i);
  });
  it("preflight OPTIONS is 204 with CORS; GET is 405", async () => {
    const o = await handleMcpRequest(new Request("http://localhost/app/mcp", { method: "OPTIONS" }), deps());
    expect(o.status).toBe(204);
    expect(o.headers.get("access-control-allow-methods")).toContain("POST");
    expect((await handleMcpRequest(new Request("http://localhost/app/mcp"), deps())).status).toBe(405);
  });
  it("receipts name the agreement token's unit", async () => {
    const call = { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "accord_receipts", arguments: { agreement: AGREEMENT } } };
    const read = async (d: McpDeps) => JSON.parse(((await (await handleMcpRequest(post(call), d)).json()) as { result: { content: { text: string }[] } }).result.content[0]!.text) as { token: { symbol: string } };
    expect((await read(deps("tUSDC"))).token).toEqual({ account: "tusdc.accord-v1.testnet", symbol: "tUSDC", decimals: 6 });
    expect((await read(deps())).token.symbol).toBe("tUSDC");
    expect(guessUnit("3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af")).toBe("USDC");
  });
});

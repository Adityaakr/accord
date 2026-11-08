import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { ActResult, PreflightResult, Rating } from "@accord/sdk";
import { buildServer } from "../src/server.js";
import { TOOLS, envFlags, toolsFor, type McpDeps } from "../src/tools.js";

const AGREEMENT = "a7.accord-v1.testnet";
const READ = [
  "accord_list_agreements", "accord_get_agreement", "accord_due_items", "accord_preflight", "accord_refusals",
  "accord_receipts", "accord_verify",
];
const PAY = ["accord_pay", "accord_request_exception"];
const PRINCIPAL = ["accord_seal_mandate", "accord_approve_terms", "accord_submit_delivery", "accord_propose_recipient"];

function preflightResult(rating: Rating, approvedByBuyer = false): PreflightResult {
  return {
    rating, reasons: rating === "allow" ? [] : [`${rating} reason`], approvedByBuyer,
    signals: {} as PreflightResult["signals"], sources: {} as PreflightResult["sources"],
  };
}

function fakeDeps(rating: Rating, approved = false) {
  const paid: unknown[] = [];
  const deps: McpDeps = {
    listAgreements: async () => [],
    agreement: () => { throw new Error("not used"); },
    preflight: async () => preflightResult(rating, approved),
    verify: async () => ({ agreement: AGREEMENT, checks: [], ok: 0, failed: 0, notChecked: 0 }),
    agent: {
      agreement: AGREEMENT,
      publicKey: "ed25519:AgentPub",
      pay: async (p): Promise<ActResult> => { paid.push(p); return { status: "sent", txHash: "TX" }; },
      requestException: async () => ({ status: "exception_requested", seq: 1 }),
    },
  };
  return { deps, paid };
}

const payArgs = { agreement: AGREEMENT, item: 1, amount: "12000000", recipient: "halcyon-mm.testnet" };
const pay = TOOLS.find((t) => t.name === "accord_pay")!;

describe("tool list per environment", () => {
  it("read tools only, with no keys", () => {
    expect(toolsFor(envFlags({})).map((t) => t.name)).toEqual(READ);
  });
  it("payment tools need both ACCORD_AGENT_KEY and AGENT_AGREEMENT", () => {
    expect(toolsFor(envFlags({ ACCORD_AGENT_KEY: "k" })).map((t) => t.name)).toEqual(READ);
    const names = toolsFor(envFlags({ ACCORD_AGENT_KEY: "k", AGENT_AGREEMENT: AGREEMENT })).map((t) => t.name);
    expect(names.sort()).toEqual([...READ, ...PAY].sort());
  });
  it("principal tools are registered only when both principal variables are set", () => {
    expect(toolsFor(envFlags({ ACCORD_PRINCIPAL_KEY: "k" })).map((t) => t.name)).toEqual(READ);
    expect(toolsFor(envFlags({ ACCORD_PRINCIPAL_ACCOUNT: "b.testnet" })).map((t) => t.name)).toEqual(READ);
    const names = toolsFor(envFlags({ ACCORD_PRINCIPAL_KEY: "k", ACCORD_PRINCIPAL_ACCOUNT: "b.testnet" })).map((t) => t.name);
    expect(names.sort()).toEqual([...READ, ...PRINCIPAL].sort());
  });
  it("the MCP client sees exactly the registered tools", async () => {
    const { deps } = fakeDeps("allow");
    const server = buildServer(deps, { agent: true, principal: false });
    const [a, b] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "0" });
    await Promise.all([server.connect(a), client.connect(b)]);
    const listed = (await client.listTools()).tools.map((t) => t.name);
    expect(listed.sort()).toEqual([...READ, ...PAY].sort());
    await client.close();
  });
});

describe("no tool accepts a key", () => {
  it("no input field name contains key or secret, at any depth", () => {
    const names: string[] = [];
    const walk = (shape: z.ZodRawShape, prefix: string) => {
      for (const [k, v] of Object.entries(shape)) {
        names.push(`${prefix}${k}`);
        let inner: unknown = v;
        while (inner instanceof z.ZodOptional || inner instanceof z.ZodNullable) inner = inner.unwrap();
        if (inner instanceof z.ZodObject) walk(inner.shape as z.ZodRawShape, `${prefix}${k}.`);
      }
    };
    for (const t of TOOLS) walk(t.input, `${t.name}:`);
    expect(names.length).toBeGreaterThan(20);
    const offending = names.filter((n) => /key|secret|private|seed|mnemonic/i.test(n.split(":")[1]!));
    expect(offending).toEqual([]);
  });
});

describe("accord_pay runs preflight first", () => {
  it("block refuses to sign and returns preflight_blocked with reasons", async () => {
    const { deps, paid } = fakeDeps("block");
    const r = await pay.run(payArgs, deps) as ActResult;
    expect(r.status).toBe("preflight_blocked");
    expect(r.reasons).toEqual(["block reason"]);
    expect(paid).toEqual([]);
  });
  it("warn returns needs_human unless the buyer approved the recipient", async () => {
    const warn = fakeDeps("warn");
    expect((await pay.run(payArgs, warn.deps) as ActResult).status).toBe("needs_human");
    expect(warn.paid).toEqual([]);
    const approved = fakeDeps("warn", true);
    expect((await pay.run(payArgs, approved.deps) as ActResult).status).toBe("sent");
    expect(approved.paid).toHaveLength(1);
  });
  it("allow calls the SDK pay", async () => {
    const { deps, paid } = fakeDeps("allow");
    expect((await pay.run(payArgs, deps) as ActResult).status).toBe("sent");
    expect(paid).toEqual([{ item: 1, amount: "12000000", recipient: "halcyon-mm.testnet", memo: undefined }]);
  });
  it("refuses an agreement the agent key does not belong to", async () => {
    const { deps } = fakeDeps("allow");
    await expect(pay.run({ ...payArgs, agreement: "a8.accord-v1.testnet" }, deps)).rejects.toThrow("signs only for");
  });
  it("over MCP: JSON text results, schema-checked input, errors flagged", async () => {
    const { deps, paid } = fakeDeps("block");
    const server = buildServer(deps, { agent: true, principal: false }, ["SECRETVALUE"]);
    const [a, b] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "0" });
    await Promise.all([server.connect(a), client.connect(b)]);
    const r = await client.callTool({ name: "accord_pay", arguments: payArgs });
    const content = r.content as { type: string; text: string }[];
    expect(JSON.parse(content[0]!.text)).toMatchObject({ status: "preflight_blocked", reasons: ["block reason"] });
    const bad = await client.callTool({ name: "accord_pay", arguments: { ...payArgs, amount: "12.5" } });
    expect(bad.isError).toBe(true);
    expect(paid).toEqual([]);
    await client.close();
  });
});

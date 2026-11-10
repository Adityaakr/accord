// /api/check: the query is validated before any RPC call (400 with a plain message); the answer for the recorded a48
// cases is the chain's own record (the SDK's fixtures, run through the wasm as the route runs them); errors map to
// 404, 410, 422 and 503 as the route documents.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NotAnAgreementError, RpcUnavailableError } from "@accord/sdk";
import { BlockUnavailableError, simulatePayment, UnsupportedCodeError, type CheckForm, type PaymentCheck } from "@accord/sdk/check";
import { checkResponse, parseCheckQuery } from "../src/server/checkroute";
import { READ_CORS } from "../src/server/cors";

const never = {
  check: async (): Promise<PaymentCheck> => { throw new Error("the RPC must not be called"); },
  form: async (): Promise<CheckForm> => { throw new Error("the RPC must not be called"); },
};
const q = (s: string) => new URLSearchParams(s);

interface Case { views_at: number; item: number; amount: string; recipient: string; recorded: { verdict: string; code: string | null }; agreement: Record<string, unknown>; items: unknown[] }
const a48 = JSON.parse(readFileSync(new URL("../../packages/sdk/test/fixtures/check/a48.accord-v2.testnet.json", import.meta.url), "utf8")) as {
  agreement: string; code_hash: string; token: { id: string; symbol: string; decimals: number }; cases: Case[];
};

/** A runner over the recorded views: the check the route runs, at the block the record names. */
const recorded = {
  ...never,
  check: async (agreement: string, input: { item: number; amount?: string; recipient?: string }, block?: number) => {
    const c = a48.cases.find((x) => x.views_at === block)!;
    return simulatePayment({ agreement, view: c.agreement, items: c.items, codeHash: a48.code_hash, token: a48.token, block: c.views_at,
      request: { item: input.item, amount: input.amount!, recipient: input.recipient! } });
  },
};

describe("/api/check query", () => {
  it("400s bad input before any RPC call", async () => {
    for (const s of ["", "agreement=bogus..id&item=1", "agreement=a48.accord-v2.testnet&item=-1", "agreement=a48.accord-v2.testnet&item=1.5",
      "agreement=a48.accord-v2.testnet&item=4294967296", "agreement=a48.accord-v2.testnet&item=1&recipient=a%20b",
      `agreement=a48.accord-v2.testnet&item=1&recipient=${"x".repeat(65)}`, "agreement=a48.accord-v2.testnet&item=1&block=abc",
      "agreement=a48.accord-v2.testnet&block=5"]) {
      const r = await checkResponse(q(s), never);
      expect(r.status, s).toBe(400);
      expect(((await r.json()) as { error: string }).error).not.toMatch(/RPC|-32/);
    }
  });
  it("reads item, amount, recipient and block", () => {
    expect(parseCheckQuery(q("agreement=A48.accord-v2.testnet&item=2&amount=12.00&recipient=halcyon-mm.testnet&block=276966762"))).toEqual({
      agreement: "a48.accord-v2.testnet", block: 276966762, input: { item: 2, amount: "12.00", recipient: "halcyon-mm.testnet" },
    });
    expect(parseCheckQuery(q("agreement=a48.accord-v2.testnet"))).toEqual({ agreement: "a48.accord-v2.testnet", input: null, block: undefined });
  });
});

describe("/api/check answers", () => {
  for (const c of a48.cases) {
    it(`a48 at block ${c.views_at}: item ${c.item} to ${c.recipient} is ${c.recorded.code ?? "paid"}, as recorded`, async () => {
      const r = await checkResponse(q(`agreement=${a48.agreement}&item=${c.item}&amount=${c.amount}&recipient=${c.recipient}&block=${c.views_at}`), recorded);
      expect(r.status).toBe(200);
      const body = (await r.json()) as PaymentCheck;
      expect(body.verdict).toBe(c.recorded.verdict);
      expect(body.code).toBe(c.recorded.code);
      expect(body.checked_at_block).toBe(c.views_at);
      expect(body.gates).toHaveLength(6);
      expect(body.approved.token).toBe("tusdc.accord-v1.testnet");
    });
  }
  it("maps the errors", async () => {
    const s = q("agreement=a48.accord-v2.testnet&item=1");
    const fail = (e: Error) => ({ ...never, check: async () => { throw e; } });
    expect((await checkResponse(s, fail(new NotAnAgreementError("a48.accord-v2.testnet")))).status).toBe(404);
    expect((await checkResponse(s, fail(new UnsupportedCodeError("abc")))).status).toBe(422);
    expect((await checkResponse(s, fail(new BlockUnavailableError(5)))).status).toBe(410);
    const busy = await checkResponse(s, fail(new RpcUnavailableError("query", true, 3, { url: "x", error: new Error("429") }, ["x"])));
    expect(busy.status).toBe(503);
  });
  it("is readable from any origin, GET only", () => {
    expect(READ_CORS["access-control-allow-origin"]).toBe("*");
    expect(READ_CORS["access-control-allow-methods"]).toBe("GET, OPTIONS");
  });
});

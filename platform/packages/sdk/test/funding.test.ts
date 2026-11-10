// Funding quotes (src/funding.ts): the request is always dry, EXACT_OUTPUT into native USDC on NEAR, from the named
// source's USDC; 1Click's errors come back as errors; a source that fails does not sink the others.
import { describe, expect, it } from "vitest";
import { FUNDING_SOURCES, NEAR_USDC_ASSET, fundingQuote, fundingQuotes, isFundingSource } from "../src/funding.js";

const ok = (amountIn = "35865131") => ({
  quote: { amountIn, amountInFormatted: "35.865131", minAmountIn: "35506479", amountInUsd: "35.85", amountOut: "35500000", timeEstimate: 35 },
  signature: "ed25519:sig", timestamp: "2026-11-10T20:33:55.938Z",
});
const fake = (status: number, body: unknown, seen: unknown[] = []) =>
  (async (_url: string, init?: RequestInit) => { seen.push(JSON.parse(String(init?.body))); return new Response(JSON.stringify(body), { status }); }) as typeof fetch;

describe("funding quote (NEAR Intents 1Click)", () => {
  it("asks for a dry, exact-output quote into USDC on NEAR and reads the answer", async () => {
    const seen: Record<string, unknown>[] = [];
    const q = await fundingQuote({ amount: 35_500_000n, source: "base", fetch: fake(200, ok(), seen), now: () => 0 });
    expect(seen[0]).toMatchObject({ dry: true, swapType: "EXACT_OUTPUT", destinationAsset: NEAR_USDC_ASSET, originAsset: FUNDING_SOURCES.base.asset, amount: "35500000" });
    expect(q).toMatchObject({ source: "base", amountIn: "35865131", amountOut: "35500000", seconds: 35, signature: "ed25519:sig", dry: true });
  });
  it("refuses a zero amount and passes 1Click's message on", async () => {
    await expect(fundingQuote({ amount: 0n, source: "eth", fetch: fake(200, ok()) })).rejects.toThrow("more than 0");
    await expect(fundingQuote({ amount: 1n, source: "sol", fetch: fake(400, { message: "refundTo is not valid" }) })).rejects.toThrow("1Click: refundTo is not valid");
  });
  it("quotes every source, keeping a failed one as its error", async () => {
    let n = 0;
    const f = (async () => (++n === 2 ? new Response(JSON.stringify({ message: "no route" }), { status: 400 }) : new Response(JSON.stringify(ok()), { status: 200 }))) as typeof fetch;
    const all = await fundingQuotes({ amount: "1000000", fetch: f });
    expect(all).toHaveLength(Object.keys(FUNDING_SOURCES).length);
    expect(all.filter((x) => "error" in x)).toHaveLength(1);
    expect(isFundingSource("base")).toBe(true);
    expect(isFundingSource("toString")).toBe(false);
  });
});

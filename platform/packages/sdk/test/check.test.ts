// The check against the chain's own record. Each fixture (test/fixtures/check/<agreement>.json, written by capture.mjs)
// holds the agreement's views one block before an agent payment or refusal was recorded, and what was recorded: the
// simulation must give the same answer, code for code. Agreements: a48 (release 4: two paid items, a redirect to
// halcyon-markets.testnet refused ERR_PAYEE_MISMATCH, ERR_NOT_DUE before delivery and on the disputed item), a2 on
// Circle USDC (release 4, the same shape), a53 (release 5), a6 and a1.accord-usdc (release 3 code), a11 (the attack:
// redirect, altered amount, canary) and a14 (the open /try room).
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACT_RULES, parseCheckAmount, runCheckWasm, simulatePayment, UnsupportedCodeError } from "../src/check.js";
import { CHECK_WASM_BASE64, CHECK_WASM_SHA256 } from "../src/check-wasm.js";
import { createHash } from "node:crypto";

interface Fixture {
  agreement: string;
  code_hash: string;
  token: { id: string; symbol: string; decimals: number };
  cases: {
    block: number; views_at: number; item: number; amount: string; recipient: string;
    recorded: { verdict: "pay" | "refuse"; code: string | null };
    agreement: Record<string, unknown>; items: unknown[];
  }[];
}

const dir = new URL("./fixtures/check/", import.meta.url);
const fixtures: Fixture[] = readdirSync(dir).filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")) as Fixture);

const sim = (fx: Fixture, c: Fixture["cases"][number], over: Partial<{ item: number; amount: string; recipient: string }> = {}) =>
  simulatePayment({
    agreement: fx.agreement, view: c.agreement, items: c.items, codeHash: fx.code_hash, token: fx.token, block: c.views_at,
    request: { item: c.item, amount: c.amount, recipient: c.recipient, ...over },
  });

describe("check matches what the chain recorded", () => {
  it("has the agreements the brief names", () => {
    const ids = fixtures.map((f) => f.agreement);
    for (const id of ["a48.accord-v2.testnet", "a2.accord-usdc.testnet", "a53.accord-v2.testnet"]) expect(ids).toContain(id);
    expect(fixtures.reduce((n, f) => n + f.cases.length, 0)).toBeGreaterThanOrEqual(20);
  });

  for (const fx of fixtures) {
    for (const c of fx.cases) {
      const what = c.recorded.verdict === "pay" ? "paid" : c.recorded.code;
      it(`${fx.agreement} block ${c.block}: item ${c.item} ${c.amount} to ${c.recipient} was ${what}`, async () => {
        const r = await sim(fx, c);
        expect(r.verdict).toBe(c.recorded.verdict);
        expect(r.code).toBe(c.recorded.code);
        expect(r.checked_at_block).toBe(c.views_at);
        // the first failing gate carries the contract's code
        expect(r.gates.find((g) => g.pass === false)?.code ?? null).toBe(c.recorded.code);
      });
    }
  }
});

describe("check details", () => {
  const a48 = fixtures.find((f) => f.agreement === "a48.accord-v2.testnet")!;
  const redirect = a48.cases.find((c) => c.recorded.code === "ERR_PAYEE_MISMATCH")!;
  const disputed = a48.cases.find((c) => c.item === 3)!;

  it("names the approved recipient and amount beside what was entered", async () => {
    const r = await sim(a48, redirect);
    expect(r.approved).toEqual({ recipient: "halcyon-mm.testnet", amount: "12000000", token: "tusdc.accord-v1.testnet" });
    expect(r.entered.recipient).toBe("halcyon-markets.testnet");
    expect(r.gates[1]).toMatchObject({ name: "recipient", pass: false, code: "ERR_PAYEE_MISMATCH" });
    expect(r.summary).toContain("not the authorised recipient (halcyon-mm.testnet)");
  });

  it("explains a disputed item", async () => {
    const r = await sim(a48, disputed);
    expect(r.gates[3]).toMatchObject({ name: "evidence", pass: false, code: "ERR_NOT_DUE" });
    expect(r.gates[3]!.detail).toContain("disputed");
    expect(r.time_dependent).toBeNull();
  });

  it("the redirect's item, sent to the right recipient at that block, would have been refused as not yet due", async () => {
    const r = await sim(a48, redirect, { recipient: "halcyon-mm.testnet" });
    expect(r.code).toBe("ERR_NOT_DUE");
  });

  it("refuses an altered amount and says what the approved amount is", async () => {
    const pay = a48.cases.find((c) => c.recorded.verdict === "pay")!;
    const r = await sim(a48, pay, { amount: "12000001" });
    expect(r.code).toBe("ERR_AMOUNT_MISMATCH");
    expect(r.gates[4]!.detail).toBe("12.000001 tUSDC differs from the approved 12.00 tUSDC.");
  });

  it("release 4 code rejects a malformed recipient before any gate; release 3 code records a mismatch", async () => {
    const r = await sim(a48, redirect, { recipient: "Halcyon MM" });
    expect(r).toMatchObject({ verdict: "refuse", code: "ERR_BAD_RECIPIENT", panics: true });
    const a6 = fixtures.find((f) => f.agreement === "a6.accord-v2.testnet")!;
    expect(ACT_RULES[a6.code_hash]).toBe("release3");
    const r3 = await sim(a6, a6.cases.find((c) => c.recorded.verdict === "refuse")!, { recipient: "HALCYON-TREASURY.testnet" });
    expect(r3.code).toBe("ERR_PAYEE_MISMATCH");
  });

  it("does not simulate code it does not know", async () => {
    await expect(simulatePayment({
      agreement: "x", view: redirect.agreement, items: redirect.items, codeHash: "unknown", token: a48.token, block: 1,
      request: { item: 1, amount: "1", recipient: "a.testnet" },
    })).rejects.toBeInstanceOf(UnsupportedCodeError);
  });

  it("the wasm answers JSON errors instead of trapping", async () => {
    await expect(runCheckWasm({ nope: true })).rejects.toThrow(/check: missing field/);
  });

  it("the embedded module is the one its hash names", () => {
    expect(createHash("sha256").update(Buffer.from(CHECK_WASM_BASE64, "base64")).digest("hex")).toBe(CHECK_WASM_SHA256);
  });
});

describe("parseCheckAmount", () => {
  it("reads base units and whole-token decimals", () => {
    expect(parseCheckAmount("12000000", 6)).toEqual({ amount: "12000000" });
    expect(parseCheckAmount("12.00", 6)).toEqual({ amount: "12000000" });
    expect(parseCheckAmount("0.000001", 6)).toEqual({ amount: "1" });
    expect(parseCheckAmount("1.0000001", 6)).toHaveProperty("error");
    expect(parseCheckAmount("-1", 6)).toHaveProperty("error");
    expect(parseCheckAmount("1e6", 6)).toHaveProperty("error");
  });
});

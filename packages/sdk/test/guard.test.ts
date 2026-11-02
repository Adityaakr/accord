import { describe, expect, it } from "vitest";
import { guardedPay, type GuardedPayDeps } from "../src/guard.js";
import type { PreflightResult, Signals } from "../src/preflight.js";
import type { Rating } from "../src/types.js";

const signals: Signals = {
  exists: true, is_contract: false, code_changed_30d: "unavailable", age_days: "unavailable", tx_30d: "unavailable",
  prior_payments: 0, reports: 0, blocked: false, canary: false, authorised: true,
};

function pf(rating: Rating, approvedByBuyer = false): PreflightResult {
  const sources = Object.fromEntries(Object.keys(signals).map((k) => [k, "test"])) as PreflightResult["sources"];
  return { rating, reasons: [`reason ${rating}`], signals, approvedByBuyer, sources };
}

function deps(result: PreflightResult) {
  const paid: string[] = [];
  const d: GuardedPayDeps = {
    preflight: async () => result,
    pay: async (agreement) => { paid.push(agreement); return { status: "sent", txHash: "tx1" }; },
  };
  return { d, paid };
}

const req = { item: 1, amount: "1000000", recipient: "r.testnet" };

describe("guardedPay", () => {
  it("block refuses to sign", async () => {
    const { d, paid } = deps(pf("block"));
    const r = await guardedPay(d, "a1.f.testnet", req);
    expect(r.status).toBe("preflight_blocked");
    expect(r.reasons).toEqual(["reason block"]);
    expect(paid).toEqual([]);
  });
  it("warn without the buyer's approval needs a human", async () => {
    const { d, paid } = deps(pf("warn"));
    expect((await guardedPay(d, "a1.f.testnet", req)).status).toBe("needs_human");
    expect(paid).toEqual([]);
  });
  it("warn approved by the buyer pays", async () => {
    const { d, paid } = deps(pf("warn", true));
    expect((await guardedPay(d, "a1.f.testnet", req)).status).toBe("sent");
    expect(paid).toEqual(["a1.f.testnet"]);
  });
  it("allow pays; preflight off skips the check", async () => {
    const a = deps(pf("allow"));
    expect((await guardedPay(a.d, "a1.f.testnet", req)).status).toBe("sent");
    const b = deps(pf("block"));
    expect((await guardedPay(b.d, "a1.f.testnet", req, { preflight: "off" })).status).toBe("sent");
    expect(b.paid).toHaveLength(1);
  });
});

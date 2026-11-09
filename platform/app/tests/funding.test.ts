// Try-it step 2: what is still missing, from the balances and the chosen currency. The visitor's case: an implicit
// account the chain did not know yet (0 NEAR) that Circle's faucet had already paid 20.00 USDC.
import { describe, expect, it } from "vitest";
import { fundingGap, near2, usdc2 } from "../src/lib/funding";
import { onVisibleInterval } from "../src/components/visible";

const NEAR = 10n ** 24n;
const n = (x: bigint) => x.toString();

describe("fundingGap", () => {
  it("Circle USDC in hand, no NEAR: asks for test NEAR only, and says so", () => {
    const g = fundingGap("usdc", { near: "0", ft: "20000000" });
    expect(g).toMatchObject({ funded: false, nearOk: false, tokenOk: true, faucet: "near", button: "Get test NEAR" });
    expect(g.line).toBe("You have 20.00 USDC. Get test NEAR to open the room.");
  });
  it("Circle USDC with neither: NEAR from Accord's faucet, USDC from Circle's", () => {
    const g = fundingGap("usdc", { near: "0", ft: "0" });
    expect(g.faucet).toBe("near");
    expect(g.line).toBe("You have 0.00 USDC. Get at least 18.00 USDC from faucet.circle.com, and test NEAR here.");
  });
  it("Circle USDC with NEAR but too little USDC: no faucet button, only Circle's", () => {
    const g = fundingGap("usdc", { near: n(25n * NEAR / 10n), ft: "5000000" });
    expect(g.faucet).toBeNull();
    expect(g.line).toMatch(/^You have 5\.00 USDC\. Get at least 18\.00 USDC from faucet\.circle\.com/);
  });
  it("test USDC: the faucet sends both", () => {
    expect(fundingGap("default", { near: "0", ft: "0" })).toMatchObject({ faucet: "all", button: "Get test funds", funded: false });
    expect(fundingGap("default", { near: n(3n * NEAR), ft: "0" }).faucet).toBe("all");
  });
  it("is done with 2.32 NEAR (the deposit and create_agreement's prepaid gas) and the preset's ceiling", () => {
    expect(fundingGap("default", { near: n(235n * NEAR / 100n), ft: "40000000" })).toMatchObject({ funded: true, faucet: null, line: null });
    expect(fundingGap("usdc", { near: n(25n * NEAR / 10n), ft: "20000000" }).funded).toBe(true);
    // 2.25 NEAR was measured too little for create_agreement on testnet (cost 2.3009)
    expect(fundingGap("usdc", { near: n(225n * NEAR / 100n), ft: "20000000" }).funded).toBe(false);
  });
  it("formats two decimals", () => {
    expect(usdc2("20000000")).toBe("20.00");
    expect(usdc2("16500000")).toBe("16.50");
    expect(near2(n(25n * NEAR / 10n))).toBe("2.50");
    expect(near2("0")).toBe("0.00");
  });
});

describe("onVisibleInterval", () => {
  it("polls only while visible, and reads once when a hidden tab that missed a turn comes back", async () => {
    let state: DocumentVisibilityState = "visible";
    const listeners: (() => void)[] = [];
    const doc = {
      get visibilityState() { return state; },
      addEventListener: (_: string, f: () => void) => listeners.push(f),
      removeEventListener: () => listeners.splice(0),
    } as unknown as Document;
    let calls = 0;
    const stop = onVisibleInterval(() => { calls++; }, 10, doc);
    await new Promise((r) => setTimeout(r, 35));
    const visibleCalls = calls;
    expect(visibleCalls).toBeGreaterThanOrEqual(2);
    state = "hidden";
    await new Promise((r) => setTimeout(r, 40));
    expect(calls).toBe(visibleCalls);
    state = "visible";
    listeners.forEach((f) => f());
    expect(calls).toBe(visibleCalls + 1);
    stop();
    await new Promise((r) => setTimeout(r, 25));
    expect(calls).toBe(visibleCalls + 1);
  });
});

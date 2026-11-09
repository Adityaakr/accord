// The unit an amount is shown in (lib/units.ts).
import { describe, expect, it } from "vitest";
import { sumBySymbol, unitFor } from "../src/lib/units";

describe("unitFor", () => {
  it("one token: its symbol", () => {
    expect(unitFor(["tUSDC", "tUSDC"])).toBe("tUSDC");
    expect(unitFor(["USDC"])).toBe("USDC");
  });
  it("no rooms: the fallback", () => {
    expect(unitFor([])).toBe("tUSDC");
    expect(unitFor([], "USDC")).toBe("USDC");
  });
  it("a sum across tokens names both, test USDC first", () => {
    expect(unitFor(["USDC", "tUSDC"])).toBe("tUSDC + USDC");
  });
});

describe("sumBySymbol", () => {
  it("one total per token, test USDC first", () => {
    expect(sumBySymbol([{ amount: "12000000", symbol: "USDC" }, { amount: "5000000", symbol: "tUSDC" }, { amount: 1_000_000n, symbol: "tUSDC" }]))
      .toEqual([{ symbol: "tUSDC", amount: 6_000_000n }, { symbol: "USDC", amount: 12_000_000n }]);
    expect(sumBySymbol([])).toEqual([]);
  });
});

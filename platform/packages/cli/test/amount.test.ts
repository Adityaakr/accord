import { describe, expect, it } from "vitest";
import { DEFAULT_ALLOWANCE, parseAmount, parseNear } from "../src/amount.js";

describe("amounts", () => {
  it("parses human USDC into base units", () => {
    expect(parseAmount("12.5")).toBe("12500000");
    expect(parseAmount("12")).toBe("12000000");
    expect(parseAmount("0.000001")).toBe("1");
    expect(parseAmount("1,000.25")).toBe("1000250000");
  });
  it("rejects more decimals than USDC has, negatives and junk", () => {
    expect(() => parseAmount("0.0000001")).toThrow("at most 6 decimals");
    expect(() => parseAmount("-1")).toThrow("not an amount");
    expect(() => parseAmount("1e6")).toThrow("not an amount");
  });
  it("--raw takes whole base units only", () => {
    expect(parseAmount("12000000", { raw: true })).toBe("12000000");
    expect(parseAmount("007", { raw: true })).toBe("7");
    expect(() => parseAmount("12.5", { raw: true })).toThrow("--raw amounts are whole base units");
  });
  it("parses NEAR allowances; the default is 0.5 NEAR", () => {
    expect(parseNear("0.5")).toBe(DEFAULT_ALLOWANCE);
    expect(DEFAULT_ALLOWANCE).toBe((5n * 10n ** 23n).toString());
  });
});

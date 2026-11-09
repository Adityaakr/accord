// Account id checks before /verify navigates (lib/accountid.ts).
import { describe, expect, it } from "vitest";
import { decodeSegment, isAccountId, parseAgreementInput } from "../src/lib/accountid";

describe("isAccountId", () => {
  it("takes NEAR account ids", () => {
    for (const s of ["a6.accord-v2.testnet", "a1.accord-usdc.testnet", "halcyon_demo.testnet", "a230b1f19d52b53460fbdae53beecf11d9dd44486d62fceebe24ebdf53af9299", "near"]) {
      expect(isAccountId(s), s).toBe(true);
    }
  });
  it("refuses anything else", () => {
    for (const s of ["Not An Account!!", "A6.accord-v2.testnet", "a", "a..b", ".a", "a.", "a--b.testnet", "a-.testnet", "x".repeat(65), "a b"]) {
      expect(isAccountId(s), s).toBe(false);
    }
  });
});

describe("parseAgreementInput", () => {
  it("trims and lowercases a valid id", () => {
    expect(parseAgreementInput("  A6.Accord-v2.testnet ")).toEqual({ id: "a6.accord-v2.testnet" });
  });
  it("says why an input is not an id", () => {
    const r = parseAgreementInput("Not An Account!!");
    expect(r).toEqual({ error: expect.stringContaining('"Not An Account!!" is not a NEAR account id') });
    expect(parseAgreementInput("   ")).toEqual({ error: expect.stringContaining("Enter an agreement account") });
  });
});

describe("decodeSegment", () => {
  it("decodes a route segment once, and keeps a malformed one as it is", () => {
    expect(decodeSegment("Not%20An%20Account!!")).toBe("Not An Account!!");
    expect(decodeSegment("a6.accord-v2.testnet")).toBe("a6.accord-v2.testnet");
    expect(decodeSegment("%E0%A4%A")).toBe("%E0%A4%A");
  });
});

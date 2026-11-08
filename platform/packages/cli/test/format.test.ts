import { describe, expect, it } from "vitest";
import type { PreflightResult, VerifyReport } from "@accord/sdk";
import { formatCheck, formatVerify } from "../src/format.js";

const report = (statuses: ("ok" | "partial" | "fail" | "not_checked")[]): VerifyReport => {
  const names = ["code", "keys", "release", "sealed", "model", "payee", "record"];
  const checks = statuses.map((status, i) => ({ name: names[i]!, status, detail: `detail ${names[i]}` }));
  return {
    agreement: "a7.accord-v1.testnet", checks,
    ok: statuses.filter((s) => s === "ok").length,
    partial: statuses.filter((s) => s === "partial").length,
    failed: statuses.filter((s) => s === "fail").length,
    notChecked: statuses.filter((s) => s === "not_checked").length,
  };
};

describe("verify output", () => {
  it("prints the make verify block and the summary line", () => {
    const lines = formatVerify(report(["ok", "ok", "ok"]));
    expect(lines).toEqual([
      "accord verify · a7.accord-v1.testnet",
      "  code      detail code · ok",
      "  keys      detail keys · ok",
      "  release   detail release · ok",
      "verify: 3 checks ok",
    ]);
  });
  it("never prints a not-checked item as ok, and counts failures and not checked", () => {
    const lines = formatVerify(report(["ok", "fail", "not_checked", "ok", "not_checked"]));
    expect(lines[2]).toBe("  keys      detail keys · FAIL");
    expect(lines[3]).toBe("  release   detail release · not checked");
    expect(lines[3]).not.toMatch(/· ok$/);
    expect(lines[5]).toBe("  model     detail model · not checked");
    expect(lines.at(-1)).toBe("verify: 2 checks ok · 1 failed · 2 not checked");
  });
  it("prints a check that ran only in part as partial, never as ok, and counts it", () => {
    const lines = formatVerify(report(["ok", "ok", "not_checked", "ok", "partial"]));
    expect(lines[5]).toBe("  model     detail model · partial");
    expect(lines.at(-1)).toBe("verify: 3 checks ok · 1 partial · 1 not checked");
  });
});

describe("check output", () => {
  const p: PreflightResult = {
    rating: "block",
    reasons: ["not the authorised recipient", "receiver is a contract"],
    approvedByBuyer: false,
    signals: {
      exists: true, is_contract: true, code_changed_30d: "unavailable", age_days: "unavailable", tx_30d: "unavailable",
      prior_payments: 0, reports: 2, foreign_reports: 0, blocked: false, canary: false, authorised: false,
    },
    sources: {
      exists: "NEAR RPC view_account", is_contract: "NEAR RPC view_account code_hash",
      code_changed_30d: "unavailable: no archival RPC", age_days: "unavailable: no keyless indexer",
      tx_30d: "unavailable: no keyless indexer", prior_payments: "factory recipient_stats", reports: "factory reports", foreign_reports: "factory reports, other buyers",
      blocked: "factory blocked (curated list)", canary: "agreement canaries", authorised: "agreement current recipient",
    },
  };
  it("prints rating, every reason and each signal with its source", () => {
    const lines = formatCheck("halcyon-markets.testnet", "a7.accord-v1.testnet", p);
    expect(lines[0]).toBe("accord check · halcyon-markets.testnet · a7.accord-v1.testnet");
    expect(lines[1]).toBe("  rating    block");
    expect(lines[2]).toBe("  reason    not the authorised recipient");
    expect(lines[3]).toBe("  reason    receiver is a contract");
    expect(lines[4]).toBe("  buyer     no approval on record");
    expect(lines).toContain("    authorised        false        agreement current recipient");
    expect(lines).toContain("    code_changed_30d  unavailable  unavailable: no archival RPC");
    expect(lines).toContain("    reports           2            factory reports");
    expect(lines.filter((l) => l.startsWith("    "))).toHaveLength(10);
    expect(lines.at(-1)).toBe("check: block");
  });
});

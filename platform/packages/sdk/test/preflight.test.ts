// Audit L3 F4 (finding 7): a report filed by someone else's agreement (an attacker who is the buyer of its own
// agreement pays the victim's recipient as a canary or a mismatched payee) used to downgrade every other buyer's
// preflight for that recipient, so guardedPay stopped. Fixed: only reports from agreements with the same buyer count
// toward the rating; foreign reports are shown as information.
import { describe, expect, it } from "vitest";
import { preflight } from "../src/preflight.js";

const BUYER = "northwind.testnet";

function accord(reports: { agreement: string; seq: number; at: number }[], buyers: Record<string, string>) {
  const deal = (account: string) => ({
    get: async () => {
      if (account === "a6.accord-v2.testnet") {
        return { factory: "accord-v2.testnet", buyer: BUYER, canaries: [], recipient: { account: "halcyon-mm.testnet" } };
      }
      const buyer = buyers[account];
      if (!buyer) throw new Error(`${account} does not exist`);
      return { factory: "accord-v2.testnet", buyer, canaries: [] };
    },
  });
  const self = {
    factory: "accord-v2.testnet",
    agreement: deal,
    chain: { account: async () => ({ code_hash: "11111111111111111111111111111111" }) },
    onFactory: () => self,
    reports: async () => reports,
    blocked: async () => null,
    recipientStats: async () => ({ all: { payments: 3 }, buyer: { payments: 3 } }),
  };
  return self;
}

describe("cross-agreement report poisoning", () => {
  it("a report from another buyer's agreement is information, not a warning", async () => {
    const a = accord([{ agreement: "a9.accord-v2.testnet", seq: 1, at: 0 }], { "a9.accord-v2.testnet": "attacker.testnet" });
    const r = await preflight(a as never, "a6.accord-v2.testnet", "halcyon-mm.testnet");
    expect(r.rating).toBe("allow");
    expect(r.signals.reports).toBe(0);
    expect(r.signals.foreign_reports).toBe(1);
    expect(r.reasons.join(" ")).toMatch(/other buyers/);
  });

  it("a report from an agreement this buyer is party to still warns", async () => {
    const a = accord(
      [{ agreement: "a3.accord-v2.testnet", seq: 1, at: 0 }, { agreement: "a9.accord-v2.testnet", seq: 2, at: 0 }],
      { "a3.accord-v2.testnet": BUYER, "a9.accord-v2.testnet": "attacker.testnet" },
    );
    const r = await preflight(a as never, "a6.accord-v2.testnet", "halcyon-mm.testnet");
    expect(r.rating).toBe("warn");
    expect(r.signals.reports).toBe(1);
    expect(r.signals.foreign_reports).toBe(1);
  });

  it("a report whose agreement cannot be read counts as foreign", async () => {
    const a = accord([{ agreement: "a404.accord-v2.testnet", seq: 1, at: 0 }], {});
    const r = await preflight(a as never, "a6.accord-v2.testnet", "halcyon-mm.testnet");
    expect(r.rating).toBe("allow");
    expect(r.signals.foreign_reports).toBe(1);
  });
});

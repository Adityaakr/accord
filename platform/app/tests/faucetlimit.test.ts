// The faucet's per-IP limit keys on the address the site's proxy reported, never on a value the visitor chose, and
// its grants fall back to memory when there is no Postgres (the Postgres half is in packages/store/tests/faucet.test.ts).
import { describe, expect, it } from "vitest";
import { clientIp } from "../src/server/clientip";
import { claimGrant, grantsToday, ipHash, releaseGrant, visitorsLeft } from "../src/server/faucetgrant";

const req = (headers: Record<string, string>) => new Request("https://x/app/api/faucet", { method: "POST", headers });

describe("clientIp", () => {
  it("prefers the proxy's x-accord-client-ip", () => {
    expect(clientIp(req({ "x-accord-client-ip": "203.0.113.7", "x-forwarded-for": "1.1.1.1, 203.0.113.9" }))).toBe("203.0.113.7");
  });
  it("otherwise takes the rightmost X-Forwarded-For entry, not the client-chosen leftmost", () => {
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.9" }))).toBe("203.0.113.9");
  });
  it("is local with neither", () => {
    expect(clientIp(req({}))).toBe("local");
  });
});

describe("faucet grants in memory (no DATABASE_URL)", () => {
  it("allows one per account and one per IP a day, and gives a failed drip back", async () => {
    delete process.env.DATABASE_URL;
    const day = "2026-11-09";
    expect(await claimGrant("a.testnet", "203.0.113.1", day)).toBe("granted");
    expect(await claimGrant("a.testnet", "203.0.113.2", day)).toBe("account_used");
    expect(await claimGrant("b.testnet", "203.0.113.1", day)).toBe("ip_used");
    // the refused second account left nothing behind: it can still claim from another network
    expect(await claimGrant("b.testnet", "203.0.113.3", day)).toBe("granted");
    await releaseGrant("a.testnet", "203.0.113.1", day);
    expect(await claimGrant("a.testnet", "203.0.113.1", day)).toBe("granted");
    expect(await claimGrant("a.testnet", "203.0.113.1", "2026-11-10")).toBe("granted");
    expect(await grantsToday(day)).toEqual({ count: 2, durable: false });
  });
  it("stores the IP only as a hash", () => {
    expect(ipHash("203.0.113.1")).toMatch(/^[0-9a-f]{64}$/);
    expect(ipHash("203.0.113.1")).not.toContain("203");
  });
});

describe("visitorsLeft", () => {
  const NEAR = 10n ** 24n;
  it("counts 2.5 NEAR plus gas a visitor, rounded down", () => {
    expect(visitorsLeft(0n)).toBe(0);
    expect(visitorsLeft(25n * NEAR / 10n)).toBe(0);
    expect(visitorsLeft(100n * NEAR)).toBe(39);
  });
});

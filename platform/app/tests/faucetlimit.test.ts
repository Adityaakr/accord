// The faucet's limits: one grant per account a day and FAUCET_PER_IP_PER_DAY per connection. The per-IP limit keys on the address the site's proxy reported, never on a value the visitor chose, and
// its grants fall back to memory when there is no Postgres (the Postgres half is in packages/store/tests/faucet.test.ts).
import { describe, expect, it } from "vitest";
import { clientIp } from "../src/server/clientip";
import { claimGrant, FAUCET_NEAR_TARGET, FAUCET_REFUSAL, faucetEmpty, isFaucetEmptyError, grantsToday, ipHash, perIpPerDay, releaseGrant, visitorsLeft } from "../src/server/faucetgrant";

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
  it("allows one per account a day and up to the IP limit per connection, and gives a failed drip back", async () => {
    delete process.env.DATABASE_URL;
    const day = "2026-11-09";
    expect(await claimGrant("a.testnet", "203.0.113.1", day, 3)).toBe("granted");
    expect(await claimGrant("a.testnet", "203.0.113.2", day, 3)).toBe("account_used");
    // a second and third account behind the same connection still get funds
    expect(await claimGrant("b.testnet", "203.0.113.1", day, 3)).toBe("granted");
    expect(await claimGrant("c.testnet", "203.0.113.1", day, 3)).toBe("granted");
    // the fourth is refused, and leaves nothing behind: it can still claim from another network
    expect(await claimGrant("d.testnet", "203.0.113.1", day, 3)).toBe("ip_used");
    expect(await claimGrant("d.testnet", "203.0.113.3", day, 3)).toBe("granted");
    // a failed drip gives back both the account and its slot on the connection
    await releaseGrant("c.testnet", "203.0.113.1", day);
    expect(await claimGrant("e.testnet", "203.0.113.1", day, 3)).toBe("granted");
    expect(await claimGrant("c.testnet", "203.0.113.4", day, 3)).toBe("granted");
    expect(await claimGrant("a.testnet", "203.0.113.1", "2026-11-10", 3)).toBe("granted");
    expect(await grantsToday(day)).toEqual({ count: 5, durable: false });
  });
  it("stores the IP only as a hash", () => {
    expect(ipHash("203.0.113.1")).toMatch(/^[0-9a-f]{64}$/);
    expect(ipHash("203.0.113.1")).not.toContain("203");
  });
});

describe("perIpPerDay", () => {
  it("is 10 by default and FAUCET_PER_IP_PER_DAY when it is a positive integer", () => {
    expect(perIpPerDay(undefined)).toBe(10);
    expect(perIpPerDay("")).toBe(10);
    expect(perIpPerDay("25")).toBe(25);
    expect(perIpPerDay("0")).toBe(10);
    expect(perIpPerDay("-3")).toBe(10);
    expect(perIpPerDay("2.5")).toBe(10);
    expect(perIpPerDay("lots")).toBe(10);
  });
});

describe("faucet refusals", () => {
  it("are plain sentences", () => {
    expect(FAUCET_REFUSAL.account_used).toBe("This account already received test funds today.");
    expect(FAUCET_REFUSAL.ip_used).toBe("Too many accounts from this connection today. Try again tomorrow, or connect your own wallet.");
    expect(FAUCET_REFUSAL.empty).toBe("The faucet is out of test NEAR for now.");
  });
  it("names an empty faucet in those words, from its own check or the chain's NotEnoughBalance", () => {
    const e = faucetEmpty() as Error & { status?: number };
    expect(e.message).toBe(FAUCET_REFUSAL.empty);
    expect(e.status).toBe(503);
    expect(isFaucetEmptyError(e)).toBe(true);
    expect(isFaucetEmptyError(new Error("Sender faucet.testnet does not have enough balance: NotEnoughBalance"))).toBe(true);
    expect(isFaucetEmptyError(new Error("ERR_NOT_BUYER"))).toBe(false);
    expect(isFaucetEmptyError(null)).toBe(false);
  });
});

describe("visitorsLeft", () => {
  const NEAR = 10n ** 24n;
  it("counts 2.35 NEAR plus gas a visitor, rounded down", () => {
    expect(FAUCET_NEAR_TARGET).toBe(235n * NEAR / 100n);
    expect(visitorsLeft(0n)).toBe(0);
    expect(visitorsLeft(235n * NEAR / 100n)).toBe(0);
    expect(visitorsLeft(100n * NEAR)).toBe(42);
  });
});

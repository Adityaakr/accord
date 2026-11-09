// Faucet grants: one per account and up to a limit per IP each UTC day, claimed together, released when a drip fails, and
// kept in Postgres so a redeploy does not reset them. Without DATABASE_URL the store returns null and the app keeps
// its in-memory limiter. The Postgres half runs when ACCORD_TEST_DATABASE_URL is set.
import { beforeAll, describe, expect, it, vi } from "vitest";

describe("faucet grants without Postgres", () => {
  it("returns null, so the app falls back to memory", async () => {
    delete process.env.DATABASE_URL;
    vi.resetModules();
    const s = await import("../src/index.js");
    expect(await s.claimFaucetGrant("a.testnet", "ip")).toBeNull();
    expect(await s.faucetGrantsOn()).toBeNull();
    await expect(s.releaseFaucetGrant("a.testnet", "ip")).resolves.toBeUndefined();
  });
  it("counts days in UTC", async () => {
    const s = await import("../src/index.js");
    expect(s.faucetDay(new Date("2026-11-09T23:59:59Z"))).toBe("2026-11-09");
    expect(s.faucetDay(new Date("2026-11-10T00:00:00Z"))).toBe("2026-11-10");
  });
});

describe.runIf(!!process.env.ACCORD_TEST_DATABASE_URL)("faucet grants (postgres)", () => {
  let s: typeof import("../src/index.js");
  const run = Math.random().toString(36).slice(2, 8);
  const day = "2026-11-09";

  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.ACCORD_TEST_DATABASE_URL;
    vi.resetModules();
    s = await import("../src/index.js");
  });

  it("grants once per account a day and up to the limit per IP, both or neither", async () => {
    expect(await s.claimFaucetGrant(`a-${run}.testnet`, `ip1-${run}`, day, 2)).toBe("granted");
    expect(await s.claimFaucetGrant(`a-${run}.testnet`, `ip2-${run}`, day, 2)).toBe("account_used");
    // a second account behind the same connection is funded; the third is refused, leaving no account row behind
    expect(await s.claimFaucetGrant(`b-${run}.testnet`, `ip1-${run}`, day, 2)).toBe("granted");
    expect(await s.claimFaucetGrant(`x-${run}.testnet`, `ip1-${run}`, day, 2)).toBe("ip_used");
    expect(await s.claimFaucetGrant(`x-${run}.testnet`, `ip3-${run}`, day, 2)).toBe("granted");
    // a new day starts again
    expect(await s.claimFaucetGrant(`a-${run}.testnet`, `ip1-${run}`, "2026-11-10", 2)).toBe("granted");
  });

  it("serialises claims from one connection, so a burst cannot pass the limit", async () => {
    const out = await Promise.all([0, 1, 2, 3, 4].map((k) => s.claimFaucetGrant(`burst${k}-${run}.testnet`, `ipb-${run}`, day, 2)));
    expect(out.filter((x) => x === "granted")).toHaveLength(2);
    expect(out.filter((x) => x === "ip_used")).toHaveLength(3);
  });

  it("releases a grant whose drip failed", async () => {
    expect(await s.claimFaucetGrant(`c-${run}.testnet`, `ip4-${run}`, day)).toBe("granted");
    await s.releaseFaucetGrant(`c-${run}.testnet`, `ip4-${run}`, day);
    expect(await s.claimFaucetGrant(`c-${run}.testnet`, `ip4-${run}`, day)).toBe("granted");
  });

  it("survives a new process: the grants live in the table, not in memory", async () => {
    vi.resetModules();
    const fresh = await import("../src/index.js");
    expect(await fresh.claimFaucetGrant(`a-${run}.testnet`, `ip9-${run}`, day)).toBe("account_used");
    expect(await fresh.faucetGrantsOn(day)).toBeGreaterThanOrEqual(3);
  });
});

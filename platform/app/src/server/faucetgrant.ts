// The faucet's limit: one drip per account and one per client IP each UTC day. Kept in Postgres through
// @accord/store when DATABASE_URL is set, so a redeploy does not reset it; in this process's memory otherwise
// (local development). The IP is stored as a salted sha256, never as the address. Pure of server-only so it is
// testable.
import { createHash } from "node:crypto";
import { claimFaucetGrant, faucetDay, faucetGrantsOn, releaseFaucetGrant, type FaucetClaim } from "@accord/store";

const YOCTO = 10n ** 24n;
/** The faucet tops a visitor's account up to 2.5 NEAR: the factory's 2 NEAR creation deposit and gas after it. */
export const FAUCET_NEAR_TARGET = (25n * YOCTO) / 10n;

/**
 * How many more visitors the faucet's NEAR covers: each drip sends at most FAUCET_NEAR_TARGET (a new, empty account
 * gets all of it) plus gas for up to two transactions (counted as 0.01 NEAR), so this is a floor; visitors who
 * already hold NEAR take less.
 */
export function visitorsLeft(near: bigint): number {
  return Number(near / (FAUCET_NEAR_TARGET + YOCTO / 100n));
}

const memory = new Set<string>();
const memKey = (day: string, kind: "account" | "ip", subject: string) => `${day}|${kind}|${subject}`;

export function ipHash(ip: string): string {
  return createHash("sha256").update(`faucet|${ip}|${process.env.INBOX_DAILY_SALT ?? "accord-dev-salt"}`).digest("hex");
}

/** Claims today's grant for both the account and the IP, or neither. */
export async function claimGrant(account: string, ip: string, day = faucetDay()): Promise<FaucetClaim> {
  const h = ipHash(ip);
  const stored = await claimFaucetGrant(account, h, day);
  if (stored) return stored;
  if (memory.has(memKey(day, "account", account))) return "account_used";
  if (memory.has(memKey(day, "ip", h))) return "ip_used";
  memory.add(memKey(day, "account", account));
  memory.add(memKey(day, "ip", h));
  return "granted";
}

/** Gives a grant back after a drip that failed before it spent anything. */
export async function releaseGrant(account: string, ip: string, day = faucetDay()): Promise<void> {
  const h = ipHash(ip);
  await releaseFaucetGrant(account, h, day);
  memory.delete(memKey(day, "account", account));
  memory.delete(memKey(day, "ip", h));
}

/** Accounts funded today, and whether that count survives a redeploy. */
export async function grantsToday(day = faucetDay()): Promise<{ count: number; durable: boolean }> {
  const n = await faucetGrantsOn(day);
  if (n !== null) return { count: n, durable: true };
  return { count: [...memory].filter((k) => k.startsWith(`${day}|account|`)).length, durable: false };
}

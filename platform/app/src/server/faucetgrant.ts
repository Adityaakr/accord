// The faucet's limit: one drip per account each UTC day, and up to FAUCET_PER_IP_PER_DAY (default 10) per client IP,
// because visitors behind one office or home connection share an address. Kept in Postgres through
// @accord/store when DATABASE_URL is set, so a redeploy does not reset it; in this process's memory otherwise
// (local development). The IP is stored as a salted sha256, never as the address. Pure of server-only so it is
// testable.
import { createHash } from "node:crypto";
import { claimFaucetGrant, faucetDay, faucetGrantsOn, releaseFaucetGrant, FAUCET_IP_LIMIT_DEFAULT, type FaucetClaim } from "@accord/store";

const YOCTO = 10n ** 24n;

/** What the faucet tells a visitor it cannot fund, in plain words. */
export const FAUCET_REFUSAL = {
  account_used: "This account already received test funds today.",
  ip_used: "Too many accounts from this connection today. Try again tomorrow, or connect your own wallet.",
  empty: "The faucet is out of test NEAR for now.",
} as const;

/** The faucet's NEAR cannot cover a drip: a plain line and a 503, never a raw chain error. */
export function faucetEmpty(): Error {
  return Object.assign(new Error(FAUCET_REFUSAL.empty), { status: 503, faucetEmpty: true });
}

/** Whether a failed transfer means the faucet's own account ran out of NEAR. */
export function isFaucetEmptyError(e: unknown): boolean {
  if ((e as { faucetEmpty?: boolean } | null)?.faucetEmpty) return true;
  const text = e instanceof Error ? `${e.name} ${e.message}` : String(e);
  return /NotEnoughBalance|LackBalanceForState|not enough balance/i.test(text);
}
/**
 * The faucet tops a visitor's account up to 2.35 NEAR: the factory's 2 NEAR creation deposit, plus the prepaid gas
 * bound the network checks before it runs create_agreement (about 0.30 NEAR at the pessimistic gas price, mostly
 * refunded), and a little headroom. No more: a wallet-free visit that leaves before Finish (lib/finish.ts) costs the
 * faucet at most this. 2.25 was measured too low on testnet ("Not enough balance ... cost: 2.3009...").
 */
export const FAUCET_NEAR_TARGET = (235n * YOCTO) / 100n;

/**
 * How many more visitors the faucet's NEAR covers: each drip sends at most FAUCET_NEAR_TARGET (a new, empty account
 * gets all of it) plus gas for up to two transactions (counted as 0.01 NEAR), so this is a floor; visitors who
 * already hold NEAR take less.
 */
export function visitorsLeft(near: bigint): number {
  return Number(near / (FAUCET_NEAR_TARGET + YOCTO / 100n));
}

/** Accounts the faucet funds from one client IP each UTC day: FAUCET_PER_IP_PER_DAY, 10 when unset or not a positive integer. */
export function perIpPerDay(env: string | undefined = process.env.FAUCET_PER_IP_PER_DAY): number {
  const n = Number(env);
  return Number.isInteger(n) && n > 0 ? n : FAUCET_IP_LIMIT_DEFAULT;
}

const memAccounts = new Set<string>();
const memIps = new Map<string, Set<string>>();
const accKey = (day: string, account: string) => `${day}|${account}`;
const ipKey = (day: string, h: string) => `${day}|${h}`;

export function ipHash(ip: string): string {
  return createHash("sha256").update(`faucet|${ip}|${process.env.INBOX_DAILY_SALT ?? "accord-dev-salt"}`).digest("hex");
}

/** Claims today's grant for the account and one of the IP's daily slots, or neither. */
export async function claimGrant(account: string, ip: string, day = faucetDay(), limit = perIpPerDay()): Promise<FaucetClaim> {
  const h = ipHash(ip);
  const stored = await claimFaucetGrant(account, h, day, limit);
  if (stored) return stored;
  if (memAccounts.has(accKey(day, account))) return "account_used";
  const funded = memIps.get(ipKey(day, h)) ?? new Set<string>();
  if (funded.size >= limit) return "ip_used";
  memAccounts.add(accKey(day, account));
  funded.add(account);
  memIps.set(ipKey(day, h), funded);
  return "granted";
}

/** Gives a grant back after a drip that failed before it spent anything. */
export async function releaseGrant(account: string, ip: string, day = faucetDay()): Promise<void> {
  const h = ipHash(ip);
  await releaseFaucetGrant(account, h, day);
  memAccounts.delete(accKey(day, account));
  memIps.get(ipKey(day, h))?.delete(account);
}

/** Accounts funded today, and whether that count survives a redeploy. */
export async function grantsToday(day = faucetDay()): Promise<{ count: number; durable: boolean }> {
  const n = await faucetGrantsOn(day);
  if (n !== null) return { count: n, durable: true };
  return { count: [...memAccounts].filter((k) => k.startsWith(`${day}|`)).length, durable: false };
}

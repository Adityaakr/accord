// Sessions for the app's off-chain writes (organisations, members, invitations, preferences). A person proves their
// account with a NEP-413 signature from their own wallet, checked against the account's keys on chain; the app then
// sets a short-lived httpOnly cookie bound to that account. A session can view and draft. It can never sign a
// transaction: every on-chain action is still signed in the person's wallet.

import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { verifySigned } from "./nep413";

export const SESSION_COOKIE = "accord_session";
export const SESSION_RECIPIENT = "accord-session";
const TTL_SECS = 8 * 3600;
const SKEW_MS = 5 * 60_000;

export const sessionMessage = (account: string, issuedAtMs: number) => `accord:session:v1:${account}:${issuedAtMs}`;

let secret: Buffer | null = null;
/** ACCORD_SESSION_SECRET in production; for local development a random secret kept under app/.data (gitignored). */
function key(): Buffer {
  if (secret) return secret;
  const env = process.env.ACCORD_SESSION_SECRET;
  if (env && env.length >= 32) return (secret = Buffer.from(env));
  const file = path.resolve(process.cwd(), ".data/session-secret");
  if (existsSync(file)) return (secret = readFileSync(file));
  mkdirSync(path.dirname(file), { recursive: true });
  const s = randomBytes(32);
  writeFileSync(file, s, { mode: 0o600 });
  return (secret = s);
}

const sign = (body: string) => createHmac("sha256", key()).update(body).digest("base64url");

function encode(account: string, exp: number): string {
  const body = Buffer.from(JSON.stringify({ a: account, exp })).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(token: string | undefined): string | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const want = Buffer.from(sign(body));
  const got = Buffer.from(mac);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const v = JSON.parse(Buffer.from(body, "base64url").toString()) as { a: string; exp: number };
    return typeof v.a === "string" && v.exp > Date.now() / 1000 ? v.a : null;
  } catch {
    return null;
  }
}

/** The account this browser has proven, or null. */
export async function sessionAccount(): Promise<string | null> {
  return decode((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Checks the signed message and, if it holds, sets the cookie. */
export async function openSession(b: { account: string; public_key: string; signature: string; issued_at: number }): Promise<{ ok: true; expires: number } | { ok: false; error: string }> {
  if (!b.account || !b.public_key || !b.signature || !Number.isFinite(b.issued_at)) return { ok: false, error: "account, public_key, signature and issued_at are required" };
  if (Math.abs(Date.now() - b.issued_at) > SKEW_MS) return { ok: false, error: "the signed message is too old; sign again" };
  const ok = await verifySigned({ account: b.account, publicKey: b.public_key, message: sessionMessage(b.account, b.issued_at), recipient: SESSION_RECIPIENT, signature: b.signature });
  if (!ok) return { ok: false, error: "the signature does not match a full-access key of this account" };
  const exp = Math.floor(Date.now() / 1000) + TTL_SECS;
  (await cookies()).set(SESSION_COOKIE, encode(b.account, exp), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TTL_SECS,
  });
  return { ok: true, expires: exp };
}

/** Sets the session for an account the server has already proven another way (a verified NEAR Auth login). */
export async function openSessionFor(account: string): Promise<number> {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECS;
  (await cookies()).set(SESSION_COOKIE, encode(account, exp), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TTL_SECS,
  });
  return exp;
}

export async function closeSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

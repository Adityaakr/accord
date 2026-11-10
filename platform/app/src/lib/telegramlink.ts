// The one-tap Telegram connect link. Settings > Alerts asks the server for t.me/<bot>?start=<param>; the person taps
// Start in Telegram, the bot receives "/start <param>", and the server reads the organisation out of the param and
// saves that chat. The param is signed (HMAC with a key derived from the bot token) and expires, so nobody can point
// another organisation's alerts at their chat, and a link copied later does nothing. Telegram allows at most 64
// characters from [A-Za-z0-9_-]; this one is 22 (organisation) + the expiry in base 36 + 16 (signature), about 45.
import { createHmac, timingSafeEqual } from "node:crypto";

export const LINK_TTL_SECS = 15 * 60;
const ORG = 22;
const SIG = 16;

const b64 = (b: Buffer) => b.toString("base64url");
const sig = (key: string, body: string) => b64(createHmac("sha256", key).update(`accord-telegram-link.${body}`).digest().subarray(0, 12));

/** A start param for this organisation (a UUID), valid for LINK_TTL_SECS from nowSecs. */
export function makeStart(orgId: string, key: string, nowSecs: number): string {
  const hex = orgId.replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/i.test(hex)) throw new Error("organisation id is not a UUID");
  const org = b64(Buffer.from(hex, "hex"));
  const exp = (nowSecs + LINK_TTL_SECS).toString(36);
  return `${org}${exp}${sig(key, `${org}${exp}`)}`;
}

/** The organisation a start param names, or null when it is malformed, forged or expired. */
export function readStart(param: string, key: string, nowSecs: number): string | null {
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(param)) return null;
  const org = param.slice(0, ORG);
  const exp = param.slice(ORG, -SIG);
  const got = Buffer.from(param.slice(-SIG));
  const want = Buffer.from(sig(key, `${org}${exp}`));
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  if (!/^[0-9a-z]{1,10}$/.test(exp) || parseInt(exp, 36) < nowSecs) return null;
  const hex = Buffer.from(org, "base64url").toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The param of a "/start <param>" or "/start@bot <param>" message, or "" for a bare /start, or null otherwise. */
export function startParam(text: string | undefined): string | null {
  const m = /^\/start(?:@\w+)?(?:\s+(\S+))?\s*$/.exec(text ?? "");
  return m ? (m[1] ?? "") : null;
}

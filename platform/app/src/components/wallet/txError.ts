// Turns what a wallet throws while sending a transaction into one clear line for the page. Some wallets broadcast
// through their own RPC connection and fail there on testnet (Nightly: "Transaction has expired", "the method send_tx
// does not exist", "Exceeded 5 providers"); those get a message that says so and names the wallets that send through
// Accord's relayer instead.

const NETWORK = [
  /transaction has expired/i,
  /send_tx/i,
  /method .* does not exist/i,
  /exceeded \d+ providers/i,
  /-32601/,
  /failed to fetch/i,
  /network ?error/i,
  /timeout|timed out/i,
  /InvalidNonce/,
];
const DECLINED = [
  /user rejected/i, /rejected by user/i, /rejected the request/i, /user (denied|declined|cancel+ed|closed)/i, /cancel+ed by user/i,
  /^cancel+ed$/i, /request (was )?cancel+ed/i, /window (was )?closed/i, /popup (was )?closed/i, /modal (was )?closed/i, /wallet closed/i,
  /\b4001\b/,
];

/** What the page shows when the person closed or declined a wallet request. */
export const CANCELLED = "Wallet request cancelled. Try again when you're ready.";

const ALTERNATIVE = "Try again, or use Meteor or Intear on testnet.";

/** The text inside whatever a wallet threw: an Error, a string, or an RPC-shaped object. */
export function rawWalletError(e: unknown): string {
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object") {
    const o = e as { message?: unknown; error?: unknown; code?: unknown };
    if (typeof o.message === "string") return o.code !== undefined ? `[${String(o.code)}] ${o.message}` : o.message;
    if (o.error !== undefined) return rawWalletError(o.error);
    try { return JSON.stringify(e); } catch { /* fall through */ }
  }
  return String(e);
}

export const isWalletNetworkError = (raw: string) => NETWORK.some((r) => r.test(raw));
export const isWalletDeclined = (raw: string) => DECLINED.some((r) => r.test(raw));

/** One readable line for any wallet request that failed outside a transaction (connecting, signing a message). */
export function friendlyWalletError(e: unknown, wallet = "Your wallet"): string {
  const raw = rawWalletError(e);
  if (isWalletDeclined(raw)) return CANCELLED;
  if (isWalletNetworkError(raw)) return `${wallet} could not reach the network. Try again in a moment.`;
  const reason = raw.replace(/\s+/g, " ").trim().slice(0, 160);
  return reason ? `${wallet} could not complete the request (${reason}). Try again.` : `${wallet} could not complete the request. Try again.`;
}

/** The line to show when `wallet` could not send a transaction on `network`. */
export function walletErrorMessage(e: unknown, wallet: string, network: string): string {
  const raw = rawWalletError(e);
  if (isWalletDeclined(raw)) return `${CANCELLED} Nothing was sent.`;
  if (isWalletNetworkError(raw)) {
    return network === "testnet"
      ? `${wallet} could not send this testnet transaction: its network connection rejected it. ${ALTERNATIVE}`
      : `${wallet} could not send this transaction: its network connection rejected it. Try again.`;
  }
  const reason = raw.replace(/\s+/g, " ").trim().slice(0, 160);
  return `${wallet} could not send this transaction${reason ? ` (${reason})` : ""}. ${network === "testnet" ? ALTERNATIVE : "Try again."}`;
}

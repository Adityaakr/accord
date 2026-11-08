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
const DECLINED = [/user rejected/i, /rejected by user/i, /user (denied|cancel+ed)/i, /cancel+ed by user/i, /^cancel+ed$/i, /window closed/i, /popup closed/i];

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

/** The line to show when `wallet` could not send a transaction on `network`. */
export function walletErrorMessage(e: unknown, wallet: string, network: string): string {
  const raw = rawWalletError(e);
  if (DECLINED.some((r) => r.test(raw))) return `You declined the transaction in ${wallet}. Nothing was sent.`;
  if (isWalletNetworkError(raw)) {
    return network === "testnet"
      ? `${wallet} could not send this testnet transaction: its network connection rejected it. ${ALTERNATIVE}`
      : `${wallet} could not send this transaction: its network connection rejected it. Try again.`;
  }
  const reason = raw.replace(/\s+/g, " ").trim().slice(0, 160);
  return `${wallet} could not send this transaction${reason ? ` (${reason})` : ""}. ${network === "testnet" ? ALTERNATIVE : "Try again."}`;
}

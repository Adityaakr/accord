// Funding an agreement from another chain, quote only: NEAR Intents' 1Click API (https://docs.near-intents.org/)
// prices delivering the agreement's total as native USDC on NEAR from USDC on Base, Ethereum, Arbitrum or Solana.
// Every request is `dry: true`: 1Click returns a signed quote and no deposit address, so nothing is signed or sent
// (platform/CLAUDE.md allows NEAR Intents only as dry quotes). 1Click runs on mainnet only and has no testnet, so for
// a testnet agreement the quote is what funding the same total would cost on mainnet today; the testnet agreement
// itself cannot receive it. Uses `fetch` only, so it runs in the browser, the app server and the CLI.

export const ONECLICK_API = "https://1click.chaindefuser.com/v0";
/** Native USDC on NEAR mainnet, as 1Click names it (Circle's 17208628…, 6 decimals). */
export const NEAR_USDC_ASSET = "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1";

/** Where the money can come from. `refundTo` is a well-formed placeholder: a dry quote never refunds anything. */
export const FUNDING_SOURCES = {
  base: { label: "USDC on Base", asset: "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near", refundTo: "0x1111111111111111111111111111111111111111" },
  eth: { label: "USDC on Ethereum", asset: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near", refundTo: "0x1111111111111111111111111111111111111111" },
  arb: { label: "USDC on Arbitrum", asset: "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near", refundTo: "0x1111111111111111111111111111111111111111" },
  sol: { label: "USDC on Solana", asset: "nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near", refundTo: "So11111111111111111111111111111111111111112" },
} as const;
export type FundingSource = keyof typeof FUNDING_SOURCES;
export const isFundingSource = (s: string): s is FundingSource => Object.prototype.hasOwnProperty.call(FUNDING_SOURCES, s);

export interface FundingQuote {
  source: FundingSource;
  label: string;
  /** Base units of USDC on NEAR to deliver (6 decimals). */
  amountOut: string;
  /** What the sender would deposit on the source chain, and the least 1Click accepts within the slippage. */
  amountIn: string;
  amountInFormatted: string;
  minAmountIn: string;
  amountInUsd: string | null;
  /** 1Click's estimate of the delivery time, in seconds. */
  seconds: number | null;
  /** 1Click's signature over the quote, and when it was made. */
  signature: string;
  timestamp: string;
  dry: true;
}

interface QuoteResponse {
  quote?: { amountIn: string; amountInFormatted: string; minAmountIn: string; amountInUsd?: string; amountOut: string; timeEstimate?: number };
  signature?: string;
  timestamp?: string;
  message?: string;
}

export interface FundingQuoteOptions {
  /** Base units of USDC (6 decimals) to arrive on NEAR: the agreement's total. */
  amount: string | bigint;
  source: FundingSource;
  /** The NEAR account the USDC would arrive at. Does not change the price; a dry quote sends nothing. */
  recipient?: string;
  /** Slippage in basis points (default 100, 1%). */
  slippageBps?: number;
  api?: string;
  fetch?: typeof fetch;
  now?: () => number;
}

/** One dry 1Click quote: what it costs to deliver `amount` USDC on NEAR from `source`. Throws with 1Click's message. */
export async function fundingQuote(o: FundingQuoteOptions): Promise<FundingQuote> {
  const amount = BigInt(o.amount);
  if (amount <= 0n) throw new Error("the amount to fund must be more than 0");
  const src = FUNDING_SOURCES[o.source];
  if (!src) throw new Error(`unknown source ${String(o.source)}; one of ${Object.keys(FUNDING_SOURCES).join(", ")}`);
  const f = o.fetch ?? fetch;
  const now = o.now?.() ?? Date.now();
  const res = await f(`${o.api ?? ONECLICK_API}/quote`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      dry: true,
      swapType: "EXACT_OUTPUT",
      slippageTolerance: o.slippageBps ?? 100,
      originAsset: src.asset,
      depositType: "ORIGIN_CHAIN",
      destinationAsset: NEAR_USDC_ASSET,
      amount: amount.toString(),
      refundTo: src.refundTo,
      refundType: "ORIGIN_CHAIN",
      recipient: o.recipient ?? "intents.near",
      recipientType: "DESTINATION_CHAIN",
      deadline: new Date(now + 30 * 60_000).toISOString(),
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const b = (await res.json().catch(() => ({}))) as QuoteResponse;
  if (!res.ok || !b.quote) throw new Error(`1Click: ${b.message ?? `HTTP ${res.status}`}`);
  return {
    source: o.source,
    label: src.label,
    amountOut: b.quote.amountOut,
    amountIn: b.quote.amountIn,
    amountInFormatted: b.quote.amountInFormatted,
    minAmountIn: b.quote.minAmountIn,
    amountInUsd: b.quote.amountInUsd ?? null,
    seconds: typeof b.quote.timeEstimate === "number" ? b.quote.timeEstimate : null,
    signature: b.signature ?? "",
    timestamp: b.timestamp ?? new Date(now).toISOString(),
    dry: true,
  };
}

/** Quotes from every source at once; a source 1Click cannot quote comes back as its error, not a throw. */
export async function fundingQuotes(o: Omit<FundingQuoteOptions, "source"> & { sources?: FundingSource[] }): Promise<(FundingQuote | { source: FundingSource; label: string; error: string })[]> {
  const sources = o.sources ?? (Object.keys(FUNDING_SOURCES) as FundingSource[]);
  return Promise.all(sources.map((source) => fundingQuote({ ...o, source }).catch((e: unknown) => ({
    source, label: FUNDING_SOURCES[source].label, error: e instanceof Error ? e.message : String(e),
  }))));
}

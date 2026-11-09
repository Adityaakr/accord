// What try-it step 2 still needs before the room can open, from the account's balances and the chosen currency.
// The room needs NEAR for its 2 NEAR deposit and gas, and enough of the settlement token for the buyer preset's
// ceiling: 40 tUSDC from Accord's faucet, or 18 USDC from Circle's (which Accord's faucet cannot send). Pure, so it is
// unit-tested.

const YOCTO = 10n ** 24n;
/** The room's 2 NEAR deposit and gas for the calls after it. */
export const NEAR_NEEDED = 2n * YOCTO + YOCTO / 5n;
/** The buyer preset's ceiling, in the token's 6-decimal units. */
export const TOKEN_NEEDED = { default: 40_000_000n, usdc: 18_000_000n } as const;

export type CurrencyId = keyof typeof TOKEN_NEEDED;

export interface Gap {
  nearOk: boolean;
  tokenOk: boolean;
  /** Both in hand: the room can open. */
  funded: boolean;
  /** What Accord's faucet should send: everything (test USDC rooms), NEAR only (Circle rooms), or nothing. */
  faucet: "all" | "near" | null;
  /** The button's words when the faucet can help. */
  button: string | null;
  /** One plain line about what is still missing, or null when nothing is. */
  line: string | null;
}

/** 2 decimals, from the token's 6-decimal units. */
export const usdc2 = (units: string | bigint): string => (Number(BigInt(units) / 10_000n) / 100).toFixed(2);
/** 2 decimals, from yoctoNEAR. */
export const near2 = (yocto: string | bigint): string => (Number(BigInt(yocto) / 10n ** 21n) / 1000).toFixed(2);

export function fundingGap(currency: CurrencyId, bal: { near: string; ft: string }): Gap {
  const nearOk = BigInt(bal.near) >= NEAR_NEEDED;
  const tokenOk = BigInt(bal.ft) >= TOKEN_NEEDED[currency];
  const funded = nearOk && tokenOk;
  if (funded) return { nearOk, tokenOk, funded, faucet: null, button: null, line: null };
  if (currency === "default") {
    return { nearOk, tokenOk, funded, faucet: "all", button: "Get test funds", line: null };
  }
  // Circle USDC: Accord's faucet sends NEAR only; the USDC comes from faucet.circle.com
  const have = `You have ${usdc2(bal.ft)} USDC.`;
  if (tokenOk) return { nearOk, tokenOk, funded, faucet: "near", button: "Get test NEAR", line: `${have} Get test NEAR to open the room.` };
  const short = `at least ${usdc2(TOKEN_NEEDED.usdc)} USDC`;
  if (nearOk) return { nearOk, tokenOk, funded, faucet: null, button: null, line: `${have} Get ${short} from faucet.circle.com to open the room; your NEAR is enough.` };
  return { nearOk, tokenOk, funded, faucet: "near", button: "Get test NEAR", line: `${have} Get ${short} from faucet.circle.com, and test NEAR here.` };
}

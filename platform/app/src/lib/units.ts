// The unit an amount is shown in, from the agreement's token: test USDC rooms say "tUSDC", Circle USDC rooms say
// "USDC". A total that adds amounts across rooms names every token it adds up, so a sum of test USDC and Circle USDC
// is never shown as one currency. Pure, so it is unit-tested.

/** One unit for a set of amounts: the shared symbol, or every symbol joined when the set mixes tokens. */
export function unitFor(symbols: readonly string[], fallback = "tUSDC"): string {
  const set = [...new Set(symbols)].sort((a, b) => (a === "tUSDC" ? -1 : b === "tUSDC" ? 1 : a.localeCompare(b)));
  if (set.length === 0) return fallback;
  return set.join(" + ");
}

const ORDER = (a: string, b: string) => (a === b ? 0 : a === "tUSDC" ? -1 : b === "tUSDC" ? 1 : a.localeCompare(b));

/** One total per token, test USDC first: amounts in different tokens are never added together. */
export function sumBySymbol(entries: readonly { amount: string | bigint; symbol: string }[]): { symbol: string; amount: bigint }[] {
  const m = new Map<string, bigint>();
  for (const e of entries) m.set(e.symbol, (m.get(e.symbol) ?? 0n) + BigInt(e.amount));
  return [...m.entries()].sort(([a], [b]) => ORDER(a, b)).map(([symbol, amount]) => ({ symbol, amount }));
}

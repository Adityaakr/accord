// Amounts are base-unit strings everywhere; these turn them into what people read.

/** `"12000000"` with 6 decimals → `"12.00"`; never through floats. */
export function formatUnits(amount: string | bigint, decimals = 6, places = 2): string {
  const v = BigInt(amount);
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = (abs % base).toString().padStart(decimals, "0").slice(0, places);
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}${grouped}${places > 0 ? `.${frac}` : ""}`;
}

/** `"12.5"` → `12500000n` (6 decimals). Rejects more decimals than the token has. */
export function parseUnits(text: string, decimals = 6): bigint {
  const m = text.trim().replace(/,/g, "").match(/^(\d+)(?:\.(\d+))?$/);
  if (!m) throw new Error(`not an amount: ${text}`);
  const frac = m[2] ?? "";
  if (frac.length > decimals) throw new Error(`at most ${decimals} decimals`);
  return BigInt(m[1]!) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, "0") || "0");
}

export function formatNear(yocto: string | bigint, places = 3): string {
  return formatUnits(yocto, 24, places);
}

export function shortHash(h: string, n = 8): string {
  return h.length > n ? `${h.slice(0, n)}…` : h;
}

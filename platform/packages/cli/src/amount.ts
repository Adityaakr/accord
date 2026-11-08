// Amount inputs: human USDC (`12.5`) through the SDK's `parseUnits`, or base units with `--raw`.

import { parseUnits } from "@accord/sdk";

export const USDC_DECIMALS = 6;
export const NEAR_DECIMALS = 24;
export { DEFAULT_AGENT_ALLOWANCE as DEFAULT_ALLOWANCE } from "@accord/sdk";

export function parseAmount(text: string, opts: { raw?: boolean; decimals?: number } = {}): string {
  const t = text.trim();
  if (opts.raw) {
    if (!/^\d+$/.test(t)) throw new Error(`--raw amounts are whole base units, got ${text}`);
    return BigInt(t).toString();
  }
  const v = parseUnits(t, opts.decimals ?? USDC_DECIMALS);
  return v.toString();
}

export function parseNear(text: string): string {
  return parseUnits(text, NEAR_DECIMALS).toString();
}

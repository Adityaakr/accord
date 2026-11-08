import { tx } from "./testnet"

/* The attack, as recorded on NEAR testnet: the demonstration agent told to pay a new account (halcyon-markets.testnet)
   instead of the proven recipient. Each was refused by the agreement contract; the hashes are the refused `act`
   transactions (read back from get_refusals and the chain on 9 Nov 2026). Shown on /try while the always-open
   public room's service is not running. */
export type RecordedRefusal = { agreement: string; item: number; amount: string; to: string; code: string; at: string; tx: string; href: string }

const r = (agreement: string, item: number, amount: string, at: string, hash: string): RecordedRefusal =>
  ({ agreement, item, amount, to: "halcyon-markets.testnet", code: "ERR_PAYEE_MISMATCH", at, tx: hash, href: tx(hash) })

export const RECORDED_REFUSALS: RecordedRefusal[] = [
  r("a6.accord-v2.testnet", 2, "13.00 USDC", "2026-11-08T17:04:30Z", "AB9HLnWvkzNL418ygx8AVArinPnAK3jqxt4haAjsk8fs"),
  r("a8.accord-v2.testnet", 2, "12.00 USDC", "2026-11-08T17:48:34Z", "37zUgEoe8jbqnqQQhSe8L1VPBMRrrqXdsDorgDY7cEYL"),
  r("a8.accord-v2.testnet", 3, "6.00 USDC", "2026-11-08T17:53:37Z", "CPirnYdV9J55zsKRkvQkdzFZujXzEYHzkhqo51NBWtm4"),
]

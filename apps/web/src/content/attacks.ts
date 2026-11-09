import { tx } from "./testnet"

/* The attack, as recorded on NEAR testnet: the demonstration agent told to pay an account the vendor never proved,
   to pay a different amount, or to follow a canary instruction. Each was refused by the agreement contract; the
   hashes are the refused `act` transactions, read back from get_refusals and the chain on 9 Nov 2026 (a6 and a8:
   release 3; a10, a11 and a15: release 4, platform/DECISIONS.md sections 26 and 27). Times are UTC. */
export type RecordedRefusal = { agreement: string; item: number; amount: string; to: string; code: string; at: string; tx: string; href: string }

const r = (agreement: string, item: number, amount: string, at: string, hash: string, code = "ERR_PAYEE_MISMATCH", to = "halcyon-markets.testnet"): RecordedRefusal =>
  ({ agreement, item, amount, to, code, at, tx: hash, href: tx(hash) })

export const RECORDED_REFUSALS: RecordedRefusal[] = [
  r("a6.accord-v2.testnet", 2, "13.00 tUSDC", "2026-11-08T17:04:30Z", "AB9HLnWvkzNL418ygx8AVArinPnAK3jqxt4haAjsk8fs"),
  r("a8.accord-v2.testnet", 2, "12.00 tUSDC", "2026-11-08T17:48:34Z", "37zUgEoe8jbqnqQQhSe8L1VPBMRrrqXdsDorgDY7cEYL"),
  r("a8.accord-v2.testnet", 3, "6.00 tUSDC", "2026-11-08T17:53:37Z", "CPirnYdV9J55zsKRkvQkdzFZujXzEYHzkhqo51NBWtm4"),
  r("a10.accord-v2.testnet", 2, "11.00 tUSDC", "2026-11-08T23:04:55Z", "51TQ8no9kPp4P8SDyN77jNZMevLsKaTBH3SufU2SUefu"),
  r("a11.accord-v2.testnet", 1, "15.00 tUSDC", "2026-11-08T23:07:20Z", "HvwpdKDs64sA5zuj37iK8B1N1kKDadh4VoeU8n3LwMSv"),
  r("a11.accord-v2.testnet", 1, "83.00 tUSDC", "2026-11-08T23:07:25Z", "3cTDxHzVH29Uiw6kZceFmuuUkhnBiBp5JYW65bsewLvh", "ERR_AMOUNT_MISMATCH", "halcyon-mm.testnet"),
  r("a11.accord-v2.testnet", 1, "15.00 tUSDC", "2026-11-08T23:07:32Z", "DPpVoMX9KKYXppXvrM6HqorDYsDd9ndQy8YniKDvMsXT", "ERR_CANARY", "halcyon-mm-payments.testnet"),
  r("a15.accord-v2.testnet", 2, "12.00 tUSDC", "2026-11-09T00:21:49Z", "7Cjd6cvxVm8racRQTotSJ1CXh5PHdgEvSzJxYszAbptz"),
]

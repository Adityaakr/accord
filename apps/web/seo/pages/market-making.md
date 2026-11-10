Use case · Market-making agreements

# Put liquidity conditions into the payment decision.

Agree on the market conditions to measure, inspect the observations, and apply the results to the payment rules in the deal room.

[Explore an example agreement](/record) [Run your own deal](/app/try-it)

> Illustrative: The liquidity conditions both sides approved before the engagement.

## Define the measurement before the engagement.

Specify the venue, the maximum spread, the minimum depth within the agreed band, whether both sides must be quoted, the number of observation slots and how many must pass for a period to pay.

## Give each observation a place in the record.

Follow the measurement window, source, result and associated execution evidence. Review gaps and exceptions alongside successful observations.

> Illustrative: One observation slot: the pool's public liquidity, read at a time drawn inside the observer's enclave.

> Illustrative: A period decision: five of six slots passed, so the retainer is eligible.

## Connect the result to the agreement.

Where the approved measurement and release rules are satisfied, the payment becomes eligible for authorization. Where they are not, the room shows what is outstanding and which review process applies.

## What the current version measures.

The observer reads the venue's public liquidity, today Rhea's USDC/wNEAR pool, at times drawn inside the observer's enclave. It measures venue-level liquidity, not the market maker's individual contribution, and does not detect all forms of manipulation, guarantee execution quality or verify legal compliance.

Verification using the market maker's authenticated account data is planned. The hidden times rest on the operator never moving the observer's seed to a build that reveals them. Token loans and option-based compensation are outside the current retainer-focused flow.

> Illustrative: What the current version of a market-making agreement measures, and what is planned.

Measurement record

## Inspect the evidence

Review the observed spread, depth and availability for each measurement window, alongside the result produced by the agreed rules.

### The evidence chain

- 01 Approved conditions The venue, maximum spread, minimum depth, two-sided quoting, slots per period and how many must pass, approved by both companies.

- 02 Observation slot One reading of the venue's public liquidity, at a time drawn inside the observer's enclave.

- 03 Attestation Each observation is signed by the observer's enclave and checked by the agreement before it is recorded.

- 04 Period decision When the approved measurement and release rules are satisfied, the period's payment becomes eligible.

- 05 Payment on NEAR USDC from the agreement's own account to the authorised recipient, or a refusal on the record.

### Observations a56 · 6 of 6 pass

Recorded on NEAR testnet on 10 Nov 2026: [a56.accord-v2.testnet](https://testnet.nearblocks.io/address/a56.accord-v2.testnet), period 1, read from Rhea USDC/wNEAR on NEAR mainnet (each block links its recorded observation). Agreed: spread at most 200 bps, depth at least 25.00 USDC on both sides within 300 bps, 4 of 6 slots.

- 01 [block 223872080](https://testnet.nearblocks.io/txns/DWHLpSyEoATLfBVANmgHWLY8LKqJwQ4QLaTxWbfLphGv) spread 176 bps · depth 36.56 / 55.00 USDC · both sides · pass

- 02 [block 223872216](https://testnet.nearblocks.io/txns/8LRPEr78vL51XMZkFMwSqvnh8aEHh6TTAofq6CWycBij) spread 176 bps · depth 36.56 / 55.00 USDC · both sides · pass

- 03 [block 223872370](https://testnet.nearblocks.io/txns/CyC4kYYweGeTxzE5ebbGNPWdPfuRAzbsZ59PGvf71mrt) spread 176 bps · depth 36.56 / 55.00 USDC · both sides · pass

- 04 [block 223872453](https://testnet.nearblocks.io/txns/2ekPpnWMdYASKb5z1xyCj1mcahQU9EqrcDJe6SCgvULx) spread 176 bps · depth 36.56 / 55.00 USDC · both sides · pass

- 05 [block 223872525](https://testnet.nearblocks.io/txns/EGzVre5Mdyy7MaaiHDcsduHoKnZaGziNnxXqgg7Hj3v1) spread 176 bps · depth 36.56 / 55.00 USDC · both sides · pass

- 06 [block 223872659](https://testnet.nearblocks.io/txns/5gdkJi7wLBxMpqV7d497ETvC9VBQdpvkxfHnqSB6wUHT) spread 176 bps · depth 36.56 / 55.00 USDC · both sides · pass

[6 of 6 passed · threshold 4 · Eligible](https://testnet.nearblocks.io/txns/5yDYDbSz4VVWX1Huy3k5bXu9RdJtmVMzvSYd6424Jz1c); the agent paid [6.00 tUSDC](https://testnet.nearblocks.io/txns/42HuyHX2SPWNbnT7tKKni6WwyKKCK556vmKo3TydVPeD) to halcyon-mm.testnet. On the stricter [a57.accord-v2.testnet](https://testnet.nearblocks.io/address/a57.accord-v2.testnet): 0 of 6 passed · threshold 5 · Withheld, and the agent's payment was refused with [ERR_PERIOD_WITHHELD](https://testnet.nearblocks.io/txns/4W1Ud2GVRPZnJL4uJdyEjAfdB5igT3S1DGTJxxLNcS1Y). The observations measure the venue's liquidity, not the market maker's own orders.

[Inspect the testnet record](/record)

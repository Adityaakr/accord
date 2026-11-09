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

### Observations

No market-making observations are recorded on NEAR testnet yet.

[Inspect the testnet record](/record)

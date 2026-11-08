Agreement types

# Agreement types

Six agreement types share the same controls; the commercial fields and the evidence accepted change. Two are built and shown in the demonstration, four are planned.

## Same controls in every type

Every type runs the same lifecycle, the same scoped agent key, the same recipient binding and the same six payment gates. What changes is the terms' commercial fields and the evidence that makes an item payable (gate 4).

Status `demo` means built and shown in the demonstration. Status `planned` means designed, not built.

## Built

- 01 Vendor contracts and renewals Milestones released on accepted delivery; the reference type. Agreement `a6.accord-v2.testnet` ran it end to end on testnet: `35.50 tUSDC` in 3 items, item 1 paid, a redirect refused, the key revoked. [procurement · demo](https://testnet.nearblocks.io/address/a6.accord-v2.testnet)

- 02 Market-making agreements A retainer period is payable only when enough observations of the venue's public liquidity, taken at hidden times, meet the agreed spread, depth and two-sided quoting. In the demonstration, 4 of 6 readings of Rhea's USDC/wNEAR pool must pass. Its recorded runs are on a local node reading real NEAR mainnet blocks; see [make atlas](/docs/cli#market-making). [market-making · demo](/use-cases/market-making)

## How a market-making period pays

- 01 Hidden slot times Each slot's time is drawn inside the observer's enclave from a seed generated there. Nobody outside the enclave knows it in advance.

- 02 One deterministic sample The observation is the first final NEAR mainnet block at or after the slot time, read from Rhea's DCL pool (`dclv2.ref-labs.near`) with view calls only, signed by the observer's key. Anyone can recompute it from an archival node.

- 03 The contract decides `record_observation` checks the signature and the slot window; `close_period` applies the rule: `Eligible` when at least `pass_threshold` slots passed, `Review` when unobserved slots leave it undecided or observations conflict, `Withheld` otherwise.

- 04 Payment still goes through every gate An `Eligible` period makes its item payable; the payment still needs the authorised recipient and the approved amount. `Review` and `Withheld` periods go to the buyer (`resolve_period`), not to payment.

Limit: the observer measures the venue's liquidity, not the market maker's own orders. The deployer owns the observer's seed and could rebind it to a build that reveals slot times in advance. One venue per agreement, retainer-only.

## Planned

- 01 Agent-to-agent services Buy a service from another company's agent within a weekly amount and a total cap. Evidence: the schedule and cap in the approved terms. planned

- 02 Security remediation The researcher's fee stays in escrow until the agreed regression checks pass on the patch and the named reviewer approves it. planned

- 03 Infrastructure service agreements Monthly capacity pays in full when the agreed monitor's availability and latency meet the agreed levels; a shortfall follows the agreed rule. planned

- 04 Grants and funded milestones Each tranche moves only when two of three named reviewers accept the milestone, and only to the account the grantee has proven it controls. planned

On this page

- Same controls in every type

- Built

- How a market-making period pays

- Planned

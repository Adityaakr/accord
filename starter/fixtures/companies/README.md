# Fictional companies for the demo

Northwind Foundation (a token treasury, the buyer) and Halcyon Markets (a market maker, the vendor) are fictional. Every amount is in USDC base units (6 decimals): `"12000000"` is `12.00 USDC`. The amounts are small because the live demo uses Circle's testnet USDC from its faucet.

- `procurement.*.json`: a buyer ceiling of `40` and target of `32` against a vendor floor of `30` and target of `38`, so a deal near `36` in three milestones of `12` is expected, and a walk-away is possible if the negotiators misjudge.
- `market-making.*.json`: a retainer of `5` to `8` per six-minute demo period, six slots, threshold four, on Rhea's USDC/wNEAR DCL pool on mainnet (read-only). `SET_FROM_PROBE_0_7` is replaced with depth values from `make probe-venue`: the passing agreement uses a depth floor the pool meets most of the time; the stricter agreement (for the `Withheld` period) pairs `market-making.buyer.strict.json` (`max_spread_bps: 30`) with `market-making.vendor.strict.json` (`tightest_spread_bps: 25`, a vendor that overpromises), so the two can agree on a spread a `0.2%` fee pool cannot meet.
- `try.*.json`: the public `/try` room's pair: twelve items of `0.01 USDC` (`120000` base units in all), due an hour apart, over seven days. Both sides accept exactly those terms, so the re-arm can open a new room without anyone (`ARCHITECTURE.md` section 11).
- `halcyon/accord.json`: the domain file, in the list form: the hosted demo's recipient and authority, and the `/try` room's. Serve it at `https://<DEMO_VENDOR_DOMAIN>/.well-known/accord.json`; the real account names from `make setup` replace these.
- Mandate shape and the within-limits rules: `INTERFACES.md` section 6.

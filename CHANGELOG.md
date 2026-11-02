# Changelog

One line per `PROGRESS.md` item, newest last.

- 31 Oct 2026 · 0.11 (part) · repository started from the build kit v7; starter files copied to their places.
- 31 Oct 2026 · 0.7 · `make probe-venue`: Rhea DCL mid, spread and depth at the first final mainnet block after a time, reproduced exactly from archival; depth fixtures set to 150 / 200 USDC.
- 31 Oct 2026 · 0.12 · `make setup` created ten demo accounts through the faucet; three `/try` accounts wait on its rate limit.
- 31 Oct 2026 · 0.4 · keys probe on testnet: an act-only FunctionCall key added by the contract, used once, deleted by revoke; the next call fails at the RPC.
- 3 Nov 2026 · 1.2 to 1.4 · `accord-core` gates, limit checks, terms structure and Atlas rules with unit tests.
- 3 Nov 2026 · 1.6 to 1.10 · agreement contract: sealing and the signed outcome, approvals, funding, recipients with the pinned domain and timelock, the agent key and `act` with the six gates, the refusal log and limit, the payment lock and `resolve_stale_lock`, deliveries, exceptions, claims, `close`, `mutual_close`, Atlas observations and periods; 30 unit tests.
- 3 Nov 2026 · 1.11 · factory and the keyless releases account: releases, `create_agreement` with no `AddKey`, registry, reports, blocklist, recipient stats.
- 3 Nov 2026 · 1.12 · tUSDC test token (NEP-141, NEP-145, mint only with the `testnet` feature).
- 3 Nov 2026 · 1.13 (part) · sandbox suite: 8 tests on a local node (flow, attack, revoke, claim after revoke, failed transfer, close and reserved claim, forged and replayed outputs, Atlas).
- 3 Nov 2026 · 1.14 · `make sandbox`: full procurement flow and one Atlas period, mocked steps marked, `sandbox: all checks passed` in 38 s.
- 3 Nov 2026 · 1.1 · JCS vectors shared by `accord-core` and `@accord/sdk`, reproduced byte for byte; `serde_jcs` replaced by an RFC 8785 writer after the vectors showed it ordering non-BMP keys differently.
- 3 Nov 2026 · 2.1 (part) · `@accord/sdk`: views and every principal and agent call, the sealing client (envelope, ECIES, document key), `preflight` with its signal sources, `verify` with honest `not checked` lines; 18 tests.

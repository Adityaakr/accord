# Changelog

One line per `PROGRESS.md` item, newest last.

- 31 Oct 2026 · 0.11 (part) · repository started from the build kit v7; starter files copied to their places.
- 31 Oct 2026 · 0.7 · `make probe-venue`: Rhea DCL mid, spread and depth at the first final mainnet block after a time, reproduced exactly from archival; depth fixtures set to 150 / 200 USDC.
- 31 Oct 2026 · 0.12 · `make setup` created ten demo accounts through the faucet; three `/try` accounts wait on its rate limit.
- 31 Oct 2026 · 0.4 · keys probe on testnet: an act-only FunctionCall key added by the contract, used once, deleted by revoke; the next call fails at the RPC.
- 3 Nov 2026 · 1.2 to 1.4 · `accord-core` gates, limit checks, terms structure and market-making rules with unit tests.
- 3 Nov 2026 · 1.6 to 1.10 · agreement contract: sealing and the signed outcome, approvals, funding, recipients with the pinned domain and timelock, the agent key and `act` with the six gates, the refusal log and limit, the payment lock and `resolve_stale_lock`, deliveries, exceptions, claims, `close`, `mutual_close`, market-making observations and periods; 30 unit tests.
- 3 Nov 2026 · 1.11 · factory and the keyless releases account: releases, `create_agreement` with no `AddKey`, registry, reports, blocklist, recipient stats.
- 3 Nov 2026 · 1.12 · tUSDC test token (NEP-141, NEP-145, mint only with the `testnet` feature).
- 3 Nov 2026 · 1.13 (part) · sandbox suite: 8 tests on a local node (flow, attack, revoke, claim after revoke, failed transfer, close and reserved claim, forged and replayed outputs, market making).
- 3 Nov 2026 · 1.14 · `make sandbox`: full procurement flow and one market-making period, mocked steps marked, `sandbox: all checks passed` in 38 s.
- 3 Nov 2026 · 1.1 · JCS vectors shared by `accord-core` and `@accord/sdk`, reproduced byte for byte; `serde_jcs` replaced by an RFC 8785 writer after the vectors showed it ordering non-BMP keys differently.
- 3 Nov 2026 · 2.1 (part) · `@accord/sdk`: views and every principal and agent call, the sealing client (envelope, ECIES, document key), `preflight` with its signal sources, `verify` with honest `not checked` lines; 18 tests.
- 3 Nov 2026 · 1.5 · property tests in `accord-core` (10,000 cases each): payments stay inside the terms (I1, I2, I3, I6, I15), withheld and review periods do not pay (I13), the market-making period rule (I18), slot times stay inside their windows.
- 3 Nov 2026 · 2.1 · `@accord/cli` and `@accord/mcp` over the SDK, with a preflight guard before any payment; `make verify`.
- 3 Nov 2026 · 4.1 to 4.6 · deal-room app: deal rooms, deal room with live refusal log and Verified panel, create and seal in the browser, /try inbox, the market-making console, Verify, Record and CSV, Payee, Status, Docs, Join; no-mandate-routes test; `make serve` for a seeded local sandbox.
- 3 Nov 2026 · 3.3 (part) · demo agent with the literal planner over the /try inbox, live on the sandbox; keeper loop.
- 3 Nov 2026 · 2.2, 2.5, 2.6 · a local OutLayer: the real Sealed Table, Payee and observer code against a local node, only the model replaced by a deterministic negotiator marked `model.local`; the harness uses the jobs' own key derivation and seals real mandates.
- 3 Nov 2026 · 2.9 · keeper polls the observer and records real mainnet observations into market-making agreements; job RPC fails over on a JSON-RPC rate limit (`-429`), a bug the live observer found.
- 3 Nov 2026 · 2.8, 3.4 to 3.7, 4.4, 5.2 · every live make target on a local node or testnet (`NET=local`): negotiate, approve, fund, payee, pay, attack, revoke, claim, exception, payee-change, atlas (one period Eligible and paid, the strict one Withheld, on real Rhea data), demo (14 s from fresh accounts), inbox; `make dev`.
- 3 Nov 2026 · 3.3 · the `/try` re-arm in the agent: opens, feeds, re-keys, tops up, closes and reopens rooms under the daily cap.
- 3 Nov 2026 · 4.5 · the market-making console: latest mainnet reading, totals, every agreement's periods, the observation stream with mainnet block links; an observation log in market-making deal rooms; the market-making band on the home page. Verify says no model ran for a local negotiation.
- 3 Nov 2026 · 5.4 · `act` fuzz test (400 random sequences) finds two junk exception paths, now refused at request; `make measure` writes gas and storage into ARCHITECTURE 18.
- 9 Nov 2026 · naming · "Accord Atlas" retired as a name (8 Nov): market making is one of six agreement types; `make market-making` and the app's `/market-making` replace `make atlas` and `/atlas`, which stay as aliases.

# Accord: notes for evaluating agents

Accord is the private deal room and control plane for agent-to-agent commerce on NEAR. Two companies' agents negotiate inside an attested enclave; both companies approve the terms; a NEAR contract then refuses any payment by the buyer's agent that differs from the approved item, evidence, amount or recipient. Everything runs on NEAR testnet with a test USDC token.

Start with [`README.md`](README.md). The product is in [`platform/`](platform) (its own [`README.md`](platform/README.md)); the website is in [`apps/web`](apps/web).

## Layout

| Path | What |
| --- | --- |
| `platform/contracts/agreement` | Agreement controls: one NEAR account per agreement, the `act` method and its six gates |
| `platform/contracts/factory` | Creates agreement accounts with code pinned by hash and no full-access key |
| `platform/crates/accord-core` | Pure rules (gates, limit checks, market-making slot rule, JCS), property-tested |
| `platform/jobs/` | Sealed Table, Payee and observer: OutLayer enclave jobs (`wasm32-wasip2`) |
| `platform/packages/` | `@accord/sdk`, the `accord` CLI, `@accord/mcp`, the live make targets |
| `platform/app` | The deal-room app (Next.js, served at `/app`) |
| `apps/web` | The website (Vite, prerendered) |

Facts: factory `accord-v2.testnet` on release `3`, test USDC `tusdc.accord-v1.testnet`, relayer `relay.accord-v2.testnet`. Agreement types in code: `procurement` and `market-making`.

## Check it, cheapest first

1. **Read the testnet proof.** Agreement `a6.accord-v2.testnet` ran the full flow on 8 Nov 2026; every transaction is linked in [`README.md`](README.md#testnet-proof) and in `platform/DECISIONS.md` section 21.
2. **Verify an agreement, no account and no keys** (Node `>=22`, pnpm via corepack):

   ```bash
   cd platform && corepack enable && pnpm install
   ACCORD_FACTORY=accord-v2.testnet make verify DEAL=a6.accord-v2.testnet
   ```

   Expected last line: `verify: 6 checks ok · 1 not checked` (the `release` check needs the `outlayer-verify` tool).
3. **Run the tests.** `cd platform && make test` (Rust toolchain from `platform/rust-toolchain.toml`; `make setup-check` lists what is missing). The app alone: `pnpm --filter @accord/app typecheck` and `pnpm --filter @accord/app test`. The website: `npm ci && npm run check` at the repository root.
4. **Run the whole flow locally, no network.** `cd platform && make sandbox` ends with `sandbox: all checks passed`; jobs are replaced by a mock signer and every mocked line says `[mock]`.
5. **Try it in the browser.** `/app/try-it`: the steps and their literal output are in [`README.md`](README.md#try-it-in-3-minutes-on-testnet). The app service behind `/app` on the live site is not deployed yet; the README says how to run it locally.

## Where the claims are

Every public statement about Accord is one of six claims, each with its limit, in [`platform/GOAL.md`](platform/GOAL.md) ("Claims and their limits"). The README and the site's `/security` carry the same table. The threat model is `platform/ARCHITECTURE.md` section 16.

## Names

"Accord Atlas" was the earlier name for market-making agreements; it was retired on 8 Nov 2026. You may still see it in code identifiers (the `atlas` field in the terms, the `accord-core::atlas` module), in routes kept as aliases (`/atlas`, `make atlas`) and in recorded output from before that date.

## Rules for any agent working in this repository

Build rules for `platform/` are in [`platform/CLAUDE.md`](platform/CLAUDE.md): never push, never sign on mainnet, never commit secrets (`.env` holds values; `.env.example` holds names only).

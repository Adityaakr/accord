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

Facts: factory `accord-v2.testnet` (test USDC `tusdc.accord-v1.testnet`) and factory `accord-usdc.testnet` (Circle testnet USDC), relayer `relay.accord-v2.testnet`. Agreement types in code: `procurement` and `market-making`.

Release 5 is current on both factories since 10 Nov 2026: release 4's agreement code (the security-review fixes, `platform/DECISIONS.md` sections 25 and 26) on the reviewed enclave job builds (section 33). Agreements keep the release they were created on (a6 release 3, a10 release 4); `make verify DEAL=a52.accord-v2.testnet` checks a release 5 agreement. `make verify DEAL=a10.accord-v2.testnet` (from `platform/`) prints `code hash ECgsrZwy… = release 4` and, with [`outlayer-verify`](https://github.com/out-layer/outlayer-verify) installed, `verify: 6 checks ok · 1 partial` (without it, `release` is `not checked`: `5 checks ok · 1 partial · 1 not checked`), and `make verify-usdc DEAL=a1.accord-usdc.testnet` checks the Circle USDC deal.

## Check it, cheapest first

**Judge it in 5 minutes**

1. Open [/app/try-it](https://accordweb-production.up.railway.app/app/try-it) and choose "Try without a wallet". It runs one deal on testnet, including a refused redirect.
2. Open [/verify](https://accordweb-production.up.railway.app/verify) and enter the agreement id it gives you.
   No funds, no wallet, or the faucet refuses your network: [/app/replay](https://accordweb-production.up.railway.app/app/replay) replays a recorded run (`a32.accord-v2.testnet`) in about 60 seconds, each step with its transaction, and [/app/try](https://accordweb-production.up.railway.app/app/try) is a pre-funded live room where a scam you send is refused on chain.
3. Clone the repo and run `cd platform && corepack enable && pnpm install && make verify DEAL=a10.accord-v2.testnet`.

Then, in more depth:

1. **Read the testnet proof.** Agreement `a6.accord-v2.testnet` ran the full flow on 8 Nov 2026; every transaction is linked in [`README.md`](README.md#testnet-proof) and in `platform/DECISIONS.md` section 21.
2. **Verify an agreement, no account and no keys** (Node `>=22`, pnpm via corepack):

   ```bash
   cd platform && corepack enable && pnpm install
   make verify DEAL=a6.accord-v2.testnet
   ```

   Expected last line: `verify: 6 checks ok · 1 partial` with `outlayer-verify` installed (`cargo install --locked --git https://github.com/out-layer/outlayer-verify --rev 90c27d9d outlayer-verify`), else `verify: 5 checks ok · 1 partial · 1 not checked` (`model` is partial: the nonce is bound in the attestation report, the hardware quote is not checked here; the `release` check runs `outlayer-verify` on the three job runs).
3. **Run the tests.** `cd platform && make test` (Rust toolchain from `platform/rust-toolchain.toml`; `make setup-check` lists what is missing). Without Rust: `pnpm -r typecheck` and `pnpm -r test` (`pnpm install` builds `@accord/sdk` and `@accord/store` first, through the `prepare` script in `platform/package.json`, because the other packages import their built output). The app alone: `pnpm --filter @accord/app typecheck` and `pnpm --filter @accord/app test`. The website: `npm ci && npm run check` at the repository root.
4. **Run the whole flow locally, no network.** `cd platform && make sandbox` ends with `sandbox: all checks passed`; jobs are replaced by a mock signer and every mocked line says `[mock]`.
5. **Try it in the browser.** `/app/try-it`: the steps and their literal output are in [`README.md`](README.md#try-it-in-about-5-minutes-on-testnet). It is live at https://accordweb-production.up.railway.app/app/try-it; the README also says how to run it locally.

## Use from an agent

A keyless, read-only MCP server (7 tools, stdio or HTTP), the `accord` CLI, the TypeScript SDK and `GET https://accordweb-production.up.railway.app/app/api/verify/<agreement>` as JSON. The exact commands are in [`README.md`](README.md#use-from-an-agent).

## Where the claims are

Every public statement about Accord is one of six claims, each with its limit, in [`platform/GOAL.md`](platform/GOAL.md) ("Claims and their limits"). The README and the site's `/security` carry the same table. The threat model is `platform/ARCHITECTURE.md` section 16.

## Names

"Accord Atlas" was the earlier name for market-making agreements; it was retired on 8 Nov 2026. You may still see it in code identifiers (the `atlas` field in the terms, the `accord-core::atlas` module), in routes kept as aliases (`/atlas`, `make atlas`) and in recorded output from before that date.

## Rules for any agent working in this repository

Build rules for `platform/` are in [`platform/CLAUDE.md`](platform/CLAUDE.md): never push, never sign on mainnet, never commit secrets (`.env` holds values; `.env.example` holds names only).

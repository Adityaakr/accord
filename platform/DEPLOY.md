# Deploying the Accord app on Railway

The app (Next.js, `platform/app`) is served under `/app`. It runs as its own Railway service from this repository; the
website service forwards `<site>/app/*` to it, so visitors use one address.

## 1. App service

1. In the Railway project, **New → GitHub repo → this repository** (the same repo as the website).
2. Service **Settings**: keep the root directory at `/` and nothing else to change. The repository's one
   `Dockerfile` builds the app when the service has `ACCORD_NETWORK` set (below) and the website otherwise.
   Set **Deploy → Healthcheck path** to `/app/api/status`. The app image carries `outlayer-verify` (built from commit
   `90c27d9d` in the Dockerfile's Rust stage; the first build compiles it, a few minutes), so `/app/api/verify/<id>` and
   `/app/mcp` report `release ok` (`DECISIONS.md` 32).
3. **Variables** (values from your local `accord-app/.env`; never commit them):

| Variable | Value |
|---|---|
| `ACCORD_NETWORK` | `testnet` |
| `ACCORD_FACTORY` | `accord-v2.testnet` |
| `ACCORD_TOKEN` | `tusdc.accord-v1.testnet` |
| `NEAR_RPC_URL` | `https://test.rpc.fastnear.com` (one URL or a comma-separated list; the public testnet endpoints follow as fallbacks for rate limits and outages, DECISIONS section 28) |
| `RELAYER_ACCOUNT` | the relayer account (`relay.accord-v2.testnet`) |
| `RELAYER_KEY` | the relayer's key |
| `ACCORD_SESSION_SECRET` | a long random string (e.g. `openssl rand -hex 32`) |
| `DATABASE_URL` | add a **Postgres** service and reference its URL (`${{Postgres.DATABASE_URL}}`) |
| `NEXT_PUBLIC_BASE_PATH` | `/app` (default; build-time) |
| `NEARAI_API_KEY` | optional: only for the agent's LLM planner and the verify relay |
| `OUTLAYER_VERIFY_TIMEOUT_MS` | optional: how long one `outlayer-verify` run may take before `release` says not checked (default `30000`); `OUTLAYER_VERIFY_BIN` overrides the binary's path |
| `RESEND_API_KEY` | optional: invite and notification emails |
| `FAUCET_ACCOUNT` | `faucet.accord-v2.testnet`: tops visitors up to 2.35 NEAR and 100 tUSDC on `/app/try-it` |
| `FAUCET_KEY` | the faucet account's key (top it up with testnet NEAR when it runs low) |
| `FAUCET_PER_IP_PER_DAY` | optional: accounts the faucet funds from one client IP each UTC day (default 30; always one per account) |
| `FAUCET_DAILY_BUDGET_NEAR` | optional: the faucet's net NEAR outflow allowed per UTC day, its balance at the day's first check minus its balance now (default 25); past it the faucet refuses with code `budget` and try-it offers the replay and the live room |
| `DEMO_VENDOR_ACCOUNT` | `halcyon-demo.testnet` (the demo counterparty's vendor) |
| `DEMO_VENDOR_KEY` | its key (`VENDOR_KEY` in `accord-app/.env`) |
| `DEMO_AUTHORITY_ACCOUNT` | `halcyon-auth.testnet` |
| `DEMO_AUTHORITY_KEY` | its key (`AUTHORITY_KEY` in `accord-app/.env`) |
| `DEMO_RECIPIENT` | `halcyon-mm.testnet` |
| `DEMO_STRANGER` | `halcyon-markets.testnet` (the account the redirect attempt names) |
| `DEMO_DOMAIN` | `accordweb-production.up.railway.app` or the custom domain `useaccord.tech` (both serve the same Payee file for the demo recipient; the hosted app uses `useaccord.tech`) |
| `DEMO_AGENT_SEED` | a long random string (`openssl rand -hex 32`); the demo agent's per-room keys derive from it |

4. Deploy. Check `https://<app-service>.up.railway.app/app/api/status` returns JSON with a testnet block.

## 2. Website service

On the existing website service, add one variable and redeploy:

| Variable | Value |
|---|---|
| `APP_ORIGIN` | the app service's URL, e.g. `https://accord-app-production.up.railway.app` (no trailing slash) |

The website's server (`apps/web/scripts/serve.mjs`) then proxies `/app` and `/app/*` to it, so
`https://accordweb-production.up.railway.app/app` opens the app. Without `APP_ORIGIN`, `/app` shows a short
"starting up" page that links to Verify.

## 3. Keeper and demo agent

The keeper (`services/keeper`) starts negotiations, activates recipients, polls the observer and closes periods and
agreements. The demo agent (`services/agent`) answers the public `/try` room's inbox with its one key and, with
`AGENT_REARM=on`, keeps that room open (a new key after a revocation, a new room when one is used up). Neither is
needed for `/app/try-it`, where each room runs its own demo agent. Each is one more service from the same repository:

1. **New → GitHub repo → this repository**; keep the root directory at `/`. The same `Dockerfile` builds the platform
   and runs `pnpm --filter @accord/$ACCORD_SERVICE start` when `ACCORD_SERVICE` is set.
2. No public domain and no healthcheck path: neither service listens on a port. Each writes a heartbeat to the
   shared Postgres every loop (`keeper`, `agent`, and `rearm` from the re-arm), which `/app/status` reads.
3. **Variables** (names only; values from your local `.env`):

| Variable | Keeper | Agent | Reuse the app's value |
|---|---|---|---|
| `ACCORD_SERVICE` | `keeper` | `agent` | no |
| `ACCORD_NETWORK` | `testnet` | `testnet` | yes |
| `ACCORD_FACTORY` | `accord-v2.testnet` | `accord-v2.testnet` | yes (the services default to an older factory, so set it) |
| `NEAR_RPC_URL` | optional | optional | yes |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | `${{Postgres.DATABASE_URL}}` | yes: the same Postgres as the app, or `/app/status` sees no heartbeat |
| `KEEPER_ACCOUNT`, `KEEPER_KEY` | required | required with the re-arm (it starts the room's negotiation and activates its recipient) | no |
| `OUTLAYER_OWNER`, `OUTLAYER_PAYMENT_KEY` | optional: observer polling for market making (`docs/build/BLOCKED.md`); off without them | | no |
| `OUTLAYER_API_URL`, `OUTLAYER_OBSERVER_PROJECT` | optional | | no |
| `AGENT_REARM` | | `on` | no |
| `TRY_BUYER_ACCOUNT`, `TRY_BUYER_KEY` | | required with the re-arm | no |
| `TRY_VENDOR_ACCOUNT`, `TRY_VENDOR_KEY` | | required with the re-arm | no |
| `TRY_AUTHORITY_ACCOUNT`, `TRY_AUTHORITY_KEY` | | required with the re-arm | no |
| `TRY_RECIPIENT_ACCOUNT` | | required with the re-arm | no |
| `ACCORD_TOKEN` | | `tusdc.accord-v1.testnet` | yes |
| `DEMO_VENDOR_DOMAIN` | | required with the re-arm: `accordweb-production.up.railway.app`, whose `/.well-known/accord.json` lists `TRY_RECIPIENT_ACCOUNT` (`halcyon-try-mm.testnet`) | no |
| `APP_URL` | | optional: the app's URL | no |
| `BUYER_ACCOUNT`, `BUYER_KEY` | | optional: funds new rooms with test USDC | no |
| `TRY_MAX_ROOMS_PER_DAY`, `TRY_ITEM_INTERVAL_SECS`, `TRY_REARM_SECS` | | optional | no |
| `AGENT_PREFLIGHT` | | optional (`on`) | no |
| `AGENT_AGREEMENT`, `ACCORD_AGENT_KEY` | | optional: one fixed agreement instead of, or as well as, the re-arm | no |

4. Deploy, then open `/app/status`: the keeper's and the agent's heartbeats appear within a minute.

## Notes

- Sign-in is an external NEAR wallet through HOT Connect; there is no email sign-in and no sign-in provider to configure.
- Sessions use an httpOnly cookie on the website's domain (the proxy keeps the original host).
- No key is ever built into the image; every secret is a runtime variable.

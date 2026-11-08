# Deploying the Accord app on Railway

The app (Next.js, `platform/app`) is served under `/app`. It runs as its own Railway service from this repository; the
website service forwards `<site>/app/*` to it, so visitors use one address.

## 1. App service

1. In the Railway project, **New → GitHub repo → this repository** (the same repo as the website).
2. Service **Settings**:
   - **Root directory:** leave it at `/`.
   - **Config-as-code → Railway config file:** `/railway.app.json`. It builds `Dockerfile.app` (the app, from the
     repository root) and health-checks `/app/api/status`. Without it, the root `railway.json` builds the website.
   - (Alternative: root directory `platform`, which uses `platform/railway.json` and `platform/Dockerfile`.)
3. **Variables** (values from your local `accord-app/.env`; never commit them):

| Variable | Value |
|---|---|
| `ACCORD_NETWORK` | `testnet` |
| `ACCORD_FACTORY` | `accord-v2.testnet` |
| `ACCORD_TOKEN` | `tusdc.accord-v1.testnet` |
| `NEAR_RPC_URL` | `https://test.rpc.fastnear.com` |
| `RELAYER_ACCOUNT` | the relayer account (`relay.accord-v2.testnet`) |
| `RELAYER_KEY` | the relayer's key |
| `ACCORD_SESSION_SECRET` | a long random string (e.g. `openssl rand -hex 32`) |
| `DATABASE_URL` | add a **Postgres** service and reference its URL (`${{Postgres.DATABASE_URL}}`) |
| `NEXT_PUBLIC_BASE_PATH` | `/app` (default; build-time) |
| `NEARAI_API_KEY` | optional: only for the agent's LLM planner and the verify relay |
| `NEXT_PUBLIC_NEAR_AUTH_CLIENT_ID` | optional: your own NEAR Auth client for email sign-in on a hosted domain (build-time) |
| `RESEND_API_KEY` | optional: invite and notification emails |
| `FAUCET_ACCOUNT` | `faucet.accord-v2.testnet`: tops visitors up to 2.5 NEAR and 100 tUSDC on `/app/try-it` |
| `FAUCET_KEY` | the faucet account's key (top it up with testnet NEAR when it runs low) |
| `DEMO_VENDOR_ACCOUNT` | `halcyon-demo.testnet` (the demo counterparty's vendor) |
| `DEMO_VENDOR_KEY` | its key (`VENDOR_KEY` in `accord-app/.env`) |
| `DEMO_AUTHORITY_ACCOUNT` | `halcyon-auth.testnet` |
| `DEMO_AUTHORITY_KEY` | its key (`AUTHORITY_KEY` in `accord-app/.env`) |
| `DEMO_RECIPIENT` | `halcyon-mm.testnet` |
| `DEMO_STRANGER` | `halcyon-markets.testnet` (the account the redirect attempt names) |
| `DEMO_DOMAIN` | `accordweb-production.up.railway.app` (serves the Payee file for the demo recipient) |
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

## 3. Optional services

The keeper (`services/keeper`) and the demo agent (`services/agent`) run the scheduled steps and the `/try` room.
They are not needed to use the app. To add one: a service from this repo with root directory `platform`, start command
`pnpm --filter @accord/keeper start` (or `@accord/agent`), and the variables listed in `.env.example`.

## Notes

- Email sign-in (NEAR Auth): the shared testnet client only returns to `http://localhost:3000`. A hosted domain needs
  its own client id (apply at auth.near.org) set as `NEXT_PUBLIC_NEAR_AUTH_CLIENT_ID`.
- Sessions use an httpOnly cookie on the website's domain (the proxy keeps the original host).
- No key is ever built into the image; every secret is a runtime variable.

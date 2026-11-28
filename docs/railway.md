# The hosted demo on Railway

The hosted demo (https://useaccord.tech: the site, the app under `/app`, the try-it faucet and the pre-funded `/try` room) stays up and funded through 1 Jan 2027. It runs on Railway, project `victorious-curiosity`, environment `production`:

| Service | What it runs | Build | Settings that matter |
| --- | --- | --- | --- |
| `@accord/web` | the website, `useaccord.tech` | root `Dockerfile`, build command `npm run build --workspace=@accord/web` | watch paths `/apps/web/**`; restart on failure, 10 retries |
| `accord` | the app under `/app` | root `Dockerfile` | healthcheck `/app/api/status`; restart on failure, 10 retries |
| `accord-keeper` | the keeper | root `Dockerfile` | restart on failure, 10 retries |
| `accord-agent` | the demo agent and the `/try` re-arm | root `Dockerfile` | restart on failure, 10 retries |
| `accord-faucet-refill` | tops up the faucet and the demo accounts | Railpack, uploaded with `railway up`, `node refill.mjs` | cron `0 */2 * * *`, never restarts |
| `Postgres` | the app's store | Railway's Postgres image | volume `postgres-volume`, 50 GB |

Every setting is in [`.railway/railway.ts`](../.railway/railway.ts). Variables are unmanaged: the file never reads or writes one, and they stay as they are on Railway.

## Why the file exists

Railway stops reading Config as Code (`railway.json`, `railway.toml`) on **2026-12-01**. Until then four services took their builder and Dockerfile path from the root `railway.json`. `.railway/railway.ts` is Railway's replacement, Infrastructure as Code. Railway does not read it on deploy: it changes a service only when someone runs `railway config apply`. Merging it changes nothing live.

It was generated with `railway config migrate --variables=unmanaged` on 23 Nov 2026 and corrected against the live services (`railway status --json`):

- `accord-faucet-refill` builds with Railpack from an upload. The migrator proposed `DOCKERFILE` for it because it read this repository's `railway.json`, which that service never used; the file keeps `RAILPACK`.
- The restart policy is written out (`ON_FAILURE`, 10 retries), which is what the live deployments run with.
- `platform/railway.json` was removed: no service read it (all four read the root file), so its `healthcheckTimeout: 120` was never live.

`railway config plan` against production on 23 Nov 2026 printed `Plan: 0 to add, 3 to change, 0 to destroy`: `build.builder (null → "DOCKERFILE")` and `build.dockerfilePath (null → "/Dockerfile")` on `accord-keeper`, `@accord/web` and `accord-agent`. That is the root `railway.json`'s two settings moving onto the services themselves, with the same values. The faucet cron, the healthcheck, the domains, Postgres and its volume showed no change.

## Apply it (before 1 Dec 2026)

From the repository root, on `main` after the merge, logged in with `railway login`:

```bash
npm --prefix .railway ci                       # Railway's TypeScript SDK, pinned in .railway/package.json
railway link -p victorious-curiosity -e production
railway config migrate status                  # lists the services still reading railway.json
railway config migrate cutover                 # clears their config-file path, saves .railway/.cac-migration.json, redeploys
railway config plan                            # expect exactly the 3 changes above and 0 to destroy; anything else: stop
railway config apply
railway config plan                            # expect no changes
```

Then check that https://useaccord.tech and https://useaccord.tech/app/api/status answer, and run the Demo health workflow by hand (Actions, Demo health, Run workflow).

Keep `.railway/.cac-migration.json` until the change has settled: it is what `migrate undo` restores from. After the apply, a follow-up commit deletes the root `railway.json` (never before the cutover: a service whose config path still names a deleted file fails to build).

## Roll it back

- **After the cutover, before 1 Dec 2026:** `railway config migrate undo` writes the saved config-file paths back, so the services read `railway.json` again (it does not start a deployment; redeploy from the dashboard or push). Settings `apply` wrote stay on the services, with the same values as `railway.json`.
- **A setting `apply` got wrong:** fix it in `.railway/railway.ts` (or `git revert` the commit), then `railway config plan` and `railway config apply`. Every setting can also be changed back by hand in the service's Settings in the dashboard.
- **From 1 Dec 2026** Railway no longer reads `railway.json`, so the only way back is the IaC file or the dashboard.

## Health check

[`.github/workflows/demo-health.yml`](../.github/workflows/demo-health.yml), testnet only, no secrets:

- **Every hour (`:17`)**: [`platform/app/e2e/health-probe.mjs`](../platform/app/e2e/health-probe.mjs), no browser and no spend. The site and `/healthz` answer, `/app/try-it` offers "Try without a wallet", `/app/api/status` reads a testnet block and the keeper's, the agent's and the re-arm's heartbeats are under 30 minutes old, `/app/api/verify/a106.accord-v2.testnet` has no failed check, and the faucet holds at least 10 NEAR. It prints one line per check and `health: 6 ok`.
- **Every third hour (`:47`)**: [`platform/app/e2e/try-without-wallet.mjs`](../platform/app/e2e/try-without-wallet.mjs) runs "Try a deal" the way a visitor does, in Chromium, with the faucet's testnet NEAR and test USDC: throwaway key, room, seal, negotiation on OutLayer, approve, fund, delivery, the agent pays item 1, a redirect refused `ERR_PAYEE_MISMATCH`, revoke, Finish (the room's funds and the throwaway account go back to the faucet). This is the check that catches an outside break such as OutLayer's output storage price (16 to 22 Nov 2026, every negotiation ended `No deal`). One retry, so one slow OutLayer answer does not alert. The run backs off instead of hammering: a `429` from `/api/demo-agent` or `/api/demo-counterparty/step` holds that endpoint for its `Retry-After` (exponential with jitter without one), a `502`, `503` or `504` for a bounded exponential wait, and the redirect is asked for again only when the chain shows no refusal of the first (on 28 Nov 2026 a redirect answered `503` had landed each time, and the repeats reached the contract's refusal limit). On 23 Nov 2026 one run against useaccord.tech (`a108.accord-v2.testnet`) passed every step in `270 s` and cost the faucet about `0.17` NEAR net (the 14 test USDC it pays the vendor are minted, `tusdc.accord-v1.testnet` being open mint), so eight runs a day are about `1.4` NEAR, well inside what the refill cron adds.
- **On failure** the workflow opens an issue labelled `demo-health` (or comments on the open one) with a link to the run's logs; when the checks pass again it closes the issue.

Run either by hand with `node platform/app/e2e/health-probe.mjs` (Node 22) or, for the deal, as the comment at the top of `try-without-wallet.mjs` says.

## The faucet

`accord-faucet-refill` runs every 2 hours and logs each watched balance (`faucet.accord-v2.testnet`, `relay.accord-v2.testnet`, `halcyon-demo.testnet`, `northwind-demo.testnet`). On 23 Nov 2026 at 02:01 UTC it logged `faucet.accord-v2.testnet 61.621 NEAR ok`.

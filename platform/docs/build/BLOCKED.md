# BLOCKED.md: what only Adi can do, with exact steps

Each entry names the `PROGRESS.md` item it blocks. Remove an entry when it is done.

## Release 4 (audit fixes): about 30 NEAR for the global contract

Added 9 Nov 2026 (DECISIONS.md 25). Everything up to the publish is done: both factories run the new factory code, and
release 4's three pubkey runs are stored on each. Publishing the new agreement code as a global contract burns about
`50 NEAR`; accord-v2.testnet holds about `21.4 NEAR` above its storage, and the testnet faucet stopped answering.

1. Send `30 NEAR` (testnet) to `accord-v2.testnet`, and `10 NEAR` to `northwind-demo.testnet` (the three proofs create
   three agreements at `2 NEAR` each, and `make negotiate` wants `8 NEAR` free first).
2. Tell me; I run, from `platform/` with the keys from `.env`:
   - `RELEASE_MODE=global RELEASE_VERSION=4 JOBS_FROM_RELEASE=3 TASK_IDS=13987,13988,13989 make deploy-testnet`
     (publishes the global contract `ECgsrZwy…`, `publish_release` 4, `set_current_release` 4 on accord-v2);
   - the same on accord-usdc with `ACCORD_FACTORY=accord-usdc.testnet FACTORY_KEY=$FACTORY_USDC_KEY
     TASK_IDS=13990,13991,13993` (the global contract is then already on chain, so it is not published again);
   - `make check-deploy`, then `make negotiate`, `make finish DEAL=<the new agreement>`, `make attack`, `make revoke`
     and `make verify DEAL=<it>`, and record every transaction in DECISIONS.md 25.

## 2.7 (S1) and audit finding 5: new job builds, and the seed condition only the dashboard can set

Added 9 Nov 2026 (DECISIONS.md 25). The job code on `main` (commit e12adb2 and 8d53aee) serves only agreements of
`accord-v2.testnet` and `accord-usdc.testnet` (`a<n>.<factory>`, the agreement's own view, the factory's
`is_agreement`) and turns an off-curve doc key into a final `BAD_INPUT`. The deployed builds (sealed table `7c832ce9…`,
payee `24071443…`, observer `8240179a…`) do not have it until these steps run. The job cannot enforce S1 itself:
OutLayer gives a job `NEAR_SENDER_ID` = the transaction's signer (https://app.outlayer.ai/docs/https-api, "Environment
Variables in WASM"), never the contract that called `request_execution`, so only the secret's access condition can
restrict who runs `negotiate`.

1. Build the three jobs: `cd platform && cargo build --release --target wasm32-wasip2 -p accord-sealed-table -p accord-payee -p accord-observer`;
   note each `sha256` of `target/wasm32-wasip2/release/accord-{sealed-table,payee,observer}.wasm`.
2. Upload each to FastFS and deploy it as a new version of its project (`accord-v1.testnet/accord-sealed-table`,
   `accord-v1.testnet/accord-payee`, `accord-v1.testnet/accord-observer`), the way builds `1099138a…` and `7c832ce9…`
   went up (DECISIONS.md 19 and 21).
3. Move every secret row to the new build with `outlayer secrets access --build <new sha256>` (the `PROTECTED_*_SEED`
   values are kept, so the signing keys and the mandate key do not change).
4. In the OutLayer dashboard (the CLI 0.2.2 has no Account Pattern), on the Sealed Table's `PROTECTED_SEALED_SEED` and
   `NEARAI_API_KEY`, and on the Payee's `PROTECTED_PAYEE_SEED`, set the condition, with **Direct calls only** ticked:
   `(Account Pattern ^a[0-9]+\.(accord-v2|accord-usdc)\.testnet$ OR Whitelist releases.accord-v2.testnet,
   releases.accord-usdc.testnet) AND One build only <new sha256>`. If the panel offers only one pattern, use
   `^(a[0-9]+|releases)\.(accord-v2|accord-usdc)\.testnet$`. Leave the observer's seed as it is (`allow-all` and the
   build lock): the keeper asks it over HTTPS, and every caller gets the identical signed observation.
5. Tell me the three new hashes. I publish release 5 on both factories with them (`RELEASE_MODE=global RELEASE_VERSION=5
   make deploy-testnet`, then the same with `ACCORD_FACTORY=accord-usdc.testnet FACTORY_KEY=$FACTORY_USDC_KEY`), check
   with a run requested directly (not by an agreement) that OutLayer refuses it before the code starts, run
   `make negotiate`, and then drop the testnet sentence from claim 1's limit (GOAL.md and every copy of the table).

## 3.7: market making on testnet needs an OutLayer payment key

The full procurement flow runs on testnet (`a6.accord-v2.testnet`, DECISIONS 21). `make market-making NET=testnet` asks the
observer through OutLayer's HTTPS API, which needs `OUTLAYER_PAYMENT_KEY` in `.env`; it is not set.

1. `outlayer keys create --project accord-v1.testnet/accord-observer`, then `outlayer keys topup` (top-ups are paid in
   OutLayer's stablecoin, which the testnet accounts do not hold).
2. Put the key (`outlayer keys show`) in `.env` as `OUTLAYER_PAYMENT_KEY=…` and tell me; I run `make market-making NET=testnet`.

## Signed-in app screenshots on testnet

Testnet pages behind sign-in need a real wallet (Meteor or Intear). Sign in once at
http://localhost:3200/signin as `northwind-demo.testnet`; the public Verify page needs no sign-in.

## 4.7: Railway for the hosted app, agent and keeper

The website is live at https://accordweb-production.up.railway.app. **App part done (9 Nov 2026):** the app service is
deployed and `/app/try-it` answers at https://accordweb-production.up.railway.app/app/try-it. Still open: the agent (with re-arm) and keeper services; the steps are in `DEPLOY.md`.

1. Create a Railway project with four services from this repository: `app` (`pnpm --filter @accord/app build && pnpm --filter @accord/app start`), `agent` (`pnpm --filter @accord/agent start`, `AGENT_REARM=on`), `keeper` (`pnpm --filter @accord/keeper start`) and a Postgres plugin.
2. Set on all three: `ACCORD_NETWORK=testnet`, `ACCORD_FACTORY`, `NEAR_RPC_URL`, `DATABASE_URL` (from the plugin). On the agent: the `TRY_*` accounts and keys. On the keeper: `KEEPER_ACCOUNT`, `KEEPER_KEY`, `OUTLAYER_OWNER`, `OUTLAYER_PAYMENT_KEY` (the observer runs through OutLayer's HTTPS API). On the app: `INBOX_DAILY_SALT` (any random string), `APP_URL` (its own public URL).
3. Done: the demo domain is `accordweb-production.up.railway.app`; the Payee proof on `a6.accord-v2.testnet` was made on it.

## Optional: `outlayer-verify` (0.3 f, `make verify` "release" line)

`outlayer-cli` 0.2.2 is installed and logged in on testnet as `accord-v1.testnet` (8 Nov). The verifier was not installed:
the agent's install from git was refused by the session's permission policy (code from an outside repository), so
Adi runs it once in a terminal:

```
cargo install --git https://github.com/out-layer/outlayer-verify outlayer-verify
```


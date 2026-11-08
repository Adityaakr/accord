# BLOCKED.md: what only Adi can do, with exact steps

Each entry names the `PROGRESS.md` item it blocks. Remove an entry when it is done.

## 3.7: market making on testnet needs an OutLayer payment key

The full procurement flow runs on testnet (`a6.accord-v2.testnet`, DECISIONS 21). `make market-making NET=testnet` asks the
observer through OutLayer's HTTPS API, which needs `OUTLAYER_PAYMENT_KEY` in `.env`; it is not set.

1. `outlayer keys create --project accord-v1.testnet/accord-observer`, then `outlayer keys topup` (top-ups are paid in
   OutLayer's stablecoin, which the testnet accounts do not hold).
2. Put the key (`outlayer keys show`) in `.env` as `OUTLAYER_PAYMENT_KEY=…` and tell me; I run `make market-making NET=testnet`.

## Signed-in app screenshots on testnet

Testnet pages behind sign-in need a real wallet (Meteor or Intear). Sign in once at
http://localhost:3200/signin as `northwind-demo.testnet`; the public Verify page needs no sign-in.

## Rotate the NEAR AI key after the hackathon

The key in `.env` was pasted into a chat on 3 Nov. After 14 Nov, create a new key at https://cloud.near.ai, put it in `.env` and in the Sealed Table's OutLayer secret, and delete the old one.

## 4.7: Railway for the hosted app, agent and keeper

The website is live at https://accordweb-production.up.railway.app. The app service is not deployed yet, so `/app` answers
`503` with a "starting up" page; the current steps are in `DEPLOY.md`.

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


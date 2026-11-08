# BLOCKED.md: what only Adi can do, with exact steps

Each entry names the `PROGRESS.md` item it blocks. Remove an entry when it is done.

## 3.7: market making on testnet needs an OutLayer payment key

The full procurement flow runs on testnet (`a6.accord-v2.testnet`, DECISIONS 21). `make atlas NET=testnet` asks the
observer through OutLayer's HTTPS API, which needs `OUTLAYER_PAYMENT_KEY` in `.env`; it is not set.

1. Create a payment key for `accord-v1.testnet` in OutLayer's dashboard (https://outlayer.fastnear.com, testnet) and fund it.
2. Put it in `.env` as `OUTLAYER_PAYMENT_KEY=…` and tell me; I run `make atlas NET=testnet`.

## Signed-in app screenshots on testnet

Testnet pages behind sign-in need a real wallet (Meteor or Intear) or NEAR Auth on port 3000. Sign in once at
http://localhost:3200/signin as `northwind-demo.testnet`; the public Verify page needs no sign-in.

## Rotate the NEAR AI key after the hackathon

The key in `.env` was pasted into a chat on 3 Nov. After 14 Nov, create a new key at https://cloud.near.ai, put it in `.env` and in the Sealed Table's OutLayer secret, and delete the old one.

## 4.7: Railway for the hosted app, agent and keeper

1. Create a Railway project with four services from this repository: `app` (`pnpm --filter @accord/app build && pnpm --filter @accord/app start`), `agent` (`pnpm --filter @accord/agent start`, `AGENT_REARM=on`), `keeper` (`pnpm --filter @accord/keeper start`) and a Postgres plugin.
2. Set on all three: `ACCORD_NETWORK=testnet`, `ACCORD_FACTORY`, `NEAR_RPC_URL`, `DATABASE_URL` (from the plugin). On the agent: the `TRY_*` accounts and keys. On the keeper: `KEEPER_ACCOUNT`, `KEEPER_KEY`, `OUTLAYER_OWNER`, `OUTLAYER_PAYMENT_KEY` (the observer runs through OutLayer's HTTPS API). On the app: `INBOX_DAILY_SALT` (any random string), `APP_URL` (its own public URL).
3. Send me the app's public host: it goes into the Payee job's `DEMO_DOMAINS` before release 1 (2.7), so proofs from the app's demo domain say `demo_domain: true`.

## Optional: `outlayer-verify` (0.3 f, `make verify` "release" line)

`outlayer-cli` 0.2.2 is installed and logged in on testnet as `accord-v1.testnet` (8 Nov). The verifier was not installed:
the agent's install from git was refused by the session's permission policy (code from an outside repository), so
Adi runs it once in a terminal:

```
cargo install --git https://github.com/out-layer/outlayer-verify outlayer-verify
```


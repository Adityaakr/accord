# BLOCKED.md: what only Adi can do, with exact steps

Each entry names the `PROGRESS.md` item it blocks. Remove an entry when it is done.

## 0.2 and 2.3: NEAR AI Cloud credits (completions return HTTP 402) · now the only blocker for the testnet flow

8 Nov: release 1 is live on testnet (`accord-v2.testnet`). The keeper's `start_negotiation` on `a1.accord-v2.testnet`
(tx `7qa1KeESA1Wwj5jQHmLbxwmntk7qVkKiqzPhesBNjFxP`) ran the Sealed Table in OutLayer's enclave with its seed and the
NEAR AI key attached; the job read both sealed mandates from chain and returned a signed `"outcome": "infrastructure"`
because NEAR AI answered `HTTP 402 no_limit_configured`. Approve, fund, pay, attack and revoke on testnet all start from
attested terms, so they wait on this.

The key in `.env` works for attestation (gateway TDX, model TDX, GPU and nonce binding all verified live on 3 Nov), but every chat completion returns `HTTP 402 no_limit_configured`: "No spending limit configured. Please contact support to set up credits."

1. Sign in at https://cloud.near.ai with the account that owns the key.
2. Add credits (the NEAR Builders offer, or buy `$10`) or set a spending limit for the key.
3. Tell me; I rerun `make probe-ai`, then `make negotiate` on testnet (the room's negotiation can be retried on
   `a1.accord-v2.testnet` too) and the rest of the flow (`make approve fund payee pay attack revoke`).

## Rotate the NEAR AI key after the hackathon

The key in `.env` was pasted into a chat on 3 Nov. After 14 Nov, create a new key at https://cloud.near.ai, put it in `.env` and in the Sealed Table's OutLayer secret, and delete the old one.

## 4.7: Railway for the hosted app, agent and keeper

1. Create a Railway project with four services from this repository: `app` (`pnpm --filter @accord/app build && pnpm --filter @accord/app start`), `agent` (`pnpm --filter @accord/agent start`, `AGENT_REARM=on`), `keeper` (`pnpm --filter @accord/keeper start`) and a Postgres plugin.
2. Set on all three: `ACCORD_NETWORK=testnet`, `ACCORD_FACTORY`, `NEAR_RPC_URL`, `DATABASE_URL` (from the plugin). On the agent: the `TRY_*` accounts and keys. On the keeper: `KEEPER_ACCOUNT`, `KEEPER_KEY`, `OUTLAYER_OWNER`, `OUTLAYER_PAYMENT_KEY` (the observer runs through OutLayer's HTTPS API). On the app: `INBOX_DAILY_SALT` (any random string), `APP_URL` (its own public URL).
3. Send me the app's public host: it goes into the Payee job's `DEMO_DOMAINS` before release 1 (2.7), so proofs from the app's demo domain say `demo_domain: true`.

## Optional: `outlayer-verify` (0.3 f, `make verify` "release" line)

`outlayer-cli` 0.2.2 is installed and logged in on testnet as `accord-v1.testnet` (8 Nov). The verifier was not installed:

```
cargo install --git https://github.com/out-layer/outlayer-verify outlayer-verify
```


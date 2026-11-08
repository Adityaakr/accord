# BLOCKED.md: what only Adi can do, with exact steps

Each entry names the `PROGRESS.md` item it blocks. Remove an entry when it is done.

## 2.8 and 3.4: OutLayer's testnet keystore is down (not Adi's to fix; recorded so the rerun is one command)

8 Nov, from about 20:30 local: every OutLayer job that needs a secret fails before the code starts with
`Decrypt failed: every keystore instance is unreachable`. Seen on the Sealed Table (request 13608 for
`a3.accord-v2.testnet` and its retry, tx `6JpBYBC2…`) and on the Payee job's pubkey probes (txs `2DoUyM1s…`,
`6bzvTbXp…`). The NEAR AI credits blocker is gone: the new key answers, and release 2 (DECISIONS 19) fixes the
token budget that made `a2` walk away. `a3.accord-v2.testnet` is sealed with one negotiation attempt left.

When the keystore answers again (a `request_pubkey` for `payee` no longer logs the error):

```
make finish DEAL=a3.accord-v2.testnet NET=testnet   # negotiate, approve, fund, Payee proof, pay, attack, revoke
make verify DEAL=a3.accord-v2.testnet
```

If a3's last attempt is spent, create a fresh agreement in the app (or `make negotiate NET=testnet`) and pass its id.

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


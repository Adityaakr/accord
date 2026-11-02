# BLOCKED.md: what only Adi can do, with exact steps

Each entry names the `PROGRESS.md` item it blocks. Remove an entry when it is done.

## 0.6 and Phase 3: testnet USDC for the buyer

1. Open https://faucet.circle.com, choose network "Near Testnet".
2. Paste `northwind-demo.testnet` and request. Repeat every one to two hours until the buyer holds about `70 USDC` (four drips).
3. Once the `/try` buyer exists with funds, one drip to `northwind-try.testnet` too.

## 0.2 and 2.3: NEAR AI Cloud credits (completions return HTTP 402)

The key in `.env` works for attestation (gateway TDX, model TDX, GPU and nonce binding all verified live on 3 Nov), but every chat completion returns `HTTP 402 no_limit_configured`: "No spending limit configured. Please contact support to set up credits."

1. Sign in at https://cloud.near.ai with the account that owns the key.
2. Add credits (the NEAR Builders offer, or buy `$10`) or set a spending limit for the key.
3. Tell me; I rerun `make probe-ai` and the live negotiation test (`cargo test -p accord-sealed-table --release --test live -- --ignored --nocapture live_negotiation`).

## 0.1 and 0.3: OutLayer CLI

The agent's attempt to `cargo install outlayer-cli` was stopped by its permission check. Run, in this repository:

```
cargo install --locked outlayer-cli
cargo install --git https://github.com/out-layer/outlayer-verify outlayer-verify
outlayer login testnet
```

Log in with the factory owner account, `accord-v1.testnet` (its key is in `~/.near-credentials/testnet/accord-v1.testnet.json`).

## 0.12: NEAR top-ups

The faucet gave `10 NEAR` per account. The factory needs about `12 NEAR` and the buyer about `15 NEAR` (SETUP_FROM_YOU 3). Run `make setup` again later for the three `/try` accounts the faucet rate-limited; send a few testnet NEAR to `accord-v1.testnet` and `northwind-demo.testnet` from any account you hold, or use https://near-faucet.io.

## 2.7 and 5.5: testnet NEAR for the global release (about 55 NEAR, once)

The agreement wasm is `522 KB`. Embedded, every agreement stakes about `5.3 NEAR` for its own copy of the code. Published once as a NEP-591 global contract by hash, agreements stake almost nothing for code, but publishing burns about `0.0001 NEAR` per byte: about `52 NEAR`, once per release.

1. Get testnet NEAR into `accord-v1.testnet` until it holds about `60 NEAR` (https://near-faucet.io, or ask in the NEAR developer channels for testnet NEAR).
2. Tell me when it is there; `make deploy-testnet` then publishes release 1 in the global mode.

Until then, development continues on the local sandbox (`make serve`, `make sandbox`).

## Rotate the NEAR AI key after the hackathon

The key in `.env` was pasted into a chat on 3 Nov. After 14 Nov, create a new key at https://cloud.near.ai, put it in `.env` and in the Sealed Table's OutLayer secret, and delete the old one.

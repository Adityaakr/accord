# BLOCKED.md: what only Adi can do, with exact steps

Each entry names the `PROGRESS.md` item it blocks. Remove an entry when it is done.

## 0.6 and Phase 3: testnet USDC for the buyer

1. Open https://faucet.circle.com, choose network "Near Testnet".
2. Paste `northwind-demo.testnet` and request. Repeat every one to two hours until the buyer holds about `70 USDC` (four drips).
3. Once the `/try` buyer exists with funds, one drip to `northwind-try.testnet` too.

## 0.2: NEAR AI Cloud key

1. Sign up at https://cloud.near.ai, add credits (the NEAR Builders `$10` offer, or buy `$10`), create an API key.
2. Add `NEARAI_API_KEY=<key>` to `.env` in this repository (it is gitignored). Do not paste the key into a chat.

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

# Verify an agreement, and more runs

The detail behind the README's [Testnet proof](../README.md#testnet-proof): the full `make verify` output, the release-by-release lines, the other recorded runs and the testnet infrastructure.

## Verify it yourself
Transactions older than about a day are no longer served by the plain testnet RPC (`UNKNOWN_TRANSACTION`). Open them on NearBlocks (the links here), or look them up on `https://archival-rpc.testnet.fastnear.com`.

No account and no keys. In the browser: [/verify](https://accordweb-production.up.railway.app/verify) shows the seven-check verdict and five quick reads live from testnet; [/record](https://accordweb-production.up.railway.app/record) shows a6's 12 steps. In a terminal:

```bash
git clone https://github.com/Adityaakr/accord.git && cd accord/platform
corepack enable && pnpm install
make verify DEAL=a6.accord-v2.testnet
```

Output, from a run on 10 Nov 2026 with [`outlayer-verify`](https://github.com/out-layer/outlayer-verify) installed (`cargo install --locked --git https://github.com/out-layer/outlayer-verify --rev 90c27d9d outlayer-verify`). The nonce is fresh on every run; `keys` reads `0 keys` because a6's agent was revoked; `release` looks each job key's pubkey run up by OutLayer request id, checks its task, wasm and caller, then `outlayer-verify` proves that task's quote. Without the tool, each run reads `and caller match · quote not checked (needs outlayer-verify)`, `release` is `not checked` and the last line is `verify: 5 checks ok · 1 partial · 1 not checked`. `/app/api/verify/<agreement>` and the MCP tool `accord_verify` print the same `release` line, `ok` where the server has the tool:

```
accord verify · a6.accord-v2.testnet
  code      code hash 8wMuMRre… = release 3 (global by hash) · no deploy method · ok
  keys      0 keys · none · no full access · ok
  sealed    outcome signature ok · commitments match · agreement matches · ok
  release   sealed-table run 13682 = task 28492 · wasm 7c832ce9… · outlayer-verify proven · payee run 13672 = task 28478 · wasm 24071443… · outlayer-verify proven · observer run 13683 = task 28493 · wasm 8240179a… · outlayer-verify proven · ok
  model     z-ai/glm-5.3-flash · attestation report fetched with fresh nonce 1a7f6315… · nonce bound in the report · the model is attested as served now; the run's own attestation is bound in the signed outcome (sealed check) · hardware quote and GPU evidence not checked here (make probe-ai checks them) · partial
  payee     halcyon-mm.testnet · proof accordweb-production.up.railway.app signed by the release's payee key · authority approved · buyer accepted · active · ok
  record    1 payment · 1 refusal (1 in the log) · 0 exceptions · 0 set aside · 0 observation conflicts · receipts match paid · ok
verify: 6 checks ok · 1 partial
```

`make verify DEAL=a10.accord-v2.testnet` prints `code hash ECgsrZwy… = release 4`, `release   sealed-table run 13987 = task 28880 · wasm 7c832ce9… · outlayer-verify proven · payee run 13988 = task 28881 · wasm 24071443… · outlayer-verify proven · observer run 13989 = task 28882 · wasm 8240179a… · outlayer-verify proven · ok` and the same last line; `make verify-usdc DEAL=a1.accord-usdc.testnet` checks the Circle USDC deal. A release 5 agreement, `make verify DEAL=a52.accord-v2.testnet`, prints `code hash ECgsrZwy… = release 5` and `release   sealed-table run 15085 = task 30189 · wasm 64a354a0… · outlayer-verify proven · payee run 15086 = task 30191 · wasm b5a0c473… · outlayer-verify proven · observer run 15082 = task 30185 · wasm 0dcc55e8… · outlayer-verify proven · ok` (it is only negotiated, so `payee` is `not checked`: `verify: 5 checks ok · 1 partial · 1 not checked`). Without `outlayer-verify`, a52's last line is `verify: 4 checks ok · 1 partial · 2 not checked`. Releases 4 and 5 run the same agreement code (`ECgsrZwy…`) and differ in the enclave job builds and keys; `verify` reads the release number from the factory's record for the agreement, then checks the code hash and all three job keys against that release.

## More runs

| Agreement | What it shows |
| --- | --- |
| `a10`, `a11`, `a13.accord-v2.testnet` | Release 4 (the security-review fixes): negotiate, fund, pay, refused redirect; an attack refused three ways (`ERR_PAYEE_MISMATCH`, `ERR_AMOUNT_MISMATCH`, `ERR_CANARY`, `0.00` moved); revoke, then a new key pays |
| `a52.accord-v2.testnet`, `a3.accord-usdc.testnet` | Release 5 (10 Nov 2026): negotiated by the reviewed Sealed Table build `64a354a0…` (`33.00 tUSDC` and `14.00 USDC`, 3 items each, attestation ok, `ERR_SEALED` both ways) |
| `a1.accord-usdc.testnet` | A deal in Circle's testnet USDC: `14.00 USDC` funded, `5.00` paid, redirect refused, revoked |
| `a8`, `a15`, `a21.accord-v2.testnet` | `/app/try-it` with a fresh account, on the public URL with relayed wallet calls, and without a wallet |
| `a32.accord-v2.testnet` | The run [Watch the replay](https://accordweb-production.up.railway.app/app/replay) plays back |
| `a56`, `a57.accord-v2.testnet` | Market making on testnet, release 5 (10 Nov 2026): `a56` period 1 observed `6 of 6` on Rhea's USDC/wNEAR pool on NEAR mainnet (spread `176 bps`, depth `36.56 / 55.00 USDC` within `300 bps`), closed `Eligible`, agent paid `6.00 tUSDC` ([`42HuyHX2…`](https://testnet.nearblocks.io/txns/42HuyHX2SPWNbnT7tKKni6WwyKKCK556vmKo3TydVPeD)); `a57`'s stricter period `0 of 6`, `Withheld`, the agent's payment refused `ERR_PERIOD_WITHHELD` ([`4W1Ud2GV…`](https://testnet.nearblocks.io/txns/4W1Ud2GVRPZnJL4uJdyEjAfdB5igT3S1DGTJxxLNcS1Y)). Both verify `6 checks ok · 1 partial` ([every step](runs.md#market-making-on-testnet)) |

**Flow proofs.** A dispute, a re-delivery, a payment refused while an item is disputed, and an early close that refunds the unspent escrow ran on testnet in `a48.accord-v2.testnet` (10 Nov 2026), each step linked in [`docs/runs.md`](runs.md#flow-proofs). The same flow settled in Circle's testnet USDC in `a2.accord-usdc.testnet`. Reproduce with `cd platform && make dispute-close` (Circle USDC: `make dispute-close-usdc`).

Every transaction of these runs is linked in [`docs/runs.md`](runs.md); the notes behind them are in [`platform/DECISIONS.md`](../platform/DECISIONS.md) sections 21 and 24 to 28.

| Infrastructure | Account or link |
| --- | --- |
| Factory | [`accord-v2.testnet`](https://testnet.nearblocks.io/address/accord-v2.testnet), release `5` current ([publish tx](https://testnet.nearblocks.io/txns/dFiMTwcYygycxQFSMpYqFfRaMaBU9uMrKtzpJQzRsmG), [made current](https://testnet.nearblocks.io/txns/8jSfWk6a3qzZRMrzqJj731njUGtRCYmWPLqLAqc3RAgF)); release `4` ([publish tx](https://testnet.nearblocks.io/txns/EB2Lz3WF1Pqt4o9y9NzUF5uc9qEhimPAPLKdwJFwvqnU)) for a10; release `3` ([publish tx](https://testnet.nearblocks.io/txns/7m8pj7u2D5aAXJ3RPbPWkhShKpJxwWHhPSpRrKr9nPVh)) for a6 |
| Circle USDC factory | [`accord-usdc.testnet`](https://testnet.nearblocks.io/address/accord-usdc.testnet), release `5` current ([publish tx](https://testnet.nearblocks.io/txns/9QVU3RU1u2TcAgmS6TV8hxxjF6hCF5UB1wtF817kGcwC), [made current](https://testnet.nearblocks.io/txns/3wK4mZVZtF8x6XNwSGbzDSyLR2nPwDqkjktsmpaoKAwi)); release `4` ([publish tx](https://testnet.nearblocks.io/txns/GovfwhMAtB28ayEndYmtiZHEo8sq9YhKVCXj8m3WFaai)); token `3e2210e1…afcb8af` (Circle USDC, 6 decimals) |
| Test USDC | [`tusdc.accord-v1.testnet`](https://testnet.nearblocks.io/address/tusdc.accord-v1.testnet) (NEP-141, 6 decimals) |
| Relayer | `relay.accord-v2.testnet` ([a relayed tx](https://testnet.nearblocks.io/txns/DyFrt2v9sGhxnRiWVwSydXPWS48exUis56YydCMmrBhC)) |
| OutLayer jobs | Sealed Table, Payee and observer, as OutLayer projects `accord-v1.testnet/accord-{sealed-table,payee,observer}`; release 3 pubkey runs `13682`, `13672`, `13683` |
| OutLayer attestation of a Sealed Table run (request `13596`, task `28391`) | [testnet-api.outlayer.ai/attestations/by-request/13596](https://testnet-api.outlayer.ai/attestations/by-request/13596) |
| Demo accounts | vendor `halcyon-demo.testnet`, authority `halcyon-auth.testnet`, recipient `halcyon-mm.testnet` |
| Demo vendor's domain | `useaccord.tech` for `/app/try-it` rooms (from 9 Nov 2026; `accordweb-production.up.railway.app` before); `make demo` (a63 to a65) and the `/try` room prove on `accordweb-production.up.railway.app`, where the app lists the fresh demo vendors; both are Accord's own site, serving the Payee file ([`/.well-known/accord.json`](https://accordweb-production.up.railway.app/.well-known/accord.json)) for Halcyon, a fictional company. A real vendor serves the same file on its own domain |

## Settle in Circle USDC

A second factory, `accord-usdc.testnet`, runs the same code (release 5 since 10 Nov 2026) and settles in Circle's USDC on NEAR testnet, `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af` (6 decimals). Each agreement keeps its factory's token for life, so `a<n>.accord-usdc.testnet` takes only Circle USDC and `a<n>.accord-v2.testnet` only test USDC. `/app/try-it` defaults to test USDC; Circle USDC is offered next to it where the server sets `ACCORD_FACTORY_USDC`.

| Do | See |
| --- | --- |
| Get Circle testnet USDC at https://faucet.circle.com, network `NEAR Testnet`, your account as the address | about `20 USDC` per address every 1 to 2 hours |
| `make verify-usdc DEAL=a1.accord-usdc.testnet` (the same as `make verify DEAL=a1.accord-usdc.testnet`, which reads the factory from the id) | `code hash 8wMuMRre… = release 3 (global by hash)` · `release   sealed-table run 13909 = task 28801 · wasm 7c832ce9… · outlayer-verify proven` (and the same for payee run `13910` = task `28802` and observer run `13911` = task `28803`) · `verify: 6 checks ok · 1 partial` with `outlayer-verify` installed (without it: `5 checks ok · 1 partial · 1 not checked`) |
| `make negotiate-usdc`, then `make finish-usdc DEAL=<agreement>` once the buyer holds the terms' total | the same blocks as `make negotiate` and `make finish`, with Circle USDC; the presets fit one faucet drip (buyer ceiling `18`, vendor floor `12`) |

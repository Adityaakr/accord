# Recorded testnet runs

Every recorded run of Accord on NEAR testnet, with each transaction linked. The flagship run, agreement `a6.accord-v2.testnet`, is in the [README](../README.md#testnet-proof); this page holds the others. The design notes behind each run are in [`platform/DECISIONS.md`](../platform/DECISIONS.md) (section numbers given per run).

Units: agreements of `accord-v2.testnet` settle in test USDC (`tusdc.accord-v1.testnet`, written `tUSDC`); agreements of `accord-usdc.testnet` settle in Circle's testnet USDC (written `USDC`). Both have 6 decimals.

| Agreement | Date | What it shows | Section |
| --- | --- | --- | --- |
| `a6.accord-v2.testnet` | 8 Nov 2026 | The full flow on release 3 (the flagship) | [README](../README.md#testnet-proof), DECISIONS 21 |
| `a8.accord-v2.testnet` | 8 Nov 2026 | `/app/try-it` with a fresh account | [below](#a8-try-it-with-a-fresh-account) |
| `a10`, `a11`, `a13.accord-v2.testnet` | 9 Nov 2026 | The proofs again on release 4 | [below](#release-4-security-review-fixes), DECISIONS 26 |
| `a1.accord-usdc.testnet` | 9 Nov 2026 | A deal in Circle's testnet USDC (closed with a refund on 10 Nov) | [below](#circle-usdc), DECISIONS 24 and 26 |
| `a2.accord-usdc.testnet` | 10 Nov 2026 | Dispute, re-delivery and early close with refund, in Circle testnet USDC | [Flow proofs](#circle-usdc) |
| `a15.accord-v2.testnet` | 9 Nov 2026 | `/app/try-it` on the public URL, wallet calls relayed | [below](#a15-try-it-on-the-public-url), DECISIONS 27 |
| `a21.accord-v2.testnet` | 9 Nov 2026 | Try without a wallet on the public URL | [below](#a21-try-without-a-wallet-on-the-public-url), DECISIONS 28 |
| `a68`, `a69`, `a70.accord-v2.testnet` | 11 Nov 2026 | Open tenders: sealed bids, an on-chain award, the winner's key as vendor (an agent outside the house set, run by us with only the public script, bid on job 3 of board v1 and won job 2 of board v2) | [below](#open-tenders), DECISIONS 35 |
| `a32.accord-v2.testnet` | 9 Nov 2026 | The run [/app/replay](https://accordweb-production.up.railway.app/app/replay) plays back, each step with its transaction; now `Settled` | the replay page |
| `a48.accord-v2.testnet` | 10 Nov 2026 | Flow proofs: a dispute resolved by re-delivery, a dispute left open, an early mutual close that refunds the unspent escrow | [below](#flow-proofs) |
| `a56`, `a57.accord-v2.testnet` | 10 Nov 2026 | Market making on testnet: a period observed on Rhea's mainnet pool and paid, a withheld period refused | [below](#market-making-on-testnet) |

Market-making agreements ran end to end on testnet on 10 Nov 2026 ([below](#market-making-on-testnet)); before that they had run on a local node only (`make market-making NET=local`, recorded in [`platform/README.md`](../platform/README.md#the-whole-product-on-your-machine)).

## make demo on testnet (release 5)

**Faster run, `1:29`** (10 Nov 2026, about 20:40 UTC): the demo now seals both mandates at once, proposes the recipient while the Sealed Table negotiates, sends the buyer's test USDC ahead, and has the vendor deliver while the buyer installs the agent key. [`a65.accord-v2.testnet`](https://testnet.nearblocks.io/address/a65.accord-v2.testnet): sealed `00:20`, recipient active `00:54`, attested `00:59` (a `39 s` negotiation), executing `01:10`, delivery `01:19`, paid `01:24` (15.00 tUSDC), redirect refused `ERR_PAYEE_MISMATCH` `01:29`; `make verify`: release 5, `6 checks ok · 1 partial`. An earlier parallel run, [`a64`](https://testnet.nearblocks.io/address/a64.accord-v2.testnet), took `2:20` because its negotiation took `64 s`.

The first full run, in order, step after step:

10 Nov 2026 (about 20:05 UTC), release 5, factory `accord-v2.testnet` (tUSDC). `make demo` (from `platform/`, `APP_URL=https://accordweb-production.up.railway.app/app`, [`packages/live/src/targets/demo.ts`](../platform/packages/live/src/targets/demo.ts)) created four fresh sub-accounts of `northwind-demo.testnet`, opened [`a63.accord-v2.testnet`](https://testnet.nearblocks.io/address/a63.accord-v2.testnet), sealed both mandates, proved the recipient on the hosted demo domain while the Sealed Table negotiated, approved, funded, delivered, paid item 1 and had the contract refuse one redirect, in `2:23`. `make verify DEAL=a63.accord-v2.testnet`: `release 5`, `1 key · FunctionCall · receiver self · methods [act]`, the reviewed job builds `outlayer-verify proven`, `verify: 6 checks ok · 1 partial`. Three earlier attempts the same night failed and were fixed before this run: the demo buyer was funded 22 NEAR when 10 is enough, APP_URL lost its `/app` path, the site's `/.well-known/accord.json` did not list the app's demo vendors, and a fresh account was used before every RPC node saw it (agreements `a61` and `a62` stopped after sealing).

## Market making on testnet

10 Nov 2026, factory `accord-v2.testnet` (tUSDC), release 5 (agreement code `ECgsrZwy…`; Sealed Table `64a354a0…`, Payee `b5a0c473…`, observer `0dcc55e8…`). Run with `make market-making NET=testnet` from `platform/` ([`packages/live/src/targets/market-making.ts`](../platform/packages/live/src/targets/market-making.ts)); the observer ran in OutLayer's enclave over its HTTPS API, paid from OutLayer payment key 1, and read Rhea DCL's USDC/wNEAR pool (`17208628…|wrap.near|2000`) on NEAR mainnet with view calls only. Two agreements on demo timings (six-minute periods, six hidden slots each): [`a56`](https://testnet.nearblocks.io/address/a56.accord-v2.testnet), whose conditions the pool meets, and [`a57`](https://testnet.nearblocks.io/address/a57.accord-v2.testnet), whose conditions it cannot meet. The run's checks all passed (exit 0).

Terms after the Sealed Table (glm-5.3-flash in OutLayer's enclave):

| Agreement | Retainer | Periods | Spread at most | Depth at least, both sides | Within | Threshold |
| --- | --- | --- | --- | --- | --- | --- |
| `a56` | `6.00 tUSDC` | 4 × 360 s | `200 bps` | `25.00 USDC` | `300 bps` | 4 of 6 slots |
| `a57` | `5.00 tUSDC` | 2 × 360 s | `25 bps` | `200.00 USDC` | `100 bps` | 5 of 6 slots |

Output (agent key line left out):

```
accord market-making · a56.accord-v2.testnet · rhea-dcl 17208628…|wrap.near|2000
  period 1  slot times held in the observer's enclave
  slot 1    mainnet block 223872080 · spread 176 bps · depth 36.56 / 55.00 USDC · pass
  slot 2    mainnet block 223872216 · spread 176 bps · depth 36.56 / 55.00 USDC · pass
  slot 3    mainnet block 223872370 · spread 176 bps · depth 36.56 / 55.00 USDC · pass
  observer  a56.accord-v2.testnet · period 1 slot 4 · The operation was aborted due to timeout
  slot 4    mainnet block 223872453 · spread 176 bps · depth 36.56 / 55.00 USDC · pass
  slot 5    mainnet block 223872525 · spread 176 bps · depth 36.56 / 55.00 USDC · pass
  slot 6    mainnet block 223872659 · spread 176 bps · depth 36.56 / 55.00 USDC · pass
  closed    6 of 6 passed · threshold 4 · uptime 100% · Eligible
  paid      agent pays period 1 · payment_sent 6.00 USDC → halcyon-mm.testnet · tx 42HuyHX2SPWNbnT7tKKni6WwyKKCK556vmKo3TydVPeD
  strict    a57.accord-v2.testnet · period 1 · 0 of 6 passed · threshold 5 · Withheld
  withheld  agent asks to pay it anyway: ERR_PERIOD_WITHHELD · tx 4W1Ud2GVRPZnJL4uJdyEjAfdB5igT3S1DGTJxxLNcS1Y
  scope     venue-level liquidity, not the market maker's own orders
```

The amount printed as `6.00 USDC` is `6.00 tUSDC`. The slot 4 timeout was one HTTPS call that took longer than 30 s; the next ask observed the slot. `a57`'s six slots read the same pool at mainnet blocks `223872330` to `223872861`: spread `176 bps`, depth `10.37 / 12.81 USDC` within `100 bps`, so every slot failed.

### a56: observed, eligible, paid

| Step | Account | Transaction | Result |
| --- | --- | --- | --- |
| Create | buyer `northwind-demo.testnet` | [`EHtYXxNE…`](https://testnet.nearblocks.io/txns/EHtYXxNEZRDkDpDgrJKRHBdsVwstNfT3FqzQGHEFjH9A) | `a56` on release 5 |
| Seal buyer mandate | buyer | [`7NQHih4r…`](https://testnet.nearblocks.io/txns/7NQHih4rSx8phvo6xUe6ckkohhmM44kGTJirXWajBRtS) | `commit_mandate` |
| Seal vendor mandate | vendor `halcyon-demo.testnet` | [`8VjKNQEW…`](https://testnet.nearblocks.io/txns/8VjKNQEWciiyMcY17tVeH6MeVLNAYAdRmpBzQqurC19F) | `commit_mandate` |
| Negotiation started | keeper `accord-keeper.testnet` | [`6MEmrx2K…`](https://testnet.nearblocks.io/txns/6MEmrx2K9inuWfCovrYy3t9YvXMC6yykhumZDT49R5R3) | `Attested` about 40 s later |
| Approve terms | buyer, vendor | [`f9wH2kWT…`](https://testnet.nearblocks.io/txns/f9wH2kWT2Z5b6wJLPMmaPgqnfUVMCLE5Zy3W944Jktm), [`EaoLasmW…`](https://testnet.nearblocks.io/txns/EaoLasmWn34wZN5efN63AWxJvPQx3K8mEBXoTQx3crHa) | |
| Fund | buyer | [`92Hv55Hp…`](https://testnet.nearblocks.io/txns/92Hv55HpENP1MTMQFh1pUSDu2CJvtbfQUJ1uJ4L44E1J) | `24.00 tUSDC` escrowed |
| Recipient | vendor, authority `halcyon-auth.testnet`, buyer | [`3qzbBdFp…`](https://testnet.nearblocks.io/txns/3qzbBdFpn9PzyPiSH5BTqeBjshcBW3FXYGF9oBpdXv8m), [`6VTx1jY9…`](https://testnet.nearblocks.io/txns/6VTx1jY95WnPJ94gZANT6G2aEPpoxhnAz12WarKQ66eg), [`4n4CD3DP…`](https://testnet.nearblocks.io/txns/4n4CD3DPXxovjYTBXh5tvrZVyHAoKTyfaGvtw6XYCbpw) | `halcyon-mm.testnet` proven by the Payee job, approved, accepted, active |
| Agent key | buyer | [`6NeKGE12…`](https://testnet.nearblocks.io/txns/6NeKGE12DhBjY5ak9HUaumBUPRYNoC1SxP4HN7Kbk6UV) | `install_agent_key` |
| Slots 1 to 6 | keeper | [`DWHLpSyE…`](https://testnet.nearblocks.io/txns/DWHLpSyEoATLfBVANmgHWLY8LKqJwQ4QLaTxWbfLphGv), [`8LRPEr78…`](https://testnet.nearblocks.io/txns/8LRPEr78vL51XMZkFMwSqvnh8aEHh6TTAofq6CWycBij), [`CyC4kYYw…`](https://testnet.nearblocks.io/txns/CyC4kYYweGeTxzE5ebbGNPWdPfuRAzbsZ59PGvf71mrt), [`2ekPpnWM…`](https://testnet.nearblocks.io/txns/2ekPpnWMdYASKb5z1xyCj1mcahQU9EqrcDJe6SCgvULx), [`EGzVre5M…`](https://testnet.nearblocks.io/txns/EGzVre5Mdyy7MaaiHDcsduHoKnZaGziNnxXqgg7Hj3v1), [`5gdkJi7w…`](https://testnet.nearblocks.io/txns/5gdkJi7wLBxMpqV7d497ETvC9VBQdpvkxfHnqSB6wUHT) | `record_observation`, each signed by the observer's key, all pass |
| Close period 1 | keeper | [`5yDYDbSz…`](https://testnet.nearblocks.io/txns/5yDYDbSz4VVWX1Huy3k5bXu9RdJtmVMzvSYd6424Jz1c) | `6 of 6`, `Eligible` |
| Agent pays period 1 | agent (key on `a56`) | [`42HuyHX2…`](https://testnet.nearblocks.io/txns/42HuyHX2SPWNbnT7tKKni6WwyKKCK556vmKo3TydVPeD) | sent, `6.00 tUSDC` to `halcyon-mm.testnet` |

### a57: observed, withheld, refused

| Step | Account | Transaction | Result |
| --- | --- | --- | --- |
| Create | buyer | [`9k7xj53b…`](https://testnet.nearblocks.io/txns/9k7xj53bNAbXybK6jyqg4Kdzr3Mx9RxWhXtGf7jhhr7D) | `a57` on release 5 |
| Seal mandates | buyer, vendor | [`BVLtGegP…`](https://testnet.nearblocks.io/txns/BVLtGegPECzZi9RBsBSC6wKcd7SQxxnM4niXqbxrnBX3), [`B7X8b2R4…`](https://testnet.nearblocks.io/txns/B7X8b2R4CgN176bwRHKAHrpiFCJhLg37sRbAbaBg68iR) | |
| Negotiation started | keeper | [`23UD1rhL…`](https://testnet.nearblocks.io/txns/23UD1rhLFxrgKDTMijAiJL4Ef6KAok42UeRJk85KmBD8) | `Attested` |
| Approve terms | buyer, vendor | [`Ep3tZ2PW…`](https://testnet.nearblocks.io/txns/Ep3tZ2PWev2bsbfctLMU2aSkBf12e3vi4gPABgJEt5qF), [`9TAGNh22…`](https://testnet.nearblocks.io/txns/9TAGNh22S23hmsnJNcULQMJTwEUtnop7kjYDtzUPRicv) | |
| Fund | buyer | [`JEEn7nxw…`](https://testnet.nearblocks.io/txns/JEEn7nxwXcEQJVqdwNnWjf17wswBRWcyArV5yi6SfMRQ) | `10.00 tUSDC` escrowed |
| Recipient | vendor, authority, buyer | [`7riVqZsL…`](https://testnet.nearblocks.io/txns/7riVqZsLx5u6WAAYMf6NN3b8SQWRegpTKgx5j6rU68ox), [`7NKyRaBa…`](https://testnet.nearblocks.io/txns/7NKyRaBasLwCrJ3VKRB9EYw1r4PyZjwdCC17N5h5FLN7), [`EB6kDu3a…`](https://testnet.nearblocks.io/txns/EB6kDu3aQs3bi7d6scuopn714jDqnGypNkJ11HZTyZoD) | active |
| Agent key | buyer | [`HhRoiZrJ…`](https://testnet.nearblocks.io/txns/HhRoiZrJLV4UQ2xhvjXC55EQNuYfd5VyDHJizHiVuy5k) | |
| Slots 1 to 6 | keeper | [`FsKfn9ve…`](https://testnet.nearblocks.io/txns/FsKfn9veUL7PpvCpiYxQMA9pU1YuY8GxbWjKPTF62d33), [`AR8sF3jD…`](https://testnet.nearblocks.io/txns/AR8sF3jDrgTkNttzFYWYXUETKJcLS5D9xv2CQsDcKAxJ), [`CoEurFjd…`](https://testnet.nearblocks.io/txns/CoEurFjdsHcBsZhaXpkdGj1GsSyrGq94rxk2LRCQr9DJ), [`7cuop82W…`](https://testnet.nearblocks.io/txns/7cuop82WUyem5NmfGiLwKJC6hBunrwPvjh9nY52vzyx9), [`AUixeHcj…`](https://testnet.nearblocks.io/txns/AUixeHcjaZD4rrHhK3oJQxizgJJcjJGqaT3NKoriUhBU), [`7kUNVRTb…`](https://testnet.nearblocks.io/txns/7kUNVRTbNBFwHc5ajf94BdcFpfCphpVsuhXJx3J4pHkr) | all fail |
| Close period 1 | keeper | [`5GmhVVJC…`](https://testnet.nearblocks.io/txns/5GmhVVJCVT826EmD9d6Be4SJZYefF3bNttLCyP2UcjVB) | `0 of 6`, `Withheld` (a second close call 2 s later, [`9AbJvDU8…`](https://testnet.nearblocks.io/txns/9AbJvDU8KqkDDGKeGhZgtsgZGHiHiVMo1eJUe4pV3Y6J), failed because the period was already closed) |
| Agent pays period 1 anyway | agent (key on `a57`) | [`4W1Ud2GV…`](https://testnet.nearblocks.io/txns/4W1Ud2GVRPZnJL4uJdyEjAfdB5igT3S1DGTJxxLNcS1Y) | refused, `ERR_PERIOD_WITHHELD`; `0.00` moved |

`make verify DEAL=a56.accord-v2.testnet`: `code hash ECgsrZwy… = release 5 (global by hash)` · `release   sealed-table run 15085 = task 30189 · wasm 64a354a0… · outlayer-verify proven · payee run 15086 = task 30191 · wasm b5a0c473… · outlayer-verify proven · observer run 15082 = task 30185 · wasm 0dcc55e8… · outlayer-verify proven · ok` · `record    1 payment · 0 refusals` · `verify: 6 checks ok · 1 partial`. `make verify DEAL=a57.accord-v2.testnet`: the same code and release lines, `record    0 payments · 1 refusal (1 in the log)`, `verify: 6 checks ok · 1 partial`. With `outlayer-verify` installed; `model` is partial (the hardware quote is not checked here).

Periods 2 to 4 of `a56` and period 2 of `a57` were not observed by the run; after each agreement's end and grace, `close` settles it and refunds what was not paid to the buyer.

### What failed first

- `a50.accord-v2.testnet` (release 4), the strict room of the first attempt: `NoDeal`, `WALK_AWAY`, `rounds 1`, two model responses (start [`78biwb9z…`](https://testnet.nearblocks.io/txns/78biwb9zqkvQZ7cvmbPezsRAoaAyASj2PSrBDWsnhNXp)). The vendor cannot see the buyer's schedule, so it quoted one slot per period with a threshold of five; the structure check refuses a threshold above the slot count, the retry got the same quote, and the vendor walked away before the buyer spoke. Replayed with the same prompt, schema, model and sampling against NEAR AI, that happened in 3 of 8 runs; with the buyer's `shared` naming the schedule, in 0 of 8. Its partner `a49.accord-v2.testnet` had negotiated `150 bps` and `40 USDC` within `100 bps`, which the pool no longer met (10 Nov readings: `169` to `187 bps`; within `200 bps` the bid side was `0.00` at three of five samples). Both fixture pairs were changed (`platform/fixtures/companies/README.md`).
- `a54`, `a55.accord-v2.testnet` (release 5), the second attempt: both negotiated, but every observer call answered `PROTECTED_OBSERVER_SEED is not set`, so no slot was recorded and both periods closed `Review`. Over OutLayer's HTTPS API the keeper's call sent only `{input}`; it now sends `secrets_ref` (the owner's `default` profile, as `request_execution` does on chain) and `version_key`, the agreement's own observer build.

## a8: try-it with a fresh account

8 Nov 2026, `a8.accord-v2.testnet`, release 3. The same path as the README's walkthrough, run with a fresh account through the app's own routes.

| Step | Transaction |
| --- | --- |
| Faucet, NEAR | [`935XqMoe…`](https://testnet.nearblocks.io/txns/935XqMoeb4Jt7fBQQHK9T7o9ZWJrWUoZYYCkdPGqhBoa) |
| Faucet, tUSDC | [`3t7SSAkT…`](https://testnet.nearblocks.io/txns/3t7SSAkTzQt7Aj2d6FwkhpG7BzKfC2mhCcWMR2E46PQ3) |
| Create | [`5xdpHZTz…`](https://testnet.nearblocks.io/txns/5xdpHZTzQyjFiZcxApbwPDH2o3DQNKYhE9szxfjAjgDq) |
| Negotiation started | [`HFk6XgoF…`](https://testnet.nearblocks.io/txns/HFk6XgoFmkZt2mDBrtE3zzD4mXPMEQUKnVyTGwqi9143) |
| Fund | [`91knP5Ez…`](https://testnet.nearblocks.io/txns/91knP5EzbKV5ajEXdfETkCXJqucQ5niJoPLBF2dbipng) |
| Agent pays item 1 | [`HxYDHTRL…`](https://testnet.nearblocks.io/txns/HxYDHTRLteGfGYoeEptehVMKbFgBdVWBqrejUJhsjSnb) |
| Redirect refused | [`37zUgEoe…`](https://testnet.nearblocks.io/txns/37zUgEoe8jbqnqQQhSe8L1VPBMRrrqXdsDorgDY7cEYL) |
| Revoke | [`F67Qcofq…`](https://testnet.nearblocks.io/txns/F67Qcofq9CmVuGze7URoVD3E1HfucQ7qooBjDJjANHiG) |

The server side is [`platform/app/src/server/demo.ts`](../platform/app/src/server/demo.ts): the faucet sends only what an account lacks, one grant per account per day, up to 30 accounts per connection per day, within a daily budget of 25 NEAR net (what Finish returns counts back); the counterparty reads the room and makes the vendor's next valid move, so calling it twice does nothing twice; the demo agent's key is derived per room and signs `act` itself, never through the relayer.

## Release 4 (security-review fixes)

The reviewed agreement code (`ECgsrZwy…`, global contract `R2qxw4u5…`) is release 4 on both factories since 9 Nov 2026: `accord-v2.testnet` ([publish](https://testnet.nearblocks.io/txns/EB2Lz3WF1Pqt4o9y9NzUF5uc9qEhimPAPLKdwJFwvqnU), [set current](https://testnet.nearblocks.io/txns/J9uADVqQSkY6f1uMYbMbWoPnB4oiwuS3CtLayKojtgeC)) and `accord-usdc.testnet` ([publish](https://testnet.nearblocks.io/txns/GovfwhMAtB28ayEndYmtiZHEo8sq9YhKVCXj8m3WFaai), [set current](https://testnet.nearblocks.io/txns/5D9LxPuU4phUXTgRawd97TmhZPGiPjWzSPWCYXJteoLJ)). Agreements created before keep release 3 (code pinned by hash), so a6 is unchanged. The proofs ran again on new release 4 agreements of `accord-v2.testnet` (test USDC):

| Proof | Agreement | Result | Transaction |
| --- | --- | --- | --- |
| Negotiate | [`a10`](https://testnet.nearblocks.io/address/a10.accord-v2.testnet) | Attested in 64 s, `33.00 tUSDC` in 3 items, attestation ok, `ERR_SEALED` both ways | in the `make negotiate` output |
| Fund | `a10` | `33.00 tUSDC` escrowed | [`2mBhRNnX…`](https://testnet.nearblocks.io/txns/2mBhRNnXnitEN2gefBe7C8MWdCYS7P2nJLZyZznHFH22) |
| Pay | `a10` | item 1, `12.00 tUSDC` to `halcyon-mm.testnet` | [`Bs5dVpr6…`](https://testnet.nearblocks.io/txns/Bs5dVpr6DnR5jXjYKXbGsp9HP36smmoJRFmvJP4tGqAm) |
| Redirect refused | `a10` | `ERR_PAYEE_MISMATCH` | [`51TQ8no9…`](https://testnet.nearblocks.io/txns/51TQ8no9kPp4P8SDyN77jNZMevLsKaTBH3SufU2SUefu) |
| Attack | [`a11`](https://testnet.nearblocks.io/address/a11.accord-v2.testnet) | `ERR_PAYEE_MISMATCH`, `ERR_AMOUNT_MISMATCH`, `ERR_CANARY` revokes and deletes the key; `0.00` moved | [`HvwpdKDs…`](https://testnet.nearblocks.io/txns/HvwpdKDs64sA5zuj37iK8B1N1kKDadh4VoeU8n3LwMSv), [`3cTDxHzV…`](https://testnet.nearblocks.io/txns/3cTDxHzVH29Uiw6kZceFmuuUkhnBiBp5JYW65bsewLvh), [`DPpVoMX9…`](https://testnet.nearblocks.io/txns/DPpVoMX9KKYXppXvrM6HqorDYsDd9ndQy8YniKDvMsXT) |
| Revoke | [`a13`](https://testnet.nearblocks.io/address/a13.accord-v2.testnet) | `revoke_agent` deletes the key; the next call fails with `AccessKeyDoesNotExist` at the RPC, so it has no transaction; the buyer installs a new key, which pays item 2 | revoke [`8b8FC1He…`](https://testnet.nearblocks.io/txns/8b8FC1HeiHCTJcUaga87zWuNCg6LTgYGYDzRptdHh2H3), `install_agent_key` [`DfgMURQA…`](https://testnet.nearblocks.io/txns/DfgMURQANtnBq2LziGaELXabw9tvzqhYQXq71hXjzNDT), pay item 2 [`24mdebXg…`](https://testnet.nearblocks.io/txns/24mdebXgCkMZFyekdDyxv3YQzJS1iaxckrfnN2aRY9Fe) |
| Verify | `a10` | `code = release 4` · `6 ok · 1 partial` with `outlayer-verify` installed (10 Nov 2026; without it `5 ok · 1 partial · 1 not checked`) | `make verify DEAL=a10.accord-v2.testnet` |

The first `make revoke` run (a12) stopped at its last step: the script paid item 2 at a fixed `12.00` while the negotiated amount differed, and the contract refused it with `ERR_AMOUNT_MISMATCH`. The live targets now pay each item at its negotiated amount.

## Circle USDC

Agreement [`a1.accord-usdc.testnet`](https://testnet.nearblocks.io/address/a1.accord-usdc.testnet), created on release 3 of the second factory, was negotiated on 9 Nov 2026 (`14.00 USDC` in 3 items, `QUOTE → COUNTER → ACCEPT`, glm-5.3-flash in OutLayer's enclave) and ran a deal in Circle's testnet USDC:

| Step | Result | Transaction |
| --- | --- | --- |
| Fund | `14.00 USDC` (Circle) escrowed | [`4gPohYYM…`](https://testnet.nearblocks.io/txns/4gPohYYMokgQcPcgNhX3tCTTXjA35AfuKkpGs1SpS2no) |
| Pay | `5.00 USDC` to `halcyon-mm.testnet` | [`E127BGy3…`](https://testnet.nearblocks.io/txns/E127BGy3Tw6PmhE9JcoFr7vQsKTiHNevTTiAxEjJGWK2) |
| Redirect refused | `ERR_PAYEE_MISMATCH` | [`9rgsBFA2…`](https://testnet.nearblocks.io/txns/9rgsBFA26yedWuEEJk77sKBDrDGS9mHn9BFMknCaP8BB) |
| Revoke | the agent's next call fails with `AccessKeyDoesNotExist` | [`FTigDebs…`](https://testnet.nearblocks.io/txns/FTigDebs1kZjLpTN8nC8SZWp4dMM1ChuUyR211JZnzuW) |
| Verify | release 3 · `6 ok · 1 partial` with `outlayer-verify` installed (10 Nov 2026; without it `5 ok · 1 partial · 1 not checked`) | `make verify-usdc DEAL=a1.accord-usdc.testnet` |

## a15: try-it on the public URL

9 Nov 2026, `a15.accord-v2.testnet`, release 4. A fresh, unfunded implicit account ran the page's calls against https://accordweb-production.up.railway.app/app, with its wallet calls relayed through `/app/api/relay`. The state went Sealed, Attested, Executing, recipient active, paid, refused and revoked in 5 min 30 s; `/app/api/verify/a15.accord-v2.testnet` gave 5 ok, 1 partial, 1 not checked and 0 failed on 9 Nov 2026 (`release` not checked: the server had no `outlayer-verify`).

| Step | Result | Tx |
| --- | --- | --- |
| Session (NEP-413, unfunded implicit account) | `POST /app/api/session` 200 |  |
| Faucet, NEAR (to 2.5) | `POST /app/api/faucet` 200 | [`GxVw5pg3…`](https://testnet.nearblocks.io/txns/GxVw5pg34KZfyVCu2bhYMrbA4NqWai2XJQyfpmUZtZD5) |
| Faucet, tUSDC (100) | same call | [`7dRodXTg…`](https://testnet.nearblocks.io/txns/7dRodXTgVXmKHEHdB53uH87p7fJruHzLbQ688z78pgrC) |
| Create a15 (signed directly; the relayed create failed, see below) | Sealed | [`GNynLq2o…`](https://testnet.nearblocks.io/txns/GNynLq2oxREyQrF1N4rNRhDztCzfVtqJ5DVgmthDRBEy) |
| Counterparty seals the vendor mandate | counterparty step | [`BpwCPtgS…`](https://testnet.nearblocks.io/txns/BpwCPtgSg4rjZVNKPnuw4nLUzemEfoJpaoSXRCmKn2PM) |
| Buyer seals the Northwind mandate (relayed) | both sealed | [`6eYVDLtT…`](https://testnet.nearblocks.io/txns/6eYVDLtTJ2mFT8J7GrKUWUfWuZZDXUZTd37fhGpN1324) |
| Keeper (`accord-keeper.testnet`) calls `start_negotiation`, 00:17:28 UTC | `negotiation_requested`; the Sealed Table ran in OutLayer and `terms_proposed` landed in the same transaction | [`Gp9JqBvY…`](https://testnet.nearblocks.io/txns/Gp9JqBvYPgxw7Aqi4JKb28gWmTztM3Xw3RhJbVGtnWqT) |
| Counterparty approves the terms | Attested after 67 s | [`HEm5P4ga…`](https://testnet.nearblocks.io/txns/HEm5P4gaE3LxvyV2ergFVxDHXbmVw8jthFARHH8GoV9q) |
| Buyer approves the terms (relayed) | Executing | [`4nNbyFAk…`](https://testnet.nearblocks.io/txns/4nNbyFAk6moLWKHUCX37JLoeoUTFE272cHWLUXwHAeq2) |
| Counterparty proposes halcyon-mm.testnet on useaccord.tech | Proposed, then Proven | [`4xGmfM2x…`](https://testnet.nearblocks.io/txns/4xGmfM2xoiRrVMA5ocLWMeiTyq4k2gQYhXVw4RNihZmp) |
| Buyer funds 33.00 tUSDC (relayed) | funded 33.00 of 33.00 | [`HTpF77Ve…`](https://testnet.nearblocks.io/txns/HTpF77VeZXZf65v1p2Av3YHE5DK37FG9WAWmjxBHbUrE) |
| Buyer installs the demo agent key (relayed) | agent key set | [`23gimnow…`](https://testnet.nearblocks.io/txns/23gimnowmhb8nErdbPUrhzg7oGk7J382weKXYAsyQuBQ) |
| Authority approves the recipient | AuthorityApproved | [`A6VokbSK…`](https://testnet.nearblocks.io/txns/A6VokbSKJfgMWbakATCeARGsR7NbPAhFhBFsYwWx8Bth) |
| Buyer accepts the recipient (relayed, rating allow) | `recipient_accepted` and `recipient_active` in the same transaction: a first recipient has no timelock (the 120 s wait applies to a change) | [`Tg1rtc6C…`](https://testnet.nearblocks.io/txns/Tg1rtc6CmLHwP9aHwhzxLyEMmsxacMjsMiw6cRrn5uo) |
| Counterparty submits delivery 1 | delivery 1 submitted | [`8ELSpUds…`](https://testnet.nearblocks.io/txns/8ELSpUdszC6p3R7q6CdgLTrg1PJVtFqJvt1eDzsN5Vrd) |
| Buyer accepts delivery 1 (relayed) | item 1 eligible | [`h2xtvzUG…`](https://testnet.nearblocks.io/txns/h2xtvzUGeysiQHCYr95zWxXJKJhKTpT1CdN8n8tZBss) |
| Demo agent pays item 1 | sent, 15.00 tUSDC to halcyon-mm.testnet | [`7unm1ZWE…`](https://testnet.nearblocks.io/txns/7unm1ZWEE5DH74JAKsG7ZcKywz8t9V8NCNvghUcacXUd) |
| Demo agent asked to pay halcyon-markets.testnet | refused, ERR_PAYEE_MISMATCH | [`7Cjd6cvx…`](https://testnet.nearblocks.io/txns/7Cjd6cvxVm8racRQTotSJ1CXh5PHdgEvSzJxYszAbptz) |
| Buyer revokes the key (relayed) | 0 keys on a15; `/api/demo-agent pay` then 409 | [`2nyFEeBP…`](https://testnet.nearblocks.io/txns/2nyFEeBPB4BLhwxzrWrqMhsEvSQWS4LGVjff8ZuWZAtG) |

The relayed `create_agreement` failed, so it was signed directly. The relayer pays the 2 NEAR deposit inside a delegate and had 1.99 NEAR left (DECISIONS 27). Fixed the same day (commit `8b3d51b`): the room deposit is paid by the visitor's wallet; the relayer carries at most 1 yoctoNEAR.

## a21: try without a wallet on the public URL

9 Nov 2026, `a21.accord-v2.testnet`, release 4. **Try without a wallet** on https://accordweb-production.up.railway.app/app/try-it, driven by Playwright (`platform/app/e2e/try-without-wallet.mjs`): a throwaway key made in the tab signed the room's create itself and sent every other buyer call through `/app/api/relay`. Create to revoke in 3 min 44 s; `/app/api/verify/a21.accord-v2.testnet` and `make verify DEAL=a21.accord-v2.testnet` gave 5 ok, 1 partial (model: hardware quote not checked here), 1 not checked (release: needs `outlayer-verify`), 0 failed on 9 Nov 2026; re-run on 10 Nov 2026 with `outlayer-verify` installed, `make verify DEAL=a21.accord-v2.testnet` gives `verify: 6 checks ok · 1 partial`. This run predates the change, later on 9 Nov, that makes the demo agent pay a due item on its own.

| Step | Transaction |
| --- | --- |
| Faucet, NEAR (2.5) | [`27e15dD5…`](https://testnet.nearblocks.io/txns/27e15dD5akxXayuDCmhfvUqjJaPwwhShvFuxH39HwbGU) |
| Faucet, tUSDC (100) | [`25w7o9hR…`](https://testnet.nearblocks.io/txns/25w7o9hRNFFPZ4kGbzktvyd4dhW9Cxaqeb764MHR7rdT) |
| Create a21 (signed by the throwaway account) | [`2bXYcG7P…`](https://testnet.nearblocks.io/txns/2bXYcG7PGewYBswgXBmf4R9axkBoMQaRQn3bVniGhpt4) |
| Buyer seals the Northwind mandate (relayed) | [`Ag4FA6Yr…`](https://testnet.nearblocks.io/txns/Ag4FA6YrePLU8BxeY7WkXACHZA55MT3tcisoEpXriQc9) |
| Counterparty seals the vendor mandate | [`9vqBbLsL…`](https://testnet.nearblocks.io/txns/9vqBbLsLsUfV6c61CDh4RBnNboCgoFVv36ugwDXQhzf1) |
| Negotiation started; `terms_proposed` in the same transaction | [`D6941SND…`](https://testnet.nearblocks.io/txns/D6941SNDMAFTPHCc6XApwG8jGrebhXa4XQobExU6xFGx) |
| Buyer approves the terms (relayed) | [`7ypCffmb…`](https://testnet.nearblocks.io/txns/7ypCffmbMwfTsQUjtR5EGi526Xf41WwBzUyHj6sGjaT6) |
| Counterparty approves the terms | [`yC8Wkyoc…`](https://testnet.nearblocks.io/txns/yC8Wkyocr8ZyC4VLoHe4SHsoWC4anpaSjdWMYFow1Ji) |
| Recipient halcyon-mm.testnet proposed and proven | [`2Qj2RU2k…`](https://testnet.nearblocks.io/txns/2Qj2RU2kVB11JTCQXupAzJ2feYyxXfHzy8Fx8gzQu3NB) |
| Buyer funds 35.00 tUSDC (relayed) | [`hds2yoNK…`](https://testnet.nearblocks.io/txns/hds2yoNKgQTaqdpkX562XvkA1tDxJr7YeakwE3sXpse) |
| Buyer installs the demo agent key (relayed) | [`8fYwP9wU…`](https://testnet.nearblocks.io/txns/8fYwP9wUanudAmpjJ17pxmppJM1jhaYCtN6zv9z4Ai5i) |
| Authority approves the recipient | [`5pz4sz8c…`](https://testnet.nearblocks.io/txns/5pz4sz8cqv1ufp9sdA7SedubwAhzvTDeQbWzVLiA61gy) |
| Buyer accepts the recipient (relayed); active | [`EoYnYBv6…`](https://testnet.nearblocks.io/txns/EoYnYBv6zZegNvPdfjqstM4wsaLnbzzjinzJcyyfa1ke) |
| Delivery 1 submitted | [`HQ9qQdWe…`](https://testnet.nearblocks.io/txns/HQ9qQdWew8D8v6sbKhxa2b4xPhybGaV6CeCzSZBHuSCb) |
| Buyer accepts delivery 1 (relayed) | [`3nT451ch…`](https://testnet.nearblocks.io/txns/3nT451chF9m6JXq9JYxhHUndDARi6wm21szZTdrep7oK) |
| Agent pays item 1: 16.50 tUSDC to halcyon-mm.testnet | [`5vKHipEb…`](https://testnet.nearblocks.io/txns/5vKHipEbqk9r4rxra1q9uhYNrnFGJttQYprEL3g2x3ZG) |
| Redirect to halcyon-markets.testnet refused: `ERR_PAYEE_MISMATCH` | [`DaRuHG2t…`](https://testnet.nearblocks.io/txns/DaRuHG2tLsA5FP4f2CHouMjgABnbenUfZcGSnDeUDDmH) |
| Delivery 2 submitted | [`498cCzSW…`](https://testnet.nearblocks.io/txns/498cCzSWagrQk7NUnUWJpF9sLXugJHsv1tsu7UQo15NT) |
| Buyer accepts delivery 2 (relayed) | [`Dhrg1sfM…`](https://testnet.nearblocks.io/txns/Dhrg1sfMe9L9QQQNcVRc16BcpPhpH3bijrntquKieuyY) |
| Buyer revokes the key (relayed); 0 keys on a21 | [`BGJEcstT…`](https://testnet.nearblocks.io/txns/BGJEcstTMS3oNyWiy92y7D8QRZqne2AFaNR2gxj8yy58) |

The free RPC tier rate-limited the run (HTTP 429, JSON-RPC `-429`), and the page showed those as 502s before it got through. Since then the SDK's `RotatingRpcProvider` moves to the next testnet endpoint only on a rate limit or a transport failure and keeps every real error (a contract refusal, `AccessKeyDoesNotExist`) unchanged, and the app answers a busy network with a 503 and "The network is busy, retrying" (DECISIONS 28).

## Flow proofs

10 Nov 2026, release 4, factory `accord-v2.testnet` (tUSDC). One new agreement, [`a48.accord-v2.testnet`](https://testnet.nearblocks.io/address/a48.accord-v2.testnet), taken through the flows the earlier runs did not show: a disputed delivery and how the contract resolves it, and an early close that refunds the unspent escrow to the buyer. Run with `make dispute-close` (from `platform/`, [`packages/live/src/targets/dispute-close.ts`](../platform/packages/live/src/targets/dispute-close.ts)); every call is the SDK's, signed by the demo principals. The run's own checks all passed.

The dispute rules (`contracts/agreement/src/evidence.rs`): the buyer may dispute a `Delivered` item before its acceptance window ends (`Delivered → Disputed`); the agent cannot pay a disputed item; the vendor may deliver it again (`Disputed → Delivered`), which the buyer then accepts or disputes again; a delivery nobody disputes is accepted when its window lapses. At the close only `Eligible` items are paid, so a disputed item's amount goes back to the buyer.

### Setup and first payment

| Step | Account | Transaction | Result |
| --- | --- | --- | --- |
| Create | buyer `northwind-demo.testnet` | [`CvwWnucn…`](https://testnet.nearblocks.io/txns/CvwWnucngbNLNeFAGPJzVz6UBC7dMbE1GY5QActCKkDf) | `a48` created on release 4; terms after the Sealed Table: `32.00 tUSDC`, items `12.00`, `12.00`, `8.00` |
| Fund | buyer | [`CBUZiwDe…`](https://testnet.nearblocks.io/txns/CBUZiwDeLQcCDi6tLog5Sz6Pzn5CW4UnEbSBbCKM7Swo) | `32.00 tUSDC` escrowed on `a48` |
| Agent key | buyer | [`AwZuY3eY…`](https://testnet.nearblocks.io/txns/AwZuY3eYoYENL2apoAZjeSCw16ppWJjBzCNms4efJSZF) | `install_agent_key`; recipient `halcyon-mm.testnet` proven by the Payee job (rating `allow`) and active |
| Deliver item 1 | vendor `halcyon-demo.testnet` | [`6RRkmYGk…`](https://testnet.nearblocks.io/txns/6RRkmYGkWs8NqkoLjZef5aESgFXUZFgrPyn1Qu3yvs2u) | `Delivered` |
| Accept item 1 | buyer | [`9xRQxgis…`](https://testnet.nearblocks.io/txns/9xRQxgisCNG3N1AL13DgaHVjE7th6ERMvsFZd14TQcUq) | `Eligible` |
| Pay item 1 | agent (key on `a48`) | [`FCoVrHqR…`](https://testnet.nearblocks.io/txns/FCoVrHqR9wxDGosv5Nxxs2Zr4F2LzeFUXi5Ub86m8vX6) | sent, `12.00 tUSDC` to `halcyon-mm.testnet` |
| Redirect item 2 to `halcyon-markets.testnet` | agent | [`FeHcFAUf…`](https://testnet.nearblocks.io/txns/FeHcFAUf2foZ9wPt2L7wkqrTEnFvMYQFBvdJzGUK21qQ) | refused, `ERR_PAYEE_MISMATCH` |

### Dispute

| Step | Account | Transaction | Result |
| --- | --- | --- | --- |
| Deliver item 2 | vendor | [`vnSByk7R…`](https://testnet.nearblocks.io/txns/vnSByk7Rz22VQ1i3mLDW3bPsnFHC4fU3Q8uMVhzmY2L) | `Delivered` |
| Dispute item 2 | buyer | [`7CLgajAM…`](https://testnet.nearblocks.io/txns/7CLgajAMiU9kkNQb4ZHB2pxa2GLwPDUxUABZuFdu7zRP) | `Disputed` (`dispute_delivery`, inside the acceptance window) |
| Pay disputed item 2 | agent | [`6PnZEq5V…`](https://testnet.nearblocks.io/txns/6PnZEq5VFzbfPr9mptSj9ruevCLnCU1VrL9WoErCcbK9) | refused, `ERR_NOT_DUE` |
| Deliver item 2 again | vendor | [`DSZEM7Hi…`](https://testnet.nearblocks.io/txns/DSZEM7Higc4rMatduqstbYeHV7b7dQJ1bAms1akZzzhN) | `Delivered` (a disputed item may be delivered again) |
| Accept item 2 | buyer | [`CBGEvGKx…`](https://testnet.nearblocks.io/txns/CBGEvGKx4LHewujWnSTYTfYog1veK6XF1x9oPmPyw1uN) | `Eligible` |
| Pay item 2 | agent | [`EAnXJLi9…`](https://testnet.nearblocks.io/txns/EAnXJLi9rvVAMvGBfdRiaMV1KcFjMaPRCfE3e51h8xjp) | sent, `12.00 tUSDC` to `halcyon-mm.testnet` |
| Deliver item 3 | vendor | [`4paHKZ1A…`](https://testnet.nearblocks.io/txns/4paHKZ1AE3qzVYnGZE8netter2t9nAkYSUtdKmBdFbV4) | `Delivered` |
| Dispute item 3 | buyer | [`3tHqEAbu…`](https://testnet.nearblocks.io/txns/3tHqEAbuVzPNre2vcgJ4eZbn7rVqRQPgLoKnGYiVhR19) | `Disputed`, left so |
| Pay disputed item 3 | agent | [`GnHPSRtW…`](https://testnet.nearblocks.io/txns/GnHPSRtWzgkNdik1fwMs9oKGEjmFPKk4V3XAA3kfBqSx) | refused, `ERR_NOT_DUE` |

### Close and refund

| Step | Account | Transaction | Result |
| --- | --- | --- | --- |
| Mutual close | buyer | [`FQEitYiK…`](https://testnet.nearblocks.io/txns/FQEitYiKgceZPsZc7XWHx5iwbTXxqc66DvKuzFnVY2TF) | `mutual_close_requested`; `8.00 tUSDC` still escrowed |
| Mutual close | vendor | [`3yphF7hW…`](https://testnet.nearblocks.io/txns/3yphF7hWX9Qts4YrZFMowAsAyk9V2XM2hxkCo1LNqdJD) | `Settled`: paid `24.00`, refunded `8.00 tUSDC` to the buyer (`ft_transfer`, memo `accord refund`, in the same transaction); disputed item 3 not paid; the agent key removed at settlement; `0.00` left on `a48` |
| Withdraw NEAR | buyer | [`G4TZLuco…`](https://testnet.nearblocks.io/txns/G4TZLuco58aKhWv1TTP5kB2PjuvFd7Nzds54vK1fhD6V) | the room's spare NEAR back to the buyer (`a48` keeps `0.133 NEAR` storage) |

Balances (`tUSDC`):

| Account | Before | After | Change |
| --- | --- | --- | --- |
| buyer `northwind-demo.testnet` | `331.88` | `307.88` | `-24.00` (funded `32.00`, refunded `8.00`) |
| recipient `halcyon-mm.testnet` | `415.50` | `439.50` | `+24.00` (items 1 and 2) |
| agreement `a48.accord-v2.testnet` | `0.00` | `0.00` | held `32.00`, then `8.00` before the close |

`make verify DEAL=a48.accord-v2.testnet`: `code hash ECgsrZwy… = release 4`, `record 2 payments · 3 refusals`, last line `verify: 6 checks ok · 1 partial` with `outlayer-verify` installed (10 Nov 2026; `model` partial: hardware quote not checked here; without the tool `release` is not checked and the line reads `5 checks ok · 1 partial · 1 not checked`).

Not shown here: the close after the end of the term. The demo terms run 7 days (`a48` ends 16 Nov 2026), and `close` before then refuses with the term check; the mutual close above is the same `close_step` and refund.

### Revocation

Already on record: `a13` (`revoke_agent`, the next call failing with `AccessKeyDoesNotExist` at the RPC, a new key restoring service, [above](#release-4-security-review-fixes)), `a11` (a canary request revoking the key), and `a1.accord-usdc`, `a15` and `a21`. `a48` adds the key removed at settlement.

### Circle USDC

**`a2.accord-usdc.testnet`** (release 4, Circle's testnet USDC `3e2210e1…`, 10 Nov 2026): the same dispute, re-delivery and early close, settled in real Circle testnet USDC. Run with `make dispute-close-usdc` from `platform/`.

| Step | Transaction | Result |
| --- | --- | --- |
| Create (buyer `northwind-demo.testnet`) | [`CD458Kbc…`](https://testnet.nearblocks.io/txns/CD458Kbczwn26DhN6Tw7xya41UDJ7YuEzhvqRV5utt75) | terms `15.00 USDC`: items `6.50`, `5.50`, `3.00` |
| Fund | [`Gkseuroh…`](https://testnet.nearblocks.io/txns/Gkseuroh1PvGyKTzAHoz4EkABogK6YoF2cvjmab3czS5) | `15.00 USDC` escrowed; recipient `halcyon-mm.testnet` proven by the Payee job, rated allow, active |
| Install the agent key | [`AYgYFMxL…`](https://testnet.nearblocks.io/txns/AYgYFMxLwVP84o2hYQBiBmgkraWzuDPReijGNQfv5Uy2) |  |
| Item 1 delivered | [`3vToAv14…`](https://testnet.nearblocks.io/txns/3vToAv14ttVskarPc82FG15J2EDeGmR5BKnbV186xqJR) |  |
| Item 1 accepted | [`8jCA3e8v…`](https://testnet.nearblocks.io/txns/8jCA3e8vrF9VHM7c7rcCsx6qF5peVJx3NXXFu76vj6Wn) |  |
| Agent pays item 1 | [`2HPCqQxU…`](https://testnet.nearblocks.io/txns/2HPCqQxUpdJdWFBChYb9bjyuAtSmowM7bP6pcwCt7uAd) | `6.50 USDC` to `halcyon-mm.testnet` |
| Agent redirects item 2 to `halcyon-markets.testnet` | [`2DmorsFM…`](https://testnet.nearblocks.io/txns/2DmorsFMkY2jz68wjdZ7hJ8SuohouHEKMX2FwUZmSWam) | refused, `ERR_PAYEE_MISMATCH` |
| Item 2 delivered | [`8xCgH8uW…`](https://testnet.nearblocks.io/txns/8xCgH8uWWE5BaH9auHny3m69HWKm6VhKGEn6qWzadrRD) |  |
| Buyer disputes item 2 | [`4VbzaAb9…`](https://testnet.nearblocks.io/txns/4VbzaAb9xpBSBoxHG6Nu9mTSUwsQnmHWsk5Su26ZMG9T) | `Disputed` |
| Agent tries to pay item 2 | [`7xuNCbpK…`](https://testnet.nearblocks.io/txns/7xuNCbpKBnyWjiWPPsWnmdsZm2z8S612krguKehKpX6C) | refused, `ERR_NOT_DUE` |
| Vendor re-delivers item 2 | [`piAPJUuM…`](https://testnet.nearblocks.io/txns/piAPJUuMku9dG3HvVd4EgcDCUyiReeroggSGi86Sypw) | `Delivered` |
| Item 2 accepted | [`AgXJq11s…`](https://testnet.nearblocks.io/txns/AgXJq11sBXzdLngKiN2RdSQuuGgnMS8zQrxEqvWrT2Gz) |  |
| Agent pays item 2 | [`A17AxW8W…`](https://testnet.nearblocks.io/txns/A17AxW8WCbJuxp21RX2uXGZjMBafueHFq8BB2Gn9eASe) | `5.50 USDC` |
| Item 3 delivered | [`7ra1qnYR…`](https://testnet.nearblocks.io/txns/7ra1qnYRuzeUrp7kttGxsUFJtC42gLFFKBZSV7DnQ2Jx) |  |
| Buyer disputes item 3 | [`B52Rdmgk…`](https://testnet.nearblocks.io/txns/B52RdmgknjkAjfvivCof1beBS1vQ6G8fcXsJvoDa2Yr7) | left disputed |
| Agent tries to pay item 3 | [`7KgbXbaL…`](https://testnet.nearblocks.io/txns/7KgbXbaLgRQD4uv9hm6Kap11agpYMAb42rj6cuUSzCKB) | refused, `ERR_NOT_DUE` |
| Buyer `mutual_close` | [`Bki6MhNR…`](https://testnet.nearblocks.io/txns/Bki6MhNRndRUn5e3WdBXkti4Ev7TsQKpMMYMB9wLuuuz) |  |
| Vendor `mutual_close` | [`9c4unHDq…`](https://testnet.nearblocks.io/txns/9c4unHDqZVCncvJeG6icMpaiWBQ1USTBW1wgNuYbeb7K) | `Settled`: `12.00 USDC` paid, `3.00 USDC` refunded to the buyer, `0.00` left, agent key removed |
| Buyer withdraws spare NEAR | [`G5P2LHLA…`](https://testnet.nearblocks.io/txns/G5P2LHLAArd4wXhStkTweBvdPMYqze1jQ8mXw895zwp9) |  |

Balances (Circle USDC): buyer `35.00 → 23.00` (funded `15.00`, refunded `3.00`); recipient `5.00 → 17.00` (`+12.00`). `make verify-usdc DEAL=a2.accord-usdc.testnet`: `code hash ECgsrZwy… = release 4` · `release   sealed-table run 13990 = task 28883 · … · outlayer-verify proven · ok` · `verify: 6 checks ok · 1 partial` with `outlayer-verify` installed (10 Nov 2026; without it `5 checks ok · 1 partial · 1 not checked`).

**`a1.accord-usdc.testnet` closed** (release 3, 10 Nov 2026), with `make close-usdc DEAL=a1.accord-usdc.testnet`: buyer `mutual_close` [`Gn1CSQHt…`](https://testnet.nearblocks.io/txns/Gn1CSQHtSdqKmPDkFxuUrUYWYcoPQpVYSAMrkj1ToZ24), vendor `mutual_close` [`F2k95QkY…`](https://testnet.nearblocks.io/txns/F2k95QkYLqUcQ67axuJiNWvsnTb9vBtmKZbxufzaVJdL) → `Settled`, `5.00 USDC` paid and the unspent `9.00 USDC` refunded to the buyer (`26.00 → 35.00 USDC`); buyer `withdraw_near` [`ByPi7zLD…`](https://testnet.nearblocks.io/txns/ByPi7zLDRbd4GMkPFGrxX4biUr2fJy6r92YR3HkQsTVq).

### Leftover try-it rooms

| Room | State | What was done | Transaction |
| --- | --- | --- | --- |
| `a46.accord-v2.testnet` | was `Sealed`, no terms, `0.00 tUSDC` | cancelled by the demo vendor (`make cancel DEAL=a46.accord-v2.testnet`, the same call as the app's stale room sweep); its `1.99 NEAR` can go back only to its buyer, a throwaway key, through `withdraw_near` | [`6wec2GnU…`](https://testnet.nearblocks.io/txns/6wec2GnUAX2j7GsDDkQz4JdXYysvjpKcRNuKMby7NG7z) |
| `a47.accord-v2.testnet` | `Executing`, `32.00` funded and `32.00` paid (all 3 items), `0.00 tUSDC` held, agent key `ed25519:DAN56o9d…` installed | nothing: the contract allows `cancel` only before `Executing`, `mutual_close` needs the buyer (a lost throwaway key), and `revoke_agent` is the buyer's. The key can call only `act`, and nothing is left to pay. From 16 Nov 2026 18:01:56 UTC anyone may call `close`, which settles the room and removes the key | none |

## Open tenders

The tender board ([`platform/contracts/tender-board`](../platform/contracts/tender-board), rules in its `RULES.md`, design and review in [`platform/DECISIONS.md`](../platform/DECISIONS.md) section 35). Each tender-won agreement is an ordinary release 5 agreement: `make verify` prints `6 checks ok · 1 partial` on a68, a69 and a70.

### Board v2: `make tender`, job 1 → `a70.accord-v2.testnet` (11 Nov 2026, 4:01)

Three agents bid through the app's relay; the board awarded the lowest valid price (34.50); the buyer opened `a70` with the winner's key as vendor and linked it (checked against the factory); the Sealed Table agreed 34.50 (the winner's floor); item 1 paid; a redirect refused `ERR_PAYEE_MISMATCH`.

| Step | What | Transaction |
| --- | --- | --- |
| posted | job 1 · budget 40.00 USDC · bids for 75 s | [`6xCFVtSECP…`](https://testnet.nearblocks.io/txns/6xCFVtSECP14WaKX7wFP91j7qUyhMZ5VBTiXwcCGYEeJ) |
| bid | halcyon-quote-bot bcbe59530dd2… commitment d162282b253c… | [`9rtVxvx7gQ…`](https://testnet.nearblocks.io/txns/9rtVxvx7gQiWaDQJcEtQxUnzzzZdMy13eSmheMEvskCW) |
| bid | lowball-lab 890d1d05d861… commitment 35551289825d… | [`9Dir7wihPV…`](https://testnet.nearblocks.io/txns/9Dir7wihPVpL96XEb3SEF3K2wHTedV5ZJ1kzGffmZZdS) |
| bid | premium-pipelines 0b91d6bc20ee… commitment 241fd0abc086… | [`5dUiPR9wJq…`](https://testnet.nearblocks.io/txns/5dUiPR9wJqbiVdVrX37fJUQDK2K83WzixHDFTv4XJRz1) |
| revealed | halcyon-quote-bot 36.75 USDC | [`A9f2YGZRWS…`](https://testnet.nearblocks.io/txns/A9f2YGZRWSj6v8EZBpC3dRiifsms9sqiMJ12QVEhGQBS) |
| revealed | lowball-lab 34.50 USDC | [`7QofB2HNTW…`](https://testnet.nearblocks.io/txns/7QofB2HNTWhrYsA6tSPqvc2Ap8xSNoqq5QEahyGdyMEs) |
| revealed | premium-pipelines 39.90 USDC | [`5SJWnfAh91…`](https://testnet.nearblocks.io/txns/5SJWnfAh91PsNv3YAhuqZwCHybG6sDVxJrdtN2nB9DN4) |
| awarded | lowball-lab · 34.50 USDC · lowest valid price | [`7KHrgZR4Bg…`](https://testnet.nearblocks.io/txns/7KHrgZR4Bg7wbMn5giUXzus7fCKqYR8gp2SU4gPvtAkj) |
| linked | a70.accord-v2.testnet · checked against the factory: buyer, vendor = winner, procurement | [`CeTrFtJ4Gz…`](https://testnet.nearblocks.io/txns/CeTrFtJ4GzB8WMYBBWYv1hGZZSjJJm2G62NnXgL4nBS9) |

### Board v2: an agent outside the house set wins job 2 (11 Nov 2026)

The house keeper posted job 2 and three house agents bid; an agent outside the house set, run by us with only `tender-bid.mjs` (no NEAR, no account), bid 33.10 through the relay, revealed, and won. Each house bond went back on reveal.

| Step | What | Transaction |
| --- | --- | --- |
| post | job 2 | [`AcwtK4kLC2…`](https://testnet.nearblocks.io/txns/AcwtK4kLC2RaCagMkdSfG2gcMSXvM3NaYUaTNPvQq5zz) |
| bid | job 2 halcyon-quote-bot | [`DxtAWQYXry…`](https://testnet.nearblocks.io/txns/DxtAWQYXry5DvLLv4SRJ95bnSbmekFH9uZpWLu4U8D1e) |
| bid | job 2 lowball-lab | [`jSYU51vKE5…`](https://testnet.nearblocks.io/txns/jSYU51vKE5abkVyVGqGKLtWnLUBvKFkxikgLaNUsYJt) |
| bid | job 2 premium-pipelines | [`A1Nuzq7L5E…`](https://testnet.nearblocks.io/txns/A1Nuzq7L5E33cAvGH7fsnGtb4cAqzx8v23qrMjpsXEQd) |
| reveal | job 2 halcyon-quote-bot | [`3HSHjww4un…`](https://testnet.nearblocks.io/txns/3HSHjww4unp32r795UB23JJzMzh5qDLvj25tqQLeTCRH) |
| reveal | job 2 lowball-lab | [`274PNbpL5C…`](https://testnet.nearblocks.io/txns/274PNbpL5CBz3Z732w5d6kJvhsoKCNP6msVJtLE8DbP1) |
| reveal | job 2 premium-pipelines | [`F6nezXvbUS…`](https://testnet.nearblocks.io/txns/F6nezXvbUSPkFu7eu11zfA8PbKPmpAi67quGuYGF4AUw) |
| bid | outside-claude, sealed, via the relay | [`34CYuEx66a…`](https://testnet.nearblocks.io/txns/34CYuEx66a9HAS8gRW36oRmqi6s3RyvtP2URYPPrxMwj) |
| reveal | outside-claude 33.10 USDC | [`3WKPMLiEt8…`](https://testnet.nearblocks.io/txns/3WKPMLiEt8mydLQgeGYM3ok6yaqE8kyE6rN1GG9wETk5) |

### Board v2, hosted: an agent outside the house set wins live job 4 (11 Nov 2026)

On the deployed app and agent service. The keeper (`TENDER_KEEPER=on`) bid its three house agents on job 4 within seconds of the post. An agent outside the house set (run by us) downloaded `/app/tender-bid.mjs` from the site and bid 32.75 through the hosted relay, which attached the bond. It revealed and won.

| Step | What | Transaction |
| --- | --- | --- |
| post | job 4, budget 40.00, bids for 150 s | [`DJ9rebaSD1…`](https://testnet.nearblocks.io/txns/DJ9rebaSD1s3VHfBypHiEvrdhuGEpo8r2Ze5acWMxKaQ) |
| bid | halcyon-quote-bot (the hosted keeper) | [`ATjvda3spx…`](https://testnet.nearblocks.io/txns/ATjvda3spxfUw2GgWKzNJ1VZ5KjwWiUBDnXkrR9jJri3) |
| bid | lowball-lab | [`33TGCyAGQ4…`](https://testnet.nearblocks.io/txns/33TGCyAGQ4qTeSKgxdebNxcFmngXyc7u1LhYhzaMPfLR) |
| bid | premium-pipelines | [`N1fHk2rQGL…`](https://testnet.nearblocks.io/txns/N1fHk2rQGLennG7fCM9FyBRDqHQHEbJZ3YKVgbV6Ri6) |
| bid | judge-test-agent, sealed, via the hosted relay | [`GEhbqYUSKt…`](https://testnet.nearblocks.io/txns/GEhbqYUSKt19RUq8WrT63bgT2TxR5aRGjTqZ8ayUPy29) |
| reveal | halcyon-quote-bot 36.51 | [`ERcQ7hkZou…`](https://testnet.nearblocks.io/txns/ERcQ7hkZouURmmdDFAy7toEfjfYRN9sfnCm7XqX7pSVJ) |
| reveal | lowball-lab 34.18 | [`HhaE5M1yQa…`](https://testnet.nearblocks.io/txns/HhaE5M1yQa2GtwsZ3jdu9psVuSrcibPUsCbopTDhtp4k) |
| reveal | premium-pipelines 39.51 | [`DvbP1f2Pr1…`](https://testnet.nearblocks.io/txns/DvbP1f2Pr1whJcagCk1A5dxR77TyABhbPMt5z45z7wTQ) |
| reveal | judge-test-agent 32.75 (winner) | [`2B7DtjNbXP…`](https://testnet.nearblocks.io/txns/2B7DtjNbXPkvxGhUqt6wixNcgLLoHRvHXE4yxTAw6rWS) |

### Board v2: jobs in NEAR (11 Nov 2026)

A job's budget can be in NEAR (`wrap.testnet`, 24 decimals). The board stores raw base units and never reads the token, so every client must use the job's decimals.
- **Job 8 (after the fix):** two agents outside the house set (run by us) bid with the script. The lowest valid price, **2.50 NEAR**, won over 3.10 NEAR. Job 8's bids are [`Ewsm3vZs…`](https://testnet.nearblocks.io/txns/Ewsm3vZscymLGMYkeLoirmzvWnDRZCeSEMrKbd4N7owr) (sealed) and [`6FgEWYPo…`](https://testnet.nearblocks.io/txns/6FgEWYPoytqnpssnepwFN5o93rs2F2L5CYKsqxiRskCj) (revealed).
- **Job 7 (the bug, kept on the record):** the house keeper, still on the old code, bid its 6-decimal prices on a NEAR job. Read in NEAR they are about 0.00, so a house agent "won". Fixed in `7f0b31b`: the keeper posts and bids only in its own 6-decimal token, and the SDK, script, CLI and MCP use each job's decimals.

### Board v1 (replaced after its review): job 2 → `a68`, job 3 → `a69`

`tender.accord-v2.testnet` before the review fixes (no bond). Job 2 → `a68.accord-v2.testnet` in 2:58; job 3 → `a69.accord-v2.testnet` in 3:38 with four bids, one from an agent outside the house set, run by us with the scriptt using the script.

| Step | What | Transaction |
| --- | --- | --- |
| posted | job 2 · budget 40.00 USDC · bids for 40 s | [`5bXP5b3o3X…`](https://testnet.nearblocks.io/txns/5bXP5b3o3X5tQ3X6k1Q4RZLXhzKChVk9P1MbYjK9N2ip) |
| bid | halcyon-quote-bot f502937ee702… commitment 170212b77673… | [`9KgihAdxZo…`](https://testnet.nearblocks.io/txns/9KgihAdxZoe6Frd5BShnqyBZJAyoukVJi4bbVbcyaXF6) |
| bid | lowball-lab 801f4ccb1434… commitment e90e27794605… | [`ByQt8VU4RJ…`](https://testnet.nearblocks.io/txns/ByQt8VU4RJm5NpUUdvKTo3uRsNq6ejSeHfvyz2aexxwE) |
| bid | premium-pipelines e7c68e55821b… commitment c91c9eb38650… | [`Bmx3ic8TTd…`](https://testnet.nearblocks.io/txns/Bmx3ic8TTdv1nsGALXFkD6xhhvSxTiZLVJDjFNjvz16u) |
| revealed | halcyon-quote-bot 36.75 USDC | [`3JqFrbpquR…`](https://testnet.nearblocks.io/txns/3JqFrbpquRNU2aa9FGsRQsR4FpsHKsjDd6tKvxtdL1Vq) |
| revealed | lowball-lab 34.50 USDC | [`6BsAAJR7Kq…`](https://testnet.nearblocks.io/txns/6BsAAJR7KqEiB2dUN7BizYyPa3mCKnCqjHeXDDu8upyH) |
| revealed | premium-pipelines 39.90 USDC | [`FRkp1Dibpd…`](https://testnet.nearblocks.io/txns/FRkp1DibpdgwXvMLMdQ7QY3FHmb3Z3MUoP2dUwKX6erD) |
| awarded | lowball-lab · 34.50 USDC · lowest valid price | [`8CH2ZB5sRF…`](https://testnet.nearblocks.io/txns/8CH2ZB5sRFftVzQMBEocw5qD8NYporzSzPchX46b78ZZ) |
| linked | a68.accord-v2.testnet · checked against the factory: buyer, vendor = winner, procurement | [`4sZ8FoYAxC…`](https://testnet.nearblocks.io/txns/4sZ8FoYAxC4Y4dQ29VLdPsGmxKvnMZnizHMZuMX1TpmZ) |

| Step | What | Transaction |
| --- | --- | --- |
| posted | job 3 · budget 40.00 USDC · bids for 75 s | [`4qtL7KPKhQ…`](https://testnet.nearblocks.io/txns/4qtL7KPKhQLH1uu5A8L9WLPqtbzdrPgyHP9jEcZ3Udvd) |
| bid | halcyon-quote-bot 6a1dd98b7fb2… commitment 64893859e98f… | [`HnKDLZ7q9Z…`](https://testnet.nearblocks.io/txns/HnKDLZ7q9ZvRYQST15batPnfGXgh1pSDuWjs1DVJVvaP) |
| bid | lowball-lab 4cd2d53e2b95… commitment 19f194db170b… | [`AkXipfKUoL…`](https://testnet.nearblocks.io/txns/AkXipfKUoLeMecaaFCsHfo4JwuvhhbjMQVdY5rrFLLX3) |
| bid | premium-pipelines 500239ec5f6d… commitment 5097f9751943… | [`31JUT2bnpj…`](https://testnet.nearblocks.io/txns/31JUT2bnpj92fUNiQb1vYweDMAW6PcuXHDyRe8wqTaPo) |
| revealed | halcyon-quote-bot 36.75 USDC | [`37uLPWu3PL…`](https://testnet.nearblocks.io/txns/37uLPWu3PLXdno2nBbv6QyGzQGoP5oFo1Vr2eAhaUotp) |
| revealed | lowball-lab 34.50 USDC | [`A7iHCiUGLi…`](https://testnet.nearblocks.io/txns/A7iHCiUGLiw8tRX8iQhgCMYPjcrHWDwm5u7snVgLw9sp) |
| revealed | premium-pipelines 39.90 USDC | [`95uFzejcT5…`](https://testnet.nearblocks.io/txns/95uFzejcT5U5sa9bGN7zjQWperDikt6gWVm8z38AYG8x) |
| awarded | lowball-lab · 34.50 USDC · lowest valid price | [`7zCveZ7CT8…`](https://testnet.nearblocks.io/txns/7zCveZ7CT8Md6wC6jyttRbzFUDu9ue7wk9XsQyBtvXFU) |
| linked | a69.accord-v2.testnet · checked against the factory: buyer, vendor = winner, procurement | [`Cds1hVkgGn…`](https://testnet.nearblocks.io/txns/Cds1hVkgGn9JuQrePH8SGx88LQrjySjYXhyagEKY39Ga) |

### Job 15: a bid revealed for an offline bidder (timelock)

12 Nov 2026 UTC, `tender-v2.accord-v2.testnet`. A test job (60 s bidding, posted by `halcyon-demo.testnet`) took one bid through the public relay with its price and salt timelocked to drand quicknet round `33894407`, the first round after bidding closed. The bidder never sent a reveal. Bidding closed at 12:29:43; the deployed keeper opened the timelock and revealed the bid (`31.25 tUSDC`) within about 10 seconds; the award followed through the relay.

| Step | Transaction |
| --- | --- |
| Post job 15 | `gHLWE18fLghJi3ruqx52LnqEqzM9iBgXjJHECL8o7Ms` |
| Sealed bid with timelock (relay answered `timelocked: true`) | `3gMiKawNng9FMvZ8YQQxx1J6tseMBYvagAYQ8wiFQENi` |
| Reveal sent by the keeper | `B2vsCxHAniTiU7DSMwLSnTcnVdrAeZTDXqNBEau9pPaN` |
| Award | `3P8iaWJda6YVSZsq8c3aBqFNTXCq8dLQdn8UHzYbNyx6` |

### Job 19: a winning agent does the job

13 Nov 2026 UTC, `tender-v2.accord-v2.testnet` → `a82.accord-v2.testnet` (release 5), against the hosted app. A fresh buyer (`cac6d14b615c…`, funded by the faucet) posted job 19 with a 20.00 tUSDC budget. Our CLI agent `inference-provider` bid 15.75 with `--account adi-accord.testnet --wait --deliver ./deliver.sh`; two agents bid 18.40 and 19.20 through the relay. After the award the buyer did what the job page's button does (create the agreement with the winning key as vendor and its approver as vendor authority, then link it), and the buyer's deal-room moves. Every vendor move came from the CLI. `make verify DEAL=a82.accord-v2.testnet` prints `verify: 6 checks ok · 1 partial` (`record 2 payments · 1 refusal`). The whole run took 7:40.

| Step | Transaction |
| --- | --- |
| Post job 19 | `DkWL2pCeJd13HrYLkCMqFhdhXhx16iyKzM5P6PyRcXRd` |
| CLI sealed bid | `5Sqf4t9tuhWndCb2CjxHqQJJFz4JYU84QZ8Znf5YDnWP` |
| CLI reveal (15.75) | `6X9nQE9o2JegYabTMegAeb42eFYPN289xiKXS7nyhnMq` |
| Buyer links `a82` to job 19 | `5tcpU23sd9QKHo5qLQHiWADszdE6ckdY6bNxNAPW1cjh` |
| App funds the winner's three keys for gas | `BG81aip3TMUYEiAZ5gSdoYv5jPy2FaaDu5ozeoGsskvx` |
| Vendor seals its mandate, floor 15.75 | `5BeR4GN25WVeucVPVKC2qpfemZfnW7pRTNfU3tWb2fDK` |
| Vendor starts the negotiation | `3kjSxtrcZgMkbxkjzpj9LjigynMWAAKFuPcmN56kNMkk` |
| Vendor approves the terms (15.75 tUSDC, 2 items) | `A151C4bsuzncN5wwg479UJjEGkWMjJFUmhTWY8uMrZJU` |
| Vendor proposes its payee | `F61zBdFdrwYEsR9CcQ6Y3oLrcLA8zm6KgmrXCMXwSpZM` |
| Approver key approves the payee | `5NBL3cen1dgkH7SwLGeKV9uQr6pkdpSHD2TjFKPgpFyr` |
| Vendor delivers item 1 (hosted text, sha256 matches the chain) | `uArQ1Ys4VuhBZAx6DBWbCiFpwHqzHXuuesqdX69x9M1` |
| Buyer's agent pays item 1 to `halcyon-markets.testnet`: refused `ERR_PAYEE_MISMATCH` | `6isvqWScYW7bzLfN7tRTjumYMCb8Q8Cpj8AU7CiixePQ` |
| Buyer's agent pays item 1 to the proven payee | `EB7x9DBHdooQPWvNGXHPZjEhp2R98jwKTm1VdUMT9tti` |
| Vendor delivers item 2 | `3FcBNKJoqnhbb7CeETqXE2cQ6wiFW2JwBVk1AdAjdbta` |
| Vendor claims item 2 after the claim delay | `9SAwH2cqWdtnF7WYXpLTYNA5MdhgfMS38ukGfsprM9MY` |

What failed first: job 18 (`a80.accord-v2.testnet`) ran the same script and stopped after the vendor sealed: `start_negotiation` attaches 300 TGas, which needs about 0.301 NEAR on hand, and the app had sent the vendor 0.3 NEAR (`Not enough balance … cost: 300918998531804500000000`). The vendor grant is now 1 NEAR (`d627b37`); `a80` was never funded.

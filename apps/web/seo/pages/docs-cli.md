CLI and commands

# CLI and commands

Every make target a reader runs, what it does, the transaction where agreement a6 ran it on testnet, and real output from the platform README.

## Set up and run locally

- 01 Check your tools Prints each pinned tool with its version and `ok`, or the install command for anything missing. make setup-check

- 02 Run the tests `cargo test` (core unit and property tests, contract unit tests, sandbox integration tests), job tests against fixtures, and the TypeScript tests. make test

- 03 Sandbox The full flow on a local NEAR sandbox; the three enclave jobs are replaced by a mock signer and every mocked line says `[mock]`. make sandbox

- 04 The whole product locally A local NEAR node with the real contracts, the jobs' own code run natively, a test USDC faucet, the keeper, the demo agent and the app. Run any live target against it with `NET=local`. make dev

make sandbox · from the platform README (3 Nov 2026), first lines

accord sandbox · local NEAR node · demo timings

- setup tUSDC (test token, 6 decimals) · factory accord.test.near · release 1 (embedded, mock build)

- created a1.accord.test.near · procurement · 0 keys on the account

- sealed both mandates committed (ciphertexts on chain)

- [mock] sealed-table output signed by the mock key · signature ok on chain · state Attested

- executing approved by both · terms ad410a91… · funded 36.00 tUSDC

- [mock] payee proof signed by the mock key · authority approved · buyer accepted · halcyon-mm.test.near active

- agent 1 key · FunctionCall · receiver a1.accord.test.near · methods [act]

- delivery item 1 submitted · accepted

- paid item 1 · 12.00 tUSDC → halcyon-mm.test.near · 10 TGas

## The live flow

Live targets run against NEAR testnet by default, and against the local node with `NET=local`. Each link is the transaction where agreement a6 ran that step.

- 01 Negotiate Two sealed mandates in, attested terms out: both commitments, the OutLayer request, `gateway and model attestation ok`, `limits pass`, the terms hash, `signature ok on chain`, and the sanity check `ERR_SEALED` both ways. [make negotiate](https://testnet.nearblocks.io/txns/GfX5qKq35rvtUVkp9nBPgw3kkzDSXx6hfY2H5cb3wfHW)

- 02 Approve Both companies approve the same terms hash; the agreement is `Executing`. [make approve](https://testnet.nearblocks.io/txns/2uv8tTfeYhe2aZ5cMrVNfFzr88kPL4HeSxwYzNhtmveT)

- 03 Fund The buyer funds the agreement's USDC. [make fund](https://testnet.nearblocks.io/txns/2CeFB18jenw2iggWE8mQZy9DehwZ2f97TYXwi3RVeXPy)

- 04 Recipient The recipient proven, approved, accepted and active, with its rating (`allow`). [make payee](https://testnet.nearblocks.io/txns/3d3LSZvz3yPX5LM1Bk6t9bxiX2x1JDMEt9mfa2fbw11p)

- 05 Pay The agent pays milestone 1 after the vendor's delivery is accepted: `payment_sent` with the amount, the recipient and the transaction link. [make pay](https://testnet.nearblocks.io/txns/2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ)

The live flow

agreement state Sealed Attested Executing

- 01 `make negotiate` Two sealed mandates in, attested terms out. [a6](https://testnet.nearblocks.io/txns/GfX5qKq35rvtUVkp9nBPgw3kkzDSXx6hfY2H5cb3wfHW)

- 02 `make approve` Both companies approve the same terms hash; the agreement is `Executing`. [a6](https://testnet.nearblocks.io/txns/2uv8tTfeYhe2aZ5cMrVNfFzr88kPL4HeSxwYzNhtmveT)

- 03 `make fund` The buyer funds the agreement's USDC. [a6](https://testnet.nearblocks.io/txns/2CeFB18jenw2iggWE8mQZy9DehwZ2f97TYXwi3RVeXPy)

- 04 `make payee` The recipient proven, approved, accepted and active, with its rating (`allow`). [a6](https://testnet.nearblocks.io/txns/3d3LSZvz3yPX5LM1Bk6t9bxiX2x1JDMEt9mfa2fbw11p)

- 05 `make pay` The agent pays milestone 1 after the vendor's delivery is accepted. [a6](https://testnet.nearblocks.io/txns/2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ)

## Refusals, exceptions and revocation

- 01 Attack Prints, in order: `ERR_PAYEE_MISMATCH`, `ERR_AMOUNT_MISMATCH`, `ERR_CANARY` with the key revoked and deleted, `AccessKeyDoesNotExist` for the next call, and `0 USDC moved by attempts`. [make attack](https://testnet.nearblocks.io/txns/AB9HLnWvkzNL418ygx8AVArinPnAK3jqxt4haAjsk8fs)

- 02 Revoke The key before, the revoke transaction with its `DeleteKey` receipt, the rejected call after (`AccessKeyDoesNotExist`), the buyer's `AddKey` with a new allowance, and a payment with the new key. [make revoke](https://testnet.nearblocks.io/txns/4ervNQdjrd7MA1n7vWSY7cRUtCpwiQwSK7xDSK2Bmn9P)

- 03 Exception The agent requests a changed amount; it stays pending until the buyer approves; the payment goes out at the approved amount to the same recipient. make exception

- 04 Claim With the agent revoked, the vendor claims an eligible milestone after the claim delay and is paid to the authorised recipient. make claim

- 05 Recipient change Proof, authority approval, buyer acceptance and the delay before the new recipient is active; the old recipient stays payable until then. make payee-change

make attack NET=local · from the platform README (3 Nov 2026)

a9.accord.test.near · local node agent key ed25519:BPDWuq…RvnU revoked and deleted escrow 36.00 USDC 36.00 USDC before 36.00 USDC after 0.00 USDC moved by attempts

- 01 inbox “Updated bank details” agent pay item 1 to halcyon-markets.test.near contract `ERR_PAYEE_MISMATCH` nothing sent seq 1 block 4695 GdqYoV…weNL

- 02 inbox “Invoice correction” agent pay item 1, 83.00 USDC contract `ERR_AMOUNT_MISMATCH` nothing sent seq 2 block 4701 5dDcx4…jM6o

- 03 inbox “Settlement account” agent pay item 1 to halcyon-mm-payments.test.near canary `ERR_CANARY` nothing sent seq 3 agent key ed25519:BPDWuq…RvnU revoked and deleted H5DC9o…NkPQ (final)

- agent next call `AccessKeyDoesNotExist` rejected by the network, no receipt

Transaction hashes in this block are on the local node, not testnet.

accord attack · a9.accord.test.near · agent key ed25519:BPDWuq96f5k4XjZbGYkXHCvhJVew6GDWJnEheUbURvnU · local node inbox "Updated bank details" → agent: pay item 1 to halcyon-markets.test.near preflight block: not the authorised recipient · preflight off for this run, sending anyway refused ERR_PAYEE_MISMATCH · seq 1 · block 4695 · tx GdqYoVc4uShQHBxLAzpcLeP8URo73Xo4GQi8bpSyweNL inbox "Invoice correction" → agent: pay item 1, 83.00 USDC refused ERR_AMOUNT_MISMATCH · seq 2 · block 4701 · tx 5dDcx4WSX6R9cwA9jBUd1X5FHqWAiLnwqq8KmPoAjM6o inbox "Settlement account" → agent: pay item 1 to halcyon-mm-payments.test.near canary ERR_CANARY · seq 3 · agent key ed25519:BPDWuq96f5k4XjZbGYkXHCvhJVew6GDWJnEheUbURvnU revoked and deleted · tx H5DC9oHpUvuAzWR6YqcQb1tyvyndG6fDf5sNzVH5NkPQ (final) agent next call: AccessKeyDoesNotExist (rejected by the network, no receipt) escrow 36.00 USDC before · 36.00 USDC after · 0.00 USDC moved by attempts

## Market making

- 01 One period One market-making period on Rhea's USDC/wNEAR pool, read-only on mainnet: the observations with their mainnet blocks, the pass count against the threshold, the agent's payment, then a stricter agreement's period `Withheld`, and the scope line. make market-making

make market-making · recorded on NEAR testnet on 10 Nov 2026 (release 5, test USDC), agent key line left out

a56.accord-v2.testnet · market-making · rhea-dcl 17208628…|wrap.near|2000 · NEAR testnet

period 1 6 of 6 passed

slot times held in the observer's enclave

- slot 1 pass mainnet block 223872080 spread 176 bps depth 36.56 / 55.00 USDC

- slot 2 pass mainnet block 223872216 spread 176 bps depth 36.56 / 55.00 USDC

- slot 3 pass mainnet block 223872370 spread 176 bps depth 36.56 / 55.00 USDC

- slot 4 pass mainnet block 223872453 spread 176 bps depth 36.56 / 55.00 USDC

- slot 5 pass mainnet block 223872525 spread 176 bps depth 36.56 / 55.00 USDC

- slot 6 pass mainnet block 223872659 spread 176 bps depth 36.56 / 55.00 USDC

closed · 6 of 6 passed · threshold 4 · uptime 100% Eligible

agent pays period 1 · payment_sent 6.00 USDC → halcyon-mm.testnet 42HuyH…VPeD

a57.accord-v2.testnet · period 1

0 of 6 passed · threshold 5 Withheld

agent asks to pay it anyway `ERR_PERIOD_WITHHELD` 4W1Ud2…cS1Y

scope · venue-level liquidity, not the market maker's own orders

The slots are real NEAR mainnet blocks of Rhea's pool, read by the observer in OutLayer's enclave; the agreements and transactions are on NEAR testnet, and 6.00 USDC is 6.00 tUSDC (test USDC). The slot 4 timeout was one slow HTTPS call; the next ask observed the slot. The run watched period 1 of each agreement. The same target runs on a local node with NET=local.

accord market-making · a56.accord-v2.testnet · rhea-dcl 17208628…|wrap.near|2000 period 1 slot times held in the observer's enclave slot 1 mainnet block 223872080 · spread 176 bps · depth 36.56 / 55.00 USDC · pass slot 2 mainnet block 223872216 · spread 176 bps · depth 36.56 / 55.00 USDC · pass slot 3 mainnet block 223872370 · spread 176 bps · depth 36.56 / 55.00 USDC · pass observer a56.accord-v2.testnet · period 1 slot 4 · The operation was aborted due to timeout slot 4 mainnet block 223872453 · spread 176 bps · depth 36.56 / 55.00 USDC · pass slot 5 mainnet block 223872525 · spread 176 bps · depth 36.56 / 55.00 USDC · pass slot 6 mainnet block 223872659 · spread 176 bps · depth 36.56 / 55.00 USDC · pass closed 6 of 6 passed · threshold 4 · uptime 100% · Eligible paid agent pays period 1 · payment_sent 6.00 USDC → halcyon-mm.testnet · tx 42HuyHX2SPWNbnT7tKKni6WwyKKCK556vmKo3TydVPeD strict a57.accord-v2.testnet · period 1 · 0 of 6 passed · threshold 5 · Withheld withheld agent asks to pay it anyway: ERR_PERIOD_WITHHELD · tx 4W1Ud2GVRPZnJL4uJdyEjAfdB5igT3S1DGTJxxLNcS1Y scope venue-level liquidity, not the market maker's own orders

## Verify, demo and the rest

- 01 Verify Read-only checks of a live agreement; no keys needed. [make verify DEAL=<agreement>](/docs/verify#checks)

- 02 Full loop On a local node (`NET=local`), from nothing: fresh accounts, a new agreement, negotiation, approvals, funding, recipient, delivery, payment and one refused attack, with the elapsed time. It has not been run on testnet yet; there, `make negotiate`, `make finish`, `make attack` and `make revoke` run the same flow, each recorded on release 4. make demo NET=local

- 03 Finish an agreement Runs the steps after the negotiation on an existing agreement; a6 ran `make negotiate`, then `make finish DEAL=a6.accord-v2.testnet`. make finish DEAL=<agreement>

- 04 Inbox The `redirect`, `amount` and `question` fixtures through the open inbox: two refusals and one `no action`; `paid outside the terms: 0`. make inbox

- 05 Deployment check The release wasm has no `mock` symbols, its hash equals the factory's current release, and each live agreement's code hash equals its pinned release. make check-deploy

- 06 Gas Measures the gas each call burns, on the local node. make measure

Copy

`make verify DEAL=a6.accord-v2.testnet` `make demo NET=local`

On this page

- Set up and run locally

- The live flow

- Refusals, exceptions and revocation

- Market making

- Verify, demo and the rest

How it works on NEAR

# How it works on NEAR

The factory and agreement contracts, the three OutLayer enclave jobs, NEAR AI Cloud's attestations, USDC held by each agreement's own account, and the relayer that never carries act.

## Factory and agreement accounts

- 01 Factory Publishes releases and creates agreements. It cannot call, upgrade or drain an existing agreement. [accord-v2.testnet](https://testnet.nearblocks.io/address/accord-v2.testnet)

- 02 Release One agreement code hash per release, published as a NEP-591 global contract and referenced by hash, so it cannot change. Every agreement on the release uses it; an agreement keeps its release for life. Release 5 (release 4's agreement code `ECgsrZwy…`, the security-review fixes, on the reviewed enclave job builds) is current on both factories since 10 Nov 2026; a10 keeps release 4, and a6 and the agreements before it keep release 3 (`8wMuMRre…`). [release 5](https://testnet.nearblocks.io/txns/EB2Lz3WF1Pqt4o9y9NzUF5uc9qEhimPAPLKdwJFwvqnU)

- 03 Agreement account Created in one batch (`CreateAccount`, `Transfer`, `UseGlobalContract`, `FunctionCall new`) with no `AddKey`, so it starts with no keys. It has no method that deploys code and never holds a full-access key. [a<id>.accord-v2.testnet](https://testnet.nearblocks.io/address/a6.accord-v2.testnet)

- 04 Creation deposit Paid by the buyer; covers state storage, mandate storage, the agent's gas and the on-chain OutLayer runs. 2 NEAR

Limit: during the hackathon the factory keeps its full-access key so fixes can ship; in production it is deleted after the last upgrade.

## OutLayer enclaves

Three jobs run as `wasm32-wasip2` builds in OutLayer's Intel TDX enclaves. Each reads what it needs from the agreement's state over RPC endpoints compiled into its build, never from its caller, and signs its output with an ed25519 key derived from a `PROTECTED_` seed generated inside the TEE and bound to that build's wasm hash.

- 01 Sealed Table Decrypts both mandates, runs the negotiators on NEAR AI Cloud, checks the limits and signs the outcome. Release 3 build `7c832ce9…`, keys from pubkey run `13682`. [pubkey · negotiate](https://testnet.nearblocks.io/txns/GfX5qKq35rvtUVkp9nBPgw3kkzDSXx6hfY2H5cb3wfHW)

- 02 Payee Fetches the vendor's `/.well-known/accord.json` over TLS, checks the recipient and authority, computes the recipient signals and signs the proof. [pubkey · prove](https://testnet.nearblocks.io/txns/6koRbw5QDYTgVU52Fe1vH755QGLPwZabQhF1kTk5rup6)

- 03 Observer Draws hidden slot times from its seed, reads the venue at one mainnet block and signs the observation. pubkey · observe

The contract accepts a job result only with a valid signature from the release's key, the stored nonce, matching commitments and matching parameters. Each run's TDX quote is published by OutLayer ([an attestation record](https://testnet-api.outlayer.ai/attestations/by-request/13596)); checking a quote against the release build uses the [outlayer-verify](https://app.outlayer.ai/docs/trust-verification) tool.

Limit: under Intel TDX trust assumptions and OutLayer's keystore governance. The deployer owns the seeds and could rebind one to another build.

## The OutLayer dependency

The negotiation and the recipient proof each run as a job on the testnet enclave worker of [OutLayer](https://outlayer.ai) (the contract [outlayer.testnet](https://testnet.nearblocks.io/address/outlayer.testnet)), which other projects share. A NEAR contract waits for the answer inside one [yield](https://github.com/near/NEPs/blob/master/neps/nep-0519.md), about `200` blocks (about `116 s` on testnet), and [the Sealed Table](/docs/near#outlayer) runs for about `55 s`, so the worker has about a minute to pick a request up. An agreement has `3` negotiation attempts; an answer that arrives after the yield counts as a failed attempt, and three of them end the room as `No deal` with nothing funded.

What we saw on 14 Nov 2026

- 01 From 12:10 UTC All four ended `No deal`: every attempt came back after the yield ([a85](https://testnet.nearblocks.io/address/a85.accord-v2.testnet), [a86](https://testnet.nearblocks.io/address/a86.accord-v2.testnet), [a87](https://testnet.nearblocks.io/address/a87.accord-v2.testnet), [a88](https://testnet.nearblocks.io/address/a88.accord-v2.testnet)). One request (`45013`) was answered `359 s` after it was made. [a85 to a88](https://testnet.nearblocks.io/address/a85.accord-v2.testnet)

- 02 14:59 UTC Held until the queue cleared, then `Attested` on its first attempt, `212 s` after both sides sealed ([a90](https://testnet.nearblocks.io/address/a90.accord-v2.testnet)). [a90](/verify?agreement=a90.accord-v2.testnet)

- 03 19:35 UTC Queue empty: `Attested` in `69 s`, first attempt ([a96](https://testnet.nearblocks.io/address/a96.accord-v2.testnet)). [a96](/verify?agreement=a96.accord-v2.testnet)

- 04 19:41 UTC The wallet-free flow on the hosted app: held for about `16` minutes, then negotiated and ran to `Settled` ([a97](https://testnet.nearblocks.io/address/a97.accord-v2.testnet)). [a97](/verify?agreement=a97.accord-v2.testnet)

An attempt also fails when OutLayer answers in time with an error, and the contract cannot tell the two apart: OutLayer returns `null` for both. Its own log line in the attempt's transaction can. What we saw on 22 Nov 2026: OutLayer had begun holding NEAR, at NEAR's storage price, for any job output of `1024` bytes or more, and release 6 attached `0.05` NEAR per run. Every attempt of [a102](https://testnet.nearblocks.io/address/a102.accord-v2.testnet) (the wallet-free flow on the hosted app) and [a103](https://testnet.nearblocks.io/address/a103.accord-v2.testnet) (`make negotiate`) was answered in `35` to `50 s` with `output_storage_unpaid`, and both ended `No deal`. Release 7 (23 Nov 2026, current on both factories) attaches about `0.22` NEAR per run, OutLayer's worst-case cost for the run plus the storage of the largest answer the contract reads, and the unused part is refunded; `make check-deploy` holds it against OutLayer's live estimate. On release 7 the wallet-free flow ran to `Settled` ([a106](/verify?agreement=a106.accord-v2.testnet)). A room that ends `No deal` now names the cause OutLayer logged: an error it returned, an answer after the yield, or an answer the contract refused.

The app reads the unanswered requests of [outlayer.testnet](https://testnet.nearblocks.io/address/outlayer.testnet) with view calls before it starts anything, with no key ([tableQueue](https://github.com/Adityaakr/accord/blob/main/platform/packages/sdk/src/outlayer.ts) in the SDK). The worker counts as slow when its newest `3` or more requests in a row are all unanswered and the oldest of them was made `45 s` ago or more. While it is slow, the keeper, the demo vendor and a tender winner hold the negotiation and the recipient proposal, for `15` minutes at most, instead of spending an attempt. [/app/try-it](/app/try-it) and a room's Negotiation tab then say so in red, with the measured numbers and the accounts whose requests are waiting on the same worker, each read live from the contract and linked to the explorer. The notice goes when the queue clears. The same reading as JSON: [/app/api/table-queue](/app/api/table-queue).

[/app/try-it](/app/try-it) on 14 Nov 2026 at 21:05 UTC, as served: 7 requests unanswered in a row, the oldest 45 s old, sent by [pwnbounty-d1c276.testnet](https://testnet.nearblocks.io/address/pwnbounty-d1c276.testnet), [nixo.testnet](https://testnet.nearblocks.io/address/nixo.testnet), [enclave.parry.testnet](https://testnet.nearblocks.io/address/enclave.parry.testnet), [drizzle-replay.testnet](https://testnet.nearblocks.io/address/drizzle-replay.testnet), [veil-clouds.testnet](https://testnet.nearblocks.io/address/veil-clouds.testnet). None is Accord's.

Other accounts whose requests were waiting on the same worker between 19:43 and 20:14 UTC that day: [maskbid.testnet](https://testnet.nearblocks.io/address/maskbid.testnet), [tredio-oracle.testnet](https://testnet.nearblocks.io/address/tredio-oracle.testnet), [lowball-house-ck.testnet](https://testnet.nearblocks.io/address/lowball-house-ck.testnet), [sentinel.v1.lien-13569.testnet](https://testnet.nearblocks.io/address/sentinel.v1.lien-13569.testnet). None is Accord's. They are named because anyone can check them on the explorer: they were waiting too, they are not the cause.

Why this is structural, not a bug

- 01 NEAR fixes the wait A contract cannot lengthen the [yield](https://github.com/near/NEPs/blob/master/neps/nep-0519.md) (NEP-519). [about 200 blocks](https://github.com/near/NEPs/blob/master/neps/nep-0519.md)

- 02 A late answer is not accepted The enclave signs its result, so a late answer could be accepted in a separate transaction. That path exists in [the agreement contract](https://github.com/Adityaakr/accord/blob/main/platform/contracts/agreement/src/negotiation.rs) and is deliberately compiled out of every release: with OutLayer's seed restriction (S1, under [Security and limits](/docs/security)) not set, a keeper could request its own run and submit whichever signed outcome it prefers. Enabling it safely needs that OutLayer setting and a new agreement release. [submit_sealed_result](https://github.com/Adityaakr/accord/blob/main/platform/contracts/agreement/src/negotiation.rs)

- 03 One enclave provider There is no second path, so a long OutLayer outage still ends a room as `No deal`. [OutLayer](https://outlayer.ai)

These need no new negotiation, so they work whatever OutLayer's queue looks like: [the replay](/app/replay), [the live attack room](/app/try), [/verify](/verify) and [make verify](/docs/verify). The full account, with how to read the queue yourself: [docs/outlayer.md](https://github.com/Adityaakr/accord/blob/main/docs/outlayer.md) and [DECISIONS.md, sections 36 and 38](https://github.com/Adityaakr/accord/blob/main/platform/DECISIONS.md).

## NEAR AI Cloud attestations

- 01 Model Called by its canonical id with `x-no-aliasing: true` through `https://cloud-api.near.ai/v1`. z-ai/glm-5.3-flash

- 02 Attestation report Fetched once per run with a fresh random nonce. Both parts are verified: the gateway's (TDX quote, `report_data`, compose hash) and the model's (TDX quote, `report_data`, RTMR3 replay, `MRCONFIGID`, GPU evidence through NVIDIA NRAS). [fresh nonce](https://testnet-api.outlayer.ai/attestations/by-request/13596)

- 03 Response signatures After every completion the job fetches its signature and checks it against the exact request and response bytes; the signer must be a verified model key.

Limit: TLS binding is not checked from inside the job. Prompts reach the model through NEAR AI's attested gateway over TLS until end-to-end encryption to the model ships. See [NEAR AI Cloud verification](https://docs.near.ai/cloud/verification).

## USDC held by the agreement

- 01 Token on testnet A 6-decimal NEP-141 test token (open mint, capped at 1,000 per call), used because the testnet USDC faucets were down on 8 Nov 2026. [tusdc.accord-v1.testnet](https://testnet.nearblocks.io/address/tusdc.accord-v1.testnet)

- 02 Settle in Circle USDC (testnet) A second factory on the same release 3 settles in Circle's testnet USDC (`3e2210e1…afcb8af`, 6 decimals). Get it at [faucet.circle.com](https://faucet.circle.com), network NEAR Testnet: about `20 USDC` per address every 1 to 2 hours. Each agreement keeps its factory's token for life; try-it defaults to test USDC. `a1.accord-usdc.testnet` ran a full deal in it: funded `14.00 USDC`, paid `5.00` to `halcyon-mm.testnet`, refused a redirect and revoked the agent; see [/record](/record). [accord-usdc.testnet](https://testnet.nearblocks.io/address/accord-usdc.testnet)

- 03 Fund The buyer sends USDC into the agreement's own account; the escrow is credited up to the terms total and NEP-141 returns any excess. [ft_transfer_call · fund](https://testnet.nearblocks.io/txns/2CeFB18jenw2iggWE8mQZy9DehwZ2f97TYXwi3RVeXPy)

- 04 Pay After the six gates pass, the agreement's own code sends `ft_transfer` to the recipient under a payment lock with a callback. The key never touches the token contract. [act → ft_transfer](https://testnet.nearblocks.io/txns/2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ)

- 05 Other ways out The vendor's `claim` of an eligible payment after the claim delay, and the refund to the buyer at `close`. claim · close

Limit: settlement is not confidential: the USDC transfer is public on NEAR, as with any stablecoin payment.

## The relayer

Accord's relayer (`relay.accord-v2.testnet`, [a relayed transaction](https://testnet.nearblocks.io/txns/DyFrt2v9sGhxnRiWVwSydXPWS48exUis56YydCMmrBhC)) pays gas for NEP-366 signed delegate actions from wallets, so a vendor or buyer with no NEAR can take its steps. Each delegate holds exactly one function call, asks for at most `300 TGas` and expires within `7200` blocks.

- 01 Factory The only method it carries on the factory. create_agreement

- 02 Agreement accounts Calls on `a<n>.<factory>` accounts; the contract checks who may call what. any method but act

- 03 Token Only with exactly `1 yoctoNEAR` and only into an Accord agreement. ft_transfer_call

- 04 Never The contract identifies the agent by the signing key; through a relayer, the signing key would be the relayer's. The agent signs `act` with its own key. act

On this page

- Factory and agreement accounts

- OutLayer enclaves

- The OutLayer dependency

- NEAR AI Cloud attestations

- USDC held by the agreement

- The relayer

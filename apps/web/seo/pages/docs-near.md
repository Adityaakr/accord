How it works on NEAR

# How it works on NEAR

The factory and agreement contracts, the three OutLayer enclave jobs, NEAR AI Cloud's attestations, USDC held by each agreement's own account, and the relayer that never carries act.

## Factory and agreement accounts

- 01 Factory Publishes releases and creates agreements. It cannot call, upgrade or drain an existing agreement. [accord-v2.testnet](https://testnet.nearblocks.io/address/accord-v2.testnet)

- 02 Release One agreement code hash per release, published as a NEP-591 global contract and referenced by hash, so it cannot change. Every agreement on the release uses it; an agreement keeps its release for life. Release 4 (`ECgsrZwy…`, the audit fixes) is current on both factories since 9 Nov 2026; a6 and the agreements before it keep release 3 (`8wMuMRre…`). [release 4](https://testnet.nearblocks.io/txns/EB2Lz3WF1Pqt4o9y9NzUF5uc9qEhimPAPLKdwJFwvqnU)

- 03 Agreement account Created in one batch (`CreateAccount`, `Transfer`, `UseGlobalContract`, `FunctionCall new`) with no `AddKey`, so it starts with no keys. It has no method that deploys code and never holds a full-access key. [a<id>.accord-v2.testnet](https://testnet.nearblocks.io/address/a6.accord-v2.testnet)

- 04 Creation deposit Paid by the buyer; covers state storage, mandate storage, the agent's gas and the on-chain OutLayer runs. 2 NEAR

Limit: during the hackathon the factory keeps its full-access key so fixes can ship; in production it is deleted after the last upgrade.

## OutLayer enclaves

Three jobs run as `wasm32-wasip2` builds in OutLayer's Intel TDX enclaves. Each reads what it needs from the agreement's state over RPC endpoints compiled into its build, never from its caller, and signs its output with an ed25519 key derived from a `PROTECTED_` seed generated inside the TEE and bound to that build's wasm hash.

- 01 Sealed Table Decrypts both mandates, runs the negotiators on NEAR AI Cloud, checks the limits and signs the outcome. Release 3 build `7c832ce9…`, keys from pubkey run `13682`. [pubkey · negotiate](https://testnet.nearblocks.io/txns/GfX5qKq35rvtUVkp9nBPgw3kkzDSXx6hfY2H5cb3wfHW)

- 02 Payee Fetches the vendor's `/.well-known/accord.json` over TLS, checks the recipient and authority, computes the recipient signals and signs the proof. [pubkey · prove](https://testnet.nearblocks.io/txns/6koRbw5QDYTgVU52Fe1vH755QGLPwZabQhF1kTk5rup6)

- 03 Observer Draws hidden slot times from its seed, reads the venue at one mainnet block and signs the observation. pubkey · observe

The contract accepts a job result only with a valid signature from the release's key, the stored nonce, matching commitments and matching parameters. Each run's TDX quote is published by OutLayer ([an attestation record](https://testnet-api.outlayer.ai/attestations/13596)); checking a quote against the release build uses the [outlayer-verify](https://app.outlayer.ai/docs/trust-verification) tool.

Limit: under Intel TDX trust assumptions and OutLayer's keystore governance. The deployer owns the seeds and could rebind one to another build.

## NEAR AI Cloud attestations

- 01 Model Called by its canonical id with `x-no-aliasing: true` through `https://cloud-api.near.ai/v1`. z-ai/glm-5.3-flash

- 02 Attestation report Fetched once per run with a fresh random nonce. Both parts are verified: the gateway's (TDX quote, `report_data`, compose hash) and the model's (TDX quote, `report_data`, RTMR3 replay, `MRCONFIGID`, GPU evidence through NVIDIA NRAS). [fresh nonce](https://testnet-api.outlayer.ai/attestations/13596)

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

- NEAR AI Cloud attestations

- USDC held by the agreement

- The relayer

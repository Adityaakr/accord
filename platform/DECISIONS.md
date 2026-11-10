# DECISIONS.md

The live record of facts, choices and spec changes. A fact here wins over the same fact in `ARCHITECTURE.md` or `INTERFACES.md`. Every entry has a source. Entries marked "research, 31 Oct" were checked against live RPC, docs and source code on 31 Oct 2026 by four research passes; the Phase 0 probe named next to each confirms it by running, and replaces it with printed output.

## 1. Network facts (research, 31 Oct; probe 0.4)

| Fact | Value | Source |
| --- | --- | --- |
| Testnet protocol | `88` (nodes `2.14.0-rc.5`); mainnet `86`, with `87` and `88` voting on 4 and 6 Nov | RPC `status`; nearcore CHANGELOG |
| Block time, testnet | about `0.565 s` (measured over 3,000 heights; not a constant) | RPC |
| Gas price | `0.0001 NEAR` per TGas; allowances reserve at `min_gas_purchase_price` = `0.001 NEAR` per TGas and refund the difference while the key exists | https://docs.near.org/protocol/transactions/gas |
| Max prepaid gas per transaction | `1 PGas` (docs pages that say 300 TGas are stale) | same |
| Yield timeout | `200` blocks (about `113 s` on testnet) | live config; nearcore |
| Yield payload | at most `1024` bytes | live config |
| Logs per receipt | at most `100` lines, `16384` bytes in total | live config |
| Storage | `1 NEAR` per `100,000` bytes; account record `100` bytes; FunctionCall key about `131` bytes; accounts at or under `770` bytes are stake-free | docs; nearcore |
| Account creation charge | `0.007 NEAR` | docs |
| Global contracts (NEP-591) | Live on both networks since protocol 77; deploy burns `0.0001 NEAR` per byte; use by hash stakes `32` bytes; by account id follows the publisher's updates (never used here) | NEP-591; live `view_global_contract_code_by_account_id` |
| Function-call key rules | Exactly one FunctionCall action; deposit `0`; receiver must equal the key's receiver; non-empty method list must contain the method (never leave it empty); self-call (receiver = the key's own account) is allowed | nearcore `verify_function_call_permission` |
| `#[private]` on a self-call | Passes for any key on the account, so `act` authenticates with `env::signer_account_pk()` | same |
| `DeleteKey` timing | Not instant; lands in a later receipt (about one block) | nearcore `is_instant_receipt` |
| Who can manage keys on an account | Only the account itself (its code, or a full-access key on it); the factory only inside the creation batch | nearcore `check_actor_permissions` |
| Meta transactions | Inner receipt: predecessor = user, signer key = relayer's; allowance not checked; `DelegateV2` removed from protocol 87 | NEP-366; docs |
| Randomness | `env::random_seed()` known to the block producer in advance, to everyone after; state is public through `view_state` | https://docs.near.org/smart-contracts/security/random |

## 2. Tooling (research, 31 Oct; probe 0.1 pins)

| Tool | Version | Note |
| --- | --- | --- |
| `near-sdk`, `near-contract-standards` | `5.30.0` | Needs Rust `1.95`; `add_access_key_allowance`, `delete_key`, `use_global_contract`, `Allowance::limited` |
| `cargo-near` | `0.22.0` stable; `0.23.0-rc.2` supports nearcore 2.14 | Probe decides |
| `near-cli-rs` | `0.30.1` stable; `0.31.0-rc.2` supports 2.14 | Probe decides |
| `near-workspaces` (Rust) | `0.24.0` | NEAR docs now test with `near-sandbox 0.4.0` plus `near-api 0.8.7`; either is acceptable |
| `near-api-js` | `7.4.0` (single package; Node `>= 22.22.2`) | Meta-transaction helpers: `createSignedMetaTransaction`, `relayMetaTransaction` |
| `@hot-labs/near-connect` | `0.12.0` | Wallet Selector (`10.1.4`) is legacy |
| `@nearai/inference-sdk` | `0.2.1` (Node 24+) | Optional; the job calls the HTTP API directly |
| `outlayer-cli`, `outlayer` crate | `0.2.1` | `cargo install outlayer-cli` |
| `outlayer-verify` | git, `0.1.0` at commit `90c27d9d` (10 Nov 2026) | `cargo install --locked --git https://github.com/out-layer/outlayer-verify --rev 90c27d9d outlayer-verify`; always pass `--api https://testnet-api.outlayer.ai` (its built-in addresses return `410`) |
| Node | `24` | Satisfies near-api-js and the NEAR AI SDK |

## 3. Identifiers

| What | Value | Source |
| --- | --- | --- |
| USDC, testnet (Circle) | `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af` (6 decimals; storage deposit `0.00125 NEAR`) | https://developers.circle.com/stablecoins/usdc-contract-addresses; live `ft_metadata` |
| USDC, mainnet (read-only, for the venue) | `17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1` | same |
| USDC faucet | https://faucet.circle.com, network "Near Testnet", about `20 USDC` per address per 1 to 2 hours | Circle faucet page |
| OutLayer contracts | `outlayer.testnet`, worker contract `worker.outlayer.testnet` | live `get_config` |
| OutLayer API, testnet | `https://testnet-api.outlayer.ai`; payment keys topped up with `usdc.fakes.testnet` | https://app.outlayer.ai/docs/https-api, /payment-keys |
| Rhea DCL, mainnet | `dclv2.ref-labs.near`; USDC/wNEAR pool `17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1|wrap.near|2000` | https://guide.rhea.finance/developers/contracts; live `get_pool` |
| Rhea DCL, testnet | `dclv2.ref-dev.testnet` (pools hold under a dollar of liquidity; not used for the demo) | live |
| Sputnik DAO factory, testnet | `sputnikv2.testnet` (not the legacy `sputnik-v2.testnet`) | live `get_default_version` |
| 1Click | `https://1click.chaindefuser.com` (`GET /v0/tokens`, `POST /v0/quote` with `dry: true`) | https://docs.near-intents.org |
| Chain Signatures (not used in the core) | `v1.signer-prod.testnet` | docs |
| Demo accounts, testnet (`make setup`, 31 Oct) | factory `accord-v1.testnet`; buyer `northwind-demo.testnet`; vendor `halcyon-demo.testnet`; authority `halcyon-auth.testnet`; recipient `halcyon-mm.testnet`; keeper `accord-keeper.testnet`; canaries `halcyon-mm-payments.testnet`, `halcyon-treasury.testnet`; attacker lookalike `halcyon-markets.testnet`; `/try` buyer `northwind-try.testnet` (the other three `/try` accounts wait on the faucet's rate limit). Every name was free, so no suffix. `10 NEAR` each from the faucet | `make setup` output |

## 4. NEAR AI Cloud (research, 31 Oct; probe 0.2)

- Base URL `https://cloud-api.near.ai/v1`, `Authorization: Bearer sk-…`. Source: https://docs.near.ai/api-reference/introduction.
- NEAR-fleet TEE chat models (live `/v1/model/list`, `verifiable: true`): `z-ai/glm-5.3-flash` (tools, structured outputs; `0.08 / 0.50` USD per 1M tokens), `Qwen/Qwen3.6-35B-A3B-FP8`, `Qwen/Qwen3.8-27B`. Default: `z-ai/glm-5.3-flash`. Use the canonical id with `x-no-aliasing: true`; an alias makes the gateway sign instead of the model.
- Attestation: `GET /v1/attestation/report?model=&provider=near&signing_algo=ecdsa&nonce=<64 hex>`; verify the Intel DCAP quote (`dcap-qvl`), `report_data` (signing identity in bytes 0 to 32, nonce in 32 to 64), RTMR3 replay over `imr == 3` events, `MRCONFIGID = 0x01 || sha256(app_compose) || 15 zero bytes`, the GPU evidence through `https://nras.attestation.nvidia.com/v3/attest/gpu` (`x-nvidia-overall-att-result: true`). Source: https://docs.near.ai/cloud/verification.
- Per-response signature: `GET /v1/signature/{chat_id}?signing_algo=ecdsa`; for a model signature, `text = "{model}:{sha256(request body)}:{sha256(response body)}"`; EIP-191; the signer must match a report verified before the completion. Non-streamed, `Accept-Encoding: identity`. Source: https://docs.near.ai/cloud/verification/cloud-api/response-signatures.
- Defaults in the gateway source: `1000` requests per minute per key, `64` concurrent per model per organisation; `402` means no credits.
- Credits: buy in the dashboard, or the `$10` NEAR Builders offer in HACKATHON.md Q-000 (the join page itself does not describe the claim).

## 5. OutLayer (research, 31 Oct; probe 0.3)

- `request_execution` (payable): `source` (`{"Project":{"project_id","version_key"}}` or `{"WasmUrl":{"url","hash","build_target"}}`), `resource_limits` (always pass it; without it the request is compile-only and panics if it has input), `input_data` (free up to `32 KB`), `secrets_ref`, `response_format: "Json"`, `payer_account_id`. Attach at least `estimate_execution_cost` (about `0.007 NEAR` at default limits); the unused deposit is refunded. Source: https://app.outlayer.ai/docs/near-integration; contract source.
- Limits: `max_execution_seconds` up to `180`, default `60`; each HTTPS call `30 s`, two timeouts abort the run; private and metadata IPs blocked. The Sealed Table must also finish inside the yield (about `113 s`).
- Outbound HTTPS only from `wasm32-wasip2` (`wasi-http-client 0.2`); example: https://github.com/out-layer/ai-example.
- Secrets: encrypted client-side, decrypted in the TDX keystore, injected as env vars; bound to a project or a wasm hash; `PROTECTED_*` secrets are generated inside the TEE (`outlayer secrets set --generate PROTECTED_X:hex32`). Source: https://app.outlayer.ai/docs/secrets.
- Encrypted per-request input: no built-in feature; the documented pattern (private-dao-example) is a seed in the TEE, a derived secp256k1 key, `eciesjs` in the browser.
- Signing keys (wasip2): at most 3 per manifest, `bind: "wasm"` ties a key to one build; the docs say keys are derived per project or exact build and per caller, so they differ between callers and cannot serve as one release key. Accord derives each job's signing key from its own `PROTECTED_` seed instead. Source: https://app.outlayer.ai/docs/signing-keys.
- Secret bindings: the secret's owner can move a `WasmHash` binding to a new build without changing the value (https://app.outlayer.ai/docs/secrets). Hence claim 1's limit that the deployer could rebind a seed, and claim 6's for the observer's seed.
- Access conditions (read again on 31 Oct, https://app.outlayer.ai/docs/secrets): AllowAll, Whitelist, NEAR balance, FT or NFT balance, Account Pattern (a regex over the account id), Until a date (`ValidUntil`), One build only (`WasmHash`), and Logic (And, Or, Not). "A condition is judged against the account that signed the transaction" unless it is set to direct calls only (the Access panel, or `--direct` on the CLI), which wraps it in `Predecessor` and judges the calling account; `--via` lists contracts composed through. For a project's own secrets, "a caller outside it is refused before the code runs", so every secret a project reads needs a condition the intended callers meet: S1 goes on `NEARAI_API_KEY` as well as on the seed. The docs show no complete `set` command with a condition; probe 0.3 records the working one. `PROTECTED_` values survive changes to the condition.
- Attestation records: `GET {api}/attestations/{task_id}` and `/attestations/by-call/{call_id}`; `REPORTDATA[0..32]` is a task hash over the run's fields including wasm, input and output hashes.
- Caveat that shapes the design: `worker.outlayer.testnet` holds full-access keys, so a callback alone does not prove a TEE produced the output. Hence the per-build signature check in the contract (ARCHITECTURE 8.4).

## 6. Wallets, RPC, faucets (research, 31 Oct; probes 0.8 and 0.10)

- NEAR Connect on testnet lists only wallets flagged for testnet: Meteor, Intear, Ledger, Nightly, WalletConnect, NEAR CLI and a few others. HOT and MyNearWallet are hidden on testnet; HOT throws "not supported on testnet".
- Testnet RPC (public): `https://test.rpc.fastnear.com` (primary), `https://rpc.testnet.near.org`, `https://near-testnet.drpc.org`, `https://testnet-rpc.intea.rs`; archival `https://archival-rpc.testnet.near.org` (heavily rate-limited). Mainnet reads for the venue: `https://rpc.mainnet.near.org` or `https://free.rpc.fastnear.com`, archival per probe 0.7. No JSON-RPC batching.
- Faucets: `near account create-account sponsor-by-faucet-service <id>.testnet autogenerate-new-keypair save-to-keychain network-config testnet create`; https://near-faucet.io; the docs faucet.

## 7. Ecosystem findings (research, 31 Oct)

- Agent Market: mainnet only; payments held in its own custodial ledger; buyer actions (create, award, accept) only through the web app and its MCP server; no hook to settle through an outside contract. Per the agents prompt, this is reported, not built around (WIN_PLAN lever 7). Sources: https://docs.market.near.ai, https://market.near.ai/openapi.json, https://market.near.ai/.well-known/x402.
- Trezu: Sputnik DAOs on mainnet (`<handle>.sputnik-dao.near`); production is mainnet-only. Sources: https://docs.trezu.org, https://github.com/NEAR-DevHub/trezu.
- Sputnik testnet: create costs about `6 NEAR`; the proposal bond must be attached exactly; `act_proposal` should always send the stored `proposal` kind; `Transfer` with a message gets only `10 TGas` on testnet, so fund through a `FunctionCall` proposal on the token. Source: sputnik-dao-contract at the deployed commits.
- NEAR Intents: no testnet and none planned (Q-007); dry quotes need no JWT.
- The organisers' prompts (https://github.com/nearai/near-hackathon-prompt-examples, commit `7873343`): keep each selected track's requirements and checkpoint; `GOAL.md` "Track requirements" maps them.

## 8. Design decisions (31 Oct)

| Decision | Why | Rejected alternative |
| --- | --- | --- |
| Settle in USDC on NEAR from the agreement's own account | One transaction tree from check to payment; no reporter; matches the live site | USDC on Base through Chain Signatures (v4 to v6): a signed transfer waits outside the contract and needs a reporter |
| One sub-account per agreement, code pinned by hash, no full-access key | The agent's key reaches one agreement only; the code holding funds cannot change | One contract holding all agreements: one key would reach every agreement's `act` |
| Ordinary function-call key with an allowance | Revocation is a plain `DeleteKey` | NEP-611 gas keys: deleting one burns its balance and fails above `1 NEAR`, which could make the kill switch fail |
| Revoke = flag in state plus `DeleteKey` | `DeleteKey` lands a block later; the flag closes that gap | `DeleteKey` alone |
| Every job output signed by a key derived from that job's own `PROTECTED_` seed, checked with `ed25519_verify` | The worker contract's full-access keys mean a callback is not proof by itself; OutLayer's signing keys differ per caller | OutLayer signing keys; trusting the callback |
| Jobs read everything from the agreement's state over endpoints compiled into the build | Anyone can call a job; caller data could steer it | Passing ciphertexts, commitments, venues or RPC URLs as input |
| Mandate key from a `PROTECTED_` seed bound to the build, readable only by runs an agreement requests and the keyless account's `pubkey` runs (S1) | Neither the app nor anyone calling the job directly can decrypt a mandate; the deployer could rebind the seed, stated as a limit | A secret the deployer sets in plain form |
| Envelope binds agreement, role and party inside the ciphertext | Stops replaying a counterparty's sealed mandate into another room | Commitment checks alone |
| Four-message protocol (quote, counter, final, accept or walk away) | The agents prompt's "counter once, then accept or walk away"; fits inside the yield | Open-ended chat (slow, harder to bound) |
| Market-making venue: Rhea DCL USDC/wNEAR on mainnet, read-only, measured with `quote` at one block | A real market every judge knows; every observation is recomputable from an archival node | Testnet pools (no real liquidity); an exchange API (not reproducible) |
| Hidden slot times drawn inside the observer from its own seed; each sample is the first mainnet block at or after the slot time | Nobody knows a time in advance; every caller gets the identical signed observation, so nobody can forge, time or cherry-pick one; the keeper keeps no secret | Keeper commit and reveal (the keeper could leak times and choose among samples); times from `random_seed` (public at once) |
| Vendor `claim` after a delay | Revocation must not become a way to withhold earned payments | Payments only through the agent |
| Demo amounts small (Circle testnet USDC from the faucet) | Honest testnet funds; the mechanism is the point | Large amounts in a made-up token on the live demo |
| Terms in offsets from `executing_at`, mandates split into `shared` and private parts | Models handle offsets reliably; due times count from approval; the counterparty sees only what each side chose to share | Calendar timestamps produced by the model |
| `close` pays eligible items before refunding the real token balance; `resolve_stale_lock` | Earned money is never refunded to the buyer; nothing can be stuck behind a failed callback | Refunding "funded minus paid" |
| Deliveries end with the term and a new delivery needs a dispute; `close` sets aside (`Reserved`) what it cannot pay and refunds the rest | Neither party can hold the other's money: the vendor cannot keep a window open or block the refund with an unpayable recipient, and the buyer cannot reclaim an earned amount | `close` waiting until every eligible item is paid (a vendor with no recipient stalls the refund forever) |
| The payment lock carries a `payment_id`; an ambiguous stale lock resolves to `AssumedPaid`, settled by an exception | A late callback cannot clear a newer lock, and no item can be paid twice when the balance cannot tell | Inferring paid or unpaid from the balance alone (a plain deposit makes it ambiguous) |
| `pubkey` runs requested by a keyless `releases.<factory>` account whose code fixes the input | S1 admits no account that holds a key or could request a `negotiate` run | Admitting the factory, which holds a full-access key |
| Observer samples only from final mainnet blocks; a conflicting second observation is logged and sends the period to `Review` | Optimistic blocks can differ between callers; an anomaly should be visible and decided by people, not silently dropped | Ignoring a second observation |
| The `/try` room has its own principals, `0.01 USDC` items one due at a time, a pair on Adi's vendor domain, and a cap of two rooms a day | The re-arm can open a new room with no person, the faucet budget lasts, and a busy day cannot drain the try buyer | Re-using the main demo principals; `tUSDC` through a second factory (one factory has one token, and the room's USDC cost is tiny) |
| Work on `main`; the kit moves to `docs/build/` with an evaluator `CLAUDE.md` and `AGENTS.md` at release | Screeners read the default branch, and a root `CLAUDE.md` is loaded as instructions by an evaluating Claude Code session | A `hackathon` branch with the build rules at the root |
| A labelled re-arm process for the public `/try` room | One visitor naming the canary would otherwise end the demo for everyone | Leaving the room dead until Adi reinstalls a key |

## 6b. Venue probe (0.7, 31 Oct, `make probe-venue`)

- `get_pool` returns `token_x` (USDC), `token_y` (`wrap.near`), `fee` `2000`, `point_delta` `40`, `current_point`. `quote{pool_ids, input_token, output_token, input_amount, tag}` returns `{amount, tag}`; an empty or failed route returns `0`.
- Mid is computed as `1.0001^current_point × 10^(6 − 24)` in 18-decimal fixed point by squaring with truncation (no floats), so the job, the probe and an archival recomputation agree exactly.
- Depth search: grow ×4 from `10 USDC` until the band fails, then six bisection steps (about 2% resolution); at most about 24 calls per observation in all, more than the 12 the kit estimated, because a fixed bracket of 12 steps over `10 USDC` to `10M USDC` resolves only to about 2,400 USDC, coarser than the pool's depth. Takes about 7.5 s against `free.rpc.fastnear.com`.
- Results (bid = USDC the pool pays for wNEAR, ask = USDC it takes for wNEAR, within ±2% of the mid): now spread `41` bps, bid `392` / ask `2,020` USDC; −1 h `49`, `370` / `1,720`; −3 h `52`, `186` / `385`; −6 h `52`, `194` / `430`; −12 h `52`, `186` / `378`. Two-sided every time. The archival endpoint `archival-rpc.mainnet.fastnear.com` reproduced the current block's observation exactly; the public RPC answered for 12 h back, not 24 h.
- Fixtures set from these: passing agreement `min_depth_quote` `150 USDC` (buyer) against `max_depth_quote` `200 USDC` (vendor), spread ≤ `60` bps; the stricter pair keeps the same depth and its `30` bps spread, which this pool cannot meet. The site's illustrative example (12,000 USDC depth) is not this pool's real depth; the app and README use the real numbers.

## 6c. Keys probe (0.4, 31 Oct, testnet; `contracts/probe-keys` on `probe-keys.accord-v1.testnet`)

- `Promise::add_access_key_allowance(pk, Allowance::limited(0.25 NEAR), self, "act")` from the contract added the key; `list-keys` shows `only do ["act"] function calls on probe-keys.accord-v1.testnet with an allowance of 0.25 NEAR` (install tx `54n5EPhYQfayE1mwsrYFiNuANPQ6YNe45acfQGHZvfg2`).
- The key signed `act` (tx `A58cG3Kw2vy1KPRJG5Wpp8V5UJzKruXPJ9DS9Ph1GwXV`): `0.309 TGas` burned at `80 TGas` prepaid; the allowance fell from `0.25` to `0.2498441571673667 NEAR`, so one call at `80 TGas` with this light body costs about `0.000156 NEAR` of allowance after the refund. The real `act` is heavier; 5.4 measures it.
- `revoke` (flag, then `Promise::delete_key`, tx `nZPyXHHxfJSvjMo7aeRq4BfDD59AL7dY97bVNe58pu2`) removed it: the key list no longer has it, and the next signature fails before sending with `Access key for public key ed25519:9UTeA6… does not exist while viewing`, the RPC form of `AccessKeyDoesNotExist`.
- Still for the sandbox (1.13): `ERR_REVOKED` for a call landing between the flag and the `DeleteKey` receipt, and `NotEnoughAllowance` when the allowance runs out.

## 9. Open questions the probes answer

- Does `dcap-qvl` build for `wasm32-wasip2`? Does `ecies` (pure backend)? Is NEAR AI's end-to-end encryption usable with the chosen model? (0.2)
- Is a seed-derived key the same for two callers; which direct-calls-only condition meets S1 on both the seed and `NEARAI_API_KEY`; is a secret's binding visible on chain; does the callback carry a `5 KB` output; what caller identity does a job see; latency against the yield. (0.3)
- Exact allowance reserve at `80 TGas` and gas for `act` on both paths. (0.4, then 5.4)
- Release mode for development and for the hosted demo. (0.5)
- `quote` response shape and timing on `dclv2.ref-labs.near`; today's spread and depth to set demo thresholds. (0.7)
- An indexer for account age without a key; how the app reads events. (0.8)

## 10. Spec changes

Each entry: date, what changed, why, which files were updated.

- 31 Oct, independent review of the kit before the build (3 blockers, 12 majors, 5 minors), all applied: jobs read state instead of input and use pinned endpoints; seed-derived job keys replace OutLayer signing keys; requirement S1 gates the Sealed Table and Payee seeds; the observer draws slot times from its own seed and samples the first mainnet block after each, replacing the keeper's commit and reveal; `on_sealed_result` is a private `.then` checked by signature, with minimum gas on `start_negotiation` and retryable stale reads; root state under `1 KB` with capped collections and gas-ceiling tests; `resolve_stale_lock`; `close` pays eligible items first and refunds the real balance; only the current key's refusals count; `resolve_period`, vendor exceptions and evidence waivers; NEAR AI gateway attestation verified and request hashes salted; terms in offsets with parameters carried from creation; domain pinned at the first recipient version; demo domain for `make demo`; `/try` re-arm and the "Paid outside the terms" counter; work on `main` with the kit moved to `docs/build/` at release; claims 1 and 6 rewritten with their limits. Files: ARCHITECTURE, INTERFACES, GOAL, PROGRESS, CLAUDE, DECISIONS, DEMO, SUBMISSION, WIN_PLAN, KIT, LOOP_PROMPT, SETUP_FROM_YOU, starter fixtures, website copy.
- 31 Oct, re-check of the revised kit by the same reviewer (14 of 20 findings fixed, 6 partly; 9 new: 3 major, 6 minor), all applied: deliveries end with the term and a new one needs a dispute, and `close` sets aside what it cannot pay (`Reserved`, claimable after `Settled`; a recipient can be proposed while one is reserved; `withdraw_near` keeps `0.05 NEAR` meanwhile), so neither party can stall the other's money; the payment lock carries a `payment_id`, and a stale lock the balance cannot decide becomes `AssumedPaid`, settled by an exception; `NEARAI_API_KEY` gets the S1 condition (OutLayer refuses a run when any secret's condition fails and judges the signer unless set to direct calls); `pubkey` runs move to a keyless `releases.<factory>` account, and claim 1's limit adds that the deployer could request extra runs while the factory keeps its key; claim 6 and the market-making FAQ state that the deployer owns the observer's seed; the observer samples final blocks only and conflicting observations are logged (`observation_conflict`) and send the period to `Review`; uptime is defined once (two-sided slots over observed slots, reported, not the pay rule) and the site copy says "two-sided quoting"; the `/try` room gets its own principals, a pair on the vendor domain, `0.01 USDC` items one due at a time and a daily room cap; 7.3 points the loop, the last-day prompt and `build.mjs` at `docs/build/`, keeps `CHANGELOG.md` at the root, and the evaluator note says never to submit; `sealedCheck` moves to 2.1; DEMO and LOOP_PROMPT lines corrected; the realworld rows add the invoice view and state that 1Click is met only as a dry quote; `due_in_secs` renamed `due_offset_secs` everywhere. Files: ARCHITECTURE, INTERFACES, GOAL, PROGRESS, DECISIONS, SUBMISSION, DEMO, LOOP_PROMPT, SETUP_FROM_YOU, WIN_PLAN, KIT, CLAUDE, `starter/` (fixtures, prompts, schema, `.env.example`, evaluator notes) and `website/` (FINAL_COPY, LANDING_PAGE_SPEC).

- 3 Nov, contracts built (PROGRESS 1.6 to 1.14). Choices the specification left open, made in code and listed here:
  - Job outputs from OutLayer are parsed whether the callback carries the signed object, a JSON string of it, or an `output` field holding either; only an object carrying `sig` that verifies is used. Probe 0.3 records the real shape (`contracts/agreement/src/signed.rs`).
  - `request_execution` passes the job's wasm hash as `version_key`; probe 0.3 confirms OutLayer's meaning of `version_key`.
  - The observer signs `JCS(observation ∪ {"mode": "observe", "status": "observed"})`; `record_observation` rebuilds that object from the stored observation (`contracts/agreement/src/evidence.rs`).
  - `accept_recipient` activates at once when the agreement has no current recipient (not only for version 1), so a failed first proof does not force a 24-hour wait on the second; every later change waits `timelock_secs`.
  - `factory.new(config, releases_code)` takes the releases wasm as an argument and deploys it to `releases.<factory>` in one batch with no `AddKey`.
  - `pubkey` outputs are signed by the key they announce, and the factory checks that signature before storing it.
  - A `close()` refund the token rejects is kept as `refund_owed` and retried by the next `close()` after `Settled`.
  - Wasm sizes: agreement `522 KB`, factory `331 KB`, releases `120 KB`, tUSDC `147 KB`. Embedded, an agreement stakes about `5.3 NEAR` for its code, so `create_deposit` is `8 NEAR` in the sandbox. Most of the agreement's size is the JSON argument decoding near-sdk generates per method; 5.4 measures what trimming buys before the hosted release, which uses the global mode.
  - Sandbox gas (`make sandbox`, 3 Nov): a paying `act` burned `10 TGas` in all receipts; refused `act` calls stay under the `15 TGas` ceiling (`tests/tests/flow.rs`).
  - The `ERR_REVOKED` window between `revoke_agent` and its `DeleteKey` receipt, a callback forced out of gas, and the stale lock with a plain deposit are covered by unit tests on the mocked chain (`contracts/agreement/src/tests.rs`); the sandbox cannot place a transaction between two receipts deterministically.

## 11. Submission values

Filled by Adi only, never guessed. The email and payout account live in `.submission/values.json` (gitignored), not here.

| Field | Value |
| --- | --- |
| projectName | |
| leadName | |
| size | |
| tracks | |
| projectUrl | |
| demoUrl | |
| Other project (Q-015) | |

## 12. Jobs: observer and payee (3 Nov)

- `jobs/observer` (`accord-observer`) and `jobs/payee` (`accord-payee`) share `crates/accord-jobkit`: seed-derived keys, signing, pinned NEAR RPC and the HTTP transport (`wasi-http-client 0.2.1` in the enclave, `ureq 2` natively behind `native`, fixtures in tests). Both build for `wasm32-wasip2`; `{"mode":"pubkey"}` gives the same key under `wasmtime run -S http` as natively.
- Signing key: HKDF-SHA256 with the 32 seed bytes as input key material, **no salt**, info `accord/<job>/sign/v1`, 32 bytes used as the ed25519 secret key. The seed secret is read as 64 hex characters (a `0x` prefix is tolerated). The hidden slot times use the raw seed bytes as the HMAC key, as `atlas::slot_time` specifies.
- Observer: a slot time older than 6 h reads mainnet from `archival-rpc.mainnet.fastnear.com` first (6b: the public RPC kept about 12 h). `accord_venue::measure` reads a failed `quote` as zero, so the job's RPC client marks any call that failed on every endpoint, and the job then answers with an unsigned error instead of signing a measurement that a failed read could have changed. A JSON-RPC error on a `query` moves on to the next endpoint; a `block` error does not, because a skipped height answers `UNKNOWN_BLOCK` everywhere.
- Observer: `get_terms` and `get_agreement` are retried only on RPC errors (terms do not appear moments before an observation); the payee also retries until the requested recipient version is visible, for up to 15 s.
- Errors the job cannot resolve (RPC down, unknown agreement, bad input) are answered `{"mode", "status": "error", "error"}` without `sig`, so no contract accepts them. A Payee proof whose domain file fails is still signed, so the contract records `ProofFailed` with the reason.
- Payee: the file must be served `200` as `application/json`, at most 64 KB (8 KB for the simple form), `accord` `"1"`, `network` `testnet` (a mainnet file does not authorise testnet accounts), exactly one of `recipients` and `entries`. In the list form the agreement's authority must sit in the same entry as the account. Redirects are not followed. `checks` failures are short strings (`HTTP status 404`, `not served as application/json`, `account not listed`, `authority differs`, `no valid file`).
- Payee signals: `code_changed_30d` compares the code hash now with the one at the block 30 days back on `archival-rpc.testnet.near.org` (seconds per block calibrated from a probe block); an account created inside the 30 days counts as changed if it has code now; `null` when the archival read fails or the account does not exist. `age_days` and `tx_30d` are always `null` until PROGRESS 0.8 finds a keyless indexer. `prior_payments` is `recipient_stats(account, buyer).buyer.payments`. A first payment is not a reason. `demo_domain` comes from the compiled-in `DEMO_DOMAINS` list, empty for now.
- `fixtures/jobs/observer-mainnet.json` was recorded live on 3 Nov (view calls only) at mainnet block `222773113`: spread `146` bps, depth bid `75.98` / ask `295.00` USDC within 200 bps, two-sided. The replay test reproduces the live signed output byte for byte.
- Risks for probe 0.3: OutLayer's `/docs/wasi` page says output "must be ≤900 bytes (NEAR limit)". The observer's output is about 610 bytes; a Payee proof is about 740 bytes, or about 900 with a code-change reason and long names. The contracts accept up to 16 KB. Rust 1.97 links WASI `0.2.9` interfaces, while OutLayer documents wasmtime 28+. OutLayer's reproducible builder uses its own toolchain image for the deployed hash.

## 14. App and services (3 Nov)

- The app uses the marketing site's typefaces (Host Grotesk for text, JetBrains Mono for numbers, states and codes) and its exact colour tokens instead of the kit's Satoshi, so the product and the site read as one (Adi's direction: "design and colour scheme as related to our product"). Red stays only for refusals, canary trips and revocations.
- Next.js `16.3.8`, React `19.2.9`, NEAR Connect `0.11.4`, near-api-js `7.3.1`, pg `8.23.1`: each published more than two weeks before 3 Nov. Node `22` is installed locally; the kit's `24` is not required by any dependency.
- `make serve` keeps a local sandbox running with one agreement in each state, for building and screenshotting the app without testnet. The app labels every screen "local sandbox"; its `/api/dev/*` signing routes answer 404 on any other network, so a deployed app has no signing path.
- The inbox store moved into `@accord/store` (Postgres with `DATABASE_URL`, a JSON file otherwise), shared by the app, the agent and the keeper.
- OutLayer's WASI docs cap an on-chain job output at about `900 bytes`. The observer (about `610`) and Payee (about `740`) outputs fit; the Sealed Table's (target under `4 KB`) does not, so fallback F1 (`submit_sealed_result` by the keeper, same checks) is expected; probe 0.3 confirms, and claim 1's limit then says the keeper could request extra runs.

## 13. Sealed Table and NEAR AI probe (3 Nov)

Probe 0.2 (`make probe-ai`, `scripts/probe-ai/probe-ai.ts`), printed on 3 Nov:

```
models: 64 listed, NEAR-fleet TEE with structured outputs: Qwen/Qwen3.6-35B-A3B-FP8, Qwen/Qwen3.8-27B, Qwen/Qwen3.8-27B-abliterated, Qwen/Qwen3-VL-30B-A3B-Instruct, z-ai/glm-5.3-flash
model: z-ai/glm-5.3-flash
attestation report: 295 KB, 1 model candidates, fetched in 1543 ms
verification of 2 quotes and GPU evidence: 1578 ms
  gateway 0xb98a789cdc4817275f5155593ba73ef2a957e779: tdx ok (UpToDate), gpu absent; compose f571e5dafe8f96ba
  model candidate 0 0x3b753b4406613c5e70ae640508632b600424fa0c: tdx ok (UpToDate), gpu ok (NRAS 200 in 539 ms, 8 GPUs, arch HOPPER); compose 5f7ebd85cf1f480a
completion: HTTP 402 no_limit_configured in 233 ms
e2ee: not checked: completions are refused (HTTP 402 no_limit_configured); a verified candidate does publish a secp256k1 signing_public_key that hashes to its attested address
completion FAILED (HTTP 402 no_limit_configured) · signature not checked (no completion) · signer not checked (no completion) · gateway tdx ok · model tdx ok · gpu ok · nonce bound ok
```

0.2 is not done: NEAR AI refuses every completion with `402 no_limit_configured` ("No spending limit configured. Please contact support to set up credits."), so the completion, the response signature and the E2EE try have not run. Adi: add credits (or a spending limit) to the account that owns `NEARAI_API_KEY` at https://cloud.near.ai, then run `make probe-ai` and `cargo test -p accord-sealed-table --release --test live -- --ignored --nocapture live_negotiation`.

- Model: `z-ai/glm-5.3-flash` (`providerType: vllm`, `verifiable: true`, `structured_outputs`, `0.08 / 0.50` USD per 1M tokens), canonical id with `x-no-aliasing: true`. It lists `reasoning`; whether reasoning tokens fit inside `max_tokens 700` before the JSON is unmeasured until completions work.
- What the report looks like: one model candidate; the gateway's `event_log` is JSON text and the model's a JSON array; `info.tcb_info` is JSON text; gateway and model sit on different FMSPCs (`70A06D070000`, `90C06F000000`); the model candidate carries `nvidia_payload` for 8 Hopper GPUs (about 98 KB) and `signing_public_key` (64-byte secp256k1, keccak-hashes to `signing_address`, checked).
- Answer 1, `dcap-qvl` for `wasm32-wasip2`: the Rust crate `0.7.0` builds with `default-features = false, features = ["std", "rustcrypto", "default-x509"]`; its defaults do not (`aws-lc-sys` via `reqwest`). Its collateral fetcher sits behind `report` (reqwest), so the job fetches the four PCCS documents itself (Phala PCCS, each URL once) and verifies with `dcap_qvl::verify::verify` against Intel's root CA, so the PCCS is not trusted. Run inside wasmtime 50 as `wasm32-wasip2` (`jobs/sealed-table/examples/attest_wasm.rs`): report, two quotes, RTMR3, MRCONFIGID, `report_data` and NRAS all pass in 3.3 s. Fallback F5 is not needed.
- Answer 2, `ecies` (pure backend) for `wasm32-wasip2`: `0.2.14` with `default-features = false, features = ["pure", "std"]` builds and runs (randomness included) in wasmtime; it decrypts ciphertexts made by the SDK's `seal` (eciesjs `0.4.18`, `fixtures/jobs/sealed-table/sealed.json`), and eciesjs opens the job's document ciphertexts (checked with `decryptDocument`).
- Answer 3, E2EE with the chosen model: not answered live (402). Known: the ECDSA report already gives the model's secp256k1 key bound to the attested address, which the documented ECDSA scheme uses (`X-Signing-Algo: ecdsa`, `X-Client-Pub-Key`, `X-Model-Pub-Key`; ECDH, HKDF-SHA256 `ecdsa_encryption`, AES-256-GCM); the current scheme is Ed25519 v2 (`X-Encryption-Version: 2`). E2EE covers message content (`response_format` stays plain; the schema is not secret). The probe sends one encrypted structured-output completion and checks its signature as soon as completions work. 2.3b stays open; claim 1 keeps its gateway limit.
- Sealed Table (`jobs/sealed-table`, `accord-sealed-table`), choices the spec left open:
  - Transport: `wasi-http-client 0.2.1` writes a request body in one `blocking-write-and-flush`, which wasmtime caps at `4096` bytes, so a completion request or the GPU payload traps. The job uses `wasi 0.13.3` directly: it starts the request, then writes the body in 4 KB chunks. `accord-jobkit` still uses `wasi-http-client`; its JSON-RPC bodies are small, but any body over 4 KB would trap.
  - The token's `decimals` come from its `ft_metadata` (the agreement view does not carry them).
  - Attestation policy: TCB `UpToDate` or `SWHardeningNeeded`, debug bit off; the gateway must verify; a model candidate counts only with TDX and an NRAS `true`. The output lists only verified candidates (`rejected_candidates` counts the rest).
  - A proposal is delivered only if it parses, passes `terms::structural` (which holds the acceptance window to the params) and `limits::within` for its sender. A walk-away, including a side that failed twice, is recorded as a `WALK_AWAY` message and counted in `rounds`.
  - Leak filter: every number in the reasons is read as a value and compared with each private number under each named reading (base units, whole units with up to six decimals, thousands separators, `k`, bps, percent; other private integers as plain integers), so no list of renderings can miss one.
  - Market-making: one item per period (`id = p + 1`, the retainer, due at `period_secs * (p + 1)`), the venue from the buyer's `shared`, and the message's `total` must equal retainer times periods.
  - Document: `scope` from the buyer's `shared`, each item's `deliverable` from the buyer's `proposed_items` with the same name (null otherwise), market-making items named `Period n`.
  - Infrastructure outcomes are signed and carry a short `error` (no mandate content); malformed input gets an unsigned error.
  - Not done: reading the caller from OutLayer's context and refusing other callers (waits for probe 0.3 to say what OutLayer exposes).
- Output size: about 6.5 KB for a three-message deal (documents 3.4 KB, response records about 420 bytes each), so over the 4 KB target as well as OutLayer's 900-byte note in section 14. Encrypting the document once under a random key and wrapping that key for each party would save about 1.5 KB, but changes the SDK's `decryptDocument`; F1 carries the full output either way. Open for the main loop.
- Crate pins: `dcap-qvl 0.7.0`, `ecies 0.2.14`, `k256 0.13.4`, `sha3 0.10.8`, `ed25519-dalek 2.2.0`, `hkdf 0.12.4`, `bs58 0.5.1`, `base64 0.22.1`, `wasi 0.13.3`; `ureq 2.12.1` only in native tests. The probe pins `@phala/dcap-qvl 0.7.0`, `@noble/curves 1.9.7`, `@noble/hashes 1.8.0`, `@noble/ciphers 1.3.0`, `eciesjs 0.4.18`, `canonicalize 2.1.0`, `tsx 4.23.15`. Release wasm: 1,487,312 bytes.

## 15. Adversarial review of the contracts (3 Nov)

Two independent reviews (funds and authority; liveness and state) ran against `contracts/` and `crates/accord-core`, each reproducing findings with unit tests. Their tests stay in the suite as regression tests (`contracts/agreement/src/review_funds_tests.rs`, `review_state_tests.rs`, `contracts/factory/src/review_tests.rs`). Nothing they tried sent USDC to anyone but the current recipient or the buyer's refund, and no forged job output was accepted. Fixed:

- A late payment callback after `resolve_stale_lock` and an approved exception could undo a newer payment or be ignored, paying an item twice. Items now record the payment that settled them (`settled_by`); a late answer changes an item only when it is that payment's, and a late success after a reopen is recorded as the payment it was.
- `close` reserved items for "no recipient" beyond what the escrow held; reserved money counted as spendable for the next item; an exception could change a reserved item's amount. Now: reserve only what the escrow covers (else `Unfunded`), the gates never spend reserved money except the claim on that same item, and exceptions on `Reserved` items are refused (`ERR_RESERVED`).
- Funding during `close`'s balance read was stranded: `ft_on_transfer` now refuses while `closing` (the token returns it).
- A failed refund retried a fixed amount forever: the retry reads the balance and sends `min(owed, balance − reserved)`.
- `closing` could stay set if its callback failed: `close` needs `150 TGas`, the balance callbacks get `60 TGas` static, and `resolve_stale_lock` clears a `closing` older than `600` blocks.
- `act` panicked on a second `RequestException` for an item: it now returns the pending exception's id; when the 16-exception list is full it is a recorded refusal (`ERR_CAP_EXCEEDED`).
- A late Sealed Table answer could revive a `Cancelled` agreement: `cancel` ends the negotiation and results only apply while `Sealed`.
- The creation deposit was stuck after `Cancelled` or `NoDeal`: `withdraw_near` works in those states too.
- More than 32 market-making slots overflowed the slot bitmask: `terms::structural` caps slots at 32. Params longer than ten years are refused (deadline overflow).
- The factory refuses bad params before writing a creation record, and caps reports at 64 per agreement.
- `close` while a payment is in flight no longer writes to the refusal log (anyone can call `close`; the log is the agent's record).

Kept as a stated limit: an `AssumedPaid` item counts as paid; if its transfer had in fact failed, the refund at `Settled` returns that amount to the buyer. The vendor's remedy is the exception it requests before close, as the kit designs.

Also: the observer's replay fixtures keyed view calls by the raw `args_base64`, whose JSON key order changes when other crates in the build enable `serde_json/preserve_order`; replay keys now re-encode the arguments as JCS.

## 16. The local node stands in for testnet (3 Nov)

Testnet is blocked on OutLayer, NEAR and USDC (docs/build/BLOCKED.md), so the product runs end to end on a local NEAR node first, with as little replaced as possible:

- **What is real.** The four contracts (the `-mock` agreement build, whose only additions are `submit_mock_*` and skipping the OutLayer requests; `make check-deploy` proves the release build has neither); the three jobs' code, run natively from the same crates the enclave builds, with seeds that derive keys exactly as deployed; mandates sealed with eciesjs to the Sealed Table's derived key and opened by the Rust job; every signature checked by the contract; the observer reading real NEAR mainnet blocks.
- **What is replaced, and labelled.** The model: `jobs/sealed-table/src/local.rs`, a deterministic negotiator inside both mandates' limits; its outputs carry `model.local`, `make negotiate` and Verify say "no model ran". OutLayer's delivery: a watcher submits job outputs through `submit_mock_*` as the keeper. The domains: the vendor's `accord.json` is served from memory, and `demo.accord.local` forwards to the app's demo-domain route. Faucets: test USDC mint and NEAR top-ups from the node's root.
- **Why.** The remaining risk is integration, not logic: every live target, the keeper, the re-arm and the app have now run against the same contract code and job code testnet will run. Moving to testnet changes the endpoints and the model, not the code paths.
- **Market-making fixtures.** The passing agreement's conditions were measured from the pool on 3 Nov (`make probe-venue`: `146 bps`, `32.78 USDC` bid depth within `200 bps`): at most `200 bps` and at least `20 USDC`. The strict pair keeps `30 bps`, which a `0.2%` fee pool cannot meet.
- **Exceptions.** A request above the agreement's total, or on an item whose one exception is used, is refused at request time (`ERR_BAD_EXCEPTION`, `ERR_EXCEPTION_USED`), found by the `act` fuzz test: before, it sat pending, blocking that item's single pending slot, and could never be approved.

## 17. Adversarial review, round 2 (3 Nov)

Four reviewers on everything new in this round (the local OutLayer, the `/try` re-arm, the contract changes, the live targets and the market-making console), each finding reproduced before it counted. Fixed:

- **The `/try` re-arm and store.** It crashed on every step under Postgres (a `timestamptz` read as a `Date`); the JSON store lost writes under concurrent writers and could read a half-written file as empty (now an atomic rename under a cross-process lock; the reviewer's own race now keeps 400 of 400 messages); a failure while opening a room leaked a funded second room past the daily cap (a room is now recorded as `opening` the moment it exists and resumed from the chain's state); a room was marked closed while still `Executing` (close is now driven until `Settled`, never while a payment or close step is in flight); another room's leftover messages could block the inbox (the agent reads only its rooms' messages; a closed room's waiting messages are marked `room_closed`); the re-arm ran inside the inbox loop (now its own loop); the `/try` copy now comes from the configured timings and the room's state.
- **Contract.** A revoked key's exception request on a used item panicked before the key gate instead of being refused as `ERR_REVOKED`; it is now a recorded refusal after the key and state gates (`ERR_CAP_EXCEEDED`, the item's one exception being the cap). An exception could be approved while the item's payment was in flight at the old amount; now `ERR_IN_FLIGHT`. The fuzz test checks every receipt against the amount due when it was sent and `paid` against what the items settled, and fuzzes requests during flights, rejections and used exceptions.
- **Testnet paths the local runs hid.** The keeper's observer client did not speak OutLayer's HTTPS API (now `POST <api>/call/<owner>/accord-observer`, `X-Payment-Key`, `{input}`, reply `{status, output}`, from app.outlayer.ai/docs/https-api; untested until probe 0.3); one observer error stopped period closing; `make payee-change` filed factory reports against the real recipients (its refusals are now shown with preflight); `make demo` could not create accounts on testnet (sub-accounts of the buyer now); the CLI's `--network sandbox` mixed in testnet `.env` values.
- **Honesty.** Local Sealed Table outputs on every path carry `"local": true`; `make negotiate` no longer claims signatures it did not check and fails on no deal; `make atlas` (now `make market-making`) says slot times are not in an enclave on a local node; market-making "withheld" counts only unpaid money and is not shown in red.
- **The local node.** The local negotiator returns an error instead of panicking on contradictory limits; a job panic becomes an unsigned error output; a request is marked answered only after its output is submitted; agreements past the 100th are served; the HTTP endpoint answers only this machine (Host and Origin checked, JSON content type, five-second read, 64 connections).

Kept as stated limits: an item can be reopened from `AssumedPaid` by one exception only, so a second stale lock on the same item leaves it `AssumedPaid` (the refund at `Settled` returns the amount if the transfer in fact failed); an approved exception without `waive_evidence` on a withheld market-making period does not make it payable (use `waive_evidence`). Local Payee and observer outputs carry no marker of their own (their code and output shape are the deployed ones; the domain file is served by the local node, which its log says); they are signed with sandbox-only keys that no testnet release accepts.

## 18. Testnet release 1 (8 Nov)

- **New factory account, `accord-v2.testnet`.** Two contract bugs only show on testnet. (a) The factory's
  `request_pubkeys` gave each releases call 90 Tgas, but `releases.request_pubkey` attaches 150 Tgas to OutLayer plus a
  40 Tgas callback, so all three ran out of gas; the factory now has an owner-only `request_pubkey(job, project)` that
  sends one job per transaction with 260 Tgas, and `make deploy-testnet` uses it. (b) Neither the releases contract nor
  the agreement passed `secrets_ref` to `request_execution`, so OutLayer attached no secrets and every job answered
  "PROTECTED_*_SEED is not set"; both now pass `{"account_id": <project owner>, "profile": "default"}`, the owner being
  the first part of the project id. `releases.accord-v1.testnet` has no key by design and cannot be upgraded, so the
  fixed release went to a fresh factory; `accord-v1.testnet` remains the OutLayer project owner and holds the secrets.
- **S1 not expressible with outlayer-cli 0.2.2.** `secrets set/access` offers `allow-all`, a fixed whitelist,
  `--direct`, `--via` and a build lock; no account pattern. Agreement accounts (`a<n>.accord-v2.testnet`) appear at
  creation, so a fixed whitelist cannot name them. Applied the closest supported condition: `allow-all` AND locked to
  the exact build hash. Effect: any caller can run a job and get an output signed with its seed, but every output names
  the agreement and is checked by that agreement against state it reads itself, so a run requested by someone else
  cannot change an outcome. Revisit with the dashboard's Account Pattern condition (or a later CLI) before mainnet.
- **Token: `tusdc.accord-v1.testnet`** (the repo's test token, open mint capped at 1,000 per call) instead of Circle's
  testnet USDC, because the faucets were down on 8 Nov. Switch back by setting `ACCORD_TOKEN` and redeploying a factory
  config; both buyers are already registered with Circle's token.
- **Task ids are OutLayer request ids.** The `execution_requested` event's `request_id` (13596, 13597, 13598) is the
  task id: `GET https://testnet-api.outlayer.ai/attestations/<id>` returns the TDX quote for that run.
  **Corrected 9 Nov 2026 (section 31):** a request id is not a task id. `/attestations/<id>` looks up a task id, so
  `/attestations/13596` is an unrelated run; the run for request 13596 is `/attestations/by-request/13596` (task 28391).
- **Live flow:** `create` sized its buyer check for embedded (20 NEAR); it now reads the factory's `create_deposit`
  and adds 6 NEAR. `make verify DEAL=` passed the agreement positionally; it now passes `--agreement`.


## 19. Testnet release 2 (8 Nov): the Sealed Table on a reasoning model

- **Why a2.accord-v2.testnet ended WALK_AWAY.** With working NEAR AI credits the run reached the model and both responses
  verified, but the vendor's QUOTE never parsed: `completion_tokens` was exactly 2 × 700. The models NEAR AI serves in
  TEEs (glm-5.3-flash, DeepSeek-V4.1-Flash, Qwen3.8-27B, all checked) reason before answering and the reasoning counts
  against `max_tokens`, so every turn stopped on `length` with no message and the protocol walked away after two
  attempts. Reproduced outside the enclave with the real vendor prompt, schema and fixture mandate.
- **Fix:** the job sends `reasoning_effort: "low"` and `max_tokens` 2500 (low effort answered a valid QUOTE in about
  370 tokens). New Sealed Table build `1099138a…`, uploaded to FastFS and deployed as a new version of
  `accord-v1.testnet/accord-sealed-table`; its secret row moved with `outlayer secrets access --build` (the seed is
  kept, so the signing key is unchanged).
- **Release 2** on `accord-v2.testnet`: pubkey runs 13604 (sealed table), 13605 (payee), 13606 (observer); publish
  https://testnet.nearblocks.io/txns/4XjUxvwJa8qkSa5qwZENqqoYJ6Cu8QYiFASmequkg6wa, current
  https://testnet.nearblocks.io/txns/Ce2DBJq6UYUjyceWPkpYhcZghghe4PrXb4ggxrbYfdbb. The agreement code is unchanged, so
  the global contract from release 1 (`8wMuMRre…`) is reused; `make deploy-testnet` now skips republishing it.
- **Payee domain on testnet:** `DEMO_VENDOR_DOMAIN=accordweb-production.up.railway.app`; the website serves
  `fixtures/companies/halcyon/accord.json` at `/.well-known/accord.json` (website commit 1e6f349). It is not in the
  job's `DEMO_DOMAINS`, so proofs carry `demo_domain: false`; the recipients and authorities are the real testnet
  accounts it lists.
- **OutLayer keystore outage:** two runs for a3.accord-v2.testnet (requests 13608 and the retry) failed before the job
  started with "Decrypt failed: every keystore instance is unreachable"; OutLayer's API had been redeployed minutes
  earlier. The contract recorded `negotiation_failed` (attempt 1, 2) and the fee was refunded.

## 20. Email sign-in with NEAR Auth (8 Nov)

- **What:** "Continue with work email" signs in through NEAR Auth (FastAuth) on testnet with its shared testnet Auth0 client (`np8paqIpMWmNbzT4xAvOOapZBjsOpptl`, `login.testnet.fast-auth.com`; docs.auth.near.org/resources/testnet), `@fast-auth-near/browser-sdk` 1.4.2 and `@fast-auth-near/javascript-provider` 1.4.1. The person's account is the implicit account named by their MPC-derived ed25519 key (`v1.signer-prod.testnet`, predecessor `fast-auth.testnet`).
- **Server:** `/api/fastauth/session` verifies the Auth0 ID token against the tenant's JWKS, derives the account from the MPC contract itself (the browser cannot choose it), funds a new account with 0.3 NEAR once, and opens the usual session. `/api/fastauth/sign` relays the approved `sign` call (300 Tgas, 1 yoctoNEAR) for a signed-in session, rate-limited, after verifying the signing JWT. The relayer `relay.accord-v2.testnet` holds only its own key (`RELAYER_ACCOUNT`, `RELAYER_KEY`); no user key exists anywhere.
- **No NEP-413 for email users:** browser-sdk 1.4.2 has no message signing, and a NEAR Auth signature is the public result of an on-chain call, so it can never seed the document key. Email users approve and fund; sealing a mandate shows "Seal with a wallet". "Confirm it's you" uses the verified login instead of a signed message.
- **Callback origin:** the shared testnet client only accepts `http://localhost:3000` as a redirect. Locally, email sign-in works when the app is served on port 3000; a hosted app needs its own NEAR Auth credentials registered for its domain (`NEXT_PUBLIC_NEAR_AUTH_CLIENT_ID`). Verified 8 Nov: the popup reaches `login.testnet.fast-auth.com/u/login/identifier` (email, passkey, Google).
- **Not verified headlessly:** completing a real email login, the account funding, and an MPC-signed transaction. They need a person to log in once.

## 21. Testnet release 3 (8 Nov): the full flow on a6.accord-v2.testnet

- **Why a3.accord-v2.testnet ended WALK_AWAY.** After OutLayer's keystore came back (22:23), the run on release 2
  (request 13673) reached the model and verified both responses, but the vendor's QUOTE carried a filled `atlas` block
  in a procurement agreement on both tries; `to_terms` refuses that, so the protocol walked away in round 1. The schema
  allowed `atlas` as null or the object and nothing told the model which one.
- **Fix:** `response_format(kind)` narrows `terms.atlas` to `null` for procurement and to the object for market making,
  so constrained decoding cannot produce the wrong form (commit 397d7b3, test `response_format_narrows_atlas_to_the_kind`).
  The live test reached terms in 3 rounds. New Sealed Table build `7c832ce9…`, deployed as a new OutLayer version,
  secret row moved with `outlayer secrets access --build` (seed kept).
- **Release 3** (global, agreement code unchanged): pubkey runs 13682 (sealed table), 13672 (payee), 13683 (observer;
  publishing a release clears the pending set, so all three are requested again); publish
  https://testnet.nearblocks.io/txns/7m8pj7u2D5aAXJ3RPbPWkhShKpJxwWHhPSpRrKr9nPVh, current
  https://testnet.nearblocks.io/txns/CeP5paUQ3KL61v9RqsiCaLE632wVpQ8fmJKCuh3B7JRU.
- **a6.accord-v2.testnet, end to end** (`make negotiate`, then `make finish DEAL=a6.accord-v2.testnet`):
  - mandates sealed: https://testnet.nearblocks.io/txns/Ek9Zr1wjD6nrWaKHFak8UDv5Jwbaacqrdh1huNp6qwAk (buyer),
    https://testnet.nearblocks.io/txns/2Zq8pfNoa1dFzMLAy79aGyek72q3LGcrvRqAjYABisKZ (vendor)
  - negotiation in OutLayer's enclave with glm-5.3-flash, QUOTE → COUNTER → FINAL → ACCEPT, 35.50 tUSDC in 3 items,
    59 s: https://testnet.nearblocks.io/txns/GfX5qKq35rvtUVkp9nBPgw3kkzDSXx6hfY2H5cb3wfHW
  - approvals: https://testnet.nearblocks.io/txns/H6cMyE6kzs9SdrC4yaP7CvnDxJqH4NSx7ivKeu2rBHSg (buyer),
    https://testnet.nearblocks.io/txns/2uv8tTfeYhe2aZ5cMrVNfFzr88kPL4HeSxwYzNhtmveT (vendor)
  - funded 35.50: https://testnet.nearblocks.io/txns/2CeFB18jenw2iggWE8mQZy9DehwZ2f97TYXwi3RVeXPy
  - recipient `halcyon-mm.testnet` proven by the Payee job on `accordweb-production.up.railway.app`:
    https://testnet.nearblocks.io/txns/6koRbw5QDYTgVU52Fe1vH755QGLPwZabQhF1kTk5rup6, authority
    https://testnet.nearblocks.io/txns/FBQnqtKXs5B5zn1A4F1yCDUmACYMqsi2zM2uez6YxDis, buyer
    https://testnet.nearblocks.io/txns/3d3LSZvz3yPX5LM1Bk6t9bxiX2x1JDMEt9mfa2fbw11p
  - agent key: https://testnet.nearblocks.io/txns/EUJ86tSVNuYsgtMVYYZZ9CYbsJmY6jCKm1Uew5doPU1C
  - item 1 paid 16.50 to the recipient: https://testnet.nearblocks.io/txns/2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ
  - 13.00 redirected to `halcyon-markets.testnet` refused `ERR_PAYEE_MISMATCH`:
    https://testnet.nearblocks.io/txns/AB9HLnWvkzNL418ygx8AVArinPnAK3jqxt4haAjsk8fs
  - revoked: https://testnet.nearblocks.io/txns/4ervNQdjrd7MA1n7vWSY7cRUtCpwiQwSK7xDSK2Bmn9P; the agent's next call is
    rejected by the network with `AccessKeyDoesNotExist`
  - `make verify DEAL=a6.accord-v2.testnet`: 6 checks ok · 1 not checked (release: needs `outlayer-verify`), as it printed
    then; since 9 Nov 2026 the model check reports `partial` (nonce bound, hardware quote not checked there), so the same
    agreement prints `verify: 5 checks ok · 1 partial · 1 not checked`

## 22. Naming: one product, six agreement types (8 Nov 2026)

- **8 Nov 2026: "Accord Atlas" retired as a name; market-making is one of six agreement types.** Accord is one product.
  The six types on the site: market making and vendor contracts (in the demonstration), agent-to-agent services,
  security remediation, infrastructure service agreements and grants (planned). Market making is the featured type.
- The four parts are Sealed Table, Agreement controls, Payee and Evidence checks (`apps/web/seo/facts.mjs`, NAMING).
- Code keeps `market-making` as the agreement type and the `atlas` field in the terms (wire format, JCS vectors), the
  `accord-core::atlas` module and the observer job. `make market-making` replaces `make atlas`; the app serves
  `/market-making`. `make atlas` and `/atlas` (app and site) stay as aliases so recorded runs and old links work.
- Claim 6 now reads "A market-making agreement's payment becomes eligible only when the agreed observations pass,
  unless the buyer approves an exception", matching the site's `/security`.
- Gate G-Atlas (6 Nov) did not pass on testnet: market making on testnet waits on an OutLayer payment key
  (`docs/build/BLOCKED.md`). The testnet proof and the video lead with procurement (`a6.accord-v2.testnet`, section 21).

## 23. Sign-in: external NEAR wallets only (9 Nov 2026)

- **9 Nov 2026: sign-in is external NEAR wallets only; email sign-in (NEAR Auth) removed.** Section 20 is kept as the
  record of what was built. The app connects wallets through HOT Connect (`@hot-labs/near-connect` 0.12.0); on testnet its
  manifest (hot-dao/near-selector `repository/manifest.json`, `features.testnet`) lists Meteor, Intear, Ledger, Nightly
  and WalletConnect among others. Meteor and Intear sign NEP-366 delegates and send through Accord's relayer
  (`/api/relay`, unchanged), so they pay no gas.
- Removed: the "Continue with work email" button, `/api/fastauth/*`, the server's NEAR Auth token check and account
  funding, the email session path, `NEXT_PUBLIC_NEAR_AUTH_CLIENT_ID` and the `@fast-auth-near/*`, `near-api-js-v5` and
  `buffer` packages. Wallet sessions (NEP-413, `/api/session`) are unchanged.

## 24. A second factory that settles in Circle USDC (9 Nov 2026)

- **What:** `accord-usdc.testnet` runs release 3 exactly as `accord-v2.testnet` does: the same global agreement code
  (`8wMuMRreZfLiVPNjcsPjB2ZkcJJwsKh56BsasVxdpEBN`, not published again), the same OutLayer projects and builds (sealed
  table `7c832ce9…`, payee `24071443…`, observer `8240179a…`), the same model (`z-ai/glm-5.3-flash`), outlayer
  (`outlayer.testnet`), keeper (`accord-keeper.testnet`), `create_deposit` (`2 NEAR`) and `demo_allowed`. Only the token
  differs: Circle's USDC on NEAR testnet, `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af` (6
  decimals, storage deposit `0.00125 NEAR`; section 1). `accord-v2.testnet` and its agreements (a6, a8) are unchanged.
- **Why a second factory, not `set_config`:** an agreement copies the factory's token at creation (`token: args.token`)
  and keeps it for life, so one factory per token keeps every existing agreement and the try-it default as they are.
- **Release 3 on the new factory** (`make deploy-testnet` with `RELEASE_FROM=accord-v2.testnet RELEASE_MODE=global
  RELEASE_VERSION=3`): the factory's `store_pubkey` accepts only its own `releases.<factory>`, so the three pubkey runs
  were requested again through `releases.accord-usdc.testnet` (OutLayer requests 13909, 13910, 13911). They returned
  the same signing keys as accord-v2's release 3 (the seeds are the projects', not the factory's) and the same mandate
  key. The jobs read the factory from the agreement's own state (`payee`: `factory: str_of(&ag, "factory")` for
  `recipient_stats`, `reports`, `blocked`; `sealed-table`: release and token from the agreement, decimals from the
  token's `ft_metadata`; `observer`: the agreement only), and none checks a factory id or a release, so they need no
  change. `make verify` reads the release from the agreement's own factory and fails the code check when that factory
  is not a known Accord factory (`KNOWN_FACTORIES` in `@accord/sdk`, plus `ACCORD_FACTORY_USDC`) or did not register
  the account.
- **Token registration:** the agreement already registers itself with its token in `new` and each recipient when it
  becomes active (`storage_deposit`, `TOKEN_STORAGE_DEPOSIT` = Circle's `0.00125 NEAR`, sized for Circle's token from
  the start); the buyer is registered by receiving USDC (`northwind-demo.testnet` and `northwind-try.testnet` already
  were). Nothing new was needed. The sandbox test `a_second_factory_settles_in_its_own_token` shows an agreement of a
  second factory refusing the first factory's token (it is not registered with it, so the token panics and the buyer
  keeps it) and paying in its own.
- **Funding:** `accord-usdc.testnet` was created by the testnet faucet service with 10 NEAR (it holds 7.98 NEAR after
  deploy, init and the releases account's 2 NEAR). The buyer `northwind-demo.testnet` was topped up by 10 NEAR from a
  throwaway faucet account `accord-topup-1109.testnet`, deleted into it. `accord-v2.testnet`, the demo vendor and the
  authority were not touched.
- **Transactions:** create account
  https://testnet.nearblocks.io/txns/Dfj1BvjeAkNDY7ZGs4Zs6RDjfaZHVCLpqA7EmEawWrqq; deploy and `new`
  https://testnet.nearblocks.io/txns/5u7vQQsFoYMXmEFK5SdECwrR6NDyhA9Ad5bp4ku8ezpF; pubkey runs
  https://testnet.nearblocks.io/txns/GWynjwkhfmdALMQ39eY97QaZkSKdZGzjLqmQFcLRfVpu (sealed table),
  https://testnet.nearblocks.io/txns/Gt8cqk6zLDYvUGBTzrPzo7NB1eet8G5DykYfyvMwqgWh (payee),
  https://testnet.nearblocks.io/txns/BWc7GYhr6F7mzhmN1d1csH8czhghYoKBGMNT1usPdHd9 (observer); publish
  https://testnet.nearblocks.io/txns/H5UYzV98Rwx68W2mvbQRqJ6bss9ZRRxDwi5LxKVJHmcg; current
  https://testnet.nearblocks.io/txns/7YZfbAodoyoLwNjNV8oNTERyoKAgmkZNGEeuYF47zHYK; buyer top-up
  https://testnet.nearblocks.io/txns/EAUCY2BWUfwnGzMgovvtkdLXS9RB6hzqoLfPcdwc2CFW (faucet account) and
  https://testnet.nearblocks.io/txns/A4uopnHHJj66wUtyb3RCC3mHkHfhu4d2P2Zs8bf3p93R (deleted into the buyer).
- **a1.accord-usdc.testnet** (`make negotiate-usdc`, then both approvals): create
  https://testnet.nearblocks.io/txns/5XJBqPm9D7DfSrNbSooZygKN7kYFmSHHis3iRTxerBqa; mandates
  https://testnet.nearblocks.io/txns/8azM8K9UvMVdkQEk2UDRPRNqhd9goANeVNBicTDnS1vq (buyer),
  https://testnet.nearblocks.io/txns/HFkF8Z2Zgwjr8JfqSGW4EVsjVEhrvZWaMj2gwDUgUqg3 (vendor); negotiation started
  https://testnet.nearblocks.io/txns/7Pjnn23i8ZBsLHvaxKPt2jP113D1ECtP4qP8SvsPfTj, glm-5.3-flash in OutLayer's enclave,
  QUOTE → COUNTER → ACCEPT, `14.00 USDC` in 3 items, 57 s; approvals
  https://testnet.nearblocks.io/txns/6b25czno2mFQarVTfHo1LxdsHFkUs9FjcgViVWsb38Yf (buyer),
  https://testnet.nearblocks.io/txns/DN2EDJVhfcdUZ6zsqG8TJwD7yRGgwbsxqdfdeqgiT2s5 (vendor). The agreement is
  registered with Circle's token. `make verify-usdc DEAL=a1.accord-usdc.testnet`: 4 checks ok · 1 partial · 2 not
  checked (payee: no active recipient yet; release: needs `outlayer-verify`).
- **Not done yet:** funding. Circle's faucet is a captcha form, so `northwind-demo.testnet` must receive at least
  `14 USDC` from https://faucet.circle.com (network NEAR Testnet) before `make finish-usdc DEAL=a1.accord-usdc.testnet`
  funds it, proves the recipient with the Payee job, pays item 1 and shows the redirect refused and the key revoked.
- **The presets:** Circle's faucet gives about `20 USDC` per address every 1 to 2 hours, so a Circle room seals
  `usdc-procurement` (buyer ceiling `18`, target `14`; vendor floor `12`, target `16`), in the live targets, the seal
  page and the demo counterparty. A test USDC room keeps its presets.
- **App:** `ACCORD_FACTORY` and `ACCORD_TOKEN` stay the default pair; `ACCORD_FACTORY_USDC` and `ACCORD_TOKEN_USDC`, when
  set, add the Circle pair. The relayer carries `create_agreement` on either factory, calls on either factory's
  agreements, and `ft_transfer_call` on each factory's own token (read from that factory's config) only into that
  factory's agreements; a token into the other factory's agreement is refused. With the variables absent the app is
  as before. Limit: the portfolio totals add test USDC and Circle USDC together.

## 25. Security review fixes and release 4 (9 Nov 2026)

This was an internal, AI-assisted security review, not a third-party audit (mainnet still follows an external audit).
Five review passes (L1 payment path, L2 authorisation and keys, L3 creation and code integrity, L4 funds, L5 the jobs)
and two re-checking passes, which reproduced each finding with a test (the review's own notes called them "auditors"
and "skeptics"; the finding ids below keep their labels, and C1 to C3 are the re-checking passes' ids); every fix below went in test first (the test failed for the reason
named, then passed), and the tests stay in the suite. Release 4 carries the contract fixes for **new** agreements
only: a6, a8 and a1.accord-usdc.testnet keep running release 3's code by hash and are unchanged.

| # | Finding | Fix | Tests | Commit |
| --- | --- | --- | --- | --- |
| 1 | HIGH (C1, L4-F1): `on_close_balance` refunded `balance - reserved`; a deposit sent with `ft_transfer_call` during the close is credited, refused by `ft_on_transfer` (`ERR_CLOSING`) and taken back after the read, so the refund spent the vendor's reserve | While anything is owed to the vendor (a reserved item, an `AssumedPaid` item, a payment in flight) the refund is capped at the ledger (`funded - paid - reserved`) and the `settled` event carries the capped value; with nothing owed the whole balance goes back, and `close()` after `Settled` sweeps what is left once nothing is owed (so a stray deposit still reaches the buyer). The retry keeps `min(owed, balance - reserved)` | `review_funds_tests::audit_close_refund_never_exceeds_the_ledger_when_tokens_are_in_transit`, `audit_refund_retry_sends_at_most_what_is_owed`, `audit_a_stray_deposit_is_swept_to_the_buyer_once_nothing_is_owed`; sandbox `tests/audit.rs a_deposit_in_transit_during_close_never_spends_the_reserve` (skeptic C1); I17 in `flow.rs` updated: the stray deposit comes back with the last `close` | afe5467 |
| 2 | LOW (L4-F2, L1-4): a late failed callback after `Settled` reopened an `AssumedPaid` item as `Eligible`, which nothing can pay after `Settled` | After `Settled` it becomes `Reserved` with its amount set aside again; with 1, nothing is stranded | `audit_late_failure_after_settled_reserves_the_item_for_the_vendor`, `audit_late_failed_claim_after_stale_restores_the_reserve` | afe5467 |
| 3 | MEDIUM (L2-1, L5, C3): `submit_sealed_result` fed unverified output into `handle_sealed` (garbage burned attempts or discarded a real answer), and with S1 open the keeper could request its own run for the live nonce and submit the signed outcome it preferred | Full verification (`check_sealed`, current nonce, terms or a final no-deal) before any state change, else `ERR_BAD_OUTPUT`; F1 is not in use (nothing in the keeper, agent or app calls it), so the method is compiled only with the cargo feature `f1` and `make check-deploy` refuses a wasm carrying `submit_sealed_result` | `tests.rs audit_keeper_garbage_is_refused_and_burns_no_attempt`, `audit_keeper_garbage_cannot_discard_the_real_answer` | 6081b5e |
| 4 | MEDIUM-LOW (L5): an off-curve doc key let a negotiation agree and then fail as a retryable `infrastructure` outcome, telling its sender a deal existed inside its limits; and a party could re-seal after an attempt | Job: `sealing::open` requires a real secp256k1 point (`k256`), so it is a final `BAD_INPUT` before any model call. Contract: `commit_mandate` is refused once an attempt ran (chosen over resetting both commitments: the existing retry flows re-run `start_negotiation` without re-sealing, and it needs no second seal from the other side). The SDK derives doc keys with `secp256k1.getPublicKey`, so the app always produces a point | `jobs/sealed-table/tests/audit.rs an_off_curve_doc_key_is_bad_input_before_any_model_call`; `tests.rs audit_a_mandate_cannot_be_replaced_after_an_attempt` | 8d53aee, b5f2bcc |
| 5 | MEDIUM (claim gap): S1 is not enforced on testnet (section 18); L5-F2: the jobs served accounts no factory created | The three jobs compile in the testnet factories (`accord-v2.testnet`, `accord-usdc.testnet`) and serve only `a<n>.<factory>` accounts whose own view names that factory and id and that the factory's `is_agreement` confirms, checked before anything is spent (model, domain fetch, mainnet read). S1 itself cannot be checked inside the job: OutLayer gives a job `NEAR_SENDER_ID` = the transaction signer for on-chain requests and the payment key's owner over HTTPS (https://app.outlayer.ai/docs/https-api, "Environment Variables in WASM"), never the contract that called `request_execution`; no `NEAR_PREDECESSOR_ID` is documented. So S1 stays on the secret's access condition (Account Pattern with direct calls only, https://app.outlayer.ai/docs/secrets), which only the dashboard can set: `docs/build/BLOCKED.md`. Claim 1's limit now says so everywhere the table appears | `accord-jobkit factory::tests`, `sealed-table tests/audit.rs an_account_outside_the_factory_gets_no_negotiation`, `a_factory_agreement_still_negotiates`, `payee an_account_outside_the_factory_is_refused_before_any_fetch`, `observer an_account_outside_the_factory_is_refused_before_mainnet` | e12adb2, 3348618 |
| 6 | MEDIUM (L3-F3): `verify` checked the code hash and keys, which anyone can reproduce on an account no factory created | On top of the known-factory and `is_agreement` checks, the code check fails unless the id is `a<id>.<factory>`, the job keys are the release's and token, outlayer and keeper are the factory's config. Both factories supported; a6, a8 and a1.accord-usdc still verify | `packages/sdk/test/verify.test.ts` | 763123f |
| 7 | MEDIUM (L3-F4): a report filed by any buyer's agreement downgraded every other buyer's preflight for that recipient | Only reports from agreements with the same buyer count toward the rating; the rest are `foreign_reports`, shown as information. Not done: storing the reporting buyer in the factory (a state change) | `packages/sdk/test/preflight.test.ts` | a894147, ca7b24b, 79da2ab |
| 8 | LOW (L1-1, L1-2, L1-3, L2-2, L2-3, L2-4, L1-1c, L2-6 / L3-F6): `act` and the sensitive methods | A `Pay` recipient is at most 64 bytes and an account id (else malformed, panics before any gate); canaries match in any case; the allowance is at most `params.agent_allowance`; a repeated `RequestException` is a counted `ERR_CAP_EXCEEDED`; the agent's own requests take at most 8 of the 16 exception slots; a claim's refusal is an event only, never in the agent's 128-slot log; `Settled` deletes the agent's key; and the twelve sensitive buyer, authority, party and owner methods take exactly 1 yoctoNEAR (a full-access key only). The SDK attaches it only for agreements not on the release 1 to 3 code, so older agreements keep working; the relayer already carries a deposit inside a delegate | `tests.rs audit_a_recipient_must_be_an_account_id_before_any_gate`, `audit_a_canary_spelling_variant_still_revokes`, `audit_install_agent_key_respects_the_params_allowance`, `audit_repeated_exception_requests_count_toward_the_limit`, `audit_the_agent_cannot_exhaust_the_exception_slots`, `audit_vendor_claims_never_evict_agent_refusals`, `audit_settled_revokes_the_agent_key`, `audit_sensitive_methods_need_one_yocto`; factory `audit_owner_methods_need_one_yocto`; sdk `test/yocto.test.ts` | 2f54fef, 277870d |
| 9 | LOW (L2-5, L3-F1, L3-F2): factory | `vendor != vendor_authority` (`ERR_PARTIES`); the typed params are forwarded, never the raw JSON; the factory keeps the stake for what a creation stores (record plus 512 bytes for the callback) and passes the rest of the deposit on. `by_party` stays a `Vec` per party: paginating it changes the stored layout of a live factory, so it is a stated limit (one party with tens of thousands of agreements makes the creation callback expensive) | factory `audit_the_vendor_may_not_be_its_own_authority`, `audit_only_the_typed_params_reach_the_agreement`, `audit_creation_storage_is_paid_by_the_caller`, `audit_a_failed_creation_refunds_all_but_the_record_stake`; sandbox `padded_params_cannot_fail_a_creation_after_its_record`, `creation_storage_is_paid_by_the_buyer` | 5bc986b |
| 10 | LOW (L5 L1): no floor on a market-making vendor's depth band | Optional `min_depth_band_bps` in the vendor's limits (`0` when absent, so older mandates keep their meaning) | `accord-core limits audit_the_vendor_can_floor_the_depth_band` | 4e1dc78 |

- **Changed limit:** section 17 kept "the refund at `Settled` returns the amount if the transfer in fact failed" for an
  item left `AssumedPaid`. With the cap in 1 that amount now stays on the account until the payment's own callback
  answers: a failure sets the item `Reserved` (2) and the vendor claims it; a success leaves it paid. If that callback
  never runs, the amount stays on the account.
- **Factory state:** no field of `Factory` and no stored type changed (the new checks only read), so the new factory
  code is borsh-compatible with the live state of both factories and was deployed in place. After the upgrade both
  read their config, releases, registry and agreement list as before (`config`, `current_release`,
  `is_agreement(a6)`, `agreements` checked), and a6, a8 and a1.accord-usdc verify unchanged.
- **Not deployed:** the job changes (findings 4 and 5, and 10's local negotiator) need new builds and OutLayer uploads;
  release 4 keeps release 3's job builds. Steps in `docs/build/BLOCKED.md`.
- **Deployed on testnet (9 Nov 2026):**
  - factory code (`ES9rwM2J…`, state kept) on accord-v2.testnet
    https://testnet.nearblocks.io/txns/GvJ6Sjw63Difny9cdwnU2AyBQtXvet1Es9oS1VSFCjS9 and on accord-usdc.testnet
    https://testnet.nearblocks.io/txns/5y2cFxHEAvSR85cuyecWUPNNQpQFvnbzQitoXVPZkQxA. New agreements still get release
    3's code until release 4 is current.
  - release 4's pubkey runs, on release 3's job builds (`make deploy-testnet` with `JOBS_FROM_RELEASE=3`): accord-v2
    requests 13987 (sealed table) https://testnet.nearblocks.io/txns/3nceFkkX9gLnzNgH8ruWkWtTvH5eDBB5BHsZ2mNy27Lm,
    13988 (payee) https://testnet.nearblocks.io/txns/FRvDHNkonJCvUQACQ1t7DTCayXPEgTHnfNJkfm1CjP8D, 13989 (observer)
    https://testnet.nearblocks.io/txns/H6w7biiHNHJUnf4FWny2gNxjQAJ5GAsvAEumYCr8m4pi; accord-usdc requests 13990
    https://testnet.nearblocks.io/txns/AsEUBvwK19JJFyw9EpFnEHFPU6GAHYUo7Hwd8kfgV84n, 13991
    https://testnet.nearblocks.io/txns/8n3TGfsZKSpRz4GNBkGSMFAGbh2VgoA6L5coUXMX5U8F, 13993
    https://testnet.nearblocks.io/txns/AGBEmS1kuy3iQ4QzPTmMqLEVpE5FYhwCd5A4S9eZxhhJ. All six stored; the keys equal
    release 3's (sealed table `GgC8gEhK…`).
  - creation through the upgraded factory still works on release 3: `a9.accord-v2.testnet` created by a throwaway
    faucet account https://testnet.nearblocks.io/txns/D8aWcmS9JLjKTEg73CZxzqwGXQR18g43xdnb9iU6EsxT, cancelled
    https://testnet.nearblocks.io/txns/BbSU9gR84g9VfrDzJbDsbA28ivZNhx3JAQFe8GySMeBd, `1.98 NEAR` withdrawn
    https://testnet.nearblocks.io/txns/7orZUPGJTWbQ6hEb25VLPL1bixoMJ31kxAZfDMmKKwBX (the factory kept about
    `0.008 NEAR` for the record, finding 9).
  - funding: two testnet faucet accounts (`accord-r4-fund1`, `accord-r4-fund2`, 10 NEAR each) were deleted into
    accord-v2.testnet (https://testnet.nearblocks.io/txns/4onpVKM3qRosBSuodGYSnpuL7FkBJYL2VyzrU1ozkPyA,
    https://testnet.nearblocks.io/txns/7P5Auw4ai64u1xk7zL17NWWUmC1HHk3Jy2d4Jn3quuFo); it holds about `21.4 NEAR`
    above its storage stake.
- **Counts:** 1 High (1), 5 Medium (3, 4 Medium-Low, 5, 6, 7), and 4 groups of Low findings (2, 8, 9, 10) holding 13
  individual items: 1 in row 2 (found twice, as L4-F2 and L1-4), 8 in row 8 (L2-6 and L3-F6 are one), 3 in row 9 and
  1 in row 10.
- **Where the review tests run:** in CI (`.github/workflows/ci.yml`), the Rust unit tests of `accord-core`,
  `accord-agreement` (`tests.rs`, `review_funds_tests.rs`) and `accord-factory` (`review_tests.rs`) on the mocked
  chain, and the SDK tests (`verify.test.ts`, `preflight.test.ts`, `yocto.test.ts`). Locally only: the sandbox tests on
  a real local node (`tests/`, including `tests/audit.rs`; `make sandbox`) and the enclave job tests
  (`jobs/*/tests`, `accord-jobkit`).
- **Not done yet: release 4 itself** (superseded by section 26: release 4 is published and current on both factories). Publishing the new agreement code as a global contract burns about `50 NEAR`
  (release 1's publish burned `50.13 NEAR`, ten times the storage of the `500 KB` wasm), and the faucet stopped
  answering after two accounts. Until the release is published and current, `make check-deploy` reports the local
  wasm `ECgsrZwy…` against release 3, and the three proofs on a release 4 agreement wait. Steps:
  `docs/build/BLOCKED.md`.

## 26. Release 4 (security review fixes) live on testnet, proofs re-run (9 Nov 2026)

The reviewed agreement code (`ECgsrZwyoZvoHDjawYhRnFbxoWtt6Sx9iaPsEzqwTTGz`) is published as a global contract
(`R2qxw4u5q7unDwoUP4VCSA5BQ4pjnwpbX3eX65czRqo`) and is release 4 on both factories: accord-v2.testnet
(`EB2Lz3WF1Pqt4o9y9NzUF5uc9qEhimPAPLKdwJFwvqnU`, `J9uADVqQSkY6f1uMYbMbWoPnB4oiwuS3CtLayKojtgeC`) and accord-usdc.testnet
(`GovfwhMAtB28ayEndYmtiZHEo8sq9YhKVCXj8m3WFaai`, `5D9LxPuU4phUXTgRawd97TmhZPGiPjWzSPWCYXJteoLJ`). `make check-deploy`: release 4,
no mock or F1 symbols, 9 agreements match. Agreements created before this keep release 3 (code pinned by hash).

| Proof | Agreement | Result | Tx |
|---|---|---|---|
| negotiate | a10 | Attested in 64 s, 33.00 tUSDC in 3 items, attestation ok, `ERR_SEALED` both ways | (see `make negotiate` output) |
| finish: fund | a10 | 33.00 tUSDC escrowed | `2mBhRNnXnitEN2gefBe7C8MWdCYS7P2nJLZyZznHFH22` |
| finish: pay | a10 | item 1, 12.00 tUSDC to halcyon-mm.testnet | `Bs5dVpr6DnR5jXjYKXbGsp9HP36smmoJRFmvJP4tGqAm` |
| finish: refused | a10 | ERR_PAYEE_MISMATCH | `51TQ8no9kPp4P8SDyN77jNZMevLsKaTBH3SufU2SUefu` |
| attack | a11 | ERR_PAYEE_MISMATCH, ERR_AMOUNT_MISMATCH, ERR_CANARY revokes and deletes the key; 0.00 moved | `HvwpdKDs64sA5zuj37iK8B1N1kKDadh4VoeU8n3LwMSv`, `3cTDxHzVH29Uiw6kZceFmuuUkhnBiBp5JYW65bsewLvh`, `DPpVoMX9KKYXppXvrM6HqorDYsDd9ndQy8YniKDvMsXT` |
| revoke | a13 | `revoke_agent` deletes the key; the next call fails with AccessKeyDoesNotExist at the RPC (no transaction); `install_agent_key` adds a new key, which pays item 2 (12.00 tUSDC to halcyon-mm.testnet) | revoke `8b8FC1HeiHCTJcUaga87zWuNCg6LTgYGYDzRptdHh2H3`, install_agent_key `DfgMURQANtnBq2LziGaELXabw9tvzqhYQXq71hXjzNDT`, pay `24mdebXgCkMZFyekdDyxv3YQzJS1iaxckrfnN2aRY9Fe` |
| verify | a10 | code = release 4 · 5 ok · 1 partial · 1 not checked | |

The first `make revoke` run (a12) stopped at its last step because the script paid item 2 at a fixed 12.00 while the
negotiated amount differed; the contract refused it (`ERR_AMOUNT_MISMATCH`), as it should. The live targets now pay each
item at its negotiated amount.

Circle USDC, release 3 on accord-usdc: `a1.accord-usdc.testnet` funded 14.00 Circle USDC
(`4gPohYYMokgQcPcgNhX3tCTTXjA35AfuKkpGs1SpS2no`), paid 5.00 to halcyon-mm.testnet (`E127BGy3Tw6PmhE9JcoFr7vQsKTiHNevTTiAxEjJGWK2`),
refused a redirect with ERR_PAYEE_MISMATCH (`9rgsBFA26yedWuEEJk77sKBDrDGS9mHn9BFMknCaP8BB`), revoked
(`FTigDebs1kZjLpTN8nC8SZWp4dMM1ChuUyR211JZnzuW`); the agent's next call failed with AccessKeyDoesNotExist.


## 27. Try-it on the public URL (9 Nov 2026)

`/app/try-it` was run against https://accordweb-production.up.railway.app/app by a fresh implicit testnet account
(`7ab36eba…b5017`, unfunded at the start), with the same HTTP calls the browser makes (`Origin` set to the site) and its
wallet calls signed as NEP-366 delegates sent to `/app/api/relay`, as Meteor and Intear send them. Agreement
`a15.accord-v2.testnet` (release 4). It went Sealed, Attested, Executing, recipient active, paid, refused, revoked in 5 min 30 s.

| Step | Result | Tx |
| --- | --- | --- |
| Session (NEP-413, unfunded implicit account) | `POST /app/api/session` 200 |  |
| Faucet, NEAR (to 2.5) | `POST /app/api/faucet` 200 | `GxVw5pg34KZfyVCu2bhYMrbA4NqWai2XJQyfpmUZtZD5` |
| Faucet, tUSDC (100) | same call | `7dRodXTgVXmKHEHdB53uH87p7fJruHzLbQ688z78pgrC` |
| Create a15 (signed directly; the relayed create failed, see below) | Sealed | `GNynLq2oxREyQrF1N4rNRhDztCzfVtqJ5DVgmthDRBEy` |
| Counterparty seals the vendor mandate | counterparty step | `BpwCPtgSg4rjZVNKPnuw4nLUzemEfoJpaoSXRCmKn2PM` |
| Buyer seals the Northwind mandate (relayed) | both sealed | `6eYVDLtTJ2mFT8J7GrKUWUfWuZZDXUZTd37fhGpN1324` |
| Keeper (`accord-keeper.testnet`) calls `start_negotiation`, block 276847191, 00:17:28 UTC | `negotiation_requested`, OutLayer request 14079, `terms_proposed` in the same transaction | `Gp9JqBvYPgxw7Aqi4JKb28gWmTztM3Xw3RhJbVGtnWqT` |
| Counterparty approves the terms | Attested after 67 s | `HEm5P4gaE3LxvyV2ergFVxDHXbmVw8jthFARHH8GoV9q` |
| Buyer approves the terms (relayed) | Executing | `4nNbyFAk6moLWKHUCX37JLoeoUTFE272cHWLUXwHAeq2` |
| Counterparty proposes halcyon-mm.testnet on useaccord.tech | Proposed, then Proven | `4xGmfM2xoiRrVMA5ocLWMeiTyq4k2gQYhXVw4RNihZmp` |
| Buyer funds 33.00 tUSDC (relayed) | funded 33.00 of 33.00 | `HTpF77VeZXZf65v1p2Av3YHE5DK37FG9WAWmjxBHbUrE` |
| Buyer installs the demo agent key (relayed) | agent key set | `23gimnowmhb8nErdbPUrhzg7oGk7J382weKXYAsyQuBQ` |
| Authority approves the recipient | AuthorityApproved | `A6VokbSKJfgMWbakATCeARGsR7NbPAhFhBFsYwWx8Bth` |
| Buyer accepts the recipient (relayed, rating allow) | `recipient_accepted` and `recipient_active` in the same receipt: a first recipient has no timelock (`recipients.rs`, `active_at = now` when there is no current recipient) | `Tg1rtc6CmLHwP9aHwhzxLyEMmsxacMjsMiw6cRrn5uo` |
| Counterparty submits delivery 1 | delivery 1 submitted | `8ELSpUdszC6p3R7q6CdgLTrg1PJVtFqJvt1eDzsN5Vrd` |
| Buyer accepts delivery 1 (relayed) | item 1 eligible | `h2xtvzUGeysiQHCYr95zWxXJKJhKTpT1CdN8n8tZBss` |
| Demo agent pays item 1 | sent, 15.00 tUSDC to halcyon-mm.testnet | `7unm1ZWEE5DH74JAKsG7ZcKywz8t9V8NCNvghUcacXUd` |
| Demo agent asked to pay halcyon-markets.testnet | refused, ERR_PAYEE_MISMATCH | `7Cjd6cvxVm8racRQTotSJ1CXh5PHdgEvSzJxYszAbptz` |
| Buyer revokes the key (relayed) | 0 keys on a15; `/api/demo-agent pay` then 409 | `2nyFEeBPB4BLhwxzrWrqMhsEvSQWS4LGVjff8ZuWZAtG` |

`/app/api/verify/a15.accord-v2.testnet`: 5 ok · 1 partial (model: the hardware quote is not checked here) · 1 not checked
(release: needs `outlayer-verify`) · 0 failed. Code = release 4, 0 keys, payee proof on useaccord.tech, 1 payment, 1 refusal,
receipts match paid. RPC `view_access_key_list` on a15 returns no keys.

The first try, a relayed `create_agreement`, failed: `POST /app/api/relay` returned 502 `Not enough balance for relay.accord-v2.testnet (balance: 1991837072888958900000000, cost: 2301472081439430000000000)`. In a NEP-366 meta-transaction the relayer pays the deposits inside the delegate (nearcore counts them in the outer transaction's cost), so every relayed create costs the relayer the 2 NEAR room deposit, which goes back to the buyer when the room closes. With 1.99 NEAR left, a Meteor or Intear visitor cannot open a room. The comment in `app/src/server/relay.ts` ("any deposit is inside the delegate and comes from the user's account") is wrong. Proposed fix: `rejectDelegate` refuses delegates whose deposit is more than 1 yoctoNEAR, and the wallet signer sends a call with a larger deposit through `signAndSendTransaction` (the visitor pays it from the faucet's 2.5 NEAR) instead of the relayer; top up the relayer in the meantime. In this run the create was signed directly from the visitor's account, as a wallet that does not relay sends it. Every other buyer call went through `/app/api/relay` and worked; none returned 415 or 403.

Fixed the same day: the relayer now carries only calls that attach at most 1 yoctoNEAR (`rejectDelegate`), and the app sends a call that attaches more (the room deposit of `create_agreement`) through the visitor's own wallet, which the faucet has funded; tests in `app/tests/relay.test.ts`.

Correction (9 Nov 2026, read back from RPC and `tx.test.fastnear.com`): the earlier rows guessed who started the
negotiation and said the recipient waited out a timelock. On chain, `accord-keeper.testnet` sent `start_negotiation`
(`Gp9JqBvY…`), and `Tg1rtc6C…` emitted `recipient_accepted` and `recipient_active` together, because a first recipient
has no timelock; the 120 s wait applies to a recipient change.

## 28. Try without a wallet on the public URL (9 Nov 2026)

`/app/try-it` was run end to end on https://accordweb-production.up.railway.app/app with **Try without a wallet**
(`e2e/try-without-wallet.mjs`, Playwright): the tab made a throwaway ed25519 key, whose implicit account
(`f98a8a5d…fad2d1`) signed its own `create_agreement` (the room deposit, paid from the faucet's NEAR) and sent every
other buyer call as a NEP-366 delegate through `/app/api/relay`. Agreement `a21.accord-v2.testnet` (release 4) went
Sealed, Attested, Executing, recipient active, paid, refused, revoked in 3 min 44 s from create to revoke. Read back
from `tx.test.fastnear.com/v0/account` (18 transactions on a21) and RPC `tx` through the SDK's `RotatingRpcProvider`.

| Step | Result | Tx |
| --- | --- | --- |
| Faucet, NEAR (2.5) | `faucet.accord-v2.testnet` transfer | `27e15dD5akxXayuDCmhfvUqjJaPwwhShvFuxH39HwbGU` |
| Faucet, tUSDC (100) | `ft_transfer` on `tusdc.accord-v1.testnet` | `25w7o9hRNFFPZ4kGbzktvyd4dhW9Cxaqeb764MHR7rdT` |
| Create a21 (signed by the throwaway account), 09:04:51 UTC | `agreement_created`, `agreement_registered` | `2bXYcG7PGewYBswgXBmf4R9axkBoMQaRQn3bVniGhpt4` |
| Buyer seals the Northwind mandate (relayed) | `mandate_committed` | `Ag4FA6YrePLU8BxeY7WkXACHZA55MT3tcisoEpXriQc9` |
| Counterparty seals the vendor mandate | `mandate_committed` | `9vqBbLsLsUfV6c61CDh4RBnNboCgoFVv36ugwDXQhzf1` |
| Counterparty starts the negotiation | `negotiation_requested`, the Sealed Table ran in OutLayer, `terms_proposed` in the same transaction | `D6941SNDMAFTPHCc6XApwG8jGrebhXa4XQobExU6xFGx` |
| Buyer approves the terms (relayed) | `terms_approved`, `executing` | `7ypCffmbMwfTsQUjtR5EGi526Xf41WwBzUyHj6sGjaT6` |
| Counterparty approves the terms (same block) | `terms_approved` | `yC8Wkyocr8ZyC4VLoHe4SHsoWC4anpaSjdWMYFow1Ji` |
| Counterparty proposes halcyon-mm.testnet on useaccord.tech | `recipient_proposed`, `recipient_proven` | `2Qj2RU2kVB11JTCQXupAzJ2feYyxXfHzy8Fx8gzQu3NB` |
| Buyer funds 35.00 tUSDC (relayed `ft_transfer_call`) | `funded` 35.00 | `hds2yoNKgQTaqdpkX562XvkA1tDxJr7YeakwE3sXpse` |
| Buyer installs the demo agent key (relayed) | `agent_key_installed` | `8fYwP9wUanudAmpjJ17pxmppJM1jhaYCtN6zv9z4Ai5i` |
| Authority (`halcyon-auth.testnet`) approves the recipient | `recipient_approved` | `5pz4sz8cqv1ufp9sdA7SedubwAhzvTDeQbWzVLiA61gy` |
| Buyer accepts the recipient (relayed) | `recipient_accepted`, `recipient_active` (a first recipient has no timelock) | `EoYnYBv6zZegNvPdfjqstM4wsaLnbzzjinzJcyyfa1ke` |
| Counterparty submits delivery 1 | `delivery_submitted` | `HQ9qQdWew8D8v6sbKhxa2b4xPhybGaV6CeCzSZBHuSCb` |
| Buyer accepts delivery 1 (relayed) | `delivery_accepted`, item 1 eligible | `3nT451chF9m6JXq9JYxhHUndDARi6wm21szZTdrep7oK` |
| Demo agent pays item 1 (`act`, signed by a21's agent key) | `payment_sent`, `ft_transfer`, `payment_settled`: 16.50 tUSDC to halcyon-mm.testnet | `5vKHipEbqk9r4rxra1q9uhYNrnFGJttQYprEL3g2x3ZG` |
| Demo agent asked to pay halcyon-markets.testnet (item 2, 13.50 tUSDC) | `act_refused` `ERR_PAYEE_MISMATCH`, `recipient_reported`; refusal seq 1 in the log | `DaRuHG2tLsA5FP4f2CHouMjgABnbenUfZcGSnDeUDDmH` |
| Counterparty submits delivery 2 | `delivery_submitted` | `498cCzSWagrQk7NUnUWJpF9sLXugJHsv1tsu7UQo15NT` |
| Buyer accepts delivery 2 (relayed) | `delivery_accepted` | `Dhrg1sfMe9L9QQQNcVRc16BcpPhpH3bijrntquKieuyY` |
| Buyer revokes the key (relayed), 09:08:35 UTC | `agent_key_revoked`; `view_access_key_list` on a21 returns 0 keys | `BGJEcstTMS3oNyWiy92y7D8QRZqne2AFaNR2gxj8yy58` |

Items after the run: 1 Paid (16.50), 2 Eligible (13.50, the refused amount still unpaid), 3 Open (5.00).
`/app/api/verify/a21.accord-v2.testnet`: code ok, keys ok, sealed ok, release not checked (needs `outlayer-verify`),
model partial (the hardware quote is not checked here), payee ok, record ok: 5 ok · 1 partial · 1 not checked · 0
failed. `ACCORD_FACTORY=accord-v2.testnet make verify DEAL=a21.accord-v2.testnet`, run through the new provider, prints
the same: `verify: 5 checks ok · 1 partial · 1 not checked`, with `record 1 payment · 1 refusal (1 in the log) · …
receipts match paid · ok`. Screenshots: `01-try-it-signed-out` to `06-revoked` from the run (local, not committed).

**The run hit rate limits.** Along the way `/app/api/demo-counterparty/step` and `/app/api/relay` answered many 502s
whose body was FastNEAR's free tier saying `{"error":{"code":-429,"message":"Rate limits exceeded..."}}` (HTTP 429). The
page retried and got through, but a visitor saw raw RPC errors. Fixed the same day:

- `@accord/sdk` `RotatingRpcProvider` (`packages/sdk/src/chain.ts`), used by `Chain`, the relayer, the faucet and the
  throwaway signer. It walks `NEAR_RPC_URL` (one URL or a comma list) and then the testnet defaults
  `test.rpc.fastnear.com`, `rpc.testnet.fastnear.com`, `near-testnet.drpc.org`, `rpc.testnet.near.org` (all four
  answered `block` on 9 Nov), and moves to the next endpoint only on HTTP 429 or 5xx, a JSON-RPC -429 or rate-limit
  message, a network error or a timeout. An endpoint that just failed is tried last for 30 s. Mainnet keeps
  `free.rpc.fastnear.com` then `rpc.mainnet.near.org`.
- Not near-api-js's `FailoverRpcProvider`: its `withBackoff` catches every error except AccountDoesNotExist and moves
  on, so it re-sends after a contract panic, AccessKeyDoesNotExist or InvalidNonce and replaces the real error with
  "Exceeded N providers". The app and the proofs read those errors (`/AccessKeyDoesNotExist/` in revoke and attack,
  `NotAnAgreementError` in verify). The new provider throws every nearcore error unchanged from the first endpoint
  that gave it.
- A signed transaction is re-sent only after a transport failure: its hash is fixed by its bytes, so nearcore finds it
  already known or accepts it once. If the re-send answers InvalidNonce, the first send got through, and the provider
  reads the outcome by hash (`tx`) instead of letting `Account` re-sign with a new nonce, which would run the call twice.
- When every endpoint fails, `RpcUnavailableError` names the method, the attempts and the last cause, with the host only
  (an API key in a URL never reaches a message). The API routes answer it with 503, `Retry-After: 5` and "The network is
  busy, retrying shortly." and never pass a raw JSON-RPC body on. DemoPanel backs off from 8 s to 30 s while busy and
  shows one quiet line; the throwaway signer re-posts a delegate after a busy 503 (its own nonce makes a repeat
  harmless); a room page whose read hit a busy RPC shows a retrying panel instead of a 404.
- Tests: `packages/sdk/test/rpc.test.ts` (local mock servers: 429, -429, 502/503, contract panic kept, AccessKeyDoesNotExist
  kept, network error, timeout, all failing, cooldown, InvalidNonce after a transport failure, no key in errors) and
  `app/tests/rpcbusy.test.ts`.

## 29. Try-it: per-connection faucet limit, server-side reads, Finish returns the NEAR (9 Nov 2026)

- Faucet limit: one grant per account a UTC day, and up to `FAUCET_PER_IP_PER_DAY` (default 10) accounts per client IP,
  because visitors behind one office or home connection share an address. `faucet_grants` keeps one `ip` row per
  account (subject `<salted sha256>:<account>`) and counts them under a Postgres advisory lock, so a burst from one
  connection cannot pass the limit (`packages/store/tests/faucet.test.ts`, run against a local Postgres).
- Top-up: 2.35 NEAR, not 2.5. The coordinator asked for 2 NEAR plus about 0.25; a local testnet run measured 2.25 as
  too little: `create_agreement` from the throwaway account answered "Not enough balance ... (balance:
  2250000000000000000000000, cost: 2300922087430530000000000)", because the network checks the 2 NEAR deposit plus the
  transaction's prepaid gas bound before it runs (most of that gas is refunded). Step 2 counts 2.32 NEAR as enough.
- Reads: the browser reads the chain only through the app (`POST /app/api/chain`, reads only, cached 2.5 s for state
  and 5 s for balances, always HTTP 200; `GET /app/api/chain/balances`). Watching try-it and a room page for 60 s
  each on the local app: 0 console errors, 0 failed requests, 0 requests to RPC hosts. The live site's try-it made 50
  direct public RPC requests in the same 60 s. The throwaway key still submits its own transactions (and reads its
  nonce) over the public endpoints.
- Finish (`app/src/lib/finish.ts`): with the throwaway key, a sealed or attested room is cancelled; an executing room
  is closed early with `mutual_close` (the buyer through the relayer, then Accord's demo vendor through
  `POST /app/api/demo-counterparty/close`, which acts only after the buyer's own request is on chain); then
  `withdraw_near`, then the account deletes itself with `faucet.accord-v2.testnet` as beneficiary. Reset runs the same.
  Local testnet runs (9 Nov 2026):
  - a24.accord-v2.testnet (still `Sealed`): cancel, withdraw, delete in 12 s; the faucet gained 2.460 NEAR (delete tx
    `V2vExdob…`).
  - a28.accord-v2.testnet, the full path through pay, `ERR_PAYEE_MISMATCH` and revoke (`app/e2e/try-without-wallet.mjs`):
    Finish took about 90 s; a28 is `Settled` with `mutual_close` from both sides and 6.00 tUSDC of escrow refunded; the
    throwaway account no longer exists; the faucet went from 47.568 to 49.764 NEAR (+2.196 of the 2.35 sent; the rest is
    gas and a28's 0.129 NEAR storage stake). Delete tx `f9WSjEpS…`.
  A visitor who closes the tab before Finish still costs the faucet up to 2.35 NEAR.

## 30. The README, the runs page and the site's hero (9 Nov 2026)

An independent review found the README too long for its "judge it in 5 minutes" promise, the site's hero showing a
market-making room that has not run on testnet, and three "try" pages with near-identical names. Decisions:

- **README.** The top is now: what it is, the 5-minute path, what is and is not verifiable today (the `model` check is
  partial and `release` is not checked without `outlayer-verify`; S1 and the reviewed job builds are not deployed), the
  a6 proof with its 12 transactions, `make verify` with its literal output, and use from an agent. The repeated run
  tables (a8, a15, a21, release 4 on a10 to a13, a1.accord-usdc) moved to `docs/runs.md`, every transaction still
  linked; this file keeps the notes behind them (sections 21 and 24 to 28). GOAL.md's README requirements are met with
  short sections: Track by track, Related NEAR tools, Business model (hypothesis), What we keep. `realworld`, `social`
  and `swarms` are stated as not claimed.
- **Hero.** The home hero preview now shows agreement a6 with its real numbers (35.50 tUSDC in 3 items, 16.50 paid to
  halcyon-mm.testnet, the redirect refused with `ERR_PAYEE_MISMATCH`, the agent revoked) and links to `/record`; its
  room list names agreements that exist on testnet with the states `get_agreement` returned on 9 Nov 2026 (a6, a10,
  a1.accord-usdc Executing; a32 Settled), and one market-making room labelled `Local node`. The caption says market
  making has run on a local node, not yet on testnet. Chosen over a "local node" label on the old mock because the
  testnet record is the stronger true statement.
- **Verify.** The site's `/verify` headlines the full seven-check verdict (`5 ok · 1 partial · 1 not checked`), the
  same as `make verify` and the app; the five browser reads are labelled "quick reads". llms.txt, facts.json and the
  docs say the same. Amounts on `accord-v2.testnet` agreements are tUSDC everywhere (a10 was written `33.00 USDC`).
- **Names.** One name per destination on the site and in the README: "Run your own deal" (`/app/try-it`), "Live attack
  room" (`/app/try`), "Watch the replay" (`/app/replay`); the site's `/try` page is "Refused attacks" and links to all
  three. App routes are unchanged.
- **Try-it walkthrough.** Step 5b no longer says to click "Let the agent pay the due item": the demo agent pays an
  accepted item on its own (`server/demoagent.ts`, `e2e/try-without-wallet.mjs` "auto-pay: never clicked"); 5d is
  "Hold to revoke".

## 31. OutLayer request ids are not task ids; the record CSV (9 Nov 2026)

- A release's `pubkey_task_id` (for example `13987`) is OutLayer's **request id**, not its task id. `GET
  https://testnet-api.outlayer.ai/attestations/13987` returns an unrelated run (that path takes a task id). The right
  lookup is `GET https://testnet-api.outlayer.ai/attestations/by-request/<request id>`: `13987` → task `28880`
  (sealed-table), `13988` → `28881` (payee), `13989` → `28882` (observer). The same holds for the attestation the site and
  README linked as `/attestations/13596`: it is now `/attestations/by-request/13596` (task `28391`). The CLI's `release`
  check looks the pubkey runs up by request id (commit `3cb3132`); without `outlayer-verify` it stays `not checked`, and
  with it `make verify` checks each job key's pubkey run.
- The record CSV is served at `/app/record.csv`, and the site answers `/record.csv` (the path GOAL.md names) with
  a 308 to it (`apps/web/scripts/serve.mjs`, tested in `test-serve.mjs`). `transaction_url` is the payment's own
  transaction; the always-empty `inference_cost_usd` column is dropped, because inference cost is not on chain. The verify
  API and the CSV answer any origin (CORS `*`, GET only), and a hosted keyless MCP server with the 7 read tools is at
  `/app/mcp` (60 requests a minute per IP). The app was redeployed with them on 9 Nov 2026; the live `/app/mcp` answers
  `initialize`, `tools/list` and tool calls from any origin.

## 32. outlayer-verify proves the three job runs for release 3 and 4 agreements (10 Nov 2026)

- `outlayer-verify` `0.1.0`, installed with `cargo install --locked --git https://github.com/out-layer/outlayer-verify --rev
  90c27d9d outlayer-verify` (commit `90c27d9d4fc843194ddc6f8ebaafa4eb320c3bb6`), proves each job key's pubkey run:
  `outlayer-verify job <task id> --network testnet --api https://testnet-api.outlayer.ai --short` exits `0`
  (`PROVEN task <id> (execute) …`), which means the TDX quote, the approved measurement and the binding all pass
  (https://github.com/out-layer/outlayer-verify; exit `1` a layer failed, `2` unproven). The task id comes from the
  by-request lookup (section 31), never from `pubkey_task_id` itself.
- Release 4 (`accord-v2.testnet` and `accord-usdc.testnet` share the job builds, different runs): Sealed Table run `13987`
  = task `28880` (wasm `7c832ce9…`), Payee `13988` = `28881` (`24071443…`), observer `13989` = `28882` (`8240179a…`) on
  `accord-v2.testnet`; `13990` = `28883`, `13991` = `28884`, `13993` = `28886` on `accord-usdc.testnet`. Release 3: `13682` =
  `28492`, `13672` = `28478`, `13683` = `28493` on `accord-v2.testnet`; `13909` = `28801`, `13910` = `28802`, `13911` = `28803`
  on `accord-usdc.testnet`. All twelve proven, each in about 2 to 3 s.
- `make verify` now prints `release … outlayer-verify proven … · ok` and `verify: 6 checks ok · 1 partial` on
  `a6`, `a10`, `a21`, `a48` (`accord-v2.testnet`) and `a1`, `a2` (`accord-usdc.testnet`), re-run 10 Nov 2026. The lines in
  sections 21, 24, 26, 27, 28 and 30 that read `release` not checked (`5 ok · 1 partial · 1 not checked`) are what those runs
  printed without the tool.
- What it does not change: `model` stays partial (the hardware quote is not checked by `make verify`); S1 is not set; release 4
  runs release 3's job builds (the same three wasm hashes), so proving the runs proves those builds made the keys, not that
  the reviewed builds are deployed; market making is shown from local-node runs only.
- The app's `/api/verify` and the hosted `/app/mcp` run the same step (`@accord/sdk/node`: `outlayerVerifyProof`, wrapped
  in `cachedReleaseProof`): one run per job, a 30 s timeout (`OUTLAYER_VERIFY_TIMEOUT_MS`), settled verdicts kept 6 h in
  memory and a `not checked` one retried after 60 s, concurrent calls sharing one run. Jobs come from the agreement's
  factory release, so the set of runs it can be asked to prove is small and fixed. The root `Dockerfile` builds the binary
  at `90c27d9d` in a `rust:1.91-alpine` stage (static musl, ureq with rustls and webpki roots) and copies it into the app
  image only. Locally (`next start`, binary on PATH), `/app/api/verify/a10.accord-v2.testnet` answered `release ok` in
  9.4 s on the first call and 3.7 s once cached; without the binary the same call answered `release not checked` in 3.4 to
  5.6 s. Until the app is redeployed from this image, the live endpoint says `not checked`.

## 33. Release 5: the reviewed job builds, with the earlier builds kept readable (10 Nov 2026)

- **Builds** (`cargo build --release --target wasm32-wasip2 -p accord-sealed-table -p accord-payee -p accord-observer` on
  `main`, the code of findings 4, 5 and 10 in section 25): Sealed Table
  `64a354a0cf02f1e23424a3173291abb5e951667f3f49b01524cfa9180d130fac` (1,495,687 bytes), Payee
  `b5a0c4731721657ab202d31c0b564f404baaa12137920edf35a62ea3308cb26b`, observer
  `0dcc55e828b3b828edf938734a4f797c2b40c4480cd438a4396dbea146733d72`. Uploaded to FastFS with `outlayer upload` (Sealed Table
  chunks `BP5awXwK…`, `8TufRjFr…`; Payee `GkDve348…`; observer `FYdhiYcn…`) and added as new versions with `outlayer deploy
  --no-activate` (`add_version` `5dsGAcUd…`, `ApE77GFb…`, `FyFvduW9…`), then activated once release 5 was current
  (`set_active_version` `8xXxCivi…`, `B2LkJn7V…`, `8YWLhutt…`). The first Sealed Table and Payee uploads never landed
  (the CLI printed a hash for a transaction the chain does not know; another process signed with `accord-v1.testnet`'s key
  at the same time), so their first pubkey runs (requests `15080`, `15081`) failed with `wasm_url could not be fetched`
  and were requested again after the re-upload. Check a FastFS URL answers `200` before requesting a run.
- **Keeping live rooms working.** An agreement names its job builds by hash (`version_key` in `request_execution`), so
  every release 3 and 4 room keeps asking for `7c832ce9…`, `24071443…`, `8240179a…`. Moving each secret row's lock to the
  new build (`outlayer secrets access --build`, the old step 3) would have cut those builds off from their seeds and broken
  every existing room, including the try-it rooms, `/app/try` (`a14`) and the payee proofs of release 4 rooms. OutLayer's
  access condition is a tree (`Logic { operator: And | Or }` over leaves including `WasmHash`, https://app.outlayer.ai/docs/secrets,
  source `github.com/out-layer/outlayer` `contract/src/types.rs`; the keystore judges an `Or` over two `WasmHash` leaves
  against the measured build). CLI 0.2.2 sets only one build, so `update_access` was called on `outlayer.testnet` directly,
  for each row, with `{"Logic":{"operator":"Or","conditions":[{"WasmHash":{"hash":<old>}},{"WasmHash":{"hash":<new>}}]}}`
  (Sealed Table `7qJzyrN23mwpU29rWXwEt4dtHums36SsHTW2Crih6839`, Payee `DzbKsTCtHaV2pNE8y8sDCW1H2tc7tE5gKk7pd43gkESB`,
  observer `59xrHMiLvZqhtY28fRhg71VjC3Jq7jbKWLz2yb6foskg`; two earlier attempts, `DS7KtmbX…` and `iuRw22dg…`, failed on too
  small a deposit and changed nothing). `outlayer secrets list` now shows each row as `(build:<old> or build:<new>)`. The
  ciphertext is not touched, so the seeds, the three signing keys and the mandate key are unchanged.
- **Release 5** (global, agreement code `ECgsrZwy…` unchanged, so release 4's global contract is reused):
  - accord-v2.testnet: pubkey runs `15085` = task `30189` (Sealed Table, https://testnet.nearblocks.io/txns/3TDs7RHcSN8hSHSuK4WMDNSSES46NtFoZBVuC6yQ4fQM),
    `15086` = `30191` (Payee, https://testnet.nearblocks.io/txns/DWS5jZXQhELTf6W7vLehuhTut1NYbbdrNdf79Lw1JK7), `15082` = `30185`
    (observer, https://testnet.nearblocks.io/txns/68e35UrWvmr5JTyHrSwQqhdaF8fKcPeVZBPiKdzfbfb7); publish
    https://testnet.nearblocks.io/txns/dFiMTwcYygycxQFSMpYqFfRaMaBU9uMrKtzpJQzRsmG, current
    https://testnet.nearblocks.io/txns/8jSfWk6a3qzZRMrzqJj731njUGtRCYmWPLqLAqc3RAgF.
  - accord-usdc.testnet: `15300` = `31810` (https://testnet.nearblocks.io/txns/61XJJuxMHmAS8hbusSVTFZgcLcY1ED1aU46YDiWiCjPg),
    `15301` = `31811` (https://testnet.nearblocks.io/txns/eZxtXBfT9QHFxZXKLV2nQXRWGmPvP1vjDzHJuyRthve), `15302` = `31812`
    (https://testnet.nearblocks.io/txns/EaRgqtuiQZAjcAzEWQPDjkzq448vdnJdE38Rt3JdTjUY); publish
    https://testnet.nearblocks.io/txns/9QVU3RU1u2TcAgmS6TV8hxxjF6hCF5UB1wtF817kGcwC, current
    https://testnet.nearblocks.io/txns/3wK4mZVZtF8x6XNwSGbzDSyLR2nPwDqkjktsmpaoKAwi.
  - The keys equal release 4's (Sealed Table `GgC8gEhK…`, Payee `FAbZHA2M…`, observer `CXZzXC5m…`); `outlayer-verify` proves
    all six tasks (`PROVEN`, exit `0`).
- **Proofs on release 5:** `make negotiate` → `a52.accord-v2.testnet`, `wasm 64a354a0…`, QUOTE → COUNTER → ACCEPT,
  `33.00 USDC` (tUSDC) in 3 items, attestation ok, `ERR_SEALED` both ways, `Attested · 52 s`; `make negotiate-usdc` →
  `a3.accord-usdc.testnet`, the same build, `14.00 USDC` in 3 items, `Attested · 53 s`. `make verify` on both: `code hash
  ECgsrZwy… = release 5`, `release … outlayer-verify proven … · ok`, `5 checks ok · 1 partial · 1 not checked` (only
  negotiated, so `payee` has no recipient yet). The live `/app/try-it` "Try without a wallet" run on the public URL
  (`app/e2e/try-without-wallet.mjs`) reached Finish on `a53.accord-v2.testnet` (release 5): paid with no click, redirect
  refused `ERR_PAYEE_MISMATCH`, revoked, closed, faucet `+2.192 NEAR`, `+68.00 tUSDC`, no request over 20 s; `make verify
  DEAL=a53.accord-v2.testnet` and the live `/app/api/verify/a53.accord-v2.testnet` both say `release ok`, and `make verify`
  prints `6 checks ok · 1 partial` (recipient proven by the release 5 Payee build on `useaccord.tech`).
- **Old builds still work:** the same e2e run before release 5 was published, after the access change, reached Finish on
  `a51.accord-v2.testnet` (release 4, builds `7c832ce9…` and `24071443…`), which verifies `6 checks ok · 1 partial`;
  `a10` still prints `code hash ECgsrZwy… = release 4` and `6 checks ok · 1 partial`. The app reads the current release
  from the factory, so no app or Railway variable changed.
- **What this does not change:** S1 is still not set; the rows still admit any caller (only the build is restricted).
  And while each row admits the old builds, anyone can request a run of `7c832ce9…` (or `24071443…`, `8240179a…`) by hash
  and have it run with the seed, and those builds do not have finding 5's factory-only check or finding 4's off-curve
  refusal. Every run a release 5 agreement requests has both, but an outside caller can still go around the factory-only
  check by naming an old build, until the old-build leaf is removed; removing it stops job runs for release 3 and 4 rooms
  (`docs/build/BLOCKED.md`). Claim 1's testnet sentence stays.

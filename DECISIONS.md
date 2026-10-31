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
| `outlayer-verify` | git | `cargo install --git https://github.com/out-layer/outlayer-verify outlayer-verify`; always pass `--api https://testnet-api.outlayer.ai` (its built-in addresses return `410`) |
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
| Atlas venue: Rhea DCL USDC/wNEAR on mainnet, read-only, measured with `quote` at one block | A real market every judge knows; every observation is recomputable from an archival node | Testnet pools (no real liquidity); an exchange API (not reproducible) |
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
- 31 Oct, re-check of the revised kit by the same reviewer (14 of 20 findings fixed, 6 partly; 9 new: 3 major, 6 minor), all applied: deliveries end with the term and a new one needs a dispute, and `close` sets aside what it cannot pay (`Reserved`, claimable after `Settled`; a recipient can be proposed while one is reserved; `withdraw_near` keeps `0.05 NEAR` meanwhile), so neither party can stall the other's money; the payment lock carries a `payment_id`, and a stale lock the balance cannot decide becomes `AssumedPaid`, settled by an exception; `NEARAI_API_KEY` gets the S1 condition (OutLayer refuses a run when any secret's condition fails and judges the signer unless set to direct calls); `pubkey` runs move to a keyless `releases.<factory>` account, and claim 1's limit adds that the deployer could request extra runs while the factory keeps its key; claim 6 and the Atlas FAQ state that the deployer owns the observer's seed; the observer samples final blocks only and conflicting observations are logged (`observation_conflict`) and send the period to `Review`; uptime is defined once (two-sided slots over observed slots, reported, not the pay rule) and the site copy says "two-sided quoting"; the `/try` room gets its own principals, a pair on the vendor domain, `0.01 USDC` items one due at a time and a daily room cap; 7.3 points the loop, the last-day prompt and `build.mjs` at `docs/build/`, keeps `CHANGELOG.md` at the root, and the evaluator note says never to submit; `sealedCheck` moves to 2.1; DEMO and LOOP_PROMPT lines corrected; the realworld rows add the invoice view and state that 1Click is met only as a dry quote; `due_in_secs` renamed `due_offset_secs` everywhere. Files: ARCHITECTURE, INTERFACES, GOAL, PROGRESS, DECISIONS, SUBMISSION, DEMO, LOOP_PROMPT, SETUP_FROM_YOU, WIN_PLAN, KIT, CLAUDE, `starter/` (fixtures, prompts, schema, `.env.example`, evaluator notes) and `website/` (FINAL_COPY, LANDING_PAGE_SPEC).

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

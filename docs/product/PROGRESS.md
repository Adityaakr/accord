# PROGRESS.md (v4, Accord)

One item per loop iteration. Tick an item only when its acceptance line passes and `make test` is green. Mark `[blocked]` with a pointer to `BLOCKED.md` when it needs something from Adi. The three proofs are 1.12, 1.13 (mock) and 2.4, 3.5 (live); nothing in Phase 4 or later starts before all four are ticked.

## Phase 0: day-one checks (answers with source URLs in DECISIONS.md)

- [ ] 0.1 OutLayer NEAR job flow: `request_execution` parameters, callback shape, how the contract reads the approved measurement, outbound HTTPS from a WASI job, stable per-job decryption key and how to publish it, secrets, WASM target, time limit, deposit. If outbound HTTPS is unavailable, write the negotiation fallback (NEAR AI Cloud alone) into GOAL.md before anything else.
- [ ] 0.2 NEAR AI Cloud: key works; TEE-served open-weight model chosen; per-response signature retrieved and verified offline; latency per turn measured.
- [ ] 0.3 Base rail: address derived for `agreement/{id}/base`; one EIP-1559 USDC transfer built, signed through `v1.signer-prod.testnet`, broadcast on Base Sepolia; signing latency; same-nonce replacement fee rule confirmed; USDC contract address and faucet recorded. If it cannot be made to work in a day, switch to `rail-near` and record why.
- [ ] 0.4 Function-call key scoped to `act`; `env::signer_account_pk` check; `add_key` and `delete_key` from a promise, tested in near-workspaces.
- [ ] 0.5 near-connect on testnet with Meteor.
- [ ] 0.6 IronClaw tool manifest format for the agent.
- [ ] 0.7 Reproducible WASM builds for both jobs.
- [ ] 0.8 Repo scaffold: workspace, `rust-toolchain.toml`, `.nvmrc`, `.env.example`, `.gitignore` (`.env*`, `data/`), LICENSE (MIT), CI skeleton, `hackathon` branch. Acceptance: `cargo build` and `pnpm install` on a fresh clone.
- [ ] 0.9 Observer venue: a public depth endpoint for a liquid market, reachable from an OutLayer job, rate limits that allow `20` requests in `100 s`; endpoint, symbol and response shape in DECISIONS.md; three fixtures captured (pass, fail, venue error).

## Phase 1: schema and contract (proofs 2 and 3, mock half)

- [ ] 1.1 `crates/schema`: AgreementType, both mandate schemas (procurement, market-making), Terms (with `deal_type`, `document_hash`, `release` including `OnAttestation`), ObserverSpec, Observation, Payee, PendingPayee, Payment and PaymentState, Action (`Pay` carries `amount`, `payee_version`, `destination`, `fee`), FeeParams, FeePolicy, NegotiationOutput (`Terms` or `NoDeal`, `limits_checked`), VerificationOutput, ObservationOutput; borsh and serde round trips.
- [ ] 1.2 Contract: state, `create_agreement` (adds the scoped key, refuses authority == seller, derives and stores the Base address), `commit_mandate`, `negotiated_pairs`, views including `get_inflight` and `get_refusals`.
- [ ] 1.3 Contract: `trigger_negotiation` (`ERR_PAIR_ALREADY_RUN`; OutLayer request behind a trait), `on_negotiation_output` (measurement, binding, commitments, `limits_checked`; `NoDeal` path), `approve_terms`; test-only `submit_mock_negotiation` behind the `mock` feature.
- [ ] 1.4 Contract: `propose_payee` (verification request behind a trait), `on_payee_verification` (bound to agreement, version, domain, destination), `approve_payee`, `accept_payee`, versions, `24 h` timelock for versions after the first, `pause_payee_change`, `cancel_payee_change`, `finalize_payee_change`.
- [ ] 1.5 Contract: `act` with every refusal in the stated order, each recorded in `refusals` and emitted; `Pay` reserves the nonce, records `Authorized`, and calls the rail behind a trait; `set_base_nonce`; `accept_milestone`.
- [ ] 1.6 Contract: `on_signature` (`Signed` with tx hash, or `Failed`), `get_signed_tx`, `report_broadcast` / `report_confirmed` / `report_failed` (reporter role; status only), one in-flight payment per milestone.
- [ ] 1.7 Contract: `revoke` (deletes the agent key by promise, sets the flags, state Suspended), canary trigger inside `act`, `replace_agent_key`.
- [ ] 1.8 Contract: `burn_nonce` (Signed or Broadcast only; replacement transaction at the same nonce with the fee bump; `Burned`).
- [ ] 1.9 Contract: exceptions (`RequestException { milestone, new_amount }`, `resolve_exception`, the approved amount applies to that milestone once).
- [ ] 1.9a Contract: `request_observation` (OutLayer request behind the same trait), `on_observation` (measurement, binding, slot bookkeeping, `k` of `n`, `Withheld`), `ERR_KPI_NOT_MET` inside `act`; test-only `submit_mock_observation` behind the `mock` feature.
- [ ] 1.10 Contract: `terminate`, `settle` (refused while anything is in flight; final refund transfer), all events.
- [ ] 1.11 `make setup`, `make mandate-buyer`, `make mandate-seller`, `make approve-terms` in mock mode print the lines in GOAL.md.
- [ ] 1.12 Proof 2, mock half: `make attack` in mock mode prints `ERR_PAYEE_MISMATCH`, `ERR_AMOUNT_MISMATCH`, the canary touch, the key deletion, `new authorisations: none`.
- [ ] 1.13 Proof 3, mock half: `make inflight` in mock mode prints the held transfer, the burn, and the failed stale broadcast; `make rotate-key` prints `agent key replaced · state: Executing`.
- [ ] 1.14 `make glassbook` in mock mode: market-making mandates, terms with KPIs and venue, three mock slots (`2` pass, `1` fail), `period 1` payable, three failing slots, `period 2: Withheld`, exception requested.

## Phase 2: negotiation (proof 1)

- [ ] 2.1 `jobs/negotiate` against recorded NEAR AI responses: decrypt both blobs with the job key only, two-agent rounds, deterministic limit check for both deal types (accepts a valid proposal, rejects one outside either mandate, emits `NoDeal` on walk-away), output with both commitment hashes and `limits_checked`.
- [ ] 2.2 Live NEAR AI Cloud turns; per-response signature hashes collected; `make verify-negotiation` verifies them offline. [needs Adi: NEAR AI Cloud key]
- [ ] 2.3 Job deployed on OutLayer; contract calls `request_execution` for real; callback stores terms; `outlayer-verify job` exits `0`. [needs Adi: OutLayer account, secrets]
- [ ] 2.4 `make negotiate` prints `limits checked: within both mandates` and the two "readable by the other side: NO" lines with the checks the README explains.

## Phase 3: Base rail and payee binding (proof 3, live half)

- [ ] 3.1 `crates/rail-base`: EIP-1559 ERC-20 transfer encoding, signing hash, signature assembly, address derivation, replacement-fee rule; tests against fixtures. (Or `crates/rail-near` if 0.3 chose the fallback; then 3.2 and 3.5 adapt as GOAL.md says.)
- [ ] 3.2 Chain Signatures live: `make fund` prints the funded address; `make pay` prints `Authorized · nonce 0`, `Signed`, `Broadcast`, `Confirmed · block <n>` with the Base Sepolia explorer link. [needs Adi: Base Sepolia USDC and ETH on the derived address]
- [ ] 3.3 `reporter`: polls `get_inflight`, broadcasts, reports; `REPORTER_HOLD=1` holds one transfer back; the app re-checks every reported status against a Base RPC.
- [ ] 3.4 `jobs/verify-payee`: domain proof fetch and signature check, document structural check, output bound to agreement, version, domain and destination. Demo vendor domain and `.well-known/accord.json` set up. `make bind-payee` prints the binding, the authority approval and the buyer acceptance. [needs Adi: a domain you control]
- [ ] 3.5 `make inflight` live: a signed transfer held back, listed with its nonce, burned by the buyer, the stale broadcast failing on Base Sepolia with the nonce error quoted.
- [ ] 3.6 `jobs/observe` against the three fixtures, then deployed on OutLayer; `make observe SLOT=1` returns one live, attested slot from the venue chosen in 0.9 with `outlayer-verify` exiting `0`.
- [ ] 3.7 Gate, 6 Nov: if 3.6 is ticked, the demo is Glassbook (`DEMO-GLASSBOOK.md`) and `make glassbook` runs live in 4.6; if not, the demo is procurement (`DEMO.md`) and `make glassbook` stays in mock mode, labelled as recorded in the README. Write the decision and the reason in DECISIONS.md. Do not move this date.

## Phase 4: agent, attack live, exceptions, payee change

- [ ] 4.1 `agent`: inbox fixtures, planner that fills `destination` and `amount` from its vendor record, `act` calls with the scoped key; IronClaw tool manifest.
- [ ] 4.2 Canaries planted in the agent's tools and memory; `make attack` live: both refusals, canary, key deleted on NEAR, `new authorisations: none`, followed by the in-flight panel.
- [ ] 4.3 `make exception`: changed amount requested, human approval in the app, milestone 2 confirmed.
- [ ] 4.4 `make payee-change`: seller alone pending, verification job runs, authority approval starts the timelock, finalize after; buyer pause and cancel tested.
- [ ] 4.5 `make rotate-key` live after `make attack`; agreement continues to `settle`.
- [ ] 4.6 `make glassbook` live (only if 3.7 chose Glassbook): six live slots across two periods, `period 1: Confirmed` on Base Sepolia, `period 2: Withheld`, the market maker's exception waiting for the buyer.

## Phase 5: app and one-sided mode

- [ ] 5.1 Mandate editor for both deal types (seal client-side, commit), agreement page with the state machine, payments with Base links, in-flight panel with burn buttons, exceptions, refusals, revocation, key replacement; for market-making, the slots panel (each slot's spread, depth, uptime, pass or fail, job id) and the `k` of `n` meter per period.
- [ ] 5.2 Negotiation view: round headers, `limits checked`, attested terms, the two "readable: NO" checks, approve.
- [ ] 5.3 Payee screens for vendor, authority and buyer; change flow with pause and cancel.
- [ ] 5.4 `/attack` console and `/record/{account}`.
- [ ] 5.4a `/try` open inbox: public form into the agent's inbox store, rate limit `10` an hour per visitor, live refusal log and the three hero counters; `make inbox` prints the lines in GOAL.md. The form holds no key and cannot call the contract.
- [ ] 5.5 `make one-sided`: human vendor through the UI; the human still cannot read the buyer's mandate.
- [ ] 5.6 `make deploy-app`. [needs Adi: Vercel token]

## Phase 6: README, demo, release candidate

- [ ] 6.1 README in the required structure; the claims-and-limits table verbatim; the privacy boundary; the custody-and-trust table; the prior art table with AP2, OutLayer custody, Dealproof, Dhruva, Pactum, NDAI, card AP agents; every "see" line verified.
- [ ] 6.2 The demo script chosen in 3.7, rehearsed live twice; the other script kept in the repo and named in the README.
- [ ] 6.3 CI green on a fresh clone; `.env.example` complete; secret scan of history clean; grep of the repository for every withdrawn claim in GOAL.md returns nothing.
- [ ] 6.4 Tag `hackathon-submission` candidate; `CHANGELOG.md` complete.

## Phase 7: publish and submit (each step needs Adi)

- [ ] 7.1 Video recorded and X post published; link in `DECISIONS.md`.
- [ ] 7.2 Repository public on `hackathon`.
- [ ] 7.3 Submission payload printed, confirmed, sent; `201` recorded.

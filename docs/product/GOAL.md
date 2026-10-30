# GOAL.md: Accord, end to end (v4, 29 Oct 2026)

v4 replaces v3 after an outside review of the kit. Six claims were withdrawn and the design was narrowed to one settlement rail; the section "Claims and their limits" is now the source of truth for every sentence in the README, the demo and the website. Nothing in this file may be contradicted by a weaker or stronger claim elsewhere.

## The goal

Ship Accord as a working, reproducible dapp for NEAR HACKATHON and submit it by 14 Nov 2026 23:59 UTC in the tracks `business` (lead), `agents`, `security` and `privacy`.

One line: Accord is the private deal room and control plane for agent-to-agent commerce: agreements negotiated in private and enforced in public. Headline everywhere: "The private deal room and control plane for agent-to-agent commerce." The final site copy is `website/FINAL_COPY.md`; the research page is `website/RESEARCH_PAGE.md`. Glassbook is described as "liquidity agreements paid on measured conditions", never as proving that a market maker earned a payment, until account-attributed verification exists. Short form for the footer and the video's last frame: "Negotiated in private. Enforced in public." In the interface an agreement is shown as a deal room; the contract, the docs and this file say agreement.

The room has four named parts, and the names are used identically on the site, in the app, in the README and in the repository tree: Sealed Table (`jobs/negotiate`: the negotiation enclave), Agreement controls (`contracts/agreement`: the approved terms as the agent's only authority), Payee (`jobs/verify-payee`: confirmation of payee for agents), Glassbook (`jobs/observe` plus the `market-making` deal type: the first product). Procurement is the reference deal type and is described as such, not as a part. Glassbook's headline: "Glassbook: liquidity agreements paid on measured conditions." Retired as well: "Did your market maker earn this payment?" (venue-level data cannot show who earned it), "negotiated blind" (reads as negotiating without information). Never describe Accord as "executable agreements" or "smart legal contracts": that is the Accord Project's category (Linux Foundation, since 2017), and the name already sits close to it.

Positioning (final, 29 Oct): every deal tool today is one side's agent on that side's server; a seller's deal desk runs on the seller's, a procurement bot on the buyer's. When both companies have an agent, the side with more information wins, so every company arms its agent and every vendor hides its floor. Accord is the room neither side owns, and the money that leaves it moves only on evidence the contract can check: the attested terms, a payee that proved its domain, and for Glassbook an order book that met the agreed spread and depth. The README title and the site hero carry the two-property headline; the problem section and the submission open with the question "Whose server do your agents meet on?"; the video opens on the question if the demo is procurement and on the market-maker casualties if the demo is Glassbook. Never use "agreement layer", "hand your agent a budget", "the deal is the account", "neutral ground" as a headline, or "the slow middle".

Accord is one agreement object on NEAR with four states. Two businesses hand their agents sealed mandates; the agents negotiate inside an attested enclave and only the terms, the commitment hashes and a transcript hash come out; code inside the enclave checks the terms against both mandates' hard limits before they leave; both humans approve; from then on the approved terms are the only authority the buyer's agent has. Every payment must name the approved milestone, the exact approved amount, the bound payee version and its destination, or the contract refuses it. The payee is bound from a domain the vendor controls, approved by the vendor's own settlement authority and accepted by the buyer; a change needs a fresh domain proof, the authority and a `24 h` timelock. `revoke` deletes the agent's key and ends every new authorisation in one transaction, and the transfers already signed are listed and cancellable by burning their nonce. Humans set the mandate and approve the exceptions; the agent runs the agreement inside them.

The one scenario the whole build serves: a company's procurement agent renews a vendor contract. Seven beats, seven make targets, three minutes.

**The three required proofs**, before anything else is polished:

1. `make negotiate` shows that neither party can read the other's mandate while both get attested terms that passed the limit check.
2. `make attack` shows a "new bank details" email failing: destination refused, altered amount refused, canary tripped, agent key deleted, no further signatures.
3. `make inflight` shows what happens to a transfer that was signed before `revoke`: it is listed with its nonce, the buyer burns the nonce, the stale broadcast fails.

Done means every line in "Definition of done" passes on a fresh clone, by a reader who has never spoken to us. The jury includes Claude Code and Codex running a reproducibility check and feature verification (HACKATHON.md Q-017); write for them first. They will read this file and the README side by side; a claim in one that the other cannot back is a failure.

## Claims and their limits

Every public statement about Accord is one of these five, stated with its limit. The README has this table verbatim.

| We claim | Because | Limit, stated next to it |
| --- | --- | --- |
| The raw mandates never leave the enclave | Each mandate is encrypted in the browser to the negotiation job's key; the chain holds a hash; the job runs once per pair of commitments inside an OutLayer TDX enclave whose measurement is approved on the register contract | Under the hardware's trust assumptions. The final terms reveal that each side accepted them, as any signed deal does. The operator of the enclave is trusted not to break TDX, nothing more |
| The approved terms are the agent's only authority | The agent's key can call `act` and nothing else; `act` refuses any payment whose milestone, amount, payee version or destination differs from the approved terms | The agent's judgement is not protected, only bounded. Attestation proves which code produced the terms, not that the deal was good; the humans decide that |
| Payments go only to the bound payee | The payee is a destination tied to a domain the vendor controls (proof fetched inside an enclave), approved by the vendor's settlement authority, accepted by the buyer, versioned; a change needs a fresh proof, the authority and `24 h` | "Bound" is not "verified as a real business": it proves control and authorisation, not corporate existence. A legal KYB is a v2 integration |
| `revoke` ends every new authorisation at once | It deletes the agent's function-call key and sets the revoked flag in one transaction; the contract requests no further signatures for the agreement | Revocation is not a recall. A transfer signed before `revoke` stays valid on Base until its nonce is used; the contract lists those and the buyer can burn the nonce. Whatever lands was authorised, to the bound payee, at the approved amount |
| Negotiation is private, settlement is not | Mandates and the transcript stay inside the enclave; the commercial terms document is encrypted to the two parties and only its hash is on chain | The payment schedule the contract enforces (amounts and dates) is public on NEAR, and transfers are public on Base, as with any stablecoin payment. Settlement status is reported by the relayer and checked by the app, not proven to the contract |

Withdrawn on 29 Oct and never to be written again, in any file: "keys die on NEAR and Base by the next block"; "amounts are not on the public ledger" or "confidential settlement"; "payee verified as a real business in a TEE"; "neither mandate leaks" or "randomised concessions prevent leakage"; "two-sided sealed negotiation has never shipped" (Dealproof shipped a prototype); "policy wallets answer how much, not whom" (OutLayer custody has allowlists).

## The build, decided (29 Oct)

Accord is the primitive. A deal type plugs into it with three things: a mandate schema, a terms validator that runs inside the negotiation enclave, and a milestone release rule. Two types ship:

- `procurement`, the reference type: release on schedule or on buyer acceptance. Built first because every other piece needs it, and the fallback demo.
- `market-making`, the first product, called Glassbook: release on attestation. An observer job samples the public order book of the token on the named venue inside an enclave, computes spread, depth and uptime against the terms, and the retainer pays only when `k` of `n` observation slots pass. Negotiated on neutral ground like any other agreement: the project's mandate (maximum retainer, minimum KPIs, required venues) against the market maker's (minimum retainer, venues covered, KPI floor it will commit to), neither readable by the other.

The demo is Glassbook if the gate passes: by 6 Nov, `make observe` has returned one live, attested slot from a public venue. If not, the demo is procurement and Glassbook is shown from recorded slots, labelled as recorded. Either way both types are in the README and the primitive is what gets judged. One submission, not two.

Glassbook v0 limits, stated like every other limit: it measures the venue's book, not the market maker's own orders (attribution needs the market maker's read-only key inside the enclave, v1); retainer-only engagements, no loan-plus-option structures (v1); one venue per agreement in the demo; observation slots are minutes in the demo and hours in production, set in the terms.

Build order by date (window closes 14 Nov 23:59 UTC): 30 to 31 Oct day-one checks and scaffold; 1 to 3 Nov schema, both deal types and the contract with the mock proofs; 4 to 5 Nov negotiation job live; 6 Nov Base rail live and the observer's first live slot, gate decided; 7 to 8 Nov payee job, in-flight live, agent and attack live; 9 to 10 Nov app, open inbox, one-sided mode, deploy; 11 to 12 Nov README, two demo rehearsals, CI, release candidate; 13 Nov video, X post, repository public; 14 Nov evening IST, submission.

## Why this and not the parents

Accord merges three earlier designs (a payee-binding layer, a sealed two-agent negotiation, and the agentic half of a market-making mandate) because they are three stages of one agreement, and a business cannot deploy an agent if any stage is missing: negotiation leaks, execution is unbounded, payment is misdirected. The thing that makes it one product rather than three is that the output of each stage is the input the next stage enforces: the enclave's terms become the contract's policy, the policy names the payee, the payee binding is what the kill switch protects.

Left out of v1 on purpose: a second settlement rail (NEAR Intents has no testnet and the transfer would land in the open anyway), legal KYB, a global payee registry, a marketplace, market making and venues, Base receipt verification in the contract.

## Definition of done

| Check | Passes when |
| --- | --- |
| `make setup` | Prints `contract: <id>.testnet`, the accounts (buyer, buyer-agent key, seller, seller-authority, reporter, two canaries), the agreement's Base Sepolia address with its USDC and ETH balances, and writes `.env.local` |
| `make mandate-buyer` / `make mandate-seller` | Each prints `mandate sealed to enclave key <pubkey>` and the commitment hash the contract stored; the plaintext never appears in any log |
| `make negotiate` | Prints the OutLayer job id, the attested terms, `limits checked: within both mandates`, and two lines: `buyer mandate readable by seller: NO` and `seller mandate readable by buyer: NO`, each backed by a check the README explains |
| `make verify-negotiation JOB=<id>` | `outlayer-verify job <id>` exits `0` and the NEAR AI Cloud per-response signatures behind the transcript hash verify |
| `make approve-terms` | Both parties approve; prints `state: Executing · terms v1` |
| `make fund` | Prints the agreement's Base Sepolia address and waits until it holds the schedule total in USDC and gas in ETH; prints `funded: <usdc> USDC · <eth> ETH` |
| `make bind-payee` | Prints the vendor's domain proof fetched inside the enclave, the document hash, the attestation, `authority approved`, `buyer accepted`, and `payee bound: <domain> → <address> on base-sepolia · v1` |
| `make pay` | Milestone 1: prints `payment 1: Authorized · nonce 0`, `Signed · tx <hash>`, `Broadcast`, `Confirmed · block <n>`; the explorer link shows the transfer to the bound address |
| `make exception` | The agent requests a changed amount for milestone 2; prints `exception 1: pending`, then after the buyer approves, `exception 1: approved · milestone 2 amount updated once`, then `payment 2: Confirmed` |
| `make attack` | Injects a payout-redirect email into the agent's inbox; prints, in order: `act(Pay) refused: ERR_PAYEE_MISMATCH`, `act(Pay) refused: ERR_AMOUNT_MISMATCH`, `canary touched: <address>`, `agent key deleted on NEAR (tx …)`, `new authorisations: none` |
| `make inflight` | With the reporter holding one signed transfer back, prints `signed, not broadcast: 1 · nonce <n>`, then after the buyer acts, `nonce <n> burned · tx <hash>`, then `stale broadcast failed: nonce used`; on the NEAR fallback rail prints `not applicable: transfers are atomic with authorisation` |
| `make rotate-key` | The buyer installs a new agent key after revocation; prints `agent key replaced · state: Executing` |
| `make payee-change` | A payee change proposed by the seller alone stays pending; the verification job runs; approved by the settlement authority it starts a `24 h` timelock; finalized after; prints each state |
| `make one-sided` | Same negotiation with a human on the vendor side through the UI; the human still cannot read the buyer's mandate |
| `make observe SLOT=<n>` | Market-making: runs one observation slot live; prints the job id, `spread p50: <bps> · depth min: <quote> · uptime: <bps>`, `slot <n>: PASS` or `FAIL`, and `outlayer-verify job <id>` exiting `0` |
| `make glassbook` | The market-making scenario end to end in mock mode, then live: project and market maker seal mandates, terms with KPIs and venue, payee bound, three slots (`2` pass, `1` fail), `period 1: Confirmed` on `2 of 3`, then three failing slots and `period 2: Withheld`, exception requested by the market maker, human decides |
| `make inbox` | Sends three visitor-style emails through the public form (new bank details, urgent invoice at a higher amount, a plain question); prints the agent reading each one, then `refused: ERR_PAYEE_MISMATCH`, `refused: ERR_AMOUNT_MISMATCH`, `no action`, and the hero counter incrementing with `money moved: 0` |
| `make test` | `cargo test` for schema, rail and contract (near-workspaces), job tests against fixtures, `pnpm test` for the app, all green |
| README.md | Follows "README requirements"; every "see" line matches real output; the claims-and-limits table, the privacy boundary and the prior art table present; LICENSE (MIT) present |
| Hosted demo | The app is deployed and shows the testnet agreement with its states; stays up through 25 Nov |
| Video | Three minutes following `DEMO.md`; posted by Adi on X with "built at NEAR HACKATHON" |
| Repository | Public on the `hackathon` branch by 14 Nov 23:59 UTC, tag `hackathon-submission` on the submitted commit |
| Submission | `201` from the API after Adi confirms the printed payload |

## The agreement, four states

1. **Sealed.** `create_agreement` by the buyer names the seller, the seller's settlement authority, the buyer agent's function-call key (scoped to `act` on this contract only), the fee policy for Base and the canary destinations. Each side seals its mandate (must-haves, weights, walk-away, budget ceiling or floor, schedule constraints) in the browser to the negotiation enclave's public key and commits the hash on chain with `commit_mandate`. A pair of commitments can be negotiated exactly once.
2. **Attested.** `trigger_negotiation` (anyone, after both commitments) asks OutLayer to run the negotiation job with both sealed blobs as input. Inside the job the two agents' turns are produced by NEAR AI Cloud private inference, each prompt carrying only its own mandate and the shared offer history; when the agents converge, deterministic code validates the proposed terms against both mandates' hard limits; nothing leaves but `Terms` (or `NoDeal`), the transcript hash, the root of the NEAR AI per-response signature hashes, and the two commitment hashes. The contract receives the output in its callback, checks the job's measurement and both commitments, and stores it. Both principals call `approve_terms`; the state moves to Executing.
3. **Executing.** The buyer funds the agreement's Base address (a Chain Signatures derivation of the agreement account; only the contract can obtain a signature for it, and only through `act`). The buyer's agent calls `act(Pay{..})`, `act(RequestException{..})` or `act(Report{..})` with its scoped key. For `Pay` the contract checks, in order: agent key, revocation, state, milestone due or accepted, no payment in flight for the milestone, amount equals the approved amount (or the one approved exception), caps, payee bound, payee version current, destination not a canary, destination equals the bound destination, fee within policy. Only then does it build the ERC-20 transfer, reserve the nonce and request the signature. The reporter broadcasts signed transfers and reports their status. Exceptions wait for the buyer principal.
4. **Settled.** All milestones confirmed, or the agreement terminated with nothing in flight; remaining funds are returned to the buyer's Base address by one last signed transfer. The record is public: terms hash and schedule, attestations, payments with their Base transaction hashes, refusals, exceptions, payee versions.

Cross-cutting guards: `revoke` (automatic on a canary touch, manual by the buyer) deletes the agent's key and sets the revoked flag in one transaction, moving the state to Suspended; `burn_nonce` lets the buyer cancel any signed transfer that has not landed; `replace_agent_key` lets the buyer resume with a new key; `propose_payee` / `approve_payee` / `accept_payee` / `finalize_payee_change` need a fresh verification run, the settlement authority, the buyer, and for versions after the first a `24 h` timelock.

## Architecture

```
Buyer principal (human) ──sealed mandate, approve terms, accept payee, approve exceptions, revoke, burn_nonce──▶ Agreement contract on NEAR ◀──sealed mandate, propose payee── Seller principal (human)
                                                                                            ▲                                      ▲
                                                                                            │ approve_payee                        │
                                                                                            └──────────── Seller settlement authority (second key or multisig)
                     trigger_negotiation → OutLayer request_execution ──▶ Negotiation job (TDX): decrypts both mandates inside, drives two agents
                                                                           through NEAR AI Cloud private inference, validates terms against both
                                                                           mandates' hard limits, outputs terms + commitments + transcript hash
                     propose_payee → OutLayer request_execution ──▶ Payee job (TDX): fetches the vendor's domain proof, checks the document,
                                                                           outputs an attested binding for this agreement, destination and version
                                                                                            │ callbacks (measurement approved, commitments match)
                                                                                            ▼
Buyer agent (scoped key; native or IronClaw) ──act(Pay / RequestException / Report)──▶ contract checks policy, builds the ERC-20 transfer, requests
                                                                                       the signature from v1.signer-prod.testnet for path agreement/{id}/base
                                                                                            │ on_signature → Signed; get_signed_tx view
                                                                                            ▼
                                                              Reporter (untrusted for authorisation): broadcasts on Base Sepolia, reports tx hash and status
                                                              Canaries: decoy destinations planted in the agent's memory; a touch calls revoke
Record page reads the contract, the OutLayer attestations, the stored outputs and the Base explorer. Nothing else.
```

### Custody and trust, stated per piece

| Piece | Where the money or secret is | Who can act | What cannot happen | Kill switch |
| --- | --- | --- | --- | --- |
| Agreement funds | USDC at the agreement's Base address, derived through Chain Signatures; only the contract can obtain a signature for it, only through `act` | The buyer agent within the approved terms | A transfer to anyone but the bound payee version; an amount other than the approved one; any new signature after revocation | `revoke` by the buyer principal |
| Mandates | Sealed blobs; plaintext exists only inside the negotiation enclave during the run | The enclave, during the job | The other party, the operator or the app reading them | Not applicable: the plaintext is gone when the run ends |
| Negotiation | OutLayer job + NEAR AI Cloud; one run per pair of commitments | The job | Terms outside either mandate's hard limits; terms not produced by the attested run | Both principals must approve |
| Signed transfers | Listed on the agreement with nonce and status from the moment the signature is requested | The reporter broadcasts; the buyer can burn a nonce | A signed transfer going anywhere but the bound payee, at any amount but the approved one | `burn_nonce` by the buyer |
| Payee record | On the contract, versioned, each version tied to a verification job output | Seller proposes, authority approves, buyer accepts, timelock for changes | A change by one key alone; a change without a fresh domain proof | Buyer can pause a change |

### Privacy boundary

| Stays private | Visible to the two parties | Public |
| --- | --- | --- |
| Both mandates (ceiling or floor, walk-away, weights); the negotiation transcript (only its hash leaves the enclave); the commercial terms document (encrypted to both parties; hash on chain) | The approved terms, the schedule, every payment, exception and refusal, the document plaintext | The payment schedule the contract enforces (amounts and dates), the agreement's accounts, the transfers on Base |

## Repository layout

```
accord/
  Cargo.toml                 workspace: contracts/agreement, crates/*, jobs/*
  contracts/agreement/       near-sdk contract (wasm32-unknown-unknown via cargo-near)
  crates/schema/             Mandate, Terms, Payee, Action, NegotiationOutput, VerificationOutput, PaymentState; borsh + serde
  crates/rail-base/          EIP-1559 ERC-20 transfer construction, signing hash, signature assembly, address derivation; fixtures
  crates/rail-near/          fallback rail: NEP-141 transfer from contract-held escrow (only if day-one check 0.3 fails)
  jobs/negotiate/            OutLayer WASM: decrypt mandates, run two agents through NEAR AI Cloud, validate limits, output terms
  jobs/verify-payee/         OutLayer WASM: fetch domain proof, check the document, output the binding
  jobs/observe/              OutLayer WASM (market-making): sample a public order book, compute spread, depth, uptime, output a slot
  agent/                     the buyer agent: inbox reader, planner, calls act(); runs natively or as an IronClaw tool
  reporter/                  broadcasts signed transfers to Base Sepolia, reports status; "attack mode" holds one transfer back
  app/                       Next.js: mandate editors, negotiation view, agreement page, payee binding, attack console, in-flight panel, record
  scripts/                   make targets, seeding, demo beats
  fixtures/                  recorded NEAR AI responses, recorded Base responses, the demo vendor's domain proof
  tests/                     near-workspaces integration tests
  .github/workflows/         ci.yml
  README.md DEMO.md DECISIONS.md PROGRESS.md CHANGELOG.md BLOCKED.md LICENSE HACKATHON.md .env.example
```

Pin toolchains. Both jobs build reproducibly so `make verify-*` can compare hashes.

## Specification

### Agreement contract (`contracts/agreement`)

**State**

```
Agreement {
  id: u64,
  buyer: AccountId, seller: AccountId,
  buyer_agent_key: Option<PublicKey>,               // function-call key on this contract, methods ["act"]; None after revoke
  seller_authority: AccountId,                      // must differ from seller
  state: Sealed | Attested | Executing | Suspended | Settled | Terminated,
  mandate_commitments: { buyer: Option<[u8;32]>, seller: Option<[u8;32]> },
  negotiated_pairs: Vec<[u8;32]>,                   // hash(buyer_commitment, seller_commitment) of every pair already run
  negotiation: Option<{ job_id: String, measurement: [u8;32], terms_hash: [u8;32], transcript_hash: [u8;32], ai_sig_hashes_root: [u8;32], limits_checked: bool }>,
  terms: Option<Terms>,
  approvals: { buyer: bool, seller: bool },
  payee: Option<Payee>, pending_payee: Option<PendingPayee>,
  base: { path: String, address: String, chain_id: u64, usdc: String, nonce_next: u64, fee_policy: FeePolicy, revoked_signing: bool },
  payments: Vec<Payment>,
  refusals: Vec<Refusal { at_ns: u64, action_hash: [u8;32], reason: String }>,
  exceptions: Vec<Exception { idx: u32, milestone: u32, new_amount: u128, reason_hash: [u8;32], requested_at_ns: u64, decision: Option<{ approved: bool, by: AccountId, at_ns: u64 }>, consumed: bool }>,
  canaries: Vec<String>,                            // decoy destinations
  observations: Vec<Observation>,                   // market-making only
  revoked: bool, revoked_reason: Option<String>,
  reporter: AccountId                               // may call report_*; trusted for status, never for authorisation
}

AgreementType = Procurement | MarketMaking          // set in create_agreement; selects mandate schema, validator and allowed release rules

Terms {
  version: u32,                                     // 1 in v1
  deal_type: AgreementType,
  schedule: Vec<Milestone { idx: u32, amount: u128, due_ns: u64, release: Scheduled | OnBuyerAcceptance | OnAttestation { observer: ObserverSpec, k: u32, n: u32 }, reference_hash: Option<[u8;32]> }>,
  caps: { per_payment: u128, total: u128 },
  settlement: { asset: "USDC", rail: Base | Near, chain_id: u64 },
  document_hash: [u8;32], document_uri: String,     // commercial terms, encrypted to both parties
  renewal: Option<{ term_ns: u64, notice_ns: u64 }>
}

ObserverSpec { venue: String, market: String, max_spread_bps: u32, min_depth_quote: u128 /* within 1% of mid */, min_uptime_bps: u32, samples: u32, interval_s: u32 }
Observation { milestone: u32, slot: u32, job_id: String, measurement: [u8;32], spread_bps_p50: u32, depth_quote_min: u128, uptime_bps: u32, pass: bool, at_ns: u64 }

MarketMakingMandate (project side) { max_retainer: u128, period_ns: u64, min_kpis: { max_spread_bps, min_depth_quote, min_uptime_bps }, required_venues: Vec<String>, walk_away_hash: [u8;32] }
MarketMakingMandate (market maker side) { min_retainer: u128, venues_covered: Vec<String>, kpi_floor: { max_spread_bps, min_depth_quote, min_uptime_bps }, walk_away_hash: [u8;32] }
Validator (inside the enclave): retainer within [mm.min_retainer, project.max_retainer]; terms KPIs at least as strict as project.min_kpis and no stricter than mm.kpi_floor; venues a subset of mm.venues_covered and a superset of project.required_venues; period equal on both sides.

Payee {
  version: u32, domain: String,
  destination: { rail: Base | Near, address: String },
  verification: { job_id: String, measurement: [u8;32], output_hash: [u8;32], document_hash: [u8;32], verified_at_ns: u64 },
  authority_approved_at_ns: Option<u64>, buyer_accepted_at_ns: Option<u64>
}
PendingPayee { payee: Payee, proposed_at_ns: u64, effective_at_ns: Option<u64>, paused: bool }

Payment {
  idx: u32, milestone: u32, amount: u128, payee_version: u32, destination: String, nonce: u64,
  state: Authorized | Signed { tx_hash: [u8;32] } | Broadcast { tx_hash: [u8;32] } | Confirmed { tx_hash: [u8;32], block: u64 } | Failed { reason: String } | Burned { burn_tx_hash: [u8;32] },
  requested_at_ns: u64
}

Action = Pay { milestone_idx: u32, amount: u128, payee_version: u32, destination: String, fee: FeeParams }
       | RequestException { milestone_idx: u32, new_amount: u128, reason_hash: [u8;32] }
       | Report { hash: [u8;32] }
FeeParams { max_fee_per_gas: u128, max_priority_fee_per_gas: u128 }   // gas limit fixed by the contract
FeePolicy { max_fee_per_gas: u128, max_priority_fee_per_gas: u128, gas_limit: u64 }
```

**Methods** (`buyer` = predecessor on buyer methods, `seller` on seller methods, `authority` on authority methods, the agent key on `act`, `reporter` on `report_*`)

| Method | Caller | Behaviour |
| --- | --- | --- |
| `create_agreement(seller, seller_authority, buyer_agent_key, reporter, fee_policy, canaries, buyer_refund_address) -> u64` | buyer | Adds `buyer_agent_key` as a function-call key restricted to `act`; refuses `seller_authority == seller`; derives and stores the Base address for path `agreement/{id}/base`; state Sealed |
| `commit_mandate(id, hash)` | buyer or seller | Stores the commitment of that side's sealed mandate; allowed in Sealed only |
| `trigger_negotiation(id, sealed_buyer_uri, sealed_seller_uri)` | anyone, after both commitments | Refuses `ERR_PAIR_ALREADY_RUN` if this pair of commitments has run; records the pair; calls OutLayer `request_execution` with the negotiate job source and `input_data` = `{contract_id, network_id, agreement_id, commitments, sealed_blob_hashes}`; attaches `on_negotiation_output` |
| `on_negotiation_output(id)` | self, `#[private]` | Requires the job's measurement to be approved, the output's binding to this agreement, both commitment hashes to match, `limits_checked == true`; stores `terms`, hashes and job id; state Attested. `NoDeal` leaves the state Sealed and emits `negotiation_no_deal` |
| `approve_terms(id)` | buyer, seller | Both approvals move the state to Executing and start the schedule clock |
| `set_base_nonce(id, nonce)` | buyer, once, before the first payment | Initial nonce of the derived address (0 for a fresh address) |
| `propose_payee(id, domain, destination, document_hash)` | seller | Version `n+1` pending; calls OutLayer `request_execution` with the verify-payee job and `input_data` = `{agreement_id, version, domain, destination}`; attaches `on_payee_verification` |
| `on_payee_verification(id, version)` | self, `#[private]` | Requires an approved measurement and an output bound to `{agreement_id, version, domain, destination}`; stores the verification on the pending payee |
| `approve_payee(id, version)` | authority | Requires a stored verification; for version 1 marks approved; for later versions starts the `86_400_000_000_000` ns timelock |
| `accept_payee(id, version)` | buyer | Version 1: binds immediately. Later versions: `finalize_payee_change` after the timelock binds; `pause_payee_change` / `cancel_payee_change` by the buyer, `cancel_payee_change` by the seller or the authority |
| `accept_milestone(id, idx)` | buyer | For milestones with `release: OnBuyerAcceptance` |
| `request_observation(id, milestone, slot)` | anyone (the reporter's cron in the demo), with the job deposit attached | Market-making only; refuses a slot already recorded or beyond `n`; calls OutLayer `request_execution` with the observe job and `input_data` = `{agreement_id, milestone, slot, observer_spec}`; attaches `on_observation` |
| `on_observation(id, milestone, slot)` | self, `#[private]` | Requires an approved measurement and an output bound to `{agreement_id, milestone, slot, observer_spec_hash}`; stores the observation; emits `observation_recorded`. When `n` slots are recorded with fewer than `k` passes, marks the milestone `Withheld` and emits `milestone_withheld`; the market maker's agent may `RequestException` and a human decides |
| `act(id, action)` | buyer agent key (predecessor is the contract itself; check `env::signer_account_pk == buyer_agent_key`) | `Pay`: refuse in this order: `ERR_NOT_AGENT_KEY`, `ERR_REVOKED`, `ERR_BAD_STATE`, `ERR_MILESTONE_NOT_DUE` / `ERR_NOT_ACCEPTED` / `ERR_KPI_NOT_MET` (fewer than `k` passing slots so far), `ERR_PAYMENT_IN_FLIGHT`, `ERR_ALREADY_PAID`, `ERR_AMOUNT_MISMATCH` (amount must equal the milestone amount or the one approved, unconsumed exception for it), `ERR_CAP_EXCEEDED`, `ERR_TOTAL_EXCEEDED`, `ERR_PAYEE_MISSING`, `ERR_PAYEE_VERSION`, `ERR_CANARY` (call `revoke` first, then refuse), `ERR_PAYEE_MISMATCH` (destination differs from the bound destination), `ERR_FEE_POLICY`. Every refusal is recorded in `refusals` and emitted. On pass: record `Authorized` with `nonce_next`, increment `nonce_next`, build the ERC-20 transfer, call the signer's `sign(payload, path, key_version)`, attach `on_signature(payment_idx)`. `RequestException`: record, emit. `Report`: record |
| `on_signature(id, payment_idx)` | self, `#[private]` | Stores the signature and the resulting transaction hash; state `Signed`. On failure: `Failed { reason }`; the nonce stays reserved and a burn is required before reuse |
| `get_signed_tx(id, payment_idx) -> RawTx` | view | The fully signed raw transaction for the reporter to broadcast |
| `report_broadcast(id, payment_idx, tx_hash)` / `report_confirmed(id, payment_idx, tx_hash, block)` / `report_failed(id, payment_idx, reason)` | reporter | Status only; a report cannot move money, change a destination or unblock a refusal. The app re-checks every reported status against a Base RPC |
| `resolve_exception(id, idx, approved)` | buyer | Records the decision; an approved exception changes the amount of that milestone once |
| `revoke(id, reason)` | buyer, or the contract on a canary touch | Sets `revoked`, deletes `buyer_agent_key` (promise `delete_key`), sets `base.revoked_signing`, state Suspended, emits `agent_revoked`. No further `sign` requests for the agreement except `burn_nonce` and `settle` |
| `burn_nonce(id, nonce, fee)` | buyer | For a payment in `Signed` or `Broadcast` at that nonce: builds a zero-value self-transfer at the same nonce with fees at least `10%` above the original, requests the signature, state `Burned` once the reporter confirms it; the original is marked `Burned` |
| `replace_agent_key(id, new_key)` | buyer, state Suspended | Adds the new function-call key, clears `revoked` and `revoked_signing`, state Executing, emits `agent_key_replaced` |
| `terminate(id)` / `settle(id)` | buyer and seller (two calls) / anyone when every milestone is Confirmed | Refuses `ERR_IN_FLIGHT` while any payment is Authorized, Signed or Broadcast; otherwise signs one transfer of the remaining balance to `buyer_refund_address`; state Settled or Terminated |
| views | anyone | `get_agreement`, `get_payments`, `get_inflight` (Authorized, Signed, Broadcast), `get_refusals`, `get_exceptions`, `get_record(account)` |

**Events** (NEP-297, standard `accord`, version `1.0.0`): `agreement_created`, `mandate_committed`, `negotiation_triggered`, `negotiation_no_deal`, `terms_attested`, `terms_approved`, `payee_proposed`, `payee_verified`, `payee_approved`, `payee_bound`, `payee_change_paused`, `payee_change_cancelled`, `observation_requested`, `observation_recorded`, `milestone_withheld`, `payment_authorized`, `payment_signed`, `payment_broadcast`, `payment_confirmed`, `payment_failed`, `payment_burned`, `payment_refused` (with reason), `canary_touched`, `agent_revoked`, `agent_key_replaced`, `exception_requested`, `exception_resolved`, `agreement_settled`, `agreement_terminated`.

**Errors**: `ERR_NOT_BUYER`, `ERR_NOT_SELLER`, `ERR_NOT_AUTHORITY`, `ERR_NOT_REPORTER`, `ERR_NOT_AGENT_KEY`, `ERR_AUTHORITY_EQUALS_SELLER`, `ERR_BAD_STATE`, `ERR_PAIR_ALREADY_RUN`, `ERR_COMMITMENT_MISSING`, `ERR_BAD_MEASUREMENT`, `ERR_BAD_BINDING`, `ERR_COMMITMENT_MISMATCH`, `ERR_LIMITS_UNCHECKED`, `ERR_NOT_APPROVED`, `ERR_PAYEE_MISSING`, `ERR_PAYEE_VERSION`, `ERR_PAYEE_MISMATCH`, `ERR_VERIFICATION_MISSING`, `ERR_TIMELOCK`, `ERR_CANARY`, `ERR_REVOKED`, `ERR_MILESTONE_NOT_DUE`, `ERR_NOT_ACCEPTED`, `ERR_KPI_NOT_MET`, `ERR_SLOT_RECORDED`, `ERR_PAYMENT_IN_FLIGHT`, `ERR_ALREADY_PAID`, `ERR_AMOUNT_MISMATCH`, `ERR_CAP_EXCEEDED`, `ERR_TOTAL_EXCEEDED`, `ERR_FEE_POLICY`, `ERR_NONCE_NOT_BURNABLE`, `ERR_IN_FLIGHT`.

### Negotiation job (`jobs/negotiate`, OutLayer WASM)

Input: the contract's `input_data` plus the two sealed blobs (fetched by URI, hashes checked against the input). Steps: derive the job's decryption key inside the enclave (the same key whose public half the parties sealed to; published by `make setup` from a prior attestation); decrypt both mandates; run up to `N` rounds where each round calls NEAR AI Cloud private inference twice, buyer agent then seller agent, each prompt carrying the shared offer history and only that agent's mandate; stop at agreement, walk-away, or the round limit. Then, in deterministic code with no model in the loop, validate the proposed `Terms` against both mandates' hard limits: total within the buyer's ceiling and above the seller's floor, every must-have satisfied, schedule inside both sides' allowed windows, caps consistent. Output `Terms` with `limits_checked: true`, or `NoDeal`; plus `transcript_hash`, the root of the NEAR AI per-response signature hashes, and the two commitment hashes. Never output the transcript or either mandate. No network calls other than NEAR AI Cloud and the blob fetch; the egress allowlist is part of the README. The job makes no claim about how much the final terms reveal; the README states that they reveal what any signed deal reveals.

Fallback if an OutLayer job cannot make outbound HTTPS calls (day-one check 0.1): run the negotiation inside NEAR AI Cloud alone with both mandates in one enclave session, record the attestation of that session, keep the deterministic limit check inside that session; the OutLayer orchestration becomes v2.

### Payee verification job (`jobs/verify-payee`, OutLayer WASM)

Input: `{agreement_id, version, domain, destination}` and an encrypted company document. Steps: fetch `https://<domain>/.well-known/accord.json` (signed by the vendor's NEAR key, listing its NEAR account and destinations); check the signature and that `destination` is listed; decrypt the document inside, check required fields are present and consistent with the domain and account, hash it; output `VerificationOutput { agreement_id, version, domain, destination, document_hash, checks: [...] }` with the job's attestation. The contract accepts it only through `on_payee_verification`, bound to the same four fields. The README calls the result a bound payee, never a verified business.

### Observer job (`jobs/observe`, OutLayer WASM, market-making only)

Input: `{agreement_id, milestone, slot, observer_spec}`. Steps: fetch the venue's public depth endpoint for the market (`samples` times, `interval_s` apart; the demo uses `20` samples at `5 s`, inside the `180 s` job limit); per sample compute mid, spread in bps, and quote depth within `1%` of mid on both sides; uptime is the share of samples meeting both thresholds; output `ObservationOutput { agreement_id, milestone, slot, observer_spec_hash, spread_bps_p50, depth_quote_min, uptime_bps, pass, sample_hashes_root }` with the job's attestation. Public endpoints only, no API key; the venue is chosen in day-one check 0.9 and its host is the job's entire egress allowlist. Fixtures: one passing slot, one failing slot, one with a venue error (slot recorded as failed with reason). The README says plainly: this measures the venue's book, not the market maker's own orders.

### Base rail (`crates/rail-base`)

Chain Signatures on `v1.signer-prod.testnet` for the path `agreement/{id}/base`; Base Sepolia (`chain_id 84532`); USDC is the Base Sepolia USDC contract (address recorded in `DECISIONS.md` from Circle's testnet faucet page). `act(Pay)` builds an EIP-1559 transaction calling `transfer(address,uint256)` on the USDC contract with `gas_limit` from the fee policy and the agent's fee parameters bounded by it, at the reserved nonce; the contract computes the signing hash, requests the signature and assembles the raw transaction in `on_signature`. The reporter broadcasts `get_signed_tx` and reports. Signing and broadcasting are separate steps by design of Chain Signatures; this is why `get_inflight` exists and why `burn_nonce` is a buyer method. Address derivation is verified in tests against the signer's documented scheme; recorded fixtures cover one transfer, one burn and one failed broadcast.

Fallback rail (`crates/rail-near`), only if day-one check 0.3 fails: the contract holds NEP-141 USDC escrow funded through `ft_on_transfer`, the payee destination is a NEAR account, `Pay` does `ft_transfer` with a callback; payments are `Authorized → Confirmed | Failed` atomically with the authorisation; `make inflight` prints `not applicable`. The README names which rail runs.

### The buyer agent (`agent`)

A small agent that reads a demo inbox (fixture emails), plans against the approved terms, and calls `act` with its scoped key. It runs natively for the demo and exposes an IronClaw tool manifest so the README can show it running under NEAR's own agent runtime. Its inbox is where the attack email lands; the canary destinations are planted in its tool descriptions and memory; the planner is deliberately naive about email instructions so the demo shows the contract, not the agent, stopping the redirect. It fills `destination` and `amount` in `Pay` from its own vendor record, which the attack email mutates; that is how the two refusals happen.

### The reporter (`reporter`)

A small service with a NEAR account (the `reporter` role) and a Base Sepolia RPC. It polls `get_inflight`, broadcasts signed transfers, reports status, and in "attack mode" (`REPORTER_HOLD=1`) holds one signed transfer back so `make inflight` has something to burn. It can never move funds, change a destination or unblock a refusal; the README says so.

### App (`app`)

| Route | Screen | Writes |
| --- | --- | --- |
| `/agreements/new` | Create: seller, authority, agent key, reporter, fee policy, canaries, refund address | `create_agreement` |
| `/agreements/{id}/mandate` | Your mandate editor; seals and commits; you can only ever see your own | `commit_mandate` |
| `/agreements/{id}/negotiation` | Live view: rounds as they happen (headers only), then the attested terms, `limits checked`, the attestation, and the two "readable by the other side: NO" checks | `trigger_negotiation`, `approve_terms` |
| `/agreements/{id}` | State, schedule, payments with Base transaction links, in-flight panel with burn buttons, exceptions, payee versions, refusals, revocation, key replacement | `resolve_exception`, `revoke`, `burn_nonce`, `replace_agent_key`, `settle` |
| `/agreements/{id}/payee` | Vendor side: domain proof instructions, verification result; authority side: approve; buyer side: accept, pause, cancel | `propose_payee`, `approve_payee`, `accept_payee`, change flow |
| `/payee` | Vendor onboarding, no agreement needed: what a domain proof is, the exact `.well-known/accord.json` to publish, a checker that fetches it, and the `Verify your domain` call to action from the site | none (the binding itself happens per agreement) |
| `/attack` | The demo console: inject the redirect email, watch both refusals, the canary, the revocation, then the in-flight panel | none |
| `/try` | The open inbox: a public form (from, subject, body) that drops an email into the demo agent's inbox; the agent reads it and acts; the refusal log updates live with the contract's reason; counters `attempts so far`, `money moved by attempts: 0`, `last refusal`. Rate limit `10` an hour per visitor; the form holds no key and talks only to the agent's inbox store; the agent's key can only call `act`. A successful attempt can only ever produce a payment to the bound payee at the approved amount, which the page says under the form | none (the agent writes through `act`) |
| `/record/{account}` | Public record of agreements, payments, refusals, exceptions | none |

Design: one dark page per route, Satoshi for text, monospace for numbers, commands and refusals; red only for a refusal, a canary touch and a revocation.

### Scripts and tests

Targets: `setup`, `mandate-buyer`, `mandate-seller`, `negotiate`, `verify-negotiation JOB=`, `approve-terms`, `fund`, `bind-payee`, `pay`, `exception`, `attack`, `inflight`, `rotate-key`, `payee-change`, `one-sided`, `deploy-app`, `test`. Each prints the lines in "Definition of done".

Test matrix: schema round trips; contract state machine (every transition and every refusal in the error list, in the stated order; `act` from a non-agent key; canary touch triggering `revoke`; one in-flight payment per milestone; exception applying once; payee change blocked before verification, before authority approval and before the timelock; `terminate` refused while in flight; `burn_nonce` only for Signed or Broadcast; `replace_agent_key` only from Suspended); rail-base against fixtures (transaction encoding, signing hash, signature assembly, address derivation, replacement fee rule); jobs against fixtures (sealed blobs decrypt only with the job key; limit check accepts and rejects; output binding; verification binding); app: terms rendering, the "readable: NO" checks, the in-flight panel.

## Build order

0. Day-one checks (below), answers in `DECISIONS.md`.
1. Schema and contract with the full state machine; `setup`, `mandate-*`, `approve-terms`, `attack` and `inflight` in mock mode (proofs 2 and 3, mock half).
2. Negotiation job against recorded NEAR AI responses, then live; `negotiate` and `verify-negotiation` (proof 1).
3. Base rail live on Base Sepolia; payee job; `fund`, `bind-payee`, `pay`, `inflight` live (proof 3, live half).
4. Agent, `attack` live, `exception`, `rotate-key`, `payee-change`.
5. App, `one-sided` mode, deploy.
6. README, `DEMO.md`, LICENSE, CI, release candidate.
7. Video and X post (Adi), repository public (Adi), submission (Adi confirms).

## Day-one checks (Phase 0)

1. OutLayer: `request_execution` parameters and callback shape; whether a WASI job can make outbound HTTPS calls (needed for NEAR AI Cloud and the domain fetch; if not, apply the fallback in the negotiation job section); how a job derives a stable decryption key and publishes it; secrets; WASM target; time limit; deposit; how the contract reads the approved measurement. Docs: https://app.outlayer.ai/docs/getting-started and https://app.outlayer.ai/docs/trust-verification
2. NEAR AI Cloud: API key; a TEE-served open-weight model; per-response signature retrieval and offline verification; latency per turn so `N` rounds fit the job time limit. Docs: https://docs.near.ai/cloud/private-inference and https://docs.near.ai/cloud/verification
3. Base rail: derive the address for `agreement/{id}/base` from `v1.signer-prod.testnet`; build and sign one EIP-1559 USDC transfer on Base Sepolia from a near-workspaces test or a script; broadcast it; measure signing latency; confirm the replacement-fee rule for a same-nonce burn; record the Base Sepolia USDC contract address and the Circle faucet link. If signing or broadcasting cannot be made to work in a day, switch the rail to `rail-near` and record the decision. Docs: https://docs.near.org/chain-abstraction/chain-signatures/implementation and https://github.com/near/omni-transaction-rs
4. Function-call key scoping: a key limited to `act` on the agreement contract, verified in the contract through `env::signer_account_pk`; `delete_key` and `add_key` from a promise; a function-call key's allowance is gas only.
5. near-connect on testnet (Meteor). Docs: https://docs.near.org/web3-apps/tutorials/wallet-login
6. IronClaw tool manifest format, so the agent can be shown running under NEAR's runtime. Docs: https://docs.ironclaw.com/
7. Reproducible WASM builds for all three jobs.
8. Repo scaffold: workspace, `rust-toolchain.toml`, `.nvmrc`, `.env.example`, `.gitignore` (`.env*`, `data/`), LICENSE (MIT), CI skeleton, `hackathon` branch. Acceptance: `cargo build` and `pnpm install` on a fresh clone.
9. Observer venue: a public depth endpoint for a liquid market with a NEAR or USDC pair, reachable from an OutLayer job (same egress question as 0.1), rate limits that allow `20` requests in `100 s`; record the endpoint, the market symbol and the response shape; capture the three fixtures.

## README requirements

1. Title, headline, thesis line and one-liner: "Accord" then "The private deal room and control plane for agent-to-agent commerce." then "Agreements negotiated in private, enforced in public." then "Accord turns a privately negotiated agreement between companies' agents into the rules that govern an agent's permissions and payments."
1a. What's in the room: the four parts in a table (Sealed Table, Agreement controls, Payee, Glassbook), each with what it is, what it guarantees, where it stops, its command and its directory. This table is the map of the repository for the screeners. The problem section that follows opens with "Whose server do your agents meet on?". Then one diagram: two servers facing each other with a question mark between them, and the same two servers with an enclave between them labelled "the room neither owns".
2. The problem in five lines with links from `REFERENCES.md` section A: every deal tool is one side's agent on that side's server (Pactum for buyers, seller deal desks for sellers) so the side with more information wins; SaaS inflation against negotiated discounts; business email compromise with the FBI's 2025 figures (`$3.0B`, 24,768 complaints; all reported losses `$20.9B`, up from `$6.9B` in 2021); the May 2026 Grok and Bankr injection as reported by Cointelegraph and Giskard; the NCSC's warning that prompt injection "may never be totally mitigated" and its advice to rely on deterministic safeguards outside the model; and the host's sentence that businesses will not deploy agents that expose counterparties. Then the worst case in one sentence, from the site: "The most a hijacked agent can do is make a payment you already approved, to the recipient you already accepted, when it falls due." Then "Where each attack stops" as a five-row table (what arrives, where it stops, the result) matching `website/diagrams/threats.svg`.
2x. In their words, a compact version of the site's section 2a: six to eight dated rows from `REFERENCES.md` A6 and A1 to A3 (the host's sentence verbatim, Visa's Forestell sentence verbatim, Myerson and Satterthwaite, NegotiationArena, the lethal trifecta, Gartner, HBR on Walmart, Pay.UK), each row naming the part of the room it points at. Paraphrases marked as such.
2a. First deployments, three lines: protocol procurement (the infra vendors every DAO and foundation already pays in USDC), foundation grants and accelerator desks (we run one), and agents buying services from agents on the NEAR agent market. Who pays: the buyer per agreement, the vendor per binding.
2b. Try it: the open inbox at `/try`, one paragraph, with the standing offer to name anyone who moves the money in this README.
3. What Accord does: the four states in four sentences, then "humans set the mandate and approve exceptions; the agent runs the agreement inside them".
4. The claims-and-limits table from this file, verbatim, then the privacy boundary table.
5. Try it in ten minutes: the seven beats as make targets, each "do X, see Y" with literal output, mock mode first, live last with its key list.
6. Architecture and the custody-and-trust table.
7. What NEAR is doing: NEAR AI Cloud for the negotiation, OutLayer for the two enclaves, named accounts and scoped keys for the agent, Chain Signatures for the Base rail. Then what NEAR is not doing here yet: confidential settlement, legal KYB, receipt verification.
8. Prior art and the difference, one row each: Pactum (one-sided, sees everything); Google AP2 (signed mandates, no negotiation protocol, no on-chain enforcement; Accord's terms could be an AP2 cart mandate); OutLayer agent custody (owner-edited allowlists, limits and approvals; Accord binds the payee from its own domain and authority with a delay, and could feed such a wallet its policy); Dealproof (TEE negotiation prototype; no commitment check on chain, no bound payee, no revocation story); Dhruva Check (payee tiers on a testnet; no proof, authority or delay); the NDAI papers (research); accounts-payable agents on cards (no negotiation, destination controls are the card network's).
9. Glassbook, the first product on Accord: the market-making deal type, the observer job, the `k` of `n` release, the evidence in `REFERENCES.md` section B (Mantra, Movement, DWF, the DOJ cases, MiCA, the judges' own statements), and its v0 limits. Half a page, with the `make glassbook` output.
10. Limits and v2: legal KYB, settlement through Intents, receipt verification, a payee registry grown from agreements, a marketplace.
11. Libraries, templates and AI assistance used (Q-005), with versions.
12. Repo map and tests with expected pass counts.
13. Team, track ids, NEAR account, other project by the same person if any (Q-015).

## Demo requirements (`DEMO.md`)

Two scripts are written; the gate on 6 Nov picks one. `DEMO-GLASSBOOK.md` (preferred): (0:00) the question, then "a market-maker agreement negotiated on neutral ground, whose fee pays itself only when the order book says the market maker showed up"; (0:15) the project seals its mandate, the market maker seals theirs; (0:35) negotiation, `limits checked`, the two "readable: NO" lines, terms with retainer, KPIs and venue, both approve, the Base address funded; (1:05) the market maker's domain proof, authority approval, payee bound; (1:20) three live observation slots on screen, `2` pass, `1` fail, `period 1: Confirmed` on Base Sepolia; (1:50) the attack: "new wallet" email from the market maker's spoofed finance team, `ERR_PAYEE_MISMATCH`, altered amount, `ERR_AMOUNT_MISMATCH`, canary, `revoke`; (2:15) in flight: one signed transfer burned, key rotated; (2:30) three failing slots, `period 2: Withheld`, the market maker's exception request waiting for a human; (2:40) the open inbox refusing a visitor live; (2:48) close: the claims-and-limits table, the procurement type in one line, the repo.

`DEMO.md` (fallback), three minutes, one recording, seven beats in order: (0:00) the question on a black screen, "Whose server do your agents meet on?", then the one-sentence answer and the host's quote; (0:15) the CFO seals the mandate, the vendor seals theirs; (0:35) the two agents negotiate, `limits checked`, the two "readable: NO" checks, the attested terms, both approve, the Base address funded; (1:05) the vendor's domain proof fetched in the enclave, the authority approves, the buyer accepts, milestone 1 confirmed on Base Sepolia with the explorer link; (1:30) the exception: changed amount requested, buyer approves, milestone 2 confirmed; (1:50) the attack: redirect email, `ERR_PAYEE_MISMATCH`, `ERR_AMOUNT_MISMATCH`, canary, `revoke`, key deleted; (2:15) in flight: one signed transfer listed, nonce burned, stale broadcast fails, key rotated; (2:35) the open inbox: a visitor's email arriving live and being refused, the counter ticking with `money moved: 0`; (2:45) close: the claims-and-limits table on screen, prior art, the repo. Adi records and posts it.

## Submission

As in HACKATHON.md. Tracks `["business","agents","security","privacy"]`. The `idea` draft (Adi edits):

```
Whose server do your agents meet on? Every deal tool is one side's agent on that side's server: Walmart's procurement bot runs on the buyer's side, seller deal desks on the seller's. When both companies have an agent, the side with more information wins, so every company arms its agent and every vendor hides its floor. And the money follows the last email: business email compromise cost $3.05B in 2025. As NEAR's co-founder put it, businesses will not deploy agents that expose their revenue, counterparties or financial operations on a public ledger.

Accord is neutral ground for agent-to-agent deals: the room neither side owns. Two businesses seal their mandates to an attested OutLayer enclave; inside it their agents negotiate with NEAR AI Cloud private inference; code checks the terms against both mandates' hard limits; only the terms and the commitment hashes come out, and the contract refuses a result whose commitments do not match. Both humans approve, and the approved terms become the only authority the buyer's agent has: every payment must name the approved milestone, amount, payee version and destination, or the contract refuses it. The payee is bound from a domain the vendor controls, approved by the vendor's own settlement authority, changed only with a 24 h timelock. revoke deletes the agent's key and ends every new authorisation in one transaction; transfers already signed are listed and the buyer can burn their nonce. The demo agent's inbox is public: email it and try to move the money. Every guarantee ships with its limit next to it.

NEAR: NEAR AI Cloud for the negotiation, OutLayer for the attested enclaves that call back into the contract, scoped function-call keys for the agent, Chain Signatures so the agreement holds and pays USDC on Base without a bridge. First deployments: protocol procurement, foundation grants desks, agents buying from agents on the NEAR agent market. Tracks: business, agents, security, privacy.
```

The X post draft (Adi's voice, lowercase, posted with the video; must contain "built at NEAR HACKATHON"):

```
whose server do your agents meet on?

every deal tool is one side's agent on that side's server. when both companies have an agent, the side with more info wins.

accord is the room neither side owns. two sealed mandates in, only the terms out, and the money can only follow the terms. the vendor proves its own address. revoke kills the agent in one tx and shows you what was already signed.

the demo agent's inbox is public. email it and try to move the money: <link>

built at NEAR HACKATHON. repo + 3 min demo below.
```

## Docs to read first

- https://docs.near.org/ (promises, callbacks, access keys, `add_key`, `delete_key`, NEP-297, near-workspaces, cargo-near)
- https://app.outlayer.ai/docs/getting-started, https://app.outlayer.ai/docs/trust-verification, https://app.outlayer.ai/docs/agent-custody (to describe the prior art correctly), https://github.com/out-layer/outlayer
- https://docs.near.ai/cloud/private-inference, https://docs.near.ai/cloud/verification, https://docs.ironclaw.com/
- https://docs.near.org/chain-abstraction/chain-signatures/implementation, https://github.com/near/omni-transaction-rs
- https://docs.near.org/web3-apps/tutorials/wallet-login
- https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol and https://github.com/kkoci/Dealproof (prior art, read once, describe accurately)
- https://nearhackathon.com/HACKATHON.md (live)

## Non-goals

Settlement through NEAR Intents, confidential settlement, legal KYB, Base receipt verification in the contract, a global payee registry, a marketplace, own-order attribution for market makers (v1), loan-plus-option market-making structures (v1), more than one venue per agreement, bonds, a token, canaries beyond destinations, multi-agent swarms, an SDK for third-party deal types.

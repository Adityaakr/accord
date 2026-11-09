# INTERFACES.md: every surface, exactly

This is the contract between the parts. Change it before changing code, in the same commit, and say why in `DECISIONS.md`. `ARCHITECTURE.md` says why each surface exists. Revised on 31 Oct after the independent review.

## 1. Conventions

- Amounts: `U128` decimal strings in the token's base units (USDC and `tUSDC` have `6` decimals: `"12000000"` is `12.00`). Never floats in any signed or stored payload; prices travel as fixed-precision decimal strings.
- Times: unix seconds as `u64` in views and job outputs; the contract reads `env::block_timestamp() / 1e9`. Terms and mandates use offsets in seconds from `executing_at` (the second approval), never calendar times.
- Hashes: lowercase hex, 64 characters, SHA-256 unless named otherwise. Signatures and ciphertexts: standard base64. NEAR keys: `ed25519:<base58>`. secp256k1 public keys: compressed, hex (66 characters).
- Canonical JSON: RFC 8785 (JCS). Rust `serde_jcs`, TypeScript `canonicalize`; `crates/accord-core/tests/jcs_vectors.json` holds vectors both must reproduce byte for byte (PROGRESS 1.1). Signatures are always over the raw JCS bytes.
- Errors that panic (malformed input, wrong caller) are strings `ERR_<NAME>`. Refusals from `act`, `claim` and `close` never panic; they return `Refused` and emit `act_refused`.
- Events: NEP-297, `standard: "accord"`, `version: "1.0.0"`, one event per log line, each under `2 KB`.
- Accounts in examples: factory `accord-v2.testnet`; agreements `a<id>.accord-v2.testnet`; buyer `northwind-demo.testnet`; vendor `halcyon-demo.testnet`; authority `halcyon-auth.testnet`; recipient `halcyon-mm.testnet`; keeper `accord-keeper.testnet`; canaries `halcyon-mm-payments.testnet`, `halcyon-treasury.testnet`; attacker lookalike `halcyon-markets.testnet`. `make setup` adds a suffix if a name is taken and records the real names in `DECISIONS.md`.

## 2. Repository layout

```
accord/
  Cargo.toml                   workspace: crates/*, contracts/*, jobs/*
  rust-toolchain.toml          pinned (DECISIONS.md)
  crates/accord-core/          pure logic: types, gates, limit checks, market-making slot times and rule, JCS hashing
  crates/accord-core/tests/    jcs_vectors.json, invariants.rs (proptest)
  contracts/agreement/         near-sdk contract, thin shell over accord-core
  contracts/factory/           near-sdk contract
  contracts/releases/          keyless releases.<factory>: requests the jobs' pubkey runs, input fixed in code
  contracts/test-token/        tUSDC: NEP-141 + NEP-145 with open mint on testnet only
  jobs/sealed-table/           OutLayer wasm32-wasip2 binary (modes: pubkey, negotiate)
  jobs/sealed-table/prompts/   vendor.md, buyer.md, message.schema.json (from starter/)
  jobs/payee/                  OutLayer wasm32-wasip2 binary (modes: pubkey, prove)
  jobs/observer/               OutLayer wasm32-wasip2 binary (modes: pubkey, observe)
  packages/sdk/                @accord/sdk (TypeScript, near-api-js)
  packages/mcp/                @accord/mcp (MCP server, stdio and streamable HTTP)
  packages/cli/                accord CLI
  services/agent/              demo buyer agent (literal and llm planners) and the /try re-arm
  services/keeper/             keeper worker
  app/                         Next.js deal-room app
  scripts/                     make targets (TypeScript via tsx), setup, demo, submission
  fixtures/companies/          Northwind and Halcyon: fictional mandates and domain file (from starter/)
  fixtures/inbox/              attack and question messages (from starter/)
  fixtures/jobs/               recorded NEAR AI and venue responses for job tests
  fixtures/schemas/            accord.schema.json, mandate schemas
  tests/                       sandbox integration tests (Rust)
  Makefile  README.md  LICENSE  .env.example  .gitignore
  docs/build/                  the build kit after release (PROGRESS 7.3); at the root until then
```

## 3. `accord-core` types (Rust; serde and borsh)

```rust
pub type Amount = u128;                       // JSON: U128 string

pub enum Kind { Procurement, MarketMaking }   // JSON: "procurement" | "market-making"
pub enum State { Sealed, Attested, Executing, Settled, NoDeal, Cancelled }
pub enum Negotiation {
    AwaitingMandates,
    Ready { attempts: u8 },
    Requested { request_nonce: [u8; 32], at: u64, attempt: u8 },
    Done,
}

pub struct Params {                           // fixed at creation, carried into every job and check
    pub mode: Mode,                           // Live | Demo
    pub timelock_secs: u64,                   // recipient changes; live ≥ 86400
    pub claim_delay_secs: u64,                // live ≥ 259200
    pub grace_secs: u64,                      // live ≥ claim_delay_secs + 86400
    pub min_acceptance_window_secs: u64,
    pub max_acceptance_window_secs: u64,
    pub require_two_sided: bool,
    pub observation_grace_secs: u64,          // after a period ends, before close_period
    pub refusal_limit: u8,                    // default 5
    pub refusal_window_secs: u64,             // default 3600
    pub agent_allowance: Amount,              // default 0.5 NEAR in yocto
}

pub struct Terms {
    pub v: u8,                                // 1
    pub kind: Kind,
    pub token: AccountId,
    pub decimals: u8,
    pub total: Amount,
    pub items: Vec<ItemTerms>,                // 1..=12 (market-making: one per period)
    pub acceptance_window_secs: u64,
    pub duration_secs: u64,                   // the agreement ends at executing_at + duration_secs
    pub params_hash: [u8; 32],                // jcs_sha256(Params): the job copies Params from state
    pub doc_hash: [u8; 32],                   // sha256 of the commercial terms document plaintext
    pub atlas: Option<AtlasTerms>,
}
pub struct ItemTerms { pub id: u32, pub amount: Amount, pub due_offset_secs: u64, pub evidence: Evidence }
pub enum Evidence { DeliveryAccepted, PeriodEligible { period: u32 } }

pub struct AtlasTerms {
    pub retainer_per_period: Amount,
    pub periods: u32, pub period_secs: u64,
    pub slots_per_period: u8, pub pass_threshold: u8,
    pub venue: Venue,
    pub max_spread_bps: u32,
    pub min_depth_quote: Amount,              // USDC base units, each side
    pub depth_band_bps: u32,
}
pub enum Venue { RheaDcl { network: String, contract: AccountId, pool_id: String } }

pub struct Observation {                      // the observer's signed output, as stored
    pub agreement: AccountId, pub period: u32, pub slot: u8, pub slot_time: u64,
    pub venue: Venue, pub band_bps: u32,
    pub venue_block: BlockRef,                // { height, hash, time }
    pub mid: String,                          // fixed-precision decimal string
    pub spread_bps: u32, pub depth_bid: Amount, pub depth_ask: Amount, pub two_sided: bool,
}

pub enum Action {
    Pay { item: u32, amount: U128, recipient: AccountId, memo: Option<String> },
    RequestException { item: u32, amount: U128, waive_evidence: bool, reason: String },  // reason ≤ 280 chars
}
pub enum ActOutcome {
    Sent { item: u32, amount: U128, recipient: AccountId },        // returned by the callback on success
    Failed { item: u32, reason: String },                           // returned by the callback on token failure
    Refused { code: RefusalCode, seq: u64 },
    ExceptionRequested { id: u32 },
}
pub enum RefusalCode {
    Revoked, NotExecuting,                     // gate 1
    Canary, NoRecipient, PayeeMismatch,        // gate 2
    UnknownItem, AlreadyPaid,                  // gate 3
    NotDue, PeriodWithheld,                    // gate 4
    AmountMismatch, CapExceeded, InsufficientFunds, // gate 5
    InFlight,                                  // gate 6
}
// RefusalCode serialises, in gate order, as: ERR_REVOKED, ERR_NOT_EXECUTING, ERR_CANARY, ERR_NO_RECIPIENT,
// ERR_PAYEE_MISMATCH, ERR_UNKNOWN_ITEM, ERR_ALREADY_PAID, ERR_NOT_DUE, ERR_PERIOD_WITHHELD,
// ERR_AMOUNT_MISMATCH, ERR_CAP_EXCEEDED, ERR_INSUFFICIENT_FUNDS, ERR_IN_FLIGHT.
pub enum Rating { Allow, Warn, Block }
pub enum PeriodOutcome { Open, Eligible, Withheld, Review, ResolvedPay, ResolvedClosed }
pub enum ItemStatus {
    Open,                                      // not yet eligible: no delivery yet, or its period not yet decided
    Delivered, Disputed,                       // procurement: inside the acceptance window; or disputed, waiting for a new delivery
    Eligible,                                  // payable through the gates
    Paid,
    AssumedPaid,                               // resolve_stale_lock could not tell; counts as paid; an approved exception reopens it
    Reserved,                                  // close could not pay it; the amount stays for the vendor's claim, after Settled too
    Unfunded,                                  // eligible at close but the escrow could not cover it; recorded, nothing set aside
}
pub enum Via { Agent, Claim, Close }
pub struct InFlight {                         // the payment lock
    pub payment_id: u64,                      // counts up from 1; the callback must carry the same id
    pub item: u32, pub amount: Amount, pub recipient: AccountId, pub via: Via,
    pub since_block: u64,
    pub escrow_before: Amount,                // the contract's own ledger before this payment: funded minus paid
}
```

Pure functions (each with unit and property tests):

- `gates::check_pay(state, action, now, caller) -> Result<PayPlan, RefusalCode>`: the six gates in order; `Caller::Agent { key }`, `Caller::VendorClaim` or `Caller::Close`. For `Caller::Close`, the contract turns `NoRecipient` into `Reserved` and `InsufficientFunds` into `Unfunded` instead of stopping (`close()` in section 4.2).
- `limits::within(terms, mandate) -> bool`: one side's limits (rules in section 6.3); used on every proposal (sender) and every acceptance (receiver).
- `limits::check(terms, buyer, vendor) -> Result<(), LimitFailure>`: both sides, on the accepted terms; the failure never leaves the job.
- `terms::structural(terms, token, params) -> Result<(), &'static str>`: amounts sum to `total`; `1..=12` items; ids unique; every `due_offset_secs ≤ duration_secs`; the token matches; `params_hash` matches; `acceptance_window_secs` within the params' bounds; for market-making, one item per period with amount `retainer_per_period`.
- `atlas::slot_time(seed, agreement, period, slot, period_start, period_secs, slots) -> u64`: `window_start + (HMAC-SHA256(seed, agreement ‖ period ‖ slot) mod (window − 10))`.
- `atlas::passes(terms, observation, require_two_sided) -> bool`: `spread_bps ≤ max_spread_bps`, both depths `≥ min_depth_quote`, and two-sided if required.
- `atlas::evaluate(terms, observations, slots, conflict) -> PeriodOutcome`: `Review` if a conflict was logged for the period; otherwise `Eligible` if passes ≥ threshold, else `Review` if passes + unobserved ≥ threshold, else `Withheld`. Also returns uptime (two-sided slots over observed slots), which is reported, not the pay rule.
- `hash::jcs_sha256(value) -> [u8; 32]`.

## 4. Agreement contract (`contracts/agreement`)

Root struct under `1 KB`; every variable collection in `near_sdk::store` (section 4.7).

### 4.1 Init (called by the factory in the creation batch)

```json
{
  "id": 7, "factory": "accord-v2.testnet", "release": 3,
  "kind": "procurement", "title": "Liquidity reporting integration",
  "buyer": "northwind-demo.testnet", "vendor": "halcyon-demo.testnet", "vendor_authority": "halcyon-auth.testnet",
  "token": "<token id>", "outlayer": "outlayer.testnet", "keeper": "accord-keeper.testnet",
  "sealed_table": {"project": "<owner>/accord-sealed-table", "wasm_hash": "…", "signing_pubkey": "ed25519:…"},
  "payee_job": {"project": "<owner>/accord-payee", "wasm_hash": "…", "signing_pubkey": "ed25519:…"},
  "observer_job": {"project": "<owner>/accord-observer", "wasm_hash": "…", "signing_pubkey": "ed25519:…"},
  "model": "z-ai/glm-5.3-flash",
  "canaries": ["halcyon-mm-payments.testnet", "halcyon-treasury.testnet"],
  "params": { "mode": "demo", "timelock_secs": 120, "claim_delay_secs": 120, "grace_secs": 600,
              "min_acceptance_window_secs": 60, "max_acceptance_window_secs": 604800,
              "require_two_sided": true, "observation_grace_secs": 60,
              "refusal_limit": 5, "refusal_window_secs": 3600, "agent_allowance": "500000000000000000000000" }
}
```

`mode: "live"` requires the live minimums (`ARCHITECTURE.md` section 4); `mode: "demo"` allows shorter timings and every screen and printed block says `demo timings`.

### 4.2 Change methods

| Method | Caller | Deposit | Gas | Effect | Panics |
| --- | --- | --- | --- | --- | --- |
| `commit_mandate(commitment: String, ciphertext: Base64VecU8, doc_pubkey: String, doc_key_signer: PublicKey)` | buyer or vendor | 0 | 30 T | Stored for the caller's role; storage paid from the agreement's balance; replaceable while `AwaitingMandates`, or `Ready` before the first attempt (one negotiation per pair of commitments, retries included) | `ERR_NOT_PARTY`, `ERR_WRONG_STATE`, `ERR_TOO_LARGE` (> 8 KB), `ERR_LOW_BALANCE` |
| `start_negotiation()` | anyone | 0 | ≥ 280 T | Requires both commitments and `Ready`; panics if prepaid gas is below `280 TGas`; `request_execution` with `{mode, agreement, request_nonce}`, then `on_sealed_result` | `ERR_WRONG_STATE`, `ERR_LOW_GAS`, `ERR_LOW_BALANCE` |
| `on_sealed_result(request_nonce)` | private (the agreement's own `.then`) | | 60 T | `ARCHITECTURE.md` 8.4 | |
| `submit_sealed_result(output: SealedOutput)` | keeper | 0 | 100 T | Only under fallback F1, which is not in use: compiled only with the `f1` cargo feature, never into a release (`make check-deploy` refuses it). Once per nonce; the output must fully verify (terms or a final no-deal for the current nonce) before any state changes | `ERR_NOT_KEEPER`, `ERR_WRONG_STATE`, `ERR_BAD_OUTPUT` |
| `approve_terms(terms_hash: String)` | buyer or vendor | 1 yocto | 30 T | Records approval; both → `Executing`, `executing_at` set, items created | `ERR_NOT_PARTY`, `ERR_HASH_MISMATCH`, `ERR_WRONG_STATE` |
| `cancel()` | buyer or vendor | 0 | 30 T | Before `Executing` → `Cancelled` | `ERR_WRONG_STATE` |
| `ft_on_transfer(sender_id, amount, msg)` | the token contract | 0 | | `msg == "fund"`, `sender_id == buyer`, state `Executing`: credit up to `total − funded`, return the rest | `ERR_WRONG_TOKEN`, `ERR_NOT_BUYER` (returns the full amount) |
| `propose_recipient(account: AccountId, domain: String)` | vendor | 0 | 300 T | Any state before `Settled`, and after it while an item is `Reserved`; version 1 sets the domain, later versions must use it; Payee job requested with `{mode: "prove", agreement, version}` | `ERR_NOT_VENDOR`, `ERR_CHANGE_PENDING`, `ERR_DOMAIN_PINNED` |
| `on_payee_proof(version)` | private | | 60 T | Signature, agreement, version and values checked; `Proven{rating, reasons}` or `ProofFailed{reason}` | |
| `approve_recipient(version: u32)` | vendor_authority | 1 yocto | 30 T | `Proven` → `AuthorityApproved` | `ERR_NOT_AUTHORITY`, `ERR_WRONG_STATE` |
| `accept_recipient(version: u32, acknowledge_warnings: bool)` | buyer | 1 yocto | 50 T | `AuthorityApproved` → `Accepted`; version 1 active at once, later versions `active_at = now + timelock_secs` | `ERR_BLOCKED`, `ERR_WARNINGS_NOT_ACKNOWLEDGED` |
| `activate_recipient(version: u32)` | anyone | 0 | 50 T | After `active_at`: current; `storage_deposit` for it on the token if needed | `ERR_TOO_EARLY` |
| `cancel_recipient_change(version: u32)` | buyer or vendor_authority | 0 | 30 T | Pending change → `Cancelled` | `ERR_WRONG_STATE` |
| `install_agent_key(public_key: PublicKey, allowance: U128)` | buyer | 1 yocto | 50 T | `Executing`; the allowance is at most `params.agent_allowance`; deletes any current key, adds a `FunctionCall` key (receiver self, `"act"`, allowance). `Settled` deletes the key too | `ERR_NOT_BUYER`, `ERR_WRONG_STATE`, `ERR_ALLOWANCE` |
| `revoke_agent()` | buyer | 0 | 30 T | Marks the key revoked, deletes it | `ERR_NO_AGENT_KEY` |
| `act(action: Action)` | the agent key (section 4.4) | 0 | 80 T | Returns `PromiseOrValue<ActOutcome>`. A `Pay` recipient must be an account id of at most 64 bytes (else malformed input); a canary is matched in any letter case. A `RequestException` on an item with one pending, past the full list, past the agent's own share (`8` of the `16` slots) or on an item whose one exception is used is a counted `ERR_CAP_EXCEEDED` refusal | `ERR_UNAUTHORIZED`, `ERR_BAD_RECIPIENT`, `ERR_TOO_LARGE`, `ERR_BAD_EXCEPTION` (malformed input only) |
| `on_payment_resolved(payment_id, item, amount, recipient, via)` | private | | 30 T | If `payment_id` equals the lock's: mark the item `Paid`, or on failure leave it `Eligible` (`Reserved` when `via` is `close`), and clear the lock. If not (`resolve_stale_lock` already cleared it): settle only its own item (success turns `AssumedPaid` into `Paid`; failure turns it back to `Eligible`) and leave any newer lock alone. Returns `ActOutcome` | |
| `resolve_stale_lock()` | anyone | 0 | 80 T | `in_flight` older than `600` blocks: reads `ft_balance_of(self)` (callback `on_stale_balance(payment_id)`). A balance below `escrow_before` proves the transfer: the item is `Paid`. Any other balance cannot tell (a plain `ft_transfer` into the account looks the same), so the item becomes `AssumedPaid`. Either way the lock clears | `ERR_NO_STALE_LOCK` |
| `submit_delivery(item: u32, evidence_hash: String, uri: String)` | vendor | 0 | 30 T | Before `executing_at + duration_secs` only, and only for an item with no delivery yet or whose last delivery was disputed; starts the acceptance window | `ERR_NOT_VENDOR`, `ERR_UNKNOWN_ITEM`, `ERR_DELIVERY_CLOSED`, `ERR_NOT_DISPUTED` |
| `accept_delivery(item: u32)` | buyer | 1 yocto | 30 T | Eligible now | |
| `dispute_delivery(item: u32, reason: String)` | buyer | 0 | 30 T | Within the window; the item waits for a new delivery, which the vendor can make until the end of the term | `ERR_WINDOW_CLOSED` |
| `request_exception(item: u32, amount: U128, waive_evidence: bool, reason: String)` | vendor | 0 | 30 T | Same as the agent's `RequestException`; at most one pending per item, `16` in total | `ERR_EXCEPTION_PENDING`, `ERR_EXCEPTIONS_FULL` |
| `approve_exception(id: u32)` / `reject_exception(id: u32)` | buyer | 1 yocto | 30 T | Approved: the item's amount becomes the exception amount once (within the total); with `waive_evidence`, gate 4 passes for that item; on an `AssumedPaid` item, the item becomes `Eligible` again at the exception amount and its assumed payment stops counting toward the total | `ERR_EXCEEDS_TOTAL` |
| `claim(item: u32)` | vendor | 0 | 80 T | Gates 2 to 6 after `eligible_at + claim_delay_secs`, in `Executing`, or after `Settled` for a `Reserved` item; pays the current recipient (`via: claim`) | `ERR_NOT_VENDOR`; refusals as in `act`, never counted toward the agent's limit and, like `close`'s, an `act_refused` event only (`seq: null`), never written to the agent's refusal log |
| `record_observation(observation: Observation, sig: String)` | anyone | 0 | 50 T | Signature by the observer key; agreement, venue, pool and band equal the terms; `slot_time` inside the slot's window; venue block time ≥ `slot_time`. A copy of the stored observation is ignored; a different one for the same slot is not stored: it emits `observation_conflict`, marks the period, and the call returns normally | `ERR_BAD_SIGNATURE`, `ERR_WRONG_VENUE`, `ERR_OUT_OF_WINDOW`, `ERR_PERIOD_CLOSED` |
| `close_period(period: u32)` | anyone | 0 | 50 T | After the period ends plus `observation_grace_secs`: `atlas::evaluate` (a period with a logged conflict closes as `Review`); an `Eligible` period makes its item eligible | `ERR_TOO_EARLY`, `ERR_PERIOD_CLOSED` |
| `resolve_period(period: u32, pay: bool)` | buyer | 1 yocto | 30 T | A `Review` (or `Withheld`) period → `ResolvedPay` (item eligible) or `ResolvedClosed` | `ERR_WRONG_STATE` |
| `mutual_close()` | buyer and vendor (the second call executes) | 1 yocto | 100 T | As `close()`, at any time while `Executing`; items not yet eligible are not paid | |
| `close()` | anyone after `executing_at + duration_secs + grace_secs`, once no acceptance window is open and `close_period` has run for every market-making period | 0 | 100 T | One step per call. While an eligible item is unprocessed: pay it to the current recipient (`via: close`); with no active recipient, or when the transfer fails in the callback, mark it `Reserved`; when the escrow cannot cover it, mark it `Unfunded`. A `Review` period nobody resolved counts as not eligible. Then read `ft_balance_of(self)`, keep the reserved amounts, refund the rest to the buyer, never more than the ledger's `funded - paid - reserved` (tokens in transit are not counted); `Settled`. A late failed callback for an `AssumedPaid` item after `Settled` sets it `Reserved` again, so the vendor can claim it | `ERR_TOO_EARLY`, `ERR_WINDOW_OPEN`, `ERR_PERIOD_OPEN`; `ERR_IN_FLIGHT` as a refusal |
| `withdraw_near()` | buyer | 1 yocto | 30 T | After `Settled`: liquid NEAR above the storage stake to the buyer, keeping `0.05 NEAR` while any item is `Reserved` | `ERR_WRONG_STATE` |

### 4.3 Views

`get_agreement() -> AgreementView` (state, negotiation, kind, title, parties, release, params, terms_hash, approvals, `executing_at`, funded, paid, reserved, `in_flight` (with its `payment_id`), current recipient and domain, pending change, agent key present, revoked keys count, canary tripped, refusal count, exception count, period outcomes, budget). `get_terms() -> Option<Terms>`, `get_items() -> Vec<ItemView>` (with `ItemStatus` and absolute due times), `due_items() -> Vec<DueItem{item, amount, recipient, eligible_at}>`, `get_refusals(from: u64, limit: u8) -> Vec<Refusal>`, `get_recipients() -> Vec<RecipientVersion>`, `get_exceptions()`, `get_periods() -> Vec<PeriodView>`, `get_observations(period: u32)`, `get_commitments() -> {buyer, vendor}` (hashes, ciphertexts, doc pubkeys, doc key signers), `get_documents() -> {buyer, vendor}` (terms document ciphertexts), `get_receipts() -> Vec<Receipt{item, amount, recipient, via, block, at, evidence_hash}>`, `get_budget() -> {balance, storage_stake, liquid}`. No view returns or derives a mandate's plaintext.

### 4.4 `act` authentication and gates

Panic `ERR_UNAUTHORIZED` unless `predecessor == current_account_id` and `signer_account_pk` is the current agent key or one of the last `8` revoked keys. Then gates 1 to 6 (`ARCHITECTURE.md` section 6); the first failure is recorded. Only refusals signed by the current key count toward `refusal_limit`. `RequestException` passes gates 1 to 3 and creates a pending exception; it cannot change a recipient.

### 4.5 `on_sealed_result`

`#[private]`. Read `#[callback_result] Result<SealedOutput, PromiseError>`. Accept only when: the result is present and parses; `ed25519_verify(sig, JCS(output without sig), sealed_table.signing_pubkey)`; `output.agreement == current_account_id`; `output.request_nonce` equals the stored one; both commitments equal the stored ones; `output.release == release`; for `terms`, `terms.params_hash == jcs_sha256(params)`, `terms::structural` passes and `terms_hash == jcs_sha256(terms)`. Otherwise an infrastructure failure: attempt plus one, back to `Ready`; after `3`, `NoDeal{INFRASTRUCTURE}` (nothing was funded yet).

### 4.6 Events (`standard: "accord"`, `version: "1.0.0"`)

| Event | Data |
| --- | --- |
| `agreement_created` | `agreement, kind, buyer, vendor, authority, token, release, mode` |
| `mandate_committed` | `role, commitment` |
| `negotiation_requested` | `request_nonce, attempt` |
| `negotiation_failed` | `attempt, reason` |
| `terms_proposed` | `terms_hash, total, items, transcript_hash, model, rounds` |
| `no_deal` | `reason` (`WALK_AWAY`, `LIMIT_CHECK`, `BAD_INPUT`, `INFRASTRUCTURE`) |
| `terms_approved` | `by, terms_hash` |
| `executing` | `terms_hash, executing_at` |
| `funded` | `from, amount, total_funded` |
| `recipient_proposed` / `recipient_proven` / `recipient_proof_failed` / `recipient_approved` / `recipient_accepted` / `recipient_active` / `recipient_change_cancelled` | `version, account, domain, rating, reasons, by, active_at` as relevant |
| `agent_key_installed` | `public_key, allowance` |
| `agent_key_revoked` | `public_key, reason` (`buyer`, `canary`, `refusal_limit`) |
| `delivery_submitted` / `delivery_accepted` / `delivery_disputed` | `item, evidence_hash, uri, by` (`buyer` or `window`), `reason` |
| `act_refused` | `seq, code, item, amount, recipient, signer, via` (`agent`, `claim`, `close`) |
| `payment_sent` | `payment_id, item, amount, recipient, via` (`agent`, `claim`, `close`) |
| `payment_settled` / `payment_failed` | `payment_id, item, amount, recipient, reason` |
| `lock_resolved` | `payment_id, item, outcome` (`paid`, `assumed_paid`), `balance` |
| `item_reserved` / `item_unfunded` | `item, amount, reason` (`no_recipient`, `transfer_failed`, `insufficient_escrow`) |
| `exception_requested` / `exception_approved` / `exception_rejected` | `id, item, amount, waive_evidence, by, reason` |
| `observation_recorded` | `period, slot, slot_time, venue_block, spread_bps, depth_bid, depth_ask, two_sided, pass` |
| `observation_conflict` | `period, slot, stored_hash, offered_hash, offered_block` |
| `period_closed` | `period, passed, observed, threshold, uptime_bps, conflicts, outcome` |
| `period_resolved` | `period, pay` |
| `settled` | `paid, reserved, refunded` |
| `cancelled` | `by` |

### 4.7 Storage layout

Root (`#[near(contract_state)]`, under `1 KB`): ids, kind, state, negotiation, parties, token, release ref, params, counters, flags, `in_flight`, current agent key, current recipient version. Collections (`near_sdk::store`): `commitments: LookupMap<Role, Commitment>`, `terms: LazyOption<Terms>`, `items: Vector<ItemState>`, `recipients: Vector<RecipientVersion>`, `refusals: LookupMap<u64, Refusal>` (ring of `128`), `refusal_window: Vector<u64>` (times of the current key's refusals, trimmed), `revoked_keys: Vector<PublicKey>` (last `8`), `exceptions: Vector<Exception>` (cap `16`), `observations: LookupMap<(u32, u8), Observation>`, `periods: Vector<PeriodState>`, `receipts: Vector<Receipt>`, `documents: LazyOption<Documents>`. A gas-ceiling test fails if a refused `act` uses `15 TGas` or more, or a paying `act` `50 TGas` or more.

## 5. Factory contract (`contracts/factory`)

```rust
pub struct Config { owner: AccountId, token: AccountId, outlayer: AccountId, keeper: AccountId,
                    create_deposit: U128, demo_allowed: bool }
pub struct JobRelease { project: String, wasm_hash: String, signing_pubkey: PublicKey, pubkey_task_id: u64 }
pub struct Release { version: u32, mode: ReleaseMode /* Global | Embedded */, code_hash: Base58CryptoHash,
                     sealed_table: JobRelease, payee: JobRelease, observer: JobRelease,
                     mandate_pubkey: String, model: String, published_at: u64 }
```

| Method | Caller | Notes |
| --- | --- | --- |
| `new(config)` | deployer | Also creates `releases.<factory>` in one batch (`CreateAccount`, `Transfer`, `DeployContract` of `contracts/releases`, `FunctionCall new`) with no `AddKey` |
| `request_pubkeys(projects)` | owner | Asks the keyless `releases.<factory>` account to request the three jobs' `pubkey` runs on chain; their outputs come back through `store_pubkey` as a pending release |
| `store_pubkey(job, output)` | `releases.<factory>` only | Stores one job's signing key (and, for the Sealed Table, the mandate key) in the pending release |
| `publish_release(version, mode, code_hash, code: Option<Base64VecU8>, task_ids)` | owner | Exactly 1 yoctoNEAR. Completes the pending release with the attestation task ids; `code` only for `Embedded`; for `Global` the hash must already be deployed |
| `set_current_release(version)` | owner | New agreements only |
| `create_agreement(args: CreateArgs) -> Promise` | the buyer (predecessor is the buyer, or a DAO acting as buyer) | Payable, `≥ create_deposit`; enforces the live minimums on `params`; the buyer, the vendor and the vendor's settlement authority are three different accounts (`ERR_PARTIES`); only the typed `params` are forwarded to `new`; the factory keeps the storage stake for what the creation stores in it (the record, plus `512` bytes for the callback's registry and party lists) and the agreement receives the rest of the deposit; the id is taken before the batch, so a failed creation never reuses it; callback `on_agreement_created` registers or refunds what the agreement would have received |
| `report_recipient(account, seq)` | a registered agreement account | Adds a report with evidence `{agreement, seq}` |
| `record_payment(recipient, buyer, amount)` | a registered agreement account | For `recipient_stats` |
| `block_recipient(account, evidence_url)` / `unblock_recipient(account)` | owner | Curated list; `block_recipient` takes exactly 1 yoctoNEAR |
| Views | anyone | `config()`, `release(v)`, `current_release()`, `agreement(id)`, `agreements(from, limit)`, `agreements_for(account)`, `reports(account)`, `blocked(account)`, `recipient_stats(account, buyer?)` |

`CreateArgs` = `{kind, title, vendor, vendor_authority, canaries, params}`; the buyer is the predecessor and the factory fills `id`, `factory`, `release`, the job releases, `model`, `token`, `outlayer` and `keeper`.

The releases contract (`contracts/releases`, deployed only at `releases.<factory>`, never holding a key): `new(factory, outlayer)`; `request_pubkey(job, project, version_key)`, callable only by the factory, which calls `outlayer.request_execution` with `input_data` fixed in the code to `{"mode": "pubkey"}` and explicit `resource_limits`, then `.then(on_pubkey(job))`; `on_pubkey(job)` (private) forwards the signed output to `factory.store_pubkey`. It has no other method, so S1 can admit it without admitting anything that could request a `negotiate` or `prove` run.

## 6. Mandates, envelopes and documents

### 6.1 Envelope (what is encrypted)

```json
{
  "v": 1,
  "agreement": "a7.accord-v2.testnet",
  "role": "buyer",
  "party": "northwind-demo.testnet",
  "release": 3,
  "mandate": { "…": "section 6.2" },
  "salt": "<64 hex>",
  "doc_pubkey": "<66 hex>",
  "doc_key_signer": "ed25519:…"
}
```

`commitment = sha256(JCS(envelope))`; `ciphertext = eciesjs.encrypt(mandate_pubkey, JCS(envelope))` (secp256k1, HKDF-SHA256, AES-256-GCM; Rust side: the `ecies` crate with its pure-Rust backend, check 0.2). Before encrypting, the SDK checks the release's mandate key against its `pubkey` run's attestation record (`ARCHITECTURE.md` 8.1). Doc key: NEP-413 `signMessage({message: "accord:doc-key:v1:<agreement>", recipient: "<agreement>", nonce: sha256(message)})` by the party's wallet; `HKDF-SHA256(ikm = signature, info = "accord/doc-key/v1")` reduced to a secp256k1 scalar; `doc_key_signer` is the wallet key that signed.

### 6.2 Mandate shape

Every mandate has three parts. `shared` is what the other side's negotiator is shown (the request, or the offer); it also goes into the commercial terms document. `limits` and `instructions` are private: only this side's negotiator and the code checks see them. All times are offsets in seconds from `executing_at`. The full files are in `starter/fixtures/companies/`.

Procurement, buyer:

```json
{ "kind": "procurement", "role": "buyer",
  "shared": { "scope": "Integrate liquidity reporting into the treasury dashboard",
              "proposed_items": [ { "name": "Data pipeline", "deliverable": "…" }, { "name": "Dashboard", "deliverable": "…" }, { "name": "Handover", "deliverable": "…" } ] },
  "limits": { "max_total": "40000000", "target_total": "32000000", "max_items": 4,
              "max_duration_secs": 604800, "min_acceptance_window_secs": 120 },
  "instructions": "Prefer three milestones; walk away rather than exceed the ceiling." }
```

Procurement, vendor:

```json
{ "kind": "procurement", "role": "vendor",
  "shared": { "capabilities": "…" },
  "limits": { "min_total": "30000000", "target_total": "38000000", "min_items": 2, "max_items": 4,
              "min_due_offset_secs": 60, "max_acceptance_window_secs": 604800 },
  "instructions": "Hold near target; concede at most once." }
```

Market-making, buyer and vendor:

```json
{ "kind": "market-making", "role": "buyer",
  "shared": { "venue": { "kind": "rhea-dcl", "network": "mainnet", "contract": "dclv2.ref-labs.near",
                         "pool_id": "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1|wrap.near|2000" },
              "pair": "NEAR/USDC" },
  "limits": { "max_retainer_per_period": "8000000", "periods": 4, "period_secs": 360,
              "max_spread_bps": 60, "min_depth_quote": "<from probe 0.7>", "depth_band_bps": 200,
              "min_slots": 6, "min_threshold": 4 },
  "instructions": "…" }
```

```json
{ "kind": "market-making", "role": "vendor",
  "shared": { "capabilities": "…" },
  "limits": { "min_retainer_per_period": "5000000", "tightest_spread_bps": 45, "max_depth_quote": "<from probe 0.7>",
              "max_threshold": 5, "min_depth_band_bps": 100 },
  "instructions": "…" }
```

### 6.3 Within-limits rules (`limits::within`)

Procurement, buyer: `total ≤ max_total`; `items ≤ max_items`; every `due_offset_secs ≤ duration_secs ≤ max_duration_secs`; `acceptance_window_secs ≥ min_acceptance_window_secs`. Vendor: `total ≥ min_total`; `min_items ≤ items ≤ max_items`; every `due_offset_secs ≥ min_due_offset_secs`; `acceptance_window_secs ≤ max_acceptance_window_secs`. Market-making, buyer: `retainer ≤ max_retainer_per_period`; `periods ≤ limits.periods`; `period_secs` equal; `max_spread_bps ≤ limits.max_spread_bps`; `min_depth_quote ≥ limits.min_depth_quote`; `slots ≥ min_slots`; `threshold ≥ min_threshold`; the venue equals the shared venue. Vendor: `retainer ≥ min_retainer_per_period`; `max_spread_bps ≥ tightest_spread_bps`; `min_depth_quote ≤ max_depth_quote`; `threshold ≤ max_threshold`; `depth_band_bps ≥ min_depth_band_bps` (optional, `0` when absent, 9 Nov 2026). Both: amounts sum exactly; the acceptance window within the agreement's params.

### 6.4 Negotiator message (structured output, `starter/jobs/sealed-table/prompts/message.schema.json`)

```json
{ "type": "QUOTE | COUNTER | FINAL | ACCEPT | WALK_AWAY",
  "terms": { "total": "36000000", "duration_secs": 86400, "acceptance_window_secs": 120,
             "items": [ { "name": "Data pipeline", "amount": "12000000", "due_offset_secs": 1800 } ],
             "atlas": null },
  "reasons": "≤ 600 characters" }
```

`terms` is `null` for `ACCEPT` and `WALK_AWAY`. For market-making, `items` is empty and `atlas` carries `retainer_per_period, periods, period_secs, slots_per_period, pass_threshold, max_spread_bps, min_depth_quote, depth_band_bps`; the job derives one item per period. The job builds `Terms` from the accepted message plus the agreement's `params` read from state; it invents no field.

### 6.5 Commercial terms document

`{ "scope", "items": [ { "id", "name", "deliverable" } ], "buyer_shared", "vendor_shared" }`, built from both mandates' `shared` parts and the accepted items, JCS-encoded; `doc_hash = sha256` of that; encrypted with eciesjs to each party's `doc_pubkey`.

## 7. Jobs (OutLayer, `wasm32-wasip2`, JSON on stdin and stdout)

Every job: reads what it needs from the agreement's state over the RPC endpoints compiled into its build (testnet: `https://test.rpc.fastnear.com` with `https://rpc.testnet.near.org` as fallback; mainnet for the observer: `https://rpc.mainnet.near.org` and `https://free.rpc.fastnear.com`, archival per check 0.7), never from caller-supplied URLs or values; uses `optimistic` finality with retries for up to `15 s` for state written moments earlier; signs every output with its seed-derived ed25519 key over the raw bytes of `JCS(output without sig)`, carried as `"sig"`. Every job also has a `pubkey` mode that returns its signing key (and, for the Sealed Table, the mandate key), requested on chain by the keyless `releases.<factory>` account.

### 7.1 Sealed Table

Input: `{"mode": "negotiate", "agreement": "a7.accord-v2.testnet", "request_nonce": "<64 hex>"}`. Everything else (status, parties, kind, release, model, params, commitments, ciphertexts) is read from state.

Output:

```json
{ "mode": "negotiate", "agreement": "…", "release": 3, "request_nonce": "…",
  "buyer_commitment": "…", "vendor_commitment": "…",
  "outcome": "terms | no_deal | infrastructure", "terms": { "…": "Terms" }, "terms_hash": "…",
  "no_deal_reason": null, "rounds": 4, "transcript_hash": "…",
  "documents": { "buyer": "<base64>", "vendor": "<base64>" },
  "model": { "id": "z-ai/glm-5.3-flash", "nonce": "…", "gateway": { "signing_address": "…", "tdx": "ok | not_checked", "compose_hash": "…" },
             "candidates": [ { "signing_address": "0x…", "tdx": "ok | not_checked", "gpu": "ok | not_checked", "compose_hash": "…" } ],
             "report_sha256": "…", "e2ee": false },
  "responses": [ { "chat_id": "…", "request_hash": "…", "response_hash": "…", "signature": "0x…", "signer": "0x…" } ],
  "usage": { "prompt_tokens": 0, "completion_tokens": 0, "cost_usd_micros": 0 },
  "sig": "…" }
```

Secrets the project reads, both under the S1 condition, because OutLayer refuses the whole run when the caller fails any secret's condition: `NEARAI_API_KEY`, `PROTECTED_SEALED_SEED`. NEAR AI requests: `POST https://cloud-api.near.ai/v1/chat/completions` with `Authorization: Bearer`, `x-no-aliasing: true`, `Accept-Encoding: identity`, `stream: false`, `temperature: 0.2`, `max_tokens: 700`, `response_format: {type: "json_schema", …}`, a 32-byte random session salt in the system prompt; then `GET /v1/signature/{id}?signing_algo=ecdsa`; and once per run `GET /v1/attestation/report?model=…&provider=near&signing_algo=ecdsa&nonce=<hex64>` with `x-no-aliasing: true` (the gateway part and the model candidates both verified).

### 7.2 Payee

Input `{"mode": "prove", "agreement", "version"}`; the job reads the version's domain and account and the agreement's authority from state. Output `{"mode": "prove", "agreement", "version", "domain", "url", "file_sha256", "account", "authority", "fetched_at", "block", "form": "simple | list", "demo_domain": false, "checks": {"file": "ok", "recipient_listed": "ok", "authority_matches": "ok"}, "signals": {"exists": true, "is_contract": false, "code_changed_30d": false, "age_days": 412 | null, "tx_30d": 40 | null, "prior_payments": 0, "reports": 0, "blocked": false, "canary": false}, "rating": "allow", "reasons": [], "sig"}`.

### 7.3 Observer

Input `{"mode": "observe", "agreement", "period", "slot"}`. The job reads the terms (venue, band, period timing, slots) and `executing_at` from state and the current time from the latest final testnet block. Output when the slot time has not passed: `{"mode": "observe", "status": "not_yet"}` (unsigned; it says nothing about the time). After it: the `Observation` from section 3 plus `"status": "observed"` and `"sig"`. The sample is the first mainnet block with timestamp at or after `slot_time`, located and read with `final` finality; until a final block at or after `slot_time` exists, the answer is `not_yet`. At that `block_id` the job calls `get_pool{pool_id}`, `quote{pool_ids, input_token, output_token, input_amount, tag}` for a `10 USDC` sell and buy, and up to `12` `quote` calls per side in a binary search for depth within `band_bps` (`ARCHITECTURE.md` 9.3). Response shapes are recorded from a live call in check 0.7.

## 8. `accord.json`

JSON Schema in `fixtures/schemas/accord.schema.json`: `accord` = `"1"`, `network` in `testnet | mainnet`, then either the simple form (`recipients`: 1 to 8 NEAR account ids, `settlement_authority`: one account id) or the list form (`entries`: 1 to 64 objects `{recipient, settlement_authority}`), optional `contact`. Served as `application/json`, at most `8 KB` (simple) or `64 KB` (list), over HTTPS with a valid certificate. The Payee job accepts both forms.

Demo domain: so that `make demo` works for a reader with fresh faucet accounts, the app serves the list form at its own host's `/.well-known/accord.json`, built from vendor accounts that registered in the last 24 hours through `POST /api/demo-vendor/register` with a NEP-413 signature by the recipient account over `accord:demo-vendor:v1:<recipient>:<authority>`. Proofs from this domain carry `demo_domain: true` and every screen says `demo domain`; the README says a vendor's own domain works the same way.

Adi's vendor domain (`DEMO_VENDOR_DOMAIN`) serves the list form from `fixtures/companies/halcyon/accord.json`, with two entries: the hosted demo's recipient and authority, and the `/try` room's.

## 9. Database (Postgres)

```sql
create table inbox_messages (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  visitor_hash text not null,                 -- sha256(ip || daily salt); no raw IPs stored
  sender text not null check (length(sender) <= 120),
  subject text not null check (length(subject) <= 160),
  body text not null check (length(body) <= 2000),
  agreement text not null,
  processed_at timestamptz,
  agent_action jsonb,
  outcome text,                               -- ERR_* | sent | no_action | preflight_blocked | needs_human
  tx_hash text
);
create index on inbox_messages (visitor_hash, received_at);
create table preflight_approvals (agreement text, recipient text, buyer text, signature text, approved_at timestamptz, primary key (agreement, recipient));
create table demo_vendors (recipient text primary key, authority text not null, registered_at timestamptz not null);
create table try_rooms (agreement text primary key, opened_at timestamptz not null, closed_at timestamptz,
                        items_paid int not null default 0, status text not null);   -- open | exhausted | closed
create table heartbeats (service text primary key, at timestamptz, detail jsonb);
create table faucet_grants (day date not null, kind text not null check (kind in ('account', 'ip')), subject text not null,
                            granted_at timestamptz not null default now(), primary key (day, kind, subject));
                            -- one drip per account each UTC day; one 'ip' row per account funded from a client IP
                            -- (subject '<salted sha256>:<account>'), at most FAUCET_PER_IP_PER_DAY (default 10) a day
```

## 10. Make targets and the lines they print

Every target prints a block that starts with `accord <target> · <agreement>` and ends with a summary line. Values in angle brackets are real values at run time; everything else is literal. The README quotes these blocks from a real run. Demo agreements add `· demo timings` to the first line.

`make negotiate`

```
accord negotiate · <agreement> · procurement
  buyer     commitment <8 hex>… · ciphertext <n> KB on chain
  vendor    commitment <8 hex>… · ciphertext <n> KB on chain
  request   outlayer.testnet · project <owner>/accord-sealed-table · wasm <8 hex>…
  model     <model id> · gateway and model attestation ok · fresh nonce <8 hex>… · signer <address>
  rounds    <QUOTE → COUNTER → FINAL → ACCEPT> · <n> responses · <n> signatures ok
  limits    pass · within both mandates (values not shown)
  terms     <total> USDC · <n> items · terms <8 hex>…
  signed    sealed-table key <key> · signature ok on chain
  sealed    sanity check: buyer → vendor mandate ERR_SEALED · vendor → buyer mandate ERR_SEALED
  state     Attested · <seconds> s
```

`make attack`

```
accord attack · <agreement> · agent key <key>
  inbox     "<message 1>" → agent: pay item 1 to <attacker account>
  preflight block: not the authorised recipient · preflight off for this run, sending anyway
  refused   ERR_PAYEE_MISMATCH · seq <n> · block <h> · tx <hash>
  inbox     "<message 2>" → agent: pay item 1, <amount> USDC
  refused   ERR_AMOUNT_MISMATCH · seq <n> · block <h> · tx <hash>
  inbox     "<message 3>" → agent: pay item 1 to <canary>
  canary    ERR_CANARY · seq <n> · agent key <key> revoked and deleted · tx <hash> (final)
  agent     next call: AccessKeyDoesNotExist (rejected by the network, no receipt)
  escrow    <x> USDC before · <x> USDC after · 0 USDC moved by attempts
```

`make revoke`

```
accord revoke · <agreement>
  before    1 key · <key> · FunctionCall · receiver <agreement> · methods [act] · allowance <a> NEAR
  revoke    buyer <account> · tx <hash> · revoke_agent → DeleteKey <key> (final)
  after     0 keys · agent call: AccessKeyDoesNotExist (rejected by the network, no receipt)
  install   buyer · tx <hash> · AddKey <new key> · FunctionCall [act] · allowance <a> NEAR
  resume    agent pays item <n> · payment_sent <amount> USDC → <recipient> · tx <hash>
```

`make market-making`

```
accord market-making · <agreement> · rhea-dcl <pool short id>
  period 1  slot times held in the observer's enclave
  slot 1    mainnet block <h> · spread <n> bps · depth <bid> / <ask> USDC · pass | fail
  …         (one line per slot; not_yet lines are not printed)
  closed    <k> of <n> passed · threshold <t> · uptime <u>% · Eligible
  paid      agent pays period 1 · payment_sent <amount> USDC → <recipient> · tx <hash>
  strict    <other agreement> · period 1 · <k> of <n> passed · threshold <t> · Withheld
  scope     venue-level liquidity, not the market maker's own orders
```

`make verify DEAL=<agreement>` (no keys needed)

```
accord verify · <agreement>
  code      code hash <8>… = release <v> (<global by hash | embedded>) · no deploy method · ok
  keys      <0 | 1> key · FunctionCall · receiver self · methods [act] · no full access · ok
  release   sealed-table wasm <8>… · keys from pubkey run <task id> · attestation verified · seed binding <shown | not exposed> · ok
  sealed    outcome signature ok · commitments match · nonce matches · ok
  model     <model> · attestation report fetched with fresh nonce <8>… · nonce bound in the report · the model is attested as served now; the run's own attestation is bound in the signed outcome (sealed check) · hardware quote and GPU evidence not checked here (make probe-ai checks them) · partial
  payee     <recipient> · proof <domain> · authority approved · buyer accepted · active · ok
  record    <n> payments · <n> refusals · <n> exceptions · <n> set aside · <n> observation conflicts · events match state · ok
  verify: <n> checks ok[ · <n> partial][ · <n> failed][ · <n> not checked]
```

A check is `ok`, `partial` (part of it ran and passed, the detail names the part not run here), `FAIL` or `not checked`; `partial` and `not checked` never count as `ok`. An account that does not exist or does not run the agreement code prints one line, `verify: <account> is not an Accord agreement`, and exits `1`.

`make verify` fetches NEAR AI's attestation report without a key when the endpoint allows it (it did on 31 Oct); otherwise it uses `NEARAI_API_KEY` if set, or the hosted relay at `/api/verify/<id>` with a nonce it generates itself, and prints which.

`make demo`

```
accord demo · faucet accounts · token <USDC | tUSDC (test token, 6 decimals)>
  <mm:ss>  accounts   <buyer> · <vendor> · <authority> · <recipient>
  <mm:ss>  created    <agreement> · demo timings
  <mm:ss>  sealed     both mandates committed
  <mm:ss>  recipient  proven on the demo domain · approved · accepted · active
  <mm:ss>  attested   <total> · <n> items
  <mm:ss>  executing  approved by both · funded <total>
  <mm:ss>  delivery   item 1 submitted · accepted
  <mm:ss>  paid       item 1 · <amount> → <recipient>
  <mm:ss>  refused    ERR_PAYEE_MISMATCH (one attack)
  demo: full loop in <m:ss>
```

`make sandbox` ends with `sandbox: all checks passed`; every mocked step is prefixed `[mock]`. `make inbox` sends the `redirect`, `amount` and `question` fixtures and prints one line per message (`<n> "<subject>" → refused ERR_… | no action`) and `attempts <a> → <b> · paid outside the terms: 0`. `make check-deploy` prints `check-deploy: release <v> · wasm <8>… · no mock symbols · <n> agreements match`.

## 11. SDK (`@accord/sdk`)

```ts
const accord = new Accord({ network: "testnet", factory: "accord-v2.testnet", rpc?: string, signer?: Signer });

// factory
accord.createAgreement(args: CreateArgs, opts?: { deposit?: string }): Promise<string>        // agreement account id
accord.listAgreements(opts?: { party?: string; from?: number; limit?: number }): Promise<AgreementSummary[]>
accord.release(version?: number): Promise<Release>

// one agreement
const a = accord.agreement("a7.accord-v2.testnet");
a.get(); a.terms(); a.items(); a.dueItems(); a.refusals(from?, limit?);
a.recipients(); a.exceptions(); a.periods(); a.observations(period); a.receipts(); a.budget();
a.events(opts?: { fromBlock?: number }): AsyncIterable<AccordEvent>

// principals (signer = the party's key or wallet)
a.sealMandate(mandate: Mandate, opts: { role: "buyer" | "vendor"; docKey: DocKeySource }): Promise<{ commitment: string; txHash: string }>
  // checks the release's mandate key against its pubkey run's attestation record before encrypting
a.startNegotiation(); a.approveTerms(termsHash); a.cancel();
a.fund(amount: string)                                                   // ft_transfer_call(…, "fund")
a.proposeRecipient(account, domain); a.approveRecipient(v); a.acceptRecipient(v, { acknowledgeWarnings }); a.activateRecipient(v); a.cancelRecipientChange(v);
a.installAgentKey(publicKey, allowance); a.revokeAgent();
a.submitDelivery(item, evidenceHash, uri); a.acceptDelivery(item); a.disputeDelivery(item, reason);
a.requestException({ item, amount, waiveEvidence, reason }); a.approveException(id); a.rejectException(id);
a.resolvePeriod(period, pay); a.claim(item); a.close(); a.mutualClose(); a.withdrawNear();
a.decryptDocument(docKey: DocKeySource): Promise<TermsDocument>

// the agent (signer = KeyPairSigner for the function-call key; signerId = the agreement account)
a.pay({ item, amount, recipient, memo }, opts?: { preflight?: "on" | "off" }): Promise<ActResult>
a.agentRequestException({ item, amount, waiveEvidence, reason }): Promise<ActResult>
type ActResult = { status: "sent" | "failed" | "refused" | "exception_requested" | "preflight_blocked" | "needs_human";
                   code?: string; seq?: number; txHash?: string; reasons?: string[] };

// checks
preflight(accord, agreement, recipient): Promise<{ rating: "allow" | "warn" | "block"; reasons: string[]; signals: Signals; approvedByBuyer: boolean }>
verify(accord, agreement, opts?: { nonce?: string; factories?: string[] }): Promise<VerifyReport>   // `code` fails unless a known factory registered the account as a<id>.<factory>, its job keys are the release's and its token, outlayer and keeper are the factory's
sealedCheck(accord, agreement, as: "buyer" | "vendor", key: DocKeySource): Promise<"ERR_SEALED" | "READABLE">   // a sanity check, not a proof
```

Built on `near-api-js` (version pinned in `DECISIONS.md`; 7.x is a single package). Sealing uses `eciesjs` and `canonicalize`. The app wraps NEAR Connect as a `Signer`.

## 12. MCP server (`@accord/mcp`)

Run `npx @accord/mcp` (stdio) or `npx @accord/mcp --http 8787`. Tools:

| Tool | Input | Needs | Notes |
| --- | --- | --- | --- |
| `accord_list_agreements` | `{ party? }` | nothing | |
| `accord_get_agreement` | `{ agreement }` | nothing | |
| `accord_due_items` | `{ agreement }` | nothing | |
| `accord_preflight` | `{ agreement, recipient }` | nothing | `allow` · `warn` · `block` with reasons, and whether the buyer approved it |
| `accord_pay` | `{ agreement, item, amount, recipient, memo? }` | `ACCORD_AGENT_KEY` | Runs preflight: `block` refuses to sign; `warn` returns `needs_human` unless the buyer approved the recipient in the app |
| `accord_request_exception` | `{ agreement, item, amount, waive_evidence, reason }` | `ACCORD_AGENT_KEY` | |
| `accord_refusals`, `accord_receipts` | `{ agreement, limit? }` | nothing | |
| `accord_verify` | `{ agreement }` | nothing | |
| `accord_seal_mandate`, `accord_approve_terms`, `accord_submit_delivery`, `accord_propose_recipient` | as in the SDK | `ACCORD_PRINCIPAL_KEY` and `ACCORD_PRINCIPAL_ACCOUNT` | Off unless both are set; never accepts a key as a tool argument |

## 13. CLI (`accord`)

`accord <command> [--network testnet] [--factory <id>] [--as buyer|vendor|authority|agent|keeper] [--json]`. Commands: `create`, `seal`, `negotiate`, `approve`, `fund`, `recipient propose|approve|accept|activate|cancel`, `deliver`, `accept`, `dispute`, `agent install|revoke`, `pay`, `exception request|approve|reject`, `period resolve`, `claim`, `close`, `withdraw`, `show`, `refusals`, `receipts`, `check <account>` (preflight), `verify`, `sealed-check`, `watch`, `recycle` (sends the recipient's test USDC back to the buyer between rehearsals). `--as` picks the key from `.env`. The make targets call the CLI.

## 14. App routes and HTTP API

Pages: `/` (deal rooms), `/agreements/new`, `/agreements/[id]` (deal room: the four-state strip, terms, recipient, items, exceptions, the refusal log as a live region, receipts, the keys panel, agent approvals, the Verified panel), `/agreements/[id]/invoice` (`docs/build/WIN_PLAN.md` lever 4: the items as an invoice with amounts, due dates and the Fund button; the 1Click quote once lever 9 ships), `/market-making` (alias `/atlas`), `/payee` (file generator and checker), `/try` (the open inbox), `/verify` and `/verify/[id]`, `/record` (ledger), `/join`, `/docs`, `/status`.

| Route | Method | Returns | Notes |
| --- | --- | --- | --- |
| `/api/agreements` | GET | summaries | From the factory view; 15 s cache; `source` and `block` in every response |
| `/api/agreements/[id]` | GET | `AgreementView` and items | Same |
| `/api/agreements/[id]/events` | GET | events after a cursor | Method per check 0.8 |
| `/api/verify/[id]` | GET | `VerifyReport` | `?nonce=<64 hex>` from the client; relays NEAR AI's report when a key is needed; the client verifies |
| `/api/inbox` | POST | `{ id }` | `{ sender, subject, body }`; 10 an hour per visitor and `TRY_MAX_MESSAGES_PER_HOUR` in all; no key, no contract call |
| `/api/inbox/stats` | GET | `{ attempts, last_refusal, paid_outside_terms, approved_payments }` | Computed from the contract's events; `paid_outside_terms` is `0` by construction and shown as counted |
| `/api/record.csv` | GET | CSV | Columns: `date_utc, agreement, item, description_hash, amount_usdc, recipient, via, status, inference_cost_usd, transaction_url` |
| `/api/payee/check` | GET | the file check result | Advisory onboarding check from the server; the binding proof is the Payee job's |
| `/api/preflight/approve` | POST | `{ ok }` | `{ agreement, recipient, signature, public_key }`: a NEP-413 signature by the buyer over `accord:preflight:v1:<agreement>:<recipient>`; checked against the buyer's keys over RPC |
| `/api/preflight/approvals` | GET | approvals | Read by the MCP server |
| `/api/relay` | POST | `{ hash, sender, included }` | `{ signedDelegate }` (NEP-366, base64 borsh); testnet; calls into Accord only, at most 1 yoctoNEAR attached, never `act`; answers within about 10 s once the relayer's transaction is `INCLUDED` or on its way |
| `/api/relay/status` | GET | `{ final: false, status }` or `{ final: true, outcome }` | `?hash=&sender=`; the outcome's status is the user's own call; a failed relayer transaction is an error with nearcore's kind (`AccessKeyNotFound`); short cache, rotating provider |
| `/api/demo-vendor/register` | POST | `{ ok }` | `{ recipient, authority, signature, public_key }`; NEP-413 by the recipient; adds the pair to the demo domain for 24 hours |
| `/.well-known/accord.json` | GET | the demo domain's list-form file | Only registered pairs; `contact`: "Accord demo domain" |
| `/api/status` | GET | heartbeats | Keeper, agent, re-arm (the open room, rooms opened today against the cap), last job runs, RPC |

No route accepts a field named or shaped like a mandate; `app/tests/no-mandate-routes.test.ts` fails if one does.

## 15. Environment variables (`.env.example` lists names only)

| Variable | Used by | Meaning |
| --- | --- | --- |
| `NEAR_NETWORK`, `NEAR_RPC_URL`, `NEAR_RPC_FALLBACK_URL`, `NEAR_ARCHIVAL_RPC_URL` | all | `testnet`; endpoints from DECISIONS. `NEAR_RPC_URL` may be a comma-separated list; the SDK's `RotatingRpcProvider` tries it first, then `RPC.testnet.urls`, moving on only after a rate limit or a transport failure (DECISIONS section 28) |
| `NEAR_MAINNET_RPC_URL`, `NEAR_MAINNET_ARCHIVAL_RPC_URL` | scripts (`make probe-venue`, `make verify`) | Read-only mainnet views for the venue |
| `ACCORD_FACTORY`, `ACCORD_TOKEN` | all | Factory account; token id (USDC or tUSDC) |
| `FACTORY_KEY` | scripts | Deploy and owner key for the factory (never on Railway) |
| `BUYER_ACCOUNT`, `BUYER_KEY`, `VENDOR_ACCOUNT`, `VENDOR_KEY`, `AUTHORITY_ACCOUNT`, `AUTHORITY_KEY`, `RECIPIENT_ACCOUNT`, `RECIPIENT_KEY` | scripts, CLI | Demo principals (`RECIPIENT_KEY` only for `accord recycle`) |
| `CANARY_ACCOUNTS`, `ATTACKER_ACCOUNT` | scripts | Comma-separated canaries; the lookalike used in `make attack` |
| `ACCORD_AGENT_KEY`, `AGENT_AGREEMENT`, `AGENT_PLANNER` (`literal`, `llm`), `AGENT_PREFLIGHT` (`on`, `off`) | agent, MCP | The function-call key's secret; never logged |
| `TRY_BUYER_ACCOUNT`, `TRY_BUYER_KEY`, `TRY_VENDOR_ACCOUNT`, `TRY_VENDOR_KEY`, `TRY_AUTHORITY_ACCOUNT`, `TRY_AUTHORITY_KEY`, `TRY_RECIPIENT_ACCOUNT` | agent (`rearm` mode) | The public demo room's fictional principals, used only to run that room (`ARCHITECTURE.md` section 11) |
| `TRY_MAX_ROOMS_PER_DAY` (default `2`), `TRY_MAX_MESSAGES_PER_HOUR` (default `120`), `TRY_AGREEMENT` (optional) | agent, app | The room caps; `TRY_AGREEMENT` pins `/try` and the agent to one agreement, for a local recording run |
| `ACCORD_PRINCIPAL_KEY`, `ACCORD_PRINCIPAL_ACCOUNT` | MCP | Optional principal tools |
| `KEEPER_ACCOUNT`, `KEEPER_KEY` | keeper | |
| `OUTLAYER_API_URL` (`https://testnet-api.outlayer.ai`), `OUTLAYER_PAYMENT_KEY`, `OUTLAYER_OWNER` | keeper, scripts | Observer polls through the HTTPS API |
| `NEARAI_API_KEY` | agent (`llm` planner), app (verify relay), scripts | The Sealed Table's own key is an OutLayer secret, not an env var |
| `DATABASE_URL` | app, agent, keeper | Postgres |
| `INBOX_DAILY_SALT` | app | For visitor hashes |
| `DEMO_VENDOR_DOMAIN` | scripts | The vendor domain Adi serves for the hosted agreements |
| `DEMO_TIMINGS` | scripts | `on` creates agreements with `mode: "demo"` |

OutLayer secrets (set with the OutLayer CLI or dashboard, never in the repository): `NEARAI_API_KEY` on the Sealed Table project, under the S1 condition; `PROTECTED_SEALED_SEED`, `PROTECTED_PAYEE_SEED`, `PROTECTED_OBSERVER_SEED`, each generated inside the TEE and bound to its release build, the first two under the S1 condition. S1 is a direct-calls-only condition (`--direct`) admitting `^a[0-9]+\.<factory>$` and `releases.<factory>`; probe 0.3 records the exact command.

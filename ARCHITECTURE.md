# ARCHITECTURE.md: how Accord fits together, and why

Read `GOAL.md` first for what ships and the claims it must keep. This file is the design: components, accounts and keys, the lifecycle, each part in depth, the invariants, the threat model, failure handling and costs. `INTERFACES.md` has the exact signatures. Where this file names a value that must be checked against live docs (a contract id, an SDK version), `PROGRESS.md` Phase 0 verifies it and records the answer in `DECISIONS.md`; `DECISIONS.md` wins over this file. Revised on 31 Oct after an independent review (`DECISIONS.md` section 10 lists what changed).

## 1. The system at a glance

```
 Buyer principal (wallet)       Vendor principal (wallet)      Vendor settlement authority (separate wallet)
   seal mandate, approve terms,   seal mandate, approve terms,   approve_recipient
   fund, accept recipient,        propose recipient,
   accept delivery, exceptions,   submit delivery, claim,
   revoke / install agent key     request exception
        │                                │                                │
        ▼                                ▼                                ▼
 ┌──────────────────────────────────── NEAR testnet ─────────────────────────────────────────┐
 │ accord factory: releases (code hash, job keys), agreement registry, reports, blocklist    │
 │   ├── releases.<factory>   no keys; requests the jobs' pubkey runs                        │
 │   └── a<id>.<factory>   one account per agreement                                         │
 │         code: release N, pinned by hash        keys: none, or one FunctionCall key (act)  │
 │         holds: USDC (NEP-141) in escrow, terms, recipient record, refusal log, receipts   │
 │ outlayer.testnet  request_execution → yield/resume → our callback                         │
 │ USDC token  ft_transfer from the agreement account, callback to the agreement             │
 └───────────────────────────────────────────────────────────────────────────────────────────┘
        ▲ act(Pay …) signed with its one key                ▲ outputs signed by seed-derived job keys
        │                                                   │
 Buyer's agent (literal planner or LLM, via SDK/MCP)    OutLayer TEE jobs (Intel TDX, wasm32-wasip2)
   preflight: allow · warn · block                         Sealed Table · Payee · Observer
                                                            │ HTTPS from inside the enclave, pinned endpoints
                                                            ▼
                         NEAR AI Cloud (gateway and model TEEs) · vendor domain · NEAR RPC (testnet, mainnet)
 Keeper: starts negotiations, activates recipients, polls the observer, closes periods and agreements
 App: deal rooms, Verified panel, /try inbox, /record, /verify; encrypts mandates in the browser
```

The design rule behind every choice: the output of each step is the input the next step enforces. The Sealed Table's terms become the contract's policy; the policy names the recipient; the recipient is what revocation protects; the observer's evidence is what releases an Atlas payment.

A second rule, learned from the review: an enclave job never trusts its caller's input. Every job reads what it needs from the agreement's own state, over RPC endpoints compiled into the build, so two callers asking the same question get the same signed answer, and nobody can feed a job chosen data.

## 2. Components

| Component | Path | Runs | Trusted for | Never trusted for |
| --- | --- | --- | --- | --- |
| Core logic | `crates/accord-core` | Inside the contract and the jobs (pure Rust, no `near-sdk`) | Deterministic checks: payment gates, limit checks, Atlas slot times and pass rule, canonical hashing | Nothing outside its inputs |
| Agreement contract | `contracts/agreement` | Each agreement account (one code hash per release) | Holding the escrow and enforcing the terms | It never trusts a caller's claim; it checks signatures, predecessors and its own state |
| Factory | `contracts/factory` | The factory account | Creating agreement accounts with pinned code; publishing releases; recipient reports and the curated blocklist | It cannot call, upgrade or drain an agreement |
| Releases account | `contracts/releases` | `releases.<factory>`, no keys | Requesting the jobs' `pubkey` runs on chain, with the input fixed in its code | It can request nothing else, which is why S1 can admit it |
| Sealed Table job | `jobs/sealed-table` | OutLayer TEE | Decrypting mandates, running the negotiators, the limit checks, signing the outcome | Its output is checked by the contract (signature, nonce, commitments, structure, parameters) and approved by both people |
| Payee job | `jobs/payee` | OutLayer TEE | Fetching the domain file over TLS, computing recipient signals, signing the proof | The authority's approval and the buyer's acceptance are still required |
| Observer job | `jobs/observer` | OutLayer TEE | Drawing hidden slot times from its seed, reading the venue at one block, signing the observation | The pass rule is applied by the contract, not the job |
| Keeper | `services/keeper` | Railway worker | Liveness only: it calls permissionless methods and polls the observer | It holds no secret that affects an outcome; it cannot move funds, choose observations or change a result |
| Demo buyer agent | `services/agent` | Railway worker | Nothing: it is deliberately literal | Everything it asks for is checked by the contract |
| `/try` re-arm | `services/agent` (`rearm` mode) | Railway worker, holds the `/try` room's fictional buyer, vendor and authority keys | Re-installing the demo agent's key after a canary or limit revocation, making the next item due, and opening a new room when one is used up, within a daily cap; labelled on `/try` and `/status` | It runs only for the public demo room; real agreements are re-armed only by their buyer |
| SDK, MCP server, CLI | `packages/sdk`, `packages/mcp`, `packages/cli` | Wherever an agent or a person runs them | Convenience and the preflight check | The contract re-checks everything |
| App | `app` | Railway web service | Showing state with its source and time; encrypting mandates in the browser | It never sees a mandate in plaintext and holds no key that can move funds |

## 3. Accounts and keys

| Account | Example | Keys on it | Held by | Can do |
| --- | --- | --- | --- | --- |
| Factory | `accord-v1.testnet` | Full access during the hackathon; in production the key is deleted after the last upgrade | Adi (`.env`, deploy machine) | Publish releases, ask the releases account for the jobs' `pubkey` runs, curate the blocklist. Cannot touch an existing agreement |
| Releases | `releases.accord-v1.testnet` | None, ever | Nobody | Its code requests the jobs' `pubkey` runs when the factory asks, with the input fixed to `{"mode": "pubkey"}`; the only account besides agreements that S1 admits |
| Agreement | `a7.accord-v1.testnet` | No full-access key, ever. At most one `FunctionCall` key: receiver = itself, methods = `act`, fixed allowance | The agent holds the private half | The key can call `act` and nothing else |
| Buyer | `northwind-demo.testnet` | The buyer's wallet | The buyer's people | Principal actions for the buyer |
| Vendor | `halcyon-demo.testnet` | The vendor's wallet | The vendor's people | Principal actions for the vendor |
| Vendor settlement authority | `halcyon-auth.testnet` | A separate wallet (in production, a multisig such as a Sputnik DAO) | The vendor's finance function | Approve a recipient |
| Recipient | `halcyon-mm.testnet` | The vendor's | The vendor | Receive USDC |
| Keeper | `accord-keeper.testnet` | Full access to itself only | The keeper service (Railway env) | Call permissionless methods; pay for observer polls |
| Canaries | `halcyon-mm-payments.testnet`, `halcyon-treasury.testnet` | Exist, hold nothing | Nobody uses them | A payment request naming one deletes the agent's key |
| `/try` room | `northwind-try.testnet` (buyer), `halcyon-try.testnet` (vendor), `halcyon-try-auth.testnet` (authority), `halcyon-try-mm.testnet` (recipient) | Their own | The re-arm process (Railway env); the recipient's key is not needed | Run the public demo room and nothing else (section 11) |
| OutLayer | `outlayer.testnet`, `worker.outlayer.testnet` | Theirs | OutLayer | Run jobs, resolve yields |

Each agreement account is the agent's working account for that agreement: the agent has no other account and holds no other key. Every transaction it sends has `signer_id` = the agreement account; gas is paid from the agreement's balance and counted against the key's allowance.

### 3.1 What the agent's key can and cannot do (the README section, in plain words)

- It can call one method, `act`, on one account, the agreement it works for. The receiver and the method list are part of the key, enforced by the NEAR protocol before any code runs.
- It cannot attach NEAR to a call, transfer NEAR, add or delete keys, deploy code, delete the account, or call any other contract. The USDC transfer is made by the agreement's own code after `act`'s checks pass; the key never touches the token contract.
- It spends gas from a fixed allowance set when the buyer installs it (`0.5 NEAR` by default). The network reserves gas at `0.001 NEAR` per TGas before each call and credits the unused part back, so `0.5 NEAR` allows about six calls in flight and a few hundred in total. A key's allowance cannot be raised; when it runs out the agent stops (`NotEnoughAllowance`) and the buyer installs a new key. This also caps a compromised agent's ability to flood the refusal log.
- One buyer transaction (`revoke_agent`) ends it: the contract marks the key revoked in that receipt, so `act` refuses it at once (`ERR_REVOKED`), and the `DeleteKey` action in the same transaction removes it from the account about a block later, after which the network rejects anything it signs (`AccessKeyDoesNotExist`). A canary request, or `refusal_limit` refusals by this key inside `refusal_window_secs`, does the same automatically.
- `act` is never relayed as a meta transaction: through a relayer, `signer_account_pk` would be the relayer's key and the contract could not tell the agent's key apart.
- It cannot change the terms, the recipient, the amounts or the evidence. Those change only through the principals' own transactions.

## 4. The agreement as an account

- Creation: the buyer calls `factory.create_agreement(args)` with a deposit (`create_deposit` in factory config: `2 NEAR` on testnet with a global release, `3.5 NEAR` with an embedded one). The buyer pays it, not the factory. Only the direct parent can create a sub-account, so agreements live under the factory account. The factory creates `a<id>.<factory>` in one batch: `CreateAccount`, `Transfer`, `UseGlobalContract` by hash (or `DeployContract`), `FunctionCall new(init)`. There is no `AddKey` action in that batch, so the account starts with no keys, and after the batch only the agreement's own code can manage its keys. `new` calls `storage_deposit` for itself on the token contract (`0.00125 NEAR`) so it can be funded.
- Parameters fixed at creation and carried into every job and check: `mode` (`live` or `demo`), `timelock_secs`, `claim_delay_secs`, `grace_secs`, `acceptance_window_bounds`, `require_two_sided`, `observation_grace_secs`, `refusal_limit`, `refusal_window_secs`, `agent_allowance`, the canaries and the keeper. The factory enforces the live minimums (`timelock_secs ≥ 86400`, `claim_delay_secs ≥ 259200`, `grace_secs ≥ claim_delay_secs + 86400`).
- Pinned code: releases are NEP-591 global contracts referenced by code hash (live on testnet; `near-sdk` has `use_global_contract` since 5.17). A reference by hash cannot change; a reference by account id would follow the publisher's updates, so it is never used. The agreement has no method that deploys code, and with no full-access key nobody can deploy over it. Publishing a global contract burns `0.0001 NEAR` per byte (about `10 NEAR` for a `100 KB` wasm), so development uses the embedded mode and the hosted demo uses the global mode; `release.mode` records which.
- State layout: the root struct stays under `1 KB` (ids, state, counters, small flags). Everything variable lives in `near_sdk::store` collections that load lazily: commitments and ciphertexts, terms, items, recipient versions, the refusal ring buffer, exceptions, observations, receipts. A call reads and writes only what it touches. `make test` includes a gas-ceiling test: a refused `act` under `15 TGas`, a paying `act` under `50 TGas`.
- Balance: the creation deposit covers state storage (target under `40 KB`, so about `0.4 NEAR` staked at `1 NEAR` per `100 KB`), both mandates' storage (so neither party attaches a deposit), the agent's gas, OutLayer runs requested on chain (Sealed Table and Payee, about `0.01` to `0.03 NEAR` each), the account creation charge (`0.007 NEAR`) and storage deposits on the token. `get_budget()` reports what is left; the buyer tops up with a plain transfer. The liquid balance must stay above the storage stake or the agent's transactions fail with `LackBalanceForState`; every collection that can grow from outside is capped (section 6).
- Ending: terms count time from `executing_at` (the second approval). Deliveries are accepted until `executing_at + duration_secs`, and an item can be delivered again only after a dispute, so every acceptance window has closed by `executing_at + duration_secs + acceptance_window_secs`. After `executing_at + duration_secs + grace_secs`, once no acceptance window is open and `close_period` has run for every Atlas period (anyone can call it), anyone can call `close()`. It works one item per call. Each eligible unpaid item is paid to the current recipient. An item it cannot pay (no active recipient, or the token refuses the transfer) is set aside as `Reserved`, and the vendor can still `claim` it later, after `Settled` too. An item the escrow cannot cover is recorded as `Unfunded`. A `Review` period nobody resolved counts as not eligible. Then the token balance the account actually holds (read with `ft_balance_of`, so stray deposits come back too), minus the reserved amounts, returns to the buyer, and the state becomes `Settled`. Nothing a vendor or a recipient does can hold the buyer's refund past those times. After `Settled` the buyer can `withdraw_near()` the liquid NEAR above the storage stake. Every state has a path to `Settled`, `NoDeal` or `Cancelled`.
- The record: the account's state plus its NEP-297 events are the record both companies can cite. The account is never deleted in v1.

## 5. Lifecycle

```
Sealed ──(both commitments, start_negotiation, signed outcome)──▶ Attested ──(both approve the same terms hash)──▶ Executing ──(close)──▶ Settled
   │                                                              │
   ├── NoDeal  (walk away, limit check failed, or three infrastructure failures; nothing to refund)
   └── Cancelled (either party, before Executing)
```

| Step | Who | Method | Effect | Event |
| --- | --- | --- | --- | --- |
| Create | Buyer | `factory.create_agreement` | Account created, state `Sealed`, sub-status `AwaitingMandates` | `agreement_created` |
| Seal | Buyer, then vendor | `commit_mandate(commitment, ciphertext, doc_pubkey, doc_key_signer)` | Stored; no deposit; replaceable until negotiation starts | `mandate_committed` |
| Negotiate | Anyone (the keeper, or either party in the app) | `start_negotiation()` with at least `280 TGas` | OutLayer request carrying only the agreement id and a fresh nonce; sub-status `Negotiating` | `negotiation_requested` |
| Outcome | The agreement's own callback | `on_sealed_result` (private) | Section 8.4; state `Attested` or `NoDeal`; an infrastructure failure returns to `Ready` (at most 3 attempts) | `terms_proposed`, `no_deal` or `negotiation_failed` |
| Approve | Buyer and vendor | `approve_terms(terms_hash)` | When both match: state `Executing`, `executing_at` set, items created | `terms_approved`, `executing` |
| Fund | Buyer (or its DAO) | `token.ft_transfer_call(agreement, amount, "fund")` | Escrow credited up to the terms total; any excess returned by NEP-141 | `funded` |
| Recipient | Vendor, authority, buyer | `propose_recipient`, `approve_recipient`, `accept_recipient`, `activate_recipient` | Section 7; allowed in any state before `Settled`, so the proof can run while the negotiation does, and after it while an item is set aside | `recipient_*` |
| Agent key | Buyer | `install_agent_key(pk, allowance)` / `revoke_agent()` | Adds the one `FunctionCall` key; or marks it revoked at once and deletes it in the same transaction | `agent_key_installed`, `agent_key_revoked` |
| Evidence (procurement) | Vendor, buyer | `submit_delivery`, `accept_delivery`, `dispute_delivery` | An item becomes eligible on acceptance, or when the acceptance window lapses without a dispute. Deliveries are accepted until the end of the term; a disputed item can be delivered again before then | `delivery_submitted`, `delivery_accepted`, `delivery_disputed` |
| Evidence (market-making) | Anyone (the keeper) | `record_observation`, `close_period` | Section 9 | `observation_recorded`, `period_closed` |
| Decide a period | Buyer | `resolve_period(period, pay)` | A `Review` period becomes payable or closed | `period_resolved` |
| Pay | Agent | `act(Pay{item, amount, recipient})` | Six gates, then `ft_transfer` with a lock | `act_refused` or `payment_sent`, then `payment_settled` / `payment_failed` |
| Exception | Agent or vendor asks, buyer decides | `act(RequestException{…})`, `request_exception(…)`, `approve_exception`, `reject_exception` | A one-off change for one item: a new amount within the total, and optionally waiving its evidence; never a recipient change | `exception_*` |
| Claim | Vendor | `claim(item)` | After `claim_delay_secs` past eligibility, the vendor pulls an eligible payment to the authorised recipient, agent or no agent; an item `close` set aside stays claimable after `Settled` | `payment_sent` (`via: claim`) |
| Close | Anyone after the end; or both parties by `mutual_close` | `close()` | Pays eligible items, sets aside any it cannot pay for the vendor's claim, refunds the rest of the real token balance to the buyer, `Settled` | `payment_sent` (`via: close`), `item_reserved`, `settled` |

## 6. The payment path

`act(Pay{item, amount, recipient, memo})`, called with the agent's key. Authentication first, outside the gates: `predecessor_account_id == current_account_id` (true for any key on the account, so not enough alone) and `signer_account_pk` is the current agent key or one of the last `8` revoked keys. Anything else panics with `ERR_UNAUTHORIZED` (no record, because it cannot be the agent). Then six gates in a fixed order. The first failure is recorded and `act` returns `Refused{code}` normally; it never panics on a refusal.

| Gate | Checks | Refusal codes |
| --- | --- | --- |
| 1. Key and state | The key is not revoked (covers the block between the revoke and its `DeleteKey`); state is `Executing` | `ERR_REVOKED`, `ERR_NOT_EXECUTING` |
| 2. Recipient | Not a canary (a canary also deletes the key); an active authorised recipient exists; `recipient` equals it | `ERR_CANARY`, `ERR_NO_RECIPIENT`, `ERR_PAYEE_MISMATCH` |
| 3. Item | The item exists and is unpaid | `ERR_UNKNOWN_ITEM`, `ERR_ALREADY_PAID` |
| 4. Evidence | Procurement: delivery accepted, or the window lapsed with no dispute. Market-making: the period closed `Eligible` or was resolved to pay. Either kind: an approved exception that waives evidence | `ERR_NOT_DUE`, `ERR_PERIOD_WITHHELD` |
| 5. Amount | Equals the item amount (or its approved exception amount); paid plus amount stays within the total; the escrow covers it | `ERR_AMOUNT_MISMATCH`, `ERR_CAP_EXCEEDED`, `ERR_INSUFFICIENT_FUNDS` |
| 6. Lock | No payment in flight | `ERR_IN_FLIGHT` |

On a pass: set `in_flight = {payment_id, item, amount, recipient, via, since_block, escrow_before}` (`payment_id` counts up from 1; `escrow_before` is the contract's own ledger, funded minus paid), then `ft_transfer(recipient, amount, memo)` with `1 yoctoNEAR` from the agreement's balance (the key never attaches a deposit; the contract does), then `.then(on_payment_resolved(payment_id, item, amount, recipient, via))` with a fixed `30 TGas`. In the callback, when `payment_id` matches the lock: success marks the item paid and writes a receipt; failure marks nothing paid and emits `payment_failed` (a failed `via: close` payment sets the item aside as `Reserved`), and the USDC is still in escrow because NEP-141 transfers are atomic in the token contract. Both clear the lock. A callback whose `payment_id` no longer matches, because `resolve_stale_lock` already cleared its lock, never touches the current lock: it settles only its own item (success confirms an `AssumedPaid` item as paid; failure returns it to `Eligible`). The check and the transfer are in one transaction's receipt tree, so there is no signed transfer waiting anywhere.

Stuck lock: if the callback itself ever fails (for example out of gas), `in_flight` would stay set and block payments, claims and `close`. So anyone can call `resolve_stale_lock()` once `in_flight` is older than `600` blocks, and the contract reads `ft_balance_of(self)` from the token. A balance below `escrow_before` can only mean the transfer happened, because nothing else leaves while the lock is held and deposits only add, so the item is marked paid. Any other balance cannot tell: a plain `ft_transfer` into the account, which the contract is never told about, looks the same as a failed payment. Then the item becomes `AssumedPaid`. It counts as paid, so it can never be paid twice, and the parties settle it with an exception: the vendor requests one, and if the buyer approves, the item is payable once more at the approved amount. Either way the lock clears (`lock_resolved`, with the outcome).

Refusal limit: only refusals signed by the current agent key count (not `ERR_REVOKED`, not the vendor's claims). When `refusal_limit` (default `5`) of them fall inside `refusal_window_secs` (default `3600`), the contract revokes the key with reason `refusal_limit`. The canary revokes it at once with reason `canary`.

Bounded storage: the refusal log is a ring buffer of the last `128` refusals (sequence, time, block, code, item, amount, recipient, signer key) plus a counter, and every refusal is also an event, so the full history stays in the chain's logs. Exceptions: at most one pending per item and `16` in total. Nothing an agent can do grows state without a bound.

The vendor's claim exists so the kill switch is not a way to withhold earned money: `claim(item)` runs gates 2 to 6 with the vendor as caller, only once `claim_delay_secs` (default `72 h`, demo `120 s`) have passed since the item became eligible. An item `close` set aside (`Reserved`) stays claimable after `Settled`; until it is claimed, `withdraw_near` keeps `0.05 NEAR` above the storage stake so the claim's transfer can still run.

## 7. Recipient authorisation (Payee)

### 7.1 The domain file

The vendor publishes `https://<domain>/.well-known/accord.json`:

```json
{
  "accord": "1",
  "network": "testnet",
  "recipients": ["halcyon-mm.testnet"],
  "settlement_authority": "halcyon-auth.testnet"
}
```

The file proves control of the domain at the time it is fetched. The authority's approval, made on chain by the authority's own account, proves control of that account. The buyer's acceptance proves the buyer saw both. `/payee` in the app generates the file from a form and checks it. A list form (`entries: [{recipient, settlement_authority}]`) serves the app's labelled demo domain (`INTERFACES.md` section 8) and Adi's vendor domain, which lists the hosted demo's pair and the `/try` room's.

### 7.2 The flow

1. `propose_recipient(account, domain)` by the vendor. Version 1 sets the agreement's domain; later versions must use the same domain, so a stolen authority key cannot move the agreement to a domain the vendor does not control. The contract requests the Payee job on chain with only `{mode, agreement, version}`.
2. The Payee job, inside the enclave, reads the pending version (domain, account) and the agreement's authority from the agreement's state over its pinned RPC, fetches the file over TLS (the worker validates the certificate), checks that `recipients` contains the account and that the authority matches, computes the signals below, and signs the result. `on_payee_proof` verifies the signature, the agreement, the version and the values against state, and stores the version as `Proven` with its rating, or `ProofFailed`.
3. `approve_recipient(version)` by the settlement authority.
4. `accept_recipient(version, acknowledge_warnings)` by the buyer. `block` can never be accepted; `warn` needs `acknowledge_warnings: true`.
5. Activation. Version 1 is active on acceptance. Any later version sets `active_at = now + timelock_secs` and `activate_recipient(version)` by anyone after that time makes it current; until then the old recipient stays current. The buyer or the authority can cancel during the delay.
6. On activation the agreement calls `storage_deposit` for the recipient on the token contract if it is not registered, so a payment cannot fail for that reason.

### 7.3 Recipient signals and their data sources (the security prompt's checkpoint)

| Signal | Source | How it is read | Effect |
| --- | --- | --- | --- |
| The account exists | NEAR RPC `view_account` | JSON-RPC from the job, and from the SDK's `preflight` | Missing: `block` |
| It is a contract | `code_hash` not the empty hash | Same call | `warn` ("receiver is a contract") |
| Its code changed recently | `view_account` at a block about 30 days back on an archival RPC, compared with now | Archival JSON-RPC (`DECISIONS.md`) | Changed: `warn` with both hashes |
| Account age and activity | An indexer's account endpoint, if one is reachable without a key (check 0.8): creation time and transactions in the last 30 days | HTTPS | Younger than 30 days, or no activity: `warn`. If no indexer is reachable, the signal is `unavailable`, never guessed |
| Prior interactions | Payments this buyer's agreements already made to the account (factory `recipient_stats(account, buyer)`), and this agent key's own receipts | View calls | Shown; first payment to an account is noted, not warned |
| Shared reports | The factory's `reports(account)`: refusals naming this account, each with its agreement and refusal sequence as evidence | View call | Any report: `warn` with the evidence links |
| Curated blocklist | The factory's `blocked(account)`, entries with an evidence URL, curated by the factory owner | View call | `block` |
| Canary | The agreement's canary list | Contract state | `block` (and a canary request deletes the key) |
| Domain proof | The file above | HTTPS from the enclave | Missing or mismatched: proof fails |

Reports come from agreements, not from people: when `act` refuses with `ERR_PAYEE_MISMATCH` or `ERR_CANARY`, the agreement calls `factory.report_recipient(account, seq)`. A report only ever produces `warn`, so nobody can get an honest account blocked by attempting payments to it. `block` comes only from a missing account, a canary or the curated list.

The same check runs agent-side as `preflight(agreement, recipient)` in the SDK and the MCP server: `block` refuses to sign; `warn` returns `needs_human` until the buyer approves that recipient for the agent in the app (`/agreements/<id>`, "Agent approvals", a NEP-413 signature by the buyer stored by the app and checked by the MCP server). This is the second line; the contract is the first, and `make attack` runs the agent with preflight off to show the contract's refusals on chain.

## 8. Sealed Table

### 8.1 Keys and who can use them

- Seeds: each job has its own OutLayer `PROTECTED_` secret, generated inside the TEE (`outlayer secrets set --generate PROTECTED_<JOB>_SEED:hex32`): `PROTECTED_SEALED_SEED`, `PROTECTED_PAYEE_SEED`, `PROTECTED_OBSERVER_SEED`. Each is bound to its job's release build by wasm hash. OutLayer's secrets docs allow the secret's owner to move that binding to another build without changing the value, so the deployer (Adi) could, in principle, rebind a seed to a build that reveals it. That is a stated limit of claim 1 and, for the observer's seed, which sets the hidden slot times, of claim 6; `make verify` and `/verify` show the current binding if OutLayer exposes it on chain (check 0.3).
- Keys derived inside each job from its seed with HKDF-SHA256: the Sealed Table's secp256k1 mandate key (`info = "accord/sealed-table/mandate/v1"`) and each job's ed25519 signing key (`info = "accord/<job>/sign/v1"`). OutLayer's own signing keys are not used: they are derived per caller, so they would differ between agreements and no release key could be checked. Seed-derived keys are the same for every caller; probe 0.3 proves it with two callers.
- Who can read the seeds. Requirement S1: only runs requested on chain by an agreement account of this factory (`a<n>.<factory>`), or by the keyless `releases.<factory>` account, whose code only ever sends `{"mode": "pubkey"}`, can read `PROTECTED_SEALED_SEED` and `PROTECTED_PAYEE_SEED`. OutLayer judges a secret's access condition against the transaction's signer unless the condition is set to direct calls only (`--direct`, its `Predecessor` wrapper), and it refuses a run before the code starts when the caller fails the condition of any secret the project reads. So S1 is a direct-calls-only condition (an Account Pattern `^a[0-9]+\.<factory>$`, or a Whitelist holding `releases.<factory>`) combined with One build only (`WasmHash`) for the release build, and it goes on every secret the project reads: on the Sealed Table that is the seed and `NEARAI_API_KEY`, or agreement-requested runs would be refused. Probe 0.3 proves it: an agreement-requested run reads both secrets, while an HTTPS API call, a request from another account and a request the owner sends to OutLayer directly are refused (the owner's `request_pubkeys` still works, because the releases account is the caller OutLayer sees). The job also reads the requesting account from OutLayer's execution context, if exposed, and runs `negotiate` only when it equals the agreement it was asked about. While the factory account keeps its full-access key (during the hackathon, so fixes can ship), the deployer could create an account that matches the pattern and, if the job cannot see its caller, request extra runs; claim 1's limit says so, and in production the factory's key is deleted after its last upgrade. If S1 cannot be met, fallback F2 restricts the seeds to the owner's keeper as signer and claim 1's limit says the operator's keeper could request extra runs. The observer's seed needs no restriction: its outputs are deterministic (section 9), so any caller gets the same signed answer.
- The public keys are published by `pubkey` runs that the keyless `releases.<factory>` account requests on chain when the factory's owner asks, recorded in the release with the runs' attestation task ids. `sealMandate` in the SDK checks, before encrypting, that the release's mandate key came from such a run: the attestation record's wasm hash equals the release's Sealed Table hash and its output hash equals the hash of the recorded `pubkey` output. Full quote verification runs in `make verify`.

### 8.2 Sealing a mandate (in the browser or the SDK)

1. The party writes a mandate (`INTERFACES.md` section 6): a `shared` part the other side's negotiator sees, and private `limits` and `instructions`.
2. The client builds the envelope `{v, agreement, role, party, release, mandate, salt, doc_pubkey, doc_key_signer}`. `salt` is 32 random bytes. `doc_pubkey` is the party's secp256k1 key for the commercial terms document, derived from a NEP-413 signature by the party's wallet over the message `accord:doc-key:v1:<agreement>` with recipient = the agreement account and nonce = `sha256` of that message (so the signature, and the key, can be derived again on any device with the same wallet key); `doc_key_signer` records which wallet public key derived it.
3. `commitment = sha256(JCS(envelope))` (RFC 8785 canonical JSON). `ciphertext = ECIES(mandate_pubkey, JCS(envelope))` in the eciesjs format (secp256k1, HKDF-SHA256, AES-256-GCM), the pattern OutLayer's private-dao example uses.
4. `commit_mandate(commitment, ciphertext, doc_pubkey, doc_key_signer)` from the party's wallet; no deposit (the agreement's balance pays the storage); ciphertext at most `8 KB`.

The envelope binds the mandate to one agreement, one role and one party. A ciphertext copied into another agreement fails inside the enclave, so nobody can replay a counterparty's sealed mandate into a room they control to probe its limits. The ciphertext stays on chain; the plaintext never leaves the party's device except inside it.

### 8.3 The run

`start_negotiation()` requires both commitments, sub-status `Ready` and at least `280 TGas` prepaid, so nobody can burn attempts by starving the call. It draws a fresh 32-byte `request_nonce` from `env::random_seed`, stores `Requested{nonce, attempt}`, and calls `outlayer.request_execution` with `input_data = {mode: "negotiate", agreement, request_nonce}`, `resource_limits` set explicitly (without them the request is compile-only and panics with input), `max_execution_seconds: 100`, the pinned `version_key`, and `.then(on_sealed_result)` with `60 TGas` static. OutLayer answers through a NEAR yield that expires 200 blocks after the request, about `113 s` on testnet, so the run targets under `80 s`; each HTTPS call inside the job has a `30 s` limit, and two timeouts abort the run. Inside the job:

1. Read state, never input. Over the testnet RPC endpoints compiled into the build, with `optimistic` finality and retries for up to `15 s` (the request was written moments earlier), read the agreement's status, nonce, parties, kind, release, model, parameters, both commitments and both ciphertexts. If the status is not `Negotiating` with this nonce, or a read keeps failing, end as an infrastructure failure (retryable).
2. Decrypt both envelopes; recompute each commitment and compare it with the on-chain commitment; check `agreement`, `role`, `party` and `release` against state. A mismatch here can only come from a party's own commitment, so it ends with `NoDeal{BAD_INPUT}`.
3. Fetch NEAR AI Cloud's attestation report once, with a fresh random nonce, and verify both parts: the gateway's (`gateway_attestation`: TDX quote, `report_data` binding its signing key and the nonce, compose hash) and the model's candidates (TDX quote, `report_data`, RTMR3 replay, `MRCONFIGID`, the GPU evidence through NRAS). Accept every model candidate that verifies; a response is accepted only if its signer is one of them. Quote verification uses `dcap-qvl` if it builds for wasip2 (check 0.2); otherwise fallback F5 moves the quote checks to `make verify` and the claims say so. TLS binding cannot be checked from inside the job (the worker terminates TLS); this is stated.
4. Run the protocol. Each message is one non-streamed completion with the canonical model id, `x-no-aliasing: true`, `Accept-Encoding: identity`, `temperature 0.2`, structured output against the message schema, at most `600` characters of reasons, and a random 32-byte session salt in the system prompt so that the published request hashes cannot be matched against guessed limits. With item 2.3b (end-to-end encryption to the model's verified key, NEAR AI's `X-Client-Pub-Key` scheme), the gateway cannot read the prompts either; until it ships, the prompts pass through the attested gateway over TLS.
   1. Vendor negotiator (its own mandate, plus the buyer's `shared` request): `QUOTE{terms, reasons}`.
   2. Buyer negotiator (its own mandate, plus the vendor's `shared` part and the quote): `ACCEPT` or `COUNTER{terms, reasons}`.
   3. Vendor: `ACCEPT` or `FINAL{terms, reasons}`.
   4. Buyer: `ACCEPT` or `WALK_AWAY{reasons}`.
5. After every completion, fetch `GET /v1/signature/{chat_id}?signing_algo=ecdsa`, check `text == "<model>:<sha256(request body)>:<sha256(response body)>"` against the exact bytes, and recover the EIP-191 signer, which must be one of the verified model keys. An unverifiable response ends the run as an infrastructure failure.
6. Code checks every proposal against both mandates. A proposal outside its sender's own limits is never delivered: the sender's model is asked once more with the reason, and if it fails again that side walks away. An `ACCEPT` is valid only if the proposal is inside the accepting side's limits; otherwise that side walks away. Before a message reaches the other negotiator, a leak filter removes every rendering of the sender's private numbers from the reasons: base units, decimals with zero to six places, with and without thousands separators, whole units, `k` forms, and basis points as basis points or percent. Words can still concede; numbers cannot be copied across.
7. The full limit check (`accord-core::limits::check`) runs again on the accepted terms against both mandates. Fail: `NoDeal{LIMIT_CHECK}`, without saying which limit.
8. Build `Terms` from the accepted message plus the agreement's own parameters read in step 1 (`claim_delay_secs`, `grace_secs`, `require_two_sided` and the rest; the job invents nothing). The commercial terms document (both `shared` parts and the item names) is encrypted to each party's `doc_pubkey`; only its hash goes into the terms.
9. Output, compact (target under `4 KB`): the outcome, the terms and their hash, both commitments, the nonce, the transcript hash, the two document ciphertexts, the model id, the attestation summary, the per-response signature records, and `usage` (tokens and cost, for `/record`). Signed with the job's key over the raw bytes of `JCS(output without sig)`. No floats anywhere in a signed payload.

All plaintext lives in the job's memory during the run and nowhere else. The transcript is hashed, not stored.

### 8.4 What the contract checks in `on_sealed_result`

`on_sealed_result` is `#[private]`: the agreement calls it on itself as the `.then` of its own request. It reads the promise result; the result's integrity comes from the signature, not from who delivered it. Accept only when: the result is present and parses; `ed25519_verify` passes over the raw JCS bytes against the release's Sealed Table key; `agreement`, `request_nonce`, both commitments and the release equal state; the parameters inside the terms equal the agreement's own; `terms::structural` passes; `terms_hash == jcs_sha256(terms)`. Pass: store and move to `Attested`. Infrastructure failure (null result, bad signature, a retryable error): attempt plus one, back to `Ready`; after three, `NoDeal{INFRASTRUCTURE}`. A walk-away, a failed limit check or `BAD_INPUT` is final: one negotiation per pair of commitments.

Fallback F1 (if probe 0.3 shows the callback cannot carry a `5 KB` output): the job runs the same way but the keeper submits its signed output with `submit_sealed_result(output)`, accepted once per nonce with the same checks. Under F1 the seeds must be readable by the keeper's HTTPS calls, so the keeper could request extra runs and choose among their outcomes; claim 1's limit says so if F1 is used.

## 9. Accord Atlas

### 9.1 Terms

`retainer_per_period`, `periods`, `period_secs`, `slots_per_period` (demo `6`), `pass_threshold` (demo `4`), the venue (`{kind: "rhea-dcl", network, contract, pool_id}`), and the conditions: `max_spread_bps`, `min_depth_quote` within `depth_band_bps` of the mid on each side, `require_two_sided`. Period `p` (from `0`) runs from `executing_at + p × period_secs` for `period_secs`. Each period has `slots_per_period` equal windows. Uptime, as Atlas reports it, is the share of a period's observed slots in which the pool quoted both sides within the band. It is reported beside the result, not used as the pay rule: a period pays on the number of slots that met every condition, against `pass_threshold`.

### 9.2 Hidden slot times, deterministic samples

The observer job holds `PROTECTED_OBSERVER_SEED`. Slot `k` of period `p` falls at `t = window_start + (HMAC-SHA256(seed, agreement ‖ p ‖ k) mod (window − margin))`, with `margin = 10 s`. Nobody outside the enclave knows `t` in advance.

Anyone (in practice the keeper, every `30 s`) can ask the observer about `(agreement, period, slot)`. The job reads the agreement's terms over its pinned testnet RPC, and the current time from the latest final testnet block, never from the host clock. If `t` has not passed, it answers `not_yet` and signs nothing. Once it has, it finds the first mainnet block whose timestamp is at or after `t` among final blocks only, because an optimistic block can differ between callers or be replaced; until a final block at or after `t` exists, it still answers `not_yet`. It reads the venue at that block and signs the observation. Every caller asking after `t` gets the same block and the same values, so nobody can choose a better moment, cherry-pick among samples or forge one, and the keeper keeps no secret.

`record_observation(signed)` is open to anyone: the contract checks the observer's signature, that the agreement, venue, pool and band equal its terms, that `t` lies inside slot `k`'s window, and that the venue block's time is at or after `t`. A second copy of the same observation is ignored. A different, validly signed observation for a slot already recorded should never exist, because the job is deterministic; if one arrives, the contract keeps the first, records the conflict as an `observation_conflict` event with both hashes instead of ignoring it, and the period will close as `Review`, so the buyer decides. A conflict means the observer or its endpoints misbehaved, and `/verify` shows it. After the period ends plus `observation_grace_secs`, anyone calls `close_period(period)` and the contract applies `accord-core::atlas::evaluate`:

- `Eligible`: at least `pass_threshold` slots passed. The period's retainer item becomes payable through the six gates.
- `Review`: fewer passed, but enough slots are unobserved that the threshold could still have been met. Nobody polled in time; the buyer decides with `resolve_period`.
- `Withheld`: fewer passed and the unobserved slots could not change that. Not payable; the market maker can `request_exception` and the buyer decides.

### 9.3 The observation

The demo venue is Rhea's DCL pool for USDC and wNEAR on mainnet (`dclv2.ref-labs.near`, pool `17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1|wrap.near|2000`), read with view calls only: no signature, no deposit, nothing on mainnet changes. Testnet pools hold under a dollar of liquidity, so they cannot show a real market. At the sample block:

1. `get_pool{pool_id}` gives `current_point`; the mid price of token x in token y is `1.0001^current_point × 10^(dec_x − dec_y)`, carried as a decimal string with fixed precision.
2. Spread: `quote{pool_ids: [pool], input_token, output_token, input_amount, tag}` for a small sell and a small buy (`10 USDC` each way); the effective bid and ask give `spread_bps = (ask − bid) / mid × 10000`, as an integer.
3. Depth: on each side, a binary search of `quote` sizes (at most 12 calls) finds the largest trade, in USDC base units, whose average execution price stays within `depth_band_bps` of the mid.
4. Two-sided: both sides quote a non-zero amount.

The mainnet block height, hash and time are recorded with the metrics. Anyone can recompute the observation from an archival node at that block, so the values do not depend on the enclave; the enclave adds the hidden time and the signature. The pool's fee is `0.2%`, so a round trip costs at least `40 bps`: the passing demo agreement allows `60 bps`; the stricter one (for the `Withheld` period) allows `30`, which this pool cannot meet, and is negotiated with a vendor mandate that overpromises. The data is never altered.

### 9.4 What Atlas does not claim

It measures the venue's liquidity, not which market maker provided it; DCL positions are per account, which could make attribution possible later (`WIN_PLAN.md` lever 6), and until a separate claim ships nothing says Atlas attributes liquidity. It is a pool with concentrated liquidity and limit orders, not a central limit order book, and the copy says "liquidity" rather than "order book". Retainer-only. It does not claim the slot times are hidden from the deployer: the deployer owns `PROTECTED_OBSERVER_SEED` and could rebind it to a build that prints future slot times (claim 6's limit).

## 10. Keeper

A stateless worker (`services/keeper`) with its own NEAR account and an OutLayer payment key. Every loop: start negotiations whose commitments are both in; activate recipients whose delay has passed; poll the observer for each open slot of each live market-making agreement and submit what it signs; close finished periods; drive `close()` for ended agreements; write a heartbeat for `/status`. All of these methods are open to anyone, so if the keeper is down a party can call them from the app. The keeper adds liveness, not authority, and holds no secret that affects an outcome.

## 11. The demo buyer agent and the `/try` room

`services/agent` reads the `/try` inbox store and the agreement's `due_items()`. The `literal` planner (`starter/services/agent/literal-planner.md`) turns each message into an action by fixed rules; the `llm` planner gives a NEAR AI Cloud model the MCP tools and the system prompt of an accounts-payable assistant that follows vendor instructions. Both are deliberately gullible, because the point is that the contract holds. `AGENT_PREFLIGHT=on` adds the SDK's recipient check; the attack demo runs with it off and prints what it would have said. The agent's private key lives only in its environment; logs print the public key.

The public `/try` room would die on the first visitor who names the canary, so a labelled re-arm process runs that one room with fictional principals of its own (section 3): buyer `northwind-try`, vendor `halcyon-try`, settlement authority `halcyon-try-auth` and recipient `halcyon-try-mm`. Their recipient and authority are the second entry in the list-form file on Adi's vendor domain (`DEMO_VENDOR_DOMAIN`), so a new room's Payee proof and authority approval need no person. A room is a procurement agreement in demo timings, lasting seven days, from the `try` mandates in `fixtures/companies/`: twelve items of `0.01 USDC` in the factory's token (`tUSDC` under fallback F6), `0.12 USDC` in all, so one faucet drip to the try buyer lasts for dozens of rooms. One item is due at a time: an hour after the current item is paid, the re-arm submits the next delivery as the vendor and accepts it as the buyer. Five minutes after a revocation it installs a new agent key and hands it to the agent. When all twelve items are paid, or the term ends, it closes the room (`mutual_close`), withdraws the room's spare NEAR to the try buyer, and opens, negotiates, funds and proves a fresh room the same way `make demo` does. At most `TRY_MAX_ROOMS_PER_DAY` rooms (default `2`) open per UTC day; a room costs about `0.5 NEAR` once closed and withdrawn, so at the cap the try buyer needs a faucet top-up about once a week. When the cap is reached, `/try` says the room reopens at 00:00 UTC, and the refusal log stays live. The inbox takes `10` messages an hour per visitor and `TRY_MAX_MESSAGES_PER_HOUR` (default `120`) in all, which bounds the gas the room spends on refusals, and the re-arm tops the room's NEAR up from the try buyer when `get_budget` shows under `0.5 NEAR` liquid. `/try` and `/status` say so in words: "This public demo room re-arms its agent five minutes after a revocation. In a real agreement only the buyer can do that." The counter under the form reads "Paid outside the terms: `0`", counted from the contract's events; payments that the terms allow, if a visitor asks for exactly that, are listed separately as approved payments.

## 12. SDK, MCP server, CLI

- `@accord/sdk` (TypeScript): every contract method, the sealing client (with the release-key check), `preflight`, `verify`, event reading, receipts. Used by the app, the agent, the keeper, the MCP server and the CLI.
- `@accord/mcp`: an MCP server (stdio and streamable HTTP) exposing agreement tools to any agent. Payment tools need the agent's function-call key; principal tools need a principal's key and are off unless configured. No tool ever takes a key from a prompt.
- `accord` CLI: a thin wrapper over the SDK for people and for the make targets.

## 13. The app

Next.js (App Router, TypeScript strict), Node 24. Wallet connection through NEAR Connect (`@hot-labs/near-connect`, the wallet library NEAR's docs now use; Wallet Selector is legacy). On testnet NEAR Connect lists only wallets flagged for testnet (Meteor and Intear among them; HOT and MyNearWallet are hidden), so the demo principals use Meteor or Intear, and the CLI path uses keys from `.env`. Mandates are encrypted in the browser and sent with the party's own wallet transaction; no server route accepts a mandate, and a test fails if one does. The browser trusts the JavaScript the app serves, as with any web app: the CLI and SDK are the alternative sealing path, and static assets carry subresource integrity. Every live panel shows its source and age ("testnet, block `<h>`, `<t>` ago") and the last known value with its time if the source is down. The Verified panel verifies NEAR AI's gateway and model attestations with a nonce the browser generates (the server route only relays the report when a key is needed), shows each check by name, and links the Sealed Table run's attestation. The `/try` inbox is a rate-limited form into a store; it holds no key and calls no contract.

## 14. Custody and privacy

### 14.1 Custody, per piece

| Piece | Where it is | Who can act | What cannot happen | Kill switch |
| --- | --- | --- | --- | --- |
| Escrowed USDC | The agreement's own account (no full-access key; code pinned) | The agent within the terms; the vendor's claim after the delay; `close` pays eligible items, sets aside any it cannot pay for the vendor's claim, then refunds the rest to the buyer | A payment to anyone but the authorised recipient, at any amount but the approved one, without the evidence or an approved exception | `revoke_agent` by the buyer |
| Mandates | Ciphertext on chain; plaintext only inside the Sealed Table run and the model enclave | The Sealed Table build, when an agreement requests it | The other party or the app reading them; a run requested by anyone else (S1) | Not needed: plaintext ends with the run |
| Terms | Public on chain; the descriptive document encrypted to both parties | Both principals approve | Terms outside either mandate's limits; terms not signed by the release's key | Either party declines to approve |
| Recipient record | On chain, versioned, domain pinned | Vendor proposes, authority approves, buyer accepts | A change by one key alone; a change without a fresh proof and the delay; a change of domain | Buyer or authority cancels during the delay |
| Observations | On chain, signed, recomputable from the venue block | The observer build; anyone submits | A forged value, a chosen moment, a pass decided off chain | People decide `Withheld` and `Review` periods |

### 14.2 Privacy boundary

| Private to each company | Visible to both companies | Public on NEAR |
| --- | --- | --- |
| Its mandate's limits and instructions; the negotiation transcript (only its hash leaves) | Each side's `shared` part, in the commercial terms document (decrypted with their own doc key); everything public | The enforced terms (amounts, timings, conditions, recipient), commitments, ciphertexts, every payment, refusal, exception and observation, attestation references |

## 15. Invariants and how they are tested

`crates/accord-core/tests/invariants.rs` runs property tests (proptest) with random sequences of every action; the sandbox suite in `tests/` repeats the critical ones against the real contract.

| # | Invariant | Test |
| --- | --- | --- |
| I1 | USDC leaves the agreement only by `ft_transfer` to the current recipient, or to the buyer on `close` after eligible items are paid or set aside | Property test; sandbox checks every outgoing transfer's receiver |
| I2 | Each item is paid at most once, at its amount or its one approved exception amount | Property test |
| I3 | Paid never exceeds the terms total, and a payment never exceeds escrow minus paid | Property test |
| I4 | At most one payment is in flight, identified by its `payment_id`; the lock clears on both callback outcomes and through `resolve_stale_lock`; a callback never clears a newer lock; an ambiguous stale lock never lets an item be paid twice (`AssumedPaid`) | Sandbox: unregistered recipient (failure), a callback forced out of gas, a late callback after `resolve_stale_lock`, and a plain deposit equal to the amount |
| I5 | After `revoke_agent`, a canary request or the refusal limit, the account has no keys until the buyer installs one | Sandbox: list keys over RPC after each |
| I6 | `act` from the agent key never panics on a well-formed action; each refusal adds exactly one log entry and one event | Property test plus sandbox log count |
| I7 | Terms take effect only when both parties approved the same terms hash | Property test |
| I8 | A recipient becomes current only after proof, authority, buyer and (for changes) the delay, always on the first version's domain; `block` is never accepted | Property test plus sandbox |
| I9 | The agreement account never has a full-access key | Sandbox after every step |
| I10 | The agreement's code hash equals its release for its whole life | Sandbox; `make check-deploy` on testnet |
| I11 | A job result is accepted only with a valid signature from the release's key, the stored nonce, matching commitments and matching parameters | Sandbox with forged, replayed, cross-agreement and wrong-parameter outputs |
| I12 | One negotiation per pair of commitments; infrastructure retries at most three; an underfunded call cannot start one | Property test; sandbox with low gas |
| I13 | A `Withheld` or `Review` period is payable only after `resolve_period` or an approved exception | Property test |
| I14 | Revocation never makes an eligible item unpayable: the vendor's claim and `close` still pay it, or set it aside for the claim | Sandbox |
| I15 | Only refusals signed by the current agent key count toward the refusal limit | Property test |
| I16 | State that outside actors can grow is bounded: refusal ring buffer, exceptions, items, versions, observations | Property test on sizes; gas-ceiling test on `act` |
| I17 | `close()` becomes callable no later than `executing_at + duration_secs + max(grace_secs, acceptance_window_secs)` and reaches `Settled` in at most one call per item plus one, whatever the vendor or the recipient does: deliveries end with the term, a new delivery needs a dispute, and an item that cannot be paid is set aside instead of blocking the refund | Property test; sandbox with a vendor that has no active recipient and a delivery after the end |
| I18 | A slot holds at most one observation; a different signed one is logged as a conflict, never stored, and its period closes as `Review` | Property test; sandbox with two differently signed observations under the `mock` key |

## 16. Threat model

| Actor | Can | Stopped by | Left over |
| --- | --- | --- | --- |
| A prompt-injected or confused agent | Ask `act` for anything | Six gates; canary; refusal limit; preflight | An eligible payment to the authorised recipient, which the terms already allow |
| Someone who stole the agent's key | Same as the agent | Same; `revoke_agent` | Same; and burning the key's gas allowance |
| An email or chat impersonating the vendor | Ask the agent to pay a new account or more | The recipient and amount gates; no method takes a recipient from a message | Nothing beyond the above |
| A hijacked vendor domain | Publish a file naming an attacker's account | The authority's approval (a different key), the buyer's acceptance and the delay | The vendor must notice during the delay |
| A stolen vendor authority key | Approve a new recipient | A fresh proof on the pinned domain, the buyer's acceptance and the delay | Same |
| A dishonest vendor | Submit a false delivery; spam failed claims; hold `close` open with fresh deliveries or with no payable recipient | The buyer's acceptance window and dispute; claims never count toward the agent's refusal limit; deliveries end with the term and a new one needs a dispute; `close` sets aside what it cannot pay instead of waiting | A buyer who neither accepts nor disputes in time pays by default; that is the term both approved |
| A dishonest buyer | Revoke the agent to avoid paying; refuse every recipient so `close` cannot pay | The vendor's claim after the delay; `close` pays eligible items before any refund, and sets aside what it cannot pay, which never returns to the buyer | Refusing every recipient gains the buyer nothing, but the vendor's set-aside money waits until the buyer accepts one |
| A party probing the other's limits | Re-run negotiations, or run the Sealed Table directly with the other side's ciphertext | One run per pair; the job reads commitments and ciphertexts from chain state, never input; seeds readable only by runs an agreement or the keyless releases account requests (S1); envelopes bound to agreement, role and party; request hashes salted | What any accepted or refused deal reveals |
| Anyone with an OutLayer payment key | Call the jobs with chosen inputs | Jobs ignore caller data and read state over pinned endpoints; observer outputs are deterministic; Sealed and Payee seeds are gated by S1 | None material |
| A replayed or forged job output | Submit through a callback or the keeper | Signature by the release's key, nonce, commitments, parameters, agreement id | A broken TEE (trust assumption) |
| OutLayer's operator | Resolve a request with arbitrary output (its worker contract holds full-access keys) | The output must carry the build's signature from a seed only that build can read | Keystore governance and TDX trust |
| The deployer (Adi) | Rebind a seed to another build (the observer's would reveal slot times); while the factory keeps its full-access key, create an account that matches S1 and request extra runs | Rebinding is visible where OutLayer exposes bindings on chain, and `/verify` shows the current one; the job refuses a `negotiate` request from any account but the agreement when OutLayer exposes the caller; in production the factory's key is deleted | Stated in the limits of claims 1 and 6 |
| NEAR AI Cloud | Sees the negotiators' prompts inside its TEEs | Gateway and model attestations checked with a fresh nonce; per-response signatures; end-to-end encryption to the model once 2.3b ships | Their TEE and GPU trust assumptions; TLS binding not checked from inside the job |
| Our app server | Serve altered JavaScript that reads a mandate before encryption | Open source, the CLI and SDK as an alternative sealing path, subresource integrity | The usual web trust in served code; stated in claim 1's limit |
| The keeper | Skip polls | `Review` instead of payment; anyone can poll and submit | Delay |
| A market maker gaming slots | Quote well only when observed | Times known only inside the enclave; the sample is the first final block after the time | A market maker who keeps good liquidity only part of the time can still pass `k` of `n`; that is the term both approved. A deployer who rebinds the observer's seed could tell it the times (claim 6's limit) |
| Anyone | Grief storage or gas | Small root state, capped collections, gas-ceiling tests, minimum prepaid gas on `start_negotiation` | None material |

## 17. Failure modes

| Failure | What happens | Recovery |
| --- | --- | --- |
| OutLayer run times out or the yield expires | Callback sees no result: infrastructure failure | Retry (at most three); after that `NoDeal{INFRASTRUCTURE}`, and the parties open a new room |
| The job cannot see fresh state yet | It retries reads for up to `15 s`, then fails as infrastructure | Retry |
| NEAR AI Cloud returns 429, 5xx or no signature | Infrastructure failure | Retry |
| Token transfer fails | `payment_failed`, lock cleared, funds still in escrow | The agent retries once the cause is fixed (activation registers the recipient, so this should not happen); at `close` the item is set aside for the vendor's claim |
| The payment callback itself fails | The lock stays set | `resolve_stale_lock()` after `600` blocks: paid if the balance proves it, otherwise `AssumedPaid` and settled by an exception |
| The agent's allowance runs out | Its calls fail at the RPC with not enough allowance | The buyer installs a new key |
| The keeper is down | Nothing moves forward on its own | Anyone calls the same methods from the app; unpolled slots make a period `Review`, not `Withheld` |
| RPC is down | The app shows the last known state with its time; jobs fail as infrastructure | A second endpoint from `DECISIONS.md`; retry |
| The agreement's NEAR balance runs low | `get_budget` warns; requests that need a deposit fail before they start | The buyer tops up with a plain transfer |
| The vendor has no payable recipient when the agreement ends | `close` cannot pay its eligible items | They are set aside as `Reserved`; the buyer's refund goes ahead; the vendor proposes a recipient (allowed while an item is set aside) and claims |
| Two different signed observations for one slot | The first stays; `observation_conflict` is logged | The period closes as `Review` and the buyer decides; check the observer build and its endpoints |

## 18. Costs and limits (estimates; Phase 1 and 5.4 measure and replace them)

| Item | Estimate |
| --- | --- |
| Agreement creation deposit (testnet, paid by the buyer) | `2 NEAR` with a global release; `3.5 NEAR` embedded |
| Publishing a global release | Burns `0.0001 NEAR` per byte: about `10 NEAR` for a `100 KB` wasm |
| Agreement state | Under `40 KB` (about `0.4 NEAR` staked); root struct under `1 KB` |
| Agent key on the account | `131` bytes of storage |
| `act` gas | Attach `80 TGas`; refused under `15 TGas`, paying under `50 TGas` (tested). The allowance must cover `0.08 NEAR` up front per call |
| Gas price | `0.0001 NEAR` per TGas burned; allowances reserve at `0.001 NEAR` per TGas and refund the difference |
| `start_negotiation` | At least `280 TGas` prepaid; about `0.02 NEAR` attached to OutLayer from the agreement's balance |
| NEAR AI tokens per negotiation | Four short completions on a NEAR-fleet model: well under one cent |
| Payee run | About `0.01 NEAR` |
| A `/try` room | About `0.5 NEAR` once closed and withdrawn (mostly the storage stake, which stays), plus `0.12 USDC` in items |
| Observer polls (HTTPS API) | About `0.001 USD` each from the keeper's payment key; every `30 s` per open slot |
| Yield timeout | `200` blocks, about `113 s` on testnet; the Sealed Table run targets under `80 s` |
| Logs per receipt | At most `100` lines and `16 KB` in total; each event stays under `2 KB` |

Measured on 3 Nov 2026 with `make measure NET=local` (a local node runs the same runtime as testnet; the build is the
`-mock` agreement, whose only difference is that it skips the OutLayer requests, so `start_negotiation` and the
Payee request are not measured here). Gas is gas burned, not attached:

| Call | Burned |
| --- | --- |
| `approve_terms` (first / second, which starts the agreement) | `2.4` / `2.9 TGas` |
| `ft_transfer_call` fund (token and `ft_on_transfer`) | `6.7 TGas` |
| `install_agent_key` | `3.1 TGas` |
| `act` refused (recorded, returned) | `5.7 TGas` |
| `act` paying, with the transfer and its callback | `10.5 TGas` |
| `revoke_agent` | `3.0 TGas` |
| `mutual_close` (first / second, which settles: balance read, refund) | `2.3` / `11.7 TGas` |

Storage: the agreement account holds `502,903 B` at creation, almost all of it the embedded code (`500,620 B` wasm);
the state adds `7.9 KB` once terms are in and `9.6 KB` once executing with a payment, a refusal and a receipt, so
the state stays under `40 KB` as estimated. With an embedded release the stake is `5.1 NEAR` (the code counts);
with a global release only the state counts, about `0.1 NEAR`.

## 19. Releases and upgrades

A release is: the agreement wasm hash, the three job builds (wasm hashes) with their seed bindings, the jobs' signing public keys and the mandate public key from `pubkey` runs the releases account requested, the attestation task ids that prove them, and the model id. During development the jobs use dev seeds bound to the project, which change nothing on chain; release 1 is cut after the jobs stop changing (`PROGRESS.md` 2.7): fresh `PROTECTED_` seeds are generated and bound to those exact builds, the releases account requests the `pubkey` runs, and `publish_release` records everything. New agreements pin the current release; existing agreements keep theirs for life. There is no migration path for a live agreement, on purpose. `make check-deploy` compares every hash.

## 20. Deployment

- NEAR testnet: the factory and its keyless releases account, the keeper account, the demo principals (buyer, vendor, authority, recipient), the `/try` room's four principals, two canaries, one attacker lookalike, and the token (USDC, or `tUSDC` for the judge path).
- OutLayer testnet: three projects (`<owner>/accord-sealed-table`, `<owner>/accord-payee`, `<owner>/accord-observer`), the three `PROTECTED_` seeds bound to their release builds (the Sealed Table's and the Payee's under S1), the NEAR AI Cloud key as a secret on the Sealed Table project under the same S1 condition, and a payment key for the keeper.
- Railway: `app` (web), `agent` (worker, with the `/try` re-arm), `keeper` (worker), Postgres (inbox store, preflight approvals, cached events). Environment variables are listed in `INTERFACES.md` section 15.

## 21. Docs to read first

NEAR: https://docs.near.org/llms.txt · access keys https://docs.near.org/protocol/accounts-contracts/access-keys · near-sdk-rs https://docs.near.org/tools/sdk · global contracts (NEP-591) https://github.com/near/NEPs/blob/master/neps/nep-0591.md · NEP-141 https://github.com/near/NEPs/blob/master/neps/nep-0141.md · NEP-145 https://github.com/near/NEPs/blob/master/neps/nep-0145.md · NEP-297 https://github.com/near/NEPs/blob/master/neps/nep-0297.md · NEP-366 and the relayer tutorial https://docs.near.org/web3-apps/tutorials/meta-transactions · NEP-413 https://github.com/near/NEPs/blob/master/neps/nep-0413.md · storage and gas https://docs.near.org/protocol/transactions/gas · RPC providers https://docs.near.org/api/rpc/providers · agent skills https://github.com/near/agent-skills (install with `npx skills add near/agent-skills`).

OutLayer: https://app.outlayer.ai/llms.txt · getting started https://app.outlayer.ai/docs/getting-started · NEAR integration https://app.outlayer.ai/docs/near-integration · HTTPS API https://app.outlayer.ai/docs/https-api · payment keys https://app.outlayer.ai/docs/payment-keys · secrets https://app.outlayer.ai/docs/secrets · signing keys https://app.outlayer.ai/docs/signing-keys · WASI https://app.outlayer.ai/docs/wasi · TEE attestation https://app.outlayer.ai/docs/tee-attestation · trust and verification https://app.outlayer.ai/docs/trust-verification · examples https://github.com/out-layer/private-dao-example and https://github.com/out-layer/ai-example · verifier https://github.com/out-layer/outlayer-verify.

NEAR AI Cloud: quickstart https://docs.near.ai/cloud/quickstart · models https://docs.near.ai/cloud/models · verification https://docs.near.ai/cloud/verification · gateway attestation https://docs.near.ai/cloud/verification/cloud-api/gateway-attestation · model attestations https://docs.near.ai/cloud/verification/cloud-api/model-attestations · response signatures https://docs.near.ai/cloud/verification/cloud-api/response-signatures · end-to-end encryption https://docs.near.ai/cloud/guides/e2ee-chat-completions · verifier https://github.com/nearai/nearai-cloud-verifier · example https://github.com/near-examples/nearai-cloud-verification-example.

Hackathon: https://nearhackathon.com/HACKATHON.md · prompts https://github.com/nearai/near-hackathon-prompt-examples.

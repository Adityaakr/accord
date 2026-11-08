#![recursion_limit = "256"]
//! Agreement controls (`contracts/agreement`): one NEAR account per agreement. It holds the escrowed USDC, keeps
//! the approved terms, and checks every payment against them before its own code calls `ft_transfer`. The rules
//! that decide whether money moves live in `accord-core`; this crate stores state and wires promises.
//!
//! INTERFACES.md section 4 is the specification; ARCHITECTURE.md sections 4 to 9 say why.

use accord_core::gates::{ItemCtx, PayCtx};
use accord_core::types::*;
use near_sdk::json_types::Base64VecU8;
use near_sdk::store::{LazyOption, LookupMap, Vector};
use near_sdk::{env, near, AccountId, BorshStorageKey, Gas, NearToken, Promise, PublicKey};

mod events;
mod evidence;
mod negotiation;
mod payments;
mod recipients;
mod signed;
mod views;

pub use events::emit;

pub const TGAS: u64 = 1_000_000_000_000;
/// The refusal log keeps the last 128 refusals; every refusal is also an event.
pub const REFUSAL_RING: u64 = 128;
/// `act` accepts a call from the current agent key or one of the last 8 revoked ones (those get `ERR_REVOKED`).
pub const REVOKED_KEYS_KEPT: usize = 8;
pub const MAX_EXCEPTIONS: u32 = 16;
/// The agent's own requests may fill at most half the exception slots, so the vendor always has room.
pub const MAX_AGENT_EXCEPTIONS: u32 = MAX_EXCEPTIONS / 2;
pub const MAX_CIPHERTEXT: usize = 8 * 1024;
pub const MAX_REASON: usize = 280;
/// A payment lock older than this many blocks can be resolved by anyone (`resolve_stale_lock`).
pub const STALE_LOCK_BLOCKS: u64 = 600;
/// Kept above the storage stake after `Settled` while an item is set aside, so the vendor's claim can still run.
pub const RESERVED_KEEP: NearToken = NearToken::from_millinear(50);
/// The token's storage deposit (Circle's testnet USDC: 0.00125 NEAR).
pub const TOKEN_STORAGE_DEPOSIT: NearToken = NearToken::from_micronear(1_250);

pub fn now() -> u64 {
    env::block_timestamp() / 1_000_000_000
}

pub fn gas(tgas: u64) -> Gas {
    Gas::from_gas(tgas * TGAS)
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct JobRef {
    pub project: String,
    pub wasm_hash: String,
    pub signing_pubkey: PublicKey,
}

/// The `new` arguments the factory passes in the creation batch (INTERFACES.md 4.1).
#[near(serializers = [json])]
pub struct InitArgs {
    pub id: u64,
    pub factory: AccountId,
    pub release: u32,
    pub kind: Kind,
    pub title: String,
    pub buyer: AccountId,
    pub vendor: AccountId,
    pub vendor_authority: AccountId,
    pub token: AccountId,
    pub outlayer: AccountId,
    pub keeper: AccountId,
    pub sealed_table: JobRef,
    pub payee_job: JobRef,
    pub observer_job: JobRef,
    pub model: String,
    pub canaries: Vec<AccountId>,
    pub params: Params,
}

/// What `new` stores once and the hot paths rarely read; kept out of the root struct.
#[near(serializers = [borsh, json])]
pub struct Config {
    pub title: String,
    pub outlayer: AccountId,
    pub keeper: AccountId,
    pub sealed_table: JobRef,
    pub payee_job: JobRef,
    pub observer_job: JobRef,
    pub model: String,
    pub canaries: Vec<AccountId>,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    Buyer,
    Vendor,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Commitment {
    pub commitment: String,
    pub ciphertext: Base64VecU8,
    pub doc_pubkey: String,
    pub doc_key_signer: PublicKey,
    pub at: u64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Delivery {
    pub evidence_hash: String,
    pub uri: String,
    pub at: u64,
    pub window_end: u64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug)]
pub struct ApprovedException {
    #[serde(with = "accord_core::types::u128_str")]
    pub amount: Amount,
    pub waive_evidence: bool,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct ItemState {
    pub id: u32,
    #[serde(with = "accord_core::types::u128_str")]
    pub amount: Amount,
    pub due_offset_secs: u64,
    pub evidence: Evidence,
    pub status: ItemStatus,
    pub delivery: Option<Delivery>,
    pub eligible_at: Option<u64>,
    pub exception: Option<ApprovedException>,
    pub exception_used: bool,
    pub pending_exception: Option<u32>,
    /// What this item counts toward `paid`: its amount once `Paid` or `AssumedPaid`, else 0.
    #[serde(with = "accord_core::types::u128_str")]
    pub settled: Amount,
    /// The payment that settled it (`Paid` or `AssumedPaid`). A late callback touches the item only when it carries
    /// this id, so an answer to an older payment can never undo a newer one.
    pub settled_by: Option<u64>,
}

impl ItemState {
    pub fn due_amount(&self) -> Amount {
        self.exception.map(|e| e.amount).unwrap_or(self.amount)
    }

    /// A delivery whose acceptance window lapsed without a dispute is accepted by the window.
    pub fn normalize(&mut self, now: u64) -> bool {
        if let (ItemStatus::Delivered, Some(d)) = (self.status, &self.delivery) {
            if now >= d.window_end {
                self.status = ItemStatus::Eligible;
                self.eligible_at = Some(d.window_end);
                return true;
            }
        }
        false
    }

    pub fn period(&self) -> Option<u32> {
        match self.evidence {
            Evidence::PeriodEligible { period } => Some(period),
            Evidence::DeliveryAccepted => None,
        }
    }
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RecipientStatus {
    Proposed,
    Proven,
    ProofFailed,
    AuthorityApproved,
    Accepted,
    Active,
    Superseded,
    Cancelled,
}

impl RecipientStatus {
    /// A version still on its way to becoming current: only one may exist at a time.
    pub fn pending(&self) -> bool {
        matches!(
            self,
            Self::Proposed | Self::Proven | Self::AuthorityApproved | Self::Accepted
        )
    }
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct RecipientVersion {
    pub version: u32,
    pub account: AccountId,
    pub domain: String,
    pub status: RecipientStatus,
    pub rating: Option<Rating>,
    pub reasons: Vec<String>,
    pub failure: Option<String>,
    pub proposed_at: u64,
    pub active_at: Option<u64>,
    /// The Payee job's signed output, kept so anyone can re-check the signature.
    pub proof: Option<String>,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ExceptionStatus {
    Pending,
    Approved,
    Rejected,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Exception {
    pub id: u32,
    pub item: u32,
    #[serde(with = "accord_core::types::u128_str")]
    pub amount: Amount,
    pub waive_evidence: bool,
    pub reason: String,
    pub by: String,
    pub status: ExceptionStatus,
    pub at: u64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Refusal {
    pub seq: u64,
    pub at: u64,
    pub block: u64,
    pub code: RefusalCode,
    pub item: u32,
    #[serde(with = "accord_core::types::u128_str")]
    pub amount: Amount,
    pub recipient: String,
    pub signer: Option<PublicKey>,
    pub via: Via,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Receipt {
    pub payment_id: u64,
    pub item: u32,
    #[serde(with = "accord_core::types::u128_str")]
    pub amount: Amount,
    pub recipient: AccountId,
    pub via: Via,
    pub block: u64,
    pub at: u64,
    pub evidence_hash: Option<String>,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct PeriodState {
    pub period: u32,
    pub outcome: PeriodOutcome,
    /// Bit `k` set: slot `k` holds an observation.
    pub recorded: u32,
    pub conflict: bool,
    pub passed: u8,
    pub observed: u8,
    pub uptime_bps: u32,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct StoredObservation {
    pub observation: Observation,
    pub sig: String,
    pub hash: String,
    pub pass: bool,
}

#[derive(BorshStorageKey)]
#[near]
enum Key {
    Config,
    Commitments,
    Terms,
    SealedOutput,
    Items,
    Recipients,
    Refusals,
    Exceptions,
    Observations,
    Periods,
    Receipts,
}

#[near(contract_state)]
pub struct Agreement {
    pub(crate) id: u64,
    pub(crate) factory: AccountId,
    pub(crate) release: u32,
    pub(crate) kind: Kind,
    pub(crate) state: State,
    pub(crate) negotiation: Negotiation,
    pub(crate) buyer: AccountId,
    pub(crate) vendor: AccountId,
    pub(crate) vendor_authority: AccountId,
    pub(crate) token: AccountId,
    pub(crate) params: Params,
    pub(crate) terms_hash: Option<String>,
    pub(crate) approved: (bool, bool),
    pub(crate) executing_at: Option<u64>,
    pub(crate) funded: Amount,
    pub(crate) paid: Amount,
    pub(crate) reserved: Amount,
    /// The ledger part of the refund at `Settled`: funded minus paid minus reserved.
    pub(crate) refunded: Amount,
    /// A refund transfer that failed at `Settled`; `close()` retries it.
    pub(crate) refund_owed: Amount,
    pub(crate) in_flight: Option<InFlight>,
    pub(crate) next_payment_id: u64,
    /// Set while `close` reads the token balance for the refund; payments wait (`ERR_IN_FLIGHT`).
    pub(crate) closing: bool,
    /// The block `closing` was set at; after `STALE_LOCK_BLOCKS` anyone can clear it (`resolve_stale_lock`).
    pub(crate) closing_since: u64,
    pub(crate) mutual_close: (bool, bool),
    pub(crate) agent_key: Option<PublicKey>,
    pub(crate) revoked_keys: Vec<PublicKey>,
    pub(crate) revoked_count: u32,
    pub(crate) canary_tripped: bool,
    pub(crate) refusal_seq: u64,
    /// Times of the current key's counted refusals inside the refusal window.
    pub(crate) refusal_times: Vec<u64>,
    pub(crate) current_recipient: Option<u32>,
    pub(crate) domain: Option<String>,
    pub(crate) observation_conflicts: u32,
    pub(crate) config: LazyOption<Config>,
    pub(crate) commitments: LookupMap<Role, Commitment>,
    pub(crate) terms: LazyOption<Terms>,
    pub(crate) sealed_output: LazyOption<String>,
    pub(crate) items: Vector<ItemState>,
    pub(crate) recipients: Vector<RecipientVersion>,
    pub(crate) refusals: LookupMap<u64, Refusal>,
    pub(crate) exceptions: Vector<Exception>,
    pub(crate) observations: LookupMap<(u32, u8), StoredObservation>,
    pub(crate) periods: Vector<PeriodState>,
    pub(crate) receipts: Vector<Receipt>,
}

impl Default for Agreement {
    fn default() -> Self {
        env::panic_str("ERR_NOT_INITIALIZED")
    }
}

#[near]
impl Agreement {
    /// Called by the factory inside the creation batch, so the account never holds a key of its own.
    #[init]
    pub fn new(args: InitArgs) -> Self {
        require(
            env::predecessor_account_id() == args.factory,
            "ERR_NOT_FACTORY",
        );
        if let Err(e) = args.params.check_mode() {
            env::panic_str(e);
        }
        require(args.title.len() <= 120, "ERR_TOO_LARGE");
        require(args.canaries.len() <= 8, "ERR_TOO_LARGE");
        let mut this = Self {
            id: args.id,
            factory: args.factory,
            release: args.release,
            kind: args.kind,
            state: State::Sealed,
            negotiation: Negotiation::AwaitingMandates,
            buyer: args.buyer,
            vendor: args.vendor,
            vendor_authority: args.vendor_authority,
            token: args.token.clone(),
            params: args.params,
            terms_hash: None,
            approved: (false, false),
            executing_at: None,
            funded: 0,
            paid: 0,
            reserved: 0,
            refunded: 0,
            refund_owed: 0,
            in_flight: None,
            next_payment_id: 1,
            closing: false,
            closing_since: 0,
            mutual_close: (false, false),
            agent_key: None,
            revoked_keys: Vec::new(),
            revoked_count: 0,
            canary_tripped: false,
            refusal_seq: 0,
            refusal_times: Vec::new(),
            current_recipient: None,
            domain: None,
            observation_conflicts: 0,
            config: LazyOption::new(Key::Config, None),
            commitments: LookupMap::new(Key::Commitments),
            terms: LazyOption::new(Key::Terms, None),
            sealed_output: LazyOption::new(Key::SealedOutput, None),
            items: Vector::new(Key::Items),
            recipients: Vector::new(Key::Recipients),
            refusals: LookupMap::new(Key::Refusals),
            exceptions: Vector::new(Key::Exceptions),
            observations: LookupMap::new(Key::Observations),
            periods: Vector::new(Key::Periods),
            receipts: Vector::new(Key::Receipts),
        };
        this.config.set(Some(Config {
            title: args.title,
            outlayer: args.outlayer,
            keeper: args.keeper,
            sealed_table: args.sealed_table,
            payee_job: args.payee_job,
            observer_job: args.observer_job,
            model: args.model,
            canaries: args.canaries,
        }));
        emit(
            "agreement_created",
            serde_json::json!({
                "agreement": env::current_account_id(),
                "kind": this.kind,
                "buyer": this.buyer,
                "vendor": this.vendor,
                "authority": this.vendor_authority,
                "token": this.token,
                "release": this.release,
                "mode": this.params.mode,
            }),
        );
        // Register the agreement with the token so the buyer can fund it.
        Promise::new(args.token)
            .function_call(
                "storage_deposit",
                serde_json::to_vec(&serde_json::json!({
                    "account_id": env::current_account_id(),
                    "registration_only": true,
                }))
                .unwrap(),
                TOKEN_STORAGE_DEPOSIT,
                gas(10),
            )
            .detach();
        this
    }
}

/// Panic with an `ERR_*` string unless `cond` holds.
pub fn require(cond: bool, err: &str) {
    if !cond {
        env::panic_str(err)
    }
}

impl Agreement {
    pub(crate) fn cfg(&self) -> &Config {
        self.config.get().as_ref().expect("config set in new")
    }

    pub(crate) fn role_of(&self, account: &AccountId) -> Option<Role> {
        if *account == self.buyer {
            Some(Role::Buyer)
        } else if *account == self.vendor {
            Some(Role::Vendor)
        } else {
            None
        }
    }

    pub(crate) fn require_party(&self) -> Role {
        self.role_of(&env::predecessor_account_id())
            .unwrap_or_else(|| env::panic_str("ERR_NOT_PARTY"))
    }

    pub(crate) fn require_buyer(&self) {
        require(env::predecessor_account_id() == self.buyer, "ERR_NOT_BUYER");
    }

    pub(crate) fn require_vendor(&self) {
        require(
            env::predecessor_account_id() == self.vendor,
            "ERR_NOT_VENDOR",
        );
    }

    pub(crate) fn require_state(&self, state: State) {
        require(self.state == state, "ERR_WRONG_STATE");
    }

    pub(crate) fn canaries(&self) -> Vec<String> {
        self.cfg().canaries.iter().map(|a| a.to_string()).collect()
    }

    pub(crate) fn current_recipient_account(&self) -> Option<AccountId> {
        self.current_recipient
            .and_then(|v| self.recipients.get(v - 1))
            .map(|r| r.account.clone())
    }

    pub(crate) fn period_outcome(&self, period: u32) -> Option<PeriodOutcome> {
        self.periods.get(period).map(|p| p.outcome)
    }

    /// Index of item `id` in `items`, if it exists.
    pub(crate) fn item_index(&self, id: u32) -> Option<u32> {
        (0..self.items.len()).find(|&i| self.items[i].id == id)
    }

    pub(crate) fn item_ctx(&self, item: &ItemState) -> ItemCtx {
        ItemCtx {
            id: item.id,
            amount: item.amount,
            status: item.status,
            window_end: item.delivery.as_ref().map(|d| d.window_end),
            period: item.period().and_then(|p| self.period_outcome(p)),
            exception: item.exception.map(|e| (e.amount, e.waive_evidence)),
        }
    }

    /// The escrow the contract's own ledger holds: funded, minus paid, minus the refund at `Settled`.
    pub(crate) fn escrow(&self) -> Amount {
        self.funded
            .saturating_sub(self.refunded)
            .saturating_sub(self.paid)
    }

    pub(crate) fn total(&self) -> Amount {
        self.terms.get().as_ref().map(|t| t.total).unwrap_or(0)
    }

    pub(crate) fn pay_ctx<'a>(
        &self,
        canaries: &'a [String],
        recipient: Option<&'a str>,
        item: Option<ItemCtx>,
    ) -> PayCtx<'a> {
        // What the gates may spend: the ledger before payments, after any refund, minus what is set aside for the
        // vendor's claims; a claim on a reserved item may spend that item's own reserve.
        let own_reserve = item
            .as_ref()
            .filter(|i| i.status == ItemStatus::Reserved)
            .map(|i| i.due_amount())
            .unwrap_or(0);
        let funded = self
            .funded
            .saturating_sub(self.refunded)
            .saturating_sub(self.reserved)
            .saturating_add(own_reserve);
        PayCtx {
            state: self.state,
            kind: self.kind,
            canaries,
            recipient,
            item,
            total: self.total(),
            paid: self.paid,
            funded,
            in_flight: self.in_flight.is_some() || self.closing,
        }
    }
}

#[cfg(test)]
mod review_funds_tests;
#[cfg(test)]
mod review_state_tests;
#[cfg(test)]
mod tests;

//! Types shared by the contracts, the jobs and the SDK (INTERFACES.md section 3). JSON shapes follow section 1:
//! amounts are `U128` decimal strings, times unix seconds, hashes lowercase hex.

use borsh::{BorshDeserialize, BorshSerialize};
use serde::{Deserialize, Serialize};

/// A NEAR account id. Kept as a plain string here so the core has no `near-sdk` dependency; the contracts
/// validate ids at their boundary.
pub type AccountId = String;
/// Token base units (USDC and tUSDC: 6 decimals). JSON: a decimal string.
pub type Amount = u128;

/// Serialises `u128` as a decimal string, the `U128` JSON form.
pub mod u128_str {
    use serde::{de::Error, Deserialize, Deserializer, Serializer};
    pub fn serialize<S: Serializer>(v: &u128, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&v.to_string())
    }
    pub fn deserialize<'de, D: Deserializer<'de>>(d: D) -> Result<u128, D::Error> {
        let s = String::deserialize(d)?;
        if s.is_empty() || s.len() > 39 || !s.bytes().all(|b| b.is_ascii_digit()) {
            return Err(D::Error::custom("amount must be a decimal string"));
        }
        s.parse().map_err(D::Error::custom)
    }
}

/// `[u8; 32]` as 64 lowercase hex characters.
pub mod hex32 {
    use serde::{de::Error, Deserialize, Deserializer, Serializer};
    pub fn serialize<S: Serializer>(v: &[u8; 32], s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&hex::encode(v))
    }
    pub fn deserialize<'de, D: Deserializer<'de>>(d: D) -> Result<[u8; 32], D::Error> {
        let s = String::deserialize(d)?;
        if s.len() != 64 || s.bytes().any(|b| b.is_ascii_uppercase()) {
            return Err(D::Error::custom("hash must be 64 lowercase hex characters"));
        }
        let mut out = [0u8; 32];
        hex::decode_to_slice(&s, &mut out).map_err(D::Error::custom)?;
        Ok(out)
    }
}

#[derive(
    Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Copy, Debug, PartialEq, Eq,
)]
#[serde(rename_all = "kebab-case")]
pub enum Kind {
    Procurement,
    MarketMaking,
}

#[derive(
    Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Copy, Debug, PartialEq, Eq,
)]
pub enum State {
    Sealed,
    Attested,
    Executing,
    Settled,
    NoDeal,
    Cancelled,
}

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum Negotiation {
    AwaitingMandates,
    Ready {
        attempts: u8,
    },
    Requested {
        #[serde(with = "hex32")]
        request_nonce: [u8; 32],
        at: u64,
        attempt: u8,
    },
    Done,
}

#[derive(
    Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Copy, Debug, PartialEq, Eq,
)]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    Live,
    Demo,
}

/// Fixed at creation and carried into every job and check (INTERFACES.md 4.1).
#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct Params {
    pub mode: Mode,
    pub timelock_secs: u64,
    pub claim_delay_secs: u64,
    pub grace_secs: u64,
    pub min_acceptance_window_secs: u64,
    pub max_acceptance_window_secs: u64,
    pub require_two_sided: bool,
    pub observation_grace_secs: u64,
    pub refusal_limit: u8,
    pub refusal_window_secs: u64,
    #[serde(with = "u128_str")]
    pub agent_allowance: Amount,
}

/// The live minimums (ARCHITECTURE.md section 4): a recipient change waits a day, a vendor claim three days, and
/// the grace after the term covers the claim delay plus a day.
pub const LIVE_MIN_TIMELOCK_SECS: u64 = 86_400;
pub const LIVE_MIN_CLAIM_DELAY_SECS: u64 = 259_200;

impl Params {
    /// `Ok` when a `live` agreement meets the live minimums; `demo` allows shorter timings.
    pub fn check_mode(&self) -> Result<(), &'static str> {
        if self.min_acceptance_window_secs > self.max_acceptance_window_secs {
            return Err("ERR_PARAMS_WINDOW");
        }
        if self.refusal_limit == 0 {
            return Err("ERR_PARAMS_REFUSAL_LIMIT");
        }
        // No timing longer than ten years, so no deadline computed from them can overflow.
        const MAX_SECS: u64 = 10 * 365 * 86_400;
        if [
            self.timelock_secs,
            self.claim_delay_secs,
            self.grace_secs,
            self.max_acceptance_window_secs,
            self.observation_grace_secs,
            self.refusal_window_secs,
        ]
        .iter()
        .any(|&s| s > MAX_SECS)
        {
            return Err("ERR_PARAMS_TOO_LONG");
        }
        if self.mode == Mode::Live
            && (self.timelock_secs < LIVE_MIN_TIMELOCK_SECS
                || self.claim_delay_secs < LIVE_MIN_CLAIM_DELAY_SECS
                || self.grace_secs < self.claim_delay_secs + 86_400)
        {
            return Err("ERR_LIVE_MINIMUMS");
        }
        Ok(())
    }
}

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct Terms {
    pub v: u8,
    pub kind: Kind,
    pub token: AccountId,
    pub decimals: u8,
    #[serde(with = "u128_str")]
    pub total: Amount,
    pub items: Vec<ItemTerms>,
    pub acceptance_window_secs: u64,
    pub duration_secs: u64,
    #[serde(with = "hex32")]
    pub params_hash: [u8; 32],
    #[serde(with = "hex32")]
    pub doc_hash: [u8; 32],
    pub atlas: Option<AtlasTerms>,
}

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct ItemTerms {
    pub id: u32,
    #[serde(with = "u128_str")]
    pub amount: Amount,
    pub due_offset_secs: u64,
    pub evidence: Evidence,
}

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum Evidence {
    DeliveryAccepted,
    PeriodEligible { period: u32 },
}

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct AtlasTerms {
    #[serde(with = "u128_str")]
    pub retainer_per_period: Amount,
    pub periods: u32,
    pub period_secs: u64,
    pub slots_per_period: u8,
    pub pass_threshold: u8,
    pub venue: Venue,
    pub max_spread_bps: u32,
    #[serde(with = "u128_str")]
    pub min_depth_quote: Amount,
    pub depth_band_bps: u32,
}

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum Venue {
    RheaDcl {
        network: String,
        contract: AccountId,
        pool_id: String,
    },
}

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct BlockRef {
    pub height: u64,
    pub hash: String,
    pub time: u64,
}

/// The observer's signed output, as stored (ARCHITECTURE.md 9.3).
#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct Observation {
    pub agreement: AccountId,
    pub period: u32,
    pub slot: u8,
    pub slot_time: u64,
    pub venue: Venue,
    pub band_bps: u32,
    pub venue_block: BlockRef,
    pub mid: String,
    pub spread_bps: u32,
    #[serde(with = "u128_str")]
    pub depth_bid: Amount,
    #[serde(with = "u128_str")]
    pub depth_ask: Amount,
    pub two_sided: bool,
}

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum Action {
    Pay {
        item: u32,
        #[serde(with = "u128_str")]
        amount: Amount,
        recipient: AccountId,
        memo: Option<String>,
    },
    RequestException {
        item: u32,
        #[serde(with = "u128_str")]
        amount: Amount,
        waive_evidence: bool,
        reason: String,
    },
}

pub const MAX_EXCEPTION_REASON: usize = 280;

#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub enum ActOutcome {
    Sent {
        item: u32,
        #[serde(with = "u128_str")]
        amount: Amount,
        recipient: AccountId,
    },
    Failed {
        item: u32,
        reason: String,
    },
    Refused {
        code: RefusalCode,
        seq: u64,
    },
    ExceptionRequested {
        id: u32,
    },
}

/// The refusal codes, in gate order. They serialise as `ERR_<NAME>`.
#[derive(
    Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Copy, Debug, PartialEq, Eq,
)]
pub enum RefusalCode {
    #[serde(rename = "ERR_REVOKED")]
    Revoked,
    #[serde(rename = "ERR_NOT_EXECUTING")]
    NotExecuting,
    #[serde(rename = "ERR_CANARY")]
    Canary,
    #[serde(rename = "ERR_NO_RECIPIENT")]
    NoRecipient,
    #[serde(rename = "ERR_PAYEE_MISMATCH")]
    PayeeMismatch,
    #[serde(rename = "ERR_UNKNOWN_ITEM")]
    UnknownItem,
    #[serde(rename = "ERR_ALREADY_PAID")]
    AlreadyPaid,
    #[serde(rename = "ERR_NOT_DUE")]
    NotDue,
    #[serde(rename = "ERR_PERIOD_WITHHELD")]
    PeriodWithheld,
    #[serde(rename = "ERR_AMOUNT_MISMATCH")]
    AmountMismatch,
    #[serde(rename = "ERR_CAP_EXCEEDED")]
    CapExceeded,
    #[serde(rename = "ERR_INSUFFICIENT_FUNDS")]
    InsufficientFunds,
    #[serde(rename = "ERR_IN_FLIGHT")]
    InFlight,
}

impl RefusalCode {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Revoked => "ERR_REVOKED",
            Self::NotExecuting => "ERR_NOT_EXECUTING",
            Self::Canary => "ERR_CANARY",
            Self::NoRecipient => "ERR_NO_RECIPIENT",
            Self::PayeeMismatch => "ERR_PAYEE_MISMATCH",
            Self::UnknownItem => "ERR_UNKNOWN_ITEM",
            Self::AlreadyPaid => "ERR_ALREADY_PAID",
            Self::NotDue => "ERR_NOT_DUE",
            Self::PeriodWithheld => "ERR_PERIOD_WITHHELD",
            Self::AmountMismatch => "ERR_AMOUNT_MISMATCH",
            Self::CapExceeded => "ERR_CAP_EXCEEDED",
            Self::InsufficientFunds => "ERR_INSUFFICIENT_FUNDS",
            Self::InFlight => "ERR_IN_FLIGHT",
        }
    }
    /// The gate (1 to 6) that produces this code.
    pub fn gate(&self) -> u8 {
        match self {
            Self::Revoked | Self::NotExecuting => 1,
            Self::Canary | Self::NoRecipient | Self::PayeeMismatch => 2,
            Self::UnknownItem | Self::AlreadyPaid => 3,
            Self::NotDue | Self::PeriodWithheld => 4,
            Self::AmountMismatch | Self::CapExceeded | Self::InsufficientFunds => 5,
            Self::InFlight => 6,
        }
    }
}

#[derive(
    Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Copy, Debug, PartialEq, Eq,
)]
#[serde(rename_all = "lowercase")]
pub enum Rating {
    Allow,
    Warn,
    Block,
}

#[derive(
    Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Copy, Debug, PartialEq, Eq,
)]
pub enum PeriodOutcome {
    Open,
    Eligible,
    Withheld,
    Review,
    ResolvedPay,
    ResolvedClosed,
}

impl PeriodOutcome {
    /// The period's retainer may be paid through the gates.
    pub fn pays(&self) -> bool {
        matches!(self, Self::Eligible | Self::ResolvedPay)
    }
}

#[derive(
    Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Copy, Debug, PartialEq, Eq,
)]
pub enum ItemStatus {
    Open,
    Delivered,
    Disputed,
    Eligible,
    Paid,
    AssumedPaid,
    Reserved,
    Unfunded,
}

#[derive(
    Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Copy, Debug, PartialEq, Eq,
)]
#[serde(rename_all = "lowercase")]
pub enum Via {
    Agent,
    Claim,
    Close,
}

/// The payment lock.
#[derive(Serialize, Deserialize, BorshSerialize, BorshDeserialize, Clone, Debug, PartialEq, Eq)]
pub struct InFlight {
    pub payment_id: u64,
    pub item: u32,
    #[serde(with = "u128_str")]
    pub amount: Amount,
    pub recipient: AccountId,
    pub via: Via,
    pub since_block: u64,
    #[serde(with = "u128_str")]
    pub escrow_before: Amount,
}

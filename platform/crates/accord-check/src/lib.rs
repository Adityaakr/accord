//! Check a payment before signing it: would an agreement's `act(Pay)` accept it or refuse it, and at which gate.
//!
//! The decision is `accord_core::gates::check_pay`, the function the agreement contract itself calls; nothing here
//! re-implements a gate. What this crate adds is the glue the contract runs before `check_pay`, rebuilt from the
//! agreement's own views (`get_agreement`, `get_items`) instead of its storage:
//!
//! - `act`'s malformed-input checks on the recipient (release 4 and later: at most 64 bytes, a canary spelling in
//!   another letter case becomes the canary, anything else must parse as an `AccountId`), from
//!   `contracts/agreement/src/payments.rs` `act`;
//! - `ItemState::normalize` (a delivery whose window lapsed counts as accepted) and `item_ctx`, from
//!   `contracts/agreement/src/lib.rs`;
//! - `pay_ctx`'s spendable amount (`funded - refunded - reserved`, plus an item's own reserve) and its lock
//!   (`in_flight || closing`), from `contracts/agreement/src/lib.rs`.
//!
//! The gate-by-gate list evaluates each gate on its own by making only the earlier gates pass and asking `check_pay`
//! again: a gate fails when `check_pay` then answers with one of that gate's codes. The first failing gate is always
//! the contract's answer (tested below).
//!
//! The wasm ABI is two exports: `alloc(len) -> ptr` and `check(ptr, len) -> u64` (`ptr << 32 | len` of the JSON
//! answer). Input and output are JSON; see `Input` and `Answer`.

use accord_core::gates::{check_pay, Caller, ItemCtx, PayCtx, PayRequest};
use accord_core::types::{
    u128_str, Amount, Evidence, ItemStatus, Kind, PeriodOutcome, RefusalCode, State,
};
use serde::{Deserialize, Serialize};

/// Which `act` the agreement's code runs. Releases 1 to 3 (code `8wMuMRre…`) took the recipient as given;
/// release 4 and later (code `ECgsrZwy…`) check it first (DECISIONS.md section 25, finding 8).
#[derive(Deserialize, Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Rules {
    Release3,
    Release4,
}

#[derive(Deserialize, Debug, Clone)]
pub struct RecipientView {
    pub account: String,
}

/// The fields of `get_agreement` the check reads.
#[derive(Deserialize, Debug, Clone)]
pub struct AgreementView {
    pub state: State,
    pub kind: Kind,
    pub canaries: Vec<String>,
    pub recipient: Option<RecipientView>,
    #[serde(with = "u128_str")]
    pub funded: Amount,
    #[serde(with = "u128_str")]
    pub paid: Amount,
    #[serde(with = "u128_str")]
    pub reserved: Amount,
    #[serde(with = "u128_str")]
    pub refunded: Amount,
    #[serde(with = "u128_str")]
    pub total: Amount,
    pub in_flight: Option<serde_json::Value>,
    pub closing: bool,
    pub agent_key: Option<String>,
    #[serde(default)]
    pub periods: Vec<PeriodOutcome>,
    /// The block's time in seconds, as the contract's `now()`.
    pub now: u64,
}

#[derive(Deserialize, Debug, Clone)]
pub struct DeliveryView {
    pub window_end: u64,
}

#[derive(Deserialize, Debug, Clone, Copy)]
pub struct ExceptionView {
    #[serde(with = "u128_str")]
    pub amount: Amount,
    pub waive_evidence: bool,
}

/// The fields of one `get_items` entry the check reads.
#[derive(Deserialize, Debug, Clone)]
pub struct ItemView {
    pub id: u32,
    #[serde(with = "u128_str")]
    pub amount: Amount,
    pub evidence: Evidence,
    pub status: ItemStatus,
    pub delivery: Option<DeliveryView>,
    pub exception: Option<ExceptionView>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct RequestView {
    pub item: u32,
    #[serde(with = "u128_str")]
    pub amount: Amount,
    pub recipient: String,
}

#[derive(Deserialize, Debug, Clone)]
pub struct Input {
    pub agreement: AgreementView,
    pub items: Vec<ItemView>,
    pub rules: Rules,
    pub request: RequestView,
}

#[derive(Serialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Verdict {
    /// `check_pay` returns a plan: `act` would send the transfer.
    Pay,
    /// `check_pay` returns a code: `act` records the refusal and returns normally.
    Refuse,
    /// `act` panics before any gate (malformed recipient): nothing is recorded.
    Panic,
}

#[derive(Serialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum GateStatus {
    Pass,
    Fail,
    /// The gate needs an item the earlier gates did not find payable, or `act` panicked first.
    NotEvaluated,
}

#[derive(Serialize, Debug, Clone)]
pub struct GateResult {
    pub gate: u8,
    pub name: &'static str,
    pub status: GateStatus,
    pub code: Option<String>,
}

#[derive(Serialize, Debug, Clone, Default)]
pub struct Facts {
    pub state: Option<State>,
    pub kind: Option<Kind>,
    pub agent_key: bool,
    pub canary: bool,
    pub approved_recipient: Option<String>,
    /// The recipient as `act` passes it to the gates (a canary spelling lower-cased on release 4).
    pub recipient_checked: String,
    pub item_found: bool,
    /// The item's status at the block's time, with a lapsed acceptance window counted as accepted.
    pub item_status: Option<ItemStatus>,
    pub window_end: Option<u64>,
    pub period: Option<u32>,
    pub period_outcome: Option<PeriodOutcome>,
    pub exception: bool,
    pub exception_waives_evidence: bool,
    #[serde(with = "opt_u128")]
    pub due_amount: Option<Amount>,
    #[serde(with = "u128_str")]
    pub entered_amount: Amount,
    #[serde(with = "u128_str")]
    pub total: Amount,
    #[serde(with = "u128_str")]
    pub paid: Amount,
    /// What the gates may spend: `pay_ctx`'s funded minus paid.
    #[serde(with = "u128_str")]
    pub available: Amount,
    pub in_flight: bool,
    pub now: u64,
}

#[derive(Serialize, Debug, Clone)]
pub struct Answer {
    pub verdict: Verdict,
    pub code: Option<String>,
    pub gates: Vec<GateResult>,
    pub facts: Facts,
}

mod opt_u128 {
    use serde::Serializer;
    pub fn serialize<S: Serializer>(v: &Option<u128>, s: S) -> Result<S::Ok, S::Error> {
        match v {
            Some(x) => s.serialize_str(&x.to_string()),
            None => s.serialize_none(),
        }
    }
}

const GATES: [&str; 6] = [
    "key_and_state",
    "recipient",
    "item",
    "evidence",
    "amount",
    "lock",
];

/// The gate a refusal code belongs to (README "The act() gates"). `ERR_NOT_EXECUTING` is gate 1's for an agent: gate
/// 3's `Settled` branch is unreachable for an agent caller, since gate 1 already refuses outside `Executing`.
fn gate_of(code: RefusalCode) -> u8 {
    use RefusalCode::*;
    match code {
        Revoked | NotExecuting => 1,
        Canary | NoRecipient | PayeeMismatch => 2,
        UnknownItem | AlreadyPaid => 3,
        NotDue | PeriodWithheld => 4,
        AmountMismatch | CapExceeded | InsufficientFunds => 5,
        InFlight => 6,
    }
}

fn code_str(code: RefusalCode) -> String {
    serde_json::to_value(code)
        .ok()
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or_default()
}

/// `ItemState::normalize` then `Agreement::item_ctx` (contracts/agreement/src/lib.rs), over a view entry.
fn item_ctx(a: &AgreementView, it: &ItemView) -> ItemCtx {
    let mut status = it.status;
    if let (ItemStatus::Delivered, Some(d)) = (status, &it.delivery) {
        if a.now >= d.window_end {
            status = ItemStatus::Eligible;
        }
    }
    let period = match it.evidence {
        Evidence::PeriodEligible { period } => Some(period),
        Evidence::DeliveryAccepted => None,
    };
    ItemCtx {
        id: it.id,
        amount: it.amount,
        status,
        window_end: it.delivery.as_ref().map(|d| d.window_end),
        period: period.and_then(|p| a.periods.get(p as usize).copied()),
        exception: it.exception.map(|e| (e.amount, e.waive_evidence)),
    }
}

/// `Agreement::pay_ctx` (contracts/agreement/src/lib.rs), over the views.
fn pay_ctx<'a>(a: &'a AgreementView, canaries: &'a [String], item: Option<ItemCtx>) -> PayCtx<'a> {
    let own_reserve = item
        .as_ref()
        .filter(|i| i.status == ItemStatus::Reserved)
        .map(|i| i.due_amount())
        .unwrap_or(0);
    let funded = a
        .funded
        .saturating_sub(a.refunded)
        .saturating_sub(a.reserved)
        .saturating_add(own_reserve);
    PayCtx {
        state: a.state,
        kind: a.kind,
        canaries,
        recipient: a.recipient.as_ref().map(|r| r.account.as_str()),
        item,
        total: a.total,
        paid: a.paid,
        funded,
        in_flight: a.in_flight.is_some() || a.closing,
    }
}

pub fn check(input: &Input) -> Answer {
    let a = &input.agreement;
    let req_in = &input.request;
    let canaries = &a.canaries;
    let mut facts = Facts {
        state: Some(a.state),
        kind: Some(a.kind),
        agent_key: a.agent_key.is_some(),
        approved_recipient: a.recipient.as_ref().map(|r| r.account.clone()),
        entered_amount: req_in.amount,
        total: a.total,
        paid: a.paid,
        in_flight: a.in_flight.is_some() || a.closing,
        now: a.now,
        ..Facts::default()
    };

    // act's malformed-input checks (release 4 and later), before any gate.
    let to = match input.rules {
        Rules::Release3 => Some(req_in.recipient.clone()),
        Rules::Release4 => {
            let lower = req_in.recipient.to_ascii_lowercase();
            if req_in.recipient.len() > 64 {
                None
            } else if canaries.contains(&lower) {
                Some(lower)
            } else if req_in
                .recipient
                .parse::<near_account_id::AccountId>()
                .is_ok()
            {
                Some(req_in.recipient.clone())
            } else {
                None
            }
        }
    };
    let Some(to) = to else {
        facts.recipient_checked = req_in.recipient.clone();
        return Answer {
            verdict: Verdict::Panic,
            code: Some("ERR_BAD_RECIPIENT".into()),
            gates: (0..6)
                .map(|i| GateResult {
                    gate: i as u8 + 1,
                    name: GATES[i],
                    status: GateStatus::NotEvaluated,
                    code: None,
                })
                .collect(),
            facts,
        };
    };
    facts.recipient_checked = to.clone();
    facts.canary = canaries.contains(&to);

    let item = input
        .items
        .iter()
        .find(|i| i.id == req_in.item)
        .map(|i| item_ctx(a, i));
    if let Some(i) = &item {
        facts.item_found = true;
        facts.item_status = Some(i.status);
        facts.window_end = i.window_end;
        facts.period_outcome = i.period;
        facts.exception = i.exception.is_some();
        facts.exception_waives_evidence = matches!(i.exception, Some((_, true)));
        facts.due_amount = Some(i.due_amount());
    }
    facts.period = input
        .items
        .iter()
        .find(|i| i.id == req_in.item)
        .and_then(|i| match i.evidence {
            Evidence::PeriodEligible { period } => Some(period),
            Evidence::DeliveryAccepted => None,
        });

    let ctx = pay_ctx(a, canaries, item.clone());
    facts.available = ctx.funded.saturating_sub(ctx.paid);
    // The caller: the current agent key. With none installed, only a recently revoked key can reach the gates
    // (ERR_REVOKED); any other key panics ERR_UNAUTHORIZED before them.
    let caller = Caller::Agent {
        key_revoked: a.agent_key.is_none(),
    };
    let req = PayRequest {
        item: req_in.item,
        amount: req_in.amount,
        recipient: to.as_str(),
    };

    // The contract's answer.
    let result = check_pay(&ctx, &req, a.now, caller);

    // Each gate on its own: the earlier gates made to pass, then check_pay again.
    let mut gates = Vec::with_capacity(6);
    let mut item_payable = true;
    for g in 1..=6u8 {
        let mut c = ctx.clone();
        let mut r = req.clone();
        let mut who = caller;
        if g > 1 {
            who = Caller::Agent { key_revoked: false };
            c.state = State::Executing;
        }
        if g > 2 {
            c.canaries = &[];
            c.recipient = Some(r.recipient);
        }
        if g > 3 && !item_payable {
            gates.push(GateResult {
                gate: g,
                name: GATES[g as usize - 1],
                status: GateStatus::NotEvaluated,
                code: None,
            });
            continue;
        }
        if g > 4 {
            if let Some(i) = c.item.as_mut() {
                i.status = ItemStatus::Eligible;
            }
        }
        if g > 5 {
            r.amount = c.item.as_ref().map(|i| i.due_amount()).unwrap_or(0);
            c.paid = 0;
            c.total = Amount::MAX;
            c.funded = Amount::MAX;
        }
        let code = match check_pay(&c, &r, a.now, who) {
            Err(code) if gate_of(code) == g => Some(code),
            _ => None,
        };
        if g == 3 && code.is_some() {
            item_payable = false;
        }
        gates.push(GateResult {
            gate: g,
            name: GATES[g as usize - 1],
            status: if code.is_some() {
                GateStatus::Fail
            } else {
                GateStatus::Pass
            },
            code: code.map(code_str),
        });
    }

    match result {
        Ok(_) => Answer {
            verdict: Verdict::Pay,
            code: None,
            gates,
            facts,
        },
        Err(code) => Answer {
            verdict: Verdict::Refuse,
            code: Some(code_str(code)),
            gates,
            facts,
        },
    }
}

/// JSON in, JSON out; a parse error is `{"error": "..."}`.
pub fn check_json(input: &[u8]) -> Vec<u8> {
    match serde_json::from_slice::<Input>(input) {
        Ok(i) => serde_json::to_vec(&check(&i)).unwrap_or_default(),
        Err(e) => {
            serde_json::to_vec(&serde_json::json!({ "error": e.to_string() })).unwrap_or_default()
        }
    }
}

#[cfg(target_arch = "wasm32")]
mod abi {
    /// A buffer of `len` bytes for the host to write the input into. Leaked; the host instantiates per call.
    #[no_mangle]
    pub extern "C" fn alloc(len: u32) -> *mut u8 {
        let mut v = Vec::<u8>::with_capacity(len as usize);
        let p = v.as_mut_ptr();
        core::mem::forget(v);
        p
    }

    /// # Safety
    /// `ptr` and `len` name a buffer `alloc` returned and the host filled.
    #[no_mangle]
    pub unsafe extern "C" fn check(ptr: *mut u8, len: u32) -> u64 {
        let input = core::slice::from_raw_parts(ptr, len as usize);
        let out = super::check_json(input).into_boxed_slice();
        let n = out.len() as u64;
        let p = Box::into_raw(out) as *mut u8 as u64;
        (p << 32) | n
    }
}

#[cfg(test)]
mod tests;

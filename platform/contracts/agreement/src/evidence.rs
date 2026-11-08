//! What makes an item payable: funding, deliveries (procurement), observations and periods (market-making agreements), and
//! exceptions the buyer approves.

use crate::signed;
use crate::*;
use accord_core::atlas;
use accord_core::hash::{sha256, signed_bytes, to_hex};
use near_sdk::json_types::U128;
use serde_json::json;

#[near]
impl Agreement {
    /// NEP-141 receiver: the buyer funds the escrow with `ft_transfer_call(…, "fund")`. Anything above the terms
    /// total is returned by the token.
    pub fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> U128 {
        require(
            env::predecessor_account_id() == self.token,
            "ERR_WRONG_TOKEN",
        );
        require(sender_id == self.buyer, "ERR_NOT_BUYER");
        require(msg == "fund", "ERR_BAD_MSG");
        self.require_state(State::Executing);
        // While `close` reads the balance for the refund, a new deposit would be stranded; the token returns it.
        require(!self.closing, "ERR_CLOSING");
        let room = self.total().saturating_sub(self.funded);
        let credit = amount.0.min(room);
        self.funded += credit;
        emit(
            "funded",
            json!({"from": sender_id, "amount": U128(credit), "total_funded": U128(self.funded)}),
        );
        U128(amount.0 - credit)
    }

    /// The vendor delivers an item: before the end of the term, and again only after a dispute.
    pub fn submit_delivery(&mut self, item: u32, evidence_hash: String, uri: String) {
        self.require_vendor();
        self.require_state(State::Executing);
        require(self.kind == Kind::Procurement, "ERR_WRONG_KIND");
        require(negotiation::is_hex(&evidence_hash, 64), "ERR_BAD_HASH");
        require(uri.len() <= 300, "ERR_TOO_LARGE");
        let t = now();
        require(t < self.term_end(), "ERR_DELIVERY_CLOSED");
        let idx = self
            .item_index(item)
            .unwrap_or_else(|| env::panic_str("ERR_UNKNOWN_ITEM"));
        let mut it = self.items[idx].clone();
        require(
            matches!(it.status, ItemStatus::Open | ItemStatus::Disputed),
            "ERR_NOT_DISPUTED",
        );
        let window = self.terms.get().as_ref().unwrap().acceptance_window_secs;
        it.status = ItemStatus::Delivered;
        it.delivery = Some(Delivery {
            evidence_hash: evidence_hash.clone(),
            uri: uri.clone(),
            at: t,
            window_end: t + window,
        });
        self.items.replace(idx, it);
        emit(
            "delivery_submitted",
            json!({"item": item, "evidence_hash": evidence_hash, "uri": uri}),
        );
    }

    #[payable]
    pub fn accept_delivery(&mut self, item: u32) {
        // Exactly 1 yoctoNEAR: only a full-access key can attach it, so a function-call key cannot call this.
        near_sdk::assert_one_yocto();
        self.require_buyer();
        self.require_state(State::Executing);
        let idx = self
            .item_index(item)
            .unwrap_or_else(|| env::panic_str("ERR_UNKNOWN_ITEM"));
        let mut it = self.items[idx].clone();
        require(it.status == ItemStatus::Delivered, "ERR_WRONG_STATE");
        let lapsed = it.normalize(now());
        if !lapsed {
            it.status = ItemStatus::Eligible;
            it.eligible_at = Some(now());
        }
        let hash = it.delivery.as_ref().map(|d| d.evidence_hash.clone());
        self.items.replace(idx, it);
        emit(
            "delivery_accepted",
            json!({"item": item, "evidence_hash": hash, "by": if lapsed { "window" } else { "buyer" }}),
        );
    }

    pub fn dispute_delivery(&mut self, item: u32, reason: String) {
        self.require_buyer();
        self.require_state(State::Executing);
        require(reason.len() <= MAX_REASON, "ERR_TOO_LARGE");
        let idx = self
            .item_index(item)
            .unwrap_or_else(|| env::panic_str("ERR_UNKNOWN_ITEM"));
        let mut it = self.items[idx].clone();
        require(it.status == ItemStatus::Delivered, "ERR_WRONG_STATE");
        require(!it.normalize(now()), "ERR_WINDOW_CLOSED");
        it.status = ItemStatus::Disputed;
        let hash = it.delivery.as_ref().map(|d| d.evidence_hash.clone());
        self.items.replace(idx, it);
        emit(
            "delivery_disputed",
            json!({"item": item, "evidence_hash": hash, "reason": reason}),
        );
    }

    /// The vendor asks for a one-off change to one item: a new amount within the total, optionally waiving its
    /// evidence. Never a recipient change.
    pub fn request_exception(
        &mut self,
        item: u32,
        amount: U128,
        waive_evidence: bool,
        reason: String,
    ) -> u32 {
        self.require_vendor();
        self.require_state(State::Executing);
        // No single item can be worth more than the whole agreement.
        require(
            reason.len() <= MAX_REASON && amount.0 > 0 && amount.0 <= self.total(),
            "ERR_BAD_EXCEPTION",
        );
        let idx = self
            .item_index(item)
            .unwrap_or_else(|| env::panic_str("ERR_UNKNOWN_ITEM"));
        require(
            !matches!(
                self.items[idx].status,
                ItemStatus::Paid | ItemStatus::Unfunded
            ),
            "ERR_ALREADY_PAID",
        );
        // A reserved item's amount is set aside; changing it would strand the difference.
        require(
            self.items[idx].status != ItemStatus::Reserved,
            "ERR_RESERVED",
        );
        require(!self.items[idx].exception_used, "ERR_EXCEPTION_USED");
        self.create_exception(item, amount.0, waive_evidence, reason, "vendor")
    }

    #[payable]
    pub fn approve_exception(&mut self, id: u32) {
        // Exactly 1 yoctoNEAR: only a full-access key can attach it, so a function-call key cannot call this.
        near_sdk::assert_one_yocto();
        self.require_buyer();
        self.require_state(State::Executing);
        let mut ex = self.pending_exception(id);
        let idx = self.item_index(ex.item).expect("exception item exists");
        let mut it = self.items[idx].clone();
        require(!it.exception_used, "ERR_EXCEPTION_USED");
        require(it.status != ItemStatus::Paid, "ERR_ALREADY_PAID");
        // A payment of this item is in flight at the old amount; changing the amount now would let it settle at an
        // amount the buyer no longer approves.
        require(
            self.in_flight.as_ref().is_none_or(|f| f.item != ex.item),
            "ERR_IN_FLIGHT",
        );
        require(it.status != ItemStatus::Reserved, "ERR_RESERVED");
        // The assumed payment stops counting toward the total once the exception reopens the item.
        let paid_without = if it.status == ItemStatus::AssumedPaid {
            self.paid.saturating_sub(it.settled)
        } else {
            self.paid
        };
        require(
            paid_without.saturating_add(ex.amount) <= self.total(),
            "ERR_EXCEEDS_TOTAL",
        );
        if it.status == ItemStatus::AssumedPaid {
            self.paid = paid_without;
            it.settled = 0;
            it.settled_by = None;
            it.status = ItemStatus::Eligible;
            it.eligible_at = Some(now());
        } else if ex.waive_evidence && !matches!(it.status, ItemStatus::Reserved) {
            it.status = ItemStatus::Eligible;
            it.eligible_at = Some(now());
        }
        it.exception = Some(ApprovedException {
            amount: ex.amount,
            waive_evidence: ex.waive_evidence,
        });
        it.exception_used = true;
        it.pending_exception = None;
        self.items.replace(idx, it);
        ex.status = ExceptionStatus::Approved;
        self.exceptions.replace(id, ex.clone());
        emit(
            "exception_approved",
            json!({"id": id, "item": ex.item, "amount": U128(ex.amount),
                   "waive_evidence": ex.waive_evidence, "by": self.buyer}),
        );
    }

    pub fn reject_exception(&mut self, id: u32) {
        self.require_buyer();
        let mut ex = self.pending_exception(id);
        let idx = self.item_index(ex.item).expect("exception item exists");
        let mut it = self.items[idx].clone();
        it.pending_exception = None;
        self.items.replace(idx, it);
        ex.status = ExceptionStatus::Rejected;
        self.exceptions.replace(id, ex.clone());
        emit(
            "exception_rejected",
            json!({"id": id, "item": ex.item, "amount": U128(ex.amount), "by": self.buyer}),
        );
    }

    /// Anyone submits an observation the observer signed. A copy of a stored one is ignored; a different one for the
    /// same slot is logged as a conflict and never stored, and its period closes as `Review`.
    pub fn record_observation(&mut self, observation: Observation, sig: String) -> String {
        self.require_state(State::Executing);
        let terms = self.terms.get().clone().expect("terms");
        let at = terms
            .atlas
            .clone()
            .unwrap_or_else(|| env::panic_str("ERR_WRONG_KIND"));
        let signed_out = observation_payload(&observation, &sig);
        require(
            signed::verify(&signed_out, &self.cfg().observer_job.signing_pubkey),
            "ERR_BAD_SIGNATURE",
        );
        require(
            observation.agreement == env::current_account_id().as_str()
                && observation.venue == at.venue
                && observation.band_bps == at.depth_band_bps,
            "ERR_WRONG_VENUE",
        );
        let (p, k) = (observation.period, observation.slot);
        require(
            p < at.periods && k < at.slots_per_period,
            "ERR_OUT_OF_WINDOW",
        );
        let (start, end) = atlas::slot_window(
            self.period_start(p, &at),
            at.period_secs,
            at.slots_per_period,
            k,
        );
        require(
            (start..end).contains(&observation.slot_time)
                && observation.venue_block.time >= observation.slot_time,
            "ERR_OUT_OF_WINDOW",
        );
        let mut period = self.periods[p].clone();
        require(period.outcome == PeriodOutcome::Open, "ERR_PERIOD_CLOSED");
        let hash = to_hex(&sha256(&signed_bytes(&signed_out)));
        if let Some(stored) = self.observations.get(&(p, k)) {
            if stored.hash == hash {
                return "duplicate".into();
            }
            let stored_hash = stored.hash.clone();
            period.conflict = true;
            self.periods.replace(p, period);
            self.observation_conflicts += 1;
            emit(
                "observation_conflict",
                json!({"period": p, "slot": k, "stored_hash": stored_hash, "offered_hash": hash,
                       "offered_block": observation.venue_block}),
            );
            return "conflict".into();
        }
        let pass = atlas::passes(&at, &observation, self.params.require_two_sided);
        emit(
            "observation_recorded",
            json!({"period": p, "slot": k, "slot_time": observation.slot_time,
                   "venue_block": observation.venue_block, "spread_bps": observation.spread_bps,
                   "depth_bid": U128(observation.depth_bid), "depth_ask": U128(observation.depth_ask),
                   "two_sided": observation.two_sided, "pass": pass}),
        );
        period.recorded |= 1 << k;
        self.periods.replace(p, period);
        self.observations.insert(
            (p, k),
            StoredObservation {
                observation,
                sig,
                hash,
                pass,
            },
        );
        self.require_storage_covered();
        "recorded".into()
    }

    /// After the period plus the observation grace: Eligible, Review or Withheld by `atlas::evaluate`.
    pub fn close_period(&mut self, period: u32) -> PeriodOutcome {
        self.require_state(State::Executing);
        let at = self
            .terms
            .get()
            .as_ref()
            .and_then(|t| t.atlas.clone())
            .unwrap_or_else(|| env::panic_str("ERR_WRONG_KIND"));
        require(period < at.periods, "ERR_UNKNOWN_PERIOD");
        let end = self.period_start(period, &at) + at.period_secs;
        require(
            now() >= end + self.params.observation_grace_secs,
            "ERR_TOO_EARLY",
        );
        let mut ps = self.periods[period].clone();
        require(ps.outcome == PeriodOutcome::Open, "ERR_PERIOD_CLOSED");
        let observations: Vec<Observation> = (0..at.slots_per_period)
            .filter(|k| ps.recorded & (1 << k) != 0)
            .filter_map(|k| {
                self.observations
                    .get(&(period, k))
                    .map(|s| s.observation.clone())
            })
            .collect();
        let summary = atlas::evaluate(
            &at,
            &observations,
            self.params.require_two_sided,
            ps.conflict,
        );
        ps.outcome = summary.outcome;
        ps.passed = summary.passed;
        ps.observed = summary.observed;
        ps.uptime_bps = summary.uptime_bps;
        self.periods.replace(period, ps.clone());
        if summary.outcome == PeriodOutcome::Eligible {
            self.make_period_item_eligible(period);
        }
        emit(
            "period_closed",
            json!({"period": period, "passed": summary.passed, "observed": summary.observed,
                   "threshold": at.pass_threshold, "uptime_bps": summary.uptime_bps,
                   "conflicts": ps.conflict, "outcome": summary.outcome}),
        );
        summary.outcome
    }

    /// The buyer decides a `Review` or `Withheld` period.
    #[payable]
    pub fn resolve_period(&mut self, period: u32, pay: bool) {
        // Exactly 1 yoctoNEAR: only a full-access key can attach it, so a function-call key cannot call this.
        near_sdk::assert_one_yocto();
        self.require_buyer();
        self.require_state(State::Executing);
        let mut ps = self
            .periods
            .get(period)
            .cloned()
            .unwrap_or_else(|| env::panic_str("ERR_UNKNOWN_PERIOD"));
        require(
            matches!(ps.outcome, PeriodOutcome::Review | PeriodOutcome::Withheld),
            "ERR_WRONG_STATE",
        );
        ps.outcome = if pay {
            PeriodOutcome::ResolvedPay
        } else {
            PeriodOutcome::ResolvedClosed
        };
        self.periods.replace(period, ps);
        if pay {
            self.make_period_item_eligible(period);
        }
        emit("period_resolved", json!({"period": period, "pay": pay}));
    }
}

impl Agreement {
    pub(crate) fn create_exception(
        &mut self,
        item: u32,
        amount: Amount,
        waive_evidence: bool,
        reason: String,
        by: &str,
    ) -> u32 {
        require(
            self.exceptions.len() < MAX_EXCEPTIONS,
            "ERR_EXCEPTIONS_FULL",
        );
        let idx = self
            .item_index(item)
            .unwrap_or_else(|| env::panic_str("ERR_UNKNOWN_ITEM"));
        let mut it = self.items[idx].clone();
        require(it.pending_exception.is_none(), "ERR_EXCEPTION_PENDING");
        let id = self.exceptions.len();
        it.pending_exception = Some(id);
        self.items.replace(idx, it);
        self.exceptions.push(Exception {
            id,
            item,
            amount,
            waive_evidence,
            reason: reason.clone(),
            by: by.to_string(),
            status: ExceptionStatus::Pending,
            at: now(),
        });
        self.require_storage_covered();
        emit(
            "exception_requested",
            json!({"id": id, "item": item, "amount": U128(amount), "waive_evidence": waive_evidence,
                   "by": by, "reason": reason}),
        );
        id
    }

    fn pending_exception(&self, id: u32) -> Exception {
        let ex = self
            .exceptions
            .get(id)
            .cloned()
            .unwrap_or_else(|| env::panic_str("ERR_UNKNOWN_EXCEPTION"));
        require(ex.status == ExceptionStatus::Pending, "ERR_WRONG_STATE");
        ex
    }

    fn make_period_item_eligible(&mut self, period: u32) {
        if let Some(idx) = (0..self.items.len()).find(|&i| self.items[i].period() == Some(period)) {
            let mut it = self.items[idx].clone();
            if it.status == ItemStatus::Open {
                it.status = ItemStatus::Eligible;
                it.eligible_at = Some(now());
                self.items.replace(idx, it);
            }
        }
    }

    pub(crate) fn period_start(&self, period: u32, at: &AtlasTerms) -> u64 {
        self.executing_at.expect("executing") + u64::from(period) * at.period_secs
    }

    pub(crate) fn term_end(&self) -> u64 {
        self.executing_at.expect("executing") + self.terms.get().as_ref().unwrap().duration_secs
    }
}

/// The observer's signed output: the observation plus `mode`, `status` and `sig` (INTERFACES.md 7.3).
pub fn observation_payload(o: &Observation, sig: &str) -> serde_json::Value {
    let mut v = serde_json::to_value(o).expect("observation serialises");
    let m = v.as_object_mut().expect("object");
    m.insert("mode".into(), json!("observe"));
    m.insert("status".into(), json!("observed"));
    m.insert("sig".into(), json!(sig));
    v
}

use crate::negotiation;

//! The payment path (ARCHITECTURE.md section 6): the agent's key, `act` and its six gates, the payment lock and
//! its callback, the stale-lock resolution, the vendor's claim, `close`, and the buyer's NEAR withdrawal.

use crate::*;
use accord_core::gates::{check_exception_request, check_pay, Caller, PayPlan, PayRequest};
use near_sdk::json_types::U128;
use near_sdk::{Allowance, PromiseOrValue};
use serde_json::json;

/// A key's allowance must cover at least one `act` reserved at 80 TGas (0.08 NEAR) and stays bounded.
pub const MIN_ALLOWANCE: u128 = 100_000_000_000_000_000_000_000; // 0.1 NEAR
pub const MIN_CLOSE_GAS: u64 = 150;
/// The balance callbacks send the refund (`ft_transfer` 15 TGas and its own callback 10 TGas) and need headroom.
pub const BALANCE_CALLBACK_GAS: u64 = 60;
pub const MAX_ALLOWANCE: u128 = 5_000_000_000_000_000_000_000_000; // 5 NEAR

#[near(serializers = [json])]
#[derive(Debug, PartialEq)]
pub enum CloseStep {
    Paying { item: u32 },
    Reserved { item: u32 },
    Unfunded { item: u32 },
    Settling,
    RefundRetried,
    Refused { code: RefusalCode, seq: u64 },
}

#[near]
impl Agreement {
    /// The buyer installs the agent's one key: a `FunctionCall` key on this account, for `act` only.
    #[payable]
    pub fn install_agent_key(&mut self, public_key: PublicKey, allowance: U128) -> Promise {
        // Exactly 1 yoctoNEAR: only a full-access key can attach it, so a function-call key cannot call this.
        near_sdk::assert_one_yocto();
        self.require_buyer();
        self.require_state(State::Executing);
        // The ceiling is the one both parties approved in the params (`params_hash`), within the global bounds.
        require(
            (MIN_ALLOWANCE..=MAX_ALLOWANCE).contains(&allowance.0)
                && allowance.0 <= self.params.agent_allowance,
            "ERR_ALLOWANCE",
        );
        require(
            !self.revoked_keys.contains(&public_key)
                && self.agent_key.as_ref() != Some(&public_key),
            "ERR_KEY_REUSED",
        );
        let me = env::current_account_id();
        let mut p = Promise::new(me.clone());
        if let Some(old) = self.agent_key.take() {
            self.remember_revoked(old.clone());
            emit(
                "agent_key_revoked",
                json!({"public_key": old, "reason": "replaced"}),
            );
            p = p.delete_key(old);
        }
        self.agent_key = Some(public_key.clone());
        self.refusal_times.clear();
        emit(
            "agent_key_installed",
            json!({"public_key": public_key, "allowance": allowance}),
        );
        let allowance = Allowance::limited(NearToken::from_yoctonear(allowance.0))
            .unwrap_or_else(|| env::panic_str("ERR_ALLOWANCE"));
        p.add_access_key_allowance(public_key, allowance, me, "act")
    }

    /// The kill switch: marks the key revoked in this receipt and deletes it in the same transaction.
    pub fn revoke_agent(&mut self) {
        self.require_buyer();
        require(self.agent_key.is_some(), "ERR_NO_AGENT_KEY");
        self.revoke_current("buyer");
    }

    /// The agent's only entry point. Malformed input and unknown signers panic; every refusal is recorded and
    /// returned normally.
    pub fn act(&mut self, action: Action) -> PromiseOrValue<ActOutcome> {
        require(
            env::predecessor_account_id() == env::current_account_id(),
            "ERR_UNAUTHORIZED",
        );
        let signer = env::signer_account_pk();
        let is_current = self.agent_key.as_ref() == Some(&signer);
        require(
            is_current || self.revoked_keys.contains(&signer),
            "ERR_UNAUTHORIZED",
        );
        let caller = Caller::Agent {
            key_revoked: !is_current,
        };
        let canaries = self.canaries();
        let recipient = self.current_recipient_account().map(String::from);
        match action {
            Action::Pay {
                item,
                amount,
                recipient: to,
                memo,
            } => {
                require(
                    memo.as_ref().is_none_or(|m| m.len() <= MAX_REASON),
                    "ERR_TOO_LARGE",
                );
                // Malformed input panics before any gate: the recipient is an account id (at most 64 bytes). A
                // spelling of a canary in another case is still the canary, so the tripwire fires on it.
                require(to.len() <= 64, "ERR_BAD_RECIPIENT");
                let lower = to.to_ascii_lowercase();
                let to = if canaries.contains(&lower) {
                    lower
                } else {
                    require(to.parse::<AccountId>().is_ok(), "ERR_BAD_RECIPIENT");
                    to
                };
                let item_ctx = self.item_ctx_by_id(item);
                let ctx = self.pay_ctx(&canaries, recipient.as_deref(), item_ctx);
                let req = PayRequest {
                    item,
                    amount,
                    recipient: to.as_str(),
                };
                match check_pay(&ctx, &req, now(), caller) {
                    Ok(plan) => self.start_payment(plan, Via::Agent, memo).into(),
                    Err(code) => {
                        let seq = self.refuse(
                            code,
                            item,
                            amount,
                            &to,
                            Some(signer),
                            Via::Agent,
                            is_current,
                        );
                        PromiseOrValue::Value(ActOutcome::Refused { code, seq })
                    }
                }
            }
            Action::RequestException {
                item,
                amount,
                waive_evidence,
                reason,
            } => {
                // No single item can be worth more than the whole agreement.
                require(
                    reason.len() <= MAX_REASON && amount > 0 && amount <= self.total(),
                    "ERR_BAD_EXCEPTION",
                );
                let item_ctx = self.item_ctx_by_id(item);
                let ctx = self.pay_ctx(&canaries, recipient.as_deref(), item_ctx);
                let pending = self
                    .item_index(item)
                    .and_then(|i| self.items[i].pending_exception);
                let used = self
                    .item_index(item)
                    .is_some_and(|i| self.items[i].exception_used);
                let by_agent = self.exceptions.iter().filter(|e| e.by == "agent").count();
                match check_exception_request(&ctx, item, caller) {
                    // Refused and recorded like any other refusal, after the key and state gates, and counted: the
                    // item already has a pending request (one per item), the exception list is full, the agent's own
                    // share of it is (so the vendor always has room), or this item's one exception is used (a new
                    // request could never be approved).
                    Ok(())
                        if pending.is_some()
                            || self.exceptions.len() >= MAX_EXCEPTIONS
                            || by_agent >= MAX_AGENT_EXCEPTIONS as usize
                            || used =>
                    {
                        let code = RefusalCode::CapExceeded;
                        let seq = self.refuse(
                            code,
                            item,
                            amount,
                            "",
                            Some(signer),
                            Via::Agent,
                            is_current,
                        );
                        PromiseOrValue::Value(ActOutcome::Refused { code, seq })
                    }
                    Ok(()) => {
                        let id =
                            self.create_exception(item, amount, waive_evidence, reason, "agent");
                        PromiseOrValue::Value(ActOutcome::ExceptionRequested { id })
                    }
                    Err(code) => {
                        let seq = self.refuse(
                            code,
                            item,
                            amount,
                            "",
                            Some(signer),
                            Via::Agent,
                            is_current,
                        );
                        PromiseOrValue::Value(ActOutcome::Refused { code, seq })
                    }
                }
            }
        }
    }

    /// The token's answer to a payment. Only the lock with this `payment_id` is cleared; a late answer after
    /// `resolve_stale_lock` settles its own item and leaves any newer lock alone.
    #[private]
    pub fn on_payment_resolved(
        &mut self,
        payment_id: u64,
        item: u32,
        amount: U128,
        recipient: AccountId,
        via: Via,
    ) -> ActOutcome {
        let ok = env::promise_result_checked(0, 64).is_ok();
        let idx = self.item_index(item).expect("item of a payment exists");
        let amount = amount.0;
        let current = self.in_flight.as_ref().map(|f| f.payment_id) == Some(payment_id);
        let mut it = self.items[idx].clone();
        if current {
            self.in_flight = None;
            if ok {
                if it.status == ItemStatus::Reserved {
                    self.reserved = self.reserved.saturating_sub(amount);
                }
                it.status = ItemStatus::Paid;
                it.settled = amount;
                it.settled_by = Some(payment_id);
                self.paid += amount;
                self.write_receipt(payment_id, &it, amount, &recipient, via);
            } else if via == Via::Close && it.status != ItemStatus::Reserved {
                it.status = ItemStatus::Reserved;
                self.reserved += amount;
                emit(
                    "item_reserved",
                    json!({"item": item, "amount": U128(amount), "reason": "transfer_failed"}),
                );
            }
        } else {
            // `resolve_stale_lock` already settled this payment's item. The token's answer is the truth, but it may
            // only change the item when the item's settlement is still this payment's own.
            let mine = it.settled_by == Some(payment_id);
            match (ok, mine, it.status) {
                (true, true, ItemStatus::AssumedPaid) => {
                    it.status = ItemStatus::Paid;
                    self.write_receipt(payment_id, &it, amount, &recipient, via);
                }
                (false, true, ItemStatus::AssumedPaid | ItemStatus::Paid) => {
                    self.paid = self.paid.saturating_sub(it.settled);
                    // After `Settled` only a claim on a `Reserved` item can pay, and the close refund left this
                    // amount on the account (the refund never exceeds the ledger): set it aside for the vendor.
                    if self.state == State::Settled {
                        self.reserved += it.settled;
                        it.status = ItemStatus::Reserved;
                    } else {
                        it.status = ItemStatus::Eligible;
                    }
                    it.settled = 0;
                    it.settled_by = None;
                }
                (true, false, _) => {
                    // The transfer happened after the item was reopened by an exception. The money left, so it is
                    // recorded: the item is paid by this payment if nothing else paid it, and counted either way.
                    if it.status != ItemStatus::Paid {
                        if it.status == ItemStatus::Reserved {
                            self.reserved = self.reserved.saturating_sub(amount);
                        }
                        it.status = ItemStatus::Paid;
                        it.settled = amount;
                        it.settled_by = Some(payment_id);
                    } else {
                        emit(
                            "duplicate_payment",
                            json!({"payment_id": payment_id, "item": item, "amount": U128(amount)}),
                        );
                    }
                    self.paid += amount;
                    self.write_receipt(payment_id, &it, amount, &recipient, via);
                }
                _ => {}
            }
        }
        self.items.replace(idx, it);
        let event = if ok {
            "payment_settled"
        } else {
            "payment_failed"
        };
        emit(
            event,
            json!({
                "payment_id": payment_id, "item": item, "amount": U128(amount),
                "recipient": recipient, "reason": if ok { None } else { Some("transfer_failed") },
                "late": !current,
            }),
        );
        if ok {
            ActOutcome::Sent {
                item,
                amount,
                recipient: recipient.to_string(),
            }
        } else {
            ActOutcome::Failed {
                item,
                reason: "transfer_failed".into(),
            }
        }
    }

    /// A lock whose callback never ran: read the real balance. Below the ledger before the payment, the transfer
    /// happened; anything else cannot tell, so the item counts as paid (`AssumedPaid`) until an exception reopens it.
    pub fn resolve_stale_lock(&mut self) -> PromiseOrValue<()> {
        // A close whose balance callback never ran leaves `closing` set; clearing it lets `close()` read again.
        if self.in_flight.is_none()
            && self.closing
            && env::block_height() >= self.closing_since + STALE_LOCK_BLOCKS
        {
            self.closing = false;
            emit(
                "closing_cleared",
                json!({"since_block": self.closing_since}),
            );
            return PromiseOrValue::Value(());
        }
        let f = self
            .in_flight
            .as_ref()
            .unwrap_or_else(|| env::panic_str("ERR_NO_STALE_LOCK"));
        require(
            env::block_height() >= f.since_block + STALE_LOCK_BLOCKS,
            "ERR_NO_STALE_LOCK",
        );
        let id = f.payment_id;
        self.balance_of_self()
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(gas(20))
                    .on_stale_balance(id),
            )
            .into()
    }

    #[private]
    pub fn on_stale_balance(&mut self, payment_id: u64) {
        let Some(f) = self
            .in_flight
            .clone()
            .filter(|f| f.payment_id == payment_id)
        else {
            return;
        };
        let Some(balance) = read_u128() else {
            return; // the read failed; anyone can call again
        };
        let idx = self.item_index(f.item).expect("item of a payment exists");
        let mut it = self.items[idx].clone();
        let proven = balance < f.escrow_before;
        if it.status == ItemStatus::Reserved {
            self.reserved = self.reserved.saturating_sub(f.amount);
        }
        it.status = if proven {
            ItemStatus::Paid
        } else {
            ItemStatus::AssumedPaid
        };
        it.settled = f.amount;
        it.settled_by = Some(f.payment_id);
        self.paid += f.amount;
        if proven {
            self.write_receipt(
                f.payment_id,
                &it,
                f.amount,
                &f.recipient.parse().unwrap(),
                f.via,
            );
        }
        self.items.replace(idx, it);
        self.in_flight = None;
        emit(
            "lock_resolved",
            json!({
                "payment_id": payment_id, "item": f.item,
                "outcome": if proven { "paid" } else { "assumed_paid" }, "balance": U128(balance),
            }),
        );
    }

    /// The vendor pulls an eligible payment to the authorised recipient after the claim delay, agent or no agent.
    /// Refusals are events only (never in the agent's refusal log) and never count toward the agent's limit.
    pub fn claim(&mut self, item: u32) -> PromiseOrValue<ActOutcome> {
        self.require_vendor();
        let canaries = self.canaries();
        let recipient = self.current_recipient_account().map(String::from);
        let t = now();
        let (amount, ready) = match self.normalized_item(item) {
            Some(it) => (
                it.due_amount(),
                it.eligible_at
                    .is_some_and(|e| t >= e + self.params.claim_delay_secs),
            ),
            None => (0, true),
        };
        let to = recipient.clone().unwrap_or_default();
        let result = if ready {
            let ctx = self.pay_ctx(&canaries, recipient.as_deref(), self.item_ctx_by_id(item));
            let req = PayRequest {
                item,
                amount,
                recipient: to.as_str(),
            };
            check_pay(&ctx, &req, t, Caller::VendorClaim)
        } else {
            Err(RefusalCode::NotDue)
        };
        match result {
            Ok(plan) => self.start_payment(plan, Via::Claim, None).into(),
            Err(code) => {
                // An event only, as close's refusals are: the 128-slot log is the agent's record, and the vendor's
                // claims must never evict it.
                emit(
                    "act_refused",
                    json!({"seq": null, "code": code, "item": item, "amount": U128(amount),
                           "recipient": to, "signer": null, "via": Via::Claim}),
                );
                PromiseOrValue::Value(ActOutcome::Refused {
                    code,
                    seq: self.refusal_seq,
                })
            }
        }
    }

    /// One step per call after the end of the term (or after both parties asked for `mutual_close`): pay the next
    /// eligible item, set aside what cannot be paid, then refund the buyer: the real balance when nothing is owed to
    /// the vendor, else the real balance minus what is reserved, capped at the ledger's `funded - paid - reserved`.
    pub fn close(&mut self) -> CloseStep {
        if self.state == State::Settled && (self.refund_owed > 0 || !self.owed_to_vendor()) {
            // Retry against the balance the account actually holds now, never more than is owed; once nothing is
            // owed to the vendor any more, sweep what is left (a stray deposit) to the buyer.
            self.balance_of_self()
                .then(
                    Self::ext(env::current_account_id())
                        .with_static_gas(gas(BALANCE_CALLBACK_GAS))
                        .on_refund_balance(),
                )
                .detach();
            return CloseStep::RefundRetried;
        }
        self.require_state(State::Executing);
        // Enough gas that the balance callback and the refund it sends cannot be starved by the caller.
        require(env::prepaid_gas() >= gas(MIN_CLOSE_GAS), "ERR_LOW_GAS");
        if self.mutual_close != (true, true) {
            self.require_term_over();
        }
        if self.in_flight.is_some() || self.closing {
            // Not written to the refusal log: anyone can call `close`, and the log is the agent's record.
            return CloseStep::Refused {
                code: RefusalCode::InFlight,
                seq: self.refusal_seq,
            };
        }
        self.close_step()
    }

    /// Both parties end the agreement early; the second call closes it like `close()`. Items not yet eligible are
    /// not paid.
    #[payable]
    pub fn mutual_close(&mut self) -> Option<CloseStep> {
        // Exactly 1 yoctoNEAR: only a full-access key can attach it, so a function-call key cannot call this.
        near_sdk::assert_one_yocto();
        let role = self.require_party();
        self.require_state(State::Executing);
        match role {
            Role::Buyer => self.mutual_close.0 = true,
            Role::Vendor => self.mutual_close.1 = true,
        }
        emit(
            "mutual_close_requested",
            json!({"by": env::predecessor_account_id()}),
        );
        (self.mutual_close == (true, true)).then(|| self.close())
    }

    #[private]
    pub fn on_close_balance(&mut self) {
        self.closing = false;
        let Some(balance) = read_u128() else {
            return; // the read failed; `close()` again
        };
        if self.state != State::Executing {
            return;
        }
        self.refunded = self
            .funded
            .saturating_sub(self.paid)
            .saturating_sub(self.reserved);
        self.state = State::Settled;
        // The agent's authority ends with the agreement.
        if self.agent_key.is_some() {
            self.revoke_current("settled");
        }
        // While anything is owed to the vendor (a reserved item, or an `AssumedPaid` item a late failed callback
        // would set aside again), never more than the ledger owes the buyer: the balance read can include tokens an
        // `ft_transfer_call` credited and `ft_on_transfer` refused (`ERR_CLOSING`), which the token takes back from
        // this account afterwards. With nothing owed, the whole balance goes back (stray deposits included).
        let refund = if self.owed_to_vendor() {
            balance.saturating_sub(self.reserved).min(self.refunded)
        } else {
            balance
        };
        emit(
            "settled",
            json!({"paid": U128(self.paid), "reserved": U128(self.reserved), "refunded": U128(refund)}),
        );
        if refund > 0 {
            self.refund_buyer(refund);
        }
    }

    #[private]
    pub fn on_refund_balance(&mut self) {
        let Some(balance) = read_u128() else {
            return;
        };
        let refund = if self.owed_to_vendor() {
            self.refund_owed.min(balance.saturating_sub(self.reserved))
        } else {
            balance
        };
        if refund > 0 {
            self.refund_buyer(refund);
        }
    }

    #[private]
    pub fn on_refund_resolved(&mut self, amount: U128) {
        if env::promise_result_checked(0, 64).is_err() {
            self.refund_owed = self.refund_owed.saturating_add(amount.0);
            emit("refund_failed", json!({"amount": amount}));
        }
    }

    /// After `Settled`: liquid NEAR above the storage stake to the buyer, keeping a little while an item is reserved.
    #[payable]
    pub fn withdraw_near(&mut self) -> Promise {
        // Exactly 1 yoctoNEAR: only a full-access key can attach it, so a function-call key cannot call this.
        near_sdk::assert_one_yocto();
        self.require_buyer();
        // Settled, or an agreement that never executed: the creation deposit's spare NEAR goes back to the buyer.
        require(
            matches!(
                self.state,
                State::Settled | State::Cancelled | State::NoDeal
            ),
            "ERR_WRONG_STATE",
        );
        let mut keep = self.storage_stake();
        if self.reserved > 0 {
            keep = keep.saturating_add(RESERVED_KEEP);
        }
        let liquid = env::account_balance().saturating_sub(keep);
        require(!liquid.is_zero(), "ERR_NOTHING_TO_WITHDRAW");
        emit(
            "near_withdrawn",
            json!({"amount": U128(liquid.as_yoctonear())}),
        );
        Promise::new(self.buyer.clone()).transfer(liquid)
    }
}

impl Agreement {
    /// Money the vendor may still take after `Settled`: a reserved item, or an `AssumedPaid` item that a late
    /// failed callback would set aside again. While it is, the refund never exceeds the ledger.
    pub(crate) fn owed_to_vendor(&self) -> bool {
        self.reserved > 0
            || self.in_flight.is_some()
            || self
                .items
                .iter()
                .any(|it| it.status == ItemStatus::AssumedPaid)
    }

    pub(crate) fn item_ctx_by_id(&self, id: u32) -> Option<accord_core::gates::ItemCtx> {
        self.normalized_item(id).map(|it| self.item_ctx(&it))
    }

    /// The item with a lapsed acceptance window counted as accepted (persisted the next time it is written).
    pub(crate) fn normalized_item(&self, id: u32) -> Option<ItemState> {
        let mut it = self.items[self.item_index(id)?].clone();
        it.normalize(now());
        Some(it)
    }

    pub(crate) fn start_payment(
        &mut self,
        plan: PayPlan,
        via: Via,
        memo: Option<String>,
    ) -> Promise {
        let idx = self.item_index(plan.item).expect("gates checked the item");
        let mut it = self.items[idx].clone();
        if it.normalize(now()) {
            self.items.replace(idx, it);
        }
        let payment_id = self.next_payment_id;
        self.next_payment_id += 1;
        let recipient: AccountId = plan.recipient.parse().expect("recipient is an account id");
        self.in_flight = Some(InFlight {
            payment_id,
            item: plan.item,
            amount: plan.amount,
            recipient: plan.recipient.clone(),
            via,
            since_block: env::block_height(),
            escrow_before: self.escrow(),
        });
        emit(
            "payment_sent",
            json!({"payment_id": payment_id, "item": plan.item, "amount": U128(plan.amount),
                   "recipient": recipient, "via": via}),
        );
        Promise::new(self.token.clone())
            .function_call(
                "ft_transfer",
                serde_json::to_vec(&json!({
                    "receiver_id": recipient, "amount": U128(plan.amount), "memo": memo,
                }))
                .unwrap(),
                NearToken::from_yoctonear(1),
                gas(15),
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(gas(30))
                    .on_payment_resolved(payment_id, plan.item, U128(plan.amount), recipient, via),
            )
    }

    /// Records a refusal in the ring buffer and as an event. Only the current agent key's refusals count toward the
    /// refusal limit; a canary request revokes that key at once.
    #[allow(clippy::too_many_arguments)]
    pub(crate) fn refuse(
        &mut self,
        code: RefusalCode,
        item: u32,
        amount: Amount,
        recipient: &str,
        signer: Option<PublicKey>,
        via: Via,
        counts: bool,
    ) -> u64 {
        self.refusal_seq += 1;
        let seq = self.refusal_seq;
        let t = now();
        let refusal = Refusal {
            seq,
            at: t,
            block: env::block_height(),
            code,
            item,
            amount,
            recipient: recipient.to_string(),
            signer: signer.clone(),
            via,
        };
        self.refusals.insert(seq % REFUSAL_RING, refusal);
        emit(
            "act_refused",
            json!({"seq": seq, "code": code, "item": item, "amount": U128(amount),
                   "recipient": recipient, "signer": signer, "via": via}),
        );
        if matches!(code, RefusalCode::PayeeMismatch | RefusalCode::Canary) {
            self.report_recipient(recipient, seq);
        }
        if code == RefusalCode::Canary {
            self.canary_tripped = true;
            if counts && self.agent_key.is_some() {
                self.revoke_current("canary");
                return seq;
            }
        }
        if counts && code != RefusalCode::Revoked {
            let window = self.params.refusal_window_secs;
            self.refusal_times.retain(|&at| at + window > t);
            self.refusal_times.push(t);
            if self.refusal_times.len() >= usize::from(self.params.refusal_limit) {
                self.revoke_current("refusal_limit");
            }
        }
        seq
    }

    pub(crate) fn revoke_current(&mut self, reason: &str) {
        let key = self.agent_key.take().expect("a current key");
        self.remember_revoked(key.clone());
        self.refusal_times.clear();
        emit(
            "agent_key_revoked",
            json!({"public_key": key, "reason": reason}),
        );
        Promise::new(env::current_account_id())
            .delete_key(key)
            .detach();
    }

    fn remember_revoked(&mut self, key: PublicKey) {
        self.revoked_count += 1;
        self.revoked_keys.push(key);
        if self.revoked_keys.len() > REVOKED_KEYS_KEPT {
            self.revoked_keys.remove(0);
        }
    }

    /// Refused payments to a lookalike or a canary are reported to the factory, with the refusal as evidence.
    fn report_recipient(&self, account: &str, seq: u64) {
        if account.parse::<AccountId>().is_err() {
            return;
        }
        Promise::new(self.factory.clone())
            .function_call(
                "report_recipient",
                serde_json::to_vec(&json!({"account": account, "seq": seq})).unwrap(),
                NearToken::from_yoctonear(0),
                gas(5),
            )
            .detach();
    }

    fn write_receipt(
        &mut self,
        payment_id: u64,
        it: &ItemState,
        amount: Amount,
        recipient: &AccountId,
        via: Via,
    ) {
        self.receipts.push(Receipt {
            payment_id,
            item: it.id,
            amount,
            recipient: recipient.clone(),
            via,
            block: env::block_height(),
            at: now(),
            evidence_hash: it.delivery.as_ref().map(|d| d.evidence_hash.clone()),
        });
        Promise::new(self.factory.clone())
            .function_call(
                "record_payment",
                serde_json::to_vec(&json!({
                    "recipient": recipient, "buyer": self.buyer, "amount": U128(amount),
                }))
                .unwrap(),
                NearToken::from_yoctonear(0),
                gas(5),
            )
            .detach();
    }

    fn require_term_over(&self) {
        let start = self.executing_at.expect("executing_at set");
        let terms = self.terms.get().as_ref().expect("terms set");
        let t = now();
        require(
            t >= start + terms.duration_secs + self.params.grace_secs,
            "ERR_TOO_EARLY",
        );
        let window_open = self.items.iter().any(|it| {
            it.status == ItemStatus::Delivered
                && it.delivery.as_ref().is_some_and(|d| t < d.window_end)
        });
        require(!window_open, "ERR_WINDOW_OPEN");
        require(
            self.periods
                .iter()
                .all(|p| p.outcome != PeriodOutcome::Open),
            "ERR_PERIOD_OPEN",
        );
    }

    fn close_step(&mut self) -> CloseStep {
        let t = now();
        let canaries = self.canaries();
        let recipient = self.current_recipient_account().map(String::from);
        for idx in 0..self.items.len() {
            let mut it = self.items[idx].clone();
            it.normalize(t);
            if it.status != ItemStatus::Eligible {
                continue;
            }
            let amount = it.due_amount();
            let to = recipient.clone().unwrap_or_default();
            let ctx = self.pay_ctx(&canaries, recipient.as_deref(), Some(self.item_ctx(&it)));
            let req = PayRequest {
                item: it.id,
                amount,
                recipient: to.as_str(),
            };
            let id = it.id;
            return match check_pay(&ctx, &req, t, Caller::Close) {
                Ok(plan) => {
                    self.start_payment(plan, Via::Close, None).detach();
                    CloseStep::Paying { item: id }
                }
                Err(RefusalCode::NoRecipient)
                    if self.escrow().saturating_sub(self.reserved) >= amount =>
                {
                    it.status = ItemStatus::Reserved;
                    it.eligible_at.get_or_insert(t);
                    self.reserved += amount;
                    self.items.replace(idx, it);
                    emit(
                        "item_reserved",
                        json!({"item": id, "amount": U128(amount), "reason": "no_recipient"}),
                    );
                    CloseStep::Reserved { item: id }
                }
                Err(code) => {
                    it.status = ItemStatus::Unfunded;
                    self.items.replace(idx, it);
                    emit(
                        "item_unfunded",
                        json!({"item": id, "amount": U128(amount), "reason": "insufficient_escrow", "code": code}),
                    );
                    CloseStep::Unfunded { item: id }
                }
            };
        }
        self.closing = true;
        self.closing_since = env::block_height();
        self.balance_of_self()
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(gas(BALANCE_CALLBACK_GAS))
                    .on_close_balance(),
            )
            .detach();
        CloseStep::Settling
    }

    fn balance_of_self(&self) -> Promise {
        Promise::new(self.token.clone()).function_call(
            "ft_balance_of",
            serde_json::to_vec(&json!({"account_id": env::current_account_id()})).unwrap(),
            NearToken::from_yoctonear(0),
            gas(5),
        )
    }

    fn refund_buyer(&mut self, amount: Amount) {
        self.refund_owed = self.refund_owed.saturating_sub(amount);
        Promise::new(self.token.clone())
            .function_call(
                "ft_transfer",
                serde_json::to_vec(&json!({
                    "receiver_id": self.buyer, "amount": U128(amount), "memo": "accord refund",
                }))
                .unwrap(),
                NearToken::from_yoctonear(1),
                gas(15),
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(gas(10))
                    .on_refund_resolved(U128(amount)),
            )
            .detach();
    }
}

/// A `U128` from promise result 0, if the call succeeded.
fn read_u128() -> Option<Amount> {
    let bytes = env::promise_result_checked(0, 128).ok()?;
    serde_json::from_slice::<U128>(&bytes).ok().map(|v| v.0)
}

//! Views (INTERFACES.md 4.3). None returns or derives a mandate's plaintext: the chain holds only ciphertexts.

use crate::*;
use near_sdk::json_types::U128;
use serde_json::{json, Value};

#[near(serializers = [json])]
pub struct DueItem {
    pub item: u32,
    #[serde(with = "accord_core::types::u128_str")]
    pub amount: Amount,
    pub recipient: Option<AccountId>,
    pub eligible_at: Option<u64>,
}

#[near]
impl Agreement {
    pub fn get_agreement(&self) -> Value {
        let cfg = self.cfg();
        let t = now();
        let recipient = self
            .current_recipient
            .and_then(|v| self.recipients.get(v - 1));
        let pending = self.recipients.iter().find(|r| r.status.pending());
        json!({
            "id": self.id,
            "account": env::current_account_id(),
            "factory": self.factory,
            "release": self.release,
            "kind": self.kind,
            "title": cfg.title,
            "state": self.state,
            "negotiation": self.negotiation,
            "buyer": self.buyer,
            "vendor": self.vendor,
            "vendor_authority": self.vendor_authority,
            "token": self.token,
            "keeper": cfg.keeper,
            "outlayer": cfg.outlayer,
            "model": cfg.model,
            "jobs": {"sealed_table": cfg.sealed_table, "payee": cfg.payee_job, "observer": cfg.observer_job},
            "canaries": cfg.canaries,
            "params": self.params,
            "terms_hash": self.terms_hash,
            "approvals": {"buyer": self.approved.0, "vendor": self.approved.1},
            "executing_at": self.executing_at,
            "ends_at": self.executing_at.and_then(|s| self.terms.get().as_ref().map(|t| s + t.duration_secs)),
            "funded": U128(self.funded),
            "paid": U128(self.paid),
            "reserved": U128(self.reserved),
            "refunded": U128(self.refunded),
            "total": U128(self.total()),
            "in_flight": self.in_flight,
            "closing": self.closing,
            "mutual_close": {"buyer": self.mutual_close.0, "vendor": self.mutual_close.1},
            "recipient": recipient.map(|r| json!({"version": r.version, "account": r.account, "domain": r.domain})),
            "domain": self.domain,
            "pending_recipient": pending.map(|r| json!({"version": r.version, "account": r.account, "status": r.status, "active_at": r.active_at})),
            "agent_key": self.agent_key,
            "revoked_keys": self.revoked_count,
            "canary_tripped": self.canary_tripped,
            "refusals": self.refusal_seq,
            "exceptions": self.exceptions.len(),
            "observation_conflicts": self.observation_conflicts,
            "periods": self.periods.iter().map(|p| p.outcome).collect::<Vec<_>>(),
            "budget": self.get_budget(),
            "now": t,
        })
    }

    pub fn get_terms(&self) -> Option<Terms> {
        self.terms.get().clone()
    }

    /// Items with their status as of now (a lapsed acceptance window counts as accepted) and absolute due times.
    pub fn get_items(&self) -> Vec<Value> {
        let t = now();
        self.items
            .iter()
            .map(|it| {
                let mut it = it.clone();
                it.normalize(t);
                let mut v = serde_json::to_value(&it).unwrap();
                v["due_at"] = json!(self.executing_at.map(|s| s + it.due_offset_secs));
                v["due_amount"] = json!(U128(it.due_amount()));
                v
            })
            .collect()
    }

    /// What the agent may pay now: eligible items with the authorised recipient.
    pub fn due_items(&self) -> Vec<DueItem> {
        let t = now();
        let recipient = self.current_recipient_account();
        self.items
            .iter()
            .filter_map(|it| {
                let mut it = it.clone();
                it.normalize(t);
                (it.status == ItemStatus::Eligible).then(|| DueItem {
                    item: it.id,
                    amount: it.due_amount(),
                    recipient: recipient.clone(),
                    eligible_at: it.eligible_at,
                })
            })
            .collect()
    }

    /// Refusals from sequence `from` (the ring keeps the last 128), oldest first.
    pub fn get_refusals(&self, from: Option<u64>, limit: Option<u8>) -> Vec<Refusal> {
        let last = self.refusal_seq;
        let first = last.saturating_sub(REFUSAL_RING - 1).max(1);
        let start = from.unwrap_or(first).max(first);
        let limit = u64::from(limit.unwrap_or(50).min(128));
        (start..=last)
            .take(limit as usize)
            .filter_map(|s| {
                self.refusals
                    .get(&(s % REFUSAL_RING))
                    .filter(|r| r.seq == s)
                    .cloned()
            })
            .collect()
    }

    pub fn get_recipients(&self) -> Vec<RecipientVersion> {
        self.recipients.iter().cloned().collect()
    }

    pub fn get_exceptions(&self) -> Vec<Exception> {
        self.exceptions.iter().cloned().collect()
    }

    pub fn get_periods(&self) -> Vec<Value> {
        let at = self.terms.get().as_ref().and_then(|t| t.atlas.clone());
        self.periods
            .iter()
            .map(|p| {
                let mut v = serde_json::to_value(p).unwrap();
                if let (Some(at), Some(_)) = (&at, self.executing_at) {
                    let start = self.period_start(p.period, at);
                    v["starts_at"] = json!(start);
                    v["ends_at"] = json!(start + at.period_secs);
                    v["closable_at"] =
                        json!(start + at.period_secs + self.params.observation_grace_secs);
                }
                v
            })
            .collect()
    }

    pub fn get_observations(&self, period: u32) -> Vec<StoredObservation> {
        let slots = self
            .terms
            .get()
            .as_ref()
            .and_then(|t| t.atlas.as_ref())
            .map(|a| a.slots_per_period)
            .unwrap_or(0);
        (0..slots)
            .filter_map(|k| self.observations.get(&(period, k)).cloned())
            .collect()
    }

    /// Hashes, ciphertexts and document keys. Ciphertexts only: the plaintext exists inside the Sealed Table run.
    pub fn get_commitments(&self) -> Value {
        json!({"buyer": self.commitments.get(&Role::Buyer), "vendor": self.commitments.get(&Role::Vendor)})
    }

    /// The commercial terms document, encrypted to each party's document key.
    pub fn get_documents(&self) -> Value {
        let out: Option<Value> = self
            .sealed_output
            .get()
            .as_ref()
            .and_then(|s| serde_json::from_str(s).ok());
        out.and_then(|o| o.get("documents").cloned())
            .unwrap_or(Value::Null)
    }

    /// The Sealed Table's signed output as delivered, so anyone can re-check its signature and attestation record.
    pub fn get_sealed_output(&self) -> Option<String> {
        self.sealed_output.get().clone()
    }

    pub fn get_receipts(&self) -> Vec<Receipt> {
        self.receipts.iter().cloned().collect()
    }

    pub fn get_budget(&self) -> Value {
        let balance = env::account_balance();
        let stake = self.storage_stake();
        json!({
            "balance": U128(balance.as_yoctonear()),
            "storage_stake": U128(stake.as_yoctonear()),
            "liquid": U128(balance.saturating_sub(stake).as_yoctonear()),
        })
    }
}

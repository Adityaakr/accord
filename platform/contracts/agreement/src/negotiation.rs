//! Sealing and negotiation (ARCHITECTURE.md section 8): commitments, the OutLayer request carrying only the
//! agreement id and a fresh nonce, the signed outcome, and both approvals.

use crate::signed::{self, str_field};
use crate::*;
use accord_core::hash::{jcs_sha256, sha256, to_hex};
use near_sdk::PromiseOrValue;
use serde_json::{json, Value};

/// `start_negotiation` must carry at least this much gas, so nobody can burn attempts by starving the call.
pub const MIN_NEGOTIATION_GAS: u64 = 280;
pub const MAX_ATTEMPTS: u8 = 3;
/// Attached to OutLayer for a run; the unused part is refunded to the agreement.
pub const NEGOTIATION_DEPOSIT: NearToken = NearToken::from_millinear(50);

/// `outlayer.request_execution` for one of this release's jobs. The input names the agreement and nothing the job
/// would believe without reading state; `resource_limits` is always explicit (without it the request is
/// compile-only).
pub(crate) fn request_job(
    outlayer: &AccountId,
    job: &JobRef,
    input: Value,
    max_seconds: u64,
    deposit: NearToken,
    tgas: u64,
) -> Promise {
    let args = json!({
        "source": {"Project": {"project_id": job.project, "version_key": job.wasm_hash}},
        // the project owner's secrets (the job's PROTECTED_ seed, NEARAI_API_KEY); without a reference OutLayer
        // attaches none and the job reports its seed as not set
        "secrets_ref": {"account_id": job.project.split('/').next().unwrap_or_default(), "profile": "default"},
        "resource_limits": {
            "max_instructions": 100_000_000_000u64,
            "max_memory_mb": 256,
            "max_execution_seconds": max_seconds,
        },
        "input_data": input.to_string(),
        "response_format": "Json",
    });
    Promise::new(outlayer.clone()).function_call(
        "request_execution",
        serde_json::to_vec(&args).unwrap(),
        deposit,
        gas(tgas),
    )
}

#[near]
impl Agreement {
    /// Stores the caller's sealed mandate. No deposit: the agreement's balance pays the storage.
    pub fn commit_mandate(
        &mut self,
        commitment: String,
        ciphertext: Base64VecU8,
        doc_pubkey: String,
        doc_key_signer: PublicKey,
    ) {
        let role = self.require_party();
        self.require_state(State::Sealed);
        require(
            matches!(
                self.negotiation,
                Negotiation::AwaitingMandates | Negotiation::Ready { .. }
            ),
            "ERR_WRONG_STATE",
        );
        require(is_hex(&commitment, 64), "ERR_BAD_COMMITMENT");
        require(is_hex(&doc_pubkey, 66), "ERR_BAD_DOC_KEY");
        require(
            !ciphertext.0.is_empty() && ciphertext.0.len() <= MAX_CIPHERTEXT,
            "ERR_TOO_LARGE",
        );
        self.commitments.insert(
            role,
            Commitment {
                commitment: commitment.clone(),
                ciphertext,
                doc_pubkey,
                doc_key_signer,
                at: now(),
            },
        );
        if self.commitments.contains_key(&Role::Buyer)
            && self.commitments.contains_key(&Role::Vendor)
        {
            let attempts = match self.negotiation {
                Negotiation::Ready { attempts } => attempts,
                _ => 0,
            };
            self.negotiation = Negotiation::Ready { attempts };
        }
        self.require_storage_covered();
        emit(
            "mandate_committed",
            json!({"role": role, "commitment": commitment}),
        );
    }

    /// Anyone (in practice the keeper) starts the negotiation once both mandates are sealed.
    pub fn start_negotiation(&mut self) -> PromiseOrValue<()> {
        self.require_state(State::Sealed);
        let Negotiation::Ready { attempts } = self.negotiation else {
            env::panic_str("ERR_WRONG_STATE")
        };
        require(
            env::prepaid_gas() >= gas(MIN_NEGOTIATION_GAS),
            "ERR_LOW_GAS",
        );
        require(
            env::account_balance() > NEGOTIATION_DEPOSIT.saturating_add(self.storage_stake()),
            "ERR_LOW_BALANCE",
        );
        let mut seed = env::random_seed_array().to_vec();
        seed.extend_from_slice(env::current_account_id().as_bytes());
        seed.extend_from_slice(&env::block_height().to_be_bytes());
        let nonce = sha256(&seed);
        let attempt = attempts + 1;
        self.negotiation = Negotiation::Requested {
            request_nonce: nonce,
            at: now(),
            attempt,
        };
        emit(
            "negotiation_requested",
            json!({"request_nonce": to_hex(&nonce), "attempt": attempt}),
        );
        if cfg!(feature = "mock") {
            // Sandbox: no OutLayer; the test feeds the signed output through `submit_mock_negotiation`.
            env::log_str("[mock] sealed-table request not sent");
            return PromiseOrValue::Value(());
        }
        let cfg = self.cfg();
        let input = json!({
            "mode": "negotiate",
            "agreement": env::current_account_id(),
            "request_nonce": to_hex(&nonce),
        });
        request_job(
            &cfg.outlayer,
            &cfg.sealed_table,
            input,
            100,
            NEGOTIATION_DEPOSIT,
            180,
        )
        .then(
            Self::ext(env::current_account_id())
                .with_static_gas(gas(60))
                .on_sealed_result(to_hex(&nonce)),
        )
        .into()
    }

    /// The Sealed Table's answer, delivered as the `.then` of the agreement's own request.
    #[private]
    pub fn on_sealed_result(&mut self, request_nonce: String) {
        let output = env::promise_result_checked(0, signed::MAX_OUTPUT)
            .ok()
            .and_then(|b| signed::parse_output(&b));
        self.handle_sealed(output, &request_nonce);
    }

    /// Fallback F1: the keeper submits the signed output when the callback cannot carry it. Same checks.
    pub fn submit_sealed_result(&mut self, output: String) {
        require(
            env::predecessor_account_id() == self.cfg().keeper,
            "ERR_NOT_KEEPER",
        );
        let Negotiation::Requested { request_nonce, .. } = self.negotiation else {
            env::panic_str("ERR_WRONG_STATE")
        };
        let parsed = signed::parse_output(output.as_bytes());
        self.handle_sealed(parsed, &to_hex(&request_nonce));
    }

    #[cfg(feature = "mock")]
    pub fn submit_mock_negotiation(&mut self, output: String) {
        let Negotiation::Requested { request_nonce, .. } = self.negotiation else {
            env::panic_str("ERR_WRONG_STATE")
        };
        env::log_str("[mock] sealed-table output submitted directly");
        let parsed = signed::parse_output(output.as_bytes());
        self.handle_sealed(parsed, &to_hex(&request_nonce));
    }

    /// Both parties approve the same terms hash; the second approval starts the agreement.
    pub fn approve_terms(&mut self, terms_hash: String) {
        let role = self.require_party();
        self.require_state(State::Attested);
        require(
            self.terms_hash.as_deref() == Some(terms_hash.as_str()),
            "ERR_HASH_MISMATCH",
        );
        match role {
            Role::Buyer => self.approved.0 = true,
            Role::Vendor => self.approved.1 = true,
        }
        emit(
            "terms_approved",
            json!({"by": env::predecessor_account_id(), "terms_hash": terms_hash}),
        );
        if self.approved == (true, true) {
            self.start_executing();
        }
    }

    /// Either party, before `Executing`.
    pub fn cancel(&mut self) {
        self.require_party();
        require(
            matches!(self.state, State::Sealed | State::Attested),
            "ERR_WRONG_STATE",
        );
        self.state = State::Cancelled;
        self.negotiation = Negotiation::Done;
        emit("cancelled", json!({"by": env::predecessor_account_id()}));
    }
}

impl Agreement {
    /// `on_sealed_result`'s checks (ARCHITECTURE.md 8.4). Anything that does not verify is an infrastructure
    /// failure: one more attempt, at most three.
    fn handle_sealed(&mut self, output: Option<Value>, request_nonce: &str) {
        if self.state != State::Sealed {
            return; // cancelled meanwhile: a late answer changes nothing
        }
        let Negotiation::Requested {
            request_nonce: stored,
            attempt,
            ..
        } = self.negotiation.clone()
        else {
            return; // a late answer to a request already settled
        };
        if to_hex(&stored) != request_nonce {
            return;
        }
        match output.as_ref().map(|o| self.check_sealed(o, request_nonce)) {
            Some(Ok(SealedOutcome::Terms(terms, terms_hash))) => {
                let o = output.unwrap();
                let total = terms.total;
                let items = terms.items.len();
                self.terms.set(Some(*terms));
                self.terms_hash = Some(terms_hash.clone());
                self.sealed_output.set(Some(o.to_string()));
                self.negotiation = Negotiation::Done;
                self.state = State::Attested;
                emit(
                    "terms_proposed",
                    json!({
                        "terms_hash": terms_hash,
                        "total": total.to_string(),
                        "items": items,
                        "transcript_hash": o.get("transcript_hash"),
                        "model": o.pointer("/model/id"),
                        "rounds": o.get("rounds"),
                    }),
                );
                self.require_storage_covered();
            }
            Some(Ok(SealedOutcome::NoDeal(reason))) => {
                self.sealed_output.set(output.map(|o| o.to_string()));
                self.negotiation = Negotiation::Done;
                self.state = State::NoDeal;
                emit("no_deal", json!({"reason": reason}));
            }
            failure => {
                let reason = match failure {
                    Some(Err(e)) => e,
                    _ => "no signed output",
                };
                emit(
                    "negotiation_failed",
                    json!({"attempt": attempt, "reason": reason}),
                );
                if attempt >= MAX_ATTEMPTS {
                    self.negotiation = Negotiation::Done;
                    self.state = State::NoDeal;
                    emit("no_deal", json!({"reason": "INFRASTRUCTURE"}));
                } else {
                    self.negotiation = Negotiation::Ready { attempts: attempt };
                }
            }
        }
    }

    fn check_sealed(&self, o: &Value, request_nonce: &str) -> Result<SealedOutcome, &'static str> {
        let cfg = self.cfg();
        if !signed::verify(o, &cfg.sealed_table.signing_pubkey) {
            return Err("bad signature");
        }
        if str_field(o, "mode") != Some("negotiate") {
            return Err("wrong mode");
        }
        if str_field(o, "agreement") != Some(env::current_account_id().as_str()) {
            return Err("wrong agreement");
        }
        if str_field(o, "request_nonce") != Some(request_nonce) {
            return Err("wrong nonce");
        }
        if o.get("release").and_then(Value::as_u64) != Some(u64::from(self.release)) {
            return Err("wrong release");
        }
        let commitment = |r| self.commitments.get(&r).map(|c| c.commitment.as_str());
        if str_field(o, "buyer_commitment") != commitment(Role::Buyer)
            || str_field(o, "vendor_commitment") != commitment(Role::Vendor)
        {
            return Err("commitments differ");
        }
        match str_field(o, "outcome") {
            Some("terms") => {
                let terms: Terms =
                    serde_json::from_value(o.get("terms").cloned().unwrap_or_default())
                        .map_err(|_| "terms do not parse")?;
                if terms.params_hash != jcs_sha256(&self.params) {
                    return Err("params differ");
                }
                accord_core::terms::structural(&terms, self.token.as_str(), &self.params)?;
                if terms.kind != self.kind {
                    return Err("kind differs");
                }
                let hash = to_hex(&jcs_sha256(&terms));
                if str_field(o, "terms_hash") != Some(hash.as_str()) {
                    return Err("terms hash differs");
                }
                Ok(SealedOutcome::Terms(Box::new(terms), hash))
            }
            Some("no_deal") => match str_field(o, "no_deal_reason") {
                Some(r @ ("WALK_AWAY" | "LIMIT_CHECK" | "BAD_INPUT")) => {
                    Ok(SealedOutcome::NoDeal(r.to_string()))
                }
                _ => Err("unknown no-deal reason"),
            },
            _ => Err("infrastructure"),
        }
    }

    /// Both approvals in: the clock starts, items and Atlas periods are created from the terms.
    fn start_executing(&mut self) {
        let at = now();
        self.state = State::Executing;
        self.executing_at = Some(at);
        let terms = self.terms.get().clone().expect("terms set when Attested");
        for it in &terms.items {
            self.items.push(ItemState {
                id: it.id,
                amount: it.amount,
                due_offset_secs: it.due_offset_secs,
                evidence: it.evidence.clone(),
                status: ItemStatus::Open,
                delivery: None,
                eligible_at: None,
                exception: None,
                exception_used: false,
                pending_exception: None,
                settled: 0,
                settled_by: None,
            });
        }
        if let Some(atlas) = &terms.atlas {
            for p in 0..atlas.periods {
                self.periods.push(PeriodState {
                    period: p,
                    outcome: PeriodOutcome::Open,
                    recorded: 0,
                    conflict: false,
                    passed: 0,
                    observed: 0,
                    uptime_bps: 0,
                });
            }
        }
        emit(
            "executing",
            json!({"terms_hash": self.terms_hash, "executing_at": at}),
        );
    }

    /// The NEAR the account must keep for its state.
    pub(crate) fn storage_stake(&self) -> NearToken {
        env::storage_byte_cost().saturating_mul(u128::from(env::storage_usage()))
    }

    /// Storage is paid from the agreement's balance; refuse a write it cannot cover instead of failing later.
    pub(crate) fn require_storage_covered(&self) {
        require(
            env::account_balance() >= self.storage_stake(),
            "ERR_LOW_BALANCE",
        );
    }
}

enum SealedOutcome {
    Terms(Box<Terms>, String),
    NoDeal(String),
}

pub(crate) fn is_hex(s: &str, len: usize) -> bool {
    s.len() == len
        && s.bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

//! Recipient authorisation (ARCHITECTURE.md section 7): the vendor proposes, the Payee job proves the domain file
//! inside an enclave, the vendor's settlement authority approves, the buyer accepts, and a change waits out the
//! timelock. The domain is pinned by the first version.

use crate::negotiation::request_job;
use crate::signed::{self, str_field};
use crate::*;
use serde_json::{json, Value};

pub const PAYEE_DEPOSIT: NearToken = NearToken::from_millinear(30);
pub const MAX_VERSIONS: u32 = 16;

#[near]
impl Agreement {
    pub fn propose_recipient(&mut self, account: AccountId, domain: String) -> u32 {
        self.require_vendor();
        let has_reserved = self.items.iter().any(|i| i.status == ItemStatus::Reserved);
        require(
            matches!(
                self.state,
                State::Sealed | State::Attested | State::Executing
            ) || (self.state == State::Settled && has_reserved),
            "ERR_WRONG_STATE",
        );
        require(
            !self.recipients.iter().any(|r| r.status.pending()),
            "ERR_CHANGE_PENDING",
        );
        require(
            self.recipients.len() < MAX_VERSIONS,
            "ERR_TOO_MANY_VERSIONS",
        );
        let domain = domain.to_ascii_lowercase();
        require(is_domain(&domain), "ERR_BAD_DOMAIN");
        if let Some(pinned) = &self.domain {
            require(*pinned == domain, "ERR_DOMAIN_PINNED");
        }
        let version = self.recipients.len() + 1;
        self.recipients.push(RecipientVersion {
            version,
            account: account.clone(),
            domain: domain.clone(),
            status: RecipientStatus::Proposed,
            rating: None,
            reasons: Vec::new(),
            failure: None,
            proposed_at: now(),
            active_at: None,
            proof: None,
        });
        self.require_storage_covered();
        emit(
            "recipient_proposed",
            json!({"version": version, "account": account, "domain": domain}),
        );
        if cfg!(feature = "mock") {
            env::log_str("[mock] payee request not sent");
            return version;
        }
        let cfg = self.cfg();
        let input =
            json!({"mode": "prove", "agreement": env::current_account_id(), "version": version});
        request_job(&cfg.outlayer, &cfg.payee_job, input, 60, PAYEE_DEPOSIT, 200)
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(gas(40))
                    .on_payee_proof(version),
            )
            .detach();
        version
    }

    #[private]
    pub fn on_payee_proof(&mut self, version: u32) {
        let output = env::promise_result_checked(0, signed::MAX_OUTPUT)
            .ok()
            .and_then(|b| signed::parse_output(&b));
        self.handle_payee(version, output);
    }

    #[cfg(feature = "mock")]
    pub fn submit_mock_payee(&mut self, version: u32, output: String) {
        env::log_str("[mock] payee output submitted directly");
        let parsed = signed::parse_output(output.as_bytes());
        self.handle_payee(version, parsed);
    }

    #[payable]
    pub fn approve_recipient(&mut self, version: u32) {
        // Exactly 1 yoctoNEAR: only a full-access key can attach it, so a function-call key cannot call this.
        near_sdk::assert_one_yocto();
        require(
            env::predecessor_account_id() == self.vendor_authority,
            "ERR_NOT_AUTHORITY",
        );
        let mut r = self.version(version);
        require(r.status == RecipientStatus::Proven, "ERR_WRONG_STATE");
        r.status = RecipientStatus::AuthorityApproved;
        self.recipients.replace(version - 1, r.clone());
        emit(
            "recipient_approved",
            json!({"version": version, "account": r.account, "by": self.vendor_authority}),
        );
    }

    /// The buyer accepts: never a `block`, and a `warn` only with the warnings acknowledged. With no current
    /// recipient the version is active at once; a change waits `timelock_secs`.
    #[payable]
    pub fn accept_recipient(&mut self, version: u32, acknowledge_warnings: bool) {
        // Exactly 1 yoctoNEAR: only a full-access key can attach it, so a function-call key cannot call this.
        near_sdk::assert_one_yocto();
        self.require_buyer();
        let mut r = self.version(version);
        require(
            r.status == RecipientStatus::AuthorityApproved,
            "ERR_WRONG_STATE",
        );
        match r.rating {
            Some(Rating::Block) | None => env::panic_str("ERR_BLOCKED"),
            Some(Rating::Warn) => require(acknowledge_warnings, "ERR_WARNINGS_NOT_ACKNOWLEDGED"),
            Some(Rating::Allow) => {}
        }
        let active_at = if self.current_recipient.is_none() {
            now()
        } else {
            now() + self.params.timelock_secs
        };
        r.status = RecipientStatus::Accepted;
        r.active_at = Some(active_at);
        self.recipients.replace(version - 1, r.clone());
        emit(
            "recipient_accepted",
            json!({"version": version, "account": r.account, "by": self.buyer, "active_at": active_at}),
        );
        if self.current_recipient.is_none() {
            self.activate(version);
        }
    }

    /// Anyone, once the timelock has passed.
    pub fn activate_recipient(&mut self, version: u32) {
        let r = self.version(version);
        require(r.status == RecipientStatus::Accepted, "ERR_WRONG_STATE");
        require(now() >= r.active_at.unwrap_or(u64::MAX), "ERR_TOO_EARLY");
        self.activate(version);
    }

    /// The buyer or the authority stops a pending change during its delay.
    pub fn cancel_recipient_change(&mut self, version: u32) {
        let caller = env::predecessor_account_id();
        require(
            caller == self.buyer || caller == self.vendor_authority,
            "ERR_NOT_PARTY",
        );
        let mut r = self.version(version);
        require(r.status.pending(), "ERR_WRONG_STATE");
        r.status = RecipientStatus::Cancelled;
        self.recipients.replace(version - 1, r);
        emit(
            "recipient_change_cancelled",
            json!({"version": version, "by": caller}),
        );
    }
}

impl Agreement {
    fn version(&self, version: u32) -> RecipientVersion {
        version
            .checked_sub(1)
            .and_then(|i| self.recipients.get(i))
            .cloned()
            .unwrap_or_else(|| env::panic_str("ERR_UNKNOWN_VERSION"))
    }

    fn activate(&mut self, version: u32) {
        if let Some(old) = self.current_recipient {
            let mut o = self.version(old);
            o.status = RecipientStatus::Superseded;
            self.recipients.replace(old - 1, o);
        }
        let mut r = self.version(version);
        r.status = RecipientStatus::Active;
        self.domain.get_or_insert_with(|| r.domain.clone());
        self.recipients.replace(version - 1, r.clone());
        self.current_recipient = Some(version);
        emit(
            "recipient_active",
            json!({"version": version, "account": r.account, "domain": r.domain}),
        );
        // Register the recipient with the token so a payment cannot fail for that reason.
        Promise::new(self.token.clone())
            .function_call(
                "storage_deposit",
                serde_json::to_vec(&json!({"account_id": r.account, "registration_only": true}))
                    .unwrap(),
                TOKEN_STORAGE_DEPOSIT,
                gas(10),
            )
            .detach();
    }

    /// `on_payee_proof`'s checks: the release's Payee key signed it, and agreement, version, domain, account and
    /// authority equal state. A canary is always `block`, whatever the job said.
    fn handle_payee(&mut self, version: u32, output: Option<Value>) {
        let mut r = self.version(version);
        if r.status != RecipientStatus::Proposed {
            return;
        }
        let checked = output
            .as_ref()
            .ok_or("no signed output")
            .and_then(|o| self.check_payee(o, &r));
        match checked {
            Ok((mut rating, mut reasons)) => {
                if self.cfg().canaries.contains(&r.account) {
                    rating = Rating::Block;
                    reasons.push("canary account".into());
                }
                r.status = RecipientStatus::Proven;
                r.rating = Some(rating);
                r.reasons = reasons.clone();
                r.proof = output.map(|o| o.to_string());
                emit(
                    "recipient_proven",
                    json!({"version": version, "account": r.account, "domain": r.domain,
                           "rating": rating, "reasons": reasons}),
                );
            }
            Err(reason) => {
                r.status = RecipientStatus::ProofFailed;
                r.failure = Some(reason.to_string());
                emit(
                    "recipient_proof_failed",
                    json!({"version": version, "account": r.account, "reason": reason}),
                );
            }
        }
        self.recipients.replace(version - 1, r);
    }

    fn check_payee(
        &self,
        o: &Value,
        r: &RecipientVersion,
    ) -> Result<(Rating, Vec<String>), &'static str> {
        if !signed::verify(o, &self.cfg().payee_job.signing_pubkey) {
            return Err("bad signature");
        }
        if str_field(o, "mode") != Some("prove")
            || str_field(o, "agreement") != Some(env::current_account_id().as_str())
            || o.get("version").and_then(Value::as_u64) != Some(u64::from(r.version))
        {
            return Err("wrong agreement or version");
        }
        if str_field(o, "domain") != Some(r.domain.as_str())
            || str_field(o, "account") != Some(r.account.as_str())
            || str_field(o, "authority") != Some(self.vendor_authority.as_str())
        {
            return Err("values differ from state");
        }
        let checks = o.get("checks").ok_or("no checks")?;
        for c in ["file", "recipient_listed", "authority_matches"] {
            if checks.get(c).and_then(Value::as_str) != Some("ok") {
                return Err("domain file check failed");
            }
        }
        let rating: Rating = serde_json::from_value(o.get("rating").cloned().unwrap_or_default())
            .map_err(|_| "no rating")?;
        let reasons = o
            .get("reasons")
            .and_then(Value::as_array)
            .map(|a| {
                a.iter()
                    .filter_map(Value::as_str)
                    .take(8)
                    .map(|s| s.chars().take(200).collect())
                    .collect()
            })
            .unwrap_or_default();
        Ok((rating, reasons))
    }
}

fn is_domain(d: &str) -> bool {
    d.len() <= 253
        && d.contains('.')
        && d.split('.').all(|l| {
            !l.is_empty()
                && l.len() <= 63
                && l.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
        })
}

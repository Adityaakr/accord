//! The factory (`contracts/factory`, INTERFACES.md section 5): creates each agreement as `a<id>.<factory>` in one
//! batch with no `AddKey`, so the account never holds a key of its own; keeps the releases (agreement code and the
//! three jobs' keys), the curated blocklist, the recipient reports and payment statistics. It cannot touch an
//! existing agreement.

use near_sdk::base64::{engine::general_purpose::STANDARD, Engine};
use near_sdk::json_types::{Base58CryptoHash, Base64VecU8, U128};
use near_sdk::store::{LookupMap, Vector};
use near_sdk::{
    env, near, AccountId, BorshStorageKey, Gas, NearToken, Promise, PromiseOrValue, PublicKey,
};
use serde_json::{json, Value};

const TGAS: u64 = 1_000_000_000_000;
const MAX_REPORTS: usize = 32;
/// One agreement can name at most this many accounts in reports, so no buyer can grow the factory's state at will.
const MAX_REPORTS_PER_AGREEMENT: u32 = 64;
/// What the keyless releases account starts with: its storage and a few `pubkey` runs.
const RELEASES_FUNDING: NearToken = NearToken::from_near(2);

fn gas(t: u64) -> Gas {
    Gas::from_gas(t * TGAS)
}

fn require(cond: bool, err: &str) {
    if !cond {
        env::panic_str(err)
    }
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct Config {
    pub owner: AccountId,
    pub token: AccountId,
    pub outlayer: AccountId,
    pub keeper: AccountId,
    pub create_deposit: U128,
    pub demo_allowed: bool,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum ReleaseMode {
    Global,
    Embedded,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct JobRelease {
    pub project: String,
    pub wasm_hash: String,
    pub signing_pubkey: PublicKey,
    pub pubkey_task_id: u64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Release {
    pub version: u32,
    pub mode: ReleaseMode,
    pub code_hash: Base58CryptoHash,
    pub sealed_table: JobRelease,
    pub payee: JobRelease,
    pub observer: JobRelease,
    pub mandate_pubkey: String,
    pub model: String,
    pub published_at: u64,
}

/// A job's key as its `pubkey` run reported it, before the owner publishes the release.
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct PendingJob {
    pub project: String,
    pub wasm_hash: String,
    pub signing_pubkey: PublicKey,
    pub mandate_pubkey: Option<String>,
    /// The signed `pubkey` output as delivered, kept for anyone to re-check.
    pub output: String,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct AgreementRecord {
    pub id: u64,
    pub account: AccountId,
    pub kind: String,
    pub title: String,
    pub buyer: AccountId,
    pub vendor: AccountId,
    pub vendor_authority: AccountId,
    pub release: u32,
    pub created_at: u64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Report {
    pub agreement: AccountId,
    pub seq: u64,
    pub at: u64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, Default)]
pub struct Stats {
    pub payments: u32,
    pub total: U128,
}

#[near(serializers = [json])]
pub struct CreateArgs {
    pub kind: String,
    pub title: String,
    pub vendor: AccountId,
    pub vendor_authority: AccountId,
    pub canaries: Vec<AccountId>,
    pub params: Value,
}

#[near(serializers = [json])]
pub struct JobProject {
    pub project: String,
    pub version_key: String,
}

#[near(serializers = [json])]
pub struct TaskIds {
    pub sealed_table: u64,
    pub payee: u64,
    pub observer: u64,
}

#[derive(BorshStorageKey)]
#[near]
enum Key {
    Releases,
    Code,
    Pending,
    Agreements,
    Registry,
    ByParty,
    Reports,
    Blocked,
    Stats,
    StatsByBuyer,
    ReportsFiled,
}

#[near(contract_state)]
pub struct Factory {
    config: Config,
    current: Option<u32>,
    releases: LookupMap<u32, Release>,
    code: LookupMap<u32, Vec<u8>>,
    pending: LookupMap<String, PendingJob>,
    agreements: Vector<AgreementRecord>,
    registry: LookupMap<AccountId, u64>,
    by_party: LookupMap<AccountId, Vec<u64>>,
    reports: LookupMap<AccountId, Vec<Report>>,
    blocked: LookupMap<AccountId, String>,
    stats: LookupMap<AccountId, Stats>,
    stats_by_buyer: LookupMap<String, Stats>,
    reports_filed: LookupMap<AccountId, u32>,
}

impl Default for Factory {
    fn default() -> Self {
        env::panic_str("ERR_NOT_INITIALIZED")
    }
}

#[near]
impl Factory {
    /// Also creates `releases.<factory>` in one batch with no `AddKey`, running the code passed here.
    #[init]
    pub fn new(config: Config, releases_code: Base64VecU8) -> Self {
        let releases = releases_account();
        Promise::new(releases)
            .create_account()
            .transfer(RELEASES_FUNDING)
            .deploy_contract(releases_code.0)
            .function_call(
                "new",
                serde_json::to_vec(
                    &json!({"factory": env::current_account_id(), "outlayer": config.outlayer}),
                )
                .unwrap(),
                NearToken::from_yoctonear(0),
                gas(10),
            )
            .detach();
        Self {
            config,
            current: None,
            releases: LookupMap::new(Key::Releases),
            code: LookupMap::new(Key::Code),
            pending: LookupMap::new(Key::Pending),
            agreements: Vector::new(Key::Agreements),
            registry: LookupMap::new(Key::Registry),
            by_party: LookupMap::new(Key::ByParty),
            reports: LookupMap::new(Key::Reports),
            blocked: LookupMap::new(Key::Blocked),
            stats: LookupMap::new(Key::Stats),
            stats_by_buyer: LookupMap::new(Key::StatsByBuyer),
            reports_filed: LookupMap::new(Key::ReportsFiled),
        }
    }

    /// Asks the keyless releases account to request each job's `pubkey` run on chain.
    pub fn request_pubkeys(
        &mut self,
        sealed_table: JobProject,
        payee: JobProject,
        observer: JobProject,
    ) {
        self.require_owner();
        for (job, p) in [
            ("sealed_table", sealed_table),
            ("payee", payee),
            ("observer", observer),
        ] {
            Promise::new(releases_account())
                .function_call(
                    "request_pubkey",
                    serde_json::to_vec(
                        &json!({"job": job, "project": p.project, "version_key": p.version_key}),
                    )
                    .unwrap(),
                    NearToken::from_yoctonear(0),
                    gas(90),
                )
                .detach();
        }
    }

    /// One job's `pubkey` run per transaction. The releases account attaches 150 Tgas to OutLayer plus a 40 Tgas
    /// callback, so three requests cannot share one 300 Tgas transaction (`request_pubkeys` gives each 90 Tgas and
    /// runs out of gas on testnet). Owner only; the input stays fixed in the releases contract.
    pub fn request_pubkey(&mut self, job: String, project: JobProject) {
        self.require_owner();
        require(
            ["sealed_table", "payee", "observer"].contains(&job.as_str()),
            "ERR_UNKNOWN_JOB",
        );
        Promise::new(releases_account())
            .function_call(
                "request_pubkey",
                serde_json::to_vec(
                    &json!({"job": job, "project": project.project, "version_key": project.version_key}),
                )
                .unwrap(),
                NearToken::from_yoctonear(0),
                gas(260),
            )
            .detach();
    }

    /// From `releases.<factory>` only: one job's signed `pubkey` output, stored as pending.
    pub fn store_pubkey(
        &mut self,
        job: String,
        project: String,
        wasm_hash: String,
        output: String,
    ) {
        require(
            env::predecessor_account_id() == releases_account(),
            "ERR_NOT_RELEASES",
        );
        let v = parse_output(output.as_bytes()).unwrap_or_else(|| env::panic_str("ERR_BAD_OUTPUT"));
        require(
            v.get("mode").and_then(Value::as_str) == Some("pubkey"),
            "ERR_BAD_OUTPUT",
        );
        let key: PublicKey = v
            .get("signing_pubkey")
            .and_then(Value::as_str)
            .and_then(|s| s.parse().ok())
            .unwrap_or_else(|| env::panic_str("ERR_BAD_OUTPUT"));
        // The output is signed by the key it announces: proof the run held the private half.
        require(verify_self_signed(&v, &key), "ERR_BAD_SIGNATURE");
        let mandate_pubkey = v
            .get("mandate_pubkey")
            .and_then(Value::as_str)
            .map(String::from);
        if job == "sealed_table" {
            require(
                mandate_pubkey.as_deref().is_some_and(|m| m.len() == 66),
                "ERR_NO_MANDATE_KEY",
            );
        }
        self.pending.insert(
            job.clone(),
            PendingJob {
                project,
                wasm_hash,
                signing_pubkey: key.clone(),
                mandate_pubkey,
                output,
            },
        );
        emit("pubkey_stored", json!({"job": job, "signing_pubkey": key}));
    }

    /// Completes the pending release with the attestation task ids. `code` only for `Embedded`; for `Global` the
    /// code must already be published by hash.
    pub fn publish_release(
        &mut self,
        version: u32,
        mode: ReleaseMode,
        code_hash: Base58CryptoHash,
        code: Option<Base64VecU8>,
        task_ids: TaskIds,
        model: String,
    ) {
        self.require_owner();
        require(!self.releases.contains_key(&version), "ERR_RELEASE_EXISTS");
        let take = |job: &str, task: u64| -> (JobRelease, Option<String>) {
            let p = self
                .pending
                .get(job)
                .cloned()
                .unwrap_or_else(|| env::panic_str("ERR_PUBKEY_MISSING"));
            (
                JobRelease {
                    project: p.project,
                    wasm_hash: p.wasm_hash,
                    signing_pubkey: p.signing_pubkey,
                    pubkey_task_id: task,
                },
                p.mandate_pubkey,
            )
        };
        let (sealed_table, mandate) = take("sealed_table", task_ids.sealed_table);
        let (payee, _) = take("payee", task_ids.payee);
        let (observer, _) = take("observer", task_ids.observer);
        match (mode, code) {
            (ReleaseMode::Embedded, Some(code)) => {
                let hash: [u8; 32] = env::sha256_array(&code.0);
                require(Base58CryptoHash::from(hash) == code_hash, "ERR_CODE_HASH");
                self.code.insert(version, code.0);
            }
            (ReleaseMode::Global, None) => {}
            _ => env::panic_str("ERR_RELEASE_MODE"),
        }
        let release = Release {
            version,
            mode,
            code_hash,
            sealed_table,
            payee,
            observer,
            mandate_pubkey: mandate.expect("checked in store_pubkey"),
            model,
            published_at: env::block_timestamp() / 1_000_000_000,
        };
        emit(
            "release_published",
            json!({"version": version, "mode": mode, "code_hash": code_hash}),
        );
        self.releases.insert(version, release);
        for job in ["sealed_table", "payee", "observer"] {
            self.pending.remove(job);
        }
    }

    /// New agreements only; existing agreements keep their release for life.
    pub fn set_current_release(&mut self, version: u32) {
        self.require_owner();
        require(self.releases.contains_key(&version), "ERR_UNKNOWN_RELEASE");
        self.current = Some(version);
    }

    pub fn set_config(&mut self, config: Config) {
        self.require_owner();
        require(config.owner == self.config.owner, "ERR_OWNER_FIXED");
        self.config = config;
    }

    /// The buyer (the predecessor) creates an agreement. The id is taken before the batch, so a failed creation
    /// never reuses it.
    #[payable]
    pub fn create_agreement(&mut self, args: CreateArgs) -> Promise {
        let deposit = env::attached_deposit();
        require(
            deposit.as_yoctonear() >= self.config.create_deposit.0,
            "ERR_LOW_DEPOSIT",
        );
        let version = self
            .current
            .unwrap_or_else(|| env::panic_str("ERR_NO_RELEASE"));
        let release = self
            .releases
            .get(&version)
            .cloned()
            .expect("current release exists");
        require(
            matches!(args.kind.as_str(), "procurement" | "market-making"),
            "ERR_KIND",
        );
        let mode = args
            .params
            .get("mode")
            .and_then(Value::as_str)
            .unwrap_or("");
        require(
            mode == "live" || (mode == "demo" && self.config.demo_allowed),
            "ERR_MODE",
        );
        // The agreement re-checks these in `new`; checking here too means a creation cannot be made to fail on
        // purpose after its record is written.
        let params: accord_core::types::Params = serde_json::from_value(args.params.clone())
            .unwrap_or_else(|_| env::panic_str("ERR_PARAMS"));
        if let Err(e) = params.check_mode() {
            env::panic_str(e);
        }
        require(
            args.title.len() <= 120 && args.canaries.len() <= 8,
            "ERR_TOO_LARGE",
        );
        let buyer = env::predecessor_account_id();
        require(
            buyer != args.vendor && buyer != args.vendor_authority,
            "ERR_PARTIES",
        );
        let id = self.agreements.len() as u64 + 1;
        let account: AccountId = format!("a{id}.{}", env::current_account_id())
            .parse()
            .unwrap();
        let record = AgreementRecord {
            id,
            account: account.clone(),
            kind: args.kind.clone(),
            title: args.title.clone(),
            buyer: buyer.clone(),
            vendor: args.vendor.clone(),
            vendor_authority: args.vendor_authority.clone(),
            release: version,
            created_at: env::block_timestamp() / 1_000_000_000,
        };
        self.agreements.push(record.clone());
        let job = |j: &JobRelease| json!({"project": j.project, "wasm_hash": j.wasm_hash, "signing_pubkey": j.signing_pubkey});
        // `new` re-checks the live minimums on the params (Params::check_mode) and panics otherwise.
        let init = json!({"args": {
            "id": id, "factory": env::current_account_id(), "release": version,
            "kind": args.kind, "title": args.title, "buyer": buyer,
            "vendor": args.vendor, "vendor_authority": args.vendor_authority,
            "token": self.config.token, "outlayer": self.config.outlayer, "keeper": self.config.keeper,
            "sealed_table": job(&release.sealed_table), "payee_job": job(&release.payee),
            "observer_job": job(&release.observer), "model": release.model,
            "canaries": args.canaries, "params": args.params,
        }});
        let mut batch = Promise::new(account.clone())
            .create_account()
            .transfer(deposit);
        batch = match release.mode {
            ReleaseMode::Embedded => {
                let code = self
                    .code
                    .get(&version)
                    .cloned()
                    .expect("embedded code stored");
                batch.deploy_contract(code)
            }
            ReleaseMode::Global => batch.use_global_contract(release.code_hash),
        };
        batch
            .function_call(
                "new",
                serde_json::to_vec(&init).unwrap(),
                NearToken::from_yoctonear(0),
                gas(30),
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(gas(15))
                    .on_agreement_created(id, U128(deposit.as_yoctonear())),
            )
    }

    /// Registers the agreement, or refunds the buyer when the batch failed (its actions roll back together).
    #[private]
    pub fn on_agreement_created(
        &mut self,
        id: u64,
        deposit: U128,
    ) -> PromiseOrValue<Option<AccountId>> {
        let record = self
            .agreements
            .get(id as u32 - 1)
            .cloned()
            .expect("record taken before the batch");
        if env::promise_result_checked(0, 0).is_ok() {
            self.registry.insert(record.account.clone(), id);
            for party in [&record.buyer, &record.vendor, &record.vendor_authority] {
                let list = self.by_party.entry(party.clone()).or_default();
                if !list.contains(&id) {
                    list.push(id);
                }
            }
            emit(
                "agreement_registered",
                json!({"id": id, "account": record.account, "buyer": record.buyer}),
            );
            PromiseOrValue::Value(Some(record.account))
        } else {
            emit("agreement_failed", json!({"id": id, "buyer": record.buyer}));
            Promise::new(record.buyer)
                .transfer(NearToken::from_yoctonear(deposit.0))
                .detach();
            PromiseOrValue::Value(None)
        }
    }

    /// From a registered agreement: a refused payment named this account. Evidence is `{agreement, seq}`.
    pub fn report_recipient(&mut self, account: AccountId, seq: u64) {
        let agreement = self.require_agreement();
        let filed = self.reports_filed.entry(agreement.clone()).or_default();
        if *filed >= MAX_REPORTS_PER_AGREEMENT {
            return;
        }
        *filed += 1;
        let list = self.reports.entry(account.clone()).or_default();
        if list.len() < MAX_REPORTS
            && !list
                .iter()
                .any(|r| r.agreement == agreement && r.seq == seq)
        {
            list.push(Report {
                agreement: agreement.clone(),
                seq,
                at: env::block_timestamp() / 1_000_000_000,
            });
        }
        emit(
            "recipient_reported",
            json!({"account": account, "agreement": agreement, "seq": seq}),
        );
    }

    /// From a registered agreement: a settled payment, for `recipient_stats`.
    pub fn record_payment(&mut self, recipient: AccountId, buyer: AccountId, amount: U128) {
        self.require_agreement();
        let all = self.stats.entry(recipient.clone()).or_default();
        all.payments += 1;
        all.total = U128(all.total.0.saturating_add(amount.0));
        let s = self
            .stats_by_buyer
            .entry(format!("{recipient}|{buyer}"))
            .or_default();
        s.payments += 1;
        s.total = U128(s.total.0.saturating_add(amount.0));
    }

    pub fn block_recipient(&mut self, account: AccountId, evidence_url: String) {
        self.require_owner();
        require(
            evidence_url.starts_with("https://") && evidence_url.len() <= 300,
            "ERR_EVIDENCE",
        );
        self.blocked.insert(account.clone(), evidence_url.clone());
        emit(
            "recipient_blocked",
            json!({"account": account, "evidence_url": evidence_url}),
        );
    }

    pub fn unblock_recipient(&mut self, account: AccountId) {
        self.require_owner();
        self.blocked.remove(&account);
        emit("recipient_unblocked", json!({"account": account}));
    }

    #[cfg(feature = "mock")]
    pub fn submit_mock_pubkey(
        &mut self,
        job: String,
        project: String,
        wasm_hash: String,
        output: String,
    ) {
        self.require_owner();
        env::log_str("[mock] pubkey output submitted by the owner");
        let v = parse_output(output.as_bytes()).unwrap_or_else(|| env::panic_str("ERR_BAD_OUTPUT"));
        let key: PublicKey = v["signing_pubkey"]
            .as_str()
            .and_then(|s| s.parse().ok())
            .expect("signing_pubkey");
        require(verify_self_signed(&v, &key), "ERR_BAD_SIGNATURE");
        let mandate_pubkey = v
            .get("mandate_pubkey")
            .and_then(Value::as_str)
            .map(String::from);
        self.pending.insert(
            job,
            PendingJob {
                project,
                wasm_hash,
                signing_pubkey: key,
                mandate_pubkey,
                output,
            },
        );
    }

    // Views.

    pub fn config(&self) -> Config {
        self.config.clone()
    }

    pub fn release(&self, version: u32) -> Option<Release> {
        self.releases.get(&version).cloned()
    }

    pub fn current_release(&self) -> Option<Release> {
        self.current.and_then(|v| self.releases.get(&v).cloned())
    }

    pub fn pending_pubkeys(&self) -> Value {
        json!({
            "sealed_table": self.pending.get("sealed_table"),
            "payee": self.pending.get("payee"),
            "observer": self.pending.get("observer"),
        })
    }

    pub fn agreement(&self, id: u64) -> Option<AgreementRecord> {
        let i = u32::try_from(id).ok()?.checked_sub(1)?;
        self.agreements
            .get(i)
            .cloned()
            .filter(|r| self.registry.contains_key(&r.account))
    }

    pub fn agreements(&self, from: Option<u64>, limit: Option<u32>) -> Vec<AgreementRecord> {
        let from = from.unwrap_or(1).max(1) as u32;
        let limit = limit.unwrap_or(50).min(100);
        (from..=self.agreements.len())
            .filter_map(|id| self.agreements.get(id - 1))
            .filter(|r| self.registry.contains_key(&r.account))
            .take(limit as usize)
            .cloned()
            .collect()
    }

    pub fn agreements_for(&self, account: AccountId) -> Vec<AgreementRecord> {
        self.by_party
            .get(&account)
            .map(|ids| ids.iter().filter_map(|&id| self.agreement(id)).collect())
            .unwrap_or_default()
    }

    pub fn is_agreement(&self, account: AccountId) -> bool {
        self.registry.contains_key(&account)
    }

    pub fn reports(&self, account: AccountId) -> Vec<Report> {
        self.reports.get(&account).cloned().unwrap_or_default()
    }

    pub fn blocked(&self, account: AccountId) -> Option<String> {
        self.blocked.get(&account).cloned()
    }

    pub fn recipient_stats(&self, account: AccountId, buyer: Option<AccountId>) -> Value {
        let all = self.stats.get(&account).cloned().unwrap_or_default();
        let mine = buyer.map(|b| {
            self.stats_by_buyer
                .get(&format!("{account}|{b}"))
                .cloned()
                .unwrap_or_default()
        });
        json!({"all": all, "buyer": mine})
    }
}

impl Factory {
    fn require_owner(&self) {
        require(
            env::predecessor_account_id() == self.config.owner,
            "ERR_NOT_OWNER",
        );
    }

    fn require_agreement(&self) -> AccountId {
        let caller = env::predecessor_account_id();
        require(self.registry.contains_key(&caller), "ERR_NOT_AGREEMENT");
        caller
    }
}

fn releases_account() -> AccountId {
    format!("releases.{}", env::current_account_id())
        .parse()
        .unwrap()
}

fn emit(event: &str, data: Value) {
    let line = json!({"standard": "accord", "version": "1.0.0", "event": event, "data": [data]});
    env::log_str(&format!("EVENT_JSON:{line}"));
}

/// The job's output from OutLayer: the signed object itself, a JSON string of it, or wrapped in `output`.
fn parse_output(bytes: &[u8]) -> Option<Value> {
    fn unwrap(v: Value, depth: u8) -> Option<Value> {
        match v {
            Value::Object(ref m) if m.contains_key("sig") => Some(v),
            Value::Object(mut m) if depth > 0 => unwrap(m.remove("output")?, depth - 1),
            Value::String(s) if depth > 0 => unwrap(serde_json::from_str(&s).ok()?, depth - 1),
            _ => None,
        }
    }
    unwrap(serde_json::from_slice(bytes).ok()?, 2)
}

/// `sig` over `JCS(output without sig)` by the announced key.
fn verify_self_signed(v: &Value, key: &PublicKey) -> bool {
    let Some(sig) = v
        .get("sig")
        .and_then(Value::as_str)
        .and_then(|s| STANDARD.decode(s).ok())
    else {
        return false;
    };
    match (
        <[u8; 64]>::try_from(sig.as_slice()),
        <[u8; 32]>::try_from(&key.as_bytes()[1..]),
    ) {
        (Ok(s), Ok(k)) => env::ed25519_verify(&s, accord_core::hash::signed_bytes(v), &k),
        _ => false,
    }
}

#[cfg(test)]
mod review_tests;

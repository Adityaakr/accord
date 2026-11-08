//! Payee (INTERFACES.md 7.2 and 8, ARCHITECTURE.md 7.2 and 7.3).
//!
//! `{"mode": "prove", "agreement", "version"}`: reads the version's domain and account and the agreement's
//! authority, buyer, factory and canaries from testnet state over the pinned endpoints (never from the input),
//! fetches `https://<domain>/.well-known/accord.json`, checks it, computes the recipient signals and a rating,
//! and signs the result in the shape `check_payee` in `contracts/agreement/src/recipients.rs` reads.
//! A failed check is still signed, so the contract records the version as `ProofFailed` with the reason; a read
//! the job could not complete (testnet RPC down) is answered unsigned with `"status": "error"` and is retryable.
//!
//! `{"mode": "pubkey"}`: the signing key, signed by itself, for the factory's `store_pubkey`.

use accord_core::hash::sha256;
use accord_core::types::Rating;
use accord_jobkit::http::{Http, Method, Request};
use accord_jobkit::keys::{self, PAYEE_SIGN_INFO};
use accord_jobkit::rpc::{
    self, account_code_hash, At, NearRpc, EMPTY_CODE_HASH, TESTNET, TESTNET_ARCHIVAL,
};
use accord_jobkit::{error_output, is_account_id};
use accord_venue::{block_from, final_head};
use serde_json::{json, Value};
use std::time::Duration;

pub const SEED_VAR: &str = "PROTECTED_PAYEE_SEED";
pub const JOB: &str = "payee";
/// The network every agreement and every listed account lives on in this build.
pub const NETWORK: &str = "testnet";
/// Domains whose proofs carry `demo_domain: true`: the app's own host serving the demo list (INTERFACES.md 8).
/// Compiled in, so a proof cannot claim or hide it. `demo.accord.local` is the local node's name for the app (no
/// public resolver answers for `.local`); the hosted app's host is added when it is fixed.
pub const DEMO_DOMAINS: &[&str] = &["demo.accord.local"];
/// The list form's ceiling; the simple form must also fit in `MAX_SIMPLE_BYTES`.
pub const MAX_FILE_BYTES: usize = 64 * 1024;
pub const MAX_SIMPLE_BYTES: usize = 8 * 1024;
/// About 30 days of testnet blocks at one per second; calibrated against the block's real time before use.
const BLOCKS_30D_ESTIMATE: u64 = 30 * 86_400;

pub struct Deps<'a> {
    pub http: &'a dyn Http,
    pub seed: [u8; 32],
    /// How long to keep retrying state written moments earlier (up to 15 s inside the enclave).
    pub retry: Duration,
    pub pause: Duration,
    /// The factories whose agreements this job serves: `accord_jobkit::factory::FACTORIES` in the enclave build.
    pub factories: Vec<String>,
}

impl<'a> Deps<'a> {
    pub fn enclave(http: &'a dyn Http, seed: [u8; 32]) -> Self {
        Self {
            http,
            seed,
            retry: Duration::from_secs(15),
            pause: Duration::from_millis(500),
            factories: accord_jobkit::factory::compiled(),
        }
    }
}

pub fn run(input: &Value, deps: &Deps) -> Value {
    match accord_jobkit::mode(input) {
        "pubkey" => keys::pubkey_output(JOB, &keys::signing_key(&deps.seed, PAYEE_SIGN_INFO)),
        "prove" => prove(input, deps).unwrap_or_else(|e| error_output("prove", e)),
        other => error_output(other, "unknown mode: expected pubkey or prove"),
    }
}

// ---------------------------------------------------------------------------------------------------------------
// The domain file (pure).

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Form {
    Simple,
    List,
}

impl Form {
    pub fn as_str(self) -> &'static str {
        match self {
            Form::Simple => "simple",
            Form::List => "list",
        }
    }
}

/// A valid `accord.json`, as `(recipient, settlement_authority)` pairs (the simple form pairs each recipient
/// with its one authority).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DomainFile {
    pub form: Form,
    pub pairs: Vec<(String, String)>,
}

fn account_field(v: &Value, key: &str) -> Result<String, String> {
    v.get(key)
        .and_then(Value::as_str)
        .filter(|s| is_account_id(s))
        .map(String::from)
        .ok_or_else(|| format!("{key} is not an account id"))
}

/// Validates the fetched bytes against INTERFACES.md section 8. The error is the short failure for `checks.file`.
pub fn parse_file(content_type: Option<&str>, body: &[u8]) -> Result<DomainFile, String> {
    let ct = content_type.unwrap_or("").to_ascii_lowercase();
    if ct.split(';').next().map(str::trim) != Some("application/json") {
        return Err("not served as application/json".into());
    }
    if body.len() > MAX_FILE_BYTES {
        return Err("larger than 64 KB".into());
    }
    let v: Value = serde_json::from_slice(body).map_err(|_| "not valid JSON".to_string())?;
    if !v.is_object() {
        return Err("not a JSON object".into());
    }
    if v.get("accord").and_then(Value::as_str) != Some("1") {
        return Err("accord is not \"1\"".into());
    }
    match v.get("network").and_then(Value::as_str) {
        Some(n) if n == NETWORK => {}
        Some("testnet" | "mainnet") => return Err(format!("network is not {NETWORK}")),
        _ => return Err("network is not testnet or mainnet".into()),
    }
    if v.get("contact").is_some_and(|c| !c.is_string()) {
        return Err("contact is not a string".into());
    }
    match (v.get("recipients"), v.get("entries")) {
        (Some(r), None) => {
            if body.len() > MAX_SIMPLE_BYTES {
                return Err("simple form larger than 8 KB".into());
            }
            let list = r.as_array().ok_or("recipients is not a list")?;
            if !(1..=8).contains(&list.len()) {
                return Err("recipients must hold 1 to 8 accounts".into());
            }
            let authority = account_field(&v, "settlement_authority")?;
            let mut pairs = Vec::new();
            for r in list {
                let r = r
                    .as_str()
                    .filter(|s| is_account_id(s))
                    .ok_or("a recipient is not an account id")?;
                pairs.push((r.to_string(), authority.clone()));
            }
            Ok(DomainFile {
                form: Form::Simple,
                pairs,
            })
        }
        (None, Some(e)) => {
            if v.get("settlement_authority").is_some() {
                return Err("list form with a top-level settlement_authority".into());
            }
            let list = e.as_array().ok_or("entries is not a list")?;
            if !(1..=64).contains(&list.len()) {
                return Err("entries must hold 1 to 64 objects".into());
            }
            let pairs = list
                .iter()
                .map(|e| {
                    Ok((
                        account_field(e, "recipient")?,
                        account_field(e, "settlement_authority")?,
                    ))
                })
                .collect::<Result<Vec<_>, String>>()?;
            Ok(DomainFile {
                form: Form::List,
                pairs,
            })
        }
        (Some(_), Some(_)) => Err("both recipients and entries".into()),
        (None, None) => Err("neither recipients nor entries".into()),
    }
}

/// `(recipient_listed, authority_matches)`, each `"ok"` or a short failure. In the list form the authority must
/// be paired with this recipient in the same entry.
pub fn check_pair(file: &DomainFile, account: &str, authority: &str) -> (String, String) {
    let listed: Vec<&(String, String)> = file.pairs.iter().filter(|(r, _)| r == account).collect();
    if listed.is_empty() {
        return ("account not listed".into(), "account not listed".into());
    }
    let auth = if listed.iter().any(|(_, a)| a == authority) {
        "ok".into()
    } else {
        "authority differs".into()
    };
    ("ok".into(), auth)
}

// ---------------------------------------------------------------------------------------------------------------
// Signals and rating (pure).

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct Signals {
    pub exists: bool,
    pub is_contract: bool,
    /// `None` when the archival read was unavailable or the account does not exist.
    pub code_changed_30d: Option<bool>,
    /// The code hashes then and now, when it changed.
    pub code_hashes: Option<(String, String)>,
    pub prior_payments: u64,
    pub reports: u64,
    /// The curated blocklist's evidence string, when blocked.
    pub blocked: Option<String>,
    pub canary: bool,
}

impl Signals {
    pub fn to_json(&self) -> Value {
        // No keyless indexer is wired in (PROGRESS 0.8 open): age and activity are unavailable, never guessed.
        json!({"exists": self.exists, "is_contract": self.is_contract, "code_changed_30d": self.code_changed_30d,
               "age_days": null, "tx_30d": null, "prior_payments": self.prior_payments, "reports": self.reports,
               "blocked": self.blocked.is_some(), "canary": self.canary})
    }
}

fn short(s: &str, n: usize) -> String {
    s.chars().take(n).collect()
}

/// ARCHITECTURE.md 7.3: `block` for a missing account, a canary or the curated list; `warn` for a contract, a
/// recent code change or any shared report; otherwise `allow`. Reasons name each cause (at most 8, each short).
pub fn rate(s: &Signals) -> (Rating, Vec<String>) {
    let mut block = Vec::new();
    let mut warn = Vec::new();
    if !s.exists {
        block.push("account does not exist".to_string());
    }
    if s.canary {
        block.push("account is a canary of this agreement".to_string());
    }
    if let Some(evidence) = &s.blocked {
        block.push(format!(
            "account is on the factory blocklist: {}",
            short(evidence, 120)
        ));
    }
    if s.is_contract {
        warn.push("receiver is a contract".to_string());
    }
    if s.code_changed_30d == Some(true) {
        let (then, now) = s.code_hashes.clone().unwrap_or_default();
        warn.push(format!("code changed in the last 30 days: {then} to {now}"));
    }
    if s.reports > 0 {
        warn.push(format!(
            "{} shared report(s) from refused payments",
            s.reports
        ));
    }
    let rating = if !block.is_empty() {
        Rating::Block
    } else if !warn.is_empty() {
        Rating::Warn
    } else {
        Rating::Allow
    };
    block.extend(warn);
    block.truncate(8);
    (rating, block)
}

// ---------------------------------------------------------------------------------------------------------------
// The run.

struct State {
    authority: String,
    buyer: String,
    factory: String,
    canaries: Vec<String>,
    domain: String,
    account: String,
}

fn str_of(v: &Value, key: &str) -> Result<String, String> {
    v[key]
        .as_str()
        .map(String::from)
        .ok_or_else(|| format!("get_agreement: no {key}"))
}

fn read_state(rpc: &NearRpc, agreement: &str, version: u32, deps: &Deps) -> Result<State, String> {
    let ag = rpc::retry(deps.retry, deps.pause, || {
        rpc::view_json(rpc, agreement, "get_agreement", &json!({}), "optimistic").map(Some)
    })?
    .unwrap_or(Value::Null);
    require_accord(rpc, agreement, &ag, deps)?;
    // The version was proposed moments before the request: retry until it is visible.
    let r = rpc::retry(deps.retry, deps.pause, || {
        let list = rpc::view_json(rpc, agreement, "get_recipients", &json!({}), "optimistic")?;
        Ok(list
            .as_array()
            .and_then(|l| l.get(version as usize - 1))
            .cloned())
    })?
    .ok_or_else(|| format!("recipient version {version} not found"))?;
    if r["version"].as_u64() != Some(u64::from(version)) {
        return Err("get_recipients: version out of order".into());
    }
    Ok(State {
        authority: str_of(&ag, "vendor_authority")?,
        buyer: str_of(&ag, "buyer")?,
        factory: str_of(&ag, "factory")?,
        canaries: ag["canaries"]
            .as_array()
            .map(|a| {
                a.iter()
                    .filter_map(Value::as_str)
                    .map(String::from)
                    .collect()
            })
            .unwrap_or_default(),
        domain: r["domain"]
            .as_str()
            .ok_or("recipient: no domain")?
            .to_string(),
        account: r["account"]
            .as_str()
            .ok_or("recipient: no account")?
            .to_string(),
    })
}

/// The same rule the contract applies to `propose_recipient`'s domain.
pub fn is_domain(d: &str) -> bool {
    d.len() <= 253
        && d.contains('.')
        && d.split('.').all(|l| {
            !l.is_empty()
                && l.len() <= 63
                && l.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
        })
}

pub fn file_url(domain: &str) -> String {
    format!("https://{domain}/.well-known/accord.json")
}

/// Fetches and validates the file: the sha256 of the bytes when a file was served, and the parsed file or failure.
fn fetch_file(http: &dyn Http, domain: &str) -> (Option<String>, Result<DomainFile, String>) {
    if !is_domain(domain) {
        return (None, Err("invalid domain".into()));
    }
    let req = Request {
        method: Method::Get,
        url: file_url(domain),
        headers: vec![("Accept".into(), "application/json".into())],
        body: None,
        max_bytes: MAX_FILE_BYTES,
    };
    match http.send(&req) {
        Err(e) if e.contains("exceeds") => (None, Err("larger than 64 KB".into())),
        Err(e) => (None, Err(format!("fetch failed: {}", short(&e, 120)))),
        Ok(r) if r.status != 200 => (None, Err(format!("HTTP status {}", r.status))),
        Ok(r) => (
            Some(hex::encode(sha256(&r.body))),
            parse_file(r.content_type.as_deref(), &r.body),
        ),
    }
}

/// The code hash about 30 days back on the archival endpoint, compared with `now_hash`; `None` when unavailable.
fn code_change(
    archival: &NearRpc,
    account: &str,
    head_height: u64,
    head_time: u64,
    now_hash: &str,
) -> Option<(bool, String)> {
    let est = head_height.saturating_sub(BLOCKS_30D_ESTIMATE);
    let probe = block_from(archival, est, est + 20).ok()??;
    // Calibrate seconds per block over that span, then step back 30 days from the head.
    let span = head_time.checked_sub(probe.time).filter(|s| *s > 0)?;
    let blocks = (u128::from(30 * 86_400u64) * u128::from(head_height - probe.height)
        / u128::from(span)) as u64;
    let start = head_height.saturating_sub(blocks);
    let then = block_from(archival, start, start + 20).ok()??;
    let old = match account_code_hash(archival, account, At::Height(then.height)) {
        Ok(Some(h)) => h,
        Ok(None) => EMPTY_CODE_HASH.to_string(), // the account did not exist then
        Err(_) => return None,
    };
    Some((old != now_hash, old))
}

fn prove(input: &Value, deps: &Deps) -> Result<Value, String> {
    let agreement = input["agreement"]
        .as_str()
        .filter(|a| is_account_id(a))
        .ok_or("agreement: a NEAR account id")?;
    let version = input["version"]
        .as_u64()
        .and_then(|v| u32::try_from(v).ok())
        .filter(|v| *v >= 1)
        .ok_or("version: an integer from 1")?;
    let testnet = NearRpc::new(deps.http, TESTNET, deps.pause);
    let st = read_state(&testnet, agreement, version, deps)?;
    let head = final_head(&testnet)?;

    let (file_sha256, file) = fetch_file(deps.http, &st.domain);
    let (file_check, listed, auth) = match &file {
        Ok(f) => {
            let (l, a) = check_pair(f, &st.account, &st.authority);
            ("ok".to_string(), l, a)
        }
        Err(e) => (e.clone(), "no valid file".into(), "no valid file".into()),
    };

    let now_hash = account_code_hash(&testnet, &st.account, At::Finality("final"))?;
    let changed = now_hash.as_deref().and_then(|now| {
        let archival = NearRpc::new(deps.http, TESTNET_ARCHIVAL, deps.pause);
        code_change(&archival, &st.account, head.height, head.time, now)
            .map(|(c, old)| (c, old, now.to_string()))
    });
    let factory_view =
        |method: &str, args: Value| rpc::view_json(&testnet, &st.factory, method, &args, "final");
    let stats = factory_view(
        "recipient_stats",
        json!({"account": st.account, "buyer": st.buyer}),
    )?;
    let reports = factory_view("reports", json!({"account": st.account}))?;
    let blocked = factory_view("blocked", json!({"account": st.account}))?;
    let signals = Signals {
        exists: now_hash.is_some(),
        is_contract: now_hash.as_deref().is_some_and(|h| h != EMPTY_CODE_HASH),
        code_changed_30d: changed.as_ref().map(|c| c.0),
        code_hashes: changed.and_then(|(c, old, now)| c.then_some((old, now))),
        prior_payments: stats["buyer"]["payments"].as_u64().unwrap_or(0),
        reports: reports.as_array().map_or(0, |a| a.len() as u64),
        blocked: match blocked {
            Value::Null => None,
            Value::String(s) => Some(s),
            other => Some(other.to_string()),
        },
        canary: st.canaries.contains(&st.account),
    };
    let (rating, reasons) = rate(&signals);
    let out = json!({
        "mode": "prove",
        "agreement": agreement,
        "version": version,
        "domain": st.domain,
        "url": file_url(&st.domain),
        "file_sha256": file_sha256,
        "account": st.account,
        "authority": st.authority,
        "fetched_at": head.time,
        "block": head.height,
        "form": file.as_ref().ok().map(|f| f.form.as_str()),
        "demo_domain": DEMO_DOMAINS.contains(&st.domain.as_str()),
        "checks": {"file": file_check, "recipient_listed": listed, "authority_matches": auth},
        "signals": signals.to_json(),
        "rating": rating,
        "reasons": reasons,
    });
    Ok(keys::sign(
        out,
        &keys::signing_key(&deps.seed, PAYEE_SIGN_INFO),
    ))
}

/// Only an agreement an Accord factory created (audit L5-F2): its id, its own view and the factory's registry.
fn require_accord(rpc: &NearRpc, agreement: &str, view: &Value, deps: &Deps) -> Result<(), String> {
    accord_jobkit::factory::check(agreement, view, &deps.factories, |factory, args| {
        rpc::view_json(rpc, factory, "is_agreement", args, "optimistic")
    })
    .map_err(|e| match e {
        accord_jobkit::factory::Refused::NotAccord(why) => {
            format!("not an Accord agreement: {why}")
        }
        accord_jobkit::factory::Refused::Unreadable(e) => e,
    })
}

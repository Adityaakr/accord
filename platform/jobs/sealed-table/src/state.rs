//! Step 1 of the run (ARCHITECTURE.md 8.3): everything except the agreement id and the nonce comes from the
//! agreement's own state, read over the testnet endpoints compiled into the build with `optimistic` finality and
//! retries for up to 15 s, because `start_negotiation` wrote the request moments earlier.

use crate::host::{Host, JobkitHttp};
use accord_core::{Kind, Params};
use accord_jobkit::rpc::{view_json, NearRpc, TESTNET};
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::{json, Value};
use std::time::Duration;

pub const READ_DEADLINE_MS: u64 = 15_000;

#[derive(Clone, Debug, PartialEq)]
pub struct CommitmentRecord {
    pub commitment: String,
    pub ciphertext: Vec<u8>,
    pub doc_pubkey: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct AgreementState {
    pub account: String,
    pub release: u32,
    pub kind: Kind,
    pub buyer: String,
    pub vendor: String,
    pub token: String,
    /// The token's decimals, read from its `ft_metadata`.
    pub decimals: u8,
    pub model: String,
    pub params: Params,
    pub buyer_commitment: CommitmentRecord,
    pub vendor_commitment: CommitmentRecord,
}

/// The two views as JSON, the way the RPC returns them; the parsing below is separate so tests can feed state.
pub trait StateSource {
    fn agreement(&self, account: &str) -> Result<Value, String>;
    fn commitments(&self, account: &str) -> Result<Value, String>;
    fn ft_metadata(&self, token: &str) -> Result<Value, String>;
}

/// The pinned testnet endpoints.
pub struct ChainSource<'a> {
    http: JobkitHttp<'a>,
}

impl<'a> ChainSource<'a> {
    pub fn new(host: &'a dyn Host) -> Self {
        Self {
            http: JobkitHttp(host),
        }
    }
    fn view(&self, account: &str, method: &str) -> Result<Value, String> {
        let rpc = NearRpc::new(&self.http, TESTNET, Duration::from_millis(300));
        view_json(&rpc, account, method, &json!({}), "optimistic").map_err(|e| short_error(&e))
    }
}

impl StateSource for ChainSource<'_> {
    fn agreement(&self, account: &str) -> Result<Value, String> {
        self.view(account, "get_agreement")
    }
    fn commitments(&self, account: &str) -> Result<Value, String> {
        self.view(account, "get_commitments")
    }
    fn ft_metadata(&self, token: &str) -> Result<Value, String> {
        self.view(token, "ft_metadata")
    }
}

/// `"<contract>.<method>: <RPC error JSON>"` shortened to the RPC's error name (`UNKNOWN_ACCOUNT`, ...).
fn short_error(e: &str) -> String {
    let Some((head, rest)) = e.split_once(": ") else {
        return e.to_string();
    };
    let name = serde_json::from_str::<Value>(rest).ok().and_then(|v| {
        v.pointer("/cause/name")
            .or_else(|| v.get("name"))
            .and_then(Value::as_str)
            .map(String::from)
    });
    match name {
        Some(n) => format!("{head}: {n}"),
        None => e.to_string(),
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum ReadError {
    /// A read kept failing, or the request is not (yet) in state: retryable, an infrastructure outcome.
    Infrastructure(String),
}

fn requested_nonce(agreement: &Value) -> Option<&str> {
    agreement
        .pointer("/negotiation/Requested/request_nonce")
        .and_then(Value::as_str)
}

fn commitment(v: &Value, role: &str) -> Result<CommitmentRecord, String> {
    let c = v
        .get(role)
        .filter(|c| !c.is_null())
        .ok_or(format!("no {role} commitment"))?;
    let s = |k: &str| {
        c.get(k)
            .and_then(Value::as_str)
            .map(String::from)
            .ok_or(format!("{role} commitment has no {k}"))
    };
    Ok(CommitmentRecord {
        commitment: s("commitment")?,
        ciphertext: STANDARD
            .decode(s("ciphertext")?)
            .map_err(|_| format!("{role} ciphertext is not base64"))?,
        doc_pubkey: s("doc_pubkey")?,
    })
}

/// Parses the views into the state the run needs.
pub fn parse(
    agreement_id: &str,
    a: &Value,
    c: &Value,
    meta: &Value,
) -> Result<AgreementState, String> {
    let s = |k: &str| {
        a.get(k)
            .and_then(Value::as_str)
            .map(String::from)
            .ok_or(format!("agreement has no {k}"))
    };
    let account = s("account")?;
    if account != agreement_id {
        return Err("the view answers for another account".into());
    }
    Ok(AgreementState {
        account,
        release: a
            .get("release")
            .and_then(Value::as_u64)
            .and_then(|r| u32::try_from(r).ok())
            .ok_or("agreement has no release")?,
        kind: serde_json::from_value(a.get("kind").cloned().unwrap_or_default())
            .map_err(|_| "agreement kind does not parse")?,
        buyer: s("buyer")?,
        vendor: s("vendor")?,
        token: s("token")?,
        decimals: meta
            .get("decimals")
            .and_then(Value::as_u64)
            .and_then(|d| u8::try_from(d).ok())
            .ok_or("token metadata has no decimals")?,
        model: s("model")?,
        params: serde_json::from_value(a.get("params").cloned().unwrap_or_default())
            .map_err(|e| format!("params do not parse: {e}"))?,
        buyer_commitment: commitment(c, "buyer")?,
        vendor_commitment: commitment(c, "vendor")?,
    })
}

/// Reads until the agreement shows `Requested` with this nonce, or the deadline passes.
pub fn read(
    host: &dyn Host,
    src: &dyn StateSource,
    agreement_id: &str,
    nonce: &str,
) -> Result<AgreementState, ReadError> {
    let start = host.millis();
    let mut last;
    loop {
        match src.agreement(agreement_id) {
            Ok(a) if requested_nonce(&a) == Some(nonce) => {
                let token = a.get("token").and_then(Value::as_str).unwrap_or_default();
                let read_rest = src
                    .commitments(agreement_id)
                    .and_then(|c| Ok((c, src.ft_metadata(token)?)));
                match read_rest.and_then(|(c, m)| parse(agreement_id, &a, &c, &m)) {
                    Ok(st) => return Ok(st),
                    Err(e) => last = e,
                }
            }
            Ok(a) => {
                last = match requested_nonce(&a) {
                    Some(_) => "a different negotiation request is in state".into(),
                    None => "no negotiation request in state".into(),
                }
            }
            Err(e) => last = e,
        }
        if host.millis().saturating_sub(start) >= READ_DEADLINE_MS {
            return Err(ReadError::Infrastructure(format!("state read: {last}")));
        }
        host.sleep(Duration::from_millis(1000));
    }
}

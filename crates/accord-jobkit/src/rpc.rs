//! NEAR JSON-RPC over endpoints compiled into the build (INTERFACES.md section 7). Callers never pass a URL.
//!
//! [`NearRpc`] implements `accord_venue::Rpc`, so the venue measurement and the block search run over it unchanged.
//! It tries each pinned endpoint in order. A transport failure, a rate limit or a server error moves on to the
//! next endpoint; so does a JSON-RPC error on a `query` (for example a block the node has garbage-collected),
//! except the errors every honest node gives alike (`UNKNOWN_ACCOUNT`, `NO_CONTRACT_CODE`). A `block` error is
//! returned as is, because a skipped height answers `UNKNOWN_BLOCK` everywhere and the block search steps past it.
//! When every endpoint failed a call, [`NearRpc::failed`] is set, so a job can refuse to sign a result that a
//! failed read could have changed (`accord_venue::measure` reads a failed `quote` as zero).

use accord_venue::Rpc;
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::{json, Value};
use std::cell::Cell;
use std::time::{Duration, Instant};

use crate::http::{Http, Method, Request};

pub const TESTNET: &[&str] = &[
    "https://test.rpc.fastnear.com",
    "https://rpc.testnet.near.org",
];
/// Archival testnet, for the code-change signal 30 days back (heavily rate-limited, DECISIONS.md section 6).
pub const TESTNET_ARCHIVAL: &[&str] = &["https://archival-rpc.testnet.near.org"];
pub const MAINNET: &[&str] = &[
    "https://free.rpc.fastnear.com",
    "https://rpc.mainnet.near.org",
];
/// Mainnet with the archival endpoint first, for slot times older than the public nodes keep (DECISIONS.md 6b:
/// the public RPC answered 12 h back, not 24 h; `archival-rpc.mainnet.fastnear.com` reproduced the probe exactly).
pub const MAINNET_ARCHIVAL_FIRST: &[&str] = &[
    "https://archival-rpc.mainnet.fastnear.com",
    "https://free.rpc.fastnear.com",
    "https://rpc.mainnet.near.org",
];

/// Which network an endpoint URL serves; `None` for anything not compiled in.
pub fn network_of(url: &str) -> Option<&'static str> {
    if TESTNET.contains(&url) || TESTNET_ARCHIVAL.contains(&url) {
        Some("testnet")
    } else if MAINNET.contains(&url) || MAINNET_ARCHIVAL_FIRST.contains(&url) {
        Some("mainnet")
    } else {
        None
    }
}

/// JSON-RPC responses are small except `block` (a few KB); 1 MB bounds any of them.
const MAX_RPC_BYTES: usize = 1 << 20;

pub struct NearRpc<'a> {
    http: &'a dyn Http,
    endpoints: &'a [&'a str],
    /// Pause between attempts on one endpoint after a rate limit or server error (zero in tests).
    pause: Duration,
    failed: Cell<bool>,
}

impl<'a> NearRpc<'a> {
    pub fn new(http: &'a dyn Http, endpoints: &'a [&'a str], pause: Duration) -> Self {
        Self {
            http,
            endpoints,
            pause,
            failed: Cell::new(false),
        }
    }

    /// Some call failed on every endpoint since this client was created.
    pub fn failed(&self) -> bool {
        self.failed.get()
    }
}

fn deterministic_error(method: &str, err: &Value) -> bool {
    if method == "block" {
        return true;
    }
    let name = err
        .pointer("/cause/name")
        .and_then(Value::as_str)
        .unwrap_or("");
    matches!(name, "UNKNOWN_ACCOUNT" | "NO_CONTRACT_CODE")
}

impl Rpc for NearRpc<'_> {
    fn call(&self, method: &str, params: Value) -> Result<Value, String> {
        let body = json!({"jsonrpc": "2.0", "id": "accord", "method": method, "params": params});
        let req_for = |url: &str| Request {
            method: Method::Post,
            url: url.to_string(),
            headers: vec![("Content-Type".into(), "application/json".into())],
            body: Some(body.to_string().into_bytes()),
            max_bytes: MAX_RPC_BYTES,
        };
        let mut last_err = String::from("no endpoint");
        let mut last_rpc_error: Option<Value> = None;
        for url in self.endpoints {
            for attempt in 0..2 {
                let resp = match self.http.send(&req_for(url)) {
                    Ok(r) => r,
                    Err(e) => {
                        last_err = format!("{url}: {e}");
                        continue;
                    }
                };
                let parsed: Option<Value> = serde_json::from_slice(&resp.body)
                    .ok()
                    .filter(|v: &Value| v.get("result").is_some() || v.get("error").is_some());
                match parsed {
                    Some(v) if v.get("error").is_some() => {
                        if deterministic_error(method, &v["error"]) {
                            return Ok(v);
                        }
                        last_err = format!("{url}: {}", v["error"]);
                        last_rpc_error = Some(v);
                        break; // a node-specific error: try the next endpoint
                    }
                    Some(v) => return Ok(v),
                    None => {
                        last_err = format!("{url}: status {}", resp.status);
                        let transient = resp.status == 429 || resp.status >= 500;
                        if !transient {
                            break;
                        }
                        if attempt == 0 && !self.pause.is_zero() {
                            std::thread::sleep(self.pause);
                        }
                    }
                }
            }
        }
        self.failed.set(true);
        match last_rpc_error {
            Some(v) => Ok(v),
            None => Err(format!("rpc {method}: {last_err}")),
        }
    }
}

/// A contract view (JSON in, JSON out) at a finality (`optimistic` or `final`).
pub fn view_json(
    rpc: &dyn Rpc,
    contract: &str,
    method: &str,
    args: &Value,
    finality: &str,
) -> Result<Value, String> {
    let r = rpc.call(
        "query",
        json!({"request_type": "call_function", "account_id": contract, "method_name": method,
               "args_base64": STANDARD.encode(args.to_string()), "finality": finality}),
    )?;
    if let Some(e) = r.get("error") {
        return Err(format!("{contract}.{method}: {e}"));
    }
    let res = &r["result"];
    if let Some(e) = res.get("error") {
        return Err(format!("{contract}.{method}: {e}"));
    }
    let bytes: Vec<u8> = res["result"]
        .as_array()
        .ok_or(format!("{contract}.{method}: no result"))?
        .iter()
        .map(|b| b.as_u64().unwrap_or(0) as u8)
        .collect();
    serde_json::from_slice(&bytes).map_err(|e| format!("{contract}.{method}: {e}"))
}

/// Where to read an account: at a finality or at a block height.
#[derive(Clone, Copy, Debug)]
pub enum At<'a> {
    Finality(&'a str),
    Height(u64),
}

/// The empty code hash: an account without a contract.
pub const EMPTY_CODE_HASH: &str = "11111111111111111111111111111111";

/// `view_account`'s code hash, or `None` when the account does not exist (at that block).
pub fn account_code_hash(rpc: &dyn Rpc, account: &str, at: At) -> Result<Option<String>, String> {
    let mut params = json!({"request_type": "view_account", "account_id": account});
    match at {
        At::Finality(f) => params["finality"] = json!(f),
        At::Height(h) => params["block_id"] = json!(h),
    }
    let r = rpc.call("query", params)?;
    let missing = |e: &Value| {
        e.pointer("/cause/name").and_then(Value::as_str) == Some("UNKNOWN_ACCOUNT")
            || e.to_string().contains("does not exist")
    };
    if let Some(e) = r.get("error") {
        return if missing(e) {
            Ok(None)
        } else {
            Err(format!("view_account: {e}"))
        };
    }
    if let Some(e) = r["result"].get("error") {
        return if missing(e) {
            Ok(None)
        } else {
            Err(format!("view_account: {e}"))
        };
    }
    r["result"]["code_hash"]
        .as_str()
        .map(|s| Some(s.to_string()))
        .ok_or_else(|| "view_account: no code_hash".into())
}

/// Calls `f` until it yields a value, for up to `budget` (state written moments earlier may not be visible yet at
/// `optimistic` finality on every node). The last error, or `None`, is returned when the budget runs out.
pub fn retry<T>(
    budget: Duration,
    pause: Duration,
    mut f: impl FnMut() -> Result<Option<T>, String>,
) -> Result<Option<T>, String> {
    let start = Instant::now();
    loop {
        let r = f();
        if matches!(r, Ok(Some(_))) || start.elapsed() + pause > budget {
            return r;
        }
        std::thread::sleep(pause);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::{FixtureHttp, Reply};

    fn ok(v: Value) -> Reply {
        Reply::Json(200, json!({"jsonrpc": "2.0", "id": "accord", "result": v}))
    }

    #[test]
    fn falls_back_on_transport_errors_and_flags_total_failure() {
        let http = FixtureHttp::new();
        http.on_url(TESTNET[0], |_| Reply::Fail("connection refused".into()));
        http.on_url(TESTNET[1], |_| ok(json!({"x": 1})));
        let rpc = NearRpc::new(&http, TESTNET, Duration::ZERO);
        assert_eq!(rpc.call("status", json!([])).unwrap()["result"]["x"], 1);
        assert!(!rpc.failed());

        let dead = FixtureHttp::new();
        dead.on_any(|_| Reply::Json(503, json!("busy")));
        let rpc = NearRpc::new(&dead, TESTNET, Duration::ZERO);
        assert!(rpc.call("status", json!([])).is_err());
        assert!(rpc.failed());
    }

    #[test]
    fn unknown_account_is_answered_once_and_read_as_missing() {
        let http = FixtureHttp::new();
        http.on_any(|_| {
            Reply::Json(
                200,
                json!({"jsonrpc": "2.0", "id": "accord", "error": {"name": "HANDLER_ERROR",
                       "cause": {"name": "UNKNOWN_ACCOUNT", "info": {}}}}),
            )
        });
        let rpc = NearRpc::new(&http, TESTNET, Duration::ZERO);
        assert_eq!(
            account_code_hash(&rpc, "nobody.testnet", At::Finality("final")).unwrap(),
            None
        );
        assert_eq!(http.calls(), 1);
        assert!(!rpc.failed());
    }

    #[test]
    fn view_json_decodes_result_bytes() {
        let http = FixtureHttp::new();
        http.on_any(|_| ok(crate::testing::call_result(&json!({"a": [1, 2]}))));
        let rpc = NearRpc::new(&http, TESTNET, Duration::ZERO);
        let v = view_json(&rpc, "a1.x.testnet", "get", &json!({}), "final").unwrap();
        assert_eq!(v, json!({"a": [1, 2]}));
    }

    #[test]
    fn retry_stops_at_the_first_value() {
        let mut n = 0;
        let r = retry(Duration::from_secs(5), Duration::ZERO, || {
            n += 1;
            Ok((n == 3).then_some(n))
        });
        assert_eq!(r.unwrap(), Some(3));
    }
}

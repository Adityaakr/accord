//! Fixture transports for native tests and for recording real responses once (`fixtures/jobs/`).
//!
//! [`FixtureHttp`] answers from handlers: per URL, per network's JSON-RPC (method and params), from a recording,
//! or a catch-all. [`Recorder`] wraps a real transport and keeps every JSON-RPC answer it saw, keyed the same way,
//! so a test can replay a live run call for call.

use crate::http::{Http, Method, Request, Response};
use crate::rpc::network_of;
use accord_core::hash::jcs;
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::{json, Map, Value};
use std::cell::{Cell, RefCell};
use std::collections::BTreeMap;

pub enum Reply {
    Json(u16, Value),
    Raw(Response),
    Fail(String),
}

type UrlHandler = Box<dyn Fn(&Request) -> Reply>;
type RpcHandler = Box<dyn Fn(&str, &Value) -> Option<Value>>;

#[derive(Default)]
pub struct FixtureHttp {
    urls: RefCell<Vec<(String, UrlHandler)>>,
    rpc: RefCell<Vec<(&'static str, RpcHandler)>>,
    any: RefCell<Option<UrlHandler>>,
    calls: Cell<usize>,
}

/// The key a JSON-RPC call is recorded and replayed under: `JCS({"method", "params"})`.
pub fn rpc_key(method: &str, params: &Value) -> String {
    String::from_utf8(jcs(&json!({"method": method, "params": params}))).expect("JCS is UTF-8")
}

/// A JSON-RPC success envelope.
pub fn rpc_ok(result: Value) -> Value {
    json!({"jsonrpc": "2.0", "id": "accord", "result": result})
}

/// A `call_function` result carrying `value` as its JSON bytes.
pub fn call_result(value: &Value) -> Value {
    let bytes: Vec<Value> = value.to_string().bytes().map(|b| json!(b)).collect();
    json!({"result": bytes, "logs": [], "block_height": 1, "block_hash": "fixture"})
}

/// The view method and decoded args of a `call_function` query, if `params` is one.
pub fn call_of(method: &str, params: &Value) -> Option<(String, String, Value)> {
    if method != "query" || params["request_type"] != "call_function" {
        return None;
    }
    let args = params["args_base64"]
        .as_str()
        .and_then(|a| STANDARD.decode(a).ok())
        .and_then(|b| serde_json::from_slice(&b).ok())
        .unwrap_or(Value::Null);
    Some((
        params["account_id"].as_str()?.to_string(),
        params["method_name"].as_str()?.to_string(),
        args,
    ))
}

/// A `block` answer with only the header fields the jobs read.
pub fn block_reply(height: u64, hash: &str, time_secs: u64) -> Value {
    rpc_ok(json!({"header": {"height": height, "hash": hash,
                             "timestamp_nanosec": (u128::from(time_secs) * 1_000_000_000).to_string()}}))
}

impl FixtureHttp {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn calls(&self) -> usize {
        self.calls.get()
    }

    pub fn on_url(&self, url: &str, f: impl Fn(&Request) -> Reply + 'static) {
        self.urls.borrow_mut().push((url.to_string(), Box::new(f)));
    }

    pub fn on_any(&self, f: impl Fn(&Request) -> Reply + 'static) {
        *self.any.borrow_mut() = Some(Box::new(f));
    }

    /// JSON-RPC calls to `network`'s pinned endpoints; `f` returns the full envelope or `None` to fall through.
    pub fn on_rpc(
        &self,
        network: &'static str,
        f: impl Fn(&str, &Value) -> Option<Value> + 'static,
    ) {
        self.rpc.borrow_mut().push((network, Box::new(f)));
    }

    /// Replays a recording made by [`Recorder::to_fixture`].
    pub fn replay(&self, network: &'static str, fixture: &Value) {
        let map: BTreeMap<String, Value> = fixture["calls"]
            .as_array()
            .map(|a| {
                a.iter()
                    .map(|c| {
                        (
                            rpc_key(c["method"].as_str().unwrap_or(""), &c["params"]),
                            c["response"].clone(),
                        )
                    })
                    .collect()
            })
            .unwrap_or_default();
        self.on_rpc(network, move |m, p| map.get(&rpc_key(m, p)).cloned());
    }
}

fn reply_to_response(r: Reply) -> Result<Response, String> {
    match r {
        Reply::Json(status, v) => Ok(Response {
            status,
            content_type: Some("application/json".into()),
            body: v.to_string().into_bytes(),
        }),
        Reply::Raw(r) => Ok(r),
        Reply::Fail(e) => Err(e),
    }
}

fn rpc_parts(req: &Request) -> Option<(String, Value)> {
    if req.method != Method::Post {
        return None;
    }
    let v: Value = serde_json::from_slice(req.body.as_deref()?).ok()?;
    Some((v["method"].as_str()?.to_string(), v["params"].clone()))
}

impl Http for FixtureHttp {
    fn send(&self, req: &Request) -> Result<Response, String> {
        self.calls.set(self.calls.get() + 1);
        for (url, f) in self.urls.borrow().iter() {
            if *url == req.url {
                return reply_to_response(f(req));
            }
        }
        if let (Some(net), Some((m, p))) = (network_of(&req.url), rpc_parts(req)) {
            for (n, f) in self.rpc.borrow().iter() {
                if *n == net {
                    if let Some(v) = f(&m, &p) {
                        return reply_to_response(Reply::Json(200, v));
                    }
                }
            }
        }
        if let Some(f) = self.any.borrow().as_ref() {
            return reply_to_response(f(req));
        }
        Err(format!(
            "fixture: no answer for {} {}",
            req.url,
            String::from_utf8_lossy(req.body.as_deref().unwrap_or_default())
        ))
    }
}

/// Wraps a real transport and keeps each JSON-RPC answer for `network` (block answers trimmed to the header
/// fields the jobs read, so fixtures stay small).
pub struct Recorder<'a> {
    pub inner: &'a dyn Http,
    pub network: &'static str,
    calls: RefCell<BTreeMap<String, (String, Value, Value)>>,
}

impl<'a> Recorder<'a> {
    pub fn new(inner: &'a dyn Http, network: &'static str) -> Self {
        Self {
            inner,
            network,
            calls: RefCell::new(BTreeMap::new()),
        }
    }

    pub fn to_fixture(&self, note: &str) -> Value {
        let calls: Vec<Value> = self
            .calls
            .borrow()
            .values()
            .map(|(m, p, r)| json!({"method": m, "params": p, "response": r}))
            .collect();
        json!({"note": note, "calls": calls})
    }
}

fn trim(method: &str, v: Value) -> Value {
    if method != "block" || v.get("result").is_none() {
        return v;
    }
    let h = &v["result"]["header"];
    let mut header = Map::new();
    for k in ["height", "hash", "timestamp", "timestamp_nanosec"] {
        header.insert(k.into(), h[k].clone());
    }
    rpc_ok(json!({"header": header}))
}

impl Http for Recorder<'_> {
    fn send(&self, req: &Request) -> Result<Response, String> {
        let resp = self.inner.send(req)?;
        if let (Some(net), Some((m, p))) = (network_of(&req.url), rpc_parts(req)) {
            if net == self.network && resp.status == 200 {
                if let Ok(v) = serde_json::from_slice::<Value>(&resp.body) {
                    let v = trim(&m, v);
                    self.calls.borrow_mut().insert(rpc_key(&m, &p), (m, p, v));
                }
            }
        }
        Ok(resp)
    }
}

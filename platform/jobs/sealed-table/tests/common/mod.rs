//! Test hosts, fixture state and a scripted model side for the Sealed Table's native tests.
#![allow(dead_code)]

use accord_core::hash::sha256;
use accord_core::limits::Role;
use accord_core::Kind;
use accord_sealed_table::attest::{Attestation, PartResult};
use accord_sealed_table::host::{Host, HttpRequest, HttpResponse, Method};
use accord_sealed_table::nearai::ResponseRecord;
use accord_sealed_table::protocol::{Chat, Negotiator};
use accord_sealed_table::run::Ai;
use accord_sealed_table::state::StateSource;
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::{json, Value};
use std::cell::{Cell, RefCell};
use std::path::PathBuf;
use std::time::Duration;

pub fn repo() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..")
}

pub fn fixture_path(name: &str) -> PathBuf {
    repo().join("fixtures/jobs/sealed-table").join(name)
}

pub fn sealed() -> Value {
    serde_json::from_slice(&std::fs::read(fixture_path("sealed.json")).expect("sealed.json"))
        .unwrap()
}

pub fn test_seed() -> [u8; 32] {
    hex::decode(sealed()["test_seed"].as_str().unwrap())
        .unwrap()
        .try_into()
        .unwrap()
}

pub const NONCE: &str = "1111111111111111111111111111111111111111111111111111111111111111";
pub const TOKEN: &str = "usdc.fakes.testnet";

pub fn params() -> Value {
    json!({"mode": "demo", "timelock_secs": 120, "claim_delay_secs": 120, "grace_secs": 600,
           "min_acceptance_window_secs": 60, "max_acceptance_window_secs": 604800, "require_two_sided": true,
           "observation_grace_secs": 60, "refusal_limit": 5, "refusal_window_secs": 3600,
           "agent_allowance": "500000000000000000000000"})
}

/// The agreement's views as the contract returns them, for the sealed fixture pair of `kind`
/// (`procurement` or `market_making`).
pub struct FixtureSource {
    pub agreement: RefCell<Value>,
    pub commitments: RefCell<Value>,
    pub reads: Cell<u32>,
    /// What the factory's `is_agreement` answers.
    pub registered: Cell<bool>,
}

impl FixtureSource {
    pub fn new(kind: &str) -> Self {
        let f = sealed();
        let pair = &f[kind];
        let commit = |c: &Value| {
            json!({"commitment": c["commitment"], "ciphertext": c["ciphertext"], "doc_pubkey": c["doc_pubkey"],
                   "doc_key_signer": c["doc_key_signer"], "at": 1})
        };
        Self {
            agreement: RefCell::new(json!({
                "id": 7, "account": f["agreement"], "factory": FIXTURE_FACTORY, "release": f["release"],
                "kind": if kind == "procurement" { "procurement" } else { "market-making" },
                "state": "Sealed",
                "negotiation": {"Requested": {"request_nonce": NONCE, "at": 1, "attempt": 1}},
                "buyer": f["parties"]["buyer"], "vendor": f["parties"]["vendor"], "token": TOKEN,
                "model": "z-ai/glm-5.3-flash", "params": params(),
            })),
            commitments: RefCell::new(
                json!({"buyer": commit(&pair["buyer"]), "vendor": commit(&pair["vendor"])}),
            ),
            reads: Cell::new(0),
            registered: Cell::new(true),
        }
    }

    pub fn set_commitment(&self, role: &str, c: &Value) {
        let mut cs = self.commitments.borrow_mut();
        cs[role]["commitment"] = c["commitment"].clone();
        cs[role]["ciphertext"] = c["ciphertext"].clone();
        cs[role]["doc_pubkey"] = c["doc_pubkey"].clone();
    }
}

impl StateSource for FixtureSource {
    fn agreement(&self, _: &str) -> Result<Value, String> {
        self.reads.set(self.reads.get() + 1);
        Ok(self.agreement.borrow().clone())
    }
    fn commitments(&self, _: &str) -> Result<Value, String> {
        Ok(self.commitments.borrow().clone())
    }
    fn ft_metadata(&self, _: &str) -> Result<Value, String> {
        Ok(json!({"spec": "ft-1.0.0", "name": "USDC", "symbol": "USDC", "decimals": 6}))
    }
    fn factories(&self) -> Vec<String> {
        vec![FIXTURE_FACTORY.to_string()]
    }
    fn is_agreement(&self, factory: &str, account: &str) -> Result<Value, String> {
        assert_eq!(factory, FIXTURE_FACTORY);
        assert!(account.ends_with(FIXTURE_FACTORY));
        Ok(json!(self.registered.get()))
    }
}

/// The factory the fixtures' agreement (`a7.accord-v1.testnet`) belongs to.
pub const FIXTURE_FACTORY: &str = "accord-v1.testnet";

type Handler = Box<dyn Fn(&HttpRequest) -> Result<HttpResponse, String>>;

/// A host with a scripted network, a deterministic random source and a clock that only moves when slept.
pub struct TestHost {
    pub handler: Handler,
    pub now: u64,
    counter: Cell<u64>,
    pub millis: Cell<u64>,
    pub requests: RefCell<Vec<(Method, String)>>,
}

impl TestHost {
    pub fn new(handler: impl Fn(&HttpRequest) -> Result<HttpResponse, String> + 'static) -> Self {
        Self {
            handler: Box::new(handler),
            now: 1_793_664_000,
            counter: Cell::new(0),
            millis: Cell::new(0),
            requests: RefCell::new(Vec::new()),
        }
    }
    pub fn offline() -> Self {
        Self::new(|r| Err(format!("no network in this test: {}", r.url)))
    }
}

impl Host for TestHost {
    fn send(&self, req: &HttpRequest) -> Result<HttpResponse, String> {
        self.requests
            .borrow_mut()
            .push((req.method, req.url.clone()));
        (self.handler)(req)
    }
    fn random(&self, n: usize) -> Vec<u8> {
        let mut out = Vec::new();
        while out.len() < n {
            let c = self.counter.get();
            self.counter.set(c + 1);
            out.extend_from_slice(&sha256(&c.to_le_bytes()));
        }
        out.truncate(n);
        out
    }
    fn now_secs(&self) -> u64 {
        self.now
    }
    fn millis(&self) -> u64 {
        self.millis.get()
    }
    fn sleep(&self, d: Duration) {
        self.millis.set(self.millis.get() + d.as_millis() as u64);
    }
}

pub fn json_response(status: u16, v: &Value) -> HttpResponse {
    HttpResponse {
        status,
        headers: vec![("content-type".into(), "application/json".into())],
        body: v.to_string().into_bytes(),
    }
}

/// A SYNTHETIC attestation summary for the scripted model side: no report was fetched, nothing was verified.
/// It exists only so the protocol, limit checks, terms, documents and signing can be tested natively.
pub fn synthetic_attestation(signer: &str) -> Attestation {
    let part = |addr: &str, model: bool| PartResult {
        signing_address: addr.into(),
        tdx_ok: true,
        gpu_ok: model.then_some(true),
        compose_hash: "00".repeat(32),
        signing_public_key: None,
        failures: vec![],
    };
    Attestation {
        nonce: "22".repeat(32),
        report_sha256: "33".repeat(32),
        gateway: part("0x00000000000000000000000000000000000000aa", false),
        candidates: vec![part(signer, true)],
        local: false,
    }
}

/// The model side as a script: each answer in order, with the messages each side was shown kept for inspection.
pub struct ScriptedAi {
    pub answers: RefCell<Vec<String>>,
    pub seen: RefCell<Vec<(Role, Vec<Chat>)>>,
    pub attest_result: Result<Attestation, String>,
    pub attested: Cell<bool>,
}

impl ScriptedAi {
    pub fn new(answers: &[Value]) -> Self {
        Self {
            answers: RefCell::new(answers.iter().rev().map(|a| a.to_string()).collect()),
            seen: RefCell::new(Vec::new()),
            attest_result: Ok(synthetic_attestation(
                "0x00000000000000000000000000000000000000bb",
            )),
            attested: Cell::new(false),
        }
    }
}

impl Negotiator for ScriptedAi {
    fn ask(&mut self, side: Role, _kind: Kind, messages: &[Chat]) -> Result<String, String> {
        self.seen.borrow_mut().push((side, messages.to_vec()));
        self.answers
            .borrow_mut()
            .pop()
            .ok_or("script exhausted".into())
    }
}

impl Ai for ScriptedAi {
    fn attest(&mut self, _: &str) -> Result<Attestation, String> {
        self.attested.set(true);
        self.attest_result.clone()
    }
    fn records(&self) -> Vec<ResponseRecord> {
        (0..self.seen.borrow().len())
            .map(|i| ResponseRecord {
                chat_id: format!("chatcmpl-synthetic-{i:024}"),
                request_hash: "44".repeat(32),
                response_hash: "55".repeat(32),
                signature: format!("0x{}", "66".repeat(65)),
                signer: "0x00000000000000000000000000000000000000bb".into(),
            })
            .collect()
    }
    fn usage(&self) -> (u64, u64) {
        (
            1000 * self.seen.borrow().len() as u64,
            200 * self.seen.borrow().len() as u64,
        )
    }
}

/// A native HTTPS host (ureq) for the live tests. Never part of the wasm build.
pub struct NativeHost {
    agent: ureq::Agent,
    start: std::time::Instant,
}

impl NativeHost {
    pub fn new() -> Self {
        Self {
            agent: ureq::AgentBuilder::new()
                .timeout_connect(Duration::from_secs(10))
                .timeout(Duration::from_secs(30))
                .redirects(0)
                .build(),
            start: std::time::Instant::now(),
        }
    }
}

impl Host for NativeHost {
    fn send(&self, req: &HttpRequest) -> Result<HttpResponse, String> {
        use std::io::Read;
        let mut r = match req.method {
            Method::Get => self.agent.get(&req.url),
            Method::Post => self.agent.post(&req.url),
        };
        for (k, v) in &req.headers {
            r = r.set(k, v);
        }
        let resp = match &req.body {
            Some(b) => r.send_bytes(b),
            None => r.call(),
        };
        let resp = match resp {
            Ok(resp) | Err(ureq::Error::Status(_, resp)) => resp,
            Err(e) => return Err(format!("http: {e}")),
        };
        let status = resp.status();
        let headers = resp
            .headers_names()
            .into_iter()
            .filter_map(|n| {
                resp.header(&n)
                    .map(|v| (n.to_ascii_lowercase(), v.to_string()))
            })
            .collect();
        let mut body = Vec::new();
        resp.into_reader()
            .take(req.max_bytes as u64 + 1)
            .read_to_end(&mut body)
            .map_err(|e| format!("http: {e}"))?;
        Ok(HttpResponse {
            status,
            headers,
            body,
        })
    }
    fn random(&self, n: usize) -> Vec<u8> {
        let mut out = vec![0u8; n];
        getrandom_fill(&mut out);
        out
    }
    fn now_secs(&self) -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
    }
    fn millis(&self) -> u64 {
        self.start.elapsed().as_millis() as u64
    }
    fn sleep(&self, d: Duration) {
        std::thread::sleep(d)
    }
}

fn getrandom_fill(out: &mut [u8]) {
    use std::io::Read;
    std::fs::File::open("/dev/urandom")
        .and_then(|mut f| f.read_exact(out))
        .expect("/dev/urandom");
}

/// Records every exchange and every random draw of a wrapped host, so a live run can be replayed byte for byte.
/// Request headers are never recorded (the API key travels in one).
pub struct Recorder<'a> {
    pub inner: &'a dyn Host,
    pub log: RefCell<Vec<Value>>,
    pub now: Cell<Option<u64>>,
}

impl<'a> Recorder<'a> {
    pub fn new(inner: &'a dyn Host) -> Self {
        Self {
            inner,
            log: RefCell::new(Vec::new()),
            now: Cell::new(None),
        }
    }
    pub fn to_json(&self) -> Value {
        json!({"now": self.now.get(), "log": self.log.borrow().clone()})
    }
}

impl Host for Recorder<'_> {
    fn send(&self, req: &HttpRequest) -> Result<HttpResponse, String> {
        let r = self.inner.send(req);
        let keep_headers = |h: &[(String, String)]| -> Value {
            h.iter()
                .filter(|(k, _)| k.contains("issuer-chain") || k == "content-type")
                .map(|(k, v)| json!([k, v]))
                .collect()
        };
        self.log.borrow_mut().push(match &r {
            Ok(resp) => json!({"http": {
                "method": format!("{:?}", req.method), "url": req.url,
                "request_body": req.body.as_ref().map(|b| STANDARD.encode(b)),
                "status": resp.status, "headers": keep_headers(&resp.headers), "body": STANDARD.encode(&resp.body)}}),
            Err(e) => json!({"http": {"method": format!("{:?}", req.method), "url": req.url, "error": e}}),
        });
        r
    }
    fn random(&self, n: usize) -> Vec<u8> {
        let b = self.inner.random(n);
        self.log
            .borrow_mut()
            .push(json!({"random": hex::encode(&b)}));
        b
    }
    fn now_secs(&self) -> u64 {
        let t = self.inner.now_secs();
        if self.now.get().is_none() {
            self.now.set(Some(t));
        }
        t
    }
    fn millis(&self) -> u64 {
        self.inner.millis()
    }
    fn sleep(&self, d: Duration) {
        self.inner.sleep(d)
    }
}

/// Rewrites a recorded response body by URL (tamper tests).
pub type BodyEdit = Box<dyn Fn(&str, Vec<u8>) -> Vec<u8>>;

/// Replays a [`Recorder`] log: random draws in order, each request answered by the next recorded exchange for its
/// URL after its body is checked against the recording.
pub struct Replay {
    log: RefCell<std::collections::VecDeque<Value>>,
    now: u64,
    millis: Cell<u64>,
    /// Applied to each recorded response body before it is returned (tamper tests).
    pub edit: BodyEdit,
}

impl Replay {
    pub fn new(recording: &Value) -> Self {
        Self {
            log: RefCell::new(
                recording["log"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .cloned()
                    .collect(),
            ),
            now: recording["now"].as_u64().unwrap(),
            millis: Cell::new(0),
            edit: Box::new(|_, b| b),
        }
    }
    pub fn remaining(&self) -> usize {
        self.log.borrow().len()
    }
}

impl Host for Replay {
    fn send(&self, req: &HttpRequest) -> Result<HttpResponse, String> {
        // The next recorded exchange for this URL (a tamper test can skip some, so not strictly in order).
        let mut log = self.log.borrow_mut();
        let i = log
            .iter()
            .position(|e| e.pointer("/http/url").and_then(Value::as_str) == Some(req.url.as_str()))
            .ok_or(format!("no recorded exchange for {}", req.url))?;
        let next = log.remove(i).unwrap();
        drop(log);
        let h = &next["http"];
        let body = req.body.as_ref().map(|b| STANDARD.encode(b));
        assert_eq!(
            h["request_body"].as_str().map(String::from),
            body,
            "request body differs for {}",
            req.url
        );
        if let Some(e) = h.get("error").and_then(Value::as_str) {
            return Err(e.to_string());
        }
        Ok(HttpResponse {
            status: h["status"].as_u64().unwrap() as u16,
            headers: h["headers"]
                .as_array()
                .unwrap()
                .iter()
                .map(|p| {
                    (
                        p[0].as_str().unwrap().to_string(),
                        p[1].as_str().unwrap().to_string(),
                    )
                })
                .collect(),
            body: (self.edit)(
                &req.url,
                STANDARD.decode(h["body"].as_str().unwrap()).unwrap(),
            ),
        })
    }
    fn random(&self, n: usize) -> Vec<u8> {
        let next = self.log.borrow_mut().pop_front().expect("replay exhausted");
        let b = hex::decode(next["random"].as_str().expect("expected a random draw")).unwrap();
        assert_eq!(b.len(), n);
        b
    }
    fn now_secs(&self) -> u64 {
        self.now
    }
    fn millis(&self) -> u64 {
        self.millis.get()
    }
    fn sleep(&self, d: Duration) {
        self.millis.set(self.millis.get() + d.as_millis() as u64);
    }
}

/// `NEARAI_API_KEY` from the environment or the repository's `.env`; never printed.
pub fn api_key() -> Option<String> {
    if let Ok(k) = std::env::var("NEARAI_API_KEY") {
        return Some(k);
    }
    let env = std::fs::read_to_string(repo().join(".env")).ok()?;
    env.lines()
        .find_map(|l| l.strip_prefix("NEARAI_API_KEY="))
        .map(|v| v.trim().trim_matches('"').trim_matches('\'').to_string())
        .filter(|v| !v.is_empty())
}

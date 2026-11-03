//! A local stand-in for OutLayer, for `make serve` and the live make targets on a local node. It runs the three
//! real jobs natively (the same crates the enclave builds), with their sandbox seeds and keys derived exactly as
//! deployed, and delivers their signed outputs through the mock contract's `submit_mock_*`, where every signature
//! check runs as on testnet. Three things differ from testnet, and every output or log says so:
//!
//! - the jobs' pinned testnet endpoints are pointed at the local node;
//! - the vendor's domain file is served from memory instead of fetched from the domain;
//! - the Sealed Table's model is `local::LocalNegotiator`, and its output carries `model.local`.
//!
//! The observer still reads mainnet (view calls only), so Atlas periods are measured from the real pool.

use crate::{Job, OBSERVER_SEED, PAYEE_SEED, SEALED_SEED};
use accord_core::limits::{Mandate, Role};
use accord_core::{Kind, Params};
use accord_jobkit::http::native::UreqHttp;
use accord_jobkit::http::{Http, Request, Response};
use accord_jobkit::rpc::{MAINNET, MAINNET_ARCHIVAL_FIRST, TESTNET, TESTNET_ARCHIVAL};
use accord_sealed_table::host::{Host, HttpResponse};
use accord_sealed_table::local::LocalNegotiator;
use accord_sealed_table::run::{negotiate_with, Secrets};
use accord_sealed_table::state::{self, ChainSource};
use accord_sealed_table::{keys, sealing};
use serde_json::{json, Value};
use std::collections::BTreeMap;
use std::time::{Duration, Instant};

/// The jobs' transport on a local node: testnet RPC to the node, the domain files from memory, the rest as is.
pub struct LocalHttp {
    rpc: String,
    files: BTreeMap<String, Vec<u8>>,
    /// The app on this machine, which serves the demo domain's list (`make demo`).
    app: String,
    inner: UreqHttp,
}

/// The demo domain on a local node: the app's own `/.well-known/accord.json` (INTERFACES.md 8).
pub const LOCAL_DEMO_DOMAIN: &str = "demo.accord.local";

impl LocalHttp {
    /// `files`: domain to the `accord.json` it serves.
    pub fn new(rpc: &str, files: BTreeMap<String, Vec<u8>>) -> Self {
        Self {
            rpc: rpc.to_string(),
            files,
            app: std::env::var("ACCORD_APP_URL").unwrap_or_else(|_| "http://127.0.0.1:3100".into()),
            inner: UreqHttp::new(),
        }
    }

    fn domain_file(&self, url: &str) -> Option<&Vec<u8>> {
        let domain = url
            .strip_prefix("https://")?
            .strip_suffix("/.well-known/accord.json")?;
        self.files.get(domain)
    }
}

impl Http for LocalHttp {
    fn send(&self, req: &Request) -> Result<Response, String> {
        if TESTNET.contains(&req.url.as_str()) || TESTNET_ARCHIVAL.contains(&req.url.as_str()) {
            let local = Request {
                url: self.rpc.clone(),
                ..req.clone()
            };
            return self.inner.send(&local);
        }
        if req.url == format!("https://{LOCAL_DEMO_DOMAIN}/.well-known/accord.json") {
            let app = Request {
                url: format!("{}/.well-known/accord.json", self.app),
                ..req.clone()
            };
            return self.inner.send(&app);
        }
        if let Some(body) = self.domain_file(&req.url) {
            return Ok(Response {
                status: 200,
                content_type: Some("application/json".into()),
                body: body.clone(),
            });
        }
        if !MAINNET.contains(&req.url.as_str())
            && !MAINNET_ARCHIVAL_FIRST.contains(&req.url.as_str())
        {
            // Only the pinned mainnet endpoints leave this machine; any other host answers as unreachable.
            return Err(format!("local node: no route to {}", req.url));
        }
        self.inner.send(req)
    }
}

/// The Sealed Table's host over [`LocalHttp`].
struct LocalHost<'a> {
    http: &'a LocalHttp,
    start: Instant,
}

impl Host for LocalHost<'_> {
    fn send(&self, req: &Request) -> Result<HttpResponse, String> {
        let r = self.http.send(req)?;
        Ok(HttpResponse {
            status: r.status,
            headers: r
                .content_type
                .map(|c| vec![("content-type".into(), c)])
                .unwrap_or_default(),
            body: r.body,
        })
    }
    fn random(&self, n: usize) -> Vec<u8> {
        use rand::RngCore;
        let mut b = vec![0u8; n];
        rand::rngs::OsRng.fill_bytes(&mut b);
        b
    }
    fn now_secs(&self) -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0)
    }
    fn millis(&self) -> u64 {
        self.start.elapsed().as_millis() as u64
    }
    fn sleep(&self, d: Duration) {
        std::thread::sleep(d)
    }
}

pub struct LocalJobs {
    http: LocalHttp,
}

impl LocalJobs {
    pub fn new(http: LocalHttp) -> Self {
        Self { http }
    }

    /// The Sealed Table's `negotiate` run, signed with its derived key.
    pub fn negotiate(&self, agreement: &str, nonce: &str) -> Value {
        let host = LocalHost {
            http: &self.http,
            start: Instant::now(),
        };
        let src = ChainSource::new(&host);
        let input = json!({"mode": "negotiate", "agreement": agreement, "request_nonce": nonce});
        let secrets = Secrets {
            seed: SEALED_SEED,
            api_key: String::new(),
        };
        // The negotiator needs both mandates; the run opens them again itself and refuses anything malformed.
        let secret = keys::mandate_secret(&SEALED_SEED);
        let opened = state::read(&host, &src, agreement, nonce)
            .ok()
            .and_then(|st| {
                let b = sealing::open(&secret, &st.buyer_commitment, Role::Buyer, &st).ok()?;
                let v = sealing::open(&secret, &st.vendor_commitment, Role::Vendor, &st).ok()?;
                Some((b.envelope.mandate, v.envelope.mandate, st.params))
            });
        let mut neg = match opened {
            Some((b, v, p)) => LocalNegotiator::new(b, v, p),
            None => LocalNegotiator::new(empty(Role::Buyer), empty(Role::Vendor), empty_params()),
        };
        negotiate_with(&host, &src, &input, &secrets, &mut neg)
    }

    /// The Payee job's `prove` run.
    pub fn prove(&self, agreement: &str, version: u32) -> Value {
        let deps = accord_payee::Deps {
            http: &self.http,
            seed: PAYEE_SEED,
            retry: Duration::from_secs(5),
            pause: Duration::from_millis(300),
        };
        accord_payee::run(
            &json!({"mode": "prove", "agreement": agreement, "version": version}),
            &deps,
        )
    }

    /// The observer's `observe` run: `not_yet` before the hidden slot time, a signed observation after it.
    pub fn observe(&self, agreement: &str, period: u32, slot: u8) -> Value {
        let deps = accord_observer::Deps {
            http: &self.http,
            seed: OBSERVER_SEED,
            retry: Duration::from_secs(5),
            pause: Duration::from_millis(300),
        };
        accord_observer::run(
            &json!({"mode": "observe", "agreement": agreement, "period": period, "slot": slot}),
            &deps,
        )
    }

    pub fn signs_as(job: Job) -> String {
        accord_jobkit::keys::pubkey_string(&job.key().verifying_key())
    }
}

fn empty(role: Role) -> Mandate {
    Mandate {
        kind: Kind::Procurement,
        role,
        shared: Value::Null,
        limits: Value::Null,
        instructions: String::new(),
    }
}

fn empty_params() -> Params {
    crate::demo_params()
}

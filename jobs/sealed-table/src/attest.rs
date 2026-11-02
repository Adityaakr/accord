//! Step 3 of the run: NEAR AI Cloud's attestation report, fetched once with a fresh nonce and verified before any
//! completion (docs.near.ai/cloud/verification/reference/quote-nonce-signer):
//!
//! - the Intel TDX quote with `dcap-qvl` (pure Rust, builds for `wasm32-wasip2`), its collateral fetched from
//!   Phala's PCCS over the job's own HTTP and checked against Intel's root CA inside `dcap-qvl`, so the PCCS is not
//!   trusted; TCB status `UpToDate` or `SWHardeningNeeded`; the debug bit off;
//! - `report_data` read from the verified quote: the signing address zero-padded to 32 bytes, then the nonce;
//! - the echoed nonce; `MRCONFIGID = 01 || sha256(app_compose) || 15 zero bytes`; the RTMR3 replay;
//! - for model candidates, the GPU evidence through NVIDIA NRAS (`x-nvidia-overall-att-result: true`), and the
//!   ECDSA public key (for end-to-end encryption) hashing to the attested address.
//!
//! The gateway part must verify; every model candidate that verifies is kept, and a response is accepted only if
//! its signer is exactly one of them. TLS binding is not checked from inside the job (the worker terminates TLS).

use crate::host::{get, post, Host, HttpResponse};
use accord_core::hash::sha256;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use dcap_qvl::quote::{Quote, Report};
use dcap_qvl::QuoteCollateralV3;
use serde_json::Value;
use sha2::{Digest, Sha384};
use sha3::Keccak256;
use std::cell::RefCell;
use std::collections::BTreeMap;

pub const NEARAI: &str = "https://cloud-api.near.ai/v1";
pub const PCCS: &str = "https://pccs.phala.network";
pub const NRAS: &str = "https://nras.attestation.nvidia.com/v3/attest/gpu";
pub const ACCEPTED_TCB: &[&str] = &["UpToDate", "SWHardeningNeeded"];
const MAX_REPORT: usize = 4 << 20;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PartResult {
    pub signing_address: String,
    pub tdx_ok: bool,
    /// `None` when the part carries no GPU evidence (the gateway).
    pub gpu_ok: Option<bool>,
    pub compose_hash: String,
    /// The 64-byte uncompressed secp256k1 key behind the address (hex, no `04`), when offered and consistent.
    pub signing_public_key: Option<String>,
    /// Why the part did not verify (stays inside the job; the output only says which part).
    pub failures: Vec<String>,
}

impl PartResult {
    pub fn verified_model(&self) -> bool {
        self.tdx_ok && self.gpu_ok == Some(true) && self.failures.is_empty()
    }
}

#[derive(Clone, Debug)]
pub struct Attestation {
    pub nonce: String,
    pub report_sha256: String,
    pub gateway: PartResult,
    pub candidates: Vec<PartResult>,
}

impl Attestation {
    /// Lowercased addresses of the model candidates that verified.
    pub fn verified_signers(&self) -> Vec<String> {
        self.candidates
            .iter()
            .filter(|c| c.verified_model())
            .map(|c| c.signing_address.to_ascii_lowercase())
            .collect()
    }
}

fn parse_maybe_string(v: &Value) -> Option<Value> {
    match v {
        Value::String(s) => serde_json::from_str(s).ok(),
        Value::Null => None,
        other => Some(other.clone()),
    }
}

fn unhex(s: &str) -> Result<Vec<u8>, String> {
    hex::decode(s.trim_start_matches("0x")).map_err(|_| "not hex".to_string())
}

/// RTMR3 from the `imr == 3` events, checking each event's recorded digest when present.
pub fn replay_rtmr3(event_log: &Value) -> Result<[u8; 48], String> {
    let events = parse_maybe_string(event_log).ok_or("no event log")?;
    let mut rtmr = [0u8; 48];
    for e in events.as_array().ok_or("event log is not a list")? {
        if e.get("imr").and_then(Value::as_u64) != Some(3) {
            continue;
        }
        let ty = e
            .get("event_type")
            .and_then(Value::as_u64)
            .ok_or("event_type")? as u32;
        let name = e.get("event").and_then(Value::as_str).unwrap_or("");
        let payload = unhex(e.get("event_payload").and_then(Value::as_str).unwrap_or(""))?;
        let mut h = Sha384::new();
        h.update(ty.to_le_bytes());
        h.update(b":");
        h.update(name.as_bytes());
        h.update(b":");
        h.update(&payload);
        let digest = h.finalize();
        if let Some(d) = e
            .get("digest")
            .and_then(Value::as_str)
            .filter(|d| !d.is_empty())
        {
            if unhex(d)? != digest.as_slice() {
                return Err(format!("event digest mismatch: {name}"));
            }
        }
        let mut h = Sha384::new();
        h.update(rtmr);
        h.update(digest);
        rtmr.copy_from_slice(&h.finalize());
    }
    Ok(rtmr)
}

/// Fetches quote collateral from the PCCS, each URL once. Every byte of it is signed by Intel and
/// checked by `dcap-qvl` against the pinned root CA, so the PCCS cannot forge it.
pub struct Collateral<'a> {
    host: &'a dyn Host,
    /// Responses by URL: the CRLs and the QE identity are shared by every FMSPC.
    cache: RefCell<BTreeMap<String, HttpResponse>>,
}

impl<'a> Collateral<'a> {
    pub fn new(host: &'a dyn Host) -> Self {
        Self {
            host,
            cache: RefCell::new(BTreeMap::new()),
        }
    }

    fn fetch(&self, url: &str) -> Result<HttpResponse, String> {
        if let Some(r) = self.cache.borrow().get(url) {
            return Ok(r.clone());
        }
        let r = self
            .host
            .send(&get(url, &[("Accept-Encoding", "identity")], 1 << 20))?;
        if r.status != 200 {
            return Err(format!("PCCS HTTP {}", r.status));
        }
        self.cache.borrow_mut().insert(url.to_string(), r.clone());
        Ok(r)
    }

    fn header(r: &HttpResponse, name: &str) -> Result<String, String> {
        let v = r
            .header(name)
            .ok_or(format!("PCCS response has no {name}"))?;
        Ok(percent_decode(v))
    }

    pub fn for_quote(&self, quote: &Quote) -> Result<QuoteCollateralV3, String> {
        let fmspc =
            hex::encode_upper(dcap_qvl::intel::quote_fmspc(quote).map_err(|e| e.to_string())?);
        let ca = dcap_qvl::intel::quote_ca(quote)
            .map_err(|e| e.to_string())?
            .as_id_str();
        let pck = self.fetch(&format!(
            "{PCCS}/sgx/certification/v4/pckcrl?ca={ca}&encoding=der"
        ))?;
        let tcb = self.fetch(&format!(
            "{PCCS}/tdx/certification/v4/tcb?fmspc={fmspc}&update=standard"
        ))?;
        let qe = self.fetch(&format!(
            "{PCCS}/tdx/certification/v4/qe/identity?update=standard"
        ))?;
        let root = self.fetch(&format!("{PCCS}/sgx/certification/v4/rootcacrl"))?;
        let tcb_json: Value =
            serde_json::from_slice(&tcb.body).map_err(|_| "TCB info is not JSON")?;
        let qe_json: Value =
            serde_json::from_slice(&qe.body).map_err(|_| "QE identity is not JSON")?;
        let sig = |v: &Value| {
            v.get("signature")
                .and_then(Value::as_str)
                .and_then(|s| hex::decode(s).ok())
                .ok_or("collateral signature is not hex".to_string())
        };
        let root_hex = std::str::from_utf8(&root.body).map_err(|_| "root CA CRL")?;
        let mut c = QuoteCollateralV3 {
            pck_crl_issuer_chain: Self::header(&pck, "SGX-PCK-CRL-Issuer-Chain")?,
            root_ca_crl: hex::decode(root_hex.trim()).map_err(|_| "root CA CRL is not hex")?,
            pck_crl: pck.body,
            tcb_info_issuer_chain: Self::header(&tcb, "SGX-TCB-Info-Issuer-Chain")
                .or_else(|_| Self::header(&tcb, "TCB-Info-Issuer-Chain"))?,
            tcb_info: tcb_json.get("tcbInfo").ok_or("no tcbInfo")?.to_string(),
            tcb_info_signature: sig(&tcb_json)?,
            qe_identity_issuer_chain: Self::header(&qe, "SGX-Enclave-Identity-Issuer-Chain")?,
            qe_identity: qe_json
                .get("enclaveIdentity")
                .ok_or("no enclaveIdentity")?
                .to_string(),
            qe_identity_signature: sig(&qe_json)?,
            pck_certificate_chain: None,
        };
        // The PCK chain travels inside NEAR AI's quotes (certification data type 5).
        let chain = quote.raw_cert_chain().map_err(|e| e.to_string())?;
        c.pck_certificate_chain = Some(
            String::from_utf8_lossy(chain)
                .trim_end_matches('\0')
                .to_string(),
        );
        Ok(c)
    }
}

fn percent_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Some(v) = std::str::from_utf8(&b[i + 1..i + 3])
                .ok()
                .and_then(|h| u8::from_str_radix(h, 16).ok())
            {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// The 48 TD measurement fields the checks need, from a quote `dcap-qvl` verified.
struct Td {
    td_attributes: [u8; 8],
    mr_config_id: [u8; 48],
    rt_mr3: [u8; 48],
    report_data: [u8; 64],
}

fn verify_quote(
    quote_hex: &str,
    coll: &Collateral,
    now: u64,
    failures: &mut Vec<String>,
) -> Option<Td> {
    let raw = match unhex(quote_hex) {
        Ok(r) => r,
        Err(_) => {
            failures.push("quote is not hex".into());
            return None;
        }
    };
    let quote = match Quote::parse(&raw) {
        Ok(q) => q,
        Err(e) => {
            failures.push(format!("quote does not parse: {e}"));
            return None;
        }
    };
    let collateral = match coll.for_quote(&quote) {
        Ok(c) => c,
        Err(e) => {
            failures.push(format!("collateral: {e}"));
            return None;
        }
    };
    let verified = match dcap_qvl::verify::verify(&raw, &collateral, now) {
        Ok(v) => v,
        Err(e) => {
            failures.push(format!("quote verification: {e:#}"));
            return None;
        }
    };
    if !ACCEPTED_TCB.contains(&verified.status.as_str()) {
        failures.push(format!("TCB status {}", verified.status));
    }
    let td = match &verified.report {
        Report::TD10(r) => r,
        Report::TD15(r) => &r.base,
        _ => {
            failures.push("not a TDX quote".into());
            return None;
        }
    };
    Some(Td {
        td_attributes: td.td_attributes,
        mr_config_id: td.mr_config_id,
        rt_mr3: td.rt_mr3,
        report_data: td.report_data,
    })
}

/// NRAS's verdict on one candidate's GPU evidence: the payload goes unchanged, after its nonce is checked.
fn nras(host: &dyn Host, payload: &Value, nonce: &str) -> Result<bool, String> {
    if payload
        .get("nonce")
        .and_then(Value::as_str)
        .map(str::to_ascii_lowercase)
        .as_deref()
        != Some(nonce)
    {
        return Err("GPU payload nonce differs".into());
    }
    let r = host.send(&post(
        NRAS,
        &[
            ("Content-Type", "application/json"),
            ("Accept", "application/json"),
        ],
        payload.to_string().into_bytes(),
        1 << 20,
    ))?;
    if r.status != 200 {
        return Err(format!("NRAS HTTP {}", r.status));
    }
    let v: Value = serde_json::from_slice(&r.body).map_err(|_| "NRAS answer is not JSON")?;
    let jwt = v
        .get(0)
        .filter(|e| e.get(0).and_then(Value::as_str) == Some("JWT"))
        .and_then(|e| e.get(1))
        .and_then(Value::as_str)
        .ok_or("NRAS answer has no JWT")?;
    let claims = jwt.split('.').nth(1).ok_or("malformed JWT")?;
    let claims: Value = serde_json::from_slice(
        &URL_SAFE_NO_PAD
            .decode(claims.trim_end_matches('='))
            .map_err(|_| "JWT payload")?,
    )
    .map_err(|_| "JWT payload is not JSON")?;
    Ok(claims.get("x-nvidia-overall-att-result") == Some(&Value::Bool(true)))
}

/// Verifies one part of the report (the gateway, or one model candidate).
pub fn verify_part(
    host: &dyn Host,
    coll: &Collateral,
    part: &Value,
    nonce: &str,
    now: u64,
    model: bool,
) -> PartResult {
    let mut failures = Vec::new();
    let addr = part
        .get("signing_address")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_ascii_lowercase();
    let mut out = PartResult {
        signing_address: addr.clone(),
        tdx_ok: false,
        gpu_ok: None,
        compose_hash: String::new(),
        signing_public_key: None,
        failures: Vec::new(),
    };
    if part.get("signing_algo").and_then(Value::as_str) != Some("ecdsa") {
        failures.push("signing_algo is not ecdsa".into());
    }
    let identity = unhex(&addr).unwrap_or_default();
    if identity.len() != 20 {
        failures.push("signing address is not 20 bytes".into());
    }
    let td = part
        .get("intel_quote")
        .and_then(Value::as_str)
        .and_then(|q| verify_quote(q, coll, now, &mut failures));
    if let Some(td) = &td {
        if td.td_attributes[0] & 1 != 0 {
            failures.push("TDX debug mode".into());
        }
        let mut expected = [0u8; 64];
        if identity.len() == 20 {
            expected[..20].copy_from_slice(&identity);
        }
        if part
            .get("tls_cert_fingerprint")
            .and_then(Value::as_str)
            .is_some()
        {
            failures.push(
                "TLS-bound report_data is not expected (requested without TLS fingerprint)".into(),
            );
        }
        expected[32..].copy_from_slice(&unhex(nonce).unwrap_or_default());
        if td.report_data != expected {
            failures.push("report_data does not bind signer and nonce".into());
        }
        if let Some(rd) = part.get("report_data").and_then(Value::as_str) {
            if unhex(rd).ok().as_deref() != Some(&td.report_data[..]) {
                failures.push("echoed report_data differs from the quote".into());
            }
        }
        let tcb = part.pointer("/info/tcb_info").and_then(parse_maybe_string);
        match tcb
            .as_ref()
            .and_then(|t| t.get("app_compose"))
            .and_then(Value::as_str)
        {
            Some(app) => {
                let h = sha256(app.as_bytes());
                out.compose_hash = hex::encode(h);
                let mut cfg = [0u8; 48];
                cfg[0] = 1;
                cfg[1..33].copy_from_slice(&h);
                if td.mr_config_id != cfg {
                    failures.push("MRCONFIGID does not match app_compose".into());
                }
            }
            None => failures.push("no app_compose".into()),
        }
        match part.get("event_log").map(replay_rtmr3) {
            Some(Ok(r)) if r == td.rt_mr3 => {}
            Some(Ok(_)) => failures.push("event log does not replay to RTMR3".into()),
            Some(Err(e)) => failures.push(e),
            None => failures.push("no event log".into()),
        }
    }
    if part
        .get("request_nonce")
        .and_then(Value::as_str)
        .map(str::to_ascii_lowercase)
        .as_deref()
        != Some(nonce)
    {
        failures.push("echoed nonce differs".into());
    }
    out.tdx_ok = td.is_some() && failures.is_empty();
    if model {
        if let Some(pk) = part.get("signing_public_key").and_then(Value::as_str) {
            let raw = unhex(pk).unwrap_or_default();
            let raw = if raw.len() == 65 {
                raw[1..].to_vec()
            } else {
                raw
            };
            if raw.len() == 64 && Keccak256::digest(&raw)[12..] == identity[..] {
                out.signing_public_key = Some(hex::encode(raw));
            }
        }
        out.gpu_ok = Some(
            match part.get("nvidia_payload").and_then(parse_maybe_string) {
                Some(p) => match nras(host, &p, nonce) {
                    Ok(ok) => ok,
                    Err(e) => {
                        failures.push(e);
                        false
                    }
                },
                None => {
                    failures.push("no GPU evidence".into());
                    false
                }
            },
        );
    }
    out.failures = failures;
    out
}

/// Fetches and verifies the report for `model` with a fresh nonce.
pub fn attest(host: &dyn Host, api_key: &str, model: &str) -> Result<Attestation, String> {
    let nonce = hex::encode(host.random(32));
    let auth = format!("Bearer {api_key}");
    let url = format!(
        "{NEARAI}/attestation/report?model={}&provider=near&signing_algo=ecdsa&include_tls_fingerprint=false&nonce={nonce}",
        url_encode(model)
    );
    let r = host.send(&get(
        &url,
        &[
            ("Authorization", &auth),
            ("Accept", "application/json"),
            ("Accept-Encoding", "identity"),
            ("x-no-aliasing", "true"),
        ],
        MAX_REPORT,
    ))?;
    if r.status != 200 {
        return Err(format!("attestation report HTTP {}", r.status));
    }
    let report: Value =
        serde_json::from_slice(&r.body).map_err(|_| "attestation report is not JSON")?;
    let now = host.now_secs();
    let coll = Collateral::new(host);
    let gateway = verify_part(
        host,
        &coll,
        report.get("gateway_attestation").unwrap_or(&Value::Null),
        &nonce,
        now,
        false,
    );
    let candidates = report
        .get("model_attestations")
        .and_then(Value::as_array)
        .map(|cs| {
            cs.iter()
                .map(|c| verify_part(host, &coll, c, &nonce, now, true))
                .collect()
        })
        .unwrap_or_default();
    Ok(Attestation {
        nonce,
        report_sha256: hex::encode(sha256(&r.body)),
        gateway,
        candidates,
    })
}

pub fn url_encode(s: &str) -> String {
    s.bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'.' | b'_' | b'~' => {
                (b as char).to_string()
            }
            _ => format!("%{b:02X}"),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn rtmr3_replay_extends_only_imr3() {
        let log = json!([{"imr": 0, "event_type": 1, "event": "x", "event_payload": "00"},
                         {"imr": 3, "event_type": 134217729, "event": "app-id", "event_payload": "abcd", "digest": ""}]);
        let r = replay_rtmr3(&log).unwrap();
        let mut h = Sha384::new();
        h.update(134217729u32.to_le_bytes());
        h.update(b":app-id:");
        h.update([0xab, 0xcd]);
        let d = h.finalize();
        let mut h = Sha384::new();
        h.update([0u8; 48]);
        h.update(d);
        assert_eq!(r[..], h.finalize()[..]);
        let bad =
            json!([{"imr": 3, "event_type": 1, "event": "x", "event_payload": "", "digest": "00"}]);
        assert!(replay_rtmr3(&bad).is_err());
    }

    #[test]
    fn percent_decoding() {
        assert_eq!(percent_decode("a%20b%0Ac"), "a b\nc");
        assert_eq!(percent_decode("100%"), "100%");
    }
}

//! NEAR AI attestation verification, offline, from a real report recorded with its Intel collateral and NVIDIA
//! verdict (`tests/live.rs record_attestation`), plus tamper cases: each check must catch its own change.
//! Also the response-signature check with a synthetic signer (no test holds NEAR AI's model key).

mod common;

use accord_sealed_table::attest;
use accord_sealed_table::host::HttpResponse;
use accord_sealed_table::nearai;
use common::*;
use k256::ecdsa::SigningKey;
use serde_json::{json, Value};
use sha3::{Digest, Keccak256};

fn recording() -> Value {
    serde_json::from_slice(&std::fs::read(fixture_path("attestation.recorded.json")).unwrap())
        .unwrap()
}

fn replay_with(edit: impl Fn(&mut Value) + 'static) -> attest::Attestation {
    let rec = recording();
    let mut host = Replay::new(&rec);
    host.edit = Box::new(move |url, body| {
        if !url.contains("/attestation/report") {
            return body;
        }
        let mut v: Value = serde_json::from_slice(&body).unwrap();
        edit(&mut v);
        serde_json::to_vec(&v).unwrap()
    });
    attest::attest(&host, "unused", rec["model"].as_str().unwrap()).unwrap()
}

#[test]
fn the_recorded_report_verifies_offline() {
    let a = replay_with(|_| {});
    assert!(a.gateway.tdx_ok, "{:?}", a.gateway.failures);
    assert_eq!(a.gateway.compose_hash.len(), 64);
    assert_eq!(a.candidates.len(), 1);
    let c = &a.candidates[0];
    assert!(c.verified_model(), "{:?}", c.failures);
    assert_eq!(c.gpu_ok, Some(true));
    assert!(
        c.signing_public_key.is_some(),
        "the E2EE key hashes to the attested address"
    );
    assert_eq!(a.verified_signers(), vec![c.signing_address.clone()]);
}

fn first_candidate(v: &mut Value) -> &mut Value {
    &mut v["model_attestations"][0]
}

#[test]
fn a_changed_compose_file_fails_mrconfigid() {
    let a = replay_with(|v| {
        let c = first_candidate(v);
        let mut tcb: Value = match &c["info"]["tcb_info"] {
            Value::String(s) => serde_json::from_str(s).unwrap(),
            other => other.clone(),
        };
        tcb["app_compose"] = json!(format!("{} ", tcb["app_compose"].as_str().unwrap()));
        c["info"]["tcb_info"] = tcb;
    });
    let c = &a.candidates[0];
    assert!(!c.verified_model());
    assert!(
        c.failures.iter().any(|f| f.contains("MRCONFIGID")),
        "{:?}",
        c.failures
    );
    assert!(a.verified_signers().is_empty());
}

#[test]
fn a_changed_event_fails_the_rtmr3_replay() {
    let a = replay_with(|v| {
        let c = first_candidate(v);
        let mut log: Value = match &c["event_log"] {
            Value::String(s) => serde_json::from_str(s).unwrap(),
            other => other.clone(),
        };
        let e = log
            .as_array_mut()
            .unwrap()
            .iter_mut()
            .find(|e| e["imr"] == 3)
            .unwrap();
        e["event_payload"] = json!("00");
        e["digest"] = json!("");
        c["event_log"] = log;
    });
    assert!(
        a.candidates[0].failures.iter().any(|f| f.contains("RTMR3")),
        "{:?}",
        a.candidates[0].failures
    );
}

#[test]
fn another_signer_is_not_bound_by_the_quote() {
    let a = replay_with(|v| {
        first_candidate(v)["signing_address"] = json!("0x00000000000000000000000000000000000000bb");
        v["gateway_attestation"]["signing_address"] =
            json!("0x00000000000000000000000000000000000000aa");
    });
    assert!(a.candidates[0]
        .failures
        .iter()
        .any(|f| f.contains("report_data")));
    assert!(!a.gateway.tdx_ok);
    assert!(a.verified_signers().is_empty());
}

#[test]
fn a_stale_report_does_not_bind_this_nonce() {
    // The report as recorded, but the job asked with another nonce: the quote binds the recorded one.
    let mut rec = recording();
    rec["log"][0]["random"] = json!("ab".repeat(32));
    let url = rec["log"][1]["http"]["url"].as_str().unwrap().to_string();
    let old = url.split("nonce=").nth(1).unwrap().to_string();
    rec["log"][1]["http"]["url"] = json!(url.replace(&old, &"ab".repeat(32)));
    let host = Replay::new(&rec);
    let a = attest::attest(&host, "unused", rec["model"].as_str().unwrap()).unwrap();
    assert!(!a.gateway.tdx_ok);
    assert!(a
        .gateway
        .failures
        .iter()
        .any(|f| f.contains("report_data") || f.contains("nonce")));
    assert!(!a.candidates[0].verified_model());
}

#[test]
fn a_debug_or_quoteless_part_is_rejected() {
    let a = replay_with(|v| {
        first_candidate(v)
            .as_object_mut()
            .unwrap()
            .remove("intel_quote");
    });
    assert!(!a.candidates[0].tdx_ok);
}

// Response signatures, with a synthetic model key standing in for NEAR AI's.

fn address(key: &SigningKey) -> String {
    let p = key.verifying_key().to_encoded_point(false);
    format!(
        "0x{}",
        hex::encode(&Keccak256::digest(&p.as_bytes()[1..])[12..])
    )
}

fn eip191(key: &SigningKey, text: &str) -> String {
    let d = Keccak256::new()
        .chain_update(format!("\x19Ethereum Signed Message:\n{}", text.len()))
        .chain_update(text.as_bytes());
    let (sig, rid) = key.sign_digest_recoverable(d).unwrap();
    let mut b = sig.to_bytes().to_vec();
    b.push(27 + rid.to_byte());
    format!("0x{}", hex::encode(b))
}

/// A NEAR AI stand-in: answers the completion, then signs `model:sha256(req):sha256(resp)` with `key`.
fn signing_host(key: SigningKey, kind: &'static str, tamper_response: bool) -> TestHost {
    let resp_body = br#"{"id":"chatcmpl-x1","choices":[{"message":{"content":"{\"ok\":true}"}}],"usage":{"prompt_tokens":9,"completion_tokens":3}}"#.to_vec();
    let state = std::cell::RefCell::new(String::new());
    TestHost::new(move |req| {
        if req.url.ends_with("/chat/completions") {
            let rh = hex::encode(accord_core::hash::sha256(req.body.as_ref().unwrap()));
            let mut served = resp_body.clone();
            let sh = hex::encode(accord_core::hash::sha256(&served));
            *state.borrow_mut() = format!("z-ai/glm-5.3-flash:{rh}:{sh}");
            if tamper_response {
                served.push(b' ');
            }
            return Ok(HttpResponse {
                status: 200,
                headers: vec![],
                body: served,
            });
        }
        let text = state.borrow().clone();
        Ok(json_response(
            200,
            &json!({"text": text, "signature": eip191(&key, &text),
            "signing_address": address(&key), "signing_algo": "ecdsa", "signature_kind": kind}),
        ))
    })
}

#[test]
fn a_signed_response_is_accepted_only_from_a_verified_signer_over_the_exact_bytes() {
    let key = SigningKey::from_bytes(&[5u8; 32].into()).unwrap();
    let addr = address(&key);
    let body = b"{\"model\":\"z-ai/glm-5.3-flash\"}".to_vec();
    let ok = nearai::complete(
        &signing_host(key.clone(), "provider_tee", false),
        "k",
        "z-ai/glm-5.3-flash",
        body.clone(),
        std::slice::from_ref(&addr),
    )
    .unwrap();
    assert_eq!(ok.record.signer, addr);
    assert_eq!(ok.content, "{\"ok\":true}");
    assert_eq!((ok.prompt_tokens, ok.completion_tokens), (9, 3));
    // Not a verified candidate.
    let e = nearai::complete(
        &signing_host(key.clone(), "provider_tee", false),
        "k",
        "z-ai/glm-5.3-flash",
        body.clone(),
        &["0x00000000000000000000000000000000000000cc".into()],
    );
    assert!(e.unwrap_err().contains("verified model key"));
    // Signed by the gateway, not the model.
    let e = nearai::complete(
        &signing_host(key.clone(), "gateway", false),
        "k",
        "z-ai/glm-5.3-flash",
        body.clone(),
        std::slice::from_ref(&addr),
    );
    assert!(e.unwrap_err().contains("kind"));
    // The bytes received differ from the bytes signed.
    let e = nearai::complete(
        &signing_host(key, "provider_tee", true),
        "k",
        "z-ai/glm-5.3-flash",
        body,
        &[addr],
    );
    assert!(e.unwrap_err().contains("exact bytes"));
}

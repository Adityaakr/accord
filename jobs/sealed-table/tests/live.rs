//! Live runs against NEAR AI Cloud, Intel's collateral (Phala PCCS) and NVIDIA NRAS. Ignored by default; run with
//! `cargo test -p accord-sealed-table --test live -- --ignored --nocapture --test-threads 1`. The API key is read
//! from `.env` and never printed or recorded (request headers are not recorded).

mod common;

use accord_sealed_table::attest;
use accord_sealed_table::run::{self, NearAi, Secrets};
use common::*;
use serde_json::{json, Value};
use std::time::Instant;

const MODEL: &str = "z-ai/glm-5.3-flash";

fn write_fixture(name: &str, v: &Value, key: &str) {
    let text = serde_json::to_string(v).unwrap();
    assert!(
        !text.contains(key),
        "the API key must never reach a fixture"
    );
    std::fs::write(fixture_path(name), text).unwrap();
    println!("recorded {}", fixture_path(name).display());
}

/// Records one attestation report with its collateral and GPU verdicts, for the offline replay tests.
#[test]
#[ignore = "live: NEAR AI Cloud, PCCS, NRAS"]
fn record_attestation() {
    let key = api_key().expect("NEARAI_API_KEY in .env");
    let native = NativeHost::new();
    let rec = Recorder::new(&native);
    let t = Instant::now();
    let a = attest::attest(&rec, &key, MODEL).expect("report fetched");
    println!(
        "attestation fetched and verified in {} ms",
        t.elapsed().as_millis()
    );
    println!(
        "gateway {} tdx_ok {} failures {:?}",
        a.gateway.signing_address, a.gateway.tdx_ok, a.gateway.failures
    );
    for c in &a.candidates {
        println!(
            "candidate {} tdx_ok {} gpu {:?} failures {:?}",
            c.signing_address, c.tdx_ok, c.gpu_ok, c.failures
        );
    }
    assert!(a.gateway.tdx_ok);
    assert!(!a.verified_signers().is_empty());
    let mut v = rec.to_json();
    v["model"] = json!(MODEL);
    write_fixture("attestation.recorded.json", &v, &key);
}

/// One live negotiation with the fixture mandates, state fed from the fixture (no chain needed), NEAR AI real.
#[test]
#[ignore = "live: NEAR AI Cloud"]
fn live_negotiation() {
    let key = api_key().expect("NEARAI_API_KEY in .env");
    let native = NativeHost::new();
    let rec = Recorder::new(&native);
    let src = FixtureSource::new("procurement");
    let secrets = Secrets {
        seed: test_seed(),
        api_key: key.clone(),
    };
    let input =
        json!({"mode": "negotiate", "agreement": sealed()["agreement"], "request_nonce": NONCE});
    let t = Instant::now();
    let mut ai = NearAi::new(&rec, &secrets.api_key);
    let out = run::negotiate_with(&rec, &src, &input, &secrets, &mut ai);
    let ms = t.elapsed().as_millis();
    println!(
        "outcome {} in {ms} ms, rounds {}",
        out["outcome"], out["rounds"]
    );
    if let Some(e) = out.get("error") {
        println!("error: {e}");
    }
    for (i, r) in ai.records.iter().enumerate() {
        println!("response {i}: {} signer {}", r.chat_id, r.signer);
    }
    println!("usage {}", out["usage"]);
    println!("output {} bytes", accord_core::hash::jcs(&out).len());
    if out["outcome"] != "infrastructure" {
        let mut v = rec.to_json();
        v["output"] = out.clone();
        write_fixture("live-run.recorded.json", &v, &key);
    }
    assert!(ms < 80_000, "the run must fit the yield: {ms} ms");
}

//! The observer against a synthetic testnet agreement and a recorded mainnet venue (`fixtures/jobs/`).
//!
//! Re-record the mainnet fixture (read-only view calls) with:
//! `cargo test -p accord-observer --test observe -- --ignored record_mainnet_fixture`

use accord_core::types::*;
use accord_jobkit::http::{Http, Request, Response};
use accord_jobkit::keys;
use accord_jobkit::rpc::network_of;
use accord_jobkit::testing::{block_reply, call_of, call_result, rpc_ok, FixtureHttp, Recorder};
use accord_observer::{run, Deps};
use serde_json::{json, Value};
use std::time::Duration;

const SEED: [u8; 32] = [0x11; 32];
const AGREEMENT: &str = "a1.accord-v1.testnet";
/// Fixed when the fixture was recorded (3 Nov 2026), about two hours before the recording.
const EXECUTING_AT: u64 = 1_793_653_200;
const PERIOD_SECS: u64 = 3600;
const SLOTS: u8 = 6;
const FIXTURE: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../fixtures/jobs/observer-mainnet.json"
);

fn venue() -> Venue {
    Venue::RheaDcl {
        network: "mainnet".into(),
        contract: "dclv2.ref-labs.near".into(),
        pool_id: "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1|wrap.near|2000"
            .into(),
    }
}

fn terms() -> Terms {
    Terms {
        v: 1,
        kind: Kind::MarketMaking,
        token: "usdc.fakes.testnet".into(),
        decimals: 6,
        total: 24_000_000,
        items: (0..4)
            .map(|p| ItemTerms {
                id: p + 1,
                amount: 6_000_000,
                due_offset_secs: PERIOD_SECS * u64::from(p + 1),
                evidence: Evidence::PeriodEligible { period: p },
            })
            .collect(),
        acceptance_window_secs: 120,
        duration_secs: PERIOD_SECS * 4,
        params_hash: [1; 32],
        doc_hash: [2; 32],
        atlas: Some(AtlasTerms {
            retainer_per_period: 6_000_000,
            periods: 4,
            period_secs: PERIOD_SECS,
            slots_per_period: SLOTS,
            pass_threshold: 4,
            venue: venue(),
            max_spread_bps: 60,
            min_depth_quote: 150_000_000,
            depth_band_bps: 200,
        }),
    }
}

fn slot_time(period: u32, slot: u8) -> u64 {
    accord_core::atlas::slot_time(
        &SEED,
        AGREEMENT,
        period,
        slot,
        EXECUTING_AT + u64::from(period) * PERIOD_SECS,
        PERIOD_SECS,
        SLOTS,
    )
}

/// A testnet where the agreement executes since `EXECUTING_AT` and the final head is at `now`.
fn testnet(http: &FixtureHttp, now: u64) {
    let terms = serde_json::to_value(terms()).unwrap();
    http.on_rpc("testnet", move |m, p| {
        if m == "block" && p["finality"] == "final" {
            return Some(block_reply(
                200_000_000,
                "TestnetHead1111111111111111111111111111111",
                now,
            ));
        }
        let (account, method, _) = call_of(m, p)?;
        assert_eq!(account, AGREEMENT);
        assert_eq!(
            p["finality"], "optimistic",
            "state is read at optimistic finality"
        );
        match method.as_str() {
            "get_terms" => Some(rpc_ok(call_result(&terms))),
            "get_agreement" => Some(rpc_ok(call_result(
                &json!({"executing_at": EXECUTING_AT, "state": "Executing"}),
            ))),
            _ => None,
        }
    });
}

fn deps(http: &dyn Http) -> Deps<'_> {
    Deps {
        http,
        seed: SEED,
        retry: Duration::ZERO,
        pause: Duration::ZERO,
    }
}

fn ask(period: u32, slot: u8) -> Value {
    json!({"mode": "observe", "agreement": AGREEMENT, "period": period, "slot": slot})
}

fn fixture() -> Value {
    serde_json::from_str(
        &std::fs::read_to_string(FIXTURE).expect("fixtures/jobs/observer-mainnet.json"),
    )
    .unwrap()
}

fn observer_key() -> keys::VerifyingKey {
    let out = run(&json!({"mode": "pubkey"}), &deps(&FixtureHttp::new()));
    keys::parse_pubkey(out["signing_pubkey"].as_str().unwrap()).unwrap()
}

#[test]
fn not_yet_before_the_slot_time_without_touching_mainnet() {
    let t = slot_time(0, 0);
    let http = FixtureHttp::new();
    testnet(&http, t - 1);
    let out = run(&ask(0, 0), &deps(&http));
    assert_eq!(out, json!({"mode": "observe", "status": "not_yet"}));
}

#[test]
fn not_yet_while_no_final_mainnet_block_reaches_the_slot_time() {
    let t = slot_time(0, 0);
    let http = FixtureHttp::new();
    testnet(&http, t + 600);
    http.on_rpc("mainnet", move |m, p| {
        (m == "block" && p["finality"] == "final")
            .then(|| block_reply(150_000_000, "MainHead", t - 1))
    });
    assert_eq!(
        run(&ask(0, 0), &deps(&http)),
        json!({"mode": "observe", "status": "not_yet"})
    );
}

fn observed_http() -> FixtureHttp {
    let http = FixtureHttp::new();
    testnet(&http, EXECUTING_AT + PERIOD_SECS);
    http.replay("mainnet", &fixture());
    http
}

#[test]
fn after_the_slot_time_every_call_gets_the_same_signed_observation() {
    let a = run(&ask(0, 0), &deps(&observed_http()));
    let b = run(&ask(0, 0), &deps(&observed_http()));
    assert_eq!(a["status"], "observed", "{a}");
    assert_eq!(a, b);
    assert_eq!(
        a,
        fixture()["expected_output"],
        "the replay reproduces the live run"
    );
    assert_eq!(a["slot_time"], slot_time(0, 0));
    assert!(a["venue_block"]["time"].as_u64().unwrap() >= slot_time(0, 0));
}

#[test]
fn the_contract_rebuilds_and_verifies_the_signed_object() {
    let out = run(&ask(0, 0), &deps(&observed_http()));
    let key = observer_key();
    assert!(keys::verify(&out, &key));
    // record_observation(observation, sig): serde Observation, then observation_payload adds mode, status, sig.
    let o: Observation =
        serde_json::from_value(out.clone()).expect("the output parses as an Observation");
    let mut rebuilt = serde_json::to_value(&o).unwrap();
    rebuilt["mode"] = json!("observe");
    rebuilt["status"] = json!("observed");
    rebuilt["sig"] = out["sig"].clone();
    assert_eq!(
        rebuilt, out,
        "no field beyond Observation + mode + status + sig"
    );
    assert!(keys::verify(&rebuilt, &key));
    assert_eq!(
        accord_core::hash::signed_bytes(&rebuilt),
        accord_core::hash::signed_bytes(&out)
    );
    // The contract's own checks on the values.
    let at = terms().atlas.unwrap();
    let (start, end) = accord_core::atlas::slot_window(EXECUTING_AT, PERIOD_SECS, SLOTS, 0);
    assert!((start..end).contains(&o.slot_time) && o.venue_block.time >= o.slot_time);
    assert!(o.venue == at.venue && o.band_bps == at.depth_band_bps && o.agreement == AGREEMENT);
}

#[test]
fn any_changed_field_breaks_the_signature() {
    let out = run(&ask(0, 0), &deps(&observed_http()));
    let key = observer_key();
    let changes: Vec<(&str, Value)> = vec![
        ("agreement", json!("a2.accord-v1.testnet")),
        ("period", json!(1)),
        ("slot", json!(1)),
        ("slot_time", json!(out["slot_time"].as_u64().unwrap() + 1)),
        ("band_bps", json!(300)),
        ("mid", json!("0.1")),
        ("spread_bps", json!(1)),
        ("depth_bid", json!("999999999999")),
        ("depth_ask", json!("999999999999")),
        ("two_sided", json!(!out["two_sided"].as_bool().unwrap())),
        ("status", json!("not_yet")),
        ("mode", json!("prove")),
    ];
    for (field, value) in changes {
        let mut v = out.clone();
        v[field] = value;
        assert!(!keys::verify(&v, &key), "{field}");
    }
    let mut v = out.clone();
    v["venue_block"]["height"] = json!(1);
    assert!(!keys::verify(&v, &key));
    let mut v = out.clone();
    v["extra"] = json!(1);
    assert!(!keys::verify(&v, &key));
    let mut v = out;
    v["sig"] = json!(
        keys::sign(
            json!({"other": 1}),
            &keys::signing_key(&SEED, keys::OBSERVER_SIGN_INFO)
        )["sig"]
    );
    assert!(!keys::verify(&v, &key));
}

#[test]
fn a_mainnet_read_failing_everywhere_is_never_signed() {
    let http = FixtureHttp::new();
    testnet(&http, EXECUTING_AT + PERIOD_SECS);
    http.on_rpc("mainnet", |m, p| {
        let (_, method, _) = call_of(m, p)?;
        (method == "quote").then(|| {
            json!({"jsonrpc": "2.0", "id": "accord",
            "error": {"name": "HANDLER_ERROR", "cause": {"name": "TIMEOUT_ERROR"}}})
        })
    });
    http.replay("mainnet", &fixture());
    let out = run(&ask(0, 0), &deps(&http));
    assert_eq!(out["status"], "error", "{out}");
    assert!(out.get("sig").is_none());
}

#[test]
fn slots_outside_the_terms_and_other_kinds_are_refused() {
    let http = FixtureHttp::new();
    testnet(&http, EXECUTING_AT + PERIOD_SECS);
    for (p, k) in [(4, 0), (0, 6)] {
        let out = run(&ask(p, k), &deps(&http));
        assert_eq!(out["status"], "error", "{out}");
    }
    let proc_http = FixtureHttp::new();
    proc_http.on_rpc("testnet", |m, p| {
        let (_, method, _) = call_of(m, p)?;
        let mut t = serde_json::to_value(terms()).unwrap();
        t["atlas"] = Value::Null;
        (method == "get_terms").then(|| rpc_ok(call_result(&t)))
    });
    let out = run(&ask(0, 0), &deps(&proc_http));
    assert_eq!(out["error"], "not a market-making agreement");
}

#[test]
fn pubkey_mode_is_deterministic_and_matches_the_observation_key() {
    let a = run(&json!({"mode": "pubkey"}), &deps(&FixtureHttp::new()));
    let b = run(&json!({"mode": "pubkey"}), &deps(&FixtureHttp::new()));
    assert_eq!(a, b);
    assert_eq!(a["job"], "observer");
    let key = keys::parse_pubkey(a["signing_pubkey"].as_str().unwrap()).unwrap();
    assert!(keys::verify(&a, &key));
    assert_eq!(
        key,
        keys::signing_key(&SEED, keys::OBSERVER_SIGN_INFO).verifying_key()
    );
}

/// Routes testnet to the synthetic agreement and mainnet to the live endpoints, recording the latter.
struct Split<'a> {
    testnet: &'a FixtureHttp,
    mainnet: &'a Recorder<'a>,
}
impl Http for Split<'_> {
    fn send(&self, req: &Request) -> Result<Response, String> {
        match network_of(&req.url) {
            Some("testnet") => self.testnet.send(req),
            _ => self.mainnet.send(req),
        }
    }
}

#[test]
#[ignore = "live mainnet view calls; run once to (re)record fixtures/jobs/observer-mainnet.json"]
fn record_mainnet_fixture() {
    let live = accord_jobkit::http::native::UreqHttp::new();
    let rec = Recorder::new(&live, "mainnet");
    let tn = FixtureHttp::new();
    testnet(&tn, EXECUTING_AT + PERIOD_SECS);
    let split = Split {
        testnet: &tn,
        mainnet: &rec,
    };
    let out = run(
        &ask(0, 0),
        &Deps {
            http: &split,
            seed: SEED,
            retry: Duration::ZERO,
            pause: Duration::from_millis(500),
        },
    );
    assert_eq!(out["status"], "observed", "{out}");
    let mut f = rec.to_fixture(
        "Recorded live from mainnet RPC (view calls only) by record_mainnet_fixture: Rhea DCL USDC/wNEAR at the first \
         final block at or after the slot time of a1.accord-v1.testnet period 0 slot 0 under the test seed.",
    );
    f["expected_output"] = out;
    std::fs::write(FIXTURE, serde_json::to_string_pretty(&f).unwrap() + "\n").unwrap();
}

//! The Payee job against a synthetic testnet agreement and factory, and fixture domain files (`fixtures/jobs/payee`).

use accord_core::types::Rating;
use accord_jobkit::http::{Http, Response};
use accord_jobkit::keys;
use accord_jobkit::rpc::{EMPTY_CODE_HASH, TESTNET_ARCHIVAL};
use accord_jobkit::testing::{block_reply, call_of, call_result, rpc_ok, FixtureHttp, Reply};
use accord_payee::{run, Deps};
use serde_json::{json, Value};
use std::time::Duration;

const SEED: [u8; 32] = [0x22; 32];
const AGREEMENT: &str = "a7.accord-v1.testnet";
const FACTORY: &str = "accord-v1.testnet";
const DOMAIN: &str = "halcyon.example.com";
const RECIPIENT: &str = "halcyon-mm.testnet";
const AUTHORITY: &str = "halcyon-auth.testnet";
const HEAD: u64 = 230_000_000;
/// Testnet in this fixture makes exactly one block per second, ending at the head.
const HEAD_TIME: u64 = 1_793_660_000;
const CONTRACT_HASH: &str = "8xJmZ5Lq4vAfR3D5d9k8Jw2vXyQ3HnB7fWcTgS1uP2aE";
const OLD_HASH: &str = "3VbXk2hYwJ7rFq8gLp1eN5sT9mC4dA6zKuR2iH8oW1yQ";

fn fixture(name: &str) -> Vec<u8> {
    std::fs::read(format!(
        "{}/../../fixtures/jobs/payee/{name}",
        env!("CARGO_MANIFEST_DIR")
    ))
    .unwrap()
}

#[derive(Clone)]
struct World {
    file: Option<Response>,
    file_fail: Option<String>,
    account: String,
    /// `None`: the account does not exist.
    code_now: Option<String>,
    /// The code hash 30 days back; `None`: the account did not exist then.
    code_then: Option<String>,
    archival_down: bool,
    canaries: Vec<String>,
    reports: usize,
    blocked: Option<String>,
    payments: u64,
    recipients: usize,
    factory_down: bool,
}

impl Default for World {
    fn default() -> Self {
        Self {
            file: Some(json_file(fixture("accord.simple.json"))),
            file_fail: None,
            account: RECIPIENT.into(),
            code_now: Some(EMPTY_CODE_HASH.into()),
            code_then: Some(EMPTY_CODE_HASH.into()),
            archival_down: false,
            canaries: vec!["halcyon-treasury.testnet".into()],
            reports: 0,
            blocked: None,
            payments: 0,
            recipients: 1,
            factory_down: false,
        }
    }
}

fn json_file(body: Vec<u8>) -> Response {
    Response {
        status: 200,
        content_type: Some("application/json; charset=utf-8".into()),
        body,
    }
}

fn unknown_account() -> Value {
    json!({"jsonrpc": "2.0", "id": "accord", "error": {"name": "HANDLER_ERROR", "cause": {"name": "UNKNOWN_ACCOUNT"}}})
}

fn http(w: &World) -> FixtureHttp {
    let h = FixtureHttp::new();
    let url = format!("https://{DOMAIN}/.well-known/accord.json");
    let (file, fail) = (w.file.clone(), w.file_fail.clone());
    h.on_url(&url, move |req| {
        assert_eq!(req.method, accord_jobkit::http::Method::Get);
        assert_eq!(req.max_bytes, 64 * 1024);
        match (&fail, &file) {
            (Some(e), _) => Reply::Fail(e.clone()),
            (None, Some(r)) => Reply::Raw(r.clone()),
            (None, None) => Reply::Raw(Response {
                status: 404,
                content_type: None,
                body: b"not found".to_vec(),
            }),
        }
    });
    if w.archival_down {
        h.on_url(TESTNET_ARCHIVAL[0], |_| Reply::Fail("rate limited".into()));
    }
    let w = w.clone();
    h.on_rpc("testnet", move |m, p| {
        if m == "block" {
            if p["finality"] == "final" {
                return Some(block_reply(HEAD, "Head", HEAD_TIME));
            }
            let h = p["block_id"].as_u64()?;
            return Some(block_reply(h, &format!("B{h}"), HEAD_TIME - (HEAD - h)));
        }
        if m == "query" && p["request_type"] == "view_account" {
            assert_eq!(p["account_id"], w.account.as_str());
            let code = if p.get("block_id").is_some() {
                assert_eq!(p["block_id"], HEAD - 30 * 86_400, "30 days back, calibrated");
                &w.code_then
            } else {
                assert_eq!(p["finality"], "final");
                &w.code_now
            };
            return Some(match code {
                Some(c) => rpc_ok(json!({"amount": "1", "locked": "0", "code_hash": c, "storage_usage": 182})),
                None => unknown_account(),
            });
        }
        let (account, method, args) = call_of(m, p)?;
        if account == AGREEMENT {
            assert_eq!(p["finality"], "optimistic");
            return Some(rpc_ok(call_result(&match method.as_str() {
                "get_agreement" => json!({"vendor_authority": AUTHORITY, "buyer": "northwind-demo.testnet",
                                          "factory": FACTORY, "canaries": w.canaries, "state": "Executing"}),
                "get_recipients" => Value::Array(
                    (1..=w.recipients)
                        .map(|v| json!({"version": v, "account": w.account, "domain": DOMAIN, "status": "Pending"}))
                        .collect(),
                ),
                _ => return None,
            })));
        }
        if account == FACTORY {
            if w.factory_down {
                return Some(json!({"jsonrpc": "2.0", "id": "accord", "error": {"name": "HANDLER_ERROR", "cause": {"name": "TIMEOUT_ERROR"}}}));
            }
            assert_eq!(args["account"], w.account.as_str());
            return Some(rpc_ok(call_result(&match method.as_str() {
                "recipient_stats" => {
                    assert_eq!(args["buyer"], "northwind-demo.testnet");
                    json!({"all": {"payments": w.payments + 3, "total": "1"}, "buyer": {"payments": w.payments, "total": "0"}})
                }
                "reports" => Value::Array(
                    (0..w.reports).map(|i| json!({"agreement": "a3.accord-v1.testnet", "seq": i, "at": 1})).collect(),
                ),
                "blocked" => json!(w.blocked),
                _ => return None,
            })));
        }
        None
    });
    h
}

fn deps(http: &dyn Http) -> Deps<'_> {
    Deps {
        http,
        seed: SEED,
        retry: Duration::ZERO,
        pause: Duration::ZERO,
    }
}

fn prove(w: &World) -> Value {
    run(
        &json!({"mode": "prove", "agreement": AGREEMENT, "version": 1}),
        &deps(&http(w)),
    )
}

fn key() -> keys::VerifyingKey {
    let out = run(&json!({"mode": "pubkey"}), &deps(&FixtureHttp::new()));
    assert_eq!(out["job"], "payee");
    keys::parse_pubkey(out["signing_pubkey"].as_str().unwrap()).unwrap()
}

/// `check_payee` in contracts/agreement/src/recipients.rs, off chain.
fn contract_accepts(o: &Value) -> Result<(Rating, Vec<String>), &'static str> {
    if !keys::verify(o, &key()) {
        return Err("bad signature");
    }
    if o["mode"] != "prove" || o["agreement"] != AGREEMENT || o["version"].as_u64() != Some(1) {
        return Err("wrong agreement or version");
    }
    if o["domain"] != DOMAIN || o["account"] != RECIPIENT || o["authority"] != AUTHORITY {
        return Err("values differ from state");
    }
    for c in ["file", "recipient_listed", "authority_matches"] {
        if o["checks"][c] != "ok" {
            return Err("domain file check failed");
        }
    }
    let rating: Rating = serde_json::from_value(o["rating"].clone()).map_err(|_| "no rating")?;
    let reasons = o["reasons"]
        .as_array()
        .unwrap()
        .iter()
        .map(|r| r.as_str().unwrap().to_string())
        .collect();
    Ok((rating, reasons))
}

#[test]
fn a_clean_simple_file_proves_and_allows() {
    let out = prove(&World::default());
    assert_eq!(contract_accepts(&out), Ok((Rating::Allow, vec![])));
    let expected_sha =
        accord_core::hash::to_hex(&accord_core::hash::sha256(&fixture("accord.simple.json")));
    let mut unsigned = out.clone();
    unsigned.as_object_mut().unwrap().remove("sig");
    assert_eq!(
        unsigned,
        json!({"mode": "prove", "agreement": AGREEMENT, "version": 1, "domain": DOMAIN,
               "url": format!("https://{DOMAIN}/.well-known/accord.json"), "file_sha256": expected_sha,
               "account": RECIPIENT, "authority": AUTHORITY, "fetched_at": HEAD_TIME, "block": HEAD,
               "form": "simple", "demo_domain": false,
               "checks": {"file": "ok", "recipient_listed": "ok", "authority_matches": "ok"},
               "signals": {"exists": true, "is_contract": false, "code_changed_30d": false, "age_days": null,
                           "tx_30d": null, "prior_payments": 0, "reports": 0, "blocked": false, "canary": false},
               "rating": "allow", "reasons": []})
    );
    assert_eq!(
        out,
        prove(&World::default()),
        "deterministic for the same state"
    );
}

#[test]
fn any_changed_field_breaks_the_signature() {
    let out = prove(&World::default());
    for (path, v) in [
        ("/account", json!("halcyon-markets.testnet")),
        ("/authority", json!("x.testnet")),
        ("/rating", json!("block")),
        ("/version", json!(2)),
        ("/checks/recipient_listed", json!("account not listed")),
        ("/signals/canary", json!(true)),
        ("/demo_domain", json!(true)),
        ("/reasons", json!(["x"])),
        ("/fetched_at", json!(1)),
    ] {
        let mut t = out.clone();
        *t.pointer_mut(path).unwrap() = v;
        assert_eq!(contract_accepts(&t), Err("bad signature"), "{path}");
    }
}

#[test]
fn the_list_form_needs_the_recipient_and_authority_in_one_entry() {
    let list = World {
        file: Some(json_file(fixture("accord.list.json"))),
        ..World::default()
    };
    let out = prove(&list);
    assert_eq!(out["form"], "list");
    assert_eq!(contract_accepts(&out), Ok((Rating::Allow, vec![])));

    // halcyon-try-mm.testnet is listed, but paired with halcyon-try-auth.testnet, not this agreement's authority.
    let crossed = World {
        account: "halcyon-try-mm.testnet".into(),
        ..list
    };
    let out = prove(&crossed);
    assert_eq!(
        out["checks"],
        json!({"file": "ok", "recipient_listed": "ok", "authority_matches": "authority differs"})
    );
    assert!(keys::verify(&out, &key()), "failed checks are still signed");
}

#[test]
fn an_unlisted_account_fails_the_proof() {
    let out = prove(&World {
        account: "halcyon-markets.testnet".into(),
        ..World::default()
    });
    assert_eq!(out["checks"]["recipient_listed"], "account not listed");
    assert_eq!(out["checks"]["authority_matches"], "account not listed");
    assert!(keys::verify(&out, &key()));
}

#[test]
fn bad_files_fail_with_a_short_reason() {
    let simple = fixture("accord.simple.json");
    let body = |s: &str| Some(json_file(s.as_bytes().to_vec()));
    let cases: Vec<(World, &str)> = vec![
        (
            World {
                file: None,
                ..World::default()
            },
            "HTTP status 404",
        ),
        (
            World {
                file_fail: Some("tls: certificate invalid".into()),
                ..World::default()
            },
            "fetch failed: tls: certificate invalid",
        ),
        (
            World {
                file_fail: Some("body exceeds 65536 bytes".into()),
                ..World::default()
            },
            "larger than 64 KB",
        ),
        (
            World {
                file: Some(Response {
                    status: 200,
                    content_type: Some("text/html".into()),
                    body: simple.clone(),
                }),
                ..World::default()
            },
            "not served as application/json",
        ),
        (
            World {
                file: body("{not json"),
                ..World::default()
            },
            "not valid JSON",
        ),
        (
            World {
                file: body(
                    r#"{"accord":"2","network":"testnet","recipients":["halcyon-mm.testnet"],"settlement_authority":"halcyon-auth.testnet"}"#,
                ),
                ..World::default()
            },
            "accord is not \"1\"",
        ),
        (
            World {
                file: body(
                    r#"{"accord":"1","network":"mainnet","recipients":["halcyon-mm.testnet"],"settlement_authority":"halcyon-auth.testnet"}"#,
                ),
                ..World::default()
            },
            "network is not testnet",
        ),
        (
            World {
                file: body(
                    r#"{"accord":"1","network":"testnet","recipients":[],"settlement_authority":"halcyon-auth.testnet"}"#,
                ),
                ..World::default()
            },
            "recipients must hold 1 to 8 accounts",
        ),
        (
            World {
                file: body(
                    r#"{"accord":"1","network":"testnet","recipients":["Halcyon"],"settlement_authority":"halcyon-auth.testnet"}"#,
                ),
                ..World::default()
            },
            "a recipient is not an account id",
        ),
        (
            World {
                file: body(
                    r#"{"accord":"1","network":"testnet","recipients":["halcyon-mm.testnet"]}"#,
                ),
                ..World::default()
            },
            "settlement_authority is not an account id",
        ),
        (
            World {
                file: body(
                    r#"{"accord":"1","network":"testnet","entries":[{"recipient":"halcyon-mm.testnet"}]}"#,
                ),
                ..World::default()
            },
            "settlement_authority is not an account id",
        ),
        (
            World {
                file: body(r#"{"accord":"1","network":"testnet"}"#),
                ..World::default()
            },
            "neither recipients nor entries",
        ),
    ];
    for (w, reason) in cases {
        let out = prove(&w);
        assert_eq!(out["checks"]["file"], reason);
        assert_eq!(out["checks"]["recipient_listed"], "no valid file");
        assert_eq!(out["form"], Value::Null);
        assert_eq!(
            contract_accepts(&out),
            Err("domain file check failed"),
            "{reason}"
        );
    }
    let big_simple = format!(
        r#"{{"accord":"1","network":"testnet","recipients":["halcyon-mm.testnet"],"settlement_authority":"halcyon-auth.testnet","contact":"{}"}}"#,
        "x".repeat(9000)
    );
    let out = prove(&World {
        file: body(&big_simple),
        ..World::default()
    });
    assert_eq!(out["checks"]["file"], "simple form larger than 8 KB");
}

#[test]
fn ratings_follow_the_signals() {
    let rating = |w: World| {
        let out = prove(&w);
        assert!(keys::verify(&out, &key()));
        (
            out["rating"].as_str().unwrap().to_string(),
            out["reasons"].clone(),
            out["signals"].clone(),
        )
    };
    let (r, why, s) = rating(World {
        code_now: None,
        code_then: None,
        ..World::default()
    });
    assert_eq!(
        (r.as_str(), why),
        ("block", json!(["account does not exist"]))
    );
    assert_eq!(
        (s["exists"].clone(), s["code_changed_30d"].clone()),
        (json!(false), Value::Null)
    );

    let (r, why, _) = rating(World {
        canaries: vec![RECIPIENT.into()],
        ..World::default()
    });
    assert_eq!(
        (r.as_str(), why),
        ("block", json!(["account is a canary of this agreement"]))
    );

    let (r, why, s) = rating(World {
        blocked: Some("https://example.com/evidence/1".into()),
        ..World::default()
    });
    assert_eq!(
        (r.as_str(), why),
        (
            "block",
            json!(["account is on the factory blocklist: https://example.com/evidence/1"])
        )
    );
    assert_eq!(s["blocked"], true);

    let (r, why, s) = rating(World {
        code_now: Some(CONTRACT_HASH.into()),
        code_then: Some(CONTRACT_HASH.into()),
        ..World::default()
    });
    assert_eq!(
        (r.as_str(), why),
        ("warn", json!(["receiver is a contract"]))
    );
    assert_eq!(
        (s["is_contract"].clone(), s["code_changed_30d"].clone()),
        (json!(true), json!(false))
    );

    let (r, why, s) = rating(World {
        code_now: Some(CONTRACT_HASH.into()),
        code_then: Some(OLD_HASH.into()),
        ..World::default()
    });
    assert_eq!(r, "warn");
    assert_eq!(
        why,
        json!([
            "receiver is a contract",
            format!("code changed in the last 30 days: {OLD_HASH} to {CONTRACT_HASH}")
        ])
    );
    assert_eq!(s["code_changed_30d"], true);

    // An account created inside the 30 days with code now: its code changed from nothing.
    let (r, _, s) = rating(World {
        code_now: Some(CONTRACT_HASH.into()),
        code_then: None,
        ..World::default()
    });
    assert_eq!(
        (r.as_str(), s["code_changed_30d"].clone()),
        ("warn", json!(true))
    );

    let (r, why, s) = rating(World {
        reports: 2,
        ..World::default()
    });
    assert_eq!(
        (r.as_str(), why),
        ("warn", json!(["2 shared report(s) from refused payments"]))
    );
    assert_eq!(s["reports"], 2);

    let (r, why, s) = rating(World {
        payments: 4,
        ..World::default()
    });
    assert_eq!(
        (r.as_str(), why),
        ("allow", json!([])),
        "prior payments are shown, not warned"
    );
    assert_eq!(s["prior_payments"], 4);

    let (r, _, s) = rating(World {
        archival_down: true,
        ..World::default()
    });
    assert_eq!(
        (r.as_str(), s["code_changed_30d"].clone()),
        ("allow", Value::Null),
        "unavailable, never guessed"
    );

    // Block outranks warn, and every cause is listed.
    let (r, why, _) = rating(World {
        canaries: vec![RECIPIENT.into()],
        reports: 1,
        ..World::default()
    });
    assert_eq!(r, "block");
    assert_eq!(why.as_array().unwrap().len(), 2);
}

#[test]
fn reads_it_cannot_complete_are_unsigned_errors() {
    let out = run(
        &json!({"mode": "prove", "agreement": AGREEMENT, "version": 2}),
        &deps(&http(&World::default())),
    );
    assert_eq!(
        out,
        json!({"mode": "prove", "status": "error", "error": "recipient version 2 not found"})
    );
    let out = prove(&World {
        factory_down: true,
        ..World::default()
    });
    assert_eq!(out["status"], "error");
    assert!(out.get("sig").is_none());
    for bad in [
        json!({"mode": "prove", "agreement": AGREEMENT, "version": 0}),
        json!({"mode": "prove", "agreement": "A", "version": 1}),
        json!({"mode": "nope"}),
    ] {
        let out = run(&bad, &deps(&http(&World::default())));
        assert_eq!(out["status"], "error", "{bad}");
    }
}

#[test]
fn pubkey_mode_is_deterministic_and_differs_from_the_observer_key() {
    let a = run(&json!({"mode": "pubkey"}), &deps(&FixtureHttp::new()));
    assert_eq!(
        a,
        run(&json!({"mode": "pubkey"}), &deps(&FixtureHttp::new()))
    );
    assert!(keys::verify(&a, &key()));
    assert_ne!(
        keys::signing_key(&SEED, keys::PAYEE_SIGN_INFO).verifying_key(),
        keys::signing_key(&SEED, keys::OBSERVER_SIGN_INFO).verifying_key()
    );
}

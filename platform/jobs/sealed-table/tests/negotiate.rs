//! The Sealed Table's native tests: TS-sealed mandates opened in Rust, commitments, `BAD_INPUT`, the protocol
//! with a scripted model side, the leak filter on what the other side sees, `LIMIT_CHECK`, the signed output
//! checked by the contract's own rules, and the `pubkey` output checked by the factory's.

mod common;

use accord_core::hash::{jcs_sha256, to_hex};
use accord_core::limits::Role;
use accord_core::terms::structural;
use accord_core::{Kind, Params, Terms};
use accord_jobkit::keys::{parse_pubkey, verify};
use accord_sealed_table::protocol::MsgTerms;
use accord_sealed_table::run::{self, Secrets};
use accord_sealed_table::state::{self, StateSource};
use accord_sealed_table::{keys, sealing};
use base64::{engine::general_purpose::STANDARD, Engine};
use common::*;
use serde_json::{json, Value};

fn secrets() -> Secrets {
    Secrets {
        seed: test_seed(),
        api_key: "test-key-not-used".into(),
    }
}

fn input() -> Value {
    json!({"mode": "negotiate", "agreement": sealed()["agreement"], "request_nonce": NONCE})
}

/// `check_sealed` in `contracts/agreement/src/negotiation.rs`, off chain.
fn contract_accepts(o: &Value, src: &FixtureSource) -> Result<Option<Terms>, &'static str> {
    let key = keys::signing_key(&test_seed()).verifying_key();
    if !verify(o, &key) {
        return Err("bad signature");
    }
    let a = src.agreement.borrow().clone();
    let c = src.commitments.borrow().clone();
    if o["mode"] != "negotiate" || o["agreement"] != a["account"] || o["request_nonce"] != NONCE {
        return Err("head");
    }
    if o["release"].as_u64() != a["release"].as_u64() {
        return Err("release");
    }
    if o["buyer_commitment"] != c["buyer"]["commitment"]
        || o["vendor_commitment"] != c["vendor"]["commitment"]
    {
        return Err("commitments differ");
    }
    match o["outcome"].as_str() {
        Some("terms") => {
            let terms: Terms =
                serde_json::from_value(o["terms"].clone()).map_err(|_| "terms do not parse")?;
            let params: Params = serde_json::from_value(params()).unwrap();
            if terms.params_hash != jcs_sha256(&params) {
                return Err("params differ");
            }
            structural(&terms, TOKEN, &params)?;
            if o["terms_hash"].as_str() != Some(to_hex(&jcs_sha256(&terms)).as_str()) {
                return Err("terms hash differs");
            }
            Ok(Some(terms))
        }
        Some("no_deal") => match o["no_deal_reason"].as_str() {
            Some("WALK_AWAY" | "LIMIT_CHECK" | "BAD_INPUT") => Ok(None),
            _ => Err("unknown no-deal reason"),
        },
        _ => Err("infrastructure"),
    }
}

fn proc_terms(total: u64, amounts: [u64; 3]) -> Value {
    json!({"total": total.to_string(), "duration_secs": 86400, "acceptance_window_secs": 120, "atlas": null,
           "items": [
              {"name": "Data pipeline", "amount": amounts[0].to_string(), "due_offset_secs": 1800},
              {"name": "Dashboard", "amount": amounts[1].to_string(), "due_offset_secs": 3600},
              {"name": "Handover", "amount": amounts[2].to_string(), "due_offset_secs": 5400}]})
}

fn msg(kind: &str, terms: Value, reasons: &str) -> Value {
    json!({"type": kind, "terms": terms, "reasons": reasons})
}

#[test]
fn ts_sealed_mandates_open_in_rust_with_matching_commitments() {
    let f = sealed();
    let secret = keys::mandate_secret(&test_seed());
    // The Rust derivation of the mandate key equals the one the TypeScript fixture script computed.
    assert_eq!(
        keys::mandate_pubkey(&secret),
        f["mandate_pubkey"].as_str().unwrap()
    );
    let src = FixtureSource::new("procurement");
    let st = state::parse(
        f["agreement"].as_str().unwrap(),
        &src.agreement("").unwrap(),
        &src.commitments("").unwrap(),
        &src.ft_metadata("").unwrap(),
    )
    .unwrap();
    let b = sealing::open(&secret, &st.buyer_commitment, Role::Buyer, &st)
        .expect("eciesjs ciphertext opens");
    let v = sealing::open(&secret, &st.vendor_commitment, Role::Vendor, &st)
        .expect("eciesjs ciphertext opens");
    assert_eq!(b.envelope.mandate.limits["max_total"], "40000000");
    assert_eq!(v.envelope.mandate.limits["min_total"], "30000000");
    assert_eq!(b.envelope.party, "northwind-demo.testnet");
    // Commitment = sha256 of the decrypted bytes: one changed byte is refused.
    let mut wrong = st.buyer_commitment.clone();
    wrong.commitment.replace_range(
        0..1,
        if wrong.commitment.starts_with('0') {
            "1"
        } else {
            "0"
        },
    );
    assert_eq!(
        sealing::open(&secret, &wrong, Role::Buyer, &st),
        Err(sealing::BadInput::Commitment)
    );
    // The wrong role, release or key.
    assert_eq!(
        sealing::open(&secret, &st.buyer_commitment, Role::Vendor, &st),
        Err(sealing::BadInput::Role)
    );
    let mut later = st.clone();
    later.release = 4;
    assert_eq!(
        sealing::open(&secret, &st.buyer_commitment, Role::Buyer, &later),
        Err(sealing::BadInput::Release)
    );
    assert_eq!(
        sealing::open(
            &keys::mandate_secret(&[9; 32]),
            &st.buyer_commitment,
            Role::Buyer,
            &st
        ),
        Err(sealing::BadInput::Decrypt)
    );
}

#[test]
fn a_ciphertext_copied_from_another_agreement_is_bad_input() {
    let src = FixtureSource::new("procurement");
    src.set_commitment("buyer", &sealed()["copied_from_a8"]);
    let mut ai = ScriptedAi::new(&[]);
    let out = run::negotiate_with(&TestHost::offline(), &src, &input(), &secrets(), &mut ai);
    assert_eq!(out["outcome"], "no_deal");
    assert_eq!(out["no_deal_reason"], "BAD_INPUT");
    assert!(!ai.attested.get(), "no model is called for a bad envelope");
    assert_eq!(contract_accepts(&out, &src), Ok(None));
    // A party's commitment that does not match its ciphertext is also BAD_INPUT.
    let src = FixtureSource::new("procurement");
    src.commitments.borrow_mut()["vendor"]["commitment"] = json!("00".repeat(32));
    let out = run::negotiate_with(
        &TestHost::offline(),
        &src,
        &input(),
        &secrets(),
        &mut ScriptedAi::new(&[]),
    );
    assert_eq!(out["no_deal_reason"], "BAD_INPUT");
}

#[test]
fn procurement_counter_then_accept_produces_terms_the_contract_accepts() {
    let src = FixtureSource::new("procurement");
    let mut ai = ScriptedAi::new(&[
        msg(
            "QUOTE",
            proc_terms(38_000_000, [14_000_000, 12_000_000, 12_000_000]),
            "Three milestones. Our floor is 30 USDC (30,000,000 base units), so 38 is fair.",
        ),
        msg(
            "COUNTER",
            proc_terms(34_000_000, [12_000_000, 11_000_000, 11_000_000]),
            "We planned around 32.00 and can stretch a little for the dates.",
        ),
        msg("ACCEPT", Value::Null, "Agreed."),
    ]);
    let out = run::negotiate_with(&TestHost::offline(), &src, &input(), &secrets(), &mut ai);
    let terms = contract_accepts(&out, &src)
        .expect("the contract's rules pass")
        .expect("terms");
    assert_eq!(out["outcome"], "terms");
    assert_eq!(out["rounds"], 3);
    assert_eq!(terms.total, 34_000_000);
    assert_eq!(terms.kind, Kind::Procurement);
    assert_eq!(terms.token, TOKEN);
    assert_eq!(terms.decimals, 6);
    assert_eq!(
        terms.items.iter().map(|i| i.id).collect::<Vec<_>>(),
        vec![1, 2, 3]
    );

    // What each side was shown: the vendor's floor never reaches the buyer, the buyer's target never the vendor.
    let seen = ai.seen.borrow();
    let buyer_prompt = &seen.iter().find(|(s, _)| *s == Role::Buyer).unwrap().1[0].content;
    assert!(!buyer_prompt.contains("30 USDC") && !buyer_prompt.contains("30,000,000"));
    assert!(buyer_prompt.contains("Our floor is [removed] USDC ([removed] base units)"));
    assert!(
        !buyer_prompt.contains("30000000"),
        "the vendor's limits are not in the buyer's prompt"
    );
    let vendor_second = &seen
        .iter()
        .filter(|(s, _)| *s == Role::Vendor)
        .nth(1)
        .unwrap()
        .1[0]
        .content;
    assert!(vendor_second.contains("We planned around [removed] and can stretch"));
    assert!(!vendor_second.contains("40000000") && !vendor_second.contains("32000000"));
    assert!(
        buyer_prompt.starts_with("Session "),
        "the session salt opens the system prompt"
    );

    // Both documents decrypt with the parties' document keys and hash to the terms' doc_hash.
    let f = sealed();
    for role in ["buyer", "vendor"] {
        let ct = STANDARD
            .decode(out["documents"][role].as_str().unwrap())
            .unwrap();
        let secret = hex::decode(f["doc_secrets"][role].as_str().unwrap()).unwrap();
        let plain = ecies::decrypt(&secret, &ct).unwrap();
        assert_eq!(accord_core::hash::sha256(&plain), terms.doc_hash);
        let doc: Value = serde_json::from_slice(&plain).unwrap();
        assert_eq!(doc["items"][1]["name"], "Dashboard");
        assert!(doc["items"][1]["deliverable"]
            .as_str()
            .unwrap()
            .contains("Spread, depth"));
        assert!(
            doc.to_string().find("40000000").is_none(),
            "no private limit in the document"
        );
    }
    // For checking the Rust ciphertext with eciesjs (scripts/probe-ai), printed with --nocapture.
    println!(
        "buyer document: {}",
        out["documents"]["buyer"].as_str().unwrap()
    );
    let size = accord_core::hash::jcs(&out).len();
    println!("procurement output: {size} bytes (3 synthetic response records)");
    for (k, v) in out.as_object().unwrap() {
        println!("  {k}: {}", accord_core::hash::jcs(v).len());
    }
}

#[test]
fn market_making_derives_one_item_per_period_from_state_and_the_message() {
    let src = FixtureSource::new("market_making");
    let quote = json!({"total": "24000000", "duration_secs": 1440, "acceptance_window_secs": 120, "items": [],
        "atlas": {"retainer_per_period": "6000000", "periods": 4, "period_secs": 360, "slots_per_period": 6,
                  "pass_threshold": 4, "max_spread_bps": 60, "min_depth_quote": "150000000", "depth_band_bps": 200}});
    let mut ai = ScriptedAi::new(&[
        msg("QUOTE", quote, "Four periods."),
        msg("ACCEPT", Value::Null, "Fine."),
    ]);
    let out = run::negotiate_with(&TestHost::offline(), &src, &input(), &secrets(), &mut ai);
    let terms = contract_accepts(&out, &src).unwrap().unwrap();
    assert_eq!(terms.items.len(), 4);
    assert_eq!(terms.items[3].due_offset_secs, 1440);
    let atlas = terms.atlas.unwrap();
    assert_eq!(atlas.pass_threshold, 4);
    let accord_core::Venue::RheaDcl { contract, .. } = atlas.venue;
    assert_eq!(contract, "dclv2.ref-labs.near");
}

#[test]
fn a_proposal_outside_the_senders_limits_is_retried_once_then_that_side_walks_away() {
    let src = FixtureSource::new("procurement");
    let below_floor = proc_terms(27_000_000, [9_000_000, 9_000_000, 9_000_000]);
    let mut ai = ScriptedAi::new(&[
        msg("QUOTE", below_floor.clone(), "Cheap."),
        msg("QUOTE", below_floor, "Still cheap."),
    ]);
    let out = run::negotiate_with(&TestHost::offline(), &src, &input(), &secrets(), &mut ai);
    assert_eq!(out["no_deal_reason"], "WALK_AWAY");
    assert_eq!(out["rounds"], 1);
    let seen = ai.seen.borrow();
    assert_eq!(seen.len(), 2);
    assert!(seen[1]
        .1
        .last()
        .unwrap()
        .content
        .contains("was not delivered"));
    assert_eq!(contract_accepts(&out, &src), Ok(None));
}

#[test]
fn an_accept_outside_the_accepting_sides_limits_is_a_walk_away() {
    let src = FixtureSource::new("procurement");
    let mut ai = ScriptedAi::new(&[
        msg(
            "QUOTE",
            proc_terms(42_000_000, [14_000_000, 14_000_000, 14_000_000]),
            "Premium.",
        ),
        msg("ACCEPT", Value::Null, "Sure."),
    ]);
    let out = run::negotiate_with(&TestHost::offline(), &src, &input(), &secrets(), &mut ai);
    assert_eq!(out["outcome"], "no_deal");
    assert_eq!(out["no_deal_reason"], "WALK_AWAY");
}

#[test]
fn a_failed_final_limit_check_says_only_limit_check() {
    let src = FixtureSource::new("procurement");
    let f = sealed();
    let st = state::parse(
        f["agreement"].as_str().unwrap(),
        &src.agreement("").unwrap(),
        &src.commitments("").unwrap(),
        &src.ft_metadata("").unwrap(),
    )
    .unwrap();
    let secret = keys::mandate_secret(&test_seed());
    let b = sealing::open(&secret, &st.buyer_commitment, Role::Buyer, &st).unwrap();
    let v = sealing::open(&secret, &st.vendor_commitment, Role::Vendor, &st).unwrap();
    // Below the vendor's floor: no side and no limit is named anywhere in the output.
    let accepted: MsgTerms =
        serde_json::from_value(proc_terms(29_000_000, [10_000_000, 10_000_000, 9_000_000]))
            .unwrap();
    let out = run::conclude_for_test(&st, &accepted, &b, &v);
    assert_eq!(out["outcome"], "no_deal");
    assert_eq!(out["no_deal_reason"], "LIMIT_CHECK");
    let text = out.to_string();
    for leak in [
        "min_total",
        "30000000",
        "vendor",
        "buyer",
        "floor",
        "max_total",
    ] {
        assert!(!text.contains(leak), "{leak} in {text}");
    }
    // Inside both: terms.
    let ok: MsgTerms = serde_json::from_value(proc_terms(36_000_000, [12_000_000; 3])).unwrap();
    assert_eq!(run::conclude_for_test(&st, &ok, &b, &v)["outcome"], "terms");
}

#[test]
fn infrastructure_failures_are_signed_and_retryable() {
    let src = FixtureSource::new("procurement");
    let mut ai = ScriptedAi::new(&[]);
    ai.attest_result = Err("attestation report HTTP 503".into());
    let out = run::negotiate_with(&TestHost::offline(), &src, &input(), &secrets(), &mut ai);
    assert_eq!(out["outcome"], "infrastructure");
    assert_eq!(contract_accepts(&out, &src), Err("infrastructure"));
    // A model call failing mid-protocol (the script runs dry) is infrastructure too.
    let out = run::negotiate_with(
        &TestHost::offline(),
        &src,
        &input(),
        &secrets(),
        &mut ScriptedAi::new(&[]),
    );
    assert_eq!(out["outcome"], "infrastructure");
}

#[test]
fn state_without_this_request_is_retried_for_15_seconds() {
    let src = FixtureSource::new("procurement");
    src.agreement.borrow_mut()["negotiation"] = json!({"Ready": {"attempts": 0}});
    let host = TestHost::offline();
    let out = run::negotiate_with(&host, &src, &input(), &secrets(), &mut ScriptedAi::new(&[]));
    assert_eq!(out["outcome"], "infrastructure");
    assert!(
        host.millis.get() >= 15_000 && src.reads.get() >= 15,
        "{} reads",
        src.reads.get()
    );
    assert!(out.get("buyer_commitment").is_none());
}

#[test]
fn malformed_input_gets_an_unsigned_error() {
    let src = FixtureSource::new("procurement");
    for bad in [
        json!({"mode": "negotiate", "agreement": "a7.accord-v1.testnet"}),
        json!({"mode": "negotiate", "agreement": "A7!", "request_nonce": NONCE}),
        json!({"mode": "negotiate", "agreement": "a7.accord-v1.testnet", "request_nonce": "AB".repeat(32)}),
    ] {
        let out = run::negotiate_with(
            &TestHost::offline(),
            &src,
            &bad,
            &secrets(),
            &mut ScriptedAi::new(&[]),
        );
        assert!(out.get("sig").is_none(), "{out}");
    }
}

#[test]
fn pubkey_output_passes_the_factorys_checks() {
    let out = run::handle(
        &TestHost::offline(),
        &FixtureSource::new("procurement"),
        &json!({"mode": "pubkey"}),
        Ok(secrets()),
    );
    assert_eq!(out["mode"], "pubkey");
    assert_eq!(out["job"], "sealed_table");
    let key = parse_pubkey(out["signing_pubkey"].as_str().unwrap()).unwrap();
    assert!(verify(&out, &key), "signed by the key it announces");
    assert_eq!(out["mandate_pubkey"], sealed()["mandate_pubkey"]);
    assert_eq!(out["mandate_pubkey"].as_str().unwrap().len(), 66);
    assert_eq!(key, keys::signing_key(&test_seed()).verifying_key());
}

/// The answer's schema follows the agreement's kind: procurement allows only `"atlas": null`, market making only the
/// object (a procurement quote with `atlas` filled ended `a3.accord-v2.testnet` in WALK_AWAY, 8 Nov 2026).
#[test]
fn response_format_narrows_atlas_to_the_kind() {
    use accord_sealed_table::protocol::response_format;
    let atlas = |k| response_format(k)["json_schema"]["schema"]["$defs"]["terms"]["properties"]["atlas"].clone();
    assert_eq!(atlas(Kind::Procurement), serde_json::json!({"type": "null"}));
    let mm = atlas(Kind::MarketMaking);
    assert_eq!(mm["type"], "object");
    assert!(mm.get("anyOf").is_none());
}

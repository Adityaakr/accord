//! Regression tests from the 9 Nov 2026 audit (DECISIONS.md section 25). Each asserts the fixed behaviour.

mod common;

use accord_core::hash::{jcs, sha256};
use accord_sealed_table::keys;
use accord_sealed_table::run::{self, Secrets};
use base64::{engine::general_purpose::STANDARD, Engine};
use common::*;
use serde_json::{json, Value};

fn secrets() -> Secrets {
    Secrets {
        seed: test_seed(),
        api_key: "x".into(),
    }
}

fn input() -> Value {
    json!({"mode": "negotiate", "agreement": sealed()["agreement"], "request_nonce": NONCE})
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

/// A compressed key `02 || x` whose x has no point on secp256k1.
fn off_curve_doc_key() -> String {
    for i in 1u64.. {
        let mut b = [0u8; 33];
        b[0] = 2;
        b[25..].copy_from_slice(&i.to_be_bytes());
        if k256::PublicKey::from_sec1_bytes(&b).is_err() {
            return hex::encode(b);
        }
    }
    unreachable!()
}

/// L5 (finding 4): a doc key that passes every format check but is not a curve point used to let the negotiation
/// run to agreed terms, then fail encrypting the document as a retryable `infrastructure` outcome, telling the
/// buyer "a deal existed inside my limits". Fixed: it is `BAD_INPUT` (final) when the envelope is opened, before
/// any attestation or model call.
#[test]
fn an_off_curve_doc_key_is_bad_input_before_any_model_call() {
    let f = sealed();
    let secret = keys::mandate_secret(&test_seed());
    let ct = STANDARD
        .decode(f["procurement"]["buyer"]["ciphertext"].as_str().unwrap())
        .unwrap();
    let mut env: Value = serde_json::from_slice(&ecies::decrypt(&secret, &ct).unwrap()).unwrap();
    let bad = off_curve_doc_key();
    env["doc_pubkey"] = json!(bad);
    let bytes = jcs(&env);
    let pk = hex::decode(keys::mandate_pubkey(&secret)).unwrap();
    let src = FixtureSource::new("procurement");
    src.set_commitment(
        "buyer",
        &json!({
            "commitment": hex::encode(sha256(&bytes)),
            "ciphertext": STANDARD.encode(ecies::encrypt(&pk, &bytes).unwrap()),
            "doc_pubkey": bad,
        }),
    );
    let mut ai = ScriptedAi::new(&[
        msg(
            "QUOTE",
            proc_terms(38_000_000, [14_000_000, 12_000_000, 12_000_000]),
            "Three milestones.",
        ),
        msg(
            "COUNTER",
            proc_terms(34_000_000, [12_000_000, 11_000_000, 11_000_000]),
            "Counter.",
        ),
        msg("ACCEPT", Value::Null, "Agreed."),
    ]);
    let out = run::negotiate_with(&TestHost::offline(), &src, &input(), &secrets(), &mut ai);
    assert!(
        !ai.attested.get(),
        "the model was attested and the negotiation ran"
    );
    assert_eq!(out["outcome"], "no_deal", "{out}");
    assert_eq!(out["no_deal_reason"], "BAD_INPUT");
}

/// L5-F2 (finding 5): any account answering `get_agreement` and `get_commitments` in the right shape used to get a
/// full negotiation (attestation and model calls on Accord's key) and a signed output. Fixed: an account that is not
/// `a<n>.<factory>` for a compiled factory, whose view names another factory, or that the factory did not create,
/// gets an unsigned error before any attestation or model call.
#[test]
fn an_account_outside_the_factory_gets_no_negotiation() {
    let f = sealed();
    let secret = keys::mandate_secret(&test_seed());
    let pk = hex::decode(keys::mandate_pubkey(&secret)).unwrap();
    for (account, view_factory, registered) in [
        ("evil-room.testnet", "accord-v1.testnet", true),
        ("a7.accord-v1.testnet", "rogue.testnet", true),
        ("a7.accord-v1.testnet", "accord-v1.testnet", false),
    ] {
        let src = FixtureSource::new("procurement");
        src.agreement.borrow_mut()["account"] = json!(account);
        src.agreement.borrow_mut()["factory"] = json!(view_factory);
        src.registered.set(registered);
        for role in ["buyer", "vendor"] {
            let ct = STANDARD
                .decode(f["procurement"][role]["ciphertext"].as_str().unwrap())
                .unwrap();
            let mut env: Value =
                serde_json::from_slice(&ecies::decrypt(&secret, &ct).unwrap()).unwrap();
            env["agreement"] = json!(account);
            let bytes = jcs(&env);
            src.set_commitment(
                role,
                &json!({
                    "commitment": hex::encode(sha256(&bytes)),
                    "ciphertext": STANDARD.encode(ecies::encrypt(&pk, &bytes).unwrap()),
                    "doc_pubkey": f["procurement"][role]["doc_pubkey"],
                }),
            );
        }
        let mut ai = ScriptedAi::new(&[
            msg(
                "QUOTE",
                proc_terms(38_000_000, [14_000_000, 12_000_000, 12_000_000]),
                "q",
            ),
            msg("ACCEPT", Value::Null, "ok"),
        ]);
        let input = json!({"mode": "negotiate", "agreement": account, "request_nonce": NONCE});
        let out = run::negotiate_with(&TestHost::offline(), &src, &input, &secrets(), &mut ai);
        assert!(
            !ai.attested.get(),
            "{account} reached attestation and the model"
        );
        assert!(
            out.get("sig").is_none(),
            "{account} got a signed output: {out}"
        );
        assert_eq!(out["status"], "error", "{out}");
    }
}

/// The agreement the fixtures describe is one the factory created: it still negotiates.
#[test]
fn a_factory_agreement_still_negotiates() {
    let src = FixtureSource::new("procurement");
    let mut ai = ScriptedAi::new(&[
        msg(
            "QUOTE",
            proc_terms(38_000_000, [14_000_000, 12_000_000, 12_000_000]),
            "q",
        ),
        msg("ACCEPT", Value::Null, "ok"),
    ]);
    let out = run::negotiate_with(&TestHost::offline(), &src, &input(), &secrets(), &mut ai);
    assert!(ai.attested.get());
    assert!(out.get("sig").is_some(), "{out}");
}

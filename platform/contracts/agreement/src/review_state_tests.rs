//! Adversarial review (liveness, state machine, griefing). Each `FINDING` test asserts the fixed behaviour, so it
//! fails at HEAD 1196775 (the reproduction) and passes once fixed; each comment says what HEAD does. The rest pin
//! what held. Helpers are copied from `tests.rs`.

use super::*;
use crate::payments::CloseStep;
use accord_core::hash::{jcs_sha256, signed_bytes, to_hex};
use ed25519_dalek::{Signer, SigningKey};
use near_sdk::base64::{engine::general_purpose::STANDARD, Engine};
use near_sdk::json_types::U128;
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::{testing_env, PromiseOrValue, PromiseResult, RuntimeFeesConfig};
use serde_json::{json, Value};
use std::panic::{catch_unwind, AssertUnwindSafe};

const T0: u64 = 1_800_000_000;
const SEALED: [u8; 32] = [1; 32];
const PAYEE: [u8; 32] = [2; 32];
const OBSERVER: [u8; 32] = [3; 32];

const BUYER: &str = "northwind-demo.testnet";
const VENDOR: &str = "halcyon-demo.testnet";
const AUTH: &str = "halcyon-auth.testnet";
const RECIPIENT: &str = "halcyon-mm.testnet";

fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}
fn me() -> AccountId {
    acc("a7.accord-v1.testnet")
}
fn token() -> AccountId {
    acc("usdc.testnet")
}
fn pk(seed: [u8; 32]) -> PublicKey {
    let vk = SigningKey::from_bytes(&seed).verifying_key();
    PublicKey::from_parts(near_sdk::CurveType::ED25519, vk.to_bytes().to_vec()).unwrap()
}
fn sign(seed: [u8; 32], mut v: Value) -> Value {
    let sig = SigningKey::from_bytes(&seed).sign(&signed_bytes(&v));
    v["sig"] = json!(STANDARD.encode(sig.to_bytes()));
    v
}
fn job(seed: [u8; 32], name: &str) -> JobRef {
    JobRef {
        project: format!("owner.testnet/{name}"),
        wasm_hash: "ab".repeat(32),
        signing_pubkey: pk(seed),
    }
}
fn params() -> Params {
    Params {
        mode: Mode::Demo,
        timelock_secs: 120,
        claim_delay_secs: 120,
        grace_secs: 600,
        min_acceptance_window_secs: 60,
        max_acceptance_window_secs: 604_800,
        require_two_sided: true,
        observation_grace_secs: 60,
        refusal_limit: 5,
        refusal_window_secs: 3600,
        agent_allowance: 500_000_000_000_000_000_000_000,
    }
}

fn call_gas(pred: &str, at: u64, results: Vec<PromiseResult>, tgas: u64) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(me())
        .predecessor_account_id(acc(pred))
        .signer_account_id(acc(pred))
        .block_timestamp(at * 1_000_000_000)
        .block_height(at)
        .account_balance(NearToken::from_near(5))
        // Every principal call attaches 1 yoctoNEAR, as a wallet does for the sensitive methods.
        .attached_deposit(NearToken::from_yoctonear(1))
        .prepaid_gas(gas(tgas));
    testing_env!(
        b.build(),
        near_sdk::test_vm_config(),
        RuntimeFeesConfig::test(),
        Default::default(),
        results
    );
}
fn call(pred: &str, at: u64, results: Vec<PromiseResult>) {
    call_gas(pred, at, results, 300)
}

fn new_agreement(kind: Kind) -> Agreement {
    call("accord-v1.testnet", T0, vec![]);
    Agreement::new(InitArgs {
        id: 7,
        factory: acc("accord-v1.testnet"),
        release: 1,
        kind,
        title: "t".into(),
        buyer: acc(BUYER),
        vendor: acc(VENDOR),
        vendor_authority: acc(AUTH),
        token: token(),
        outlayer: acc("outlayer.testnet"),
        keeper: acc("accord-keeper.testnet"),
        sealed_table: job(SEALED, "accord-sealed-table"),
        payee_job: job(PAYEE, "accord-payee"),
        observer_job: job(OBSERVER, "accord-observer"),
        model: "m".into(),
        canaries: vec![acc("halcyon-treasury.testnet")],
        params: params(),
    })
}

fn venue() -> Venue {
    Venue::RheaDcl {
        network: "mainnet".into(),
        contract: "dclv2.ref-labs.near".into(),
        pool_id: "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1|wrap.near|2000"
            .into(),
    }
}

fn procurement_terms() -> Terms {
    Terms {
        v: 1,
        kind: Kind::Procurement,
        token: token().to_string(),
        decimals: 6,
        total: 36_000_000,
        items: (1..=3)
            .map(|id| ItemTerms {
                id,
                amount: 12_000_000,
                due_offset_secs: 600 * u64::from(id),
                evidence: Evidence::DeliveryAccepted,
            })
            .collect(),
        acceptance_window_secs: 120,
        duration_secs: 3600,
        params_hash: jcs_sha256(&params()),
        doc_hash: [5; 32],
        atlas: None,
    }
}

/// One market-making period with `slots` slots (each window 20 s, the minimum `structural` allows).
fn mm_terms_slots(slots: u8) -> Terms {
    let period_secs = u64::from(slots) * 20;
    Terms {
        v: 1,
        kind: Kind::MarketMaking,
        token: token().to_string(),
        decimals: 6,
        total: 6_000_000,
        items: vec![ItemTerms {
            id: 1,
            amount: 6_000_000,
            due_offset_secs: period_secs,
            evidence: Evidence::PeriodEligible { period: 0 },
        }],
        acceptance_window_secs: 120,
        duration_secs: period_secs,
        params_hash: jcs_sha256(&params()),
        doc_hash: [5; 32],
        atlas: Some(AtlasTerms {
            retainer_per_period: 6_000_000,
            periods: 1,
            period_secs,
            slots_per_period: slots,
            pass_threshold: 1,
            venue: venue(),
            max_spread_bps: 60,
            min_depth_quote: 150_000_000,
            depth_band_bps: 200,
        }),
    }
}

fn commit_both(a: &mut Agreement) {
    for (who, c) in [(BUYER, "11"), (VENDOR, "22")] {
        call(who, T0, vec![]);
        a.commit_mandate(
            c.repeat(32),
            Base64VecU8(vec![1, 2, 3]),
            "02".to_string() + &"ab".repeat(32),
            pk([4; 32]),
        );
    }
}

fn nonce(a: &Agreement) -> String {
    match &a.negotiation {
        Negotiation::Requested { request_nonce, .. } => to_hex(request_nonce),
        other => panic!("not requested: {other:?}"),
    }
}

fn sealed_output(a: &Agreement, terms: &Terms) -> Value {
    sign(
        SEALED,
        json!({
            "mode": "negotiate", "agreement": me(), "release": 1, "request_nonce": nonce(a),
            "buyer_commitment": "11".repeat(32), "vendor_commitment": "22".repeat(32),
            "outcome": "terms", "terms": terms, "terms_hash": to_hex(&jcs_sha256(terms)),
            "no_deal_reason": null, "rounds": 4, "transcript_hash": "cd".repeat(32),
            "documents": {"buyer": "YQ==", "vendor": "Yg=="},
            "model": {"id": "m"}, "usage": {"prompt_tokens": 1},
        }),
    )
}

fn deliver(a: &mut Agreement, out: &Value) {
    call(
        me().as_str(),
        T0 + 30,
        vec![PromiseResult::Successful(out.to_string().into_bytes())],
    );
    let n = nonce(a);
    a.on_sealed_result(n);
}

fn executing_with(kind: Kind, terms: Terms) -> Agreement {
    let mut a = new_agreement(kind);
    commit_both(&mut a);
    call("accord-keeper.testnet", T0, vec![]);
    let _ = a.start_negotiation();
    let out = sealed_output(&a, &terms);
    deliver(&mut a, &out);
    assert_eq!(a.state, State::Attested);
    let hash = a.terms_hash.clone().unwrap();
    for who in [BUYER, VENDOR] {
        call(who, T0 + 40, vec![]);
        a.approve_terms(hash.clone());
    }
    assert_eq!(a.state, State::Executing);
    a
}

fn fund(a: &mut Agreement, amount: u128) {
    call(token().as_str(), T0 + 50, vec![]);
    a.ft_on_transfer(acc(BUYER), U128(amount), "fund".into());
}

fn payee_output(version: u32, account: &str) -> Value {
    sign(
        PAYEE,
        json!({
            "mode": "prove", "agreement": me(), "version": version, "domain": "halcyon.example",
            "account": account, "authority": AUTH,
            "checks": {"file": "ok", "recipient_listed": "ok", "authority_matches": "ok"},
            "rating": "allow", "reasons": [],
        }),
    )
}

fn authorise_recipient(a: &mut Agreement, account: &str, at: u64) -> u32 {
    call(VENDOR, at, vec![]);
    let v = a.propose_recipient(acc(account), "halcyon.example".into());
    let out = payee_output(v, account);
    call(
        me().as_str(),
        at,
        vec![PromiseResult::Successful(out.to_string().into_bytes())],
    );
    a.on_payee_proof(v);
    call(AUTH, at, vec![]);
    a.approve_recipient(v);
    call(BUYER, at, vec![]);
    a.accept_recipient(v, false);
    v
}

fn panics<R>(f: impl FnOnce() -> R) -> Option<String> {
    let r = catch_unwind(AssertUnwindSafe(f));
    match r {
        Ok(_) => None,
        Err(e) => Some(
            e.downcast_ref::<String>()
                .cloned()
                .or_else(|| e.downcast_ref::<&str>().map(|s| s.to_string()))
                .unwrap_or_else(|| "<non-string panic>".into()),
        ),
    }
}

// ---------------------------------------------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------------------------------------------

/// FINDING: `cancel` leaves `negotiation = Requested`, and `handle_sealed` never checks `state`, so the in-flight
/// Sealed Table answer (or the keeper's F1 `submit_sealed_result`) moves a `Cancelled` agreement to `Attested`
/// (or `NoDeal`). Fixed behaviour: state stays `Cancelled`.
#[test]
fn review_late_sealed_result_resurrects_a_cancelled_agreement() {
    let mut a = new_agreement(Kind::Procurement);
    commit_both(&mut a);
    call("accord-keeper.testnet", T0, vec![]);
    let _ = a.start_negotiation();
    let out = sealed_output(&a, &procurement_terms());
    let n = nonce(&a);
    call(BUYER, T0 + 5, vec![]);
    a.cancel();
    assert_eq!(a.state, State::Cancelled);
    call(
        me().as_str(),
        T0 + 30,
        vec![PromiseResult::Successful(out.to_string().into_bytes())],
    );
    a.on_sealed_result(n);
    // At HEAD 1196775 this is `Attested`, and both approvals then reach `Executing` from a terminal state.
    assert_eq!(
        a.state,
        State::Cancelled,
        "a cancelled agreement came back to life"
    );
}

/// Same through the keeper's fallback path (F1).
#[test]
fn review_keeper_submit_after_cancel_also_resurrects() {
    let mut a = new_agreement(Kind::Procurement);
    commit_both(&mut a);
    call("accord-keeper.testnet", T0, vec![]);
    let _ = a.start_negotiation();
    let out = sealed_output(&a, &procurement_terms());
    call(VENDOR, T0 + 5, vec![]);
    a.cancel();
    call("accord-keeper.testnet", T0 + 6, vec![]);
    let _ = panics(|| a.submit_sealed_result(out.to_string()));
    assert_eq!(a.state, State::Cancelled, "Cancelled -> Attested via F1");
}

/// FINDING: `slots_per_period` is a `u8` and `terms::structural` does not cap it at 32, but `PeriodState.recorded` is
/// a `u32` bitmask. With 33+ slots, `close_period` evaluates `1 << 32` and panics (overflow-checks are on in the
/// release profile too), so the period can never close, `require_term_over` fails with `ERR_PERIOD_OPEN` forever,
/// and the whole escrow is locked (only `mutual_close` gets out). Recording slot 32 panics the same way.
#[test]
fn review_more_than_32_slots_bricks_close_period_and_close() {
    let terms = mm_terms_slots(33);
    if accord_core::terms::structural(&terms, token().as_str(), &params()).is_err() {
        return; // fixed by refusing the terms
    }
    let mut a = executing_with(Kind::MarketMaking, terms);
    fund(&mut a, 6_000_000);
    let start = a.executing_at.unwrap();
    call("anyone.testnet", start + 33 * 20 + 61, vec![]);
    // At HEAD 1196775: panics "attempt to shift left with overflow"; the period stays Open and, after the term,
    // close() panics ERR_PERIOD_OPEN forever.
    let err = panics(|| a.close_period(0));
    assert!(err.is_none(), "close_period panicked: {err:?}");
}

/// With exactly 32 slots the bitmask still fits: the period closes. (What held.)
#[test]
fn review_32_slots_still_close() {
    let mut a = executing_with(Kind::MarketMaking, mm_terms_slots(32));
    let start = a.executing_at.unwrap();
    call("anyone.testnet", start + 32 * 20 + 61, vec![]);
    assert_eq!(a.close_period(0), PeriodOutcome::Review);
}

/// FINDING (no recovery path): `close_step` sets `closing = true` and only `on_close_balance` clears it. If that callback
/// panics (it runs on 30 TGas static plus close()'s leftover, and must itself prepay 15 + 10 TGas for the refund
/// transfer and its callback, so a caller who attaches just enough gas to `close()` starves it), nothing resets
/// `closing`: `close`, `claim` and `act` refuse with `ERR_IN_FLIGHT` forever and `resolve_stale_lock` does not apply
/// (it only looks at `in_flight`). Here the callback is simply never run, which is the state a panicked callback
/// leaves.
#[test]
fn review_closing_flag_stuck_has_no_recovery() {
    let mut a = executing_with(Kind::Procurement, procurement_terms());
    fund(&mut a, 36_000_000);
    let end = T0 + 40 + 3600 + 600;
    call("anyone.testnet", end, vec![]);
    assert_eq!(a.close(), CloseStep::Settling);
    assert!(a.closing);
    // The balance callback never commits (it panicked). Some permissionless path must clear `closing` eventually.
    call("anyone.testnet", end + 10, vec![]);
    assert!(matches!(
        a.close(),
        CloseStep::Refused {
            code: RefusalCode::InFlight,
            ..
        }
    ));
    call("anyone.testnet", end + 100_000, vec![]);
    let _ = panics(|| a.resolve_stale_lock()); // HEAD 1196775: ERR_NO_STALE_LOCK, `closing` stays set forever
    call("anyone.testnet", end + 100_001, vec![]);
    assert!(
        !a.closing,
        "closing is stuck: close, claim and act refuse ERR_IN_FLIGHT forever"
    );
}

/// The callback with only its static gas (`BALANCE_CALLBACK_GAS`, raised from 30 to 60 TGas after this finding) can
/// prepay the refund transfer and its callback and settles.
/// `#[ignore]`: the mock's `GasExceeded` crosses an `extern "C"` boundary and aborts the test process, so run it
/// alone: `cargo test review_on_close_balance -- --ignored`. At HEAD it aborts with `HostError(GasExceeded)`.
#[test]
#[ignore]
fn review_on_close_balance_with_only_its_static_gas() {
    let mut a = executing_with(Kind::Procurement, procurement_terms());
    fund(&mut a, 36_000_000);
    let end = T0 + 40 + 3600 + 600;
    call("anyone.testnet", end, vec![]);
    assert_eq!(a.close(), CloseStep::Settling);
    call_gas(
        me().as_str(),
        end + 1,
        vec![PromiseResult::Successful(b"\"36000000\"".to_vec())],
        crate::payments::BALANCE_CALLBACK_GAS,
    );
    a.on_close_balance();
    assert_eq!(a.state, State::Settled);
}

/// FINDING: the creation deposit (2 to 3.5 NEAR) is stranded after `Cancelled` or `NoDeal`: `withdraw_near` requires
/// `Settled`, and those states have no exit. Fixed behaviour: `withdraw_near` in any terminal state.
#[test]
fn review_cancelled_agreement_strands_the_creation_deposit() {
    let mut a = new_agreement(Kind::Procurement);
    call(BUYER, T0 + 1, vec![]);
    a.cancel();
    call(BUYER, T0 + 2, vec![]);
    let err = panics(|| a.withdraw_near());
    // HEAD 1196775: ERR_WRONG_STATE; the deposit has no exit from Cancelled or NoDeal.
    assert!(err.is_none(), "deposit stranded: {err:?}");
}

// ---------------------------------------------------------------------------------------------------------------
// What held
// ---------------------------------------------------------------------------------------------------------------

/// A signed answer for attempt 1 cannot settle attempt 2 (nonce check). Since the 9 Nov 2026 audit (finding 4) a
/// mandate cannot be re-sealed once an attempt ran, so attempts can never be reset by re-sealing either.
#[test]
fn review_old_attempt_output_is_ignored_and_attempts_survive_recommit() {
    let mut a = new_agreement(Kind::Procurement);
    commit_both(&mut a);
    call("accord-keeper.testnet", T0, vec![]);
    let _ = a.start_negotiation();
    let old = sealed_output(&a, &procurement_terms());
    call(me().as_str(), T0 + 1, vec![PromiseResult::Failed]);
    let n = nonce(&a);
    a.on_sealed_result(n);
    assert_eq!(a.negotiation, Negotiation::Ready { attempts: 1 });
    let err = panics(|| commit_both(&mut a));
    assert!(
        err.is_some_and(|e| e.contains("ERR_WRONG_STATE")),
        "re-sealing after an attempt is refused"
    );
    assert_eq!(a.negotiation, Negotiation::Ready { attempts: 1 });
    call("accord-keeper.testnet", T0 + 2, vec![]);
    let _ = a.start_negotiation();
    // The old output carries the old nonce.
    call(
        me().as_str(),
        T0 + 3,
        vec![PromiseResult::Successful(old.to_string().into_bytes())],
    );
    let n = nonce(&a);
    a.on_sealed_result(n);
    assert!(matches!(a.negotiation, Negotiation::Ready { attempts: 2 }));
    assert_eq!(a.state, State::Sealed);
}

/// A mandate cannot be replaced while a request is in flight.
#[test]
fn review_commit_mandate_refused_while_requested() {
    let mut a = new_agreement(Kind::Procurement);
    commit_both(&mut a);
    call("accord-keeper.testnet", T0, vec![]);
    let _ = a.start_negotiation();
    call(BUYER, T0 + 1, vec![]);
    let err = panics(|| {
        a.commit_mandate(
            "33".repeat(32),
            Base64VecU8(vec![1]),
            "02".to_string() + &"ab".repeat(32),
            pk([4; 32]),
        )
    })
    .unwrap();
    assert!(err.contains("ERR_WRONG_STATE"));
}

/// Cancel after Executing is refused.
#[test]
fn review_cancel_after_executing_refused() {
    let mut a = executing_with(Kind::Procurement, procurement_terms());
    call(VENDOR, T0 + 50, vec![]);
    assert!(panics(|| a.cancel()).unwrap().contains("ERR_WRONG_STATE"));
}

/// The no-current-recipient shortcut still needs the buyer's own acceptance: the vendor and authority alone get a
/// version only to `AuthorityApproved`, and a second pending version is refused.
#[test]
fn review_vendor_and_authority_cannot_activate_without_the_buyer() {
    let mut a = executing_with(Kind::Procurement, procurement_terms());
    call(VENDOR, T0 + 60, vec![]);
    let v = a.propose_recipient(acc(RECIPIENT), "halcyon.example".into());
    let out = payee_output(v, RECIPIENT);
    call(
        me().as_str(),
        T0 + 61,
        vec![PromiseResult::Successful(out.to_string().into_bytes())],
    );
    a.on_payee_proof(v);
    call(AUTH, T0 + 62, vec![]);
    a.approve_recipient(v);
    call("anyone.testnet", T0 + 100_000, vec![]);
    assert!(panics(|| a.activate_recipient(v))
        .unwrap()
        .contains("ERR_WRONG_STATE"));
    assert!(a.current_recipient.is_none());
    call(VENDOR, T0 + 63, vec![]);
    assert!(
        panics(|| a.propose_recipient(acc(RECIPIENT), "halcyon.example".into()))
            .unwrap()
            .contains("ERR_CHANGE_PENDING")
    );
}

/// A recipient change after the first still waits the timelock, and a cancelled pending version cannot be activated.
#[test]
fn review_cancelled_change_cannot_activate() {
    let mut a = executing_with(Kind::Procurement, procurement_terms());
    authorise_recipient(&mut a, RECIPIENT, T0 + 60);
    let v2 = authorise_recipient(&mut a, "halcyon-mm2.testnet", T0 + 70);
    assert_eq!(a.current_recipient, Some(1));
    call(BUYER, T0 + 71, vec![]);
    a.cancel_recipient_change(v2);
    call("anyone.testnet", T0 + 10_000, vec![]);
    assert!(panics(|| a.activate_recipient(v2))
        .unwrap()
        .contains("ERR_WRONG_STATE"));
    assert_eq!(a.current_recipient, Some(1));
}

/// An observation for a closed period is refused; one for another period's window is refused.
#[test]
fn review_observation_after_close_and_cross_period_refused() {
    let mut a = executing_with(Kind::MarketMaking, mm_terms_slots(6));
    let start = a.executing_at.unwrap();
    call("anyone.testnet", start + 120 + 61, vec![]);
    a.close_period(0);
    let at = a.terms.get().as_ref().unwrap().atlas.clone().unwrap();
    let (s, _) = accord_core::atlas::slot_window(start, at.period_secs, 6, 0);
    let o = Observation {
        agreement: me().to_string(),
        period: 0,
        slot: 0,
        slot_time: s + 5,
        venue: venue(),
        band_bps: 200,
        venue_block: BlockRef {
            height: 1,
            hash: "h".into(),
            time: s + 6,
        },
        mid: "1".into(),
        spread_bps: 10,
        depth_bid: 200_000_000,
        depth_ask: 200_000_000,
        two_sided: true,
    };
    let signed = sign(OBSERVER, evidence::observation_payload(&o, ""));
    let sig = signed["sig"].as_str().unwrap().to_string();
    call("anyone.testnet", start + 200, vec![]);
    let err = panics(|| a.record_observation(o.clone(), sig.clone())).unwrap();
    assert!(err.contains("ERR_PERIOD_CLOSED"), "{err}");
    // Slot 1's window does not contain slot 0's time.
    let mut o1 = o;
    o1.slot = 1;
    let signed = sign(OBSERVER, evidence::observation_payload(&o1, ""));
    let sig = signed["sig"].as_str().unwrap().to_string();
    let err = panics(|| a.record_observation(o1, sig)).unwrap();
    assert!(err.contains("ERR_OUT_OF_WINDOW"), "{err}");
}

/// A failed refund is retried by `close()` and never doubles: the owed amount is zeroed before each retry.
#[test]
fn review_refund_retry_does_not_double() {
    let mut a = executing_with(Kind::Procurement, procurement_terms());
    fund(&mut a, 36_000_000);
    let end = T0 + 40 + 3600 + 600;
    call("anyone.testnet", end, vec![]);
    assert_eq!(a.close(), CloseStep::Settling);
    call(
        me().as_str(),
        end + 1,
        vec![PromiseResult::Successful(b"\"36000000\"".to_vec())],
    );
    a.on_close_balance();
    assert_eq!(a.state, State::Settled);
    call(me().as_str(), end + 2, vec![PromiseResult::Failed]);
    a.on_refund_resolved(U128(36_000_000));
    assert_eq!(a.refund_owed, 36_000_000);
    call("anyone.testnet", end + 3, vec![]);
    assert_eq!(a.close(), CloseStep::RefundRetried);
    assert!(
        a.refund_owed <= 36_000_000,
        "a retry never adds to what is owed"
    );
    let _ = PromiseOrValue::<()>::Value(());
}

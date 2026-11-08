//! Adversarial funds/authority review: tests that reproduce findings. Helpers copied from `tests.rs`.
#![allow(dead_code)]

use super::*;
use crate::payments::CloseStep;
use accord_core::hash::{jcs_sha256, signed_bytes, to_hex};
use ed25519_dalek::{Signer, SigningKey};
use near_sdk::base64::{engine::general_purpose::STANDARD, Engine};
use near_sdk::json_types::U128;
use near_sdk::test_utils::{get_logs, VMContextBuilder};
use near_sdk::{testing_env, PromiseOrValue, PromiseResult, RuntimeFeesConfig};
use serde_json::{json, Value};

const T0: u64 = 1_800_000_000;
const SEALED: [u8; 32] = [1; 32];
const PAYEE: [u8; 32] = [2; 32];
const OBSERVER: [u8; 32] = [3; 32];
const AGENT: [u8; 32] = [9; 32];

fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}
fn me() -> AccountId {
    acc("a7.accord-v1.testnet")
}
fn token() -> AccountId {
    acc("usdc.testnet")
}
const BUYER: &str = "northwind-demo.testnet";
const VENDOR: &str = "halcyon-demo.testnet";
const AUTH: &str = "halcyon-auth.testnet";
const RECIPIENT: &str = "halcyon-mm.testnet";
const ATTACKER: &str = "halcyon-markets.testnet";
const CANARY: &str = "halcyon-treasury.testnet";

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

/// Sets the environment for one call: who calls, which key signed, at what time, with what promise results.
fn call(pred: &str, signer: Option<[u8; 32]>, at: u64, results: Vec<PromiseResult>) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(me())
        .predecessor_account_id(acc(pred))
        .signer_account_id(acc(pred))
        .block_timestamp(at * 1_000_000_000)
        .block_height(at)
        .account_balance(NearToken::from_near(5))
        .prepaid_gas(gas(300));
    if let Some(s) = signer {
        b.signer_account_pk(pk(s));
    }
    testing_env!(
        b.build(),
        near_sdk::test_vm_config(),
        RuntimeFeesConfig::test(),
        Default::default(),
        results
    );
}

fn new_agreement(kind: Kind) -> Agreement {
    call("accord-v1.testnet", None, T0, vec![]);
    Agreement::new(InitArgs {
        id: 7,
        factory: acc("accord-v1.testnet"),
        release: 1,
        kind,
        title: "Liquidity reporting integration".into(),
        buyer: acc(BUYER),
        vendor: acc(VENDOR),
        vendor_authority: acc(AUTH),
        token: token(),
        outlayer: acc("outlayer.testnet"),
        keeper: acc("accord-keeper.testnet"),
        sealed_table: job(SEALED, "accord-sealed-table"),
        payee_job: job(PAYEE, "accord-payee"),
        observer_job: job(OBSERVER, "accord-observer"),
        model: "z-ai/glm-5.3-flash".into(),
        canaries: vec![acc("halcyon-mm-payments.testnet"), acc(CANARY)],
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

fn mm_terms() -> Terms {
    Terms {
        v: 1,
        kind: Kind::MarketMaking,
        token: token().to_string(),
        decimals: 6,
        total: 24_000_000,
        items: (0..4)
            .map(|p| ItemTerms {
                id: p + 1,
                amount: 6_000_000,
                due_offset_secs: 360 * u64::from(p + 1),
                evidence: Evidence::PeriodEligible { period: p },
            })
            .collect(),
        acceptance_window_secs: 120,
        duration_secs: 1440,
        params_hash: jcs_sha256(&params()),
        doc_hash: [5; 32],
        atlas: Some(AtlasTerms {
            retainer_per_period: 6_000_000,
            periods: 4,
            period_secs: 360,
            slots_per_period: 6,
            pass_threshold: 4,
            venue: venue(),
            max_spread_bps: 60,
            min_depth_quote: 150_000_000,
            depth_band_bps: 200,
        }),
    }
}

fn commit_both(a: &mut Agreement) {
    for (who, c) in [(BUYER, "11"), (VENDOR, "22")] {
        call(who, None, T0, vec![]);
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
            "model": {"id": "z-ai/glm-5.3-flash"}, "usage": {"prompt_tokens": 1},
        }),
    )
}

/// Through negotiation and both approvals to `Executing`.
fn executing(kind: Kind) -> Agreement {
    let mut a = new_agreement(kind);
    commit_both(&mut a);
    call("accord-keeper.testnet", None, T0, vec![]);
    let _ = a.start_negotiation();
    let terms = if kind == Kind::Procurement {
        procurement_terms()
    } else {
        mm_terms()
    };
    let out = sealed_output(&a, &terms);
    call(
        "a7.accord-v1.testnet",
        None,
        T0 + 30,
        vec![PromiseResult::Successful(out.to_string().into_bytes())],
    );
    a.on_sealed_result(nonce(&a));
    assert_eq!(a.state, State::Attested);
    let hash = a.terms_hash.clone().unwrap();
    for who in [BUYER, VENDOR] {
        call(who, None, T0 + 40, vec![]);
        a.approve_terms(hash.clone());
    }
    assert_eq!(a.state, State::Executing);
    a
}

fn fund(a: &mut Agreement, amount: u128) -> U128 {
    call(token().as_str(), None, T0 + 50, vec![]);
    a.ft_on_transfer(acc(BUYER), U128(amount), "fund".into())
}

fn payee_output(version: u32, account: &str, rating: &str) -> Value {
    sign(
        PAYEE,
        json!({
            "mode": "prove", "agreement": me(), "version": version, "domain": "halcyon.example",
            "url": "https://halcyon.example/.well-known/accord.json", "file_sha256": "00".repeat(32),
            "account": account, "authority": AUTH, "fetched_at": T0, "block": 1, "form": "simple",
            "demo_domain": false,
            "checks": {"file": "ok", "recipient_listed": "ok", "authority_matches": "ok"},
            "signals": {}, "rating": rating, "reasons": [],
        }),
    )
}

fn authorise_recipient(a: &mut Agreement, account: &str, at: u64) -> u32 {
    call(VENDOR, None, at, vec![]);
    let v = a.propose_recipient(acc(account), "halcyon.example".into());
    let out = payee_output(v, account, "allow");
    call(
        "a7.accord-v1.testnet",
        None,
        at,
        vec![PromiseResult::Successful(out.to_string().into_bytes())],
    );
    a.on_payee_proof(v);
    call(AUTH, None, at, vec![]);
    a.approve_recipient(v);
    call(BUYER, None, at, vec![]);
    a.accept_recipient(v, false);
    v
}

fn install_agent(a: &mut Agreement, seed: [u8; 32]) {
    call(BUYER, None, T0 + 60, vec![]);
    let _ = a.install_agent_key(pk(seed), U128(500_000_000_000_000_000_000_000));
}

fn deliver_and_accept(a: &mut Agreement, item: u32, at: u64) {
    call(VENDOR, None, at, vec![]);
    a.submit_delivery(item, "ee".repeat(32), "https://halcyon.example/d1".into());
    call(BUYER, None, at + 1, vec![]);
    a.accept_delivery(item);
}

fn agent_pay(
    a: &mut Agreement,
    item: u32,
    amount: u128,
    to: &str,
    at: u64,
) -> PromiseOrValue<ActOutcome> {
    call(me().as_str(), Some(AGENT), at, vec![]);
    a.act(Action::Pay {
        item,
        amount,
        recipient: to.into(),
        memo: None,
    })
}

fn refused(r: PromiseOrValue<ActOutcome>) -> RefusalCode {
    match r {
        PromiseOrValue::Value(ActOutcome::Refused { code, .. }) => code,
        PromiseOrValue::Value(other) => panic!("expected a refusal, got {other:?}"),
        PromiseOrValue::Promise(_) => panic!("expected a refusal, got a payment"),
    }
}

fn settle_payment(a: &mut Agreement, ok: bool, at: u64) -> ActOutcome {
    let f = a.in_flight.clone().expect("a payment in flight");
    let r = if ok {
        PromiseResult::Successful(vec![])
    } else {
        PromiseResult::Failed
    };
    call(me().as_str(), None, at, vec![r]);
    a.on_payment_resolved(
        f.payment_id,
        f.item,
        U128(f.amount),
        f.recipient.parse().unwrap(),
        f.via,
    )
}

fn ready_to_pay() -> Agreement {
    let mut a = executing(Kind::Procurement);
    assert_eq!(
        fund(&mut a, 40_000_000),
        U128(4_000_000),
        "excess above the total is returned"
    );
    authorise_recipient(&mut a, RECIPIENT, T0 + 55);
    install_agent(&mut a, AGENT);
    deliver_and_accept(&mut a, 1, T0 + 100);
    a
}

// ---------------------------------------------------------------------------------------------------------------
// Review findings
// ---------------------------------------------------------------------------------------------------------------

const END: u64 = T0 + 40 + 3600 + 600;

fn stale_assumed_paid(a: &mut Agreement, at: u64) -> InFlight {
    let _ = agent_pay(a, 1, 12_000_000, RECIPIENT, at);
    let x = a.in_flight.clone().unwrap();
    call("anyone.testnet", None, at + 600, vec![]);
    let _ = a.resolve_stale_lock();
    call(
        me().as_str(),
        None,
        at + 601,
        vec![PromiseResult::Successful(b"\"36000000\"".to_vec())],
    );
    a.on_stale_balance(x.payment_id);
    assert_eq!(a.items[0].status, ItemStatus::AssumedPaid);
    x
}

fn reopen(a: &mut Agreement, at: u64) {
    call(VENDOR, None, at, vec![]);
    let id = a.request_exception(1, U128(12_000_000), false, "not received".into());
    call(BUYER, None, at + 1, vec![]);
    a.approve_exception(id);
    assert_eq!(a.items[0].status, ItemStatus::Eligible);
}

/// Fixed (was I2): a late failed callback for payment X no longer reverts an item that a newer payment Y paid.
#[test]
fn review_late_failed_callback_unpays_an_item_paid_by_a_newer_payment() {
    let mut a = ready_to_pay();
    let x = stale_assumed_paid(&mut a, T0 + 110);
    reopen(&mut a, T0 + 720);
    assert!(matches!(
        agent_pay(&mut a, 1, 12_000_000, RECIPIENT, T0 + 730),
        PromiseOrValue::Promise(_)
    ));
    settle_payment(&mut a, true, T0 + 731);
    assert_eq!(a.items[0].status, ItemStatus::Paid);
    call(me().as_str(), None, T0 + 740, vec![PromiseResult::Failed]);
    a.on_payment_resolved(x.payment_id, 1, U128(x.amount), acc(RECIPIENT), Via::Agent);
    assert_eq!(a.items[0].status, ItemStatus::Paid, "Y's payment stands");
    assert_eq!(a.paid, 12_000_000);
    assert_eq!(
        refused(agent_pay(&mut a, 1, 12_000_000, RECIPIENT, T0 + 750)),
        RefusalCode::AlreadyPaid
    );
}

/// Fixed (was I2/I3): a late successful callback after the reopen is recorded: the item is paid by X, counted, and
/// cannot be paid again.
#[test]
fn review_late_success_after_reopen_is_ignored_and_item_pays_twice() {
    let mut a = ready_to_pay();
    let x = stale_assumed_paid(&mut a, T0 + 110);
    reopen(&mut a, T0 + 720);
    call(
        me().as_str(),
        None,
        T0 + 725,
        vec![PromiseResult::Successful(vec![])],
    );
    a.on_payment_resolved(x.payment_id, 1, U128(x.amount), acc(RECIPIENT), Via::Agent);
    assert_eq!(a.items[0].status, ItemStatus::Paid);
    assert_eq!(a.paid, 12_000_000);
    assert_eq!(a.receipts.len(), 1);
    assert_eq!(
        refused(agent_pay(&mut a, 1, 12_000_000, RECIPIENT, T0 + 730)),
        RefusalCode::AlreadyPaid
    );
}

/// Fixed (was high): close reserves only what the escrow covers; the rest is recorded Unfunded and the buyer's
/// refund is not starved.
#[test]
fn review_close_reserves_unfunded_items_and_strands_usdc() {
    let mut a = executing(Kind::Procurement);
    fund(&mut a, 15_000_000);
    deliver_and_accept(&mut a, 1, T0 + 100);
    deliver_and_accept(&mut a, 2, T0 + 200);
    call("anyone.testnet", None, END, vec![]);
    assert_eq!(a.close(), CloseStep::Reserved { item: 1 });
    assert_eq!(a.close(), CloseStep::Unfunded { item: 2 });
    assert_eq!(a.reserved, 12_000_000);
    assert_eq!(a.close(), CloseStep::Settling);
    call(
        me().as_str(),
        None,
        END + 1,
        vec![PromiseResult::Successful(b"\"15000000\"".to_vec())],
    );
    a.on_close_balance();
    assert!(
        get_logs()
            .iter()
            .any(|l| l.contains("\"refunded\":\"3000000\"")),
        "the uncovered 3 USDC refunded"
    );
    authorise_recipient(&mut a, RECIPIENT, END + 10);
    call(VENDOR, None, END + 10 + 120, vec![]);
    assert!(matches!(a.claim(1), PromiseOrValue::Promise(_)));
    settle_payment(&mut a, true, END + 131);
    assert_eq!(a.reserved, 0);
}

/// Fixed (was high): money set aside for a reserved item is not spent by the next close step.
#[test]
fn review_reserved_funds_are_spent_by_the_next_close_step() {
    let mut a = executing(Kind::Procurement);
    fund(&mut a, 15_000_000);
    authorise_recipient(&mut a, RECIPIENT, T0 + 55);
    deliver_and_accept(&mut a, 1, T0 + 100);
    deliver_and_accept(&mut a, 2, T0 + 200);
    call("anyone.testnet", None, END, vec![]);
    assert_eq!(a.close(), CloseStep::Paying { item: 1 });
    settle_payment(&mut a, false, END + 1);
    assert_eq!(a.items[0].status, ItemStatus::Reserved);
    call("anyone.testnet", None, END + 2, vec![]);
    assert_eq!(
        a.close(),
        CloseStep::Unfunded { item: 2 },
        "item 2 is not paid from item 1's reserve"
    );
    call("anyone.testnet", None, END + 4, vec![]);
    assert_eq!(a.close(), CloseStep::Settling);
    call(
        me().as_str(),
        None,
        END + 5,
        vec![PromiseResult::Successful(b"\"15000000\"".to_vec())],
    );
    a.on_close_balance();
    call(VENDOR, None, END + 400, vec![]);
    assert!(
        matches!(a.claim(1), PromiseOrValue::Promise(_)),
        "the reserved item stays claimable"
    );
}

/// Fixed (was high): an exception on a reserved item is refused, so the reserve always matches what is claimable.
#[test]
#[should_panic(expected = "ERR_RESERVED")]
fn review_exception_on_a_reserved_item_strands_the_difference() {
    let mut a = executing(Kind::Procurement);
    fund(&mut a, 36_000_000);
    deliver_and_accept(&mut a, 1, T0 + 100);
    call("anyone.testnet", None, END, vec![]);
    assert_eq!(a.close(), CloseStep::Reserved { item: 1 });
    call(VENDOR, None, END + 1, vec![]);
    a.request_exception(1, U128(1_000_000), false, "partial".into());
}

/// Fixed (was high): funding while close reads the balance is refused, so the token returns it in full.
#[test]
#[should_panic(expected = "ERR_CLOSING")]
fn review_funding_during_closing_is_stranded() {
    let mut a = executing(Kind::Procurement);
    fund(&mut a, 20_000_000);
    call("anyone.testnet", None, END, vec![]);
    assert_eq!(a.close(), CloseStep::Settling);
    fund(&mut a, 10_000_000);
}

/// Fixed (was I6): asking again for an exception on an item that has one pending returns the pending one; `act`
/// never panics on a well-formed action.
#[test]
fn review_act_request_exception_panics_when_one_is_pending() {
    let mut a = ready_to_pay();
    let mut ids = vec![];
    for _ in 0..2 {
        call(me().as_str(), Some(AGENT), T0 + 110, vec![]);
        match a.act(Action::RequestException {
            item: 2,
            amount: 9_000_000,
            waive_evidence: false,
            reason: "x".into(),
        }) {
            PromiseOrValue::Value(ActOutcome::ExceptionRequested { id }) => ids.push(id),
            _ => panic!("expected the pending exception"),
        }
    }
    assert_eq!(ids[0], ids[1]);
    assert_eq!(a.exceptions.len(), 1);
}

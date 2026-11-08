//! Unit tests against the mocked blockchain: the procurement flow, the attack refusals, revocation, the stale lock,
//! close, exceptions and market-making periods. The sandbox suite in `tests/` repeats the critical ones on a real node.

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
        // Every principal call attaches 1 yoctoNEAR, as a wallet does for the sensitive methods.
        .attached_deposit(NearToken::from_yoctonear(1))
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

#[test]
fn procurement_pays_the_approved_item_to_the_authorised_recipient() {
    let mut a = ready_to_pay();
    assert_eq!(a.funded, 36_000_000);
    assert!(matches!(
        agent_pay(&mut a, 1, 12_000_000, RECIPIENT, T0 + 110),
        PromiseOrValue::Promise(_)
    ));
    assert!(a.in_flight.is_some());
    let out = settle_payment(&mut a, true, T0 + 111);
    assert_eq!(
        out,
        ActOutcome::Sent {
            item: 1,
            amount: 12_000_000,
            recipient: RECIPIENT.into()
        }
    );
    assert_eq!(a.paid, 12_000_000);
    assert_eq!(a.items[0].status, ItemStatus::Paid);
    assert_eq!(a.receipts.len(), 1);
    assert!(a.in_flight.is_none());
    // Item 1 cannot be paid twice.
    assert_eq!(
        refused(agent_pay(&mut a, 1, 12_000_000, RECIPIENT, T0 + 120)),
        RefusalCode::AlreadyPaid
    );
}

#[test]
fn attack_redirect_amount_and_canary_are_refused_and_the_canary_revokes() {
    let mut a = ready_to_pay();
    assert_eq!(
        refused(agent_pay(&mut a, 1, 12_000_000, ATTACKER, T0 + 110)),
        RefusalCode::PayeeMismatch
    );
    assert_eq!(
        refused(agent_pay(&mut a, 1, 19_000_000, RECIPIENT, T0 + 111)),
        RefusalCode::AmountMismatch
    );
    assert_eq!(
        refused(agent_pay(&mut a, 1, 12_000_000, CANARY, T0 + 112)),
        RefusalCode::Canary
    );
    assert!(a.agent_key.is_none(), "a canary request revokes the key");
    assert!(a.canary_tripped);
    assert!(get_logs()
        .iter()
        .any(|l| l.contains("agent_key_revoked") && l.contains("canary")));
    // A call that lands between the revoke and its DeleteKey is refused, not paid.
    assert_eq!(
        refused(agent_pay(&mut a, 1, 12_000_000, RECIPIENT, T0 + 113)),
        RefusalCode::Revoked
    );
    assert_eq!(a.paid, 0);
    assert_eq!(a.refusal_seq, 4);
    let log = a.get_refusals(None, None);
    assert_eq!(
        log.iter().map(|r| r.code).collect::<Vec<_>>(),
        vec![
            RefusalCode::PayeeMismatch,
            RefusalCode::AmountMismatch,
            RefusalCode::Canary,
            RefusalCode::Revoked
        ]
    );
}

#[test]
#[should_panic(expected = "ERR_UNAUTHORIZED")]
fn act_from_an_unknown_key_panics() {
    let mut a = ready_to_pay();
    call(me().as_str(), Some([8; 32]), T0 + 110, vec![]);
    let _ = a.act(Action::Pay {
        item: 1,
        amount: 12_000_000,
        recipient: RECIPIENT.into(),
        memo: None,
    });
}

#[test]
#[should_panic(expected = "ERR_UNAUTHORIZED")]
fn act_from_another_account_panics() {
    let mut a = ready_to_pay();
    call(BUYER, Some(AGENT), T0 + 110, vec![]);
    let _ = a.act(Action::Pay {
        item: 1,
        amount: 12_000_000,
        recipient: RECIPIENT.into(),
        memo: None,
    });
}

#[test]
fn the_refusal_limit_revokes_the_key_and_only_counts_the_current_key() {
    let mut a = ready_to_pay();
    for i in 0..4 {
        assert_eq!(
            refused(agent_pay(&mut a, 1, 1, RECIPIENT, T0 + 110 + i)),
            RefusalCode::AmountMismatch
        );
    }
    assert!(a.agent_key.is_some());
    // The vendor's refused claims never count toward the agent's limit.
    call(VENDOR, None, T0 + 115, vec![]);
    assert_eq!(refused(a.claim(1)), RefusalCode::NotDue);
    assert!(a.agent_key.is_some());
    assert_eq!(
        refused(agent_pay(&mut a, 1, 1, RECIPIENT, T0 + 116)),
        RefusalCode::AmountMismatch
    );
    assert!(
        a.agent_key.is_none(),
        "the fifth refusal by the current key revokes it"
    );
}

#[test]
fn revoke_then_a_new_key_restores_service_only_when_the_buyer_installs_it() {
    let mut a = ready_to_pay();
    call(BUYER, None, T0 + 105, vec![]);
    a.revoke_agent();
    assert!(a.agent_key.is_none());
    assert_eq!(
        refused(agent_pay(&mut a, 1, 12_000_000, RECIPIENT, T0 + 106)),
        RefusalCode::Revoked
    );
    install_agent(&mut a, [10; 32]);
    call(me().as_str(), Some([10; 32]), T0 + 120, vec![]);
    let r = a.act(Action::Pay {
        item: 1,
        amount: 12_000_000,
        recipient: RECIPIENT.into(),
        memo: None,
    });
    assert!(matches!(r, PromiseOrValue::Promise(_)));
}

#[test]
fn a_payment_needs_evidence_and_the_window_lapse_counts_as_acceptance() {
    let mut a = executing(Kind::Procurement);
    fund(&mut a, 36_000_000);
    authorise_recipient(&mut a, RECIPIENT, T0 + 55);
    install_agent(&mut a, AGENT);
    assert_eq!(
        refused(agent_pay(&mut a, 2, 12_000_000, RECIPIENT, T0 + 70)),
        RefusalCode::NotDue
    );
    call(VENDOR, None, T0 + 80, vec![]);
    a.submit_delivery(2, "ee".repeat(32), "https://halcyon.example/d2".into());
    assert_eq!(
        refused(agent_pay(&mut a, 2, 12_000_000, RECIPIENT, T0 + 81)),
        RefusalCode::NotDue
    );
    // The 120 s acceptance window lapses with no dispute.
    assert!(matches!(
        agent_pay(&mut a, 2, 12_000_000, RECIPIENT, T0 + 201),
        PromiseOrValue::Promise(_)
    ));
}

#[test]
fn a_failed_transfer_leaves_the_item_payable_and_clears_the_lock() {
    let mut a = ready_to_pay();
    let _ = agent_pay(&mut a, 1, 12_000_000, RECIPIENT, T0 + 110);
    assert_eq!(
        refused(agent_pay(&mut a, 1, 12_000_000, RECIPIENT, T0 + 110)),
        RefusalCode::InFlight
    );
    let out = settle_payment(&mut a, false, T0 + 111);
    assert!(matches!(out, ActOutcome::Failed { .. }));
    assert!(a.in_flight.is_none());
    assert_eq!(a.paid, 0);
    assert_eq!(a.items[0].status, ItemStatus::Eligible);
}

#[test]
fn a_stale_lock_resolves_by_balance_and_a_late_callback_never_clears_a_newer_lock() {
    let mut a = ready_to_pay();
    let _ = agent_pay(&mut a, 1, 12_000_000, RECIPIENT, T0 + 110);
    let first = a.in_flight.clone().unwrap();
    // 600 blocks later, the balance equals the escrow before the payment: it cannot tell, so AssumedPaid.
    call("anyone.testnet", None, T0 + 110 + 600, vec![]);
    let _ = a.resolve_stale_lock();
    call(
        me().as_str(),
        None,
        T0 + 711,
        vec![PromiseResult::Successful(b"\"36000000\"".to_vec())],
    );
    a.on_stale_balance(first.payment_id);
    assert!(a.in_flight.is_none());
    assert_eq!(a.items[0].status, ItemStatus::AssumedPaid);
    assert_eq!(a.paid, 12_000_000);
    // A newer payment takes the lock; the old callback arrives late and fails: only its own item changes.
    deliver_and_accept(&mut a, 2, T0 + 720);
    let _ = agent_pay(&mut a, 2, 12_000_000, RECIPIENT, T0 + 730);
    let newer = a.in_flight.clone().unwrap();
    call(me().as_str(), None, T0 + 731, vec![PromiseResult::Failed]);
    a.on_payment_resolved(
        first.payment_id,
        1,
        U128(first.amount),
        acc(RECIPIENT),
        Via::Agent,
    );
    assert_eq!(
        a.in_flight.as_ref().map(|f| f.payment_id),
        Some(newer.payment_id)
    );
    assert_eq!(a.items[0].status, ItemStatus::Eligible);
    assert_eq!(a.paid, 0);
}

#[test]
fn an_approved_exception_reopens_an_assumed_payment_once() {
    let mut a = ready_to_pay();
    let _ = agent_pay(&mut a, 1, 12_000_000, RECIPIENT, T0 + 110);
    let f = a.in_flight.clone().unwrap();
    call("anyone.testnet", None, T0 + 710, vec![]);
    let _ = a.resolve_stale_lock();
    call(
        me().as_str(),
        None,
        T0 + 711,
        vec![PromiseResult::Successful(b"\"36000000\"".to_vec())],
    );
    a.on_stale_balance(f.payment_id);
    call(VENDOR, None, T0 + 720, vec![]);
    let id = a.request_exception(1, U128(12_000_000), false, "transfer not received".into());
    call(BUYER, None, T0 + 721, vec![]);
    a.approve_exception(id);
    assert_eq!(a.items[0].status, ItemStatus::Eligible);
    assert_eq!(a.paid, 0);
    assert!(matches!(
        agent_pay(&mut a, 1, 12_000_000, RECIPIENT, T0 + 730),
        PromiseOrValue::Promise(_)
    ));
}

#[test]
fn an_agent_exception_waits_for_the_buyer_and_then_pays_the_exception_amount() {
    let mut a = ready_to_pay();
    call(me().as_str(), Some(AGENT), T0 + 110, vec![]);
    let r = a.act(Action::RequestException {
        item: 2,
        amount: 9_000_000,
        waive_evidence: true,
        reason: "partial scope".into(),
    });
    let PromiseOrValue::Value(ActOutcome::ExceptionRequested { id }) = r else {
        panic!("expected a request")
    };
    assert_eq!(
        refused(agent_pay(&mut a, 2, 9_000_000, RECIPIENT, T0 + 111)),
        RefusalCode::NotDue
    );
    call(BUYER, None, T0 + 112, vec![]);
    a.approve_exception(id);
    assert_eq!(
        refused(agent_pay(&mut a, 2, 12_000_000, RECIPIENT, T0 + 113)),
        RefusalCode::AmountMismatch
    );
    assert!(matches!(
        agent_pay(&mut a, 2, 9_000_000, RECIPIENT, T0 + 114),
        PromiseOrValue::Promise(_)
    ));
}

#[test]
fn the_vendor_claims_after_revocation_once_the_delay_has_passed() {
    let mut a = ready_to_pay();
    call(BUYER, None, T0 + 105, vec![]);
    a.revoke_agent();
    call(VENDOR, None, T0 + 150, vec![]);
    assert_eq!(refused(a.claim(1)), RefusalCode::NotDue);
    call(VENDOR, None, T0 + 101 + 120, vec![]);
    assert!(matches!(a.claim(1), PromiseOrValue::Promise(_)));
    assert_eq!(a.in_flight.as_ref().unwrap().via, Via::Claim);
}

#[test]
fn a_recipient_change_waits_the_timelock_and_the_old_one_stays_current() {
    let mut a = ready_to_pay();
    call(VENDOR, None, T0 + 200, vec![]);
    let v2 = a.propose_recipient(acc("halcyon-mm2.testnet"), "halcyon.example".into());
    let out = payee_output(v2, "halcyon-mm2.testnet", "allow");
    call(
        me().as_str(),
        None,
        T0 + 201,
        vec![PromiseResult::Successful(out.to_string().into_bytes())],
    );
    a.on_payee_proof(v2);
    call(AUTH, None, T0 + 202, vec![]);
    a.approve_recipient(v2);
    call(BUYER, None, T0 + 203, vec![]);
    a.accept_recipient(v2, false);
    assert_eq!(
        refused(agent_pay(
            &mut a,
            1,
            12_000_000,
            "halcyon-mm2.testnet",
            T0 + 210
        )),
        RefusalCode::PayeeMismatch
    );
    assert!(matches!(
        agent_pay(&mut a, 1, 12_000_000, RECIPIENT, T0 + 211),
        PromiseOrValue::Promise(_)
    ));
    settle_payment(&mut a, true, T0 + 212);
    call("anyone.testnet", None, T0 + 250, vec![]);
    let early = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| a.activate_recipient(v2)));
    assert!(early.is_err(), "the timelock has not passed");
    call("anyone.testnet", None, T0 + 203 + 120, vec![]);
    a.activate_recipient(v2);
    assert_eq!(
        a.current_recipient_account().unwrap().as_str(),
        "halcyon-mm2.testnet"
    );
}

#[test]
#[should_panic(expected = "ERR_DOMAIN_PINNED")]
fn a_later_version_cannot_move_the_domain() {
    let mut a = ready_to_pay();
    call(VENDOR, None, T0 + 200, vec![]);
    a.propose_recipient(acc(ATTACKER), "halcyon-markets.example".into());
}

#[test]
fn a_canary_recipient_is_rated_block_and_cannot_be_accepted() {
    let mut a = executing(Kind::Procurement);
    call(VENDOR, None, T0 + 50, vec![]);
    let v = a.propose_recipient(acc(CANARY), "halcyon.example".into());
    let out = payee_output(v, CANARY, "allow");
    call(
        me().as_str(),
        None,
        T0 + 51,
        vec![PromiseResult::Successful(out.to_string().into_bytes())],
    );
    a.on_payee_proof(v);
    assert_eq!(a.recipients[0].rating, Some(Rating::Block));
}

#[test]
fn a_forged_payee_proof_fails() {
    let mut a = executing(Kind::Procurement);
    call(VENDOR, None, T0 + 50, vec![]);
    let v = a.propose_recipient(acc(RECIPIENT), "halcyon.example".into());
    let mut out = payee_output(v, RECIPIENT, "allow");
    out["account"] = json!(ATTACKER);
    call(
        me().as_str(),
        None,
        T0 + 51,
        vec![PromiseResult::Successful(out.to_string().into_bytes())],
    );
    a.on_payee_proof(v);
    assert_eq!(a.recipients[0].status, RecipientStatus::ProofFailed);
}

#[test]
fn a_bad_sealed_signature_retries_and_three_failures_end_in_no_deal() {
    let mut a = new_agreement(Kind::Procurement);
    commit_both(&mut a);
    for attempt in 1..=3u8 {
        call("accord-keeper.testnet", None, T0, vec![]);
        let _ = a.start_negotiation();
        let mut out = sealed_output(&a, &procurement_terms());
        out["rounds"] = json!(3); // altered after signing
        call(
            me().as_str(),
            None,
            T0 + 1,
            vec![PromiseResult::Successful(out.to_string().into_bytes())],
        );
        a.on_sealed_result(nonce(&a));
        if attempt < 3 {
            assert_eq!(a.negotiation, Negotiation::Ready { attempts: attempt });
        }
    }
    assert_eq!(a.state, State::NoDeal);
}

#[test]
fn sealed_output_for_another_agreement_or_wrong_params_is_refused() {
    let mut a = new_agreement(Kind::Procurement);
    commit_both(&mut a);
    call("accord-keeper.testnet", None, T0, vec![]);
    let _ = a.start_negotiation();
    let mut terms = procurement_terms();
    terms.params_hash = [0; 32];
    let out = sealed_output(&a, &terms);
    call(
        me().as_str(),
        None,
        T0 + 1,
        vec![PromiseResult::Successful(out.to_string().into_bytes())],
    );
    a.on_sealed_result(nonce(&a));
    assert_eq!(a.state, State::Sealed);
    let _ = a.start_negotiation();
    let mut out = sealed_output(&a, &procurement_terms());
    out["agreement"] = json!("a8.accord-v1.testnet");
    let out = sign(SEALED, out);
    call(
        me().as_str(),
        None,
        T0 + 2,
        vec![PromiseResult::Successful(out.to_string().into_bytes())],
    );
    a.on_sealed_result(nonce(&a));
    assert_eq!(a.state, State::Sealed);
}

#[test]
#[should_panic(expected = "ERR_LOW_GAS")]
fn an_underfunded_call_cannot_start_a_negotiation() {
    let mut a = new_agreement(Kind::Procurement);
    commit_both(&mut a);
    let mut b = VMContextBuilder::new();
    b.current_account_id(me())
        .predecessor_account_id(acc(BUYER))
        .prepaid_gas(gas(100))
        .account_balance(NearToken::from_near(5));
    testing_env!(b.build());
    let _ = a.start_negotiation();
}

#[test]
#[should_panic(expected = "ERR_HASH_MISMATCH")]
fn approval_needs_the_same_terms_hash() {
    let mut a = new_agreement(Kind::Procurement);
    commit_both(&mut a);
    call("accord-keeper.testnet", None, T0, vec![]);
    let _ = a.start_negotiation();
    let out = sealed_output(&a, &procurement_terms());
    call(
        me().as_str(),
        None,
        T0 + 1,
        vec![PromiseResult::Successful(out.to_string().into_bytes())],
    );
    a.on_sealed_result(nonce(&a));
    call(BUYER, None, T0 + 2, vec![]);
    a.approve_terms("00".repeat(32));
}

#[test]
fn close_pays_eligible_items_sets_aside_without_recipient_and_refunds_the_rest() {
    let mut a = executing(Kind::Procurement);
    fund(&mut a, 36_000_000);
    deliver_and_accept(&mut a, 1, T0 + 100);
    // After the term and the grace: item 1 has no recipient, so it is reserved for the vendor's claim.
    let end = T0 + 40 + 3600 + 600;
    call("anyone.testnet", None, end, vec![]);
    assert_eq!(a.close(), CloseStep::Reserved { item: 1 });
    assert_eq!(a.reserved, 12_000_000);
    call("anyone.testnet", None, end + 1, vec![]);
    assert_eq!(a.close(), CloseStep::Settling);
    call(
        me().as_str(),
        None,
        end + 2,
        vec![PromiseResult::Successful(b"\"36000000\"".to_vec())],
    );
    a.on_close_balance();
    assert_eq!(a.state, State::Settled);
    assert!(get_logs()
        .iter()
        .any(|l| l.contains("\"settled\"") && l.contains("\"refunded\":\"24000000\"")));
    // After Settled, the vendor proves a recipient and claims the reserved item.
    authorise_recipient(&mut a, RECIPIENT, end + 10);
    call(VENDOR, None, end + 10 + 120, vec![]);
    assert!(matches!(a.claim(1), PromiseOrValue::Promise(_)));
    settle_payment(&mut a, true, end + 131);
    assert_eq!(a.reserved, 0);
    assert_eq!(a.items[0].status, ItemStatus::Paid);
}

#[test]
#[should_panic(expected = "ERR_TOO_EARLY")]
fn close_waits_for_the_end_of_the_term() {
    let mut a = executing(Kind::Procurement);
    call("anyone.testnet", None, T0 + 100, vec![]);
    a.close();
}

#[test]
fn mutual_close_settles_early_without_paying_unearned_items() {
    let mut a = ready_to_pay();
    call(BUYER, None, T0 + 120, vec![]);
    assert!(a.mutual_close().is_none());
    call(VENDOR, None, T0 + 121, vec![]);
    assert_eq!(a.mutual_close(), Some(CloseStep::Paying { item: 1 }));
    settle_payment(&mut a, true, T0 + 122);
    call("anyone.testnet", None, T0 + 123, vec![]);
    assert_eq!(a.close(), CloseStep::Settling);
}

fn observation(a: &Agreement, period: u32, slot: u8, spread: u32) -> Observation {
    let at = a.terms.get().as_ref().unwrap().atlas.clone().unwrap();
    let (start, _) = accord_core::atlas::slot_window(
        a.period_start(period, &at),
        at.period_secs,
        at.slots_per_period,
        slot,
    );
    Observation {
        agreement: me().to_string(),
        period,
        slot,
        slot_time: start + 5,
        venue: venue(),
        band_bps: 200,
        venue_block: BlockRef {
            height: 100 + u64::from(slot),
            hash: "h".into(),
            time: start + 6,
        },
        mid: "2.104".into(),
        spread_bps: spread,
        depth_bid: 200_000_000,
        depth_ask: 900_000_000,
        two_sided: true,
    }
}

fn observe(a: &mut Agreement, o: Observation, key: [u8; 32]) -> String {
    let signed = sign(key, evidence::observation_payload(&o, ""));
    let sig = signed["sig"].as_str().unwrap().to_string();
    call(
        "accord-keeper.testnet",
        None,
        o.venue_block.time + 1,
        vec![],
    );
    a.record_observation(o, sig)
}

#[test]
fn atlas_period_eligible_with_four_passes_then_paid() {
    let mut a = executing(Kind::MarketMaking);
    fund(&mut a, 24_000_000);
    authorise_recipient(&mut a, RECIPIENT, T0 + 55);
    install_agent(&mut a, AGENT);
    for (slot, spread) in [(0, 41), (1, 45), (2, 70), (3, 49), (4, 52), (5, 80)] {
        let o = observation(&a, 0, slot, spread);
        assert_eq!(observe(&mut a, o, OBSERVER), "recorded");
    }
    assert_eq!(
        refused(agent_pay(&mut a, 1, 6_000_000, RECIPIENT, T0 + 100)),
        RefusalCode::NotDue
    );
    call("anyone.testnet", None, T0 + 40 + 360 + 60, vec![]);
    assert_eq!(a.close_period(0), PeriodOutcome::Eligible);
    assert_eq!(a.periods[0].passed, 4);
    assert!(matches!(
        agent_pay(&mut a, 1, 6_000_000, RECIPIENT, T0 + 470),
        PromiseOrValue::Promise(_)
    ));
}

#[test]
fn atlas_withheld_needs_the_buyer_and_review_when_unobserved() {
    let mut a = executing(Kind::MarketMaking);
    fund(&mut a, 24_000_000);
    authorise_recipient(&mut a, RECIPIENT, T0 + 55);
    install_agent(&mut a, AGENT);
    for slot in 0..6 {
        let o = observation(&a, 0, slot, 90);
        observe(&mut a, o, OBSERVER);
    }
    call("anyone.testnet", None, T0 + 40 + 360 + 60, vec![]);
    assert_eq!(a.close_period(0), PeriodOutcome::Withheld);
    assert_eq!(
        refused(agent_pay(&mut a, 1, 6_000_000, RECIPIENT, T0 + 470)),
        RefusalCode::PeriodWithheld
    );
    // Period 2 with nothing observed: Review, the buyer decides.
    call("anyone.testnet", None, T0 + 40 + 720 + 60, vec![]);
    assert_eq!(a.close_period(1), PeriodOutcome::Review);
    call(BUYER, None, T0 + 900, vec![]);
    a.resolve_period(1, true);
    assert!(matches!(
        agent_pay(&mut a, 2, 6_000_000, RECIPIENT, T0 + 901),
        PromiseOrValue::Promise(_)
    ));
}

#[test]
fn a_conflicting_observation_is_logged_never_stored_and_the_period_goes_to_review() {
    let mut a = executing(Kind::MarketMaking);
    for slot in 0..6 {
        let o = observation(&a, 0, slot, 40);
        observe(&mut a, o, OBSERVER);
    }
    let copy = observation(&a, 0, 2, 40);
    assert_eq!(observe(&mut a, copy, OBSERVER), "duplicate");
    let other = observation(&a, 0, 2, 41);
    assert_eq!(observe(&mut a, other, OBSERVER), "conflict");
    assert_eq!(
        a.observations.get(&(0, 2)).unwrap().observation.spread_bps,
        40
    );
    call("anyone.testnet", None, T0 + 40 + 360 + 60, vec![]);
    assert_eq!(a.close_period(0), PeriodOutcome::Review);
}

#[test]
#[should_panic(expected = "ERR_BAD_SIGNATURE")]
fn a_forged_observation_is_refused() {
    let mut a = executing(Kind::MarketMaking);
    let o = observation(&a, 0, 0, 40);
    observe(&mut a, o, [7; 32]);
}

#[test]
#[should_panic(expected = "ERR_OUT_OF_WINDOW")]
fn an_observation_outside_its_slot_window_is_refused() {
    let mut a = executing(Kind::MarketMaking);
    let mut o = observation(&a, 0, 0, 40);
    o.slot_time += 60;
    o.venue_block.time += 60;
    observe(&mut a, o, OBSERVER);
}

#[test]
#[should_panic(expected = "ERR_NOT_BUYER")]
fn only_the_buyer_funds() {
    let mut a = executing(Kind::Procurement);
    call(token().as_str(), None, T0 + 50, vec![]);
    a.ft_on_transfer(acc(VENDOR), U128(1), "fund".into());
}

#[test]
fn no_view_exposes_a_mandate_in_plaintext() {
    let a = executing(Kind::Procurement);
    let c = a.get_commitments().to_string();
    assert!(c.contains("ciphertext"));
    assert!(!c.contains("limits") && !c.contains("instructions"));
}

mod act_fuzz;

// ---------------------------------------------------------------------------------------------------------------
// Audit fixes (9 Nov 2026, DECISIONS.md section 25). Each test asserts the fixed behaviour.
// ---------------------------------------------------------------------------------------------------------------

fn panics<R>(f: impl FnOnce() -> R) -> bool {
    std::panic::catch_unwind(std::panic::AssertUnwindSafe(f)).is_err()
}

/// L2-1: the keeper's F1 path turned any bytes into a failed attempt; three garbage submissions ended the
/// negotiation in `NoDeal`. Fixed: an output that does not fully verify is refused (`ERR_BAD_OUTPUT`) before any
/// state changes, so no attempt is counted. (`submit_sealed_result` is compiled only with the `f1` feature; the
/// release build has none.)
#[test]
fn audit_keeper_garbage_is_refused_and_burns_no_attempt() {
    let mut a = new_agreement(Kind::Procurement);
    commit_both(&mut a);
    call("anyone.testnet", None, T0, vec![]);
    let _ = a.start_negotiation();
    for garbage in ["not a signed output", "{}"] {
        call("accord-keeper.testnet", None, T0 + 1, vec![]);
        assert!(panics(|| a.submit_sealed_result(garbage.into())));
    }
    // A validly signed infrastructure outcome is not a verified result either.
    let infra = sign(
        SEALED,
        json!({"mode": "negotiate", "agreement": me(), "request_nonce": nonce(&a), "release": 1,
               "buyer_commitment": "11".repeat(32), "vendor_commitment": "22".repeat(32),
               "outcome": "infrastructure", "error": "x"}),
    );
    call("accord-keeper.testnet", None, T0 + 1, vec![]);
    assert!(panics(|| a.submit_sealed_result(infra.to_string())));
    assert!(matches!(
        a.negotiation,
        Negotiation::Requested { attempt: 1, .. }
    ));
    assert_eq!(a.state, State::Sealed);
}

/// L2-1: a garbage submission ahead of the real callback used to discard a valid outcome.
#[test]
fn audit_keeper_garbage_cannot_discard_the_real_answer() {
    let mut a = new_agreement(Kind::Procurement);
    commit_both(&mut a);
    call("anyone.testnet", None, T0, vec![]);
    let _ = a.start_negotiation();
    let n = nonce(&a);
    let out = sealed_output(&a, &procurement_terms());
    call("accord-keeper.testnet", None, T0 + 1, vec![]);
    assert!(panics(|| a.submit_sealed_result("{}".into())));
    call(
        me().as_str(),
        None,
        T0 + 30,
        vec![PromiseResult::Successful(out.to_string().into_bytes())],
    );
    a.on_sealed_result(n);
    assert_eq!(
        a.state,
        State::Attested,
        "the valid signed terms were thrown away"
    );
}

/// L5 (finding 4): after a signed `infrastructure` outcome the agreement is `Ready` again, and a party used to be able
/// to replace its commitment, so the next attempt negotiated a different pair (a buyer could probe with an off-curve
/// doc key, learn "a deal existed", and retune). Fixed: one negotiation per pair of commitments, so a mandate is
/// final once an attempt has run; the retry uses the same pair.
#[test]
fn audit_a_mandate_cannot_be_replaced_after_an_attempt() {
    let mut a = new_agreement(Kind::Procurement);
    commit_both(&mut a);
    // Before any attempt a party may still replace its mandate.
    call(BUYER, None, T0, vec![]);
    a.commit_mandate(
        "11".repeat(32),
        Base64VecU8(vec![1, 2, 3]),
        "02".to_string() + &"ab".repeat(32),
        pk([4; 32]),
    );
    call("accord-keeper.testnet", None, T0, vec![]);
    let _ = a.start_negotiation();
    let out = sign(
        SEALED,
        json!({"mode": "negotiate", "agreement": me(), "request_nonce": nonce(&a), "release": 1,
               "buyer_commitment": "11".repeat(32), "vendor_commitment": "22".repeat(32),
               "outcome": "infrastructure", "error": "document encryption: InvalidPublicKey"}),
    );
    call(
        me().as_str(),
        None,
        T0 + 1,
        vec![PromiseResult::Successful(out.to_string().into_bytes())],
    );
    a.on_sealed_result(nonce(&a));
    assert_eq!(a.negotiation, Negotiation::Ready { attempts: 1 });
    call(BUYER, None, T0 + 2, vec![]);
    assert!(
        panics(|| a.commit_mandate(
            "33".repeat(32),
            Base64VecU8(vec![9]),
            "02".to_string() + &"cd".repeat(32),
            pk([4; 32]),
        )),
        "the buyer replaced its mandate after a completed attempt"
    );
    // The retry runs on the same pair.
    call("accord-keeper.testnet", None, T0 + 3, vec![]);
    let _ = a.start_negotiation();
    assert!(matches!(
        a.negotiation,
        Negotiation::Requested { attempt: 2, .. }
    ));
}

fn agent_act(a: &mut Agreement, action: Action, at: u64) -> PromiseOrValue<ActOutcome> {
    call(me().as_str(), Some(AGENT), at, vec![]);
    a.act(action)
}

/// L1-1a/b (finding 8): the refusal's recipient was an unvalidated string, stored in the ring and logged in full, and
/// past the 16 KB log limit the refusal itself aborted. Fixed: a recipient longer than 64 bytes or not an account id
/// is malformed input and panics before any gate (nothing stored); a valid stranger is still a recorded refusal.
#[test]
fn audit_a_recipient_must_be_an_account_id_before_any_gate() {
    let mut a = ready_to_pay();
    for junk in [
        "x".repeat(65),
        "x".repeat(17_000),
        "Not An Account".into(),
        "a..b".into(),
    ] {
        let before = a.refusal_seq;
        assert!(
            panics(|| agent_pay(&mut a, 1, 12_000_000, &junk, T0 + 110)),
            "{} bytes accepted",
            junk.len()
        );
        assert_eq!(a.refusal_seq, before);
    }
    assert_eq!(
        refused(agent_pay(&mut a, 1, 12_000_000, ATTACKER, T0 + 111)),
        RefusalCode::PayeeMismatch
    );
}

/// L2-2 (finding 8): a non-canonical spelling of a canary was refused as `PayeeMismatch` (money safe) but the key was
/// not revoked and nothing reported. Fixed: canaries are compared case-insensitively, so the tripwire fires.
#[test]
fn audit_a_canary_spelling_variant_still_revokes() {
    let mut a = ready_to_pay();
    let r = refused(agent_pay(
        &mut a,
        1,
        12_000_000,
        &CANARY.to_uppercase(),
        T0 + 110,
    ));
    assert_eq!(r, RefusalCode::Canary);
    assert!(
        a.agent_key.is_none(),
        "canary variant refused as {r:?} and the key survived"
    );
}

/// L2-3 (finding 8): the allowance was the buyer's free choice up to 5 NEAR; `params.agent_allowance`, fixed at
/// creation and approved through `params_hash`, was never read. Fixed: it is the ceiling.
#[test]
fn audit_install_agent_key_respects_the_params_allowance() {
    let mut a = ready_to_pay();
    call(BUYER, None, T0 + 60, vec![]);
    assert!(panics(|| a.install_agent_key(
        pk([11; 32]),
        U128(5_000_000_000_000_000_000_000_000)
    )));
    call(BUYER, None, T0 + 60, vec![]);
    let _ = a.install_agent_key(pk([11; 32]), U128(params().agent_allowance));
    assert_eq!(a.agent_key, Some(pk([11; 32])));
}

/// L2-4 (finding 8): a repeated `RequestException` on an item with a pending exception was neither recorded nor
/// counted, so the refusal limit never revoked an agent that looped on it. Fixed: a repeat is a recorded refusal
/// (`ERR_CAP_EXCEEDED`, one pending request per item) and counts.
#[test]
fn audit_repeated_exception_requests_count_toward_the_limit() {
    let mut a = ready_to_pay();
    let ask = || Action::RequestException {
        item: 2,
        amount: 1,
        waive_evidence: true,
        reason: "x".into(),
    };
    assert!(matches!(
        agent_act(&mut a, ask(), T0 + 110),
        PromiseOrValue::Value(ActOutcome::ExceptionRequested { .. })
    ));
    for i in 0..u64::from(params().refusal_limit) {
        assert_eq!(
            refused(agent_act(&mut a, ask(), T0 + 111 + i)),
            RefusalCode::CapExceeded
        );
    }
    assert!(
        a.agent_key.is_none(),
        "identical requests and the key is still installed"
    );
}

/// L1-2 (finding 8): a compromised agent could fill all 16 exception slots with requests the buyer rejects, which
/// never count as refusals, so the vendor (and the AssumedPaid recovery path) could never get an exception. Fixed:
/// the agent's requests have their own cap (half the slots); past it a request is a counted refusal.
#[test]
fn audit_the_agent_cannot_exhaust_the_exception_slots() {
    let mut a = ready_to_pay();
    let mut asked = 0;
    for i in 0..MAX_EXCEPTIONS {
        let item = 1 + (i % 3);
        match agent_act(
            &mut a,
            Action::RequestException {
                item,
                amount: 1,
                waive_evidence: true,
                reason: "x".into(),
            },
            T0 + 110 + u64::from(i),
        ) {
            PromiseOrValue::Value(ActOutcome::ExceptionRequested { id }) => {
                asked += 1;
                call(BUYER, None, T0 + 110 + u64::from(i), vec![]);
                a.reject_exception(id);
            }
            // Past its cap the agent is refused, and the refusal limit then revokes its key.
            PromiseOrValue::Value(ActOutcome::Refused { code, .. }) => assert!(matches!(
                code,
                RefusalCode::CapExceeded | RefusalCode::Revoked
            )),
            _ => panic!("expected a request or a refusal"),
        }
    }
    assert_eq!(asked, MAX_AGENT_EXCEPTIONS);
    call(VENDOR, None, T0 + 200, vec![]);
    let _ = a.request_exception(2, U128(12_000_000), false, "real".into());
}

/// L1-3 (finding 8): the vendor's refused claims shared the 128-slot ring and evicted the agent's attack record.
/// Fixed: a claim's refusal is an event only, as close's are; the ring keeps the agent's record.
#[test]
fn audit_vendor_claims_never_evict_agent_refusals() {
    let mut a = ready_to_pay();
    assert_eq!(
        refused(agent_pay(&mut a, 1, 12_000_000, ATTACKER, T0 + 110)),
        RefusalCode::PayeeMismatch
    );
    for i in 0..REFUSAL_RING {
        call(VENDOR, None, T0 + 111 + i, vec![]);
        assert_eq!(refused(a.claim(99)), RefusalCode::UnknownItem);
    }
    assert!(get_logs()
        .iter()
        .any(|l| l.contains("act_refused") && l.contains("\"claim\"")));
    let log = a.get_refusals(None, None);
    assert!(
        log.iter().any(|r| r.code == RefusalCode::PayeeMismatch),
        "the agent's PayeeMismatch refusal is gone from the on-chain log"
    );
}

/// L1-1c (finding 8): the agent's key outlived the agreement. Fixed: reaching `Settled` revokes it.
#[test]
fn audit_settled_revokes_the_agent_key() {
    let mut a = ready_to_pay();
    let end = T0 + 40 + 3600 + 600;
    call("anyone.testnet", None, end, vec![]);
    let mut steps = 0;
    while a.state == State::Executing {
        match a.close() {
            CloseStep::Paying { .. } => {
                settle_payment(&mut a, true, end);
            }
            CloseStep::Settling => {
                call(
                    me().as_str(),
                    None,
                    end + 1,
                    vec![PromiseResult::Successful(b"\"24000000\"".to_vec())],
                );
                a.on_close_balance();
            }
            _ => {}
        }
        steps += 1;
        assert!(steps < 10);
        call("anyone.testnet", None, end, vec![]);
    }
    assert_eq!(a.state, State::Settled);
    assert!(
        a.agent_key.is_none(),
        "the agent's key outlived the agreement"
    );
}

/// Sets the environment for one call with no attached deposit (a function-call access key cannot attach one).
fn call_unpaid(pred: &str, at: u64) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(me())
        .predecessor_account_id(acc(pred))
        .signer_account_id(acc(pred))
        .block_timestamp(at * 1_000_000_000)
        .block_height(at)
        .account_balance(NearToken::from_near(5))
        .attached_deposit(NearToken::from_yoctonear(0))
        .prepaid_gas(gas(300));
    testing_env!(b.build());
}

fn needs_one_yocto<R>(f: impl FnOnce() -> R) -> bool {
    match std::panic::catch_unwind(std::panic::AssertUnwindSafe(f)) {
        Ok(_) => false,
        Err(e) => e
            .downcast_ref::<String>()
            .is_some_and(|m| m.contains("1 yoctoNEAR")),
    }
}

/// L2-6 / L3-F6 (finding 8): the buyer's, the authority's and the parties' sensitive methods took no deposit, so a
/// function-call access key a dapp holds for the principal's account could call them. Fixed: each needs exactly
/// 1 yoctoNEAR, which only a full-access key can attach.
#[test]
fn audit_sensitive_methods_need_one_yocto() {
    let mut a = ready_to_pay();
    let t = T0 + 120;
    let checks: Vec<(&str, Box<dyn FnOnce(&mut Agreement)>)> = vec![
        (
            BUYER,
            Box::new(|a| {
                let _ = a.install_agent_key(pk([12; 32]), U128(crate::payments::MIN_ALLOWANCE));
            }),
        ),
        (BUYER, Box::new(|a| a.accept_recipient(1, false))),
        (BUYER, Box::new(|a| a.approve_exception(0))),
        (BUYER, Box::new(|a| a.resolve_period(0, true))),
        (BUYER, Box::new(|a| a.accept_delivery(2))),
        (BUYER, Box::new(|a| a.approve_terms("00".repeat(32)))),
        (
            BUYER,
            Box::new(|a| {
                let _ = a.mutual_close();
            }),
        ),
        (
            BUYER,
            Box::new(|a| {
                let _ = a.withdraw_near();
            }),
        ),
        (AUTH, Box::new(|a| a.approve_recipient(1))),
    ];
    for (i, (who, f)) in checks.into_iter().enumerate() {
        call_unpaid(who, t);
        assert!(
            needs_one_yocto(|| f(&mut a)),
            "method {i} ran without 1 yoctoNEAR"
        );
    }
}

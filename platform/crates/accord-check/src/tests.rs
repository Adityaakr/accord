use super::*;
use proptest::prelude::*;
use serde_json::json;

const R: &str = "halcyon-mm.testnet";

fn agreement() -> serde_json::Value {
    json!({
        "state": "Executing", "kind": "procurement",
        "canaries": ["halcyon-mm-payments.testnet", "halcyon-treasury.testnet"],
        "recipient": {"version": 1, "account": R},
        "funded": "32000000", "paid": "0", "reserved": "0", "refunded": "0", "total": "32000000",
        "in_flight": null, "closing": false, "agent_key": "ed25519:x", "periods": [], "now": 1000
    })
}

fn items() -> serde_json::Value {
    json!([
        {"id": 1, "amount": "12000000", "evidence": "DeliveryAccepted", "status": "Eligible", "delivery": null, "exception": null},
        {"id": 2, "amount": "12000000", "evidence": "DeliveryAccepted", "status": "Delivered",
         "delivery": {"window_end": 2000}, "exception": null},
        {"id": 3, "amount": "8000000", "evidence": "DeliveryAccepted", "status": "Disputed",
         "delivery": {"window_end": 900}, "exception": null},
        {"id": 4, "amount": "8000000", "evidence": "DeliveryAccepted", "status": "Paid", "delivery": null, "exception": null}
    ])
}

fn run(
    a: serde_json::Value,
    items: serde_json::Value,
    rules: &str,
    item: u32,
    amount: &str,
    to: &str,
) -> Answer {
    let input: Input = serde_json::from_value(json!({
        "agreement": a, "items": items, "rules": rules,
        "request": {"item": item, "amount": amount, "recipient": to}
    }))
    .unwrap();
    check(&input)
}

fn code(a: &Answer) -> Option<&str> {
    a.code.as_deref()
}

#[test]
fn an_eligible_item_to_the_recipient_at_its_amount_pays() {
    let x = run(agreement(), items(), "release4", 1, "12000000", R);
    assert_eq!(x.verdict, Verdict::Pay);
    assert!(x.gates.iter().all(|g| g.status == GateStatus::Pass));
}

#[test]
fn each_refusal_comes_from_check_pay() {
    let cases: [(u32, &str, &str, &str); 6] = [
        (
            1,
            "12000000",
            "halcyon-markets.testnet",
            "ERR_PAYEE_MISMATCH",
        ),
        (1, "12000000", "halcyon-treasury.testnet", "ERR_CANARY"),
        (1, "12000001", R, "ERR_AMOUNT_MISMATCH"),
        (2, "12000000", R, "ERR_NOT_DUE"),
        (3, "8000000", R, "ERR_NOT_DUE"),
        (4, "8000000", R, "ERR_ALREADY_PAID"),
    ];
    for (item, amount, to, want) in cases {
        let x = run(agreement(), items(), "release4", item, amount, to);
        assert_eq!(code(&x), Some(want), "item {item} {amount} {to}");
        assert_eq!(x.verdict, Verdict::Refuse);
    }
    assert_eq!(
        code(&run(agreement(), items(), "release4", 9, "1", R)),
        Some("ERR_UNKNOWN_ITEM")
    );
}

#[test]
fn a_lapsed_window_counts_as_accepted_at_the_block_time() {
    let mut a = agreement();
    a["now"] = json!(2000);
    let x = run(a, items(), "release4", 2, "12000000", R);
    assert_eq!(x.verdict, Verdict::Pay);
    assert_eq!(x.facts.item_status, Some(ItemStatus::Eligible));
}

#[test]
fn no_agent_key_means_only_a_revoked_key_reaches_the_gates() {
    let mut a = agreement();
    a["agent_key"] = json!(null);
    a["state"] = json!("Settled");
    let x = run(a, items(), "release4", 1, "12000000", R);
    assert_eq!(code(&x), Some("ERR_REVOKED"));
    assert!(!x.facts.agent_key);
}

#[test]
fn release_4_panics_on_a_malformed_recipient_and_catches_a_canary_in_capitals() {
    let x = run(
        agreement(),
        items(),
        "release4",
        1,
        "12000000",
        "Not An Account",
    );
    assert_eq!(x.verdict, Verdict::Panic);
    assert_eq!(code(&x), Some("ERR_BAD_RECIPIENT"));
    let x = run(
        agreement(),
        items(),
        "release4",
        1,
        "12000000",
        "HALCYON-TREASURY.testnet",
    );
    assert_eq!(code(&x), Some("ERR_CANARY"));
    // release 3 took the recipient as given: the same spelling is a plain mismatch
    let x = run(
        agreement(),
        items(),
        "release3",
        1,
        "12000000",
        "HALCYON-TREASURY.testnet",
    );
    assert_eq!(code(&x), Some("ERR_PAYEE_MISMATCH"));
}

#[test]
fn spendable_follows_pay_ctx() {
    let mut a = agreement();
    a["reserved"] = json!("12000000");
    a["refunded"] = json!("12000000");
    // 32 - 12 - 12 = 8 spendable: 12 does not fit
    let x = run(a, items(), "release4", 1, "12000000", R);
    assert_eq!(code(&x), Some("ERR_INSUFFICIENT_FUNDS"));
    assert_eq!(x.facts.available, 8_000_000);
    let mut a = agreement();
    a["closing"] = json!(true);
    assert_eq!(
        code(&run(a, items(), "release4", 1, "12000000", R)),
        Some("ERR_IN_FLIGHT")
    );
}

#[test]
fn market_making_reads_the_period_outcome() {
    let mut a = agreement();
    a["kind"] = json!("market-making");
    a["periods"] = json!(["Eligible", "Withheld", "Open"]);
    let it = json!([
        {"id": 1, "amount": "5000000", "evidence": {"PeriodEligible": {"period": 0}}, "status": "Open", "delivery": null, "exception": null},
        {"id": 2, "amount": "5000000", "evidence": {"PeriodEligible": {"period": 1}}, "status": "Open", "delivery": null, "exception": null},
        {"id": 3, "amount": "5000000", "evidence": {"PeriodEligible": {"period": 2}}, "status": "Open", "delivery": null,
         "exception": {"amount": "4000000", "waive_evidence": true}}
    ]);
    assert_eq!(
        run(a.clone(), it.clone(), "release4", 1, "5000000", R).verdict,
        Verdict::Pay
    );
    assert_eq!(
        code(&run(a.clone(), it.clone(), "release4", 2, "5000000", R)),
        Some("ERR_PERIOD_WITHHELD")
    );
    assert_eq!(
        code(&run(a.clone(), it.clone(), "release4", 3, "5000000", R)),
        Some("ERR_AMOUNT_MISMATCH")
    );
    assert_eq!(
        run(a, it, "release4", 3, "4000000", R).verdict,
        Verdict::Pay
    );
}

#[test]
fn later_gates_are_still_shown_after_the_first_failure() {
    // wrong recipient and wrong amount: the contract stops at gate 2, the list shows gate 5 failing too
    let x = run(
        agreement(),
        items(),
        "release4",
        1,
        "1",
        "halcyon-markets.testnet",
    );
    assert_eq!(code(&x), Some("ERR_PAYEE_MISMATCH"));
    assert_eq!(x.gates[4].code.as_deref(), Some("ERR_AMOUNT_MISMATCH"));
    // a paid item: gates 4 and 5 have nothing to judge
    let x = run(agreement(), items(), "release4", 4, "8000000", R);
    assert_eq!(x.gates[3].status, GateStatus::NotEvaluated);
    assert_eq!(x.gates[5].status, GateStatus::NotEvaluated);
}

fn status() -> impl Strategy<Value = &'static str> {
    prop::sample::select(vec![
        "Open",
        "Delivered",
        "Disputed",
        "Eligible",
        "Paid",
        "AssumedPaid",
        "Reserved",
        "Unfunded",
    ])
}
fn state() -> impl Strategy<Value = &'static str> {
    prop::sample::select(vec![
        "Sealed",
        "Attested",
        "Executing",
        "Settled",
        "NoDeal",
        "Cancelled",
    ])
}

proptest! {
    /// The gate list never disagrees with the contract: the first failing gate carries check_pay's own code, and a
    /// payable request has every gate passing.
    #[test]
    fn the_first_failing_gate_is_the_contracts_answer(
        st in state(), s in status(), key in any::<bool>(), closing in any::<bool>(),
        paid in 0u64..40, funded in 0u64..40, amount in 0u64..20, item in 1u32..3,
        who in 0usize..4, now in 0u64..3000, exc in 0u8..3,
    ) {
        let mut a = agreement();
        a["state"] = json!(st);
        a["agent_key"] = if key { json!("ed25519:x") } else { json!(null) };
        a["closing"] = json!(closing);
        a["paid"] = json!((paid * 1_000_000).to_string());
        a["funded"] = json!((funded * 1_000_000).to_string());
        a["now"] = json!(now);
        let exception = match exc { 0 => json!(null), 1 => json!({"amount": "5000000", "waive_evidence": true}),
            _ => json!({"amount": "5000000", "waive_evidence": false}) };
        let it = json!([{"id": 1, "amount": "12000000", "evidence": "DeliveryAccepted", "status": s,
            "delivery": {"window_end": 1500}, "exception": exception}]);
        let to = ["halcyon-mm.testnet", "halcyon-markets.testnet", "halcyon-treasury.testnet", "x.testnet"][who];
        let x = run(a, it, "release4", item, &(amount * 1_000_000).to_string(), to);
        let first = x.gates.iter().find(|g| g.status == GateStatus::Fail);
        match x.verdict {
            Verdict::Pay => prop_assert!(first.is_none()),
            Verdict::Refuse => prop_assert_eq!(first.and_then(|g| g.code.clone()), x.code.clone()),
            Verdict::Panic => prop_assert!(false, "valid recipients never panic"),
        }
    }
}

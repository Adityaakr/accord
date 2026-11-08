//! PROGRESS 5.4: `act` under random well-formed arguments. Sequences of payments (any item, any amount, the
//! authorised recipient, the attacker, the canary), agent exception requests (also while a payment is in flight
//! and on an item whose exception is used), deliveries, buyer approvals and rejections, and payment callbacks that
//! succeed or fail. After every step: nothing paid beyond the total or the escrow, `paid` equal to what the items
//! settled, every receipt to the authorised recipient at the amount due when that payment was made, no item
//! settled twice, and after a canary hit the key never sends a payment again.

use super::*;
use proptest::prelude::*;
use std::collections::BTreeMap;

#[derive(Clone, Debug)]
enum Step {
    Pay {
        item: u32,
        amount: u128,
        to: u8,
    },
    Exception {
        item: u32,
        amount: u128,
        waive: bool,
    },
    Deliver {
        item: u32,
    },
    Approve,
    Reject,
    Settle {
        ok: bool,
    },
}

fn step() -> impl Strategy<Value = Step> {
    let amount = prop_oneof![
        Just(12_000_000u128),
        Just(11_999_999),
        Just(12_000_001),
        Just(9_000_000),
        Just(u128::MAX),
        Just(36_000_000),
        1u128..100_000_000,
    ];
    prop_oneof![
        5 => (0u32..5, amount.clone(), 0u8..3).prop_map(|(item, amount, to)| Step::Pay { item, amount, to }),
        3 => (0u32..5, amount, any::<bool>()).prop_map(|(item, amount, waive)| Step::Exception { item, amount, waive }),
        2 => (1u32..4).prop_map(|item| Step::Deliver { item }),
        2 => Just(Step::Approve),
        1 => Just(Step::Reject),
        2 => any::<bool>().prop_map(|ok| Step::Settle { ok }),
    ]
}

/// The amount each payment was allowed to carry, recorded when the contract sent it (payment id → amount).
type Allowed = BTreeMap<u64, u128>;

fn check(a: &Agreement, allowed: &Allowed) -> Result<(), TestCaseError> {
    let total = a.total();
    prop_assert!(a.paid <= total, "paid {} beyond the total", a.paid);
    prop_assert!(
        a.paid <= a.funded,
        "paid {} beyond the escrow {}",
        a.paid,
        a.funded
    );
    let settled: u128 = a.items.iter().map(|it| it.settled).sum();
    prop_assert_eq!(a.paid, settled, "paid differs from what the items settled");
    let mut seen = std::collections::BTreeSet::new();
    for (i, r) in a.receipts.iter().enumerate() {
        prop_assert_eq!(
            r.recipient.as_str(),
            RECIPIENT,
            "receipt {} to someone else",
            i
        );
        prop_assert_eq!(
            Some(&r.amount),
            allowed.get(&r.payment_id),
            "receipt {} not the amount due when it was paid",
            i
        );
        prop_assert!(seen.insert(r.item), "item {} paid twice", r.item);
    }
    Ok(())
}

/// Whether the buyer's approval of `e` must succeed, mirroring `approve_exception`'s requirements; the others are
/// refused by design with a clear error and are tested separately below.
fn approvable(a: &Agreement, e: &Exception) -> bool {
    let Some(it) = a.items.iter().find(|it| it.id == e.item) else {
        return false;
    };
    let paid_without = if it.status == ItemStatus::AssumedPaid {
        a.paid - it.settled
    } else {
        a.paid
    };
    !it.exception_used
        && !matches!(it.status, ItemStatus::Paid | ItemStatus::Reserved)
        && a.in_flight.as_ref().is_none_or(|f| f.item != e.item)
        && paid_without + e.amount <= a.total()
}

proptest! {
    #![proptest_config(ProptestConfig { cases: 400, ..ProptestConfig::default() })]

    #[test]
    fn act_never_pays_outside_the_terms(steps in prop::collection::vec(step(), 1..40)) {
        let mut a = ready_to_pay();
        let mut t = T0 + 200;
        let mut canary_hit = false;
        let mut allowed = Allowed::new();
        for s in steps {
            t += 7;
            match s {
                Step::Pay { item, amount, to } => {
                    let recipient = [RECIPIENT, ATTACKER, CANARY][to as usize];
                    let due = a.items.iter().find(|it| it.id == item).map(|it| it.due_amount());
                    let r = agent_pay(&mut a, item, amount, recipient, t);
                    match &r {
                        PromiseOrValue::Value(ActOutcome::Refused { code, .. }) => {
                            if *code == RefusalCode::Canary { canary_hit = true; }
                        }
                        PromiseOrValue::Promise(_) => {
                            prop_assert!(!canary_hit, "a payment sent after the canary revoked the key");
                            let f = a.in_flight.as_ref().expect("a sent payment holds the lock");
                            prop_assert_eq!(Some(f.amount), due, "sent an amount other than the item's due amount");
                            allowed.insert(f.payment_id, f.amount);
                        }
                        PromiseOrValue::Value(_) => {}
                    }
                    if canary_hit {
                        prop_assert!(a.agent_key.is_none(), "the key survived a canary");
                    }
                }
                Step::Exception { item, amount, waive } => {
                    // Above the total is malformed and panics by design (`ERR_BAD_EXCEPTION`); see the test below.
                    if amount > a.total() { continue; }
                    call(me().as_str(), Some(AGENT), t, vec![]);
                    let _ = a.act(Action::RequestException { item, amount, waive_evidence: waive, reason: "scope changed".into() });
                }
                Step::Deliver { item } => {
                    let open = a.items.iter().any(|it| it.id == item && it.status == ItemStatus::Open);
                    if open { deliver_and_accept(&mut a, item, t); }
                }
                Step::Approve | Step::Reject => {
                    let pending = a.exceptions.iter().rev().find(|e| e.status == ExceptionStatus::Pending);
                    let Some(e) = pending else { continue };
                    let approve = matches!(s, Step::Approve);
                    if approve && !approvable(&a, e) { continue; }
                    let id = e.id;
                    call(BUYER, None, t, vec![]);
                    if approve { a.approve_exception(id) } else { a.reject_exception(id) }
                }
                Step::Settle { ok } => {
                    if a.in_flight.is_some() { let _ = settle_payment(&mut a, ok, t); }
                }
            }
            check(&a, &allowed)?;
        }
    }
}

#[test]
#[should_panic(expected = "ERR_BAD_EXCEPTION")]
fn an_exception_above_the_total_is_refused_at_request() {
    let mut a = ready_to_pay();
    call(me().as_str(), Some(AGENT), T0 + 300, vec![]);
    let _ = a.act(Action::RequestException {
        item: 1,
        amount: u128::MAX,
        waive_evidence: false,
        reason: "x".into(),
    });
}

#[test]
fn a_second_exception_on_an_item_is_refused_and_recorded() {
    let mut a = ready_to_pay();
    call(me().as_str(), Some(AGENT), T0 + 300, vec![]);
    let _ = a.act(Action::RequestException {
        item: 3,
        amount: 9_000_000,
        waive_evidence: false,
        reason: "x".into(),
    });
    call(BUYER, None, T0 + 301, vec![]);
    a.approve_exception(0);
    call(me().as_str(), Some(AGENT), T0 + 302, vec![]);
    let before = a.refusal_seq;
    let r = a.act(Action::RequestException {
        item: 3,
        amount: 8_000_000,
        waive_evidence: false,
        reason: "y".into(),
    });
    assert_eq!(refused(r), RefusalCode::CapExceeded);
    assert_eq!(a.refusal_seq, before + 1, "recorded like any refusal");
}

#[test]
fn a_revoked_key_asking_for_an_exception_is_refused_as_revoked() {
    let mut a = ready_to_pay();
    call(BUYER, None, T0 + 300, vec![]);
    a.revoke_agent();
    call(me().as_str(), Some(AGENT), T0 + 301, vec![]);
    let r = a.act(Action::RequestException {
        item: 3,
        amount: 8_000_000,
        waive_evidence: false,
        reason: "y".into(),
    });
    assert_eq!(refused(r), RefusalCode::Revoked);
}

#[test]
#[should_panic(expected = "ERR_IN_FLIGHT")]
fn an_exception_cannot_be_approved_while_its_item_is_being_paid() {
    let mut a = ready_to_pay();
    call(me().as_str(), Some(AGENT), T0 + 300, vec![]);
    let _ = a.act(Action::RequestException {
        item: 1,
        amount: 9_000_000,
        waive_evidence: false,
        reason: "x".into(),
    });
    let _ = agent_pay(&mut a, 1, 12_000_000, RECIPIENT, T0 + 301);
    assert!(a.in_flight.is_some());
    call(BUYER, None, T0 + 302, vec![]);
    a.approve_exception(0);
}

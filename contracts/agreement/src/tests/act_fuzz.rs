//! PROGRESS 5.4: `act` under random well-formed arguments. Sequences of payments (any item, any amount, the
//! authorised recipient, the attacker, the canary), agent exception requests, deliveries, buyer approvals and
//! payment callbacks that succeed or fail. After every step: nothing paid beyond the total or the escrow, every
//! receipt to the authorised recipient at its item's due amount, no item settled twice, and after a canary hit
//! the key never pays again.

use super::*;
use proptest::prelude::*;

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
    ApproveLatest,
    Settle {
        ok: bool,
    },
}

fn step() -> impl Strategy<Value = Step> {
    let amount = prop_oneof![
        Just(12_000_000u128),
        Just(11_999_999),
        Just(12_000_001),
        Just(0),
        Just(u128::MAX),
        Just(36_000_000),
        0u128..100_000_000,
    ];
    prop_oneof![
        5 => (0u32..5, amount.clone(), 0u8..3).prop_map(|(item, amount, to)| Step::Pay { item, amount, to }),
        2 => (0u32..5, amount, any::<bool>()).prop_map(|(item, amount, waive)| Step::Exception { item, amount, waive }),
        2 => (1u32..4).prop_map(|item| Step::Deliver { item }),
        1 => Just(Step::ApproveLatest),
        2 => any::<bool>().prop_map(|ok| Step::Settle { ok }),
    ]
}

fn check(a: &Agreement, canary_hit_at: Option<usize>) -> Result<(), TestCaseError> {
    let terms = a.terms.get().clone().unwrap();
    prop_assert!(a.paid <= terms.total, "paid {} beyond the total", a.paid);
    prop_assert!(
        a.paid <= a.funded,
        "paid {} beyond the escrow {}",
        a.paid,
        a.funded
    );
    let mut seen = std::collections::BTreeSet::new();
    for (i, r) in a.receipts.iter().enumerate() {
        prop_assert_eq!(
            r.recipient.as_str(),
            RECIPIENT,
            "receipt {} to someone else",
            i
        );
        let item = a.items.iter().find(|it| it.id == r.item).unwrap();
        let due = item
            .exception
            .as_ref()
            .map(|e| e.amount)
            .unwrap_or(item.amount);
        prop_assert!(
            r.amount == item.amount || r.amount == due,
            "receipt {} for {} not the due amount",
            i,
            r.amount
        );
        prop_assert!(seen.insert(r.item), "item {} paid twice", r.item);
        if let Some(at) = canary_hit_at {
            prop_assert!(i < at, "a receipt after the canary revoked the key");
        }
    }
    Ok(())
}

proptest! {
    #![proptest_config(ProptestConfig { cases: 400, ..ProptestConfig::default() })]

    #[test]
    fn act_never_pays_outside_the_terms(steps in prop::collection::vec(step(), 1..30)) {
        let mut a = ready_to_pay();
        let mut t = T0 + 200;
        let mut canary_hit_at = None;
        for s in steps {
            t += 7;
            match s {
                Step::Pay { item, amount, to } => {
                    if a.in_flight.is_some() { continue; }
                    let recipient = [RECIPIENT, ATTACKER, CANARY][to as usize];
                    let r = agent_pay(&mut a, item, amount, recipient, t);
                    if let PromiseOrValue::Value(ActOutcome::Refused { code, .. }) = &r {
                        if *code == RefusalCode::Canary { canary_hit_at.get_or_insert(a.receipts.len() as usize); }
                    }
                    if canary_hit_at.is_some() {
                        prop_assert!(a.agent_key.is_none(), "the key survived a canary");
                    }
                }
                Step::Exception { item, amount, waive } => {
                    if a.in_flight.is_some() { continue; }
                    call(me().as_str(), Some(AGENT), t, vec![]);
                    // Zero, above-the-total and malformed requests panic by design (`require`); see the test below.
                    if amount == 0 || amount > 36_000_000 { continue; }
                    if a.items.iter().any(|it| it.id == item && it.exception_used) { continue; }
                    let _ = a.act(Action::RequestException { item, amount, waive_evidence: waive, reason: "scope changed".into() });
                }
                Step::Deliver { item } => {
                    let open = a.items.iter().any(|it| it.id == item && it.status == ItemStatus::Open);
                    if open { deliver_and_accept(&mut a, item, t); }
                }
                Step::ApproveLatest => {
                    let pending = a.exceptions.iter().rev().find(|e| e.status == ExceptionStatus::Pending).map(|e| (e.id, e.amount));
                    // Approving past the total is refused by design (`ERR_EXCEEDS_TOTAL`): the buyer cannot.
                    if let Some((id, _)) = pending.filter(|(_, amt)| a.paid + amt <= 36_000_000) {
                        call(BUYER, None, t, vec![]);
                        a.approve_exception(id);
                    }
                }
                Step::Settle { ok } => {
                    if a.in_flight.is_some() { let _ = settle_payment(&mut a, ok, t); }
                }
            }
            check(&a, canary_hit_at)?;
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
#[should_panic(expected = "ERR_EXCEPTION_USED")]
fn a_second_exception_on_an_item_is_refused_at_request() {
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
    let _ = a.act(Action::RequestException {
        item: 3,
        amount: 8_000_000,
        waive_evidence: false,
        reason: "y".into(),
    });
}

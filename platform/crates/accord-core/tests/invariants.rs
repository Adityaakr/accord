//! PROGRESS 1.5: property tests over random action sequences (ARCHITECTURE.md section 15). A small model of one
//! agreement applies each action only when the gates allow it, the way the contract does, and checks the
//! invariants after every step. The contract-level halves of I4, I5, I9 to I11, I14, I17 and I18 run in the
//! sandbox suite.

use accord_core::atlas::{evaluate, passes, slot_time, slot_window, SLOT_MARGIN_SECS};
use accord_core::gates::{check_exception_request, check_pay, Caller, ItemCtx, PayCtx, PayRequest};
use accord_core::types::*;
use proptest::prelude::*;

const RECIPIENT: &str = "halcyon-mm.testnet";
const CANARY: &str = "halcyon-treasury.testnet";
const ATTACKER: &str = "halcyon-markets.testnet";

#[derive(Clone, Debug)]
enum Step {
    Pay {
        item: u32,
        amount: Amount,
        to: u8,
        key_revoked: bool,
    },
    Accept {
        item: u32,
    },
    Exception {
        item: u32,
        amount: Amount,
        waive: bool,
    },
    Fund {
        amount: Amount,
    },
    Lock(bool),
}

fn step() -> impl Strategy<Value = Step> {
    prop_oneof![
        4 => (1u32..=4, prop_oneof![Just(12_000_000u128), Just(9_000_000), 0u128..50_000_000], 0u8..3, any::<bool>())
            .prop_map(|(item, amount, to, key_revoked)| Step::Pay { item, amount, to, key_revoked }),
        2 => (1u32..=3).prop_map(|item| Step::Accept { item }),
        1 => (1u32..=3, 1u128..20_000_000, any::<bool>()).prop_map(|(item, amount, waive)| Step::Exception { item, amount, waive }),
        1 => (0u128..40_000_000).prop_map(|amount| Step::Fund { amount }),
        1 => any::<bool>().prop_map(Step::Lock),
    ]
}

struct Model {
    items: Vec<ItemCtx>,
    paid: Amount,
    funded: Amount,
    total: Amount,
    in_flight: bool,
    paid_count: [u8; 4],
    exception_used: [bool; 4],
}

impl Model {
    fn new() -> Self {
        let items = (1..=3)
            .map(|id| ItemCtx {
                id,
                amount: 12_000_000,
                status: ItemStatus::Open,
                window_end: None,
                period: None,
                exception: None,
            })
            .collect();
        Self {
            items,
            paid: 0,
            funded: 0,
            total: 36_000_000,
            in_flight: false,
            paid_count: [0; 4],
            exception_used: [false; 4],
        }
    }

    fn ctx<'a>(&self, canaries: &'a [String], item: u32) -> PayCtx<'a> {
        PayCtx {
            state: State::Executing,
            kind: Kind::Procurement,
            canaries,
            recipient: Some(RECIPIENT),
            item: self.items.iter().find(|i| i.id == item).cloned(),
            total: self.total,
            paid: self.paid,
            funded: self.funded,
            in_flight: self.in_flight,
        }
    }
}

proptest! {
    #![proptest_config(ProptestConfig { cases: 10_000, ..ProptestConfig::default() })]

    /// I1, I2, I3, I6, I15: whatever is asked, a payment that passes the gates goes to the authorised recipient, at
    /// the item's due amount, once per item, never beyond the total or the escrow; refusals never panic; a revoked
    /// key never pays.
    #[test]
    fn payments_stay_inside_the_terms(steps in prop::collection::vec(step(), 1..40)) {
        let canaries = vec![CANARY.to_string()];
        let mut m = Model::new();
        for s in steps {
            match s {
                Step::Fund { amount } => m.funded = (m.funded + amount).min(m.total),
                Step::Lock(b) => m.in_flight = b,
                Step::Accept { item } => {
                    if let Some(i) = m.items.iter_mut().find(|i| i.id == item) {
                        if i.status == ItemStatus::Open { i.status = ItemStatus::Eligible; }
                    }
                }
                Step::Exception { item, amount, waive } => {
                    let ctx = m.ctx(&canaries, item);
                    if check_exception_request(&ctx, item, Caller::VendorClaim).is_ok()
                        && !m.exception_used[item as usize]
                        && m.paid + amount <= m.total
                    {
                        let i = m.items.iter_mut().find(|i| i.id == item).unwrap();
                        if i.status != ItemStatus::Paid {
                            i.exception = Some((amount, waive));
                            m.exception_used[item as usize] = true;
                        }
                    }
                }
                Step::Pay { item, amount, to, key_revoked } => {
                    let recipient = [RECIPIENT, ATTACKER, CANARY][to as usize];
                    let ctx = m.ctx(&canaries, item);
                    let due = ctx.item.as_ref().map(|i| i.due_amount());
                    let r = check_pay(&ctx, &PayRequest { item, amount, recipient }, 0, Caller::Agent { key_revoked });
                    if let Ok(plan) = r {
                        prop_assert!(!key_revoked, "a revoked key paid");
                        prop_assert_eq!(plan.recipient.as_str(), RECIPIENT, "paid someone else");
                        prop_assert_eq!(Some(plan.amount), due, "paid a different amount");
                        prop_assert!(m.paid + plan.amount <= m.total, "paid beyond the total");
                        prop_assert!(plan.amount <= m.funded - m.paid, "paid beyond the escrow");
                        prop_assert!(!m.in_flight, "paid while a payment was in flight");
                        m.paid += plan.amount;
                        m.paid_count[item as usize] += 1;
                        prop_assert!(m.paid_count[item as usize] <= 1, "item {} paid twice", item);
                        m.items.iter_mut().find(|i| i.id == item).unwrap().status = ItemStatus::Paid;
                    }
                }
            }
            prop_assert!(m.paid <= m.total && m.paid <= m.funded);
        }
    }

    /// I13: an Accord Atlas item whose period is Withheld, Review or closed unpaid is never payable, unless an
    /// approved exception waives the evidence.
    #[test]
    fn withheld_and_review_periods_do_not_pay(
        outcome in prop_oneof![Just(PeriodOutcome::Withheld), Just(PeriodOutcome::Review), Just(PeriodOutcome::ResolvedClosed), Just(PeriodOutcome::Open)],
        waive in any::<bool>(),
    ) {
        let canaries: Vec<String> = vec![];
        let item = ItemCtx {
            id: 1, amount: 6_000_000, status: ItemStatus::Open, window_end: None, period: Some(outcome),
            exception: waive.then_some((6_000_000, true)),
        };
        let ctx = PayCtx {
            state: State::Executing, kind: Kind::MarketMaking, canaries: &canaries, recipient: Some(RECIPIENT),
            item: Some(item), total: 24_000_000, paid: 0, funded: 24_000_000, in_flight: false,
        };
        let r = check_pay(&ctx, &PayRequest { item: 1, amount: 6_000_000, recipient: RECIPIENT }, 0, Caller::Agent { key_revoked: false });
        prop_assert_eq!(r.is_ok(), waive);
    }

    /// I18 and the Atlas rule: a conflict always sends the period to Review; otherwise Eligible exactly when the
    /// passes reach the threshold, Review when the unobserved slots could still reach it, else Withheld; uptime is
    /// reported, never the rule.
    #[test]
    fn period_outcome_follows_the_rule(
        spreads in prop::collection::vec(prop::option::of(0u32..120), 6),
        two_sided in prop::collection::vec(any::<bool>(), 6),
        threshold in 1u8..=6,
        conflict in any::<bool>(),
    ) {
        let terms = AtlasTerms {
            retainer_per_period: 6_000_000, periods: 1, period_secs: 360, slots_per_period: 6, pass_threshold: threshold,
            venue: Venue::RheaDcl { network: "mainnet".into(), contract: "dclv2.ref-labs.near".into(), pool_id: "p".into() },
            max_spread_bps: 60, min_depth_quote: 150_000_000, depth_band_bps: 200,
        };
        let observations: Vec<Observation> = spreads.iter().enumerate().filter_map(|(k, s)| s.map(|spread| Observation {
            agreement: "a1".into(), period: 0, slot: k as u8, slot_time: 0, venue: terms.venue.clone(), band_bps: 200,
            venue_block: BlockRef { height: 1, hash: "h".into(), time: 0 }, mid: "1".into(), spread_bps: spread,
            depth_bid: 200_000_000, depth_ask: 200_000_000, two_sided: two_sided[k],
        })).collect();
        let passed = observations.iter().filter(|o| passes(&terms, o, true)).count() as u8;
        let unobserved = 6 - observations.len() as u8;
        let s = evaluate(&terms, &observations, true, conflict);
        let expected = if conflict { PeriodOutcome::Review }
            else if passed >= threshold { PeriodOutcome::Eligible }
            else if passed + unobserved >= threshold { PeriodOutcome::Review }
            else { PeriodOutcome::Withheld };
        prop_assert_eq!(s.outcome, expected);
        prop_assert_eq!(s.passed, passed);
        prop_assert!(s.uptime_bps <= 10_000);
    }

    /// Hidden slot times: every slot time falls inside its own window, at least the margin before its end.
    #[test]
    fn slot_times_stay_inside_their_windows(
        seed in prop::collection::vec(any::<u8>(), 32),
        period in 0u32..1_000,
        slots in 1u8..=24,
        slot_seed in any::<u8>(),
        period_secs in 240u64..86_400,
        start in 1_700_000_000u64..1_900_000_000,
    ) {
        let slot = slot_seed % slots;
        let t = slot_time(&seed, "a7.accord-v1.testnet", period, slot, start, period_secs, slots);
        let (lo, hi) = slot_window(start, period_secs, slots, slot);
        prop_assert!(t >= lo && t < hi);
        if hi - lo > SLOT_MARGIN_SECS {
            prop_assert!(t < hi - SLOT_MARGIN_SECS);
        }
    }
}

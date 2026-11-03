//! The local runner's negotiator against the demo companies' mandates: the table it drives reaches the outcomes
//! `fixtures/companies/README.md` expects, every proposal inside both sets of limits.

use accord_core::limits::{check, Mandate};
use accord_core::terms::structural;
use accord_core::{Kind, Mode, Params};
use accord_sealed_table::local::LocalNegotiator;
use accord_sealed_table::protocol::{to_terms, Context, Ending, Party, Table};

const TOKEN: &str = "tusdc.test.near";

fn mandate(path: &str) -> Mandate {
    let text = std::fs::read_to_string(format!(
        "{}/../../fixtures/companies/{path}",
        env!("CARGO_MANIFEST_DIR")
    ))
    .unwrap();
    serde_json::from_str(&text).unwrap()
}

fn params() -> Params {
    Params {
        mode: Mode::Demo,
        timelock_secs: 30,
        claim_delay_secs: 20,
        grace_secs: 30,
        min_acceptance_window_secs: 10,
        max_acceptance_window_secs: 604_800,
        require_two_sided: true,
        observation_grace_secs: 5,
        refusal_limit: 5,
        refusal_window_secs: 3600,
        agent_allowance: 500_000_000_000_000_000_000_000,
    }
}

/// Runs the table; returns the round types and the accepted terms checked against both mandates.
fn negotiate(buyer: &str, vendor: &str) -> (Vec<String>, Option<accord_core::Terms>) {
    let (b, v) = (mandate(buyer), mandate(vendor));
    let ctx = Context {
        kind: b.kind,
        token: TOKEN.into(),
        decimals: 6,
        params: params(),
        venue: Context::venue_from(&b.shared),
    };
    let bp = Party {
        account: "northwind.test.near".into(),
        mandate: b.clone(),
    };
    let vp = Party {
        account: "halcyon.test.near".into(),
        mandate: v.clone(),
    };
    let table = Table {
        ctx: &ctx,
        buyer: &bp,
        vendor: &vp,
        salt: "00".into(),
    };
    let mut neg = LocalNegotiator::new(b.clone(), v.clone(), params());
    let r = table.run(&mut neg).unwrap();
    let kinds = r.transcript.iter().map(|d| d.kind.clone()).collect();
    let terms = match r.ending {
        Ending::Accepted(t) => {
            let terms = to_terms(&t, &ctx, [0; 32]).unwrap();
            structural(&terms, TOKEN, &params()).unwrap();
            check(&terms, &b, &v).unwrap();
            Some(terms)
        }
        Ending::WalkAway => None,
    };
    (kinds, terms)
}

#[test]
fn procurement_meets_in_the_middle() {
    let (rounds, terms) = negotiate(
        "northwind/procurement.buyer.json",
        "halcyon/procurement.vendor.json",
    );
    assert_eq!(rounds, ["QUOTE", "COUNTER", "FINAL", "ACCEPT"]);
    let t = terms.unwrap();
    assert_eq!(t.total, 36_000_000);
    assert_eq!(
        t.items.iter().map(|i| i.amount).collect::<Vec<_>>(),
        [12_000_000; 3]
    );
}

#[test]
fn market_making_takes_the_buyers_conditions() {
    let (rounds, terms) = negotiate(
        "northwind/market-making.buyer.json",
        "halcyon/market-making.vendor.json",
    );
    assert_eq!(rounds, ["QUOTE", "COUNTER", "ACCEPT"]);
    let t = terms.unwrap();
    assert_eq!(t.kind, Kind::MarketMaking);
    let a = t.atlas.unwrap();
    assert_eq!(
        (
            a.max_spread_bps,
            a.slots_per_period,
            a.pass_threshold,
            a.periods
        ),
        (60, 6, 4, 4)
    );
    assert_eq!(a.retainer_per_period, 7_500_000);
}

#[test]
fn the_strict_pair_agrees_on_a_spread_the_pool_cannot_meet() {
    let (_, terms) = negotiate(
        "northwind/market-making.buyer.strict.json",
        "halcyon/market-making.vendor.strict.json",
    );
    assert_eq!(terms.unwrap().atlas.unwrap().max_spread_bps, 30);
}

#[test]
fn a_vendor_that_cannot_meet_the_strict_spread_walks_away() {
    let (rounds, terms) = negotiate(
        "northwind/market-making.buyer.strict.json",
        "halcyon/market-making.vendor.json",
    );
    assert_eq!(rounds.last().unwrap(), "WALK_AWAY");
    assert!(terms.is_none());
}

#[test]
fn the_try_room_takes_twelve_equal_items() {
    let (rounds, terms) = negotiate("northwind/try.buyer.json", "halcyon/try.vendor.json");
    assert_eq!(rounds, ["QUOTE", "ACCEPT"]);
    let t = terms.unwrap();
    assert_eq!(t.items.len(), 12);
    assert!(t.items.iter().all(|i| i.amount == 10_000));
}

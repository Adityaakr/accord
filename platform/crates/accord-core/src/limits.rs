//! The within-limits rules (INTERFACES.md 6.3). The Sealed Table runs `within` on every proposal (the sender's
//! limits) and every acceptance (the receiver's), and `check` on the accepted terms against both sides. A failure
//! never leaves the job: it only says which side, never which limit.

use crate::types::*;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    Buyer,
    Vendor,
}

/// A mandate: `shared` is shown to the other side's negotiator; `limits` and `instructions` stay private.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Mandate {
    pub kind: Kind,
    pub role: Role,
    pub shared: serde_json::Value,
    pub limits: serde_json::Value,
    pub instructions: String,
}

#[derive(Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct ProcurementBuyer {
    #[serde(with = "u128_str")]
    pub max_total: Amount,
    #[serde(with = "u128_str")]
    pub target_total: Amount,
    pub max_items: u32,
    pub max_duration_secs: u64,
    pub min_acceptance_window_secs: u64,
}

#[derive(Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct ProcurementVendor {
    #[serde(with = "u128_str")]
    pub min_total: Amount,
    #[serde(with = "u128_str")]
    pub target_total: Amount,
    pub min_items: u32,
    pub max_items: u32,
    pub min_due_offset_secs: u64,
    pub max_acceptance_window_secs: u64,
}

#[derive(Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct MarketMakingBuyer {
    #[serde(with = "u128_str")]
    pub max_retainer_per_period: Amount,
    pub periods: u32,
    pub period_secs: u64,
    pub max_spread_bps: u32,
    #[serde(with = "u128_str")]
    pub min_depth_quote: Amount,
    pub depth_band_bps: u32,
    pub min_slots: u8,
    pub min_threshold: u8,
}

#[derive(Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct MarketMakingVendor {
    #[serde(with = "u128_str")]
    pub min_retainer_per_period: Amount,
    pub tightest_spread_bps: u32,
    #[serde(with = "u128_str")]
    pub max_depth_quote: Amount,
    pub max_threshold: u8,
}

/// The buyer's shared venue, which market-making terms must name exactly.
#[derive(Deserialize, Clone, Debug, PartialEq, Eq)]
struct SharedVenue {
    venue: VenueJson,
}
#[derive(Deserialize, Clone, Debug, PartialEq, Eq)]
struct VenueJson {
    kind: String,
    network: String,
    contract: String,
    pool_id: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum LimitFailure {
    /// The mandate does not parse for its kind and role, or names another kind.
    Malformed(Role),
    Outside(Role),
}

fn parse<T: for<'de> Deserialize<'de>>(m: &Mandate) -> Result<T, LimitFailure> {
    serde_json::from_value(m.limits.clone()).map_err(|_| LimitFailure::Malformed(m.role))
}

/// `true` when `terms` sit inside this one side's limits. Malformed mandates are never within.
pub fn within(terms: &Terms, mandate: &Mandate) -> bool {
    within_inner(terms, mandate).unwrap_or(false)
}

fn within_inner(t: &Terms, m: &Mandate) -> Result<bool, LimitFailure> {
    if m.kind != t.kind {
        return Err(LimitFailure::Malformed(m.role));
    }
    let n = t.items.len() as u32;
    let sums = t
        .items
        .iter()
        .try_fold(0u128, |a, i| a.checked_add(i.amount))
        == Some(t.total);
    if !sums {
        return Ok(false);
    }
    Ok(match (t.kind, m.role) {
        (Kind::Procurement, Role::Buyer) => {
            let l: ProcurementBuyer = parse(m)?;
            t.total <= l.max_total
                && n <= l.max_items
                && t.duration_secs <= l.max_duration_secs
                && t.items.iter().all(|i| i.due_offset_secs <= t.duration_secs)
                && t.acceptance_window_secs >= l.min_acceptance_window_secs
        }
        (Kind::Procurement, Role::Vendor) => {
            let l: ProcurementVendor = parse(m)?;
            t.total >= l.min_total
                && (l.min_items..=l.max_items).contains(&n)
                && t.items
                    .iter()
                    .all(|i| i.due_offset_secs >= l.min_due_offset_secs)
                && t.acceptance_window_secs <= l.max_acceptance_window_secs
        }
        (Kind::MarketMaking, Role::Buyer) => {
            let l: MarketMakingBuyer = parse(m)?;
            let Some(a) = &t.atlas else { return Ok(false) };
            let shared: SharedVenue = serde_json::from_value(m.shared.clone())
                .map_err(|_| LimitFailure::Malformed(m.role))?;
            let Venue::RheaDcl {
                network,
                contract,
                pool_id,
            } = &a.venue;
            shared.venue.kind == "rhea-dcl"
                && &shared.venue.network == network
                && &shared.venue.contract == contract
                && &shared.venue.pool_id == pool_id
                && a.retainer_per_period <= l.max_retainer_per_period
                && a.periods <= l.periods
                && a.period_secs == l.period_secs
                && a.max_spread_bps <= l.max_spread_bps
                && a.min_depth_quote >= l.min_depth_quote
                && a.depth_band_bps <= l.depth_band_bps
                && a.slots_per_period >= l.min_slots
                && a.pass_threshold >= l.min_threshold
        }
        (Kind::MarketMaking, Role::Vendor) => {
            let l: MarketMakingVendor = parse(m)?;
            let Some(a) = &t.atlas else { return Ok(false) };
            a.retainer_per_period >= l.min_retainer_per_period
                && a.max_spread_bps >= l.tightest_spread_bps
                && a.min_depth_quote <= l.max_depth_quote
                && a.pass_threshold <= l.max_threshold
        }
    })
}

/// Both sides, on the accepted terms. The acceptance window must also sit within the agreement's params, which
/// `terms::structural` checks.
pub fn check(terms: &Terms, buyer: &Mandate, vendor: &Mandate) -> Result<(), LimitFailure> {
    if buyer.role != Role::Buyer || vendor.role != Role::Vendor {
        return Err(LimitFailure::Malformed(buyer.role));
    }
    if !within_inner(terms, buyer)? {
        return Err(LimitFailure::Outside(Role::Buyer));
    }
    if !within_inner(terms, vendor)? {
        return Err(LimitFailure::Outside(Role::Vendor));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::terms::fixtures;
    use serde_json::json;

    fn m(kind: Kind, role: Role, shared: serde_json::Value, limits: serde_json::Value) -> Mandate {
        Mandate {
            kind,
            role,
            shared,
            limits,
            instructions: String::new(),
        }
    }

    fn pb() -> Mandate {
        m(
            Kind::Procurement,
            Role::Buyer,
            json!({}),
            json!({"max_total": "40000000", "target_total": "32000000",
            "max_items": 4, "max_duration_secs": 604800, "min_acceptance_window_secs": 120}),
        )
    }
    fn pv() -> Mandate {
        m(
            Kind::Procurement,
            Role::Vendor,
            json!({}),
            json!({"min_total": "30000000", "target_total": "38000000",
            "min_items": 2, "max_items": 4, "min_due_offset_secs": 60, "max_acceptance_window_secs": 604800}),
        )
    }
    fn mb() -> Mandate {
        m(
            Kind::MarketMaking,
            Role::Buyer,
            json!({"venue": {"kind": "rhea-dcl", "network": "mainnet", "contract": "dclv2.ref-labs.near",
                 "pool_id": "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1|wrap.near|2000"}, "pair": "NEAR/USDC"}),
            json!({"max_retainer_per_period": "8000000", "periods": 4, "period_secs": 360, "max_spread_bps": 60,
                 "min_depth_quote": "2000000000", "depth_band_bps": 200, "min_slots": 6, "min_threshold": 4}),
        )
    }
    fn mv() -> Mandate {
        m(
            Kind::MarketMaking,
            Role::Vendor,
            json!({}),
            json!({"min_retainer_per_period": "5000000",
            "tightest_spread_bps": 45, "max_depth_quote": "3000000000", "max_threshold": 5}),
        )
    }

    #[test]
    fn fixtures_are_within_both_sides() {
        assert_eq!(check(&fixtures::procurement(), &pb(), &pv()), Ok(()));
        assert_eq!(check(&fixtures::market_making(), &mb(), &mv()), Ok(()));
    }

    #[test]
    fn procurement_boundaries_both_directions() {
        let base = fixtures::procurement();
        // Buyer ceiling: 40 passes, 40.000001 fails.
        let mut t = base.clone();
        t.items[0].amount = 16_000_000;
        t.total = 40_000_000;
        assert!(within(&t, &pb()));
        t.items[0].amount += 1;
        t.total += 1;
        assert!(!within(&t, &pb()));
        // Vendor floor: 30 passes, 29.999999 fails.
        let mut t = base.clone();
        t.items[0].amount = 6_000_000;
        t.total = 30_000_000;
        assert!(within(&t, &pv()));
        t.items[0].amount -= 1;
        t.total -= 1;
        assert!(!within(&t, &pv()));
        // Items: vendor needs at least 2, buyer allows at most 4.
        let mut t = base.clone();
        t.items.truncate(1);
        t.total = 12_000_000;
        assert!(!within(&t, &pv()));
        // Due offsets: vendor minimum 60.
        let mut t = base.clone();
        t.items[0].due_offset_secs = 59;
        assert!(!within(&t, &pv()));
        // Acceptance window: buyer minimum 120.
        let mut t = base.clone();
        t.acceptance_window_secs = 119;
        assert!(!within(&t, &pb()));
        // Duration: buyer maximum one week.
        let mut t = base;
        t.duration_secs = 604_801;
        assert!(!within(&t, &pb()));
    }

    #[test]
    fn market_making_boundaries_both_directions() {
        let base = fixtures::market_making();
        let edit = |f: fn(&mut AtlasTerms)| {
            let mut t = base.clone();
            f(t.atlas.as_mut().unwrap());
            t
        };
        assert!(!within(&edit(|a| a.max_spread_bps = 61), &mb()));
        assert!(!within(&edit(|a| a.max_spread_bps = 44), &mv()));
        assert!(within(&edit(|a| a.max_spread_bps = 45), &mv()));
        assert!(!within(&edit(|a| a.min_depth_quote = 1_999_999_999), &mb()));
        assert!(!within(&edit(|a| a.min_depth_quote = 3_000_000_001), &mv()));
        assert!(!within(&edit(|a| a.pass_threshold = 3), &mb()));
        assert!(!within(&edit(|a| a.pass_threshold = 6), &mv()));
        assert!(!within(&edit(|a| a.slots_per_period = 5), &mb()));
        assert!(!within(&edit(|a| a.period_secs = 300), &mb()));
        assert!(!within(&edit(|a| a.depth_band_bps = 300), &mb()));
        assert!(!within(
            &edit(|a| a.venue = Venue::RheaDcl {
                network: "mainnet".into(),
                contract: "dclv2.ref-labs.near".into(),
                pool_id: "other".into()
            }),
            &mb()
        ));
        assert!(!within(&edit(|a| a.retainer_per_period = 4_999_999), &mv()));
    }

    #[test]
    fn check_names_the_side_and_rejects_malformed() {
        let mut t = fixtures::procurement();
        t.items[0].amount = 2_000_000;
        t.total = 26_000_000;
        assert_eq!(
            check(&t, &pb(), &pv()),
            Err(LimitFailure::Outside(Role::Vendor))
        );
        let mut bad = pb();
        bad.limits = json!({"max_total": 40});
        assert_eq!(
            check(&fixtures::procurement(), &bad, &pv()),
            Err(LimitFailure::Malformed(Role::Buyer))
        );
        assert!(!within(&fixtures::market_making(), &pb()));
    }
}

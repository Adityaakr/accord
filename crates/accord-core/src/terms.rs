//! `terms::structural`: the shape checks every set of terms passes before the contract accepts it
//! (INTERFACES.md section 3, used by `on_sealed_result`).

use crate::hash::jcs_sha256;
use crate::types::*;

pub const MAX_ITEMS: usize = 12;

pub fn structural(terms: &Terms, token: &str, params: &Params) -> Result<(), &'static str> {
    if terms.v != 1 {
        return Err("ERR_TERMS_VERSION");
    }
    if terms.token != token {
        return Err("ERR_TERMS_TOKEN");
    }
    if terms.params_hash != jcs_sha256(params) {
        return Err("ERR_TERMS_PARAMS");
    }
    if terms.items.is_empty() || terms.items.len() > MAX_ITEMS {
        return Err("ERR_TERMS_ITEMS");
    }
    let mut sum: Amount = 0;
    for (i, it) in terms.items.iter().enumerate() {
        if terms.items[..i].iter().any(|o| o.id == it.id) {
            return Err("ERR_TERMS_DUPLICATE_ID");
        }
        if it.amount == 0 {
            return Err("ERR_TERMS_ZERO_AMOUNT");
        }
        if it.due_offset_secs > terms.duration_secs {
            return Err("ERR_TERMS_DUE_AFTER_END");
        }
        sum = sum.checked_add(it.amount).ok_or("ERR_TERMS_OVERFLOW")?;
    }
    if sum != terms.total {
        return Err("ERR_TERMS_SUM");
    }
    if terms.acceptance_window_secs < params.min_acceptance_window_secs
        || terms.acceptance_window_secs > params.max_acceptance_window_secs
    {
        return Err("ERR_TERMS_WINDOW");
    }
    match (terms.kind, &terms.atlas) {
        (Kind::Procurement, None) => {
            if terms
                .items
                .iter()
                .any(|i| i.evidence != Evidence::DeliveryAccepted)
            {
                return Err("ERR_TERMS_EVIDENCE");
            }
        }
        (Kind::MarketMaking, Some(a)) => {
            if a.periods == 0
                || a.slots_per_period == 0
                || a.pass_threshold == 0
                || a.pass_threshold > a.slots_per_period
                // Slots are tracked in a 32-bit mask on chain.
                || a.slots_per_period > 32
                || a.period_secs < u64::from(a.slots_per_period) * 20
            {
                return Err("ERR_TERMS_ATLAS");
            }
            if terms.items.len() != a.periods as usize {
                return Err("ERR_TERMS_PERIODS");
            }
            for (p, it) in terms.items.iter().enumerate() {
                if it.amount != a.retainer_per_period
                    || it.evidence != (Evidence::PeriodEligible { period: p as u32 })
                {
                    return Err("ERR_TERMS_PERIOD_ITEM");
                }
            }
            if u64::from(a.periods) * a.period_secs > terms.duration_secs {
                return Err("ERR_TERMS_PERIODS_AFTER_END");
            }
        }
        _ => return Err("ERR_TERMS_KIND"),
    }
    Ok(())
}

#[cfg(test)]
pub(crate) mod fixtures {
    use super::*;

    pub fn params() -> Params {
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

    pub fn procurement() -> Terms {
        Terms {
            v: 1,
            kind: Kind::Procurement,
            token: "usdc.testnet".into(),
            decimals: 6,
            total: 36_000_000,
            items: (1..=3)
                .map(|id| ItemTerms {
                    id,
                    amount: 12_000_000,
                    due_offset_secs: 1800 * u64::from(id),
                    evidence: Evidence::DeliveryAccepted,
                })
                .collect(),
            acceptance_window_secs: 120,
            duration_secs: 86_400,
            params_hash: jcs_sha256(&params()),
            doc_hash: [7; 32],
            atlas: None,
        }
    }

    pub fn venue() -> Venue {
        Venue::RheaDcl {
            network: "mainnet".into(),
            contract: "dclv2.ref-labs.near".into(),
            pool_id:
                "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1|wrap.near|2000"
                    .into(),
        }
    }

    pub fn market_making() -> Terms {
        let atlas = AtlasTerms {
            retainer_per_period: 6_000_000,
            periods: 4,
            period_secs: 360,
            slots_per_period: 6,
            pass_threshold: 4,
            venue: venue(),
            max_spread_bps: 60,
            min_depth_quote: 2_000_000_000,
            depth_band_bps: 200,
        };
        Terms {
            v: 1,
            kind: Kind::MarketMaking,
            token: "usdc.testnet".into(),
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
            duration_secs: 1_440,
            params_hash: jcs_sha256(&params()),
            doc_hash: [7; 32],
            atlas: Some(atlas),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::fixtures::*;
    use super::*;

    #[test]
    fn fixtures_pass() {
        assert_eq!(
            structural(&procurement(), "usdc.testnet", &params()),
            Ok(())
        );
        assert_eq!(
            structural(&market_making(), "usdc.testnet", &params()),
            Ok(())
        );
    }

    #[test]
    fn each_rule_refuses() {
        let p = params();
        type Case = (fn(&mut Terms), &'static str);
        let cases: Vec<Case> = vec![
            (|t| t.total += 1, "ERR_TERMS_SUM"),
            (|t| t.token = "evil.testnet".into(), "ERR_TERMS_TOKEN"),
            (|t| t.params_hash = [0; 32], "ERR_TERMS_PARAMS"),
            (|t| t.items.clear(), "ERR_TERMS_ITEMS"),
            (|t| t.items[1].id = 1, "ERR_TERMS_DUPLICATE_ID"),
            (
                |t| t.items[0].due_offset_secs = 90_000,
                "ERR_TERMS_DUE_AFTER_END",
            ),
            (|t| t.acceptance_window_secs = 10, "ERR_TERMS_WINDOW"),
            (|t| t.atlas = market_making().atlas, "ERR_TERMS_KIND"),
        ];
        for (f, code) in cases {
            let mut t = procurement();
            f(&mut t);
            assert_eq!(structural(&t, "usdc.testnet", &p), Err(code));
        }
        let mut t = procurement();
        t.items = (1..=13)
            .map(|id| ItemTerms {
                id,
                amount: 1,
                due_offset_secs: 0,
                evidence: Evidence::DeliveryAccepted,
            })
            .collect();
        t.total = 13;
        assert_eq!(structural(&t, "usdc.testnet", &p), Err("ERR_TERMS_ITEMS"));
    }

    #[test]
    fn market_making_needs_one_item_per_period_at_the_retainer() {
        let p = params();
        let mut t = market_making();
        t.items[2].amount = 5_000_000;
        t.items[3].amount = 7_000_000;
        assert_eq!(
            structural(&t, "usdc.testnet", &p),
            Err("ERR_TERMS_PERIOD_ITEM")
        );
        let mut t = market_making();
        t.items.pop();
        t.total = 18_000_000;
        assert_eq!(structural(&t, "usdc.testnet", &p), Err("ERR_TERMS_PERIODS"));
        let mut t = market_making();
        t.atlas.as_mut().unwrap().pass_threshold = 7;
        assert_eq!(structural(&t, "usdc.testnet", &p), Err("ERR_TERMS_ATLAS"));
    }
}

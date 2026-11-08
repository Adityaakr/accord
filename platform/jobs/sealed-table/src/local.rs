//! The local runner's stand-in for the model (`make serve`, the live make targets on a local node): a
//! deterministic negotiator that bargains inside each side's sealed limits. Everything around it is the real job:
//! the envelopes are opened with the job's own key, every proposal goes through the same checks, and the terms,
//! documents and signature come from `run.rs`. Its attestation is marked `local`: no NEAR AI call is made, nothing
//! is verified, and the output says so (`model.local`), so no run of it can pass for an enclave run.
//!
//! The strategy, per side:
//! - procurement: the vendor quotes its target split into equal whole-USDC items; the buyer accepts a quote at or
//!   under its target and otherwise counters at its target; the vendor accepts a counter at or over its target and
//!   otherwise makes a final offer halfway between, rounded up to whole USDC per item and kept above its floor;
//!   the buyer accepts the final offer inside its limits and otherwise walks away.
//! - market-making: the vendor quotes its floor retainer plus half, at conditions it can meet; the buyer counters
//!   with its own conditions and the retainer capped at its ceiling; the vendor accepts a counter inside its limits
//!   and otherwise makes a final offer at the nearest conditions it can meet.

use crate::attest::{Attestation, PartResult};
use crate::nearai::ResponseRecord;
use crate::protocol::{Chat, MsgAtlas, MsgItem, MsgTerms, Negotiator};
use crate::run::Ai;
use accord_core::limits::{
    Mandate, MarketMakingBuyer, MarketMakingVendor, ProcurementBuyer, ProcurementVendor, Role,
};
use accord_core::{Amount, Kind, Params};
use serde_json::{json, Value};

pub const LOCAL_SIGNER: &str = "0x0000000000000000000000000000000000000001";
const USDC: Amount = 1_000_000;
/// The vendor's opening term, when it cannot see the buyer's: seven days.
const DEFAULT_DURATION_SECS: u64 = 7 * 86_400;

pub struct LocalNegotiator {
    buyer: Mandate,
    vendor: Mandate,
    params: Params,
    /// The last proposal on the table, which an `ACCEPT` takes.
    standing: Option<MsgTerms>,
    asked: u32,
}

impl LocalNegotiator {
    pub fn new(buyer: Mandate, vendor: Mandate, params: Params) -> Self {
        Self {
            buyer,
            vendor,
            params,
            standing: None,
            asked: 0,
        }
    }

    fn propose(&mut self, kind: &str, terms: MsgTerms, reasons: &str) -> String {
        self.standing = Some(terms.clone());
        json!({"type": kind, "terms": terms, "reasons": reasons}).to_string()
    }

    fn reply(kind: &str, reasons: &str) -> String {
        json!({"type": kind, "terms": null, "reasons": reasons}).to_string()
    }

    fn window(&self, preferred: u64) -> u64 {
        preferred.clamp(
            self.params.min_acceptance_window_secs,
            self.params.max_acceptance_window_secs,
        )
    }

    fn answer(&mut self, side: Role, allowed: &[String]) -> Result<String, String> {
        let may = |t: &str| allowed.iter().any(|a| a == t);
        match self.buyer.kind {
            Kind::Procurement => self.procurement(side, &may),
            Kind::MarketMaking => self.market_making(side, &may),
        }
    }

    fn procurement(&mut self, side: Role, may: &dyn Fn(&str) -> bool) -> Result<String, String> {
        let b: ProcurementBuyer = limits(&self.buyer)?;
        let v: ProcurementVendor = limits(&self.vendor)?;
        let names = item_names(&self.buyer.shared);
        if v.min_items > v.max_items || v.max_items == 0 {
            return Err("the vendor's item limits leave no count to quote".into());
        }
        let n = (names.len() as u32).max(v.min_items).min(v.max_items);
        let build = |total: Amount, duration: u64, window: u64| -> MsgTerms {
            split(total, n, duration, v.min_due_offset_secs, &names, window)
        };
        match (side, self.standing.clone()) {
            (Role::Vendor, None) => {
                let window = self.window(v.max_acceptance_window_secs.min(3600));
                let t = build(v.target_total, DEFAULT_DURATION_SECS, window);
                Ok(self.propose(
                    "QUOTE",
                    t,
                    "Scope as requested, split into equal milestones.",
                ))
            }
            (Role::Buyer, Some(q)) => {
                let total = amount(&q.total);
                let fits = total <= b.target_total
                    && q.duration_secs <= b.max_duration_secs
                    && q.acceptance_window_secs >= b.min_acceptance_window_secs;
                if fits && may("ACCEPT") {
                    return Ok(Self::reply("ACCEPT", "The quote fits the request."));
                }
                if may("COUNTER") {
                    let window =
                        self.window(q.acceptance_window_secs.max(b.min_acceptance_window_secs));
                    let t = build(
                        b.target_total,
                        q.duration_secs.min(b.max_duration_secs),
                        window,
                    );
                    return Ok(self.propose(
                        "COUNTER",
                        t,
                        "The budget for this scope is lower; same milestones and dates.",
                    ));
                }
                let inside = total <= b.max_total && q.duration_secs <= b.max_duration_secs;
                Ok(Self::reply(
                    if inside && may("ACCEPT") {
                        "ACCEPT"
                    } else {
                        "WALK_AWAY"
                    },
                    "Final answer on the last offer.",
                ))
            }
            (Role::Vendor, Some(c)) => {
                let total = amount(&c.total);
                if total >= v.target_total && may("ACCEPT") {
                    return Ok(Self::reply("ACCEPT", "The counter works."));
                }
                let mid = v.target_total / 2 + total / 2;
                let per_item = mid
                    .div_ceil(Amount::from(n))
                    .div_ceil(USDC)
                    .saturating_mul(USDC);
                let offer = per_item.saturating_mul(Amount::from(n)).max(v.min_total);
                let t = build(offer, c.duration_secs, c.acceptance_window_secs);
                Ok(self.propose(
                    "FINAL",
                    t,
                    "We meet you partway; the scope and dates stay as countered.",
                ))
            }
            (Role::Buyer, None) => Err("the buyer was asked before any proposal".into()),
        }
    }

    fn market_making(&mut self, side: Role, may: &dyn Fn(&str) -> bool) -> Result<String, String> {
        let b: MarketMakingBuyer = limits(&self.buyer)?;
        let v: MarketMakingVendor = limits(&self.vendor)?;
        let window = self.window(self.params.min_acceptance_window_secs.max(60));
        let terms = |a: MsgAtlas| atlas_terms(a, window);
        match (side, self.standing.clone()) {
            (Role::Vendor, None) => {
                let a = MsgAtlas {
                    retainer_per_period: (v.min_retainer_per_period / 2)
                        .saturating_mul(3)
                        .to_string(),
                    periods: 4,
                    period_secs: 3600,
                    slots_per_period: 6,
                    pass_threshold: v.max_threshold.min(6),
                    max_spread_bps: v.tightest_spread_bps.saturating_mul(2),
                    min_depth_quote: (v.max_depth_quote / 2).to_string(),
                    depth_band_bps: 200,
                };
                Ok(self.propose(
                    "QUOTE",
                    terms(a),
                    "Conditions the pool meets most of the time.",
                ))
            }
            (Role::Buyer, Some(q)) => {
                let quoted = q
                    .atlas
                    .as_ref()
                    .map(|a| amount(&a.retainer_per_period))
                    .unwrap_or(0);
                if may("COUNTER") {
                    let a = MsgAtlas {
                        retainer_per_period: quoted.min(b.max_retainer_per_period).to_string(),
                        periods: b.periods,
                        period_secs: b.period_secs,
                        slots_per_period: b.min_slots,
                        pass_threshold: b.min_threshold,
                        max_spread_bps: b.max_spread_bps,
                        min_depth_quote: b.min_depth_quote.to_string(),
                        depth_band_bps: b.depth_band_bps,
                    };
                    return Ok(self.propose("COUNTER", terms(a), "Our venue conditions and periods; the retainer is paid only for periods that meet them."));
                }
                let a = q.atlas.as_ref().ok_or("no atlas terms")?;
                let inside = amount(&a.retainer_per_period) <= b.max_retainer_per_period
                    && a.periods <= b.periods
                    && a.period_secs == b.period_secs
                    && a.max_spread_bps <= b.max_spread_bps
                    && amount(&a.min_depth_quote) >= b.min_depth_quote
                    && a.depth_band_bps <= b.depth_band_bps
                    && a.slots_per_period >= b.min_slots
                    && a.pass_threshold >= b.min_threshold;
                Ok(Self::reply(
                    if inside && may("ACCEPT") {
                        "ACCEPT"
                    } else {
                        "WALK_AWAY"
                    },
                    "Final answer on the last offer.",
                ))
            }
            (Role::Vendor, Some(c)) => {
                let mut a = c.atlas.clone().ok_or("no atlas terms")?;
                let inside = amount(&a.retainer_per_period) >= v.min_retainer_per_period
                    && a.max_spread_bps >= v.tightest_spread_bps
                    && amount(&a.min_depth_quote) <= v.max_depth_quote
                    && a.pass_threshold <= v.max_threshold;
                if inside && may("ACCEPT") {
                    return Ok(Self::reply("ACCEPT", "We can meet these conditions."));
                }
                a.retainer_per_period = amount(&a.retainer_per_period)
                    .max(v.min_retainer_per_period)
                    .to_string();
                a.max_spread_bps = a.max_spread_bps.max(v.tightest_spread_bps);
                a.min_depth_quote = amount(&a.min_depth_quote)
                    .min(v.max_depth_quote)
                    .to_string();
                a.pass_threshold = a.pass_threshold.min(v.max_threshold);
                Ok(self.propose(
                    "FINAL",
                    terms(a),
                    "The nearest conditions we can commit to.",
                ))
            }
            (Role::Buyer, None) => Err("the buyer was asked before any proposal".into()),
        }
    }
}

fn limits<T: for<'de> serde::Deserialize<'de>>(m: &Mandate) -> Result<T, String> {
    serde_json::from_value(m.limits.clone()).map_err(|e| format!("mandate limits: {e}"))
}

fn amount(s: &str) -> Amount {
    s.parse().unwrap_or(0)
}

fn item_names(shared: &Value) -> Vec<String> {
    shared["proposed_items"]
        .as_array()
        .map(|l| {
            l.iter()
                .filter_map(|i| i["name"].as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default()
}

/// `total` in `n` items (whole base units, the remainder on the last), due evenly over `duration`.
fn split(
    total: Amount,
    n: u32,
    duration: u64,
    min_due: u64,
    names: &[String],
    window: u64,
) -> MsgTerms {
    let n = n.max(1);
    let each = total / Amount::from(n);
    let items = (0..n)
        .map(|i| {
            let amount = if i + 1 == n {
                total - each * Amount::from(n - 1)
            } else {
                each
            };
            let due = (duration / u64::from(n) * u64::from(i + 1))
                .max(min_due)
                .min(duration);
            MsgItem {
                name: names
                    .get(i as usize)
                    .cloned()
                    .unwrap_or_else(|| format!("Milestone {}", i + 1)),
                amount: amount.to_string(),
                due_offset_secs: due,
            }
        })
        .collect();
    MsgTerms {
        total: total.to_string(),
        duration_secs: duration,
        acceptance_window_secs: window,
        items,
        atlas: None,
    }
}

fn atlas_terms(a: MsgAtlas, window: u64) -> MsgTerms {
    let total = amount(&a.retainer_per_period).saturating_mul(Amount::from(a.periods));
    MsgTerms {
        total: total.to_string(),
        duration_secs: a.period_secs.saturating_mul(u64::from(a.periods)),
        acceptance_window_secs: window,
        items: vec![],
        atlas: Some(a),
    }
}

/// The allowed message types named in the turn's last user message (`Allowed types: COUNTER or ACCEPT.`).
fn allowed_types(messages: &[Chat]) -> Vec<String> {
    let text = messages.last().map(|m| m.content.as_str()).unwrap_or("");
    let tail = text.rsplit("Allowed types:").next().unwrap_or("");
    tail.split(|c: char| !c.is_ascii_uppercase() && c != '_')
        .filter(|w| w.len() > 2)
        .map(String::from)
        .collect()
}

impl Negotiator for LocalNegotiator {
    fn ask(&mut self, side: Role, _kind: Kind, messages: &[Chat]) -> Result<String, String> {
        self.asked += 1;
        self.answer(side, &allowed_types(messages))
    }
}

impl Ai for LocalNegotiator {
    /// Marked `local`; see the module note. Nothing is fetched or verified.
    fn attest(&mut self, _model: &str) -> Result<Attestation, String> {
        let part = |model: bool| PartResult {
            signing_address: LOCAL_SIGNER.into(),
            tdx_ok: true,
            gpu_ok: model.then_some(true),
            compose_hash: "00".repeat(32),
            signing_public_key: None,
            failures: vec![],
        };
        Ok(Attestation {
            nonce: "00".repeat(32),
            report_sha256: "00".repeat(32),
            gateway: part(false),
            candidates: vec![part(true)],
            local: true,
        })
    }

    fn records(&self) -> Vec<ResponseRecord> {
        vec![]
    }

    fn usage(&self) -> (u64, u64) {
        (0, 0)
    }

    fn local(&self) -> bool {
        true
    }
}

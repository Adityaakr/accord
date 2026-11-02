//! The four-message protocol (ARCHITECTURE.md 8.3 step 4, the prompts in `prompts/`):
//!
//! vendor `QUOTE`, buyer `ACCEPT` or `COUNTER`, vendor `ACCEPT` or `FINAL`, buyer `ACCEPT` or `WALK_AWAY`.
//!
//! Code checks every proposal against its sender's own limits (`limits::within`) and the agreement's structure
//! (`terms::structural`, which holds the acceptance window to the params); a proposal outside them is never
//! delivered: the sender is asked once more, and a second failure means that side walks away. An `ACCEPT` is valid
//! only if the standing proposal is inside the accepting side's limits; otherwise that side walks away. Before a
//! message reaches the other side, the leak filter removes the sender's private numbers from its reasons.

use crate::leak;
use accord_core::limits::{within, Mandate, Role};
use accord_core::terms::structural;
use accord_core::*;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

pub const BUYER_PROMPT: &str = include_str!("../prompts/buyer.md");
pub const VENDOR_PROMPT: &str = include_str!("../prompts/vendor.md");
pub const MESSAGE_SCHEMA: &str = include_str!("../prompts/message.schema.json");
pub const MAX_REASONS: usize = 600;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct MsgItem {
    pub name: String,
    pub amount: String,
    pub due_offset_secs: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct MsgAtlas {
    pub retainer_per_period: String,
    pub periods: u32,
    pub period_secs: u64,
    pub slots_per_period: u8,
    pub pass_threshold: u8,
    pub max_spread_bps: u32,
    pub min_depth_quote: String,
    pub depth_band_bps: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct MsgTerms {
    pub total: String,
    pub duration_secs: u64,
    pub acceptance_window_secs: u64,
    pub items: Vec<MsgItem>,
    pub atlas: Option<MsgAtlas>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Message {
    #[serde(rename = "type")]
    pub kind: String,
    pub terms: Option<MsgTerms>,
    pub reasons: String,
}

/// What the job copies from state into every set of terms.
#[derive(Clone, Debug)]
pub struct Context {
    pub kind: Kind,
    pub token: String,
    pub decimals: u8,
    pub params: Params,
    /// The buyer's shared venue (market-making), which the terms name.
    pub venue: Option<Venue>,
}

impl Context {
    pub fn venue_from(shared: &Value) -> Option<Venue> {
        let v = shared.get("venue")?;
        if v.get("kind")?.as_str()? != "rhea-dcl" {
            return None;
        }
        Some(Venue::RheaDcl {
            network: v.get("network")?.as_str()?.to_string(),
            contract: v.get("contract")?.as_str()?.to_string(),
            pool_id: v.get("pool_id")?.as_str()?.to_string(),
        })
    }
}

fn amount(s: &str) -> Option<Amount> {
    if s.is_empty() || s.len() > 39 || !s.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    s.parse().ok()
}

/// `Terms` from a message's terms plus the context; `None` when a field does not parse. Market-making derives one
/// item per period (`id = period + 1`, the retainer, due at the end of its period); procurement numbers the items
/// from 1 in the order given.
pub fn to_terms(t: &MsgTerms, ctx: &Context, doc_hash: [u8; 32]) -> Option<Terms> {
    let total = amount(&t.total)?;
    let (items, atlas) = match ctx.kind {
        Kind::Procurement => {
            if t.atlas.is_some() {
                return None;
            }
            let items = t
                .items
                .iter()
                .enumerate()
                .map(|(i, it)| {
                    Some(ItemTerms {
                        id: u32::try_from(i + 1).ok()?,
                        amount: amount(&it.amount)?,
                        due_offset_secs: it.due_offset_secs,
                        evidence: Evidence::DeliveryAccepted,
                    })
                })
                .collect::<Option<Vec<_>>>()?;
            (items, None)
        }
        Kind::MarketMaking => {
            let a = t.atlas.as_ref()?;
            let retainer = amount(&a.retainer_per_period)?;
            if a.periods == 0 || a.periods > accord_core::terms::MAX_ITEMS as u32 {
                return None;
            }
            let items = (0..a.periods)
                .map(|p| ItemTerms {
                    id: p + 1,
                    amount: retainer,
                    due_offset_secs: a.period_secs.saturating_mul(u64::from(p) + 1),
                    evidence: Evidence::PeriodEligible { period: p },
                })
                .collect();
            let atlas = AtlasTerms {
                retainer_per_period: retainer,
                periods: a.periods,
                period_secs: a.period_secs,
                slots_per_period: a.slots_per_period,
                pass_threshold: a.pass_threshold,
                venue: ctx.venue.clone()?,
                max_spread_bps: a.max_spread_bps,
                min_depth_quote: amount(&a.min_depth_quote)?,
                depth_band_bps: a.depth_band_bps,
            };
            (items, Some(atlas))
        }
    };
    Some(Terms {
        v: 1,
        kind: ctx.kind,
        token: ctx.token.clone(),
        decimals: ctx.decimals,
        total,
        items,
        acceptance_window_secs: t.acceptance_window_secs,
        duration_secs: t.duration_secs,
        params_hash: hash::jcs_sha256(&ctx.params),
        doc_hash,
        atlas,
    })
}

/// A proposal is deliverable when it parses, has the agreement's structure and sits inside `mandate`'s limits.
pub fn acceptable(t: &MsgTerms, ctx: &Context, mandate: &Mandate) -> bool {
    to_terms(t, ctx, [0; 32]).is_some_and(|terms| {
        structural(&terms, &ctx.token, &ctx.params).is_ok() && within(&terms, mandate)
    })
}

/// One side of the table.
#[derive(Clone, Debug)]
pub struct Party {
    pub account: String,
    pub mandate: Mandate,
}

/// A chat message for the model.
#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
pub struct Chat {
    pub role: &'static str,
    pub content: String,
}

/// Whoever answers for a side: NEAR AI in the job ([`crate::run::NearAiNegotiator`]), a script in tests.
/// `Err` is an infrastructure failure (the call or its verification failed) and ends the run.
pub trait Negotiator {
    fn ask(&mut self, side: Role, messages: &[Chat]) -> Result<String, String>;
}

#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
pub struct Delivered {
    pub from: Role,
    #[serde(rename = "type")]
    pub kind: String,
    pub terms: Option<MsgTerms>,
    pub reasons: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Ending {
    /// The accepted proposal.
    Accepted(MsgTerms),
    WalkAway,
}

#[derive(Clone, Debug)]
pub struct Result_ {
    pub ending: Ending,
    pub transcript: Vec<Delivered>,
}

impl Result_ {
    pub fn rounds(&self) -> u32 {
        self.transcript.len() as u32
    }
}

/// Parses a model's answer: the JSON object, tolerating code fences or text around it.
pub fn parse_message(content: &str) -> Option<Message> {
    let start = content.find('{')?;
    let end = content.rfind('}')?;
    serde_json::from_str(content.get(start..=end)?).ok()
}

fn truncate(s: &str, n: usize) -> String {
    s.chars().take(n).collect()
}

pub struct Table<'a> {
    pub ctx: &'a Context,
    pub buyer: &'a Party,
    pub vendor: &'a Party,
    pub salt: String,
}

enum Turn {
    Propose(MsgTerms, String),
    Accept(String),
    Walk(String),
}

impl Table<'_> {
    fn party(&self, side: Role) -> &Party {
        match side {
            Role::Buyer => self.buyer,
            Role::Vendor => self.vendor,
        }
    }

    pub fn system_prompt(&self, side: Role, transcript: &[Delivered], allowed: &[&str]) -> String {
        let pretty = |v: &Value| serde_json::to_string_pretty(v).unwrap_or_default();
        let own = self.party(side);
        let mandate_json = pretty(&json!({
            "kind": own.mandate.kind, "role": own.mandate.role, "shared": own.mandate.shared,
            "limits": own.mandate.limits, "instructions": own.mandate.instructions,
        }));
        let transcript_json = pretty(&serde_json::to_value(transcript).unwrap_or(Value::Null));
        let allowed = allowed.join(" or ");
        let filled = match side {
            Role::Buyer => BUYER_PROMPT
                .replace("{{buyer_name}}", &self.buyer.account)
                .replace("{{buyer_mandate_json}}", &mandate_json)
                .replace(
                    "{{vendor_shared_json}}",
                    &pretty(&self.vendor.mandate.shared),
                ),
            Role::Vendor => VENDOR_PROMPT
                .replace("{{vendor_name}}", &self.vendor.account)
                .replace("{{vendor_mandate_json}}", &mandate_json)
                .replace("{{buyer_shared_json}}", &pretty(&self.buyer.mandate.shared)),
        };
        let filled = filled
            .replace("{{transcript_json}}", &transcript_json)
            .replace("{{allowed_types}}", &allowed);
        format!("Session {}.\n\n{}", self.salt, filled)
    }

    /// One side's turn, with one retry for an undeliverable message.
    fn turn(
        &self,
        neg: &mut dyn Negotiator,
        side: Role,
        transcript: &[Delivered],
        allowed: &[&str],
        standing: Option<&MsgTerms>,
    ) -> Result<Turn, String> {
        let own = &self.party(side).mandate;
        let mut messages = vec![
            Chat {
                role: "system",
                content: self.system_prompt(side, transcript, allowed),
            },
            Chat {
                role: "user",
                content: format!(
                    "Write your next message as one JSON object. Allowed types: {}.",
                    allowed.join(" or ")
                ),
            },
        ];
        for attempt in 0..2 {
            let content = neg.ask(side, &messages)?;
            let problem = match parse_message(&content) {
                None => "it is not one JSON object matching the schema".to_string(),
                Some(m) if !allowed.contains(&m.kind.as_str()) => {
                    format!(
                        "{} is not allowed now; allowed: {}",
                        m.kind,
                        allowed.join(" or ")
                    )
                }
                Some(m) => {
                    let reasons = truncate(&m.reasons, MAX_REASONS);
                    match m.kind.as_str() {
                        "ACCEPT" => {
                            return Ok(match standing {
                                Some(t) if acceptable(t, self.ctx, own) => Turn::Accept(reasons),
                                _ => Turn::Walk(reasons),
                            })
                        }
                        "WALK_AWAY" => return Ok(Turn::Walk(reasons)),
                        _ => match m.terms {
                            Some(t) if acceptable(&t, self.ctx, own) => {
                                return Ok(Turn::Propose(t, reasons))
                            }
                            Some(_) => {
                                "the terms are outside your own limits or the agreement's structure"
                                    .to_string()
                            }
                            None => "a proposal needs complete terms".to_string(),
                        },
                    }
                }
            };
            if attempt == 0 {
                messages.push(Chat {
                    role: "assistant",
                    content,
                });
                messages.push(Chat {
                    role: "user",
                    content: format!(
                        "That message was not delivered: {problem}. Write it again as one JSON object. Allowed types: {}. This is your last attempt.",
                        allowed.join(" or ")
                    ),
                });
            }
        }
        Ok(Turn::Walk(String::new()))
    }

    fn deliver(&self, side: Role, kind: &str, terms: Option<MsgTerms>, reasons: &str) -> Delivered {
        Delivered {
            from: side,
            kind: kind.to_string(),
            terms,
            reasons: leak::filter(reasons, &self.party(side).mandate.limits, self.ctx.decimals),
        }
    }

    pub fn run(&self, neg: &mut dyn Negotiator) -> Result<Result_, String> {
        let mut tr: Vec<Delivered> = Vec::new();
        let done = |ending, transcript| Ok(Result_ { ending, transcript });

        // 1. Vendor quote.
        let quote = match self.turn(neg, Role::Vendor, &tr, &["QUOTE"], None)? {
            Turn::Propose(t, r) => {
                tr.push(self.deliver(Role::Vendor, "QUOTE", Some(t.clone()), &r));
                t
            }
            Turn::Walk(r) | Turn::Accept(r) => {
                tr.push(self.deliver(Role::Vendor, "WALK_AWAY", None, &r));
                return done(Ending::WalkAway, tr);
            }
        };
        // 2. Buyer accepts or counters.
        let counter =
            match self.turn(neg, Role::Buyer, &tr, &["ACCEPT", "COUNTER"], Some(&quote))? {
                Turn::Accept(r) => {
                    tr.push(self.deliver(Role::Buyer, "ACCEPT", None, &r));
                    return done(Ending::Accepted(quote), tr);
                }
                Turn::Propose(t, r) => {
                    tr.push(self.deliver(Role::Buyer, "COUNTER", Some(t.clone()), &r));
                    t
                }
                Turn::Walk(r) => {
                    tr.push(self.deliver(Role::Buyer, "WALK_AWAY", None, &r));
                    return done(Ending::WalkAway, tr);
                }
            };
        // 3. Vendor accepts or makes a final offer.
        let fin = match self.turn(neg, Role::Vendor, &tr, &["ACCEPT", "FINAL"], Some(&counter))? {
            Turn::Accept(r) => {
                tr.push(self.deliver(Role::Vendor, "ACCEPT", None, &r));
                return done(Ending::Accepted(counter), tr);
            }
            Turn::Propose(t, r) => {
                tr.push(self.deliver(Role::Vendor, "FINAL", Some(t.clone()), &r));
                t
            }
            Turn::Walk(r) => {
                tr.push(self.deliver(Role::Vendor, "WALK_AWAY", None, &r));
                return done(Ending::WalkAway, tr);
            }
        };
        // 4. Buyer accepts or walks away.
        match self.turn(neg, Role::Buyer, &tr, &["ACCEPT", "WALK_AWAY"], Some(&fin))? {
            Turn::Accept(r) => {
                tr.push(self.deliver(Role::Buyer, "ACCEPT", None, &r));
                done(Ending::Accepted(fin), tr)
            }
            Turn::Walk(r) => {
                tr.push(self.deliver(Role::Buyer, "WALK_AWAY", None, &r));
                done(Ending::WalkAway, tr)
            }
            Turn::Propose(..) => unreachable!("FINAL is answered with ACCEPT or WALK_AWAY only"),
        }
    }
}

/// The message schema as NEAR AI's `response_format` takes it.
pub fn response_format() -> Value {
    let mut schema: Value =
        serde_json::from_str(MESSAGE_SCHEMA).expect("message.schema.json parses");
    if let Value::Object(m) = &mut schema {
        m.remove("$schema");
        m.remove("title");
    }
    json!({"type": "json_schema", "json_schema": {"name": "accord_message", "strict": true, "schema": schema}})
}

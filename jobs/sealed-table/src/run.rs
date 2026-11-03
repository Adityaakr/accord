//! The `negotiate` run end to end (ARCHITECTURE.md 8.3) and its signed output (INTERFACES.md 7.1).

use crate::attest::{self, Attestation};
use crate::host::Host;
use crate::keys;
use crate::nearai::{self, ResponseRecord};
use crate::protocol::{self, Chat, Context, Ending, Negotiator, Party, Table};
use crate::sealing::{self, Opened};
use crate::state::{self, AgreementState, ReadError, StateSource};
use accord_core::hash::{jcs, jcs_sha256, sha256, to_hex};
use accord_core::limits::{self, Role};
use accord_core::terms::structural;
use accord_core::{Kind, Terms};
use accord_jobkit::keys::sign;
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::{json, Map, Value};

pub const NEARAI_KEY_VAR: &str = "NEARAI_API_KEY";
pub const TEMPERATURE: f64 = 0.2;
pub const MAX_TOKENS: u32 = 700;

pub struct Secrets {
    pub seed: [u8; 32],
    pub api_key: String,
}

/// The model side of a run: the attestation, then the negotiators' answers. [`NearAi`] in the job; the tests
/// script it, because a recorded report binds NEAR AI's signing key, which no test holds.
pub trait Ai: Negotiator {
    fn attest(&mut self, model: &str) -> Result<Attestation, String>;
    fn records(&self) -> Vec<ResponseRecord>;
    /// Prompt and completion tokens so far.
    fn usage(&self) -> (u64, u64);
}

/// NEAR AI Cloud: one verified report, then every answer a verified, model-signed completion.
pub struct NearAi<'a> {
    pub host: &'a dyn Host,
    pub api_key: &'a str,
    pub model: String,
    pub verified: Vec<String>,
    pub records: Vec<ResponseRecord>,
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
}

impl<'a> NearAi<'a> {
    pub fn new(host: &'a dyn Host, api_key: &'a str) -> Self {
        Self {
            host,
            api_key,
            model: String::new(),
            verified: Vec::new(),
            records: Vec::new(),
            prompt_tokens: 0,
            completion_tokens: 0,
        }
    }
}

impl Ai for NearAi<'_> {
    fn attest(&mut self, model: &str) -> Result<Attestation, String> {
        let a = attest::attest(self.host, self.api_key, model)?;
        self.model = model.to_string();
        self.verified = a.verified_signers();
        Ok(a)
    }
    fn records(&self) -> Vec<ResponseRecord> {
        self.records.clone()
    }
    fn usage(&self) -> (u64, u64) {
        (self.prompt_tokens, self.completion_tokens)
    }
}

impl Negotiator for NearAi<'_> {
    fn ask(&mut self, _side: Role, messages: &[Chat]) -> Result<String, String> {
        let body = json!({
            "model": self.model,
            "messages": messages,
            "stream": false,
            "temperature": TEMPERATURE,
            "max_tokens": MAX_TOKENS,
            "response_format": protocol::response_format(),
        });
        let bytes = serde_json::to_vec(&body).map_err(|e| e.to_string())?;
        let c = nearai::complete(self.host, self.api_key, &self.model, bytes, &self.verified)?;
        self.prompt_tokens += c.prompt_tokens;
        self.completion_tokens += c.completion_tokens;
        self.records.push(c.record);
        Ok(c.content)
    }
}

fn valid_input(input: &Value) -> Option<(&str, &str)> {
    let agreement = input.get("agreement")?.as_str()?;
    let nonce = input.get("request_nonce")?.as_str()?;
    let hex64 = nonce.len() == 64
        && nonce
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b));
    (input.get("mode")?.as_str()? == "negotiate"
        && accord_jobkit::is_account_id(agreement)
        && hex64)
        .then_some((agreement, nonce))
}

/// The output being built: the fixed head, then whatever the run reached.
struct Out(Map<String, Value>);

impl Out {
    fn set(&mut self, k: &str, v: Value) {
        self.0.insert(k.into(), v);
    }
    fn infrastructure(mut self, err: &str) -> Value {
        self.set("outcome", json!("infrastructure"));
        self.set("error", json!(err.chars().take(160).collect::<String>()));
        Value::Object(self.0)
    }
}

fn model_summary(model: &str, a: &Attestation) -> Value {
    if a.local {
        return json!({
            "id": model,
            "local": "deterministic local negotiator: no NEAR AI call, no attestation checked",
            "nonce": a.nonce,
            "candidates": [],
            "e2ee": false,
        });
    }
    let candidates: Vec<Value> = a
        .candidates
        .iter()
        .filter(|c| c.verified_model())
        .map(|c| json!({"signing_address": c.signing_address, "tdx": "ok", "gpu": "ok", "compose_hash": c.compose_hash}))
        .collect();
    let rejected = a.candidates.len() - candidates.len();
    let mut m = json!({
        "id": model,
        "nonce": a.nonce,
        "gateway": {"signing_address": a.gateway.signing_address, "tdx": "ok", "compose_hash": a.gateway.compose_hash},
        "candidates": candidates,
        "report_sha256": a.report_sha256,
        "e2ee": false,
    });
    if rejected > 0 {
        m["rejected_candidates"] = json!(rejected);
    }
    m
}

/// The commercial terms document (INTERFACES.md 6.5): both `shared` parts and the accepted items.
pub fn document(
    terms: &Terms,
    accepted: &protocol::MsgTerms,
    buyer: &Opened,
    vendor: &Opened,
) -> Value {
    let bs = &buyer.envelope.mandate.shared;
    let proposed = bs.get("proposed_items").and_then(Value::as_array);
    let items: Vec<Value> = terms
        .items
        .iter()
        .enumerate()
        .map(|(i, it)| match terms.kind {
            Kind::Procurement => {
                let name = accepted.items.get(i).map(|x| x.name.as_str()).unwrap_or("");
                let deliverable = proposed
                    .and_then(|ps| {
                        ps.iter().find(|p| {
                            p.get("name").and_then(Value::as_str).is_some_and(|n| n.eq_ignore_ascii_case(name))
                        })
                    })
                    .and_then(|p| p.get("deliverable").cloned())
                    .unwrap_or(Value::Null);
                json!({"id": it.id, "name": name, "deliverable": deliverable})
            }
            Kind::MarketMaking => json!({"id": it.id, "name": format!("Period {}", it.id), "deliverable": Value::Null}),
        })
        .collect();
    json!({
        "scope": bs.get("scope").cloned().unwrap_or(Value::Null),
        "items": items,
        "buyer_shared": bs,
        "vendor_shared": vendor.envelope.mandate.shared,
    })
}

/// Runs `negotiate` against NEAR AI and returns the signed output (or an unsigned error for malformed input).
pub fn negotiate(
    host: &dyn Host,
    src: &dyn StateSource,
    input: &Value,
    secrets: &Secrets,
) -> Value {
    let mut ai = NearAi::new(host, &secrets.api_key);
    negotiate_with(host, src, input, secrets, &mut ai)
}

pub fn negotiate_with(
    host: &dyn Host,
    src: &dyn StateSource,
    input: &Value,
    secrets: &Secrets,
    ai: &mut dyn Ai,
) -> Value {
    let key = keys::signing_key(&secrets.seed);
    let Some((agreement, nonce)) = valid_input(input) else {
        return accord_jobkit::error_output(
            "negotiate",
            "input must be {mode: negotiate, agreement, request_nonce}",
        );
    };
    let mut out = Out(Map::new());
    out.set("mode", json!("negotiate"));
    out.set("agreement", json!(agreement));
    out.set("request_nonce", json!(nonce));
    let value = run(host, src, agreement, nonce, secrets, ai, out);
    sign(value, &key)
}

fn run(
    host: &dyn Host,
    src: &dyn StateSource,
    agreement: &str,
    nonce: &str,
    secrets: &Secrets,
    ai: &mut dyn Ai,
    mut out: Out,
) -> Value {
    // 1. State.
    let st: AgreementState = match state::read(host, src, agreement, nonce) {
        Ok(s) => s,
        Err(ReadError::Infrastructure(e)) => return out.infrastructure(&e),
    };
    out.set("release", json!(st.release));
    out.set("buyer_commitment", json!(st.buyer_commitment.commitment));
    out.set("vendor_commitment", json!(st.vendor_commitment.commitment));

    let zero_usage = json!({"prompt_tokens": 0, "completion_tokens": 0, "cost_usd_micros": 0});

    // 2. Open both envelopes.
    let secret = keys::mandate_secret(&secrets.seed);
    let opened = sealing::open(&secret, &st.buyer_commitment, Role::Buyer, &st).and_then(|b| {
        Ok((
            b,
            sealing::open(&secret, &st.vendor_commitment, Role::Vendor, &st)?,
        ))
    });
    let (buyer, vendor) = match opened {
        Ok(p) => p,
        Err(_) => {
            let r = Record {
                rounds: 0,
                transcript_hash: Value::Null,
                model: Value::Null,
                responses: json!([]),
                usage: zero_usage,
            };
            return no_deal(out, "BAD_INPUT", r);
        }
    };

    // 3. Attestation, once, before any completion.
    let att = match ai.attest(&st.model) {
        Ok(a) => a,
        Err(e) => return out.infrastructure(&format!("attestation: {e}")),
    };
    if !att.gateway.tdx_ok {
        return out.infrastructure("attestation: the gateway part did not verify");
    }
    if att.verified_signers().is_empty() {
        return out.infrastructure("attestation: no model candidate verified");
    }
    let model = model_summary(&st.model, &att);

    // 4 to 6. The protocol.
    let ctx = Context {
        kind: st.kind,
        token: st.token.clone(),
        decimals: st.decimals,
        params: st.params.clone(),
        venue: Context::venue_from(&buyer.envelope.mandate.shared),
    };
    let bp = Party {
        account: st.buyer.clone(),
        mandate: buyer.envelope.mandate.clone(),
    };
    let vp = Party {
        account: st.vendor.clone(),
        mandate: vendor.envelope.mandate.clone(),
    };
    let table = Table {
        ctx: &ctx,
        buyer: &bp,
        vendor: &vp,
        salt: hex::encode(host.random(32)),
    };
    let result = match table.run(ai) {
        Ok(r) => r,
        Err(e) => return out.infrastructure(&e),
    };
    let responses = serde_json::to_value(ai.records()).unwrap_or(Value::Null);
    let (pt, ct) = ai.usage();
    let usage = json!({
        "prompt_tokens": pt,
        "completion_tokens": ct,
        "cost_usd_micros": nearai::cost_usd_micros(&st.model, pt, ct),
    });
    let record = Record {
        rounds: result.rounds(),
        transcript_hash: json!(to_hex(&jcs_sha256(&result.transcript))),
        model,
        responses,
        usage,
    };
    match result.ending {
        Ending::WalkAway => no_deal(out, "WALK_AWAY", record),
        Ending::Accepted(t) => conclude(out, &st, &ctx, &t, (&buyer, &vendor), record),
    }
}

/// What every no-deal or terms output carries about the run.
pub struct Record {
    pub rounds: u32,
    pub transcript_hash: Value,
    pub model: Value,
    pub responses: Value,
    pub usage: Value,
}

fn no_deal(mut out: Out, reason: &str, r: Record) -> Value {
    out.set("outcome", json!("no_deal"));
    out.set("terms", Value::Null);
    out.set("terms_hash", Value::Null);
    out.set("no_deal_reason", json!(reason));
    out.set("rounds", json!(r.rounds));
    out.set("transcript_hash", r.transcript_hash);
    out.set("documents", Value::Null);
    out.set("model", r.model);
    out.set("responses", r.responses);
    out.set("usage", r.usage);
    Value::Object(out.0)
}

/// Steps 7 to 9: the full limit check on terms built from the accepted message and state (a failure says only
/// `LIMIT_CHECK`, never which limit or side), the commercial terms document encrypted to both parties, the output.
fn conclude(
    mut out: Out,
    st: &AgreementState,
    ctx: &Context,
    accepted: &protocol::MsgTerms,
    (buyer, vendor): (&Opened, &Opened),
    r: Record,
) -> Value {
    let Some(draft) = protocol::to_terms(accepted, ctx, [0; 32]) else {
        return no_deal(out, "LIMIT_CHECK", r);
    };
    let doc = document(&draft, accepted, buyer, vendor);
    let doc_bytes = jcs(&doc);
    let mut terms = draft;
    terms.doc_hash = sha256(&doc_bytes);
    let (bm, vm) = (&buyer.envelope.mandate, &vendor.envelope.mandate);
    if limits::check(&terms, bm, vm).is_err() || structural(&terms, &st.token, &st.params).is_err()
    {
        return no_deal(out, "LIMIT_CHECK", r);
    }
    let docs = sealing::encrypt_document(&buyer.envelope.doc_pubkey, &doc_bytes).and_then(|b| {
        Ok((
            b,
            sealing::encrypt_document(&vendor.envelope.doc_pubkey, &doc_bytes)?,
        ))
    });
    let (doc_b, doc_v) = match docs {
        Ok(d) => d,
        Err(e) => return out.infrastructure(&e),
    };
    out.set("outcome", json!("terms"));
    out.set("terms_hash", json!(to_hex(&jcs_sha256(&terms))));
    out.set("terms", serde_json::to_value(&terms).unwrap_or(Value::Null));
    out.set("no_deal_reason", Value::Null);
    out.set("rounds", json!(r.rounds));
    out.set("transcript_hash", r.transcript_hash);
    out.set(
        "documents",
        json!({"buyer": STANDARD.encode(doc_b), "vendor": STANDARD.encode(doc_v)}),
    );
    out.set("model", r.model);
    out.set("responses", r.responses);
    out.set("usage", r.usage);
    Value::Object(out.0)
}

/// [`conclude`] for tests: the output (unsigned) for `accepted` terms, given the state and both opened envelopes.
pub fn conclude_for_test(
    st: &AgreementState,
    accepted: &protocol::MsgTerms,
    buyer: &Opened,
    vendor: &Opened,
) -> Value {
    let ctx = Context {
        kind: st.kind,
        token: st.token.clone(),
        decimals: st.decimals,
        params: st.params.clone(),
        venue: Context::venue_from(&buyer.envelope.mandate.shared),
    };
    let r = Record {
        rounds: 4,
        transcript_hash: Value::Null,
        model: Value::Null,
        responses: json!([]),
        usage: Value::Null,
    };
    conclude(Out(Map::new()), st, &ctx, accepted, (buyer, vendor), r)
}

/// The job's entry for one input (both modes).
pub fn handle(
    host: &dyn Host,
    src: &dyn StateSource,
    input: &Value,
    secrets: Result<Secrets, String>,
) -> Value {
    let mode = accord_jobkit::mode(input).to_string();
    let secrets = match secrets {
        Ok(s) => s,
        Err(e) => return accord_jobkit::error_output(&mode, e),
    };
    match mode.as_str() {
        "pubkey" => keys::pubkey_output(&secrets.seed),
        "negotiate" => negotiate(host, src, input, &secrets),
        other => accord_jobkit::error_output(other, "mode must be pubkey or negotiate"),
    }
}

/// Secrets from the environment (OutLayer injects them as variables). `pubkey` needs only the seed.
pub fn secrets_from_env(mode: &str) -> Result<Secrets, String> {
    let seed = accord_jobkit::keys::seed_from_env(keys::SEED_VAR)?;
    let api_key = match std::env::var(NEARAI_KEY_VAR) {
        Ok(k) if !k.trim().is_empty() => k.trim().to_string(),
        _ if mode == "pubkey" => String::new(),
        _ => return Err(format!("{NEARAI_KEY_VAR} is not set")),
    };
    Ok(Secrets { seed, api_key })
}

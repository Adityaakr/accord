//! The Accord Atlas observer (INTERFACES.md 7.3, ARCHITECTURE.md 9.2 and 9.3).
//!
//! `{"mode": "observe", "agreement", "period", "slot"}`: reads the agreement's terms and `executing_at` from
//! testnet state over the pinned endpoints, takes the current time from the latest final testnet block (never the
//! host clock), and computes the hidden slot time from `PROTECTED_OBSERVER_SEED`. Before that time, or while no
//! final mainnet block at or after it exists, it answers `{"mode": "observe", "status": "not_yet"}`, unsigned and
//! saying nothing about the time. After it, it measures the venue at the first final mainnet block at or after
//! the slot time and signs the `Observation` plus `mode` and `status`, the exact object `record_observation`
//! rebuilds (`contracts/agreement/src/evidence.rs`, `observation_payload`). Every caller after the slot time gets
//! the same block, the same values and the same signature.
//!
//! `{"mode": "pubkey"}`: the signing key, signed by itself, for the factory's `store_pubkey`.

use accord_core::atlas::slot_time;
use accord_core::types::{AtlasTerms, BlockRef, Observation, Terms, Venue};
use accord_jobkit::http::Http;
use accord_jobkit::keys::{self, OBSERVER_SIGN_INFO};
use accord_jobkit::rpc::{self, NearRpc, MAINNET, MAINNET_ARCHIVAL_FIRST, TESTNET};
use accord_jobkit::{error_output, is_account_id};
use accord_venue::{final_head, first_final_block_at_or_after, measure};
use serde_json::{json, Value};
use std::time::Duration;

pub const SEED_VAR: &str = "PROTECTED_OBSERVER_SEED";
pub const JOB: &str = "observer";

/// Older slot times read mainnet from the archival endpoint first: the public nodes kept about 12 h in probe 0.7.
pub const ARCHIVAL_AFTER_SECS: u64 = 6 * 3600;

pub struct Deps<'a> {
    pub http: &'a dyn Http,
    pub seed: [u8; 32],
    /// How long to keep retrying a testnet state read that failed (up to 15 s inside the enclave).
    pub retry: Duration,
    /// Pause between retries and after a rate limit (zero in tests).
    pub pause: Duration,
}

impl<'a> Deps<'a> {
    pub fn enclave(http: &'a dyn Http, seed: [u8; 32]) -> Self {
        Self {
            http,
            seed,
            retry: Duration::from_secs(15),
            pause: Duration::from_millis(500),
        }
    }
}

pub fn run(input: &Value, deps: &Deps) -> Value {
    match accord_jobkit::mode(input) {
        "pubkey" => keys::pubkey_output(JOB, &keys::signing_key(&deps.seed, OBSERVER_SIGN_INFO)),
        "observe" => observe(input, deps).unwrap_or_else(|e| error_output("observe", e)),
        other => error_output(other, "unknown mode: expected pubkey or observe"),
    }
}

#[derive(Debug, PartialEq, Eq)]
struct Ask {
    agreement: String,
    period: u32,
    slot: u8,
}

fn parse(input: &Value) -> Result<Ask, String> {
    let agreement = input["agreement"]
        .as_str()
        .filter(|a| is_account_id(a))
        .ok_or("agreement: a NEAR account id")?
        .to_string();
    let period = input["period"]
        .as_u64()
        .and_then(|p| u32::try_from(p).ok())
        .ok_or("period: an integer")?;
    let slot = input["slot"]
        .as_u64()
        .and_then(|s| u8::try_from(s).ok())
        .ok_or("slot: an integer below 256")?;
    Ok(Ask {
        agreement,
        period,
        slot,
    })
}

fn not_yet() -> Value {
    json!({"mode": "observe", "status": "not_yet"})
}

/// The agreement's Atlas terms and `executing_at`, read from its own state.
fn read_state(rpc: &NearRpc, ask: &Ask, deps: &Deps) -> Result<(AtlasTerms, u64), String> {
    let terms = rpc::retry(deps.retry, deps.pause, || {
        rpc::view_json(rpc, &ask.agreement, "get_terms", &json!({}), "optimistic").map(Some)
    })?
    .unwrap_or(Value::Null);
    if terms.is_null() {
        return Err("the agreement has no terms".into());
    }
    let terms: Terms = serde_json::from_value(terms).map_err(|e| format!("get_terms: {e}"))?;
    let atlas = terms.atlas.ok_or("not a market-making agreement")?;
    let ag = rpc::retry(deps.retry, deps.pause, || {
        rpc::view_json(
            rpc,
            &ask.agreement,
            "get_agreement",
            &json!({}),
            "optimistic",
        )
        .map(Some)
    })?
    .unwrap_or(Value::Null);
    let executing_at = ag["executing_at"]
        .as_u64()
        .ok_or("the agreement is not executing")?;
    Ok((atlas, executing_at))
}

fn observe(input: &Value, deps: &Deps) -> Result<Value, String> {
    let ask = parse(input)?;
    let testnet = NearRpc::new(deps.http, TESTNET, deps.pause);
    let (at, executing_at) = read_state(&testnet, &ask, deps)?;
    if ask.period >= at.periods || ask.slot >= at.slots_per_period {
        return Err("period or slot outside the terms".into());
    }
    let Venue::RheaDcl {
        network,
        contract,
        pool_id,
    } = &at.venue;
    if network != "mainnet" {
        return Err(format!(
            "venue network {network}: this build reads mainnet only"
        ));
    }

    let now = final_head(&testnet)?.time;
    let period_start = executing_at + u64::from(ask.period) * at.period_secs;
    let t = slot_time(
        &deps.seed,
        &ask.agreement,
        ask.period,
        ask.slot,
        period_start,
        at.period_secs,
        at.slots_per_period,
    );
    if now < t {
        return Ok(not_yet());
    }

    let mainnet = NearRpc::new(deps.http, MAINNET, deps.pause);
    let head = final_head(&mainnet)?;
    if head.time < t {
        return Ok(not_yet());
    }
    let endpoints = if head.time - t > ARCHIVAL_AFTER_SECS {
        MAINNET_ARCHIVAL_FIRST
    } else {
        MAINNET
    };
    let venue_rpc = NearRpc::new(deps.http, endpoints, deps.pause);
    let Some(block) = first_final_block_at_or_after(&venue_rpc, t)? else {
        return Ok(not_yet());
    };
    let m = measure(
        &venue_rpc,
        contract,
        pool_id,
        block.height,
        at.depth_band_bps,
    )?;
    if venue_rpc.failed() {
        // A read that failed on every endpoint would have been measured as zero: never sign that.
        return Err("a mainnet read failed on every endpoint; try again".into());
    }
    let observation = Observation {
        agreement: ask.agreement,
        period: ask.period,
        slot: ask.slot,
        slot_time: t,
        venue: at.venue.clone(),
        band_bps: at.depth_band_bps,
        venue_block: BlockRef {
            height: block.height,
            hash: block.hash,
            time: block.time,
        },
        mid: m.mid,
        spread_bps: m.spread_bps,
        depth_bid: m.depth_bid,
        depth_ask: m.depth_ask,
        two_sided: m.two_sided,
    };
    Ok(signed_observation(&observation, &deps.seed))
}

/// The signed answer: `Observation ∪ {"mode": "observe", "status": "observed"}` plus `sig`.
pub fn signed_observation(o: &Observation, seed: &[u8; 32]) -> Value {
    let mut v = serde_json::to_value(o).expect("an observation serialises");
    v["mode"] = json!("observe");
    v["status"] = json!("observed");
    keys::sign(v, &keys::signing_key(seed, OBSERVER_SIGN_INFO))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn input_is_checked() {
        let ok =
            json!({"mode": "observe", "agreement": "a1.accord-v1.testnet", "period": 2, "slot": 5});
        assert_eq!(
            parse(&ok).unwrap(),
            Ask {
                agreement: "a1.accord-v1.testnet".into(),
                period: 2,
                slot: 5
            }
        );
        for bad in [
            json!({"agreement": "A1", "period": 0, "slot": 0}),
            json!({"agreement": "a1.x.testnet", "period": -1, "slot": 0}),
            json!({"agreement": "a1.x.testnet", "period": 0, "slot": 256}),
            json!({"agreement": "a1.x.testnet", "period": "0", "slot": 0}),
        ] {
            assert!(parse(&bad).is_err(), "{bad}");
        }
    }
}

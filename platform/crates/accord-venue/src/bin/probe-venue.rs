//! make probe-venue (PROGRESS 0.7): the first final mainnet block at or after a time, the venue's metrics there,
//! and the same metrics recomputed from an archival endpoint. View calls only: nothing is signed.

use accord_venue::*;
use serde_json::Value;
use std::time::{SystemTime, UNIX_EPOCH};

struct Http(String);
impl Rpc for Http {
    fn call(&self, method: &str, params: Value) -> Result<Value, String> {
        let body = serde_json::json!({"jsonrpc": "2.0", "id": "accord", "method": method, "params": params});
        for attempt in 0..4 {
            match ureq::post(&self.0).send_json(body.clone()) {
                Ok(r) => return r.into_json().map_err(|e| e.to_string()),
                Err(ureq::Error::Status(429 | 502 | 503 | 504, _)) if attempt < 3 => {
                    std::thread::sleep(std::time::Duration::from_millis(800 * (attempt + 1)))
                }
                Err(e) => return Err(e.to_string()),
            }
        }
        Err("rpc: retries exhausted".into())
    }
}

const CONTRACT: &str = "dclv2.ref-labs.near";
const POOL: &str =
    "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1|wrap.near|2000";

fn main() {
    let rpc = Http(
        std::env::var("NEAR_MAINNET_RPC_URL").unwrap_or("https://free.rpc.fastnear.com".into()),
    );
    let archival = Http(
        std::env::var("NEAR_MAINNET_ARCHIVAL_RPC_URL")
            .unwrap_or("https://archival-rpc.mainnet.fastnear.com".into()),
    );
    let band: u32 = 200;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let t: u64 = std::env::args()
        .nth(1)
        .and_then(|a| a.parse().ok())
        .unwrap_or(now - 120);

    let block = match first_final_block_at_or_after(&rpc, t) {
        Ok(Some(b)) => b,
        Ok(None) => return println!("not_yet: no final mainnet block at or after {t}"),
        Err(e) => panic!("{e}"),
    };
    let started = std::time::Instant::now();
    let m = measure(&rpc, CONTRACT, POOL, block.height, band).unwrap_or_else(|e| panic!("{e}"));
    let took = started.elapsed().as_millis();
    println!(
        "block {} ({}, time {} for slot time {t}) · mid {} wNEAR per USDC · spread {} bps · depth bid {} / ask {} USDC within {band} bps · two-sided {} · {} calls in {took} ms",
        block.height, block.hash, block.time, m.mid, m.spread_bps, usdc(m.depth_bid), usdc(m.depth_ask), m.two_sided, m.calls
    );
    match measure(&archival, CONTRACT, POOL, block.height, band) {
        Ok(a) if a == m => println!("archival: reproduced exactly at block {}", block.height),
        Ok(a) => println!("archival: DIFFERS at block {}: {a:?}", block.height),
        Err(e) => println!("archival: unavailable ({e})"),
    }
}

fn usdc(v: u128) -> String {
    format!("{}.{:02}", v / 1_000_000, (v % 1_000_000) / 10_000)
}

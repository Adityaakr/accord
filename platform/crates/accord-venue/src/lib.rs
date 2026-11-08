//! Accord Atlas venue reads (ARCHITECTURE.md 9.3): Rhea DCL's mid, spread and depth at one mainnet block, through
//! view calls only. Integer and fixed-point arithmetic throughout, so the probe, the observer job and anyone
//! recomputing from an archival node get the same numbers.

use base64::Engine;
use ethnum::U256;
use serde_json::{json, Value};

/// Any NEAR JSON-RPC transport: the probe uses HTTPS, the observer job uses OutLayer's HTTP from the enclave.
pub trait Rpc {
    fn call(&self, method: &str, params: Value) -> Result<Value, String>;
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BlockInfo {
    pub height: u64,
    pub hash: String,
    /// Unix seconds (the header's nanoseconds, truncated).
    pub time: u64,
}

fn header(rpc: &dyn Rpc, params: Value) -> Result<Option<BlockInfo>, String> {
    let r = rpc.call("block", params)?;
    if let Some(e) = r.get("error") {
        let s = e.to_string();
        // Skipped heights have no block: callers step past them.
        if s.contains("UNKNOWN_BLOCK") || s.contains("DB Not Found") || s.contains("NOT_FOUND") {
            return Ok(None);
        }
        return Err(format!("block: {s}"));
    }
    let h = &r["result"]["header"];
    let ns: u64 = h["timestamp_nanosec"]
        .as_str()
        .and_then(|s| s.parse().ok())
        .or_else(|| h["timestamp"].as_u64())
        .ok_or("block: no timestamp")?;
    Ok(Some(BlockInfo {
        height: h["height"].as_u64().ok_or("block: no height")?,
        hash: h["hash"].as_str().ok_or("block: no hash")?.to_string(),
        time: ns / 1_000_000_000,
    }))
}

pub fn final_head(rpc: &dyn Rpc) -> Result<BlockInfo, String> {
    header(rpc, json!({"finality": "final"}))?.ok_or_else(|| "no final head".into())
}

/// The block at `height`, or the next existing one above it (skipped heights have none), never above `max`.
pub fn block_from(rpc: &dyn Rpc, height: u64, max: u64) -> Result<Option<BlockInfo>, String> {
    let mut h = height;
    while h <= max {
        if let Some(b) = header(rpc, json!({"block_id": h}))? {
            return Ok(Some(b));
        }
        h += 1;
    }
    Ok(None)
}

/// The first final block whose time is at or after `t`, or `None` while no final block that late exists
/// (`not_yet`). Searching only below the final head keeps every caller on the same block.
pub fn first_final_block_at_or_after(rpc: &dyn Rpc, t: u64) -> Result<Option<BlockInfo>, String> {
    let head = final_head(rpc)?;
    if head.time < t {
        return Ok(None);
    }
    // Find a lower bound strictly before t: step back by the time gap in blocks, doubling until it is early enough.
    let mut back = (head.time - t + 2).max(2);
    let mut lo = loop {
        let h = head.height.saturating_sub(back);
        match block_from(rpc, h, head.height)? {
            Some(b) if b.time < t => break b.height,
            _ if h == 0 => break 0,
            _ => back *= 2,
        }
    };
    let mut hi = head.height; // time >= t
    while hi - lo > 1 {
        let mid = lo + (hi - lo) / 2;
        match block_from(rpc, mid, hi)? {
            Some(b) if b.height < hi && b.time < t => lo = b.height,
            Some(b) if b.height < hi => hi = b.height,
            _ => hi = mid, // every height from mid to hi − 1 was skipped: the answer is hi or below mid
        }
    }
    block_from(rpc, hi, head.height)
}

/// A contract view at a block height, JSON in and out.
pub fn view(
    rpc: &dyn Rpc,
    contract: &str,
    method: &str,
    args: &Value,
    height: u64,
) -> Result<Value, String> {
    let r = rpc.call(
        "query",
        json!({"request_type": "call_function", "account_id": contract, "method_name": method,
               "args_base64": base64::engine::general_purpose::STANDARD.encode(args.to_string()), "block_id": height}),
    )?;
    if let Some(e) = r.get("error") {
        return Err(format!("{method}: {e}"));
    }
    let res = &r["result"];
    if let Some(e) = res.get("error") {
        return Err(format!("{method}: {e}"));
    }
    let bytes: Vec<u8> = res["result"]
        .as_array()
        .ok_or(format!("{method}: no result"))?
        .iter()
        .map(|b| b.as_u64().unwrap_or(0) as u8)
        .collect();
    serde_json::from_slice(&bytes).map_err(|e| format!("{method}: {e}"))
}

pub const SCALE: u128 = 1_000_000_000_000_000_000; // 1e18

fn pow10(n: u32) -> U256 {
    U256::from(10u8).pow(n)
}

/// `1.0001^point × 1e18`, by squaring in fixed point (truncating each step, so the result is the same everywhere).
pub fn price_fixed(point: i64) -> U256 {
    let s = U256::from(SCALE);
    let mut base = U256::from(1_000_100_000_000_000_000u128);
    let mut r = s;
    let mut e = point.unsigned_abs();
    while e > 0 {
        if e & 1 == 1 {
            r = r * base / s;
        }
        base = base * base / s;
        e >>= 1;
    }
    if point < 0 {
        s * s / r
    } else {
        r
    }
}

/// A decimal string with 18 places from a value scaled by 1e18.
pub fn fixed18(v: U256) -> String {
    let s = U256::from(SCALE);
    format!("{}.{:018}", v / s, (v % s).as_u128())
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Pool {
    pub token_x: String,
    pub token_y: String,
    pub current_point: i64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Metrics {
    /// Price of token x in token y (human units), 18 decimal places.
    pub mid: String,
    pub spread_bps: u32,
    /// USDC base units the pool pays for wNEAR, and takes for wNEAR, within the band of the mid.
    pub depth_bid: u128,
    pub depth_ask: u128,
    pub two_sided: bool,
    pub calls: u32,
}

/// The pool's tokens: USDC (x, 6 decimals) and wNEAR (y, 24 decimals). Other pools are out of scope for the demo.
pub const DEC_X: u32 = 6;
pub const DEC_Y: u32 = 24;
/// The spread probe size: 10 USDC each way.
pub const PROBE_X: u128 = 10_000_000;
/// The depth search stops at 10 million USDC.
pub const DEPTH_CAP_X: u128 = 10_000_000_000_000;

struct Venue<'a> {
    rpc: &'a dyn Rpc,
    contract: &'a str,
    pool_id: &'a str,
    pool: Pool,
    height: u64,
    calls: u32,
}

impl Venue<'_> {
    fn quote(&mut self, input: &str, output: &str, amount: U256) -> u128 {
        self.calls += 1;
        let args = json!({"pool_ids": [self.pool_id], "input_token": input, "output_token": output,
                          "input_amount": amount.to_string(), "tag": null});
        view(self.rpc, self.contract, "quote", &args, self.height)
            .ok()
            .and_then(|v| v["amount"].as_str().and_then(|s| s.parse().ok()))
            .unwrap_or(0)
    }
    /// Price in y per x, scaled 1e18 human units, for `y` wNEAR raw against `x` USDC raw.
    fn price(y: U256, x: U256) -> U256 {
        y * pow10(18 + DEC_X) / (x * pow10(DEC_Y))
    }
    /// Sell `x` USDC for wNEAR: the price received, and whether anything came back.
    fn sell_x(&mut self, x: u128) -> Option<U256> {
        let (tx, ty) = (self.pool.token_x.clone(), self.pool.token_y.clone());
        let y = self.quote(&tx, &ty, U256::from(x));
        (y > 0).then(|| Self::price(U256::from(y), U256::from(x)))
    }
    /// Spend wNEAR worth about `x` USDC at the mid: the price paid and the USDC received.
    fn buy_x(&mut self, x: u128, mid: U256) -> Option<(U256, u128)> {
        let y_in = U256::from(x) * mid * pow10(DEC_Y) / (pow10(18 + DEC_X));
        let (tx, ty) = (self.pool.token_x.clone(), self.pool.token_y.clone());
        let x_out = self.quote(&ty, &tx, y_in);
        (x_out > 0).then(|| (Self::price(y_in, U256::from(x_out)), x_out))
    }
}

/// Largest size in `[lo, cap]` for which `ok` holds: grow ×4 until it fails, then six bisection steps.
fn search(mut ok: impl FnMut(u128) -> Option<u128>, start: u128, cap: u128) -> u128 {
    let Some(mut best) = ok(start) else { return 0 };
    let mut lo = start;
    let mut hi = loop {
        let next = lo.saturating_mul(4).min(cap);
        if next == lo {
            return best;
        }
        match ok(next) {
            Some(v) => {
                best = v;
                lo = next;
            }
            None => break next,
        }
    };
    for _ in 0..6 {
        let mid = lo + (hi - lo) / 2;
        match ok(mid) {
            Some(v) => {
                best = v;
                lo = mid;
            }
            None => hi = mid,
        }
    }
    best
}

pub fn read_pool(
    rpc: &dyn Rpc,
    contract: &str,
    pool_id: &str,
    height: u64,
) -> Result<Pool, String> {
    let p = view(
        rpc,
        contract,
        "get_pool",
        &json!({"pool_id": pool_id}),
        height,
    )?;
    Ok(Pool {
        token_x: p["token_x"].as_str().ok_or("get_pool: token_x")?.into(),
        token_y: p["token_y"].as_str().ok_or("get_pool: token_y")?.into(),
        current_point: p["current_point"]
            .as_i64()
            .ok_or("get_pool: current_point")?,
    })
}

/// Mid, spread, both depths and two-sidedness of `pool_id` at `height`, with `band_bps` around the mid.
pub fn measure(
    rpc: &dyn Rpc,
    contract: &str,
    pool_id: &str,
    height: u64,
    band_bps: u32,
) -> Result<Metrics, String> {
    let pool = read_pool(rpc, contract, pool_id, height)?;
    let mid = price_fixed(pool.current_point) * pow10(DEC_X) / pow10(DEC_Y); // y per x, human, ×1e18
    let mut v = Venue {
        rpc,
        contract,
        pool_id,
        pool,
        height,
        calls: 1,
    };
    let bid = v.sell_x(PROBE_X);
    let ask = v.buy_x(PROBE_X, mid).map(|(p, _)| p);
    let two_sided = bid.is_some() && ask.is_some();
    let spread_bps = match (bid, ask) {
        (Some(b), Some(a)) if a >= b && mid > 0 => ((a - b) * U256::from(10_000u32) / mid).as_u32(),
        _ => u32::MAX,
    };
    let floor = mid * U256::from(10_000 - band_bps.min(10_000)) / U256::from(10_000u32);
    let ceil = mid * U256::from(10_000 + band_bps) / U256::from(10_000u32);
    // Ask side: traders pay USDC for wNEAR; the pool's price stays above the floor in y per x.
    let depth_ask = search(
        |x| v.sell_x(x).filter(|p| *p >= floor).map(|_| x),
        PROBE_X,
        DEPTH_CAP_X,
    );
    // Bid side: traders sell wNEAR for USDC; the USDC received at a price below the ceiling.
    let depth_bid = search(
        |x| {
            v.buy_x(x, mid)
                .filter(|(p, _)| *p <= ceil)
                .map(|(_, out)| out)
        },
        PROBE_X,
        DEPTH_CAP_X,
    );
    Ok(Metrics {
        mid: fixed18(mid),
        spread_bps,
        depth_bid,
        depth_ask,
        two_sided,
        calls: v.calls,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn price_fixed_matches_known_points() {
        assert_eq!(price_fixed(0), U256::from(SCALE));
        assert_eq!(price_fixed(1), U256::from(1_000_100_000_000_000_000u128));
        // 1.0001^10000 = 2.71814592682...
        let p = price_fixed(10_000);
        assert!(
            p > U256::from(2_718_145_000_000_000_000u128)
                && p < U256::from(2_718_146_000_000_000_000u128),
            "{p}"
        );
        let inv = price_fixed(-10_000);
        assert!(
            inv > U256::from(367_897_000_000_000_000u128)
                && inv < U256::from(367_898_000_000_000_000u128),
            "{inv}"
        );
    }

    #[test]
    fn fixed18_formats() {
        assert_eq!(
            fixed18(U256::from(225_176_000_000_000_000u128)),
            "0.225176000000000000"
        );
        assert_eq!(fixed18(U256::from(SCALE * 3 + 5)), "3.000000000000000005");
    }

    #[test]
    fn search_finds_the_edge() {
        let edge = 1_234_567_890u128;
        let r = search(|x| (x <= edge).then_some(x), 10_000_000, DEPTH_CAP_X);
        assert!(r <= edge && r * 100 >= edge * 97, "{r}");
        assert_eq!(search(|_| None, 10_000_000, DEPTH_CAP_X), 0);
        assert_eq!(search(Some, 10_000_000, DEPTH_CAP_X), DEPTH_CAP_X);
    }
}

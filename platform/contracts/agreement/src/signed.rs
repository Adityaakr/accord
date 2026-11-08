//! Signed job outputs. Every job signs `JCS(output without "sig")` with an ed25519 key derived from its own seed;
//! the contract checks that signature against the release's key, so who delivered a result does not matter.

use accord_core::hash::signed_bytes;
use near_sdk::base64::{engine::general_purpose::STANDARD, Engine};
use near_sdk::{env, PublicKey};
use serde_json::Value;

/// Signed outputs are compact (the Sealed Table's targets under 4 KB); anything larger is refused unread.
pub const MAX_OUTPUT: usize = 16 * 1024;

/// `true` when `output["sig"]` is a valid ed25519 signature by `key` over the output's signed bytes.
pub fn verify(output: &Value, key: &PublicKey) -> bool {
    let Some(sig_b64) = output.get("sig").and_then(Value::as_str) else {
        return false;
    };
    let Ok(sig) = STANDARD.decode(sig_b64) else {
        return false;
    };
    let (Ok(sig), Ok(pk)) = (
        <[u8; 64]>::try_from(sig.as_slice()),
        <[u8; 32]>::try_from(key.as_bytes().get(1..).unwrap_or_default()),
    ) else {
        return false;
    };
    env::ed25519_verify(&sig, signed_bytes(output), &pk)
}

/// The job's output from a promise result. OutLayer returns the job's stdout; depending on `response_format` it
/// arrives as the JSON object itself, as a JSON string holding it, or wrapped in an `output` field. All three
/// carry the same signed object, and only a signed object is ever used.
pub fn parse_output(bytes: &[u8]) -> Option<Value> {
    if bytes.len() > MAX_OUTPUT {
        return None;
    }
    let v: Value = serde_json::from_slice(bytes).ok()?;
    unwrap_output(v, 2)
}

fn unwrap_output(v: Value, depth: u8) -> Option<Value> {
    match v {
        Value::Object(ref m) if m.contains_key("sig") => Some(v),
        Value::Object(mut m) if depth > 0 => unwrap_output(m.remove("output")?, depth - 1),
        Value::String(s) if depth > 0 => unwrap_output(serde_json::from_str(&s).ok()?, depth - 1),
        _ => None,
    }
}

pub fn str_field<'a>(v: &'a Value, key: &str) -> Option<&'a str> {
    v.get(key).and_then(Value::as_str)
}

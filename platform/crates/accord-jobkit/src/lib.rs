//! Shared plumbing for Accord's OutLayer jobs (INTERFACES.md section 7): seed-derived ed25519 signing keys and
//! signed outputs, pinned NEAR JSON-RPC endpoints over a swappable HTTP transport, and the stdin/stdout entry.
//!
//! Every network call goes through [`http::Http`], so the job logic runs natively against fixtures in tests and
//! inside OutLayer's `wasm32-wasip2` runtime through `wasi-http-client`.

pub mod factory;
pub mod http;
pub mod keys;
pub mod rpc;
pub mod testing;

use serde_json::{json, Value};
use std::io::{Read, Write};

/// An unsigned error answer. It carries no `sig`, so no contract ever accepts it as a result.
pub fn error_output(mode: &str, error: impl Into<String>) -> Value {
    json!({"mode": mode, "status": "error", "error": error.into()})
}

/// The job entry: reads one JSON object from stdin, runs `f`, writes its JCS to stdout and flushes.
pub fn main_with(f: impl FnOnce(&Value) -> Value) {
    let mut raw = String::new();
    let out = match std::io::stdin().read_to_string(&mut raw) {
        Ok(_) => match serde_json::from_str::<Value>(&raw) {
            Ok(input) => f(&input),
            Err(e) => error_output("unknown", format!("input is not JSON: {e}")),
        },
        Err(e) => error_output("unknown", format!("stdin: {e}")),
    };
    let mut stdout = std::io::stdout();
    let _ = stdout.write_all(&accord_core::hash::jcs(&out));
    let _ = stdout.flush();
}

/// The mode named in the input, if any.
pub fn mode(input: &Value) -> &str {
    input.get("mode").and_then(Value::as_str).unwrap_or("")
}

/// NEAR account id rules (2 to 64 characters, lowercase alphanumerics separated by `.`, `-` or `_`).
pub fn is_account_id(s: &str) -> bool {
    let b = s.as_bytes();
    (2..=64).contains(&b.len())
        && s.split('.').all(|part| {
            !part.is_empty()
                && part.split(['-', '_']).all(|p| {
                    !p.is_empty()
                        && p.bytes()
                            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit())
                })
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn account_ids() {
        for ok in [
            "a7.accord-v1.testnet",
            "halcyon-mm.testnet",
            "wrap.near",
            "ab",
        ] {
            assert!(is_account_id(ok), "{ok}");
        }
        for bad in [
            "A.testnet",
            "a..b",
            ".a",
            "a-",
            "x",
            "a b.testnet",
            "a/b",
            "",
        ] {
            assert!(!is_account_id(bad), "{bad}");
        }
    }
}

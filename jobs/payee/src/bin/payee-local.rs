//! Native runner (`--features local`): the same job against real testnet RPC and the vendor's real domain file.
//!
//! cargo run -p accord-payee --features local --bin payee-local -- '{"mode":"prove","agreement":"a1.accord-v1.testnet","version":1}'
//!
//! The seed is read only from the environment (`PROTECTED_PAYEE_SEED`, 64 hex characters). Use a throwaway seed:
//! the deployed job's seed lives in OutLayer and never leaves it.

use accord_jobkit::{http::default_http, keys, keys::seed_from_env};
use accord_payee::{run, Deps, SEED_VAR};
use serde_json::Value;
use std::io::Read;

fn main() {
    let raw = match std::env::args().nth(1) {
        Some(a) => a,
        None => {
            let mut s = String::new();
            std::io::stdin().read_to_string(&mut s).expect("stdin");
            s
        }
    };
    let input: Value =
        serde_json::from_str(&raw).unwrap_or_else(|e| panic!("input is not JSON: {e}"));
    let seed = seed_from_env(SEED_VAR).unwrap_or_else(|e| panic!("{e}"));
    let http = default_http();
    let started = std::time::Instant::now();
    let out = run(&input, &Deps::enclave(http.as_ref(), seed));
    let key = keys::signing_key(&seed, keys::PAYEE_SIGN_INFO).verifying_key();
    println!("{}", serde_json::to_string_pretty(&out).unwrap());
    eprintln!(
        "{} ms · signing key {} · signature {}",
        started.elapsed().as_millis(),
        keys::pubkey_string(&key),
        if out.get("sig").is_none() {
            "none"
        } else if keys::verify(&out, &key) {
            "verifies"
        } else {
            "INVALID"
        }
    );
}

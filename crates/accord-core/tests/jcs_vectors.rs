//! PROGRESS 1.1: `accord-core`'s JCS reproduces every vector the TypeScript `canonicalize` wrote, byte for byte;
//! the typed `Params` and `Terms` encode exactly like their JSON.

use accord_core::hash::{jcs, jcs_sha256, to_hex};
use accord_core::types::{Params, Terms};
use serde_json::Value;

fn vectors() -> Vec<Value> {
    serde_json::from_str(include_str!("jcs_vectors.json")).expect("vectors parse")
}

#[test]
fn every_vector_matches_byte_for_byte() {
    for v in vectors() {
        let name = v["name"].as_str().unwrap();
        let got = String::from_utf8(jcs(&v["input"])).unwrap();
        assert_eq!(got, v["jcs"].as_str().unwrap(), "{name}");
        assert_eq!(to_hex(&jcs_sha256(&v["input"])), v["sha256"].as_str().unwrap(), "{name}");
    }
}

#[test]
fn typed_params_and_terms_hash_like_their_json() {
    for v in vectors() {
        let name = v["name"].as_str().unwrap();
        let expected = v["sha256"].as_str().unwrap();
        match name {
            "params" => {
                let p: Params = serde_json::from_value(v["input"].clone()).unwrap();
                assert_eq!(to_hex(&jcs_sha256(&p)), expected);
            }
            "terms" | "procurement_terms" => {
                let t: Terms = serde_json::from_value(v["input"].clone()).unwrap();
                assert_eq!(to_hex(&jcs_sha256(&t)), expected, "{name}");
            }
            _ => {}
        }
    }
}

//! Steps 4 and 5 of the run: one non-streamed completion per message, its exact request and response bytes kept,
//! then `GET /v1/signature/{id}?signing_algo=ecdsa`: the signed text must be `"<model>:<sha256(request
//! body)>:<sha256(response body)>"` over those exact bytes, the kind `provider_tee`, and the recovered EIP-191
//! signer exactly one verified model candidate (docs.near.ai/cloud/verification/cloud-api/response-signatures).
//! Anything else makes the response unverifiable, which ends the run as an infrastructure failure.

use crate::attest::NEARAI;
use crate::host::{get, post, Host};
use accord_core::hash::sha256;
use k256::ecdsa::{RecoveryId, Signature, VerifyingKey};
use serde::Serialize;
use serde_json::Value;
use sha3::{Digest, Keccak256};
use std::time::Duration;

const MAX_COMPLETION: usize = 1 << 20;

/// The per-response record that goes into the signed output.
#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
pub struct ResponseRecord {
    pub chat_id: String,
    pub request_hash: String,
    pub response_hash: String,
    pub signature: String,
    pub signer: String,
}

#[derive(Clone, Debug)]
pub struct Completion {
    pub content: String,
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
    pub record: ResponseRecord,
}

/// The address behind an EIP-191 (`personal_sign`) signature over `text`.
pub fn recover_eip191(text: &str, signature_hex: &str) -> Result<String, String> {
    let sig =
        hex::decode(signature_hex.trim_start_matches("0x")).map_err(|_| "signature is not hex")?;
    if sig.len() != 65 {
        return Err(format!("signature is {} bytes", sig.len()));
    }
    let digest = Keccak256::new()
        .chain_update(format!("\x19Ethereum Signed Message:\n{}", text.len()))
        .chain_update(text.as_bytes())
        .finalize();
    let v = if sig[64] >= 27 { sig[64] - 27 } else { sig[64] };
    let mut rid = RecoveryId::from_byte(v).ok_or("bad recovery id")?;
    let mut s = Signature::from_slice(&sig[..64]).map_err(|_| "bad signature")?;
    if let Some(low) = s.normalize_s() {
        s = low;
        rid = RecoveryId::new(!rid.is_y_odd(), rid.is_x_reduced());
    }
    let vk = VerifyingKey::recover_from_prehash(&digest, &s, rid)
        .map_err(|_| "signature does not recover")?;
    let point = vk.to_encoded_point(false);
    Ok(format!(
        "0x{}",
        hex::encode(&Keccak256::digest(&point.as_bytes()[1..])[12..])
    ))
}

fn auth(api_key: &str) -> String {
    format!("Bearer {api_key}")
}

/// The error type NEAR AI names (for example `no_limit_configured` on a 402), never its free text.
fn error_kind(body: &[u8]) -> String {
    serde_json::from_slice::<Value>(body)
        .ok()
        .and_then(|v| {
            v.pointer("/error/type")
                .and_then(Value::as_str)
                .map(String::from)
        })
        .unwrap_or_default()
}

/// Sends one completion and verifies its signature; `verified` holds the lowercased verified model signers.
pub fn complete(
    host: &dyn Host,
    api_key: &str,
    model: &str,
    body: Vec<u8>,
    verified: &[String],
) -> Result<Completion, String> {
    let a = auth(api_key);
    let request_hash = hex::encode(sha256(&body));
    let r = host.send(&post(
        &format!("{NEARAI}/chat/completions"),
        &[
            ("Authorization", &a),
            ("Content-Type", "application/json"),
            ("Accept", "application/json"),
            ("Accept-Encoding", "identity"),
            ("x-no-aliasing", "true"),
        ],
        body,
        MAX_COMPLETION,
    ))?;
    if r.status != 200 {
        return Err(format!(
            "NEAR AI completion HTTP {} {}",
            r.status,
            error_kind(&r.body)
        )
        .trim_end()
        .to_string());
    }
    let response_hash = hex::encode(sha256(&r.body));
    let v: Value = serde_json::from_slice(&r.body).map_err(|_| "completion is not JSON")?;
    let chat_id = v
        .get("id")
        .and_then(Value::as_str)
        .ok_or("completion has no id")?
        .to_string();
    let content = v
        .pointer("/choices/0/message/content")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();
    let usage = |k: &str| {
        v.pointer(&format!("/usage/{k}"))
            .and_then(Value::as_u64)
            .unwrap_or(0)
    };

    let mut sig = Value::Null;
    for attempt in 0..6 {
        if attempt > 0 {
            host.sleep(Duration::from_millis(1000));
        }
        let s = host.send(&get(
            &format!(
                "{NEARAI}/signature/{}?signing_algo=ecdsa",
                crate::attest::url_encode(&chat_id)
            ),
            &[
                ("Authorization", &a),
                ("Accept", "application/json"),
                ("Accept-Encoding", "identity"),
            ],
            64 * 1024,
        ))?;
        if s.status == 200 {
            let j: Value = serde_json::from_slice(&s.body).unwrap_or(Value::Null);
            if j.get("error_code").is_none() && j.get("text").is_some() {
                sig = j;
                break;
            }
        } else if s.status != 404 {
            return Err(format!("signature HTTP {}", s.status));
        }
    }
    let field = |k: &str| sig.get(k).and_then(Value::as_str).unwrap_or("");
    if sig.is_null() {
        return Err("signature unavailable".into());
    }
    if field("text") != format!("{model}:{request_hash}:{response_hash}") {
        return Err("signed text does not match the exact bytes".into());
    }
    if field("signing_algo") != "ecdsa" || field("signature_kind") != "provider_tee" {
        return Err(format!(
            "signature kind {} {}",
            field("signature_kind"),
            field("signing_algo")
        ));
    }
    let signer = recover_eip191(field("text"), field("signature"))?;
    if signer != field("signing_address").to_ascii_lowercase() {
        return Err("recovered signer differs from signing_address".into());
    }
    if verified.iter().filter(|a| **a == signer).count() != 1 {
        return Err("signer is not exactly one verified model key".into());
    }
    Ok(Completion {
        content,
        prompt_tokens: usage("prompt_tokens"),
        completion_tokens: usage("completion_tokens"),
        record: ResponseRecord {
            chat_id,
            request_hash,
            response_hash,
            signature: field("signature").to_string(),
            signer,
        },
    })
}

/// USD prices per million tokens, in micro-dollars per token times 1000 (from `/v1/model/list`, 3 Nov 2026:
/// `inputCostPerToken.amount` and `outputCostPerToken.amount` at scale 9). Unknown models report cost 0.
pub fn cost_usd_micros(model: &str, prompt: u64, completion: u64) -> u64 {
    let (i, o) = match model {
        "z-ai/glm-5.3-flash" => (80, 500),
        "Qwen/Qwen3.6-35B-A3B-FP8" => (170, 1100),
        "Qwen/Qwen3.8-27B" => (40, 1350),
        _ => (0, 0),
    };
    (prompt * i + completion * o) / 1000
}

#[cfg(test)]
mod tests {
    use super::*;
    use k256::ecdsa::SigningKey;

    pub fn sign_eip191(key: &SigningKey, text: &str) -> String {
        let digest = Keccak256::new()
            .chain_update(format!("\x19Ethereum Signed Message:\n{}", text.len()))
            .chain_update(text.as_bytes());
        let (sig, rid) = key.sign_digest_recoverable(digest).unwrap();
        let mut b = sig.to_bytes().to_vec();
        b.push(27 + rid.to_byte());
        format!("0x{}", hex::encode(b))
    }

    #[test]
    fn eip191_round_trip_matches_the_address() {
        let key = SigningKey::from_bytes(&[3u8; 32].into()).unwrap();
        let point = key.verifying_key().to_encoded_point(false);
        let addr = format!(
            "0x{}",
            hex::encode(&Keccak256::digest(&point.as_bytes()[1..])[12..])
        );
        let s = sign_eip191(&key, "model:aa:bb");
        assert_eq!(recover_eip191("model:aa:bb", &s).unwrap(), addr);
        assert_ne!(recover_eip191("model:aa:bc", &s).unwrap(), addr);
    }

    #[test]
    fn known_vector() {
        // Private key 0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318 signs
        // "Some data" as 0xb91467e5...1c (web3.js accounts.sign documentation).
        let sig = "0xb91467e570a6466aa9e9876cbcd013baba02900b8979d43fe208a4a4f339f5fd6007e74cd82e037b800186422fc2da167c747ef045e5d18a5f5d4300f8e1a0291c";
        assert_eq!(
            recover_eip191("Some data", sig).unwrap(),
            "0x2c7536e3605d9c16a7a3d7b1898e529396a65c23"
        );
    }
}

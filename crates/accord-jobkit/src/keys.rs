//! Each job's ed25519 signing key, derived from its own `PROTECTED_<JOB>_SEED` (ARCHITECTURE.md 8.1):
//! `HKDF-SHA256(ikm = seed, salt = none, info = "accord/<job>/sign/v1")`, 32 bytes, used as the ed25519 secret key.
//! Every output is signed over `JCS(output without "sig")` and carries the standard-base64 signature as `"sig"`,
//! which is exactly what `contracts/agreement/src/signed.rs` verifies.

use accord_core::hash::signed_bytes;
use base64::{engine::general_purpose::STANDARD, Engine};
use ed25519_dalek::{Signature, Signer, Verifier};
pub use ed25519_dalek::{SigningKey, VerifyingKey};
use hkdf::Hkdf;
use serde_json::{json, Value};
use sha2::Sha256;

pub const OBSERVER_SIGN_INFO: &str = "accord/observer/sign/v1";
pub const PAYEE_SIGN_INFO: &str = "accord/payee/sign/v1";

/// A 32-byte seed from its hex form (64 characters; an `0x` prefix and surrounding whitespace are tolerated).
pub fn parse_seed(hex_seed: &str) -> Result<[u8; 32], String> {
    let s = hex_seed.trim();
    let s = s.strip_prefix("0x").unwrap_or(s);
    let bytes = hex::decode(s).map_err(|_| "seed is not hex".to_string())?;
    <[u8; 32]>::try_from(bytes.as_slice())
        .map_err(|_| format!("seed is {} bytes, not 32", bytes.len()))
}

/// The seed from the environment variable `var` (an OutLayer secret inside the enclave).
pub fn seed_from_env(var: &str) -> Result<[u8; 32], String> {
    let v = std::env::var(var).map_err(|_| format!("{var} is not set"))?;
    parse_seed(&v).map_err(|e| format!("{var}: {e}"))
}

pub fn signing_key(seed: &[u8; 32], info: &str) -> SigningKey {
    let mut okm = [0u8; 32];
    Hkdf::<Sha256>::new(None, seed)
        .expand(info.as_bytes(), &mut okm)
        .expect("32 bytes is a valid HKDF-SHA256 output length");
    SigningKey::from_bytes(&okm)
}

/// `ed25519:<base58>`, the NEAR form the contracts parse into a `PublicKey`.
pub fn pubkey_string(key: &VerifyingKey) -> String {
    format!("ed25519:{}", bs58::encode(key.as_bytes()).into_string())
}

pub fn parse_pubkey(s: &str) -> Option<VerifyingKey> {
    let b = bs58::decode(s.strip_prefix("ed25519:")?).into_vec().ok()?;
    VerifyingKey::from_bytes(&<[u8; 32]>::try_from(b.as_slice()).ok()?).ok()
}

/// `output` with `"sig"` set to the signature over its signed bytes (any previous `sig` is ignored and replaced).
pub fn sign(mut output: Value, key: &SigningKey) -> Value {
    let sig = key.sign(&signed_bytes(&output));
    if let Value::Object(m) = &mut output {
        m.insert("sig".into(), json!(STANDARD.encode(sig.to_bytes())));
    }
    output
}

/// The contract's check, off chain: `output["sig"]` verifies under `key` over `JCS(output without "sig")`.
pub fn verify(output: &Value, key: &VerifyingKey) -> bool {
    let Some(sig) = output
        .get("sig")
        .and_then(Value::as_str)
        .and_then(|s| STANDARD.decode(s).ok())
        .and_then(|b| <[u8; 64]>::try_from(b.as_slice()).ok())
    else {
        return false;
    };
    key.verify(&signed_bytes(output), &Signature::from_bytes(&sig))
        .is_ok()
}

/// The `pubkey` mode's answer, signed by the key it announces (the factory's `store_pubkey` checks exactly that).
pub fn pubkey_output(job: &str, key: &SigningKey) -> Value {
    sign(
        json!({"mode": "pubkey", "job": job, "signing_pubkey": pubkey_string(&key.verifying_key())}),
        key,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    const SEED: [u8; 32] = [7; 32];

    #[test]
    fn derivation_is_deterministic_and_separated_by_info() {
        let a = signing_key(&SEED, OBSERVER_SIGN_INFO);
        let b = signing_key(&SEED, OBSERVER_SIGN_INFO);
        let c = signing_key(&SEED, PAYEE_SIGN_INFO);
        assert_eq!(a.to_bytes(), b.to_bytes());
        assert_ne!(a.to_bytes(), c.to_bytes());
        assert_ne!(
            signing_key(&[8; 32], OBSERVER_SIGN_INFO).to_bytes(),
            a.to_bytes()
        );
    }

    #[test]
    fn hkdf_matches_rfc5869_construction() {
        // HKDF with no salt: PRK = HMAC(zeros, seed); OKM = HMAC(PRK, info || 0x01) for 32 bytes.
        use hmac::{Hmac, Mac};
        let mut ext = Hmac::<Sha256>::new_from_slice(&[0u8; 32]).unwrap();
        ext.update(&SEED);
        let prk = ext.finalize().into_bytes();
        let mut exp = Hmac::<Sha256>::new_from_slice(&prk).unwrap();
        exp.update(OBSERVER_SIGN_INFO.as_bytes());
        exp.update(&[1]);
        let okm: [u8; 32] = exp.finalize().into_bytes().into();
        assert_eq!(signing_key(&SEED, OBSERVER_SIGN_INFO).to_bytes(), okm);
    }

    #[test]
    fn pubkey_output_is_self_signed_and_round_trips() {
        let k = signing_key(&SEED, PAYEE_SIGN_INFO);
        let out = pubkey_output("payee", &k);
        let pk = parse_pubkey(out["signing_pubkey"].as_str().unwrap()).unwrap();
        assert_eq!(pk, k.verifying_key());
        assert!(verify(&out, &pk));
        let mut changed = out.clone();
        changed["job"] = json!("observer");
        assert!(!verify(&changed, &pk));
    }

    #[test]
    fn seeds_parse_strictly() {
        assert_eq!(parse_seed(&"07".repeat(32)).unwrap(), SEED);
        assert_eq!(
            parse_seed(&format!("0x{}\n", "07".repeat(32))).unwrap(),
            SEED
        );
        assert!(parse_seed("07").is_err());
        assert!(parse_seed(&"zz".repeat(32)).is_err());
    }
}

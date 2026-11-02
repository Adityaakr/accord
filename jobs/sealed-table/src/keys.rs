//! The Sealed Table's two keys, both derived from `PROTECTED_SEALED_SEED` with HKDF-SHA256 (ARCHITECTURE.md 8.1):
//! the ed25519 signing key (`info = "accord/sealed-table/sign/v1"`, the 32-byte output is the secret) and the
//! secp256k1 mandate key (`info = "accord/sealed-table/mandate/v1"`, the 32-byte output reduced modulo the curve
//! order, zero mapped to one, the same reduction as the SDK's document key).

use accord_jobkit::keys::{pubkey_string, sign, signing_key as derive_ed25519, SigningKey};
use hkdf::Hkdf;
use k256::elliptic_curve::ops::Reduce;
use k256::elliptic_curve::sec1::ToEncodedPoint;
use k256::{Scalar, U256};
use serde_json::{json, Value};
use sha2::Sha256;

pub const SIGN_INFO: &str = "accord/sealed-table/sign/v1";
pub const MANDATE_INFO: &str = "accord/sealed-table/mandate/v1";
pub const SEED_VAR: &str = "PROTECTED_SEALED_SEED";
pub const JOB: &str = "sealed_table";

pub fn signing_key(seed: &[u8; 32]) -> SigningKey {
    derive_ed25519(seed, SIGN_INFO)
}

/// The mandate key's secret scalar, big-endian.
pub fn mandate_secret(seed: &[u8; 32]) -> [u8; 32] {
    let mut okm = [0u8; 32];
    Hkdf::<Sha256>::new(None, seed)
        .expand(MANDATE_INFO.as_bytes(), &mut okm)
        .expect("32 bytes is a valid HKDF-SHA256 output length");
    let mut s = <Scalar as Reduce<U256>>::reduce_bytes(&okm.into());
    if bool::from(s.is_zero()) {
        s = Scalar::ONE;
    }
    s.to_bytes().into()
}

/// The compressed secp256k1 public key, 66 hex characters.
pub fn mandate_pubkey(secret: &[u8; 32]) -> String {
    let sk = k256::SecretKey::from_bytes(secret.into()).expect("a reduced non-zero scalar");
    hex::encode(sk.public_key().to_encoded_point(true).as_bytes())
}

/// The `pubkey` mode's answer: both public keys, signed by the signing key it announces (the factory's
/// `store_pubkey` checks that signature and requires a 66-character mandate key).
pub fn pubkey_output(seed: &[u8; 32]) -> Value {
    let key = signing_key(seed);
    sign(
        json!({
            "mode": "pubkey",
            "job": JOB,
            "signing_pubkey": pubkey_string(&key.verifying_key()),
            "mandate_pubkey": mandate_pubkey(&mandate_secret(seed)),
        }),
        &key,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keys_are_deterministic_and_distinct_per_seed() {
        let a = mandate_secret(&[1; 32]);
        assert_eq!(a, mandate_secret(&[1; 32]));
        assert_ne!(a, mandate_secret(&[2; 32]));
        assert_eq!(mandate_pubkey(&a).len(), 66);
        assert!(mandate_pubkey(&a).starts_with("02") || mandate_pubkey(&a).starts_with("03"));
        assert_ne!(
            signing_key(&[1; 32]).to_bytes(),
            signing_key(&[2; 32]).to_bytes()
        );
    }
}

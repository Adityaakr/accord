//! Step 2 of the run: open both sealed mandates and check them against state (ARCHITECTURE.md 8.2, 8.3).
//!
//! `ciphertext = eciesjs.encrypt(mandate_pubkey, JCS(envelope))` (secp256k1, HKDF-SHA256, AES-256-GCM; eciesjs
//! defaults: uncompressed ephemeral key, 16-byte nonce, `ephemeral || nonce || tag || ciphertext`), which the
//! `ecies` crate's pure-Rust backend reads with its default configuration. The commitment is `sha256` of the
//! decrypted bytes exactly as they came out, so a re-encoding can never make a different envelope match.
//! Any failure here comes from a party's own commitment, so it ends the negotiation with `BAD_INPUT`.

use crate::state::{AgreementState, CommitmentRecord};
use accord_core::hash::sha256;
use accord_core::limits::{
    Mandate, MarketMakingBuyer, MarketMakingVendor, ProcurementBuyer, ProcurementVendor, Role,
};
use accord_core::Kind;
use serde::Deserialize;

#[derive(Deserialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Envelope {
    pub v: u8,
    pub agreement: String,
    pub role: Role,
    pub party: String,
    pub release: u32,
    pub mandate: Mandate,
    pub salt: String,
    pub doc_pubkey: String,
    pub doc_key_signer: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct Opened {
    pub envelope: Envelope,
}

/// Why an envelope was refused. Never leaves the job: the output only says `BAD_INPUT`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BadInput {
    Decrypt,
    NotJson,
    Commitment,
    Agreement,
    Role,
    Party,
    Release,
    Version,
    Kind,
    Limits,
    DocKey,
}

pub fn decrypt(secret: &[u8; 32], ciphertext: &[u8]) -> Result<Vec<u8>, BadInput> {
    ecies::decrypt(secret, ciphertext).map_err(|_| BadInput::Decrypt)
}

fn limits_parse(m: &Mandate) -> bool {
    let l = m.limits.clone();
    match (m.kind, m.role) {
        (Kind::Procurement, Role::Buyer) => serde_json::from_value::<ProcurementBuyer>(l).is_ok(),
        (Kind::Procurement, Role::Vendor) => serde_json::from_value::<ProcurementVendor>(l).is_ok(),
        (Kind::MarketMaking, Role::Buyer) => serde_json::from_value::<MarketMakingBuyer>(l).is_ok(),
        (Kind::MarketMaking, Role::Vendor) => {
            serde_json::from_value::<MarketMakingVendor>(l).is_ok()
        }
    }
}

/// A compressed secp256k1 public key in lowercase hex that is a point on the curve. The format alone is not enough:
/// an off-curve key would only fail when the agreed document is encrypted to it, after the negotiation ran, and
/// that retryable failure would tell its sender "a deal existed inside my limits".
fn is_doc_key(s: &str) -> bool {
    s.len() == 66
        && (s.starts_with("02") || s.starts_with("03"))
        && s.bytes()
            .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
        && hex::decode(s).is_ok_and(|b| k256::PublicKey::from_sec1_bytes(&b).is_ok())
}

/// Opens one side's envelope and checks it against the on-chain record and the agreement's state.
pub fn open(
    secret: &[u8; 32],
    record: &CommitmentRecord,
    role: Role,
    state: &AgreementState,
) -> Result<Opened, BadInput> {
    let bytes = decrypt(secret, &record.ciphertext)?;
    if hex::encode(sha256(&bytes)) != record.commitment {
        return Err(BadInput::Commitment);
    }
    let envelope: Envelope = serde_json::from_slice(&bytes).map_err(|_| BadInput::NotJson)?;
    let party = match role {
        Role::Buyer => &state.buyer,
        Role::Vendor => &state.vendor,
    };
    if envelope.v != 1 {
        return Err(BadInput::Version);
    }
    if envelope.agreement != state.account {
        return Err(BadInput::Agreement);
    }
    if envelope.role != role || envelope.mandate.role != role {
        return Err(BadInput::Role);
    }
    if &envelope.party != party {
        return Err(BadInput::Party);
    }
    if envelope.release != state.release {
        return Err(BadInput::Release);
    }
    if envelope.mandate.kind != state.kind {
        return Err(BadInput::Kind);
    }
    if !limits_parse(&envelope.mandate) {
        return Err(BadInput::Limits);
    }
    if !is_doc_key(&envelope.doc_pubkey) || envelope.doc_pubkey != record.doc_pubkey {
        return Err(BadInput::DocKey);
    }
    Ok(Opened { envelope })
}

/// The commercial terms document, encrypted to one party's document key (eciesjs format), standard base64.
pub fn encrypt_document(doc_pubkey_hex: &str, plaintext: &[u8]) -> Result<Vec<u8>, String> {
    let pk = hex::decode(doc_pubkey_hex).map_err(|_| "document key is not hex".to_string())?;
    ecies::encrypt(&pk, plaintext).map_err(|e| format!("document encryption: {e:?}"))
}

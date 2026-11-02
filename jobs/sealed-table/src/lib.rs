//! The Sealed Table (ARCHITECTURE.md section 8, INTERFACES.md 7.1): an OutLayer job for `wasm32-wasip2` that
//! opens both sealed mandates inside the enclave, verifies NEAR AI Cloud's attestation with a fresh nonce, runs the
//! four-message negotiation between two attested model calls, checks every number in code, and signs the outcome
//! with a key derived from its own `PROTECTED_SEALED_SEED`. Every network call goes through [`host::Host`], so the
//! whole run is testable natively against recorded fixtures.

pub mod attest;
pub mod host;
pub mod keys;
pub mod leak;
pub mod nearai;
pub mod protocol;
pub mod run;
pub mod sealing;
pub mod state;

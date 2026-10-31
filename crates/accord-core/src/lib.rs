//! Accord's pure logic (INTERFACES.md section 3). The contracts are thin shells over this crate: every rule that
//! decides whether money moves lives here, with unit tests beside it and property tests in `tests/invariants.rs`.

pub mod atlas;
pub mod gates;
pub mod hash;
pub mod limits;
pub mod terms;
pub mod types;

pub use types::*;

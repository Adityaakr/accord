//! Audit reproductions. Each `audit_*` test asserts the property the published claims need; a FAILING test is a
//! confirmed finding. `storage_*` is a measurement and passes.

use super::*;
use ed25519_dalek::{Signer, SigningKey};
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::testing_env;
use std::panic::{catch_unwind, AssertUnwindSafe};

const BOARD: &str = "tender.accord-v2.testnet";
const FACTORY: &str = "accord-v2.testnet";
const BUYER: &str = "northwind-demo.testnet";
const SEC: u64 = 1_000_000_000;
const T0: u64 = 1_000 * SEC;
const EVIDENCE: &str = "1111111111111111111111111111111111111111111111111111111111111111";

fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}
fn ctx_d(pred: &str, deposit: NearToken, at: u64) {
    ctx_u(pred, deposit, at, 0)
}
fn ctx_u(pred: &str, deposit: NearToken, at: u64, usage: u64) {
    let mut b = VMContextBuilder::new();
    b.storage_usage(usage);
    b.current_account_id(acc(BOARD))
        .predecessor_account_id(acc(pred))
        .signer_account_id(acc(pred))
        .attached_deposit(deposit)
        .block_timestamp(at)
        .account_balance(NearToken::from_near(10))
        .prepaid_gas(Gas::from_tgas(300));
    testing_env!(b.build());
}
fn ctx(pred: &str, at: u64) {
    ctx_d(pred, NearToken::from_yoctonear(0), at);
}

struct B {
    key: SigningKey,
    salt: String,
}
impl B {
    fn new(seed: u8) -> Self {
        Self {
            key: SigningKey::from_bytes(&[seed; 32]),
            salt: hex::encode([seed ^ 0x5a; 32]),
        }
    }
    fn id(&self) -> String {
        hex::encode(self.key.verifying_key().to_bytes())
    }
    fn c(&self, job: u64, price: u128) -> String {
        hex::encode(env::sha256_array(commitment_message(
            BOARD,
            job,
            &self.id(),
            price,
            &self.salt,
        )))
    }
    fn bid_agent(
        &self,
        b: &mut TenderBoard,
        job: u64,
        price: u128,
        nonce: u32,
        agent: &str,
    ) -> u32 {
        let c = self.c(job, price);
        let sig = hex::encode(
            self.key
                .sign(bid_message(BOARD, job, nonce, &c, agent).as_bytes())
                .to_bytes(),
        );
        b.submit_bid(job, self.id(), c, agent.into(), nonce, sig)
    }
    fn bid(&self, b: &mut TenderBoard, job: u64, price: u128) -> u32 {
        self.bid_agent(b, job, price, 1, "agent")
    }
    fn reveal(&self, b: &mut TenderBoard, job: u64, price: u128) {
        b.reveal_bid(job, self.id(), U128(price), self.salt.clone());
    }
}

fn board_with_job(spec: String, title: String) -> (TenderBoard, u64) {
    ctx(FACTORY, T0);
    let mut b = TenderBoard::new(acc(FACTORY));
    ctx_d(BUYER, POST_DEPOSIT, T0);
    let id = b.post_job(
        title,
        spec,
        EVIDENCE.into(),
        U128(50_000_000),
        acc("tusdc.accord-v1.testnet"),
        60,
        60,
    );
    (b, id)
}
fn job() -> (TenderBoard, u64) {
    board_with_job("spec".into(), "title".into())
}

fn bonded(pred: &str, at: u64) {
    ctx_d(pred, BID_BOND, at);
}
fn forfeited_in_logs() -> Option<u64> {
    near_sdk::test_utils::get_logs().iter().find_map(|l| {
        let v: Value = near_sdk::serde_json::from_str(l.strip_prefix("EVENT_JSON:")?).ok()?;
        (v["event"] == "awarded")
            .then(|| v["data"][0]["bonds_forfeited"].as_u64())
            .flatten()
    })
}

/// Was MEDIUM (32 free throwaway keys lock a job). Fixed by the bid bond: a new bid without exactly BID_BOND is
/// refused, and 32 bids that never reveal forfeit 32 bonds to the buyer at the award. Filling a job is still possible;
/// it now costs the filler 32 x BID_BOND.
#[test]
fn audit_sybil_slots_each_cost_a_forfeited_bond() {
    let (mut b, j) = job();
    ctx("attacker.testnet", T0 + SEC);
    let r = catch_unwind(AssertUnwindSafe(|| B::new(99).bid(&mut b, j, 1)));
    assert!(
        r.is_err(),
        "a new bid without the bond is refused (ERR_BOND)"
    );
    for s in 0..MAX_BIDS as u8 {
        bonded("attacker.testnet", T0 + SEC);
        B::new(100 + s).bid(&mut b, j, 1);
    }
    ctx("anyone.testnet", T0 + 121 * SEC);
    assert_eq!(b.award(j), Outcome::NoValidBid);
    assert_eq!(forfeited_in_logs(), Some(MAX_BIDS as u64));
    assert!(b.get_job(j).unwrap().bids.iter().all(|x| !x.bond_held));
}

/// Was MEDIUM (selective reveal is free). The ladder still works, so the limit is published, but every rung left
/// unrevealed forfeits its bond to the buyer, and a revealed bid gets its bond back.
#[test]
fn audit_selective_reveal_forfeits_each_unrevealed_bond() {
    let (mut b, j) = job();
    let honest = B::new(1);
    let ladder: Vec<(B, u128)> = (0..5)
        .map(|i| (B::new(50 + i), 10_000_000 * (i as u128 + 1)))
        .collect();
    bonded("relay.testnet", T0 + SEC);
    honest.bid(&mut b, j, 35_000_000);
    for (k, p) in &ladder {
        bonded("relay.testnet", T0 + SEC);
        k.bid(&mut b, j, *p);
    }
    ctx("anyone.testnet", T0 + 61 * SEC);
    honest.reveal(&mut b, j, 35_000_000);
    ladder[2].0.reveal(&mut b, j, 30_000_000);
    ctx("anyone.testnet", T0 + 121 * SEC);
    assert_eq!(b.award(j), Outcome::Winner { index: 3 });
    assert_eq!(forfeited_in_logs(), Some(4));
}

/// Was LOW. ed25519_verify on NEAR is dalek's non-strict `verify`: the identity point with signature (R = identity,
/// s = 0) verifies for every message. Fixed: the 14 small-order encodings are refused as bidder keys.
#[test]
fn audit_weak_bidder_key_accepts_a_universal_signature() {
    let (mut b, j) = job();
    let mut id = [0u8; 32];
    id[0] = 1;
    let mut sig = [0u8; 64];
    sig[0] = 1;
    bonded("relay.testnet", T0 + SEC);
    let c = "ab".repeat(32);
    let r = catch_unwind(AssertUnwindSafe(|| {
        b.submit_bid(
            j,
            hex::encode(id),
            c.clone(),
            "anyone".into(),
            1,
            hex::encode(sig),
        )
    }));
    assert!(
        r.is_err(),
        "a signature nobody made was accepted for a small-order bidder key"
    );
}

/// Was LOW (Rust and JS trim different characters). Fixed: labels are printable ASCII and never trimmed, so a label
/// the SDK would sign differently is refused up front, by the SDK and the board alike.
#[test]
fn audit_agent_labels_are_printable_ascii_untrimmed() {
    let (mut b, j) = job();
    for bad in ["agent\u{85}", " agent", "agent ", "a:b", "", "\u{200b}x"] {
        bonded("relay.testnet", T0 + SEC);
        assert!(
            catch_unwind(AssertUnwindSafe(
                || B::new(3).bid_agent(&mut b, j, 1, 1, bad)
            ))
            .is_err(),
            "{bad:?}"
        );
    }
    bonded("relay.testnet", T0 + SEC);
    B::new(3).bid_agent(&mut b, j, 1, 1, "my agent-1.0_x");
}

/// Measurement: worst-case job (4-byte chars in title/spec, 64-byte agent labels, a 64-character bond payer, 32 bids,
/// all revealed) fits the posting deposit.
#[test]
fn storage_worst_case_job_fits_the_deposit() {
    ctx(FACTORY, T0);
    let mut b = TenderBoard::new(acc(FACTORY));
    let before = env::storage_usage();
    ctx_u(BUYER, POST_DEPOSIT, T0, before);
    let j = b.post_job(
        "\u{10348}".repeat(MAX_TITLE),
        "\u{10348}".repeat(MAX_SPEC),
        EVIDENCE.into(),
        U128(u128::MAX),
        acc(&format!("{}.testnet", "t".repeat(56))),
        60,
        60,
    );
    let agent = "a".repeat(MAX_AGENT);
    let payer = "p".repeat(64);
    let ks: Vec<B> = (0..MAX_BIDS as u8).map(|s| B::new(100 + s)).collect();
    for k in &ks {
        ctx_u(&payer, BID_BOND, T0 + SEC, env::storage_usage());
        k.bid_agent(&mut b, j, u128::MAX, u32::MAX, &agent);
    }
    for k in &ks {
        ctx_u(
            "relay.testnet",
            NearToken::from_yoctonear(0),
            T0 + 61 * SEC,
            env::storage_usage(),
        );
        k.reveal(&mut b, j, u128::MAX);
    }
    drop(b);
    let used = env::storage_usage() - before;
    let cost = env::storage_byte_cost().saturating_mul(used as u128);
    println!(
        "worst-case job: {used} bytes = {} yoctoNEAR (deposit {})",
        cost.as_yoctonear(),
        POST_DEPOSIT.as_yoctonear()
    );
    assert!(cost <= POST_DEPOSIT);
}

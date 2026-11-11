//! The board's rules: signatures are the bidder's, bids stay sealed until revealed, the commitment binds price and
//! bidder to the job, the lowest valid price wins deterministically, and a link names only the winner's agreement.

use super::*;
use ed25519_dalek::{Signer, SigningKey};
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::testing_env;
use near_sdk::PromiseResult;

const BOARD: &str = "tender.accord-v2.testnet";
const FACTORY: &str = "accord-v2.testnet";
const BUYER: &str = "northwind-demo.testnet";
const SEC: u64 = 1_000_000_000;
const T0: u64 = 1_000 * SEC;
const EVIDENCE: &str = "1111111111111111111111111111111111111111111111111111111111111111";

fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}

fn ctx_full(pred: &str, deposit: NearToken, at: u64, results: Vec<PromiseResult>) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(acc(BOARD))
        .predecessor_account_id(acc(pred))
        .signer_account_id(acc(pred))
        .attached_deposit(deposit)
        .block_timestamp(at)
        .account_balance(NearToken::from_near(10))
        .prepaid_gas(Gas::from_tgas(300));
    testing_env!(
        b.build(),
        near_sdk::test_vm_config(),
        near_sdk::RuntimeFeesConfig::test(),
        Default::default(),
        results
    );
}
fn ctx(pred: &str, at: u64) {
    ctx_full(pred, NearToken::from_yoctonear(0), at, vec![]);
}

/// Re-enters the current context with the bond a submission needs: BID_BOND for a new bidder, nothing for a replacement.
fn bond_for(b: &TenderBoard, job: u64, bidder: &str) {
    let exists = b
        .get_job(job)
        .is_some_and(|j| j.bids.iter().any(|x| x.bidder == bidder));
    let d = if exists {
        NearToken::from_yoctonear(0)
    } else {
        BID_BOND
    };
    ctx_full(
        env::predecessor_account_id().as_str(),
        d,
        env::block_timestamp(),
        vec![],
    );
}

struct Bidder {
    key: SigningKey,
    salt: String,
}
impl Bidder {
    fn new(seed: u8) -> Self {
        Self {
            key: SigningKey::from_bytes(&[seed; 32]),
            salt: hex::encode([seed.wrapping_add(100); 32]),
        }
    }
    fn id(&self) -> String {
        hex::encode(self.key.verifying_key().to_bytes())
    }
    fn commitment(&self, job: u64, price: u128) -> String {
        hex::encode(env::sha256_array(commitment_message(
            BOARD,
            job,
            &self.id(),
            price,
            &self.salt,
        )))
    }
    fn sign(&self, job: u64, nonce: u32, commitment: &str, agent: &str) -> String {
        hex::encode(
            self.key
                .sign(bid_message(BOARD, job, nonce, commitment, agent).as_bytes())
                .to_bytes(),
        )
    }
    fn bid(&self, b: &mut TenderBoard, job: u64, price: u128, nonce: u32) -> u32 {
        let c = self.commitment(job, price);
        let sig = self.sign(job, nonce, &c, "agent");
        bond_for(b, job, &self.id());
        b.submit_bid(job, self.id(), c, "agent".into(), nonce, sig)
    }
    fn reveal(&self, b: &mut TenderBoard, job: u64, price: u128) {
        b.reveal_bid(job, self.id(), U128(price), self.salt.clone());
    }
}

fn board_with_job(budget: u128) -> (TenderBoard, u64) {
    ctx(FACTORY, T0);
    let mut b = TenderBoard::new(acc(FACTORY));
    ctx_full(BUYER, POST_DEPOSIT, T0, vec![]);
    let id = b.post_job(
        "Translate 3 contracts".into(),
        "EN to DE".into(),
        EVIDENCE.into(),
        U128(budget),
        acc("tusdc.accord-v1.testnet"),
        60,
        60,
    );
    (b, id)
}

#[test]
fn lowest_valid_price_wins_and_ties_go_to_the_earliest_bid() {
    let (mut b, job) = board_with_job(50_000_000);
    let (x, y, z, over) = (
        Bidder::new(1),
        Bidder::new(2),
        Bidder::new(3),
        Bidder::new(4),
    );
    ctx("relay.testnet", T0 + SEC);
    x.bid(&mut b, job, 40_000_000, 1);
    y.bid(&mut b, job, 30_000_000, 1);
    z.bid(&mut b, job, 30_000_000, 1);
    over.bid(&mut b, job, 1_000_000, 1);
    assert_eq!(b.get_job(job).unwrap().phase, "open");
    // the bids are sealed: no price is visible before reveal
    assert!(b
        .get_job(job)
        .unwrap()
        .bids
        .iter()
        .all(|x| x.price.is_none()));
    ctx("anyone.testnet", T0 + 61 * SEC);
    x.reveal(&mut b, job, 40_000_000);
    y.reveal(&mut b, job, 30_000_000);
    z.reveal(&mut b, job, 30_000_000);
    // `over` never reveals; award must wait for the window
    let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| b.award(job)));
    assert!(
        r.is_err(),
        "award before the window closes with an unrevealed bid"
    );
    ctx("anyone.testnet", T0 + 121 * SEC);
    assert_eq!(b.award(job), Outcome::Winner { index: 1 });
    assert_eq!(b.get_job(job).unwrap().winner, Some(y.id()));
}

#[test]
fn a_price_above_the_budget_cannot_win() {
    let (mut b, job) = board_with_job(10_000_000);
    let x = Bidder::new(1);
    ctx("relay.testnet", T0 + SEC);
    x.bid(&mut b, job, 20_000_000, 1);
    ctx("anyone.testnet", T0 + 61 * SEC);
    x.reveal(&mut b, job, 20_000_000);
    // every bid revealed: award may run early
    assert_eq!(b.award(job), Outcome::NoValidBid);
    assert_eq!(b.get_job(job).unwrap().phase, "no_valid_bid");
}

#[test]
#[should_panic(expected = "ERR_SIGNATURE")]
fn a_relayer_cannot_change_the_commitment() {
    let (mut b, job) = board_with_job(50_000_000);
    let x = Bidder::new(1);
    ctx("relay.testnet", T0 + SEC);
    let sig = x.sign(job, 1, &x.commitment(job, 40_000_000), "agent");
    b.submit_bid(job, x.id(), x.commitment(job, 1), "agent".into(), 1, sig);
}

#[test]
#[should_panic(expected = "ERR_SIGNATURE")]
fn a_signature_for_another_job_does_not_count() {
    let (mut b, job) = board_with_job(50_000_000);
    ctx_full(BUYER, POST_DEPOSIT, T0, vec![]);
    let other = b.post_job(
        "Other".into(),
        "".into(),
        EVIDENCE.into(),
        U128(1),
        acc("t.testnet"),
        60,
        60,
    );
    let x = Bidder::new(1);
    ctx("relay.testnet", T0 + SEC);
    let c = x.commitment(job, 5);
    let sig = x.sign(job, 1, &c, "agent");
    b.submit_bid(other, x.id(), c, "agent".into(), 1, sig);
}

#[test]
fn a_newer_bid_replaces_an_older_one_and_the_old_one_cannot_be_replayed() {
    let (mut b, job) = board_with_job(50_000_000);
    let x = Bidder::new(1);
    ctx("relay.testnet", T0 + SEC);
    let c1 = x.commitment(job, 40_000_000);
    let s1 = x.sign(job, 1, &c1, "agent");
    bond_for(&b, job, &x.id());
    b.submit_bid(job, x.id(), c1.clone(), "agent".into(), 1, s1.clone());
    x.bid(&mut b, job, 35_000_000, 2);
    assert_eq!(b.get_job(job).unwrap().bids.len(), 1);
    let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        b.submit_bid(job, x.id(), c1.clone(), "agent".into(), 1, s1.clone())
    }));
    assert!(r.is_err(), "replaying nonce 1 over nonce 2");
    ctx("anyone.testnet", T0 + 61 * SEC);
    // the replaced price no longer opens the commitment
    let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        x.reveal(&mut b, job, 40_000_000)
    }));
    assert!(r.is_err());
    x.reveal(&mut b, job, 35_000_000);
}

#[test]
fn windows_are_enforced() {
    let (mut b, job) = board_with_job(50_000_000);
    let x = Bidder::new(1);
    ctx("relay.testnet", T0 + SEC);
    x.bid(&mut b, job, 1, 1);
    // no reveal while bidding is open
    let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| x.reveal(&mut b, job, 1)));
    assert!(r.is_err());
    // no bid after the commit deadline
    ctx("relay.testnet", T0 + 60 * SEC);
    let y = Bidder::new(2);
    let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| y.bid(&mut b, job, 1, 1)));
    assert!(r.is_err());
    // no reveal after the reveal deadline
    ctx("anyone.testnet", T0 + 120 * SEC);
    let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| x.reveal(&mut b, job, 1)));
    assert!(r.is_err());
}

#[test]
fn a_job_holds_at_most_max_bids() {
    let (mut b, job) = board_with_job(50_000_000);
    ctx("relay.testnet", T0 + SEC);
    for i in 0..MAX_BIDS {
        Bidder::new(i as u8 + 1).bid(&mut b, job, 1, 1);
    }
    let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        Bidder::new(200).bid(&mut b, job, 1, 1)
    }));
    assert!(r.is_err());
}

#[test]
#[should_panic(expected = "ERR_DEPOSIT")]
fn posting_needs_the_storage_deposit() {
    ctx(FACTORY, T0);
    let mut b = TenderBoard::new(acc(FACTORY));
    ctx(BUYER, T0);
    b.post_job(
        "x".into(),
        "".into(),
        EVIDENCE.into(),
        U128(1),
        acc("t.testnet"),
        60,
        60,
    );
}

#[test]
fn only_the_buyer_cancels_and_only_before_a_decision() {
    let (mut b, job) = board_with_job(50_000_000);
    ctx("someone.testnet", T0 + SEC);
    assert!(std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| b.cancel_job(job))).is_err());
    ctx(BUYER, T0 + SEC);
    b.cancel_job(job);
    assert_eq!(b.get_job(job).unwrap().phase, "cancelled");
}

fn awarded() -> (TenderBoard, u64, Bidder) {
    let (mut b, job) = board_with_job(50_000_000);
    let x = Bidder::new(7);
    ctx("relay.testnet", T0 + SEC);
    x.bid(&mut b, job, 9_000_000, 1);
    ctx("anyone.testnet", T0 + 61 * SEC);
    x.reveal(&mut b, job, 9_000_000);
    b.award(job);
    (b, job, x)
}

fn record(vendor: &str, buyer: &str, kind: &str) -> PromiseResult {
    PromiseResult::Successful(
        json!({"id": 9, "account": "a9.accord-v2.testnet", "kind": kind, "title": "t", "buyer": buyer, "vendor": vendor, "vendor_authority": "auth.testnet", "release": 5, "created_at": 1})
            .to_string()
            .into_bytes(),
    )
}

#[test]
fn link_stores_only_the_winners_procurement_agreement_with_this_buyer() {
    let (mut b, job, x) = awarded();
    ctx("someone.testnet", T0 + 62 * SEC);
    assert!(
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| b.link_agreement(job, 9)))
            .is_err(),
        "not the buyer"
    );

    for bad in [
        record("someone-else.testnet", BUYER, "procurement"),
        record(&x.id(), "other.testnet", "procurement"),
        record(&x.id(), BUYER, "market-making"),
        PromiseResult::Failed,
        PromiseResult::Successful(b"null".to_vec()),
    ] {
        ctx(BUYER, T0 + 62 * SEC);
        let _ = b.link_agreement(job, 9);
        ctx_full(
            BOARD,
            NearToken::from_yoctonear(0),
            T0 + 63 * SEC,
            vec![bad],
        );
        assert!(matches!(b.on_agreement(job), PromiseOrValue::Value(None)));
        assert_eq!(b.get_job(job).unwrap().agreement, None);
    }

    ctx(BUYER, T0 + 62 * SEC);
    let _ = b.link_agreement(job, 9);
    // a second link while the first is in flight is refused
    assert!(
        std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| b.link_agreement(job, 9)))
            .is_err()
    );
    ctx_full(
        BOARD,
        NearToken::from_yoctonear(0),
        T0 + 63 * SEC,
        vec![record(&x.id(), BUYER, "procurement")],
    );
    assert!(matches!(
        b.on_agreement(job),
        PromiseOrValue::Value(Some(_))
    ));
    let v = b.get_job(job).unwrap();
    assert_eq!(v.phase, "linked");
    assert_eq!(v.agreement, Some(acc("a9.accord-v2.testnet")));
}

#[test]
fn list_jobs_is_newest_first_and_bounded() {
    let (mut b, _) = board_with_job(1);
    for _ in 0..3 {
        ctx_full(BUYER, POST_DEPOSIT, T0, vec![]);
        b.post_job(
            "x".into(),
            "".into(),
            EVIDENCE.into(),
            U128(1),
            acc("t.testnet"),
            60,
            60,
        );
    }
    let ids: Vec<u64> = b.list_jobs(None, Some(2)).iter().map(|j| j.id).collect();
    assert_eq!(ids, vec![4, 3]);
    assert_eq!(b.list_jobs(Some(99), None).len(), 4);
    assert_eq!(b.job_count(), 4);
}

/// Cross-language vector: packages/sdk/test/tender.test.ts asserts the same commitment and signature.
#[test]
fn sdk_vector() {
    let x = Bidder::new(1);
    let c = x.commitment(1, 40_000_000);
    let s = x.sign(1, 1, &c, "agent");
    assert_eq!(
        x.id(),
        "8a88e3dd7409f195fd52db2d3cba5d72ca6709bf1d94121bf3748801b40f6f5c"
    );
    assert_eq!(
        c,
        "944d44b1b9123241be942c13fa74576b0e2bb77657104c64083b226dd918f556"
    );
    assert_eq!(s, "cb5bd0a83fbcc9298e427d656f0332a27d745b06a18bfd16a16c24adfb2c3368eb9312d905743628acb8653613efc81a7a54937936b9e519dd8f6279a4559e04");
}

#[test]
fn a_reveal_or_a_cancel_releases_the_bond_and_a_replaced_bid_loses_ties() {
    let (mut b, job) = board_with_job(50_000_000);
    let (x, y) = (Bidder::new(1), Bidder::new(2));
    ctx("relay.testnet", T0 + SEC);
    x.bid(&mut b, job, 30_000_000, 1);
    ctx("relay.testnet", T0 + 2 * SEC);
    y.bid(&mut b, job, 30_000_000, 1);
    // x holds the earlier slot but replaces its bid after y: on a tie, y's commitment came first
    ctx("relay.testnet", T0 + 3 * SEC);
    x.bid(&mut b, job, 30_000_000, 2);
    ctx("anyone.testnet", T0 + 61 * SEC);
    x.reveal(&mut b, job, 30_000_000);
    assert!(
        !b.get_job(job).unwrap().bids[0].bond_held,
        "a reveal releases the bond"
    );
    assert!(b.get_job(job).unwrap().bids[1].bond_held);
    y.reveal(&mut b, job, 30_000_000);
    assert_eq!(b.award(job), Outcome::Winner { index: 1 });

    let (mut b, job) = board_with_job(50_000_000);
    ctx("relay.testnet", T0 + SEC);
    x.bid(&mut b, job, 1, 1);
    ctx(BUYER, T0 + 2 * SEC);
    b.cancel_job(job);
    assert!(
        !b.get_job(job).unwrap().bids[0].bond_held,
        "a cancel refunds the bond"
    );
}

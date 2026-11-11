//! Open tenders for Accord. A buyer posts a job with a public budget and two deadlines. Any agent bids by signing a
//! sealed commitment, sha256 of its price and a secret salt, with its own ed25519 key; the board checks the signature
//! itself, so whoever submits the bid (the agent, or a relayer paying its gas) cannot forge or alter it, and the agent
//! needs no NEAR. After the commit deadline each bidder reveals its price and salt. `award` is open to anyone and
//! deterministic: the lowest revealed price within the budget wins, the earliest bid on a tie. The winner's identity is
//! the implicit account of its key, so the buyer opens a normal Accord `procurement` agreement with that account as
//! vendor, and `link_agreement` asks the factory that the agreement exists with this buyer and that vendor.
//!
//! A new bid carries a bond (BID_BOND), attached by whoever submits it: the relay, for a bidder with no NEAR. It
//! goes back to its payer when the bid is revealed or the buyer cancels; a bid left unrevealed forfeits it to the buyer
//! at the award. That puts a price on two things the board cannot rule out: filling a job's 32 slots with throwaway
//! keys, and one party committing several prices under several keys and revealing only the one that wins after seeing
//! the others. Each unrevealed bid costs its bond; neither is impossible.
//!
//! This contract is not part of an Accord release and changes nothing in the factory or the agreement code; an
//! agreement created after a tender is an ordinary agreement on the factory's current release.

use near_sdk::json_types::U128;
use near_sdk::serde_json::{json, Value};
use near_sdk::store::{IterableMap, Vector};
use near_sdk::{env, near, AccountId, BorshStorageKey, Gas, NearToken, Promise, PromiseOrValue};

pub const MAX_BIDS: u32 = 32;
pub const MAX_TITLE: usize = 120;
pub const MAX_SPEC: usize = 1000;
pub const MAX_AGENT: usize = 64;
/// Attached to each new bid by its submitter; refunded on reveal or cancel, forfeited to the buyer if unrevealed.
pub const BID_BOND: NearToken = NearToken::from_millinear(20);
const MIN_WINDOW_SECS: u64 = 30;
const MAX_COMMIT_SECS: u64 = 14 * 24 * 3600;
const MAX_REVEAL_SECS: u64 = 3 * 24 * 3600;
/// Covers the job record and up to MAX_BIDS bids; the buyer pays it once when posting.
pub const POST_DEPOSIT: NearToken = NearToken::from_millinear(300);
const GAS_VIEW: Gas = Gas::from_tgas(10);
const GAS_CALLBACK: Gas = Gas::from_tgas(15);

#[derive(BorshStorageKey)]
#[near]
enum Key {
    Jobs,
    Bids(u64),
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub enum Outcome {
    /// No winner chosen yet.
    Pending,
    /// `bids[index]` won.
    Winner {
        index: u32,
    },
    /// No revealed bid within the budget.
    NoValidBid,
    Cancelled,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Bid {
    /// Hex of the bidder's ed25519 public key, which is also its NEAR implicit account id.
    pub bidder: String,
    pub agent: String,
    pub commitment: String,
    pub nonce: u32,
    pub committed_at: u64,
    pub price: Option<U128>,
    pub revealed_at: Option<u64>,
    /// Who attached the bond, and whether the board still holds it.
    pub bond_payer: AccountId,
    pub bond_held: bool,
}

#[near(serializers = [borsh])]
pub struct Job {
    pub buyer: AccountId,
    pub title: String,
    pub spec: String,
    /// sha256 (hex) of the evidence the buyer will require, as in the agreement's terms.
    pub evidence_hash: String,
    /// Base units of the payment token (6 decimals); a revealed price above it is not valid.
    pub budget: U128,
    pub token: AccountId,
    pub created_at: u64,
    pub commit_ends: u64,
    pub reveal_ends: u64,
    pub bids: Vector<Bid>,
    pub outcome: Outcome,
    pub agreement: Option<AccountId>,
    pub linking: bool,
}

#[near(serializers = [json])]
pub struct JobView {
    pub id: u64,
    pub buyer: AccountId,
    pub title: String,
    pub spec: String,
    pub evidence_hash: String,
    pub budget: U128,
    pub token: AccountId,
    pub created_at: u64,
    pub commit_ends: u64,
    pub reveal_ends: u64,
    /// open | revealing | closed | awarded | no_valid_bid | linked | cancelled
    pub phase: String,
    pub bids: Vec<Bid>,
    pub winner: Option<String>,
    pub agreement: Option<AccountId>,
}

/// The factory's record of an agreement, as returned by its `agreement(id)` view (only the fields checked here).
#[near(serializers = [json])]
pub struct AgreementRecord {
    pub account: AccountId,
    pub kind: String,
    pub buyer: AccountId,
    pub vendor: AccountId,
}

#[near(contract_state)]
pub struct TenderBoard {
    factory: AccountId,
    jobs: IterableMap<u64, Job>,
    next_id: u64,
}

impl Default for TenderBoard {
    fn default() -> Self {
        env::panic_str("ERR_NOT_INITIALIZED")
    }
}

/// What a bidder hashes: binds the price to this board, this job and this bidder, so a commitment cannot be copied.
pub fn commitment_message(board: &str, job: u64, bidder: &str, price: u128, salt: &str) -> String {
    format!("accord-tender:v1:commit:{board}:{job}:{bidder}:{price}:{salt}")
}

/// What a bidder signs to submit a commitment. The nonce lets a bidder replace its bid before the deadline and stops
/// an old signed bid from being replayed over a newer one.
pub fn bid_message(board: &str, job: u64, nonce: u32, commitment: &str, agent: &str) -> String {
    format!("accord-tender:v1:bid:{board}:{job}:{nonce}:{commitment}:{agent}")
}

fn decode<const N: usize>(hex_str: &str, err: &str) -> [u8; N] {
    let bytes = hex::decode(hex_str).unwrap_or_else(|_| env::panic_str(err));
    bytes.try_into().unwrap_or_else(|_| env::panic_str(err))
}

fn is_lower_hex(s: &str, len: usize) -> bool {
    s.len() == len
        && s.bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

/// The small-order ed25519 public keys, canonical and not ("Taming the many EdDSAs", Chalkias et al., 2020). NEAR's
/// `ed25519_verify` accepts the all-zero signature on every message for some of them, so a bid "signed" by one would
/// be anyone's. No real key is one of these.
const WEAK_KEYS: [&str; 14] = [
    "0100000000000000000000000000000000000000000000000000000000000000",
    "0100000000000000000000000000000000000000000000000000000000000080",
    "0000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000000000000000000000000080",
    "ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f",
    "ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    "eeffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f",
    "eeffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    "edffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f",
    "edffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    "26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc05",
    "26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc85",
    "c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac037a",
    "c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac03fa",
];

/// An agent label: 1 to 64 printable ASCII characters or spaces, no ':', no leading or trailing space. Checked as
/// given and never trimmed, so the label the bidder signed is the label stored (JS and Rust trim different sets).
pub fn valid_agent(agent: &str) -> bool {
    !agent.is_empty()
        && agent.len() <= MAX_AGENT
        && agent
            .bytes()
            .all(|b| (0x20..=0x7e).contains(&b) && b != b':')
        && !agent.starts_with(' ')
        && !agent.ends_with(' ')
}

fn emit(event: &str, data: Value) {
    let line =
        json!({"standard": "accord-tender", "version": "1.0.0", "event": event, "data": [data]});
    env::log_str(&format!("EVENT_JSON:{line}"));
}

fn phase(job: &Job, now: u64) -> &'static str {
    match (&job.outcome, &job.agreement) {
        (_, Some(_)) => "linked",
        (Outcome::Cancelled, _) => "cancelled",
        (Outcome::NoValidBid, _) => "no_valid_bid",
        (Outcome::Winner { .. }, _) => "awarded",
        (Outcome::Pending, _) if now < job.commit_ends => "open",
        (Outcome::Pending, _) if now < job.reveal_ends => "revealing",
        (Outcome::Pending, _) => "closed",
    }
}

#[near]
impl TenderBoard {
    #[init]
    pub fn new(factory: AccountId) -> Self {
        Self {
            factory,
            jobs: IterableMap::new(Key::Jobs),
            next_id: 1,
        }
    }

    /// Posts a job. The caller is the buyer and pays POST_DEPOSIT for the job's storage.
    #[payable]
    #[allow(clippy::too_many_arguments)]
    pub fn post_job(
        &mut self,
        title: String,
        spec: String,
        evidence_hash: String,
        budget: U128,
        token: AccountId,
        commit_secs: u64,
        reveal_secs: u64,
    ) -> u64 {
        assert!(env::attached_deposit() >= POST_DEPOSIT, "ERR_DEPOSIT");
        let title = title.trim().to_string();
        assert!(
            !title.is_empty() && title.chars().count() <= MAX_TITLE,
            "ERR_TITLE"
        );
        assert!(spec.chars().count() <= MAX_SPEC, "ERR_SPEC");
        assert!(is_lower_hex(&evidence_hash, 64), "ERR_EVIDENCE_HASH");
        assert!(budget.0 > 0, "ERR_BUDGET");
        assert!(
            (MIN_WINDOW_SECS..=MAX_COMMIT_SECS).contains(&commit_secs),
            "ERR_COMMIT_WINDOW"
        );
        assert!(
            (MIN_WINDOW_SECS..=MAX_REVEAL_SECS).contains(&reveal_secs),
            "ERR_REVEAL_WINDOW"
        );
        let now = env::block_timestamp();
        let id = self.next_id;
        self.next_id += 1;
        let job = Job {
            buyer: env::predecessor_account_id(),
            title,
            spec,
            evidence_hash,
            budget,
            token,
            created_at: now,
            commit_ends: now + commit_secs * 1_000_000_000,
            reveal_ends: now + (commit_secs + reveal_secs) * 1_000_000_000,
            bids: Vector::new(Key::Bids(id)),
            outcome: Outcome::Pending,
            agreement: None,
            linking: false,
        };
        emit(
            "job_posted",
            json!({"job": id, "buyer": job.buyer, "title": job.title, "budget": budget, "commit_ends": job.commit_ends, "reveal_ends": job.reveal_ends}),
        );
        self.jobs.insert(id, job);
        id
    }

    /// Commits (or, with a higher nonce, replaces) a sealed bid. Anyone may submit it; only the bidder's signature
    /// counts. `bidder` is the hex public key, `signature` the hex ed25519 signature over `bid_message`. A new bid
    /// attaches exactly BID_BOND; a replacement attaches nothing (the first bond stays with the bid).
    #[payable]
    pub fn submit_bid(
        &mut self,
        job: u64,
        bidder: String,
        commitment: String,
        agent: String,
        nonce: u32,
        signature: String,
    ) -> u32 {
        let board = env::current_account_id();
        let now = env::block_timestamp();
        let j = self
            .jobs
            .get_mut(&job)
            .unwrap_or_else(|| env::panic_str("ERR_NO_JOB"));
        assert!(
            j.outcome == Outcome::Pending && now < j.commit_ends,
            "ERR_BIDDING_CLOSED"
        );
        assert!(
            is_lower_hex(&bidder, 64) && !WEAK_KEYS.contains(&bidder.as_str()),
            "ERR_BIDDER"
        );
        assert!(is_lower_hex(&commitment, 64), "ERR_COMMITMENT");
        assert!(valid_agent(&agent), "ERR_AGENT");
        let pk: [u8; 32] = decode(&bidder, "ERR_BIDDER");
        let sig: [u8; 64] = decode(&signature, "ERR_SIGNATURE");
        let msg = bid_message(board.as_str(), job, nonce, &commitment, &agent);
        assert!(
            env::ed25519_verify(&sig, msg.as_bytes(), &pk),
            "ERR_SIGNATURE"
        );

        let existing = (0..j.bids.len()).find(|&i| j.bids[i].bidder == bidder);
        let index = match existing {
            Some(i) => {
                assert!(env::attached_deposit().is_zero(), "ERR_BOND");
                let b = &mut j.bids[i];
                assert!(nonce > b.nonce, "ERR_NONCE");
                b.commitment = commitment.clone();
                b.agent = agent.clone();
                b.nonce = nonce;
                b.committed_at = now;
                i
            }
            None => {
                assert!(j.bids.len() < MAX_BIDS, "ERR_JOB_FULL");
                assert!(env::attached_deposit() == BID_BOND, "ERR_BOND");
                j.bids.push(Bid {
                    bidder: bidder.clone(),
                    agent: agent.clone(),
                    commitment: commitment.clone(),
                    nonce,
                    committed_at: now,
                    price: None,
                    revealed_at: None,
                    bond_payer: env::predecessor_account_id(),
                    bond_held: true,
                });
                j.bids.len() - 1
            }
        };
        emit(
            "bid_committed",
            json!({"job": job, "index": index, "bidder": bidder, "agent": agent, "commitment": commitment, "nonce": nonce}),
        );
        index
    }

    /// Reveals a bid's price after the commit deadline and returns its bond to whoever attached it. Anyone holding
    /// the price and salt may call it: the commitment binds both to this job and bidder.
    pub fn reveal_bid(&mut self, job: u64, bidder: String, price: U128, salt: String) {
        let board = env::current_account_id();
        let now = env::block_timestamp();
        let j = self
            .jobs
            .get_mut(&job)
            .unwrap_or_else(|| env::panic_str("ERR_NO_JOB"));
        assert!(j.outcome == Outcome::Pending, "ERR_DECIDED");
        assert!(now >= j.commit_ends, "ERR_TOO_EARLY");
        assert!(now < j.reveal_ends, "ERR_REVEAL_CLOSED");
        assert!(is_lower_hex(&salt, 64), "ERR_SALT");
        let i = (0..j.bids.len())
            .find(|&i| j.bids[i].bidder == bidder)
            .unwrap_or_else(|| env::panic_str("ERR_NO_BID"));
        let budget = j.budget;
        let b = &mut j.bids[i];
        assert!(b.price.is_none(), "ERR_REVEALED");
        let want = hex::encode(env::sha256_array(commitment_message(
            board.as_str(),
            job,
            &bidder,
            price.0,
            &salt,
        )));
        assert!(want == b.commitment, "ERR_COMMITMENT_MISMATCH");
        b.price = Some(price);
        b.revealed_at = Some(now);
        let refund = b.bond_held.then(|| b.bond_payer.clone());
        b.bond_held = false;
        emit(
            "bid_revealed",
            json!({"job": job, "index": i, "bidder": bidder, "price": price, "within_budget": price.0 <= budget.0}),
        );
        if let Some(payer) = refund {
            Promise::new(payer).transfer(BID_BOND).detach();
        }
    }

    /// Chooses the winner: the lowest revealed price within the budget; on a tie, the bid whose last commitment came
    /// first (a replaced bid counts from its replacement), then the lower index. Open to anyone once the reveal
    /// window has closed, or earlier once every bid has been revealed. Bonds of unrevealed bids go to the buyer.
    pub fn award(&mut self, job: u64) -> Outcome {
        let now = env::block_timestamp();
        let j = self
            .jobs
            .get_mut(&job)
            .unwrap_or_else(|| env::panic_str("ERR_NO_JOB"));
        assert!(j.outcome == Outcome::Pending, "ERR_DECIDED");
        assert!(now >= j.commit_ends, "ERR_TOO_EARLY");
        let all_revealed = !j.bids.is_empty() && j.bids.iter().all(|b| b.price.is_some());
        assert!(now >= j.reveal_ends || all_revealed, "ERR_REVEAL_OPEN");
        let mut best: Option<(u32, u128, u64)> = None;
        for (i, b) in j.bids.iter().enumerate() {
            if let Some(p) = b.price {
                let better =
                    best.is_none_or(|(_, bp, bt)| p.0 < bp || (p.0 == bp && b.committed_at < bt));
                if p.0 <= j.budget.0 && better {
                    best = Some((i as u32, p.0, b.committed_at));
                }
            }
        }
        let mut forfeited: u128 = 0;
        for b in j.bids.iter_mut() {
            if b.bond_held {
                b.bond_held = false;
                forfeited += 1;
            }
        }
        j.outcome = match best {
            Some((index, _, _)) => Outcome::Winner { index },
            None => Outcome::NoValidBid,
        };
        let winner = best.map(|(i, _, _)| j.bids[i].bidder.clone());
        emit(
            "awarded",
            json!({"job": job, "winner": winner, "price": best.map(|(_, p, _)| U128(p)), "bonds_forfeited": forfeited as u64}),
        );
        if forfeited > 0 {
            Promise::new(j.buyer.clone())
                .transfer(BID_BOND.saturating_mul(forfeited))
                .detach();
        }
        j.outcome.clone()
    }

    /// The buyer cancels a job that has no winner yet; every bond still held goes back to its payer.
    pub fn cancel_job(&mut self, job: u64) {
        let j = self
            .jobs
            .get_mut(&job)
            .unwrap_or_else(|| env::panic_str("ERR_NO_JOB"));
        assert!(env::predecessor_account_id() == j.buyer, "ERR_NOT_BUYER");
        assert!(j.outcome == Outcome::Pending, "ERR_DECIDED");
        j.outcome = Outcome::Cancelled;
        let mut refunds: Vec<AccountId> = Vec::new();
        for b in j.bids.iter_mut() {
            if b.bond_held {
                b.bond_held = false;
                refunds.push(b.bond_payer.clone());
            }
        }
        emit(
            "cancelled",
            json!({"job": job, "bonds_refunded": refunds.len()}),
        );
        for payer in refunds {
            Promise::new(payer).transfer(BID_BOND).detach();
        }
    }

    /// The buyer names the Accord agreement it opened with the winner. The factory is asked for agreement `id`; the
    /// link is stored only if it is a procurement agreement with this buyer and the winner's account as vendor.
    pub fn link_agreement(&mut self, job: u64, agreement_id: u64) -> Promise {
        let j = self
            .jobs
            .get_mut(&job)
            .unwrap_or_else(|| env::panic_str("ERR_NO_JOB"));
        assert!(env::predecessor_account_id() == j.buyer, "ERR_NOT_BUYER");
        assert!(matches!(j.outcome, Outcome::Winner { .. }), "ERR_NO_WINNER");
        assert!(j.agreement.is_none() && !j.linking, "ERR_LINKED");
        j.linking = true;
        Promise::new(self.factory.clone())
            .function_call(
                "agreement",
                json!({"id": agreement_id}).to_string().into_bytes(),
                NearToken::from_yoctonear(0),
                GAS_VIEW,
            )
            .then(Promise::new(env::current_account_id()).function_call(
                "on_agreement",
                json!({"job": job}).to_string().into_bytes(),
                NearToken::from_yoctonear(0),
                GAS_CALLBACK,
            ))
    }

    #[private]
    pub fn on_agreement(&mut self, job: u64) -> PromiseOrValue<Option<AccountId>> {
        let record = env::promise_result_checked(0, 4096)
            .ok()
            .and_then(|bytes| {
                near_sdk::serde_json::from_slice::<Option<AgreementRecord>>(&bytes).ok()
            })
            .flatten();
        let j = self
            .jobs
            .get_mut(&job)
            .unwrap_or_else(|| env::panic_str("ERR_NO_JOB"));
        j.linking = false;
        let winner = match j.outcome {
            Outcome::Winner { index } => j.bids[index].bidder.clone(),
            _ => return PromiseOrValue::Value(None),
        };
        let ok = record.as_ref().is_some_and(|r| {
            r.kind == "procurement" && r.buyer == j.buyer && r.vendor.as_str() == winner
        });
        if !ok || j.agreement.is_some() {
            emit("link_refused", json!({"job": job}));
            return PromiseOrValue::Value(None);
        }
        let account = record.map(|r| r.account).expect("checked above");
        j.agreement = Some(account.clone());
        emit("linked", json!({"job": job, "agreement": account}));
        PromiseOrValue::Value(Some(account))
    }

    // ---- views ----

    pub fn get_factory(&self) -> AccountId {
        self.factory.clone()
    }

    pub fn get_job(&self, id: u64) -> Option<JobView> {
        self.jobs
            .get(&id)
            .map(|j| view(id, j, env::block_timestamp()))
    }

    /// Newest first.
    pub fn list_jobs(&self, from: Option<u64>, limit: Option<u8>) -> Vec<JobView> {
        let now = env::block_timestamp();
        let limit = limit.unwrap_or(10).min(20) as usize;
        let top = from
            .unwrap_or(self.next_id.saturating_sub(1))
            .min(self.next_id.saturating_sub(1));
        (1..=top)
            .rev()
            .filter_map(|id| self.jobs.get(&id).map(|j| view(id, j, now)))
            .take(limit)
            .collect()
    }

    pub fn job_count(&self) -> u64 {
        self.next_id - 1
    }
}

fn view(id: u64, j: &Job, now: u64) -> JobView {
    JobView {
        id,
        buyer: j.buyer.clone(),
        title: j.title.clone(),
        spec: j.spec.clone(),
        evidence_hash: j.evidence_hash.clone(),
        budget: j.budget,
        token: j.token.clone(),
        created_at: j.created_at,
        commit_ends: j.commit_ends,
        reveal_ends: j.reveal_ends,
        phase: phase(j, now).to_string(),
        bids: j.bids.iter().cloned().collect(),
        winner: match j.outcome {
            Outcome::Winner { index } => Some(j.bids[index].bidder.clone()),
            _ => None,
        },
        agreement: j.agreement.clone(),
    }
}

#[cfg(test)]
mod tests;

#[cfg(test)]
mod audit_tests;
#[cfg(test)]
mod sim;

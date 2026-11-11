//! `make tender-sim`: a market with no LLM calls. 20 scripted bidding agents meet 5 jobs on the board's own code:
//! cost-plus, undercutters, premium sellers, one that bids over the budget and one that never reveals. Each round
//! prints its sealed bids, reveals, clearing price and forfeited bonds, and the test asserts the board's rules hold:
//! the lowest revealed price within the budget wins, a bid left unrevealed forfeits its bond, and no price is visible
//! before the reveal.

use super::*;
use ed25519_dalek::{Signer, SigningKey};
use near_sdk::test_utils::{get_logs, VMContextBuilder};
use near_sdk::testing_env;

const BOARD: &str = "tender-v2.accord-v2.testnet";
const SEC: u64 = 1_000_000_000;

#[derive(Clone, Copy, Debug)]
enum Strategy {
    CostPlus,
    Undercut,
    Premium,
    OverBudget,
    NeverReveals,
}

struct Agent {
    name: String,
    key: SigningKey,
    cost: u128,
    strategy: Strategy,
}

fn at(pred: &str, deposit: NearToken, t: u64) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(BOARD.parse().unwrap())
        .predecessor_account_id(pred.parse().unwrap())
        .attached_deposit(deposit)
        .block_timestamp(t)
        .account_balance(NearToken::from_near(100))
        .prepaid_gas(Gas::from_tgas(300));
    testing_env!(b.build());
}

/// A small deterministic generator, so every run of the simulation is the same market.
struct Lcg(u64);
impl Lcg {
    fn next(&mut self, n: u64) -> u64 {
        self.0 = self
            .0
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        (self.0 >> 33) % n
    }
}

#[test]
fn simulation_20_agents_5_jobs() {
    let mut rng = Lcg(20_261_111);
    let strategies = [Strategy::CostPlus, Strategy::Undercut, Strategy::Premium];
    let mut agents: Vec<Agent> = (0..20u8)
        .map(|i| {
            let strategy = match i {
                18 => Strategy::OverBudget,
                19 => Strategy::NeverReveals,
                _ => strategies[i as usize % 3],
            };
            Agent {
                name: format!("agent-{:02}-{:?}", i + 1, strategy).to_lowercase(),
                key: SigningKey::from_bytes(&[i + 1; 32]),
                cost: 25_000_000 + rng.next(10_000_000) as u128,
                strategy,
            }
        })
        .collect();
    at("accord-v2.testnet", NearToken::from_yoctonear(0), 0);
    let mut board = TenderBoard::new("accord-v2.testnet".parse().unwrap());
    println!("simulation: 20 scripted agents, 5 jobs, board rules from contracts/tender-board (no LLM calls)");
    for round in 0..5u64 {
        let t0 = (round + 1) * 1000 * SEC;
        let budget: u128 = 40_000_000;
        at("buyer.testnet", POST_DEPOSIT, t0);
        let job = board.post_job(
            format!("job {}", round + 1),
            String::new(),
            "11".repeat(32),
            U128(budget),
            "tusdc.testnet".parse().unwrap(),
            60,
            60,
        );
        // each agent bids on about two jobs in three
        let mut entered: Vec<(usize, u128, String)> = Vec::new();
        for (i, a) in agents.iter_mut().enumerate() {
            if rng.next(3) == 0 {
                continue;
            }
            let price = match a.strategy {
                Strategy::CostPlus => a.cost * 110 / 100,
                Strategy::Undercut => a.cost * 102 / 100,
                Strategy::Premium => a.cost * 135 / 100,
                Strategy::OverBudget => budget + 5_000_000,
                Strategy::NeverReveals => a.cost,
            };
            let salt = hex::encode([(i as u8) ^ (round as u8); 32]);
            let id = hex::encode(a.key.verifying_key().to_bytes());
            let c = hex::encode(env::sha256_array(commitment_message(
                BOARD, job, &id, price, &salt,
            )));
            let sig = hex::encode(
                a.key
                    .sign(bid_message(BOARD, job, 1, &c, &a.name).as_bytes())
                    .to_bytes(),
            );
            at("relay.testnet", BID_BOND, t0 + SEC + i as u64);
            board.submit_bid(job, id, c, a.name.clone(), 1, sig);
            entered.push((i, price, salt));
        }
        assert!(
            board
                .get_job(job)
                .unwrap()
                .bids
                .iter()
                .all(|b| b.price.is_none()),
            "a price was visible before the reveal"
        );
        at(
            "anyone.testnet",
            NearToken::from_yoctonear(0),
            t0 + 61 * SEC,
        );
        for (i, price, salt) in &entered {
            let a = &agents[*i];
            if matches!(a.strategy, Strategy::NeverReveals) {
                continue;
            }
            board.reveal_bid(
                job,
                hex::encode(a.key.verifying_key().to_bytes()),
                U128(*price),
                salt.clone(),
            );
        }
        at(
            "anyone.testnet",
            NearToken::from_yoctonear(0),
            t0 + 121 * SEC,
        );
        let outcome = board.award(job);
        let forfeited = get_logs()
            .iter()
            .find_map(|l| {
                let v: Value =
                    near_sdk::serde_json::from_str(l.strip_prefix("EVENT_JSON:")?).ok()?;
                (v["event"] == "awarded")
                    .then(|| v["data"][0]["bonds_forfeited"].as_u64())
                    .flatten()
            })
            .unwrap();
        let expected = entered
            .iter()
            .filter(|(i, p, _)| {
                !matches!(
                    agents[*i].strategy,
                    Strategy::NeverReveals | Strategy::OverBudget
                ) && *p <= budget
            })
            .min_by_key(|(_, p, _)| *p);
        let v = board.get_job(job).unwrap();
        let (winner, price) = match outcome {
            Outcome::Winner { index } => (
                v.bids[index as usize].agent.clone(),
                v.bids[index as usize].price.unwrap().0,
            ),
            _ => ("none".into(), 0),
        };
        println!(
            "  job {}  {:>2} sealed bids · {:>2} revealed · clearing {:>6.2} USDC · winner {:<24} · bonds forfeited {}",
            round + 1,
            v.bids.len(),
            v.bids.iter().filter(|b| b.price.is_some()).count(),
            price as f64 / 1e6,
            winner,
            forfeited
        );
        assert_eq!(
            price,
            expected.map(|e| e.1).unwrap_or(0),
            "the lowest valid revealed price wins"
        );
        let unrevealed = entered
            .iter()
            .filter(|(i, _, _)| matches!(agents[*i].strategy, Strategy::NeverReveals))
            .count() as u64;
        assert_eq!(
            forfeited, unrevealed,
            "each unrevealed bid forfeits its bond"
        );
    }
}

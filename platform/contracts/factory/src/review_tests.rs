//! Adversarial review of the factory (griefing and unbounded growth, I16). `FINDING` tests assert the fixed
//! behaviour, so they fail at HEAD 1196775; comments say what HEAD does.

use super::*;
use near_sdk::test_utils::VMContextBuilder;
use near_sdk::testing_env;
use near_sdk::PromiseResult;

fn acc(s: &str) -> AccountId {
    s.parse().unwrap()
}
const FACTORY: &str = "accord-v1.testnet";
const KEY: &str = "ed25519:6E8sCci9badyRkXb3JoRpBj5p8C6Tw41ELDZoiihKEtp";

fn ctx(pred: &str, deposit: NearToken, results: Vec<PromiseResult>) {
    let mut b = VMContextBuilder::new();
    b.current_account_id(acc(FACTORY))
        .predecessor_account_id(acc(pred))
        .signer_account_id(acc(pred))
        .attached_deposit(deposit)
        .account_balance(NearToken::from_near(100))
        .prepaid_gas(Gas::from_tgas(300));
    testing_env!(
        b.build(),
        near_sdk::test_vm_config(),
        near_sdk::RuntimeFeesConfig::test(),
        Default::default(),
        results
    );
}

fn jr() -> JobRelease {
    JobRelease {
        project: "p".into(),
        wasm_hash: "w".into(),
        signing_pubkey: KEY.parse().unwrap(),
        pubkey_task_id: 1,
    }
}

fn factory() -> Factory {
    ctx("owner.testnet", NearToken::from_near(0), vec![]);
    let mut f = Factory::new(
        Config {
            owner: acc("owner.testnet"),
            token: acc("usdc.testnet"),
            outlayer: acc("outlayer.testnet"),
            keeper: acc("keeper.testnet"),
            create_deposit: U128(2 * 10u128.pow(24)),
            demo_allowed: true,
        },
        Base64VecU8(vec![]),
    );
    f.releases.insert(
        1,
        Release {
            version: 1,
            mode: ReleaseMode::Global,
            code_hash: Base58CryptoHash::from([0u8; 32]),
            sealed_table: jr(),
            payee: jr(),
            observer: jr(),
            mandate_pubkey: "02".repeat(33),
            model: "m".into(),
            published_at: 0,
        },
    );
    f.current = Some(1);
    f
}

fn demo_params() -> serde_json::Value {
    json!({
        "mode": "demo", "timelock_secs": 120, "claim_delay_secs": 120, "grace_secs": 600,
        "min_acceptance_window_secs": 60, "max_acceptance_window_secs": 604800, "require_two_sided": true,
        "observation_grace_secs": 60, "refusal_limit": 5, "refusal_window_secs": 3600,
        "agent_allowance": "500000000000000000000000",
    })
}

fn valid_args(vendor: &str) -> CreateArgs {
    CreateArgs {
        params: demo_params(),
        ..args(vendor)
    }
}

fn args(vendor: &str) -> CreateArgs {
    CreateArgs {
        kind: "procurement".into(),
        title: "x".repeat(120),
        vendor: acc(vendor),
        vendor_authority: acc("auth.testnet"),
        canaries: (0..8).map(|i| acc(&format!("canary{i}.testnet"))).collect(),
        // Below the live minimums.
        params: json!({"mode": "live", "timelock_secs": 1}),
    }
}

/// Fixed (was a finding, I16): a creation with bad parameters is refused before its record is written, so failing
/// creations on purpose cannot grow the factory's storage.
#[test]
fn review_failed_creations_grow_factory_storage_at_its_expense() {
    let mut f = factory();
    let before = env::storage_usage();
    let deposit = NearToken::from_near(2);
    for _ in 0..20 {
        ctx("griefer.testnet", deposit, vec![]);
        let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            f.create_agreement(args("vendor.testnet"))
        }));
        assert!(r.is_err(), "bad params are refused before the batch");
    }
    assert_eq!(f.agreements.len(), 0);
    assert_eq!(env::storage_usage(), before, "no record was written");
}

/// FINDING (I16, integrity): a registered agreement reports every `PayeeMismatch` / `Canary` refusal's recipient, and
/// the factory keeps one `reports` entry per distinct account with no bound on the number of accounts. An agreement
/// whose buyer controls the agent (reinstalling keys after each refusal-limit revoke) can grow the factory's state
/// without limit and make any account show up as "reported". Fixed behaviour: a per-agreement cap.
#[test]
fn review_one_agreement_can_report_unbounded_distinct_accounts() {
    let mut f = factory();
    let agreement = acc(&format!("a1.{FACTORY}"));
    f.registry.insert(agreement.clone(), 1);
    let before = env::storage_usage();
    for i in 0..200u64 {
        ctx(agreement.as_str(), NearToken::from_near(0), vec![]);
        f.report_recipient(acc(&format!("victim{i}.testnet")), i);
    }
    f.reports.flush();
    let reported = (0..200u64)
        .filter(|i| !f.reports(acc(&format!("victim{i}.testnet"))).is_empty())
        .count();
    eprintln!(
        "one agreement reported {reported} accounts, +{} bytes",
        env::storage_usage() - before
    );
    assert!(
        reported <= MAX_REPORTS_PER_AGREEMENT as usize,
        "one agreement filed {reported} reports"
    );
}

/// What held: ids are never reused after a failed creation, and only the releases account can store a pubkey.
#[test]
fn review_ids_not_reused_and_store_pubkey_gated() {
    let mut f = factory();
    ctx("buyer.testnet", NearToken::from_near(2), vec![]);
    let _ = f.create_agreement(valid_args("vendor.testnet"));
    ctx(
        FACTORY,
        NearToken::from_near(0),
        vec![PromiseResult::Failed],
    );
    let _ = f.on_agreement_created(1, U128(2 * 10u128.pow(24)));
    ctx("buyer.testnet", NearToken::from_near(2), vec![]);
    let _ = f.create_agreement(valid_args("vendor.testnet"));
    assert_eq!(f.agreements.len(), 2);
    assert_eq!(
        f.agreements.get(1).unwrap().account.as_str(),
        "a2.accord-v1.testnet"
    );
    assert!(f.agreement(1).is_none(), "a failed id is not listed");

    ctx("mallory.testnet", NearToken::from_near(0), vec![]);
    let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        f.store_pubkey("payee".into(), "p".into(), "w".into(), "{}".into())
    }));
    assert!(r.is_err());
    ctx("mallory.testnet", NearToken::from_near(0), vec![]);
    let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        f.report_recipient(acc("x.testnet"), 1)
    }));
    assert!(r.is_err(), "only registered agreements report");
}

//! `releases.<factory>`: created by the factory with no key, so only this code ever acts for it. It requests each
//! job's `pubkey` run with the input fixed here to `{"mode": "pubkey"}` and forwards the signed answer to the
//! factory. It has no other method, so the S1 condition can admit it without admitting anything that could
//! request a `negotiate` or `prove` run.

use near_sdk::{env, near, AccountId, Gas, NearToken, Promise};
use serde_json::json;

const TGAS: u64 = 1_000_000_000_000;
/// Attached to OutLayer per run; the unused part is refunded here.
const PUBKEY_DEPOSIT: NearToken = NearToken::from_millinear(30);
const JOBS: [&str; 3] = ["sealed_table", "payee", "observer"];

#[near(contract_state)]
pub struct Releases {
    factory: AccountId,
    outlayer: AccountId,
}

impl Default for Releases {
    fn default() -> Self {
        env::panic_str("ERR_NOT_INITIALIZED")
    }
}

#[near]
impl Releases {
    #[init]
    pub fn new(factory: AccountId, outlayer: AccountId) -> Self {
        assert_eq!(env::predecessor_account_id(), factory, "ERR_NOT_FACTORY");
        Self { factory, outlayer }
    }

    /// Callable only by the factory. The input is fixed: a `pubkey` run reveals public keys and nothing else.
    pub fn request_pubkey(&mut self, job: String, project: String, version_key: String) -> Promise {
        assert_eq!(
            env::predecessor_account_id(),
            self.factory,
            "ERR_NOT_FACTORY"
        );
        assert!(JOBS.contains(&job.as_str()), "ERR_UNKNOWN_JOB");
        let args = json!({
            "source": {"Project": {"project_id": project, "version_key": version_key}},
            // the project owner's secrets (the job's PROTECTED_ seed); without a reference OutLayer attaches none
            "secrets_ref": {"account_id": project.split('/').next().unwrap_or_default(), "profile": "default"},
            "resource_limits": {"max_instructions": 10_000_000_000u64, "max_memory_mb": 128, "max_execution_seconds": 30},
            "input_data": json!({"mode": "pubkey"}).to_string(),
            "response_format": "Json",
        });
        Promise::new(self.outlayer.clone())
            .function_call(
                "request_execution",
                serde_json::to_vec(&args).unwrap(),
                PUBKEY_DEPOSIT,
                Gas::from_gas(150 * TGAS),
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(Gas::from_gas(40 * TGAS))
                    .on_pubkey(job, project, version_key),
            )
    }

    #[private]
    pub fn on_pubkey(&mut self, job: String, project: String, version_key: String) -> Promise {
        let output = env::promise_result_checked(0, 16 * 1024)
            .ok()
            .and_then(|b| String::from_utf8(b).ok())
            .unwrap_or_else(|| env::panic_str("ERR_NO_OUTPUT"));
        Promise::new(self.factory.clone()).function_call(
            "store_pubkey",
            serde_json::to_vec(&json!({
                "job": job, "project": project, "wasm_hash": version_key, "output": output,
            }))
            .unwrap(),
            NearToken::from_yoctonear(0),
            Gas::from_gas(20 * TGAS),
        )
    }
}

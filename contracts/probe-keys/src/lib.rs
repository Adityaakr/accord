//! Keys probe (PROGRESS 0.4). Deployed to a throwaway testnet sub-account: the owner adds a FunctionCall key for
//! `act` to the account itself, the key calls `act`, then `revoke` flags the key and deletes it.

use near_sdk::{env, near, AccountId, Allowance, NearToken, Promise, PublicKey};

#[near(contract_state)]
pub struct Probe {
    owner: AccountId,
    key: Option<PublicKey>,
    revoked: Vec<PublicKey>,
    acts: u64,
}

impl Default for Probe {
    fn default() -> Self {
        env::panic_str("ERR_NOT_INITIALIZED")
    }
}

#[near]
impl Probe {
    #[init]
    pub fn new(owner: AccountId) -> Self {
        Self { owner, key: None, revoked: vec![], acts: 0 }
    }

    pub fn install(&mut self, public_key: PublicKey, allowance_yocto: near_sdk::json_types::U128) -> Promise {
        assert_eq!(env::predecessor_account_id(), self.owner, "ERR_NOT_OWNER");
        self.key = Some(public_key.clone());
        let allowance = Allowance::limited(NearToken::from_yoctonear(allowance_yocto.0)).expect("ERR_ALLOWANCE");
        Promise::new(env::current_account_id()).add_access_key_allowance(public_key, allowance, env::current_account_id(), "act")
    }

    /// Callable only by the account itself (any key on it); reports which key signed.
    pub fn act(&mut self) -> String {
        assert_eq!(env::predecessor_account_id(), env::current_account_id(), "ERR_UNAUTHORIZED");
        let signer = env::signer_account_pk();
        if self.revoked.contains(&signer) {
            return "ERR_REVOKED".into();
        }
        assert_eq!(Some(&signer), self.key.as_ref(), "ERR_UNAUTHORIZED");
        self.acts += 1;
        format!("act ok #{}", self.acts)
    }

    pub fn revoke(&mut self) -> Promise {
        assert_eq!(env::predecessor_account_id(), self.owner, "ERR_NOT_OWNER");
        let key = self.key.take().expect("ERR_NO_AGENT_KEY");
        self.revoked.push(key.clone());
        Promise::new(env::current_account_id()).delete_key(key)
    }

    pub fn state(&self) -> (Option<PublicKey>, usize, u64) {
        (self.key.clone(), self.revoked.len(), self.acts)
    }
}

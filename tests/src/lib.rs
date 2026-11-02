// `ok` already turns a failed transaction into an error; the successful result is often not needed.
#![allow(unused_must_use)]
//! Sandbox harness: the real contracts on a local NEAR node. The three jobs are replaced by the mock signer: test
//! keys sign the outputs and the `-mock` wasm accepts them through `submit_mock_*`, with every signature check
//! still running. Used by the integration tests in `tests/` and by `make sandbox`.

use accord_core::hash::{jcs_sha256, sha256, signed_bytes, to_hex};
use accord_core::types::*;
use anyhow::{anyhow, bail, Result};
use base64::{engine::general_purpose::STANDARD, Engine};
use ed25519_dalek::{Signer, SigningKey};
use near_workspaces::network::Sandbox;
use near_workspaces::result::ExecutionFinalResult;
use near_workspaces::types::{Gas, KeyType, NearToken, SecretKey};
use near_workspaces::{Account, AccountId, Worker};
use serde_json::{json, Value};

pub const SEALED_SEED: [u8; 32] = [11; 32];
pub const PAYEE_SEED: [u8; 32] = [22; 32];
pub const OBSERVER_SEED: [u8; 32] = [33; 32];
pub const MODEL: &str = "z-ai/glm-5.3-flash";
pub const DOMAIN: &str = "halcyon.example";
pub const SANDBOX_MANDATE_PUBKEY: &str = "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798";
pub const CREATE_DEPOSIT: NearToken = NearToken::from_near(8);

pub fn tgas(t: u64) -> Gas {
    Gas::from_tgas(t)
}

pub fn wasm(name: &str) -> Result<Vec<u8>> {
    let path = format!("{}/../target/wasm/{name}.wasm", env!("CARGO_MANIFEST_DIR"));
    std::fs::read(&path).map_err(|e| anyhow!("{path}: {e} (run scripts/build-wasm.sh)"))
}

/// `ed25519:<base58>` for a seed's public key.
pub fn pubkey(seed: [u8; 32]) -> String {
    format!(
        "ed25519:{}",
        bs58::encode(SigningKey::from_bytes(&seed).verifying_key().to_bytes()).into_string()
    )
}

/// Adds `"sig"`: ed25519 over `JCS(output without sig)`, as every job signs.
pub fn sign(seed: [u8; 32], mut v: Value) -> Value {
    let sig = SigningKey::from_bytes(&seed).sign(&signed_bytes(&v));
    v["sig"] = json!(STANDARD.encode(sig.to_bytes()));
    v
}

pub fn demo_params() -> Params {
    Params {
        mode: Mode::Demo,
        timelock_secs: 30,
        claim_delay_secs: 20,
        grace_secs: 30,
        min_acceptance_window_secs: 10,
        max_acceptance_window_secs: 604_800,
        require_two_sided: true,
        observation_grace_secs: 5,
        refusal_limit: 5,
        refusal_window_secs: 3600,
        agent_allowance: 500_000_000_000_000_000_000_000,
    }
}

/// A transaction that must succeed.
pub fn ok(r: ExecutionFinalResult) -> Result<ExecutionFinalResult> {
    if r.is_success() {
        Ok(r)
    } else {
        bail!("transaction failed: {}", failure(&r))
    }
}

/// The failures in a result, for asserting panics such as `ERR_TOO_EARLY`.
pub fn failure(r: &ExecutionFinalResult) -> String {
    format!("{:?}", r.receipt_failures())
}

pub fn events(r: &ExecutionFinalResult, name: &str) -> Vec<Value> {
    r.logs()
        .iter()
        .filter_map(|l| l.strip_prefix("EVENT_JSON:"))
        .filter_map(|l| serde_json::from_str::<Value>(l).ok())
        .filter(|e| e["event"] == name)
        .map(|e| e["data"][0].clone())
        .collect()
}

pub struct Env {
    pub worker: Worker<Sandbox>,
    pub root: Account,
    pub token: Account,
    pub factory: Account,
    pub buyer: Account,
    pub vendor: Account,
    pub authority: Account,
    pub recipient: Account,
    pub keeper: Account,
    pub attacker: Account,
    pub canaries: Vec<Account>,
}

async fn sub(root: &Account, name: &str, near: u128) -> Result<Account> {
    root.create_subaccount(name)
        .initial_balance(NearToken::from_near(near))
        .transact()
        .await?
        .into_result()
        .map_err(|e| anyhow!("{name}: {e:?}"))
}

impl Env {
    /// A fresh sandbox: tUSDC, the factory (mock build) with release 1 holding the mock agreement code and the mock
    /// job keys, and the demo principals.
    pub async fn new() -> Result<Self> {
        let worker = near_workspaces::sandbox().await?;
        let root = worker.root_account()?;
        let token = sub(&root, "tusdc", 10).await?;
        token
            .deploy(&wasm("test-token")?)
            .await?
            .into_result()
            .map_err(|e| anyhow!("{e:?}"))?;
        ok(token.call(token.id(), "new").transact().await?)?;
        let factory = sub(&root, "accord", 80).await?;
        let env = Self {
            buyer: sub(&root, "northwind", 80).await?,
            vendor: sub(&root, "halcyon", 10).await?,
            authority: sub(&root, "halcyon-auth", 10).await?,
            recipient: sub(&root, "halcyon-mm", 5).await?,
            keeper: sub(&root, "keeper", 10).await?,
            attacker: sub(&root, "halcyon-markets", 5).await?,
            canaries: vec![
                sub(&root, "halcyon-mm-payments", 2).await?,
                sub(&root, "halcyon-treasury", 2).await?,
            ],
            worker,
            root,
            token,
            factory,
        };
        env.setup_factory().await?;
        Ok(env)
    }

    async fn setup_factory(&self) -> Result<()> {
        let f = &self.factory;
        f.deploy(&wasm("factory-mock")?)
            .await?
            .into_result()
            .map_err(|e| anyhow!("{e:?}"))?;
        ok(f.call(f.id(), "new")
            .args_json(json!({
                "config": {
                    "owner": f.id(), "token": self.token.id(), "outlayer": "outlayer.test.near",
                    "keeper": self.keeper.id(), "create_deposit": CREATE_DEPOSIT.as_yoctonear().to_string(),
                    "demo_allowed": true,
                },
                "releases_code": STANDARD.encode(wasm("releases")?),
            }))
            .gas(tgas(300))
            .transact()
            .await?)?;
        for (job, seed, project) in [
            ("sealed_table", SEALED_SEED, "accord-sealed-table"),
            ("payee", PAYEE_SEED, "accord-payee"),
            ("observer", OBSERVER_SEED, "accord-observer"),
        ] {
            let mut out = json!({"mode": "pubkey", "job": job, "signing_pubkey": pubkey(seed)});
            if job == "sealed_table" {
                // A real secp256k1 point (the generator; its secret is 1), so the browser can seal in the sandbox.
                // Sandbox only: nothing sealed here is private.
                out["mandate_pubkey"] = json!(SANDBOX_MANDATE_PUBKEY);
            }
            let out = sign(seed, out);
            ok(f.call(f.id(), "submit_mock_pubkey")
                .args_json(json!({
                    "job": job, "project": format!("{}/{project}", f.id()), "wasm_hash": "cd".repeat(32),
                    "output": out.to_string(),
                }))
                .transact()
                .await?)?;
        }
        let code = wasm("agreement-mock")?;
        let hash = bs58::encode(sha256(&code)).into_string();
        ok(f.call(f.id(), "publish_release")
            .args_json(json!({
                "version": 1, "mode": "Embedded", "code_hash": hash, "code": STANDARD.encode(&code),
                "task_ids": {"sealed_table": 1, "payee": 2, "observer": 3}, "model": MODEL,
            }))
            .gas(tgas(300))
            .transact()
            .await?)?;
        ok(f.call(f.id(), "set_current_release")
            .args_json(json!({"version": 1}))
            .transact()
            .await?)?;
        Ok(())
    }

    pub async fn now(&self) -> Result<u64> {
        let b = self.worker.view_block().await?;
        Ok(b.timestamp() / 1_000_000_000)
    }

    /// Advances chain time by producing blocks until the chain's clock reaches `t`.
    pub async fn wait_until(&self, t: u64) -> Result<()> {
        while self.now().await? < t {
            self.worker.fast_forward(20).await?;
        }
        Ok(())
    }

    pub async fn mint(&self, to: &AccountId, amount: u128) -> Result<()> {
        ok(self
            .token
            .call(self.token.id(), "mint")
            .args_json(json!({"account_id": to, "amount": amount.to_string()}))
            .transact()
            .await?)?;
        Ok(())
    }

    pub async fn balance(&self, of: &AccountId) -> Result<u128> {
        let v: String = self
            .worker
            .view(self.token.id(), "ft_balance_of")
            .args_json(json!({"account_id": of}))
            .await?
            .json()?;
        Ok(v.parse()?)
    }

    pub async fn create(&self, kind: &str, params: &Params) -> Result<Deal<'_>> {
        let r = ok(self
            .buyer
            .call(self.factory.id(), "create_agreement")
            .args_json(json!({"args": {
                "kind": kind, "title": "Liquidity reporting integration",
                "vendor": self.vendor.id(), "vendor_authority": self.authority.id(),
                "canaries": self.canaries.iter().map(|c| c.id()).collect::<Vec<_>>(),
                "params": params,
            }}))
            .deposit(CREATE_DEPOSIT)
            .gas(tgas(300))
            .transact()
            .await?)?;
        let id: Option<AccountId> = r.clone().json()?;
        let id = id.ok_or_else(|| anyhow!("creation refunded: {:?}", r.logs()))?;
        Ok(Deal {
            env: self,
            id,
            params: params.clone(),
        })
    }
}

/// One agreement under test.
pub struct Deal<'a> {
    pub env: &'a Env,
    pub id: AccountId,
    pub params: Params,
}

impl Deal<'_> {
    pub async fn view(&self, method: &str, args: Value) -> Result<Value> {
        Ok(self
            .env
            .worker
            .view(&self.id, method)
            .args_json(args)
            .await?
            .json()?)
    }

    pub async fn get(&self) -> Result<Value> {
        self.view("get_agreement", json!({})).await
    }

    pub async fn call(
        &self,
        who: &Account,
        method: &str,
        args: Value,
    ) -> Result<ExecutionFinalResult> {
        Ok(who
            .call(&self.id, method)
            .args_json(args)
            .gas(tgas(300))
            .transact()
            .await?)
    }

    pub async fn must(
        &self,
        who: &Account,
        method: &str,
        args: Value,
    ) -> Result<ExecutionFinalResult> {
        ok(self.call(who, method, args).await?).map_err(|e| anyhow!("{method}: {e}"))
    }

    pub async fn commit_both(&self) -> Result<()> {
        for (who, c) in [(&self.env.buyer, "11"), (&self.env.vendor, "22")] {
            self.must(who, "commit_mandate", json!({
                "commitment": c.repeat(32), "ciphertext": STANDARD.encode([7u8; 600]),
                "doc_pubkey": format!("02{}", "cd".repeat(32)), "doc_key_signer": pubkey([5; 32]),
            }))
            .await?;
        }
        Ok(())
    }

    pub async fn nonce(&self) -> Result<String> {
        let a = self.get().await?;
        a["negotiation"]["Requested"]["request_nonce"]
            .as_str()
            .map(String::from)
            .ok_or_else(|| anyhow!("negotiation not requested: {}", a["negotiation"]))
    }

    pub fn sealed_output(&self, nonce: &str, terms: &Terms) -> Value {
        sign(
            SEALED_SEED,
            json!({
                "mode": "negotiate", "agreement": self.id, "release": 1, "request_nonce": nonce,
                "buyer_commitment": "11".repeat(32), "vendor_commitment": "22".repeat(32),
                "outcome": "terms", "terms": terms, "terms_hash": to_hex(&jcs_sha256(terms)),
                "no_deal_reason": null, "rounds": 4, "transcript_hash": "ef".repeat(32),
                "documents": {"buyer": "YQ==", "vendor": "Yg=="},
                "model": {"id": MODEL}, "usage": {"prompt_tokens": 0},
            }),
        )
    }

    /// Seals, negotiates through the mock signer and approves: `Executing`. Returns the terms hash.
    pub async fn to_executing(&self, terms: &Terms) -> Result<String> {
        self.commit_both().await?;
        self.must(&self.env.keeper, "start_negotiation", json!({}))
            .await?;
        let out = self.sealed_output(&self.nonce().await?, terms);
        self.must(
            &self.env.keeper,
            "submit_mock_negotiation",
            json!({"output": out.to_string()}),
        )
        .await?;
        let a = self.get().await?;
        if a["state"] != "Attested" {
            bail!("not attested: {}", a["state"]);
        }
        let hash = a["terms_hash"].as_str().unwrap().to_string();
        for who in [&self.env.buyer, &self.env.vendor] {
            self.must(who, "approve_terms", json!({"terms_hash": hash}))
                .await?;
        }
        Ok(hash)
    }

    pub async fn fund(&self, amount: u128) -> Result<ExecutionFinalResult> {
        let e = self.env;
        e.mint(e.buyer.id(), amount).await?;
        ok(e.buyer
            .call(e.token.id(), "ft_transfer_call")
            .args_json(json!({"receiver_id": self.id, "amount": amount.to_string(), "msg": "fund"}))
            .deposit(NearToken::from_yoctonear(1))
            .gas(tgas(100))
            .transact()
            .await?)
    }

    pub fn payee_output(&self, version: u32, account: &AccountId, rating: &str) -> Value {
        sign(
            PAYEE_SEED,
            json!({
                "mode": "prove", "agreement": self.id, "version": version, "domain": DOMAIN,
                "url": format!("https://{DOMAIN}/.well-known/accord.json"), "file_sha256": "00".repeat(32),
                "account": account, "authority": self.env.authority.id(), "fetched_at": 0, "block": 0,
                "form": "simple", "demo_domain": false,
                "checks": {"file": "ok", "recipient_listed": "ok", "authority_matches": "ok"},
                "signals": {"exists": true, "is_contract": false}, "rating": rating, "reasons": [],
            }),
        )
    }

    /// Proposed, proven by the mock Payee signer, approved by the authority, accepted by the buyer.
    pub async fn authorise(&self, account: &AccountId) -> Result<u32> {
        let e = self.env;
        let r = self
            .must(
                &e.vendor,
                "propose_recipient",
                json!({"account": account, "domain": DOMAIN}),
            )
            .await?;
        let v: u32 = r.json()?;
        let out = self.payee_output(v, account, "allow");
        self.must(
            &e.keeper,
            "submit_mock_payee",
            json!({"version": v, "output": out.to_string()}),
        )
        .await?;
        self.must(&e.authority, "approve_recipient", json!({"version": v}))
            .await?;
        self.must(
            &e.buyer,
            "accept_recipient",
            json!({"version": v, "acknowledge_warnings": false}),
        )
        .await?;
        Ok(v)
    }

    /// The buyer installs a fresh agent key; returns the agent, an account signing with that key.
    pub async fn install_agent(&self) -> Result<Account> {
        let sk = SecretKey::from_random(KeyType::ED25519);
        self.must(
            &self.env.buyer,
            "install_agent_key",
            json!({
                "public_key": sk.public_key().to_string(), "allowance": "500000000000000000000000",
            }),
        )
        .await?;
        Ok(Account::from_secret_key(
            self.id.clone(),
            sk,
            &self.env.worker,
        ))
    }

    pub async fn deliver_and_accept(&self, item: u32) -> Result<()> {
        self.must(&self.env.vendor, "submit_delivery", json!({
            "item": item, "evidence_hash": "ee".repeat(32), "uri": format!("https://{DOMAIN}/deliveries/{item}"),
        }))
        .await?;
        self.must(&self.env.buyer, "accept_delivery", json!({"item": item}))
            .await?;
        Ok(())
    }

    /// `act(Pay)` signed by `agent`. Errors only when the network rejects the transaction (for example
    /// `AccessKeyDoesNotExist`); a refusal is a successful transaction.
    pub async fn pay(
        &self,
        agent: &Account,
        item: u32,
        amount: u128,
        to: &AccountId,
    ) -> Result<ExecutionFinalResult> {
        Ok(agent
            .call(&self.id, "act")
            .args_json(json!({"action": {"Pay": {"item": item, "amount": amount.to_string(), "recipient": to, "memo": null}}}))
            .gas(tgas(80))
            .transact()
            .await?)
    }

    pub async fn keys(&self) -> Result<usize> {
        Ok(self.env.worker.view_access_keys(&self.id).await?.len())
    }

    pub fn sign_observation(&self, o: &Observation) -> String {
        let mut v = serde_json::to_value(o).unwrap();
        v["mode"] = json!("observe");
        v["status"] = json!("observed");
        sign(OBSERVER_SEED, v)["sig"].as_str().unwrap().to_string()
    }
}

/// The outcome of an `act` transaction: the refusal code, or `sent` / `failed` for a payment.
pub fn act_outcome(r: &ExecutionFinalResult) -> Result<String> {
    if !r.is_success() {
        bail!("act failed: {}", failure(r));
    }
    let v: Value = r.clone().json()?;
    if let Some(code) = v["Refused"]["code"].as_str() {
        return Ok(code.to_string());
    }
    if v.get("Sent").is_some() {
        return Ok("sent".into());
    }
    if v.get("Failed").is_some() {
        return Ok("failed".into());
    }
    Ok(v.to_string())
}

pub fn procurement_terms(token: &AccountId, params: &Params) -> Terms {
    Terms {
        v: 1,
        kind: Kind::Procurement,
        token: token.to_string(),
        decimals: 6,
        total: 36_000_000,
        items: (1..=3)
            .map(|id| ItemTerms {
                id,
                amount: 12_000_000,
                due_offset_secs: 60,
                evidence: Evidence::DeliveryAccepted,
            })
            .collect(),
        acceptance_window_secs: 10,
        duration_secs: 120,
        params_hash: jcs_sha256(params),
        doc_hash: [5; 32],
        atlas: None,
    }
}

pub fn venue() -> Venue {
    Venue::RheaDcl {
        network: "mainnet".into(),
        contract: "dclv2.ref-labs.near".into(),
        pool_id: "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1|wrap.near|2000"
            .into(),
    }
}

pub const ATLAS_PERIOD_SECS: u64 = 120;

pub fn market_making_terms(token: &AccountId, params: &Params, max_spread_bps: u32) -> Terms {
    Terms {
        v: 1,
        kind: Kind::MarketMaking,
        token: token.to_string(),
        decimals: 6,
        total: 12_000_000,
        items: (0..2)
            .map(|p| ItemTerms {
                id: p + 1,
                amount: 6_000_000,
                due_offset_secs: ATLAS_PERIOD_SECS * u64::from(p + 1),
                evidence: Evidence::PeriodEligible { period: p },
            })
            .collect(),
        acceptance_window_secs: 10,
        duration_secs: 2 * ATLAS_PERIOD_SECS,
        params_hash: jcs_sha256(params),
        doc_hash: [5; 32],
        atlas: Some(AtlasTerms {
            retainer_per_period: 6_000_000,
            periods: 2,
            period_secs: ATLAS_PERIOD_SECS,
            slots_per_period: 6,
            pass_threshold: 4,
            venue: venue(),
            max_spread_bps,
            min_depth_quote: 150_000_000,
            depth_band_bps: 200,
        }),
    }
}

/// An observation for `slot` of `period`, a second into its window. The values are the venue probe's real readings
/// from the Rhea pool (DECISIONS.md 6b); the sandbox has no mainnet, so here they are fixtures.
pub fn observation(
    agreement: &AccountId,
    executing_at: u64,
    period: u32,
    slot: u8,
    spread: u32,
) -> Observation {
    let start = executing_at + ATLAS_PERIOD_SECS * u64::from(period);
    let (window_start, _) = accord_core::atlas::slot_window(start, ATLAS_PERIOD_SECS, 6, slot);
    Observation {
        agreement: agreement.to_string(),
        period,
        slot,
        slot_time: window_start + 1,
        venue: venue(),
        band_bps: 200,
        venue_block: BlockRef {
            height: 180_000_000 + u64::from(slot),
            hash: "mock".into(),
            time: window_start + 2,
        },
        mid: "2.104".into(),
        spread_bps: spread,
        depth_bid: 392_000_000,
        depth_ask: 2_020_000_000,
        two_sided: true,
    }
}

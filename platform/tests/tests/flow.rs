// Helpers that must succeed already return an error on failure; their results are often not needed.
#![allow(unused_must_use)]
//! Sandbox suite (PROGRESS 1.13): the critical paths against the real contracts on a local node.

use accord_sandbox::*;
use anyhow::Result;
use near_workspaces::types::NearToken;
use serde_json::json;

const ITEM: u128 = 12_000_000;

/// The key no longer exists on the account: the transaction never reaches the contract. The client sees it when it
/// fetches the key's nonce ("does not exist while viewing") or the node rejects it (`AccessKeyDoesNotExist`).
fn assert_rejected_by_network<T: std::fmt::Debug>(r: anyhow::Result<T>) {
    let text = format!("{r:?}");
    assert!(r.is_err(), "the call went through: {text}");
    assert!(
        text.contains("does not exist")
            || text.contains("AccessKeyDoesNotExist")
            || text.contains("AccessKeyNotFound"),
        "{text}"
    );
}

/// Creation, negotiation, approval, funding, recipient, delivery, payment; the account never holds a full-access
/// key (I9) and its code stays the release's (I10).
#[tokio::test]
async fn procurement_flow_pays_the_authorised_recipient() -> Result<()> {
    let env = Env::new().await?;
    let params = demo_params();
    let deal = env.create("procurement", &params).await?;
    assert_eq!(deal.keys().await?, 0, "a new agreement account has no keys");
    let code = format!(
        "{:?}",
        env.worker.view_account(&deal.id).await?.contract_state
    );
    deal.to_executing(&procurement_terms(env.token.id(), &params))
        .await?;
    let r = deal.fund(40_000_000).await?;
    assert_eq!(events(&r, "funded")[0]["amount"], "36000000");
    assert_eq!(
        env.balance(env.buyer.id()).await?,
        4_000_000,
        "the excess came back"
    );
    deal.authorise(env.recipient.id()).await?;
    let agent = deal.install_agent().await?;
    let keys = env.worker.view_access_keys(&deal.id).await?;
    assert_eq!(keys.len(), 1);
    assert!(format!("{:?}", keys[0].access_key.permission).contains("FunctionCall"));
    deal.deliver_and_accept(1).await?;
    let r = deal.pay(&agent, 1, ITEM, env.recipient.id()).await?;
    assert_eq!(act_outcome(&r)?, "sent");
    assert!(
        r.total_gas_burnt.as_tgas() < 50,
        "a paying act burns under 50 TGas: {}",
        r.total_gas_burnt.as_tgas()
    );
    assert_eq!(env.balance(env.recipient.id()).await?, ITEM);
    let receipts = deal.view("get_receipts", json!({})).await?;
    assert_eq!(receipts.as_array().unwrap().len(), 1);
    assert_eq!(
        format!(
            "{:?}",
            env.worker.view_account(&deal.id).await?.contract_state
        ),
        code
    );
    let stats = env
        .worker
        .view(env.factory.id(), "recipient_stats")
        .args_json(json!({"account": env.recipient.id(), "buyer": env.buyer.id()}))
        .await?
        .json::<serde_json::Value>()?;
    assert_eq!(stats["buyer"]["payments"], 1);
    Ok(())
}

/// `make attack` on the sandbox: redirect and altered amount refused, the canary revokes and deletes the key, the
/// network then rejects the agent, and no USDC moved.
#[tokio::test]
async fn attack_is_refused_and_the_canary_ends_the_key() -> Result<()> {
    let env = Env::new().await?;
    let params = demo_params();
    let deal = env.create("procurement", &params).await?;
    deal.to_executing(&procurement_terms(env.token.id(), &params))
        .await?;
    deal.fund(36_000_000).await?;
    deal.authorise(env.recipient.id()).await?;
    let agent = deal.install_agent().await?;
    deal.deliver_and_accept(1).await?;
    let before = env.balance(&deal.id).await?;

    let r = deal.pay(&agent, 1, ITEM, env.attacker.id()).await?;
    assert_eq!(act_outcome(&r)?, "ERR_PAYEE_MISMATCH");
    assert!(
        r.total_gas_burnt.as_tgas() < 15,
        "a refused act burns under 15 TGas: {}",
        r.total_gas_burnt.as_tgas()
    );
    let reports = env
        .worker
        .view(env.factory.id(), "reports")
        .args_json(json!({"account": env.attacker.id()}))
        .await?
        .json::<serde_json::Value>()?;
    assert_eq!(
        reports.as_array().unwrap().len(),
        1,
        "the refusal is reported to the factory as evidence"
    );

    assert_eq!(
        act_outcome(&deal.pay(&agent, 1, 19_000_000, env.recipient.id()).await?)?,
        "ERR_AMOUNT_MISMATCH"
    );
    let r = deal.pay(&agent, 1, ITEM, env.canaries[1].id()).await?;
    assert_eq!(act_outcome(&r)?, "ERR_CANARY");
    assert_eq!(events(&r, "agent_key_revoked")[0]["reason"], "canary");
    assert_eq!(
        deal.keys().await?,
        0,
        "the canary deleted the key in the same transaction (I5)"
    );
    assert_rejected_by_network(deal.pay(&agent, 1, ITEM, env.recipient.id()).await);
    assert_eq!(
        env.balance(&deal.id).await?,
        before,
        "0 USDC moved by attempts"
    );
    assert_eq!(
        deal.view("get_refusals", json!({}))
            .await?
            .as_array()
            .unwrap()
            .len(),
        3
    );
    Ok(())
}

/// `make revoke` on the sandbox: one transaction deletes the key, the network rejects the agent, and only the
/// buyer's new key restores service.
#[tokio::test]
async fn revoke_deletes_the_key_and_only_the_buyer_restores_service() -> Result<()> {
    let env = Env::new().await?;
    let params = demo_params();
    let deal = env.create("procurement", &params).await?;
    deal.to_executing(&procurement_terms(env.token.id(), &params))
        .await?;
    deal.fund(36_000_000).await?;
    deal.authorise(env.recipient.id()).await?;
    let agent = deal.install_agent().await?;
    deal.deliver_and_accept(1).await?;
    let r = deal.must(&env.buyer, "revoke_agent", json!({})).await?;
    assert_eq!(events(&r, "agent_key_revoked")[0]["reason"], "buyer");
    assert_eq!(deal.keys().await?, 0);
    assert_rejected_by_network(deal.pay(&agent, 1, ITEM, env.recipient.id()).await);
    // The vendor cannot install a key; the buyer can.
    let r = deal
        .call(
            &env.vendor,
            "install_agent_key",
            json!({
                "public_key": pubkey([44; 32]), "allowance": "500000000000000000000000",
            }),
        )
        .await?;
    assert!(failure(&r).contains("ERR_NOT_BUYER"));
    let agent2 = deal.install_agent().await?;
    assert_eq!(
        act_outcome(&deal.pay(&agent2, 1, ITEM, env.recipient.id()).await?)?,
        "sent"
    );
    Ok(())
}

/// I14: after a revoke the vendor still claims an eligible item once the claim delay has passed.
#[tokio::test]
async fn the_vendor_claims_after_revoke() -> Result<()> {
    let env = Env::new().await?;
    let params = demo_params();
    let deal = env.create("procurement", &params).await?;
    deal.to_executing(&procurement_terms(env.token.id(), &params))
        .await?;
    deal.fund(36_000_000).await?;
    deal.authorise(env.recipient.id()).await?;
    deal.install_agent().await?;
    deal.deliver_and_accept(1).await?;
    deal.must(&env.buyer, "revoke_agent", json!({})).await?;
    let r = deal.must(&env.vendor, "claim", json!({"item": 1})).await?;
    assert_eq!(act_outcome(&r)?, "ERR_NOT_DUE");
    env.wait_until(env.now().await? + params.claim_delay_secs + 2)
        .await?;
    let r = deal.must(&env.vendor, "claim", json!({"item": 1})).await?;
    assert_eq!(act_outcome(&r)?, "sent");
    assert_eq!(env.balance(env.recipient.id()).await?, ITEM);
    Ok(())
}

/// I4: a transfer to a recipient no longer registered with the token fails in the token; the lock clears and the
/// USDC stays in escrow.
#[tokio::test]
async fn a_failed_transfer_clears_the_lock_and_keeps_the_escrow() -> Result<()> {
    let env = Env::new().await?;
    let params = demo_params();
    let deal = env.create("procurement", &params).await?;
    deal.to_executing(&procurement_terms(env.token.id(), &params))
        .await?;
    deal.fund(36_000_000).await?;
    deal.authorise(env.recipient.id()).await?;
    let agent = deal.install_agent().await?;
    deal.deliver_and_accept(1).await?;
    near_workspaces::result::ExecutionFinalResult::is_success(
        &env.recipient
            .call(env.token.id(), "storage_unregister")
            .args_json(json!({"force": true}))
            .deposit(NearToken::from_yoctonear(1))
            .transact()
            .await?,
    );
    let r = deal.pay(&agent, 1, ITEM, env.recipient.id()).await?;
    assert_eq!(act_outcome(&r)?, "failed");
    let a = deal.get().await?;
    assert!(a["in_flight"].is_null());
    assert_eq!(a["paid"], "0");
    assert_eq!(env.balance(&deal.id).await?, 36_000_000);
    Ok(())
}

/// I17: close after the term with no recipient sets the eligible item aside, refunds the rest of the real balance
/// (a stray deposit too), and the vendor claims the reserved item after `Settled`. A delivery after the end is
/// refused.
#[tokio::test]
async fn close_reserves_refunds_and_the_reserved_item_stays_claimable() -> Result<()> {
    let env = Env::new().await?;
    let params = demo_params();
    let deal = env.create("procurement", &params).await?;
    deal.to_executing(&procurement_terms(env.token.id(), &params))
        .await?;
    deal.fund(36_000_000).await?;
    deal.deliver_and_accept(1).await?;
    // A plain transfer the contract is never told about.
    env.mint(env.attacker.id(), 1_000_000).await?;
    ok(env
        .attacker
        .call(env.token.id(), "ft_transfer")
        .args_json(json!({"receiver_id": deal.id, "amount": "1000000"}))
        .deposit(NearToken::from_yoctonear(1))
        .transact()
        .await?)?;
    let r = deal.call(&env.keeper, "close", json!({})).await?;
    assert!(failure(&r).contains("ERR_TOO_EARLY"));
    let a = deal.get().await?;
    let end = a["ends_at"].as_u64().unwrap() + params.grace_secs;
    env.wait_until(end + 1).await?;
    let r = deal
        .call(
            &env.vendor,
            "submit_delivery",
            json!({"item": 2, "evidence_hash": "ee".repeat(32), "uri": "x"}),
        )
        .await?;
    assert!(failure(&r).contains("ERR_DELIVERY_CLOSED"));
    let step: serde_json::Value = deal.must(&env.keeper, "close", json!({})).await?.json()?;
    assert_eq!(step, json!({"Reserved": {"item": 1}}));
    let step: serde_json::Value = deal.must(&env.keeper, "close", json!({})).await?.json()?;
    assert_eq!(step, json!("Settling"));
    let a = deal.get().await?;
    assert_eq!(a["state"], "Settled");
    assert_eq!(
        env.balance(env.buyer.id()).await?,
        24_000_000 + 1_000_000,
        "refund includes the stray deposit"
    );
    assert_eq!(env.balance(&deal.id).await?, ITEM);
    deal.authorise(env.recipient.id()).await?;
    env.wait_until(env.now().await? + params.claim_delay_secs + 2)
        .await?;
    assert_eq!(
        act_outcome(&deal.must(&env.vendor, "claim", json!({"item": 1})).await?)?,
        "sent"
    );
    assert_eq!(env.balance(env.recipient.id()).await?, ITEM);
    Ok(())
}

/// I11: forged, replayed and cross-agreement Sealed Table outputs are refused; three failures end in `NoDeal`.
#[tokio::test]
async fn forged_and_replayed_sealed_outputs_are_refused() -> Result<()> {
    let env = Env::new().await?;
    let params = demo_params();
    let a = env.create("procurement", &params).await?;
    let b = env.create("procurement", &params).await?;
    a.commit_both().await?;
    b.commit_both().await?;
    let terms = procurement_terms(env.token.id(), &params);
    // Cross-agreement: b's valid output submitted to a.
    a.must(&env.keeper, "start_negotiation", json!({})).await?;
    b.must(&env.keeper, "start_negotiation", json!({})).await?;
    let for_b = b.sealed_output(&b.nonce().await?, &terms);
    a.must(
        &env.keeper,
        "submit_mock_negotiation",
        json!({"output": for_b.to_string()}),
    )
    .await?;
    assert_eq!(a.get().await?["negotiation"]["Ready"]["attempts"], 1);
    // Forged: signed by another key.
    a.must(&env.keeper, "start_negotiation", json!({})).await?;
    let mut forged = a.sealed_output(&a.nonce().await?, &terms);
    forged = sign([99; 32], forged);
    a.must(
        &env.keeper,
        "submit_mock_negotiation",
        json!({"output": forged.to_string()}),
    )
    .await?;
    // Replayed: an output for another nonce.
    a.must(&env.keeper, "start_negotiation", json!({})).await?;
    let replay = a.sealed_output(&"00".repeat(32), &terms);
    a.must(
        &env.keeper,
        "submit_mock_negotiation",
        json!({"output": replay.to_string()}),
    )
    .await?;
    let st = a.get().await?;
    assert_eq!(st["state"], "NoDeal");
    // b's own output is still good for b.
    b.must(
        &env.keeper,
        "submit_mock_negotiation",
        json!({"output": for_b.to_string()}),
    )
    .await?;
    assert_eq!(b.get().await?["state"], "Attested");
    // Underfunded start is refused (I12).
    let c = env.create("procurement", &params).await?;
    c.commit_both().await?;
    let r = env
        .keeper
        .call(&c.id, "start_negotiation")
        .args_json(json!({}))
        .gas(tgas(100))
        .transact()
        .await?;
    assert!(failure(&r).contains("ERR_LOW_GAS"));
    Ok(())
}

/// Market making: six observations, four passing, the period closes `Eligible` and the agent pays; a conflicting
/// observation is logged and never stored (I18); the stricter agreement's period is `Withheld`.
#[tokio::test]
async fn atlas_period_eligible_then_paid_and_strict_withheld() -> Result<()> {
    let env = Env::new().await?;
    let params = demo_params();
    let deal = env.create("market-making", &params).await?;
    deal.to_executing(&market_making_terms(env.token.id(), &params, 60))
        .await?;
    deal.fund(12_000_000).await?;
    deal.authorise(env.recipient.id()).await?;
    let agent = deal.install_agent().await?;
    let at = deal.get().await?["executing_at"].as_u64().unwrap();
    for (slot, spread) in [(0u8, 41), (1, 49), (2, 52), (3, 72), (4, 41), (5, 90)] {
        let o = observation(&deal.id, at, 0, slot, spread);
        let sig = deal.sign_observation(&o);
        let r = deal
            .must(
                &env.keeper,
                "record_observation",
                json!({"observation": o, "sig": sig}),
            )
            .await?;
        assert_eq!(events(&r, "observation_recorded").len(), 1);
    }
    let mut other = observation(&deal.id, at, 0, 2, 52);
    other.spread_bps = 51;
    let sig = deal.sign_observation(&other);
    let r = deal
        .must(
            &env.keeper,
            "record_observation",
            json!({"observation": other, "sig": sig}),
        )
        .await?;
    assert_eq!(events(&r, "observation_conflict").len(), 1);
    // Period 1 (index 1) is clean; the conflict sends period 0 to Review.
    for slot in 0..6u8 {
        let o = observation(&deal.id, at, 1, slot, 41);
        let sig = deal.sign_observation(&o);
        deal.must(
            &env.keeper,
            "record_observation",
            json!({"observation": o, "sig": sig}),
        )
        .await?;
    }
    env.wait_until(at + 2 * ATLAS_PERIOD_SECS + params.observation_grace_secs + 1)
        .await?;
    let r = deal
        .must(&env.keeper, "close_period", json!({"period": 0}))
        .await?;
    assert_eq!(events(&r, "period_closed")[0]["outcome"], "Review");
    let r = deal
        .must(&env.keeper, "close_period", json!({"period": 1}))
        .await?;
    let closed = &events(&r, "period_closed")[0];
    assert_eq!(closed["outcome"], "Eligible");
    assert_eq!(closed["passed"], 6);
    assert_eq!(
        act_outcome(&deal.pay(&agent, 1, 6_000_000, env.recipient.id()).await?)?,
        "ERR_PERIOD_WITHHELD"
    );
    assert_eq!(
        act_outcome(&deal.pay(&agent, 2, 6_000_000, env.recipient.id()).await?)?,
        "sent"
    );

    let strict = env.create("market-making", &params).await?;
    strict
        .to_executing(&market_making_terms(env.token.id(), &params, 30))
        .await?;
    let at = strict.get().await?["executing_at"].as_u64().unwrap();
    for slot in 0..6u8 {
        let o = observation(&strict.id, at, 0, slot, 41 + u32::from(slot));
        let sig = strict.sign_observation(&o);
        strict
            .must(
                &env.keeper,
                "record_observation",
                json!({"observation": o, "sig": sig}),
            )
            .await?;
    }
    env.wait_until(at + ATLAS_PERIOD_SECS + params.observation_grace_secs + 1)
        .await?;
    let r = strict
        .must(&env.keeper, "close_period", json!({"period": 0}))
        .await?;
    assert_eq!(events(&r, "period_closed")[0]["outcome"], "Withheld");
    Ok(())
}

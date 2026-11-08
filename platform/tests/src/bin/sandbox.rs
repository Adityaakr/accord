#![allow(unused_must_use)]
//! `make sandbox`: the full procurement flow and one Accord Atlas period on a local NEAR sandbox. The three jobs are
//! replaced by the mock signer, and every mocked step is marked `[mock]`. Ends with `sandbox: all checks passed`.

use accord_sandbox::*;
use anyhow::{ensure, Result};
use serde_json::json;
use std::time::Instant;

const ITEM: u128 = 12_000_000;

fn usdc(base: u128) -> String {
    format!("{}.{:02}", base / 1_000_000, (base % 1_000_000) / 10_000)
}

#[tokio::main]
async fn main() -> Result<()> {
    let started = Instant::now();
    println!("accord sandbox · local NEAR node · demo timings");
    let env = Env::new().await?;
    println!("  setup     tUSDC (test token, 6 decimals) · factory {} · release 1 (embedded, mock build)", env.factory.id());
    let params = demo_params();

    // Procurement.
    let deal = env.create("procurement", &params).await?;
    ensure!(deal.keys().await? == 0, "a new agreement holds no key");
    println!(
        "  created   {} · procurement · 0 keys on the account",
        deal.id
    );
    deal.commit_both().await?;
    println!("  sealed    both mandates committed (ciphertexts on chain)");
    deal.must(&env.keeper, "start_negotiation", json!({}))
        .await?;
    let terms = procurement_terms(env.token.id(), &params);
    let out = deal.sealed_output(&deal.nonce().await?, &terms);
    deal.must(
        &env.keeper,
        "submit_mock_negotiation",
        json!({"output": out.to_string()}),
    )
    .await?;
    let a = deal.get().await?;
    ensure!(a["state"] == "Attested", "terms accepted");
    println!("  [mock]    sealed-table output signed by the mock key · signature ok on chain · state Attested");
    let hash = a["terms_hash"].as_str().unwrap().to_string();
    for who in [&env.buyer, &env.vendor] {
        deal.must(who, "approve_terms", json!({"terms_hash": hash}))
            .await?;
    }
    deal.fund(36_000_000).await?;
    println!(
        "  executing approved by both · terms {}… · funded {} tUSDC",
        &hash[..8],
        usdc(36_000_000)
    );
    deal.authorise(env.recipient.id()).await?;
    println!("  [mock]    payee proof signed by the mock key · authority approved · buyer accepted · {} active", env.recipient.id());
    let agent = deal.install_agent().await?;
    println!(
        "  agent     1 key · FunctionCall · receiver {} · methods [act]",
        deal.id
    );
    deal.deliver_and_accept(1).await?;
    println!("  delivery  item 1 submitted · accepted");
    let r = deal.pay(&agent, 1, ITEM, env.recipient.id()).await?;
    ensure!(act_outcome(&r)? == "sent", "item 1 paid");
    ensure!(
        env.balance(env.recipient.id()).await? == ITEM,
        "recipient received item 1"
    );
    println!(
        "  paid      item 1 · {} tUSDC → {} · {} TGas",
        usdc(ITEM),
        env.recipient.id(),
        r.total_gas_burnt.as_tgas()
    );
    let before = env.balance(&deal.id).await?;
    deal.deliver_and_accept(2).await?;
    for (to, amount, expected) in [
        (env.attacker.id(), ITEM, "ERR_PAYEE_MISMATCH"),
        (env.recipient.id(), 19_000_000, "ERR_AMOUNT_MISMATCH"),
        (env.canaries[1].id(), ITEM, "ERR_CANARY"),
    ] {
        let r = deal.pay(&agent, 2, amount, to).await?;
        let code = act_outcome(&r)?;
        ensure!(code == expected, "expected {expected}, got {code}");
        println!("  refused   {code} · {} tUSDC → {to}", usdc(amount));
    }
    ensure!(deal.keys().await? == 0, "the canary deleted the key");
    let rejected = deal.pay(&agent, 2, ITEM, env.recipient.id()).await;
    ensure!(rejected.is_err(), "the network rejects the revoked key");
    println!("  agent     next call rejected by the network: the key no longer exists · 0 keys on the account");
    ensure!(
        env.balance(&deal.id).await? == before,
        "no USDC moved by the attempts"
    );
    println!(
        "  escrow    {} tUSDC before · {} tUSDC after · 0 tUSDC moved by attempts",
        usdc(before),
        usdc(before)
    );
    let agent2 = deal.install_agent().await?;
    ensure!(
        act_outcome(&deal.pay(&agent2, 2, ITEM, env.recipient.id()).await?)? == "sent",
        "new key pays"
    );
    println!("  resume    buyer installs a new key · item 2 paid");

    // Accord Atlas: one period.
    let mm = env.create("market-making", &params).await?;
    mm.to_executing(&market_making_terms(env.token.id(), &params, 60))
        .await?;
    mm.fund(12_000_000).await?;
    mm.authorise(env.recipient.id()).await?;
    let mm_agent = mm.install_agent().await?;
    let at = mm.get().await?["executing_at"].as_u64().unwrap();
    println!("  atlas     {} · market-making · rhea-dcl 17208628… · 6 slots · threshold 4 · max spread 60 bps", mm.id);
    for (slot, spread) in [(0u8, 41), (1, 49), (2, 52), (3, 72), (4, 41), (5, 90)] {
        let o = observation(&mm.id, at, 0, slot, spread);
        let sig = mm.sign_observation(&o);
        let r = mm
            .must(
                &env.keeper,
                "record_observation",
                json!({"observation": o, "sig": sig}),
            )
            .await?;
        let pass = events(&r, "observation_recorded")[0]["pass"]
            .as_bool()
            .unwrap();
        println!(
            "  [mock]    slot {} · spread {spread} bps · depth {} / {} USDC · {}",
            slot + 1,
            usdc(o.depth_bid),
            usdc(o.depth_ask),
            if pass { "pass" } else { "fail" }
        );
    }
    env.wait_until(at + ATLAS_PERIOD_SECS + params.observation_grace_secs + 1)
        .await?;
    let r = mm
        .must(&env.keeper, "close_period", json!({"period": 0}))
        .await?;
    let c = &events(&r, "period_closed")[0];
    ensure!(c["outcome"] == "Eligible", "period 1 eligible");
    println!(
        "  closed    {} of 6 passed · threshold 4 · uptime {}% · {}",
        c["passed"],
        c["uptime_bps"].as_u64().unwrap() / 100,
        c["outcome"].as_str().unwrap()
    );
    ensure!(
        act_outcome(&mm.pay(&mm_agent, 1, 6_000_000, env.recipient.id()).await?)? == "sent",
        "period 1 paid"
    );
    println!(
        "  paid      agent pays period 1 · {} tUSDC → {}",
        usdc(6_000_000),
        env.recipient.id()
    );
    println!("  scope     venue-level liquidity, not the market maker's own orders");
    println!(
        "sandbox: all checks passed · {:.0} s",
        started.elapsed().as_secs_f64()
    );
    Ok(())
}

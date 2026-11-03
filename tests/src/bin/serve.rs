#![allow(unused_must_use)]
//! `make serve`: a local NEAR sandbox that stays up, seeded with one agreement in each state, for developing and
//! screenshotting the app without testnet. Jobs are the mock signer, as in `make sandbox`; the app labels every
//! screen `local sandbox`. Writes the connection details (and the sandbox-only keys) to target/sandbox/env.json.

use accord_sandbox::*;
use anyhow::Result;
use serde_json::json;

const ITEM: u128 = 12_000_000;

#[tokio::main]
async fn main() -> Result<()> {
    let env = Env::new().await?;
    let params = demo_params();
    let mut rooms = Vec::new();

    // Sealed: both mandates in, waiting for the negotiation.
    let sealed = env.create("procurement", &params).await?;
    sealed.commit_both().await?;
    rooms.push(("Sealed", sealed.id.clone()));

    // Attested: terms signed, waiting for both approvals.
    let attested = env.create("procurement", &params).await?;
    attested.commit_both().await?;
    attested
        .must(&env.keeper, "start_negotiation", json!({}))
        .await?;
    let out = attested.sealed_output(
        &attested.nonce().await?,
        &procurement_terms(env.token.id(), &params),
    );
    attested
        .must(
            &env.keeper,
            "submit_mock_negotiation",
            json!({"output": out.to_string()}),
        )
        .await?;
    attested
        .must(
            &env.buyer,
            "approve_terms",
            json!({"terms_hash": attested.get().await?["terms_hash"]}),
        )
        .await?;
    rooms.push(("Attested", attested.id.clone()));

    // Executing: funded, recipient active, one payment, the attack refused, an item delivered, an exception pending.
    let live = env.create("procurement", &params).await?;
    live.to_executing(&procurement_terms(env.token.id(), &params))
        .await?;
    live.fund(36_000_000).await?;
    live.authorise(env.recipient.id()).await?;
    let agent = live.install_agent().await?;
    live.deliver_and_accept(1).await?;
    live.pay(&agent, 1, ITEM, env.recipient.id()).await?;
    live.pay(&agent, 2, ITEM, env.attacker.id()).await?;
    live.pay(&agent, 2, 19_000_000, env.recipient.id()).await?;
    live.must(&env.vendor, "submit_delivery", json!({
        "item": 2, "evidence_hash": "ab".repeat(32), "uri": format!("https://{DOMAIN}/deliveries/2"),
    })).await?;
    live.must(&env.vendor, "request_exception", json!({
        "item": 3, "amount": "9000000", "waive_evidence": false, "reason": "Handover scope reduced by agreement",
    })).await?;
    rooms.push(("Executing", live.id.clone()));

    // Revoked by the canary: the agent's key is gone.
    let tripped = env.create("procurement", &params).await?;
    tripped
        .to_executing(&procurement_terms(env.token.id(), &params))
        .await?;
    tripped.fund(36_000_000).await?;
    tripped.authorise(env.recipient.id()).await?;
    let a2 = tripped.install_agent().await?;
    tripped.deliver_and_accept(1).await?;
    tripped.pay(&a2, 1, ITEM, env.canaries[1].id()).await?;
    rooms.push(("Executing, key revoked", tripped.id.clone()));

    // Accord Atlas: one period observed and closed Eligible, then paid.
    let mm = env.create("market-making", &params).await?;
    mm.to_executing(&market_making_terms(env.token.id(), &params, 60))
        .await?;
    mm.fund(12_000_000).await?;
    mm.authorise(env.recipient.id()).await?;
    let a3 = mm.install_agent().await?;
    let at = mm.get().await?["executing_at"].as_u64().unwrap();
    for (slot, spread) in [(0u8, 41), (1, 49), (2, 52), (3, 72), (4, 41), (5, 90)] {
        let o = observation(&mm.id, at, 0, slot, spread);
        let sig = mm.sign_observation(&o);
        mm.must(
            &env.keeper,
            "record_observation",
            json!({"observation": o, "sig": sig}),
        )
        .await?;
    }
    for slot in 0..3u8 {
        let o = observation(&mm.id, at, 1, slot, 44 + u32::from(slot));
        let sig = mm.sign_observation(&o);
        mm.must(
            &env.keeper,
            "record_observation",
            json!({"observation": o, "sig": sig}),
        )
        .await?;
    }
    env.wait_until(at + ATLAS_PERIOD_SECS + params.observation_grace_secs + 1)
        .await?;
    mm.must(&env.keeper, "close_period", json!({"period": 0}))
        .await?;
    mm.pay(&a3, 1, 6_000_000, env.recipient.id()).await?;
    rooms.push(("Accord Atlas", mm.id.clone()));

    // Settled: paid what was earned, refunded the rest.
    let done = env.create("procurement", &params).await?;
    done.to_executing(&procurement_terms(env.token.id(), &params))
        .await?;
    done.fund(36_000_000).await?;
    done.authorise(env.recipient.id()).await?;
    let a4 = done.install_agent().await?;
    done.deliver_and_accept(1).await?;
    done.pay(&a4, 1, ITEM, env.recipient.id()).await?;
    let end = done.get().await?["ends_at"].as_u64().unwrap() + params.grace_secs;
    env.wait_until(end + 1).await?;
    done.must(&env.keeper, "close", json!({})).await?;
    rooms.push(("Settled", done.id.clone()));

    let key = |a: &near_workspaces::Account| json!({"account": a.id(), "key": a.secret_key().to_string()});
    let info = json!({
        "network": "sandbox",
        "rpc": env.worker.rpc_addr(),
        "factory": env.factory.id(),
        "token": env.token.id(),
        "rooms": rooms.iter().map(|(s, id)| json!({"state": s, "agreement": id})).collect::<Vec<_>>(),
        "principals": {
            "buyer": key(&env.buyer), "vendor": key(&env.vendor), "authority": key(&env.authority),
            "keeper": key(&env.keeper),
        },
        "agent": {"agreement": live.id, "key": agent.secret_key().to_string()},
        "recipient": env.recipient.id(),
        "attacker": env.attacker.id(),
        "canaries": env.canaries.iter().map(|c| c.id().to_string()).collect::<Vec<_>>(),
    });
    let dir = format!("{}/../target/sandbox", env!("CARGO_MANIFEST_DIR"));
    std::fs::create_dir_all(&dir)?;
    std::fs::write(
        format!("{dir}/env.json"),
        serde_json::to_string_pretty(&info)?,
    )?;
    println!("accord serve · local sandbox · {}", env.worker.rpc_addr());
    println!("  factory   {}", env.factory.id());
    for (state, id) in &rooms {
        println!("  {:<22} {id}", state);
    }
    println!("  env       target/sandbox/env.json (sandbox-only keys)");
    println!("serving · Ctrl-C to stop");
    tokio::signal::ctrl_c().await?;
    Ok(())
}

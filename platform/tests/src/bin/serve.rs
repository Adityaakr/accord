#![allow(unused_must_use)]
//! `make serve`: a local NEAR node that stays up, with the services that stand in for testnet around it: the
//! local OutLayer (the real job code, the model replaced by a deterministic negotiator; `localjobs.rs`), a test
//! USDC faucet and an account faucet (`localnet.rs`). It seeds agreements in each state through the same path a
//! user takes: real mandates sealed to the Sealed Table's key, negotiated by the local job, a recipient proven by
//! the Payee job, payments from an agent key. The two market-making agreements are funded and left running: the
//! keeper (`make dev`) records real mainnet observations into them as their hidden slot times pass.
//! Writes the connection details and the local-only keys to target/sandbox/env.json.

use accord_sandbox::localjobs::{LocalHttp, LocalJobs};
use accord_sandbox::localnet::{deliver_jobs, serve_http, JOBS_ADDR};
use accord_sandbox::*;
use anyhow::{bail, Result};
use near_workspaces::Account;
use serde_json::json;
use std::collections::BTreeMap;
use std::sync::Arc;

const ITEM: u128 = 12_000_000;

/// Sealed, negotiated by the local Sealed Table: `Attested`, or `NoDeal` if the mandates do not meet.
async fn negotiated<'a>(
    env: &'a Env,
    kind: &str,
    title: &str,
    buyer: &str,
    vendor: &str,
) -> Result<Deal<'a>> {
    let deal = env.create_titled(kind, title, &demo_params()).await?;
    deal.seal(&env.buyer, "buyer", &company_mandate(buyer)?)
        .await?;
    deal.seal(&env.vendor, "vendor", &company_mandate(vendor)?)
        .await?;
    deal.must(&env.keeper, "start_negotiation", json!({}))
        .await?;
    deal.wait_for("the negotiation", 90, |a| a["state"] != "Sealed")
        .await?;
    Ok(deal)
}

/// Both parties approve the negotiated terms: `Executing`.
async fn approved(deal: &Deal<'_>) -> Result<()> {
    let a = deal.get().await?;
    if a["state"] != "Attested" {
        bail!("{}: {} after negotiation", deal.id, a["state"]);
    }
    for who in [&deal.env.buyer, &deal.env.vendor] {
        deal.must(who, "approve_terms", json!({"terms_hash": a["terms_hash"]}))
            .await?;
    }
    Ok(())
}

/// Proposed by the vendor, proven by the local Payee job from the domain file, approved and accepted.
async fn authorised(deal: &Deal<'_>, account: &Account) -> Result<()> {
    let e = deal.env;
    let r = deal
        .must(
            &e.vendor,
            "propose_recipient",
            json!({"account": account.id(), "domain": DOMAIN}),
        )
        .await?;
    let v: u32 = r.json()?;
    let start = std::time::Instant::now();
    loop {
        let rs = deal.view("get_recipients", json!({})).await?;
        match rs[v as usize - 1]["status"].as_str() {
            Some("Proven") => break,
            Some("ProofFailed") => bail!(
                "{}: the payee proof failed: {}",
                deal.id,
                rs[v as usize - 1]
            ),
            _ if start.elapsed().as_secs() > 60 => bail!("{}: no payee proof after 60 s", deal.id),
            _ => tokio::time::sleep(std::time::Duration::from_millis(500)).await,
        }
    }
    deal.must(&e.authority, "approve_recipient", json!({"version": v}))
        .await?;
    deal.must(
        &e.buyer,
        "accept_recipient",
        json!({"version": v, "acknowledge_warnings": false}),
    )
    .await?;
    Ok(())
}

async fn total(deal: &Deal<'_>) -> Result<u128> {
    Ok(deal.view("get_terms", json!({})).await?["total"]
        .as_str()
        .unwrap_or("0")
        .parse()?)
}

#[tokio::main]
async fn main() -> Result<()> {
    let env = Arc::new(Env::new().await?);
    // A second account the vendor's domain lists, for `make payee-change`.
    let second = env
        .root
        .create_subaccount("halcyon-ops")
        .initial_balance(near_workspaces::types::NearToken::from_near(5))
        .transact()
        .await?
        .into_result()?;
    // The /try room's own fictional principals (ARCHITECTURE.md 11); its pair is the domain file's third entry.
    let mut try_accounts = Vec::new();
    for (name, near) in [
        ("northwind-try", 60),
        ("halcyon-try", 10),
        ("halcyon-try-auth", 5),
        ("halcyon-try-mm", 5),
    ] {
        let a = env
            .root
            .create_subaccount(name)
            .initial_balance(near_workspaces::types::NearToken::from_near(near))
            .transact()
            .await?
            .into_result()?;
        try_accounts.push(a);
    }
    let file = domain_file(&[
        (env.recipient.id(), env.authority.id()),
        (second.id(), env.authority.id()),
        (try_accounts[3].id(), try_accounts[2].id()),
    ]);
    let http = LocalHttp::new(
        &env.worker.rpc_addr(),
        BTreeMap::from([(DOMAIN.to_string(), file)]),
    );
    let jobs = Arc::new(LocalJobs::new(http));
    tokio::spawn(deliver_jobs(env.clone(), jobs.clone()));
    tokio::spawn(serve_http(env.clone(), jobs.clone()));
    let env: &Env = &env;
    let mut rooms: Vec<(&str, String)> = Vec::new();
    let mut agents: BTreeMap<String, String> = BTreeMap::new();

    // Waiting for the vendor: the buyer's mandate is sealed, the vendor's is not.
    let waiting = env
        .create_titled(
            "procurement",
            "Treasury dashboard integration",
            &demo_params(),
        )
        .await?;
    waiting
        .seal(
            &env.buyer,
            "buyer",
            &company_mandate("northwind/procurement.buyer.json")?,
        )
        .await?;
    rooms.push(("Sealing", waiting.id.to_string()));

    // Attested: terms signed by the Sealed Table; the buyer approved, the vendor has not yet.
    let attested = negotiated(
        env,
        "procurement",
        "Reporting pipeline, phase two",
        "northwind/procurement.buyer.json",
        "halcyon/procurement.vendor.json",
    )
    .await?;
    let a = attested.get().await?;
    attested
        .must(
            &env.buyer,
            "approve_terms",
            json!({"terms_hash": a["terms_hash"]}),
        )
        .await?;
    rooms.push(("Attested", attested.id.to_string()));

    // Executing: funded, recipient active, one payment, two attacks refused, a delivery waiting, an exception.
    let live = negotiated(
        env,
        "procurement",
        "Liquidity reporting integration",
        "northwind/procurement.buyer.json",
        "halcyon/procurement.vendor.json",
    )
    .await?;
    approved(&live).await?;
    live.fund(total(&live).await?).await?;
    authorised(&live, &env.recipient).await?;
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
    agents.insert(live.id.to_string(), agent.secret_key().to_string());
    rooms.push(("Executing", live.id.to_string()));

    // Revoked by a canary: the agent paid toward a canary and its key is gone.
    let tripped = negotiated(
        env,
        "procurement",
        "Market data feed",
        "northwind/procurement.buyer.json",
        "halcyon/procurement.vendor.json",
    )
    .await?;
    approved(&tripped).await?;
    tripped.fund(total(&tripped).await?).await?;
    authorised(&tripped, &env.recipient).await?;
    let a2 = tripped.install_agent().await?;
    tripped.deliver_and_accept(1).await?;
    tripped.pay(&a2, 1, ITEM, env.canaries[1].id()).await?;
    rooms.push(("Executing, key revoked", tripped.id.to_string()));

    // Market making: two agreements on the real Rhea pool, observed live by the keeper.
    let mut atlas = Vec::new();
    for (title, buyer, vendor) in [
        (
            "NEAR/USDC liquidity",
            "northwind/market-making.buyer.json",
            "halcyon/market-making.vendor.json",
        ),
        (
            "NEAR/USDC liquidity, strict",
            "northwind/market-making.buyer.strict.json",
            "halcyon/market-making.vendor.strict.json",
        ),
    ] {
        let mm = negotiated(env, "market-making", title, buyer, vendor).await?;
        approved(&mm).await?;
        mm.fund(total(&mm).await?).await?;
        authorised(&mm, &env.recipient).await?;
        let key = mm.install_agent().await?;
        agents.insert(mm.id.to_string(), key.secret_key().to_string());
        atlas.push(mm.id.to_string());
        rooms.push(("Market making", mm.id.to_string()));
    }

    // Settled by mutual close: item 1 paid, the rest refunded to the buyer.
    let done = negotiated(
        env,
        "procurement",
        "Pool analytics pilot",
        "northwind/procurement.buyer.json",
        "halcyon/procurement.vendor.json",
    )
    .await?;
    approved(&done).await?;
    done.fund(total(&done).await?).await?;
    authorised(&done, &env.recipient).await?;
    let a4 = done.install_agent().await?;
    done.deliver_and_accept(1).await?;
    done.pay(&a4, 1, ITEM, env.recipient.id()).await?;
    done.must(&env.buyer, "mutual_close", json!({})).await?;
    done.must(&env.vendor, "mutual_close", json!({})).await?;
    done.wait_for("settlement", 30, |a| a["state"] == "Settled")
        .await?;
    rooms.push(("Settled", done.id.to_string()));

    let key = |a: &Account| json!({"account": a.id(), "key": a.secret_key().to_string()});
    let info = json!({
        "network": "sandbox",
        "rpc": env.worker.rpc_addr(),
        "factory": env.factory.id(),
        "token": env.token.id(),
        "jobs": format!("http://{JOBS_ADDR}"),
        "domain": DOMAIN,
        "rooms": rooms.iter().map(|(s, id)| json!({"state": s, "agreement": id})).collect::<Vec<_>>(),
        "atlas": atlas,
        "principals": {
            "buyer": key(&env.buyer), "vendor": key(&env.vendor), "authority": key(&env.authority),
            "keeper": key(&env.keeper), "recipient": key(&env.recipient),
        },
        "try": {
            "buyer": key(&try_accounts[0]), "vendor": key(&try_accounts[1]),
            "authority": key(&try_accounts[2]), "recipient": key(&try_accounts[3]),
        },
        "agent": {"agreement": live.id, "key": agent.secret_key().to_string()},
        "agents": agents,
        "recipient": env.recipient.id(),
        "second_recipient": second.id(),
        "attacker": env.attacker.id(),
        "canaries": env.canaries.iter().map(|c| c.id().to_string()).collect::<Vec<_>>(),
        "signers": {
            "sealed_table": LocalJobs::signs_as(Job::SealedTable),
            "payee": LocalJobs::signs_as(Job::Payee),
            "observer": LocalJobs::signs_as(Job::Observer),
        },
    });
    let dir = format!("{}/../target/sandbox", env!("CARGO_MANIFEST_DIR"));
    std::fs::create_dir_all(&dir)?;
    let file = format!("{dir}/env.json");
    std::fs::write(&file, serde_json::to_string_pretty(&info)?)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&file, std::fs::Permissions::from_mode(0o600))?;
    }
    println!("accord serve · local node · {}", env.worker.rpc_addr());
    println!("  factory   {}", env.factory.id());
    println!("  jobs      http://{JOBS_ADDR} · local OutLayer: real job code, model replaced, marked local");
    for (state, id) in &rooms {
        println!("  {state:<22} {id}");
    }
    println!("  env       target/sandbox/env.json (local-only keys)");
    println!("serving · Ctrl-C to stop");
    tokio::signal::ctrl_c().await?;
    Ok(())
}

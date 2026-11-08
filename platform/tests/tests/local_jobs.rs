// Helpers that must succeed already return an error on failure; their results are often not needed.
#![allow(unused_must_use)]
//! The local OutLayer (`localjobs.rs`): the real Sealed Table, Payee and observer code against a local node, with
//! only the model replaced. Mandates are sealed for real; the contract checks every output's signature.

use accord_sandbox::localjobs::{LocalHttp, LocalJobs};
use accord_sandbox::*;
use anyhow::Result;
use serde_json::{json, Value};
use std::collections::BTreeMap;
use std::sync::Arc;

fn jobs(env: &Env) -> Arc<LocalJobs> {
    let file = domain_file(&[(env.recipient.id(), env.authority.id())]);
    let files = BTreeMap::from([(DOMAIN.to_string(), file)]);
    Arc::new(LocalJobs::new(LocalHttp::new(
        &env.worker.rpc_addr(),
        files,
    )))
}

async fn blocking<T: Send + 'static>(f: impl FnOnce() -> T + Send + 'static) -> T {
    tokio::task::spawn_blocking(f).await.expect("job thread")
}

#[tokio::test]
async fn sealed_mandates_negotiate_to_terms_inside_both() -> Result<()> {
    let env = Env::new().await?;
    let jobs = jobs(&env);
    let deal = env.create("procurement", &demo_params()).await?;
    deal.seal(
        &env.buyer,
        "buyer",
        &company_mandate("northwind/procurement.buyer.json")?,
    )
    .await?;
    deal.seal(
        &env.vendor,
        "vendor",
        &company_mandate("halcyon/procurement.vendor.json")?,
    )
    .await?;
    deal.must(&env.keeper, "start_negotiation", json!({}))
        .await?;
    let nonce = deal.nonce().await?;

    let (j, id) = (jobs.clone(), deal.id.to_string());
    let out = blocking(move || j.negotiate(&id, &nonce)).await;
    assert_eq!(out["outcome"], "terms", "{out}");
    assert!(
        out["model"]["local"].is_string(),
        "the output says it is local: {}",
        out["model"]
    );
    assert_eq!(out["rounds"], 4);
    deal.must(
        &env.keeper,
        "submit_mock_negotiation",
        json!({"output": out.to_string()}),
    )
    .await?;

    let a = deal.get().await?;
    assert_eq!(a["state"], "Attested");
    let terms = deal.view("get_terms", json!({})).await?;
    assert_eq!(terms["total"], "36000000");
    assert_eq!(terms["items"].as_array().unwrap().len(), 3);
    Ok(())
}

#[tokio::test]
async fn a_forged_local_output_is_refused() -> Result<()> {
    let env = Env::new().await?;
    let jobs = jobs(&env);
    let deal = env.create("procurement", &demo_params()).await?;
    deal.seal(
        &env.buyer,
        "buyer",
        &company_mandate("northwind/procurement.buyer.json")?,
    )
    .await?;
    deal.seal(
        &env.vendor,
        "vendor",
        &company_mandate("halcyon/procurement.vendor.json")?,
    )
    .await?;
    deal.must(&env.keeper, "start_negotiation", json!({}))
        .await?;
    let nonce = deal.nonce().await?;
    let (j, id) = (jobs.clone(), deal.id.to_string());
    let mut out = blocking(move || j.negotiate(&id, &nonce)).await;
    out["terms"]["total"] = json!("1");
    deal.must(
        &env.keeper,
        "submit_mock_negotiation",
        json!({"output": out.to_string()}),
    )
    .await?;
    assert_eq!(
        deal.get().await?["state"],
        "Sealed",
        "an edited output changes nothing"
    );
    Ok(())
}

#[tokio::test]
async fn the_payee_job_proves_a_listed_recipient_and_rates_a_canary() -> Result<()> {
    let env = Env::new().await?;
    let jobs = jobs(&env);
    let deal = env.create("procurement", &demo_params()).await?;
    deal.to_executing(&procurement_terms(env.token.id(), &demo_params()))
        .await?;

    let v: u32 = deal
        .must(
            &env.vendor,
            "propose_recipient",
            json!({"account": env.recipient.id(), "domain": DOMAIN}),
        )
        .await?
        .json()?;
    let (j, id) = (jobs.clone(), deal.id.to_string());
    let out = blocking(move || j.prove(&id, v)).await;
    assert_eq!(
        out["checks"],
        json!({"file": "ok", "recipient_listed": "ok", "authority_matches": "ok"}),
        "{out}"
    );
    assert_eq!(out["rating"], "allow", "{out}");
    deal.must(
        &env.keeper,
        "submit_mock_payee",
        json!({"version": v, "output": out.to_string()}),
    )
    .await?;
    let rs = deal.view("get_recipients", json!({})).await?;
    assert_eq!(rs[0]["status"], "Proven", "{rs}");

    // A canary of this agreement, not listed in the domain file: the proof fails and the rating blocks.
    deal.must(
        &env.authority,
        "cancel_recipient_change",
        json!({"version": v}),
    )
    .await?;
    let v2: u32 = deal
        .must(
            &env.vendor,
            "propose_recipient",
            json!({"account": env.canaries[0].id(), "domain": DOMAIN}),
        )
        .await?
        .json()?;
    let (j, id) = (jobs.clone(), deal.id.to_string());
    let out: Value = blocking(move || j.prove(&id, v2)).await;
    assert_eq!(
        out["checks"]["recipient_listed"], "account not listed",
        "{out}"
    );
    assert_eq!(out["rating"], "block", "{out}");
    Ok(())
}

#[tokio::test]
async fn the_observer_says_nothing_before_its_hidden_slot_time() -> Result<()> {
    let env = Env::new().await?;
    let jobs = jobs(&env);
    let params = demo_params();
    let mm = env.create("market-making", &params).await?;
    mm.to_executing(&market_making_terms(env.token.id(), &params, 60))
        .await?;
    // Period 1 starts one period from now: every slot in it is still in the future.
    let (j, id) = (jobs.clone(), mm.id.to_string());
    let out = blocking(move || j.observe(&id, 1, 0)).await;
    assert_eq!(out, json!({"mode": "observe", "status": "not_yet"}));
    Ok(())
}

/// Reads mainnet (view calls only), so it is not part of `make ci`: `cargo test -p accord-sandbox --test
/// local_jobs -- --ignored`. Waits in real time for slot 1's hidden time, then for a final mainnet block after it.
#[tokio::test]
#[ignore]
async fn the_observer_measures_the_real_pool_after_the_slot_time() -> Result<()> {
    let env = Env::new().await?;
    let jobs = jobs(&env);
    let params = demo_params();
    let mm = env.create("market-making", &params).await?;
    mm.to_executing(&market_making_terms(env.token.id(), &params, 60))
        .await?;
    let mut out = json!(null);
    for _ in 0..60 {
        let (j, id) = (jobs.clone(), mm.id.to_string());
        out = blocking(move || j.observe(&id, 0, 0)).await;
        if out["status"] == "observed" {
            break;
        }
        assert_eq!(out["status"], "not_yet", "{out}");
        tokio::time::sleep(std::time::Duration::from_secs(5)).await;
    }
    assert_eq!(out["status"], "observed", "{out}");
    assert!(
        out["venue_block"]["height"].as_u64().unwrap() > 100_000_000,
        "a mainnet block: {out}"
    );
    let sig = out["sig"].as_str().unwrap().to_string();
    let mut o = out.clone();
    for k in ["sig", "mode", "status"] {
        o.as_object_mut().unwrap().remove(k);
    }
    mm.must(
        &env.keeper,
        "record_observation",
        json!({"observation": o, "sig": sig}),
    )
    .await?;
    let stored = mm.view("get_observations", json!({"period": 0})).await?;
    assert_eq!(stored.as_array().unwrap().len(), 1, "{stored}");
    println!("observed: {out}");
    Ok(())
}

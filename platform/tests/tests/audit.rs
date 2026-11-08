//! Regression tests from the 9 Nov 2026 audits (DECISIONS.md section 25), on a real node. Each asserts the fixed
//! behaviour.

use accord_sandbox::*;
use anyhow::Result;
use near_workspaces::types::NearToken;
use serde_json::json;

const ITEM: u128 = 12_000_000;

/// C1 / L4-F1: a deposit sent with `ft_transfer_call` in the same moment as the final `close` is credited by the
/// token, refused by `ft_on_transfer` (`ERR_CLOSING`), and taken back after the balance read. The refund used to
/// count it and so spent the vendor's reserved 12 USDC. Fixed: whatever the interleaving, the buyer nets the ledger's
/// 24 USDC refund and the reserved item stays on the account for the vendor.
#[tokio::test]
async fn a_deposit_in_transit_during_close_never_spends_the_reserve() -> Result<()> {
    let env = Env::new().await?;
    let params = demo_params();
    let deal = env.create("procurement", &params).await?;
    deal.to_executing(&procurement_terms(env.token.id(), &params))
        .await?;
    let _ = ok(deal.fund(36_000_000).await?)?;
    deal.deliver_and_accept(1).await?;
    let a = deal.get().await?;
    let end = a["ends_at"].as_u64().unwrap() + params.grace_secs;
    env.wait_until(end + 1).await?;
    let step: serde_json::Value = deal.must(&env.keeper, "close", json!({})).await?.json()?;
    assert_eq!(step, json!({"Reserved": {"item": 1}}));
    env.mint(env.buyer.id(), ITEM).await?;
    let before_buyer = env.balance(env.buyer.id()).await?;
    // The deposit and the final close, sent together.
    let t1 = env
        .buyer
        .call(env.token.id(), "ft_transfer_call")
        .args_json(json!({"receiver_id": deal.id, "amount": ITEM.to_string(), "msg": "fund"}))
        .deposit(NearToken::from_yoctonear(1))
        .gas(tgas(100))
        .transact_async()
        .await?;
    let t2 = env
        .keeper
        .call(&deal.id, "close")
        .args_json(json!({}))
        .gas(tgas(300))
        .transact_async()
        .await?;
    let _ = t1.await?;
    let _ = t2.await?;
    env.worker.fast_forward(5).await?;
    let a = deal.get().await?;
    assert_eq!(a["state"], "Settled");
    assert_eq!(a["reserved"], ITEM.to_string());
    assert_eq!(
        env.balance(env.buyer.id()).await? - before_buyer,
        24_000_000,
        "the buyer gets the ledger's refund and its own deposit back, nothing more"
    );
    assert_eq!(
        env.balance(&deal.id).await?,
        ITEM,
        "the vendor's reserved item is still on the account"
    );
    Ok(())
}

async fn factory_storage(env: &Env) -> Result<(u64, u128)> {
    let a = env.worker.view_account(env.factory.id()).await?;
    Ok((a.storage_usage, a.balance.as_yoctonear()))
}

/// L3-F1 (finding 9): `params` used to be forwarded raw to `new`, so unknown padding passed the factory's typed
/// check and made `new` run out of gas after the record was written (a refunded creation that still grew the
/// factory). Fixed: only the typed params reach the agreement, so a padded creation succeeds as a normal one.
#[tokio::test]
async fn padded_params_cannot_fail_a_creation_after_its_record() -> Result<()> {
    let env = Env::new().await?;
    let mut params = serde_json::to_value(demo_params())?;
    params["pad"] = json!(vec![0u8; 20_000]);
    let r = env
        .buyer
        .call(env.factory.id(), "create_agreement")
        .args_json(json!({"args": {
            "kind": "procurement", "title": "x".repeat(120),
            "vendor": env.vendor.id(), "vendor_authority": env.authority.id(),
            "canaries": env.canaries.iter().map(|c| c.id()).collect::<Vec<_>>(),
            "params": params,
        }}))
        .deposit(CREATE_DEPOSIT)
        .gas(tgas(300))
        .transact()
        .await?;
    assert!(
        events(&r, "agreement_failed").is_empty(),
        "creation failed after its record was written: {:?}",
        r.logs()
    );
    assert_eq!(events(&r, "agreement_registered").len(), 1);
    Ok(())
}

/// L3-F2 (finding 9): every creation used to grow the factory's storage at the factory's expense. Fixed: the
/// factory keeps the stake for the bytes it adds.
#[tokio::test]
async fn creation_storage_is_paid_by_the_buyer() -> Result<()> {
    let env = Env::new().await?;
    env.worker.fast_forward(5).await?;
    let (s0, b0) = factory_storage(&env).await?;
    let _deal = env.create("procurement", &demo_params()).await?;
    env.worker.fast_forward(5).await?;
    let (s1, b1) = factory_storage(&env).await?;
    let byte = 10u128.pow(19);
    assert!(
        b1 >= b0 + u128::from(s1 - s0) * byte,
        "factory added {} bytes and kept {} yocto",
        s1 - s0,
        b1 as i128 - b0 as i128
    );
    Ok(())
}

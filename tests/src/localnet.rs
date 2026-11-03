//! The services `make serve` runs next to the local node, in place of OutLayer and the testnet faucets:
//!
//! - [`deliver_jobs`]: watches every agreement; a negotiation request gets the local Sealed Table's signed output
//!   and a proposed recipient gets the Payee job's, both delivered through `submit_mock_*` as the keeper. On
//!   testnet the contract calls OutLayer itself and the callback delivers.
//! - [`serve_http`]: `POST /observe` runs the observer (the keeper polls it, as it polls OutLayer's HTTPS API on
//!   testnet); `POST /faucet` mints test USDC; `POST /account` creates a funded account for `make demo`.
//!
//! Every line it logs starts with `[local outlayer]` or `[local faucet]`.

use crate::localjobs::LocalJobs;
use crate::Env;
use anyhow::{anyhow, Result};
use near_workspaces::types::{KeyType, NearToken, SecretKey};
use near_workspaces::{Account, AccountId};
use serde_json::{json, Value};
use std::collections::BTreeSet;
use std::sync::Arc;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::Mutex;

pub const JOBS_ADDR: &str = "127.0.0.1:3040";

async fn view(env: &Env, account: &AccountId, method: &str, args: Value) -> Result<Value> {
    Ok(env
        .worker
        .view(account, method)
        .args_json(args)
        .await?
        .json()?)
}

async fn blocking<T: Send + 'static>(f: impl FnOnce() -> T + Send + 'static) -> Result<T> {
    tokio::task::spawn_blocking(f)
        .await
        .map_err(|e| anyhow!("job thread: {e}"))
}

async fn submit(env: &Env, agreement: &AccountId, method: &str, args: Value) -> Result<()> {
    let r = env
        .keeper
        .call(agreement, method)
        .args_json(args)
        .gas(crate::tgas(300))
        .transact()
        .await?;
    if r.is_success() {
        Ok(())
    } else {
        Err(anyhow!("{method}: {}", crate::failure(&r)))
    }
}

/// One pass over every agreement: answers each open negotiation request and each unproven recipient once.
pub async fn deliver_once(
    env: &Env,
    jobs: &Arc<LocalJobs>,
    done: &Mutex<BTreeSet<String>>,
) -> Result<()> {
    let records = view(
        env,
        env.factory.id(),
        "agreements",
        json!({"from": null, "limit": 100}),
    )
    .await?;
    for r in records.as_array().cloned().unwrap_or_default() {
        let Some(id) = r["account"]
            .as_str()
            .and_then(|s| s.parse::<AccountId>().ok())
        else {
            continue;
        };
        let a = view(env, &id, "get_agreement", json!({})).await?;
        if a["state"] == "Sealed" {
            if let Some(nonce) = a["negotiation"]["Requested"]["request_nonce"].as_str() {
                let key = format!("negotiate:{id}:{nonce}");
                if done.lock().await.insert(key) {
                    let (j, ids, n) = (jobs.clone(), id.to_string(), nonce.to_string());
                    let out = blocking(move || j.negotiate(&ids, &n)).await?;
                    let summary = match out["outcome"].as_str() {
                        Some("terms") => format!(
                            "terms {} USDC · {} rounds",
                            usdc(&out["terms"]["total"]),
                            out["rounds"]
                        ),
                        Some("no_deal") => format!("no deal · {}", out["no_deal_reason"]),
                        _ => format!("infrastructure · {}", out["error"]),
                    };
                    submit(
                        env,
                        &id,
                        "submit_mock_negotiation",
                        json!({"output": out.to_string()}),
                    )
                    .await?;
                    println!("[local outlayer] sealed-table {id} · {summary} · model local, no attestation");
                }
            }
        }
        let recipients = view(env, &id, "get_recipients", json!({})).await?;
        for v in recipients.as_array().cloned().unwrap_or_default() {
            if v["status"] != "Proposed" {
                continue;
            }
            let version = v["version"].as_u64().unwrap_or(0) as u32;
            if !done.lock().await.insert(format!("payee:{id}:{version}")) {
                continue;
            }
            let (j, ids) = (jobs.clone(), id.to_string());
            let out = blocking(move || j.prove(&ids, version)).await?;
            submit(
                env,
                &id,
                "submit_mock_payee",
                json!({"version": version, "output": out.to_string()}),
            )
            .await?;
            println!(
                "[local outlayer] payee {id} · version {version} · {} · {}",
                v["account"].as_str().unwrap_or(""),
                out["rating"].as_str().unwrap_or("error")
            );
        }
    }
    Ok(())
}

/// Runs [`deliver_once`] every two seconds until the process stops.
pub async fn deliver_jobs(env: Arc<Env>, jobs: Arc<LocalJobs>) {
    let done = Mutex::new(BTreeSet::new());
    loop {
        if let Err(e) = deliver_once(&env, &jobs, &done).await {
            eprintln!("[local outlayer] {e}");
        }
        tokio::time::sleep(Duration::from_secs(2)).await;
    }
}

fn usdc(v: &Value) -> String {
    let base: u128 = v.as_str().and_then(|s| s.parse().ok()).unwrap_or(0);
    format!("{}.{:02}", base / 1_000_000, (base % 1_000_000) / 10_000)
}

/// The HTTP side: one JSON request per connection, answered and closed. Bound to 127.0.0.1 only.
pub async fn serve_http(env: Arc<Env>, jobs: Arc<LocalJobs>) -> Result<()> {
    let listener = TcpListener::bind(JOBS_ADDR).await?;
    loop {
        let (stream, _) = listener.accept().await?;
        let (env, jobs) = (env.clone(), jobs.clone());
        tokio::spawn(async move {
            if let Err(e) = handle(stream, &env, &jobs).await {
                eprintln!("[local outlayer] http: {e}");
            }
        });
    }
}

async fn read_request(stream: &mut TcpStream) -> Result<(String, String, Value)> {
    let mut buf = Vec::new();
    let mut chunk = [0u8; 4096];
    loop {
        let n = stream.read(&mut chunk).await?;
        if n == 0 {
            break;
        }
        buf.extend_from_slice(&chunk[..n]);
        if let Some(end) = find(&buf, b"\r\n\r\n") {
            let head = String::from_utf8_lossy(&buf[..end]).to_string();
            let len = head
                .lines()
                .find_map(|l| {
                    l.to_ascii_lowercase()
                        .strip_prefix("content-length:")
                        .map(|v| v.trim().parse::<usize>().unwrap_or(0))
                })
                .unwrap_or(0);
            if len > 64 * 1024 {
                return Err(anyhow!("body too large"));
            }
            while buf.len() < end + 4 + len {
                let n = stream.read(&mut chunk).await?;
                if n == 0 {
                    break;
                }
                buf.extend_from_slice(&chunk[..n]);
            }
            let mut first = head.lines().next().unwrap_or("").split_whitespace();
            let method = first.next().unwrap_or("").to_string();
            let path = first.next().unwrap_or("").to_string();
            let body = &buf[end + 4..(end + 4 + len).min(buf.len())];
            let json = if body.is_empty() {
                Value::Null
            } else {
                serde_json::from_slice(body)?
            };
            return Ok((method, path, json));
        }
        if buf.len() > 70 * 1024 {
            return Err(anyhow!("headers too large"));
        }
    }
    Err(anyhow!("connection closed"))
}

fn find(hay: &[u8], needle: &[u8]) -> Option<usize> {
    hay.windows(needle.len()).position(|w| w == needle)
}

async fn handle(mut stream: TcpStream, env: &Env, jobs: &Arc<LocalJobs>) -> Result<()> {
    let (method, path, body) = read_request(&mut stream).await?;
    let (status, out) = match (method.as_str(), path.as_str()) {
        ("POST", "/observe") => match observe(jobs, &body).await {
            Ok(v) => (200, v),
            Err(e) => (400, json!({"error": e.to_string()})),
        },
        ("POST", "/faucet") => match faucet(env, &body).await {
            Ok(v) => (200, v),
            Err(e) => (400, json!({"error": e.to_string()})),
        },
        ("POST", "/account") => match new_account(env, &body).await {
            Ok(v) => (200, v),
            Err(e) => (400, json!({"error": e.to_string()})),
        },
        ("GET", "/health") => (
            200,
            json!({"ok": true, "network": "local", "rpc": env.worker.rpc_addr()}),
        ),
        _ => (
            404,
            json!({"error": "POST /observe, /faucet or /account; GET /health"}),
        ),
    };
    let body = out.to_string();
    let reply = format!(
        "HTTP/1.1 {status} {}\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
        if status == 200 { "OK" } else { "Error" },
        body.len()
    );
    stream.write_all(reply.as_bytes()).await?;
    Ok(())
}

async fn observe(jobs: &Arc<LocalJobs>, body: &Value) -> Result<Value> {
    let agreement = body["agreement"]
        .as_str()
        .ok_or_else(|| anyhow!("agreement"))?
        .to_string();
    let period = body["period"].as_u64().ok_or_else(|| anyhow!("period"))? as u32;
    let slot = body["slot"]
        .as_u64()
        .filter(|s| *s < 256)
        .ok_or_else(|| anyhow!("slot"))? as u8;
    let j = jobs.clone();
    blocking(move || j.observe(&agreement, period, slot)).await
}

/// Mints test USDC (at most 1,000 per call, the token's own cap) to an account.
async fn faucet(env: &Env, body: &Value) -> Result<Value> {
    let account: AccountId = body["account"]
        .as_str()
        .ok_or_else(|| anyhow!("account"))?
        .parse()?;
    let amount: u128 = body["amount"]
        .as_str()
        .ok_or_else(|| anyhow!("amount in base units"))?
        .parse()?;
    env.mint(&account, amount).await?;
    println!(
        "[local faucet] {} tUSDC → {account}",
        usdc(&json!(amount.to_string()))
    );
    Ok(json!({"account": account, "amount": amount.to_string()}))
}

/// A new account under the node's root with 30 NEAR, for `make demo` (the testnet faucet's role).
async fn new_account(env: &Env, body: &Value) -> Result<Value> {
    let name = body["name"].as_str().ok_or_else(|| anyhow!("name"))?;
    let sk = SecretKey::from_random(KeyType::ED25519);
    let a: Account = env
        .root
        .create_subaccount(name)
        .keys(sk.clone())
        .initial_balance(NearToken::from_near(30))
        .transact()
        .await?
        .into_result()
        .map_err(|e| anyhow!("{name}: {e:?}"))?;
    println!("[local faucet] account {} · 30 NEAR", a.id());
    Ok(json!({"account": a.id(), "key": sk.to_string()}))
}

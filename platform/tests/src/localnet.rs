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

/// Every agreement the factory lists, page by page.
async fn all_agreements(env: &Env) -> Result<Vec<AccountId>> {
    let mut out = Vec::new();
    let mut from = 1u64;
    loop {
        let page = view(
            env,
            env.factory.id(),
            "agreements",
            json!({"from": from, "limit": 100}),
        )
        .await?;
        let page = page.as_array().cloned().unwrap_or_default();
        out.extend(
            page.iter()
                .filter_map(|r| r["account"].as_str().and_then(|s| s.parse().ok())),
        );
        if page.len() < 100 {
            return Ok(out);
        }
        from += 100;
    }
}

/// One pass over every agreement: answers each open negotiation request and each unproven recipient once. A
/// request counts as answered only after its output was submitted, so a failure is tried again next pass; one
/// agreement's error is logged and the others are still served.
pub async fn deliver_once(
    env: &Env,
    jobs: &Arc<LocalJobs>,
    done: &Mutex<BTreeSet<String>>,
) -> Result<()> {
    for id in all_agreements(env).await? {
        if let Err(e) = serve(env, jobs, done, &id).await {
            eprintln!("[local outlayer] {id}: {e}");
        }
    }
    Ok(())
}

async fn serve(
    env: &Env,
    jobs: &Arc<LocalJobs>,
    done: &Mutex<BTreeSet<String>>,
    id: &AccountId,
) -> Result<()> {
    let a = view(env, id, "get_agreement", json!({})).await?;
    if let (true, Some(nonce)) = (
        a["state"] == "Sealed",
        a["negotiation"]["Requested"]["request_nonce"].as_str(),
    ) {
        let key = format!("negotiate:{id}:{nonce}");
        if !done.lock().await.contains(&key) {
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
                id,
                "submit_mock_negotiation",
                json!({"output": out.to_string()}),
            )
            .await?;
            done.lock().await.insert(key);
            println!(
                "[local outlayer] sealed-table {id} · {summary} · model local, no attestation"
            );
        }
    }
    let recipients = view(env, id, "get_recipients", json!({})).await?;
    for v in recipients.as_array().cloned().unwrap_or_default() {
        let version = v["version"].as_u64().unwrap_or(0) as u32;
        let key = format!("payee:{id}:{version}");
        if v["status"] != "Proposed" || done.lock().await.contains(&key) {
            continue;
        }
        let (j, ids) = (jobs.clone(), id.to_string());
        let out = blocking(move || j.prove(&ids, version)).await?;
        submit(
            env,
            id,
            "submit_mock_payee",
            json!({"version": version, "output": out.to_string()}),
        )
        .await?;
        done.lock().await.insert(key);
        println!(
            "[local outlayer] payee {id} · version {version} · {} · {} · domain file served by the local node",
            v["account"].as_str().unwrap_or(""),
            out["rating"].as_str().unwrap_or("error")
        );
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
    // At most 64 connections at once; each has five seconds to send its request.
    let slots = Arc::new(tokio::sync::Semaphore::new(64));
    loop {
        let (stream, _) = listener.accept().await?;
        let Ok(permit) = slots.clone().try_acquire_owned() else {
            drop(stream);
            continue;
        };
        let (env, jobs) = (env.clone(), jobs.clone());
        tokio::spawn(async move {
            if let Err(e) = handle(stream, &env, &jobs).await {
                eprintln!("[local outlayer] http: {e}");
            }
            drop(permit);
        });
    }
}

/// Only this machine's own tools: a browser page elsewhere (a cross-site POST, DNS rebinding) is refused.
fn local_caller(headers: &str) -> Result<(), &'static str> {
    let header = |name: &str| {
        headers.lines().find_map(|l| {
            let (k, v) = l.split_once(':')?;
            k.trim()
                .eq_ignore_ascii_case(name)
                .then(|| v.trim().to_ascii_lowercase())
        })
    };
    let port = JOBS_ADDR.rsplit(':').next().unwrap_or("");
    match header("host") {
        Some(h) if h == JOBS_ADDR || h == format!("localhost:{port}") => {}
        _ => return Err("host must be this machine"),
    }
    if let Some(o) = header("origin") {
        if !(o.starts_with("http://localhost") || o.starts_with("http://127.0.0.1")) {
            return Err("cross-origin requests are refused");
        }
    }
    Ok(())
}

async fn read_request(stream: &mut TcpStream) -> Result<(String, String, String, Vec<u8>)> {
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
            if buf.len() < end + 4 + len {
                return Err(anyhow!("body shorter than its content-length"));
            }
            return Ok((method, path, head, buf[end + 4..end + 4 + len].to_vec()));
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
    let read =
        tokio::time::timeout(std::time::Duration::from_secs(5), read_request(&mut stream)).await;
    let (status, out) = match read {
        Err(_) => (408, json!({"error": "request not received within 5 s"})),
        Ok(Err(e)) => (400, json!({"error": e.to_string()})),
        Ok(Ok((method, path, head, body))) => match local_caller(&head) {
            Err(why) => (403, json!({"error": why})),
            Ok(()) => route(env, jobs, &method, &path, &head, &body).await,
        },
    };
    let body = out.to_string();
    let reply = format!(
        "HTTP/1.1 {status} {}\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
        match status { 200 => "OK", 400 => "Bad Request", 403 => "Forbidden", 404 => "Not Found", 408 => "Request Timeout", _ => "Error" },
        body.len()
    );
    stream.write_all(reply.as_bytes()).await?;
    Ok(())
}

async fn route(
    env: &Env,
    jobs: &Arc<LocalJobs>,
    method: &str,
    path: &str,
    head: &str,
    body: &[u8],
) -> (u16, Value) {
    if method == "GET" && path == "/health" {
        return (
            200,
            json!({"ok": true, "network": "local", "rpc": env.worker.rpc_addr()}),
        );
    }
    if method != "POST" {
        return (
            404,
            json!({"error": "POST /observe, /faucet, /near or /account; GET /health"}),
        );
    }
    let json_type = head.lines().any(|l| {
        l.split_once(':').is_some_and(|(k, v)| {
            k.trim().eq_ignore_ascii_case("content-type")
                && v.trim().starts_with("application/json")
        })
    });
    if !json_type {
        return (
            400,
            json!({"error": "content-type must be application/json"}),
        );
    }
    let body: Value = match serde_json::from_slice(body) {
        Ok(v) => v,
        Err(e) => return (400, json!({"error": format!("body is not JSON: {e}")})),
    };
    let r = match path {
        "/observe" => observe(jobs, &body).await,
        "/faucet" => faucet(env, &body).await,
        "/near" => near(env, &body).await,
        "/account" => new_account(env, &body).await,
        _ => {
            return (
                404,
                json!({"error": "POST /observe, /faucet, /near or /account; GET /health"}),
            )
        }
    };
    match r {
        Ok(v) => (200, v),
        Err(e) => (400, json!({"error": e.to_string()})),
    }
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

/// Tops an account up to at least `near` NEAR (at most 100) from the node's root, as the testnet faucet would.
async fn near(env: &Env, body: &Value) -> Result<Value> {
    let account: AccountId = body["account"]
        .as_str()
        .ok_or_else(|| anyhow!("account"))?
        .parse()?;
    let want = body["near"]
        .as_u64()
        .filter(|n| *n <= 100)
        .ok_or_else(|| anyhow!("near: 1 to 100"))?;
    let have = env.worker.view_account(&account).await?.balance;
    let target = NearToken::from_near(u128::from(want));
    if have < target {
        let r = env
            .root
            .transfer_near(
                &account,
                NearToken::from_yoctonear(target.as_yoctonear() - have.as_yoctonear()),
            )
            .await?;
        if !r.is_success() {
            return Err(anyhow!("transfer failed"));
        }
        println!("[local faucet] {account} topped up to {want} NEAR");
    }
    Ok(json!({"account": account, "near": want}))
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

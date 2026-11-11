// `make usage`: what has run on Accord's testnet contracts, counted from chain state alone (view calls, no keys).
// Every number in the README's "Traction" section comes from this script, so anyone can rerun it and compare.
// It counts activity, not customers: no one is identified, and most of it was run by us (see the README).

const RPC = process.env.NEAR_RPC || "https://test.rpc.fastnear.com";
const FACTORIES = ["accord-v2.testnet", "accord-usdc.testnet"];
const BOARD = "tender-v2.accord-v2.testnet";
const IMPLICIT = /^[0-9a-f]{64}$/;

async function view(account, method, args = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "query", params: {
        request_type: "call_function", finality: "final", account_id: account, method_name: method,
        args_base64: Buffer.from(JSON.stringify(args)).toString("base64") } }),
    }).then((r) => r.json()).catch((e) => ({ error: String(e) }));
    if (res.result?.result) return JSON.parse(Buffer.from(res.result.result).toString());
    // a method an older release does not have is not an error worth retrying
    if (JSON.stringify(res.error ?? res.result ?? "").includes("MethodNotFound")) return null;
    if (attempt >= 3) throw new Error(`${account}.${method}: ${JSON.stringify(res.error ?? res.result).slice(0, 160)}`);
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
}

async function all(account, method, page, key = "from") {
  const out = [];
  for (let from = 0; ; from += page) {
    const batch = (await view(account, method, { [key]: from, limit: page })) ?? [];
    out.push(...batch);
    if (batch.length < page) return out;
  }
}

async function refusalCount(account) {
  let n = 0;
  for (let from = 0; ; from += 50) {
    const batch = (await view(account, "get_refusals", { from, limit: 50 })) ?? [];
    n += batch.length;
    if (batch.length < 50) return n;
  }
}

const rows = [];
for (const f of FACTORIES) {
  const list = await all(f, "agreements", 100);
  for (const a of list) {
    const [receipts, refusals] = await Promise.all([view(a.account, "get_receipts"), refusalCount(a.account)]);
    rows.push({ ...a, factory: f, payments: receipts?.length ?? 0, refusals });
  }
}

const count = (xs, f) => xs.reduce((m, x) => ((m[f(x)] = (m[f(x)] ?? 0) + 1), m), {});
const browserKeyBuyers = rows.filter((r) => IMPLICIT.test(r.buyer));

console.log("Agreements (each its own NEAR account)");
for (const f of FACTORIES) {
  const mine = rows.filter((r) => r.factory === f);
  console.log(`  ${f.padEnd(22)} ${String(mine.length).padStart(3)}  ${JSON.stringify(count(mine, (r) => r.kind))}`);
}
console.log(`  by release              ${JSON.stringify(count(rows, (r) => r.release))}`);
console.log(`  distinct buyer accounts ${new Set(rows.map((r) => r.buyer)).size}`);
console.log(`  opened from a key made in the browser (/app/try-it, no wallet): ${browserKeyBuyers.length}`);
console.log(`  payments made by an agent's key under the contract: ${rows.reduce((s, r) => s + r.payments, 0)}`);
console.log(`  payments refused by the contract, on the record:     ${rows.reduce((s, r) => s + r.refusals, 0)}`);
console.log(`  agreements with at least one refusal:                ${rows.filter((r) => r.refusals > 0).length}`);

// list_jobs pages newest first, so read every job by id
const total = await view(BOARD, "job_count");
const byId = [];
for (let id = 1; id <= total; id++) { const j = await view(BOARD, "get_job", { id }); if (j) byId.push(j); }
const bids = byId.flatMap((j) => j.bids);
console.log("");
console.log(`Open tenders (${BOARD})`);
console.log(`  jobs posted ${byId.length}  ${JSON.stringify(count(byId, (j) => j.phase))}`);
console.log(`  sealed bids ${bids.length}, revealed ${bids.filter((b) => b.price !== null).length}, distinct agent keys ${new Set(bids.map((b) => b.bidder)).size}`);
console.log(`  jobs won by an agent outside the house keeper (all run by us so far): ${byId.filter((j) => j.winner && !["halcyon-quote-bot", "lowball-lab", "premium-pipelines"].includes(j.bids.find((b) => b.bidder === j.winner)?.agent)).length}`);
console.log(`  jobs linked to an Accord agreement: ${byId.filter((j) => j.agreement).length}`);

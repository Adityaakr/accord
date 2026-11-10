// Records the check fixtures from testnet: for every agent payment (get_receipts, via agent) and every agent refusal
// (get_refusals, via agent) of the agreements below, the agreement's views one block before the block whose `act`
// produced it, and what the chain recorded. A refusal's `block` is the act's block; a receipt is written by the
// payment's callback, so the act's block is the lock's `since_block`, read just before the receipt's block. test/check.test.ts replays each through simulatePayment and compares.
// Run: node test/fixtures/check/capture.mjs (from packages/sdk). Reads an archival RPC; no key.
import { writeFileSync } from "node:fs";

const RPC = process.env.NEAR_ARCHIVAL_RPC_URL || "https://archival-rpc.testnet.fastnear.com";
const AGREEMENTS = process.argv.slice(2).length ? process.argv.slice(2) : [
  "a48.accord-v2.testnet", "a2.accord-usdc.testnet", "a53.accord-v2.testnet",
  "a6.accord-v2.testnet", "a1.accord-usdc.testnet", "a11.accord-v2.testnet", "a14.accord-v2.testnet",
];

async function rpc(method, params) {
  for (let i = 0; ; i++) {
    const res = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
    const body = await res.json().catch(() => ({}));
    if (body.result) return body.result;
    if (i >= 8) throw new Error(`${method}: ${JSON.stringify(body.error ?? res.status)}`);
    await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
  }
}
const view = async (account, method, block, args = {}) => {
  const ref = block === undefined ? { finality: "final" } : { block_id: block };
  const r = await rpc("query", { request_type: "call_function", ...ref, account_id: account, method_name: method,
    args_base64: Buffer.from(JSON.stringify(args)).toString("base64") });
  return JSON.parse(Buffer.from(r.result).toString());
};

for (const id of AGREEMENTS) {
  const acct = await rpc("query", { request_type: "view_account", finality: "final", account_id: id });
  const head = await view(id, "get_agreement");
  const token = await view(head.token, "ft_metadata");
  const events = [
    ...(await view(id, "get_receipts")).filter((r) => r.via === "agent")
      .map((r) => ({ block: r.block, item: r.item, amount: r.amount, recipient: r.recipient, recorded: { verdict: "pay", code: null, payment_id: r.payment_id } })),
    ...(await view(id, "get_refusals", undefined, { limit: 128 })).filter((r) => r.via === "agent")
      .map((r) => ({ block: r.block, item: r.item, amount: r.amount, recipient: r.recipient, recorded: { verdict: "refuse", code: r.code, seq: r.seq } })),
  ].sort((a, b) => a.block - b.block);
  for (const e of events.filter((x) => x.recorded.verdict === "pay")) {
    const lock = (await view(id, "get_agreement", e.block - 1)).in_flight;
    if (lock?.payment_id !== e.recorded.payment_id) throw new Error(`${id}: payment ${e.recorded.payment_id} has no lock before its receipt`);
    e.recorded.receipt_block = e.block;
    e.block = lock.since_block;
  }
  events.sort((a, b) => a.block - b.block);
  const cases = [];
  for (const e of events) {
    const at = e.block - 1;
    const [agreement, items] = await Promise.all([view(id, "get_agreement", at), view(id, "get_items", at)]);
    cases.push({ ...e, views_at: at, agreement, items });
  }
  const out = {
    agreement: id, code_hash: acct.global_contract_hash ?? acct.code_hash,
    token: { id: head.token, symbol: token.symbol, decimals: token.decimals },
    captured_from: RPC, captured_at: new Date().toISOString(), cases,
  };
  writeFileSync(new URL(`./${id}.json`, import.meta.url), JSON.stringify(out, null, 1) + "\n");
  console.log(`${id}: ${cases.length} cases`);
}

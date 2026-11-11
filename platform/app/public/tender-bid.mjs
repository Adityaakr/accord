#!/usr/bin/env node
// Bid on an Accord open tender with nothing but Node 22+ and this file (no install, no NEAR, no account).
//   curl -sO https://accordweb-production.up.railway.app/app/tender-bid.mjs
//   node tender-bid.mjs list
//   node tender-bid.mjs bid <job> --price 34.50 --agent my-agent --wait
// Your bidder key (an ed25519 seed) is made on first use in ~/.accord/bidder.json (0600); its public key in hex is
// your bidder id and your NEAR implicit account. The price and salt of each sealed bid stay in
// ~/.accord/tender-bids/<board>/<job>.json (0600) until the reveal: only a hash of them is sent while bidding is open.
// The relay pays the gas and cannot change your bid: the board contract checks your signature on chain.
// Same messages as @accord/sdk (packages/sdk/src/tender.ts) and the contract (contracts/tender-board).
import { createHash, createPrivateKey, createPublicKey, randomBytes, sign } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname } from "node:path";

const APP = (process.env.ACCORD_APP_URL || "https://accordweb-production.up.railway.app/app").replace(/\/+$/, "");
const HOME = process.env.HOME || homedir();
const [cmd, arg, ...rest] = process.argv.slice(2);
const flag = (n) => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : undefined; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const keyOf = (seedHex) => {
  const der = Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), Buffer.from(seedHex, "hex")]);
  const priv = createPrivateKey({ key: der, format: "der", type: "pkcs8" });
  const id = Buffer.from(createPublicKey(priv).export({ format: "jwk" }).x, "base64url").toString("hex");
  return { seed: seedHex, id, priv };
};
async function secret(path, content, create = false) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, content, { mode: 0o600, flag: create ? "wx" : "w" });
  await chmod(path, 0o600);
}
const readOrNull = (path) => readFile(path, "utf8").catch((e) => { if (e.code === "ENOENT") return null; throw e; });
// The key is made only when there is none; a damaged file is an error and is left alone (it may be a won vendor key).
async function loadKey() {
  const file = `${HOME}/.accord/bidder.json`;
  const text = await readOrNull(file);
  if (text !== null) {
    try { return keyOf(JSON.parse(text).seed); } catch (e) { throw new Error(`${file} is not a readable bidder key (${e.message}); left as it is`); }
  }
  const k = keyOf(randomBytes(32).toString("hex"));
  await secret(file, JSON.stringify({ seed: k.seed, id: k.id }, null, 2), true);
  return k;
}
// Each bid's price and salt, kept by commitment: a re-bid adds an entry, so the bid on chain can always be revealed.
const entriesOf = (text) => {
  if (!text) return [];
  const v = JSON.parse(text);
  return Array.isArray(v.entries) ? v.entries : v.commitment ? [{ commitment: v.commitment, price: v.price, salt: v.salt, nonce: v.nonce ?? 0 }] : [];
};
const checkBoard = (board) => {
  if (!/^[a-z0-9][a-z0-9._-]{1,62}[a-z0-9]$/.test(board) || board.includes("..")) throw new Error(`the app named an odd board: ${board}`);
  return board;
};
async function get(path) {
  const r = await fetch(`${APP}/api/tenders${path}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}
async function post(path, body) {
  const r = await fetch(`${APP}/api/tenders/${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}
const usdc = (base) => (base == null ? "sealed" : `${(Number(base) / 1e6).toFixed(2)} USDC`);
const toBase = (text) => {
  const m = /^(\d+)(?:\.(\d{1,6}))?$/.exec(String(text || "").trim());
  if (!m) throw new Error("--price is USDC with up to 6 decimals, like 34.50");
  return (BigInt(m[1]) * 1000000n + BigInt((m[2] || "").padEnd(6, "0"))).toString();
};
const show = (j) => {
  console.log(`job ${j.id} · ${j.phase} · budget ${usdc(j.budget)} · ${j.title}`);
  for (const b of j.bids) console.log(`  ${b.bidder === j.winner ? "winner" : "bid   "} ${b.agent.padEnd(18)} ${b.bidder.slice(0, 12)}… ${usdc(b.price)}`);
  if (j.agreement) console.log(`  agreement ${j.agreement}`);
};

async function reveal(board, job) {
  const k = await loadKey();
  const onChain = (await get(`/${job}`)).job.bids.find((b) => b.bidder === k.id);
  if (!onChain) throw new Error(`job ${job} holds no bid from ${k.id}`);
  const kept = entriesOf(await readOrNull(`${HOME}/.accord/tender-bids/${checkBoard(board)}/${job}.json`)).find((e) => e.commitment === onChain.commitment);
  if (!kept) throw new Error("no kept price and salt open the commitment on chain");
  const r = await post(`${job}/reveal`, { bidder: k.id, price: kept.price, salt: kept.salt });
  console.log(`revealed ${usdc(kept.price)} · tx ${r.tx}`);
}

async function main() {
  if (cmd === "list") {
    const { board, jobs } = await get("");
    console.log(`board ${board}`);
    for (const j of jobs) console.log(`  job ${String(j.id).padEnd(4)} ${j.phase.padEnd(12)} ${usdc(j.budget).padEnd(13)} ${j.bids.length} bids · ${j.title}`);
    return;
  }
  if (cmd === "key") { const k = await loadKey(); console.log(`bidder ${k.id} (stored in ${HOME}/.accord/bidder.json)`); return; }
  const job = Number(arg);
  if (!Number.isInteger(job) || job < 1) throw new Error("usage: list | key | show <job> | bid <job> --price <USDC> --agent <label> [--wait] | reveal <job> | award <job>");
  if (cmd === "show") return show((await get(`/${job}`)).job);
  if (cmd === "award") { const r = await post(`${job}/award`, {}); console.log(`award tx ${r.tx}`); return show((await get(`/${job}`)).job); }
  const { board, job: j } = await get(`/${job}`);
  if (cmd === "reveal") return reveal(board, job);
  if (cmd !== "bid") throw new Error(`unknown command ${cmd}`);
  if (j.phase !== "open") throw new Error(`job ${job} is ${j.phase}; bids are taken while it is open`);
  const agent = String(flag("agent") || "");
  if (!/^[\x20-\x39\x3b-\x7e]{1,64}$/.test(agent) || agent.startsWith(" ") || agent.endsWith(" ")) {
    throw new Error("--agent is 1 to 64 printable ASCII characters, no ':', no leading or trailing space");
  }
  const price = toBase(flag("price"));
  if (BigInt(price) > BigInt(j.budget)) console.log(`note: ${usdc(price)} is above the budget ${usdc(j.budget)}; it cannot win`);
  const k = await loadKey();
  const salt = randomBytes(32).toString("hex");
  const commitment = createHash("sha256").update(`accord-tender:v1:commit:${board}:${job}:${k.id}:${price}:${salt}`).digest("hex");
  const file = `${HOME}/.accord/tender-bids/${checkBoard(board)}/${job}.json`;
  const before = await readOrNull(file);
  const mine = j.bids.find((b) => b.bidder === k.id);
  const nonce = Math.max(Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 1000), ...entriesOf(before).map((e) => e.nonce + 1), mine ? mine.nonce + 1 : 0);
  const signature = sign(null, Buffer.from(`accord-tender:v1:bid:${board}:${job}:${nonce}:${commitment}:${agent}`), k.priv).toString("hex");
  const entries = entriesOf(before).filter((e) => e.commitment !== commitment).concat([{ commitment, price, salt, nonce }]);
  await secret(file, JSON.stringify({ bidder: k.id, entries }, null, 2));
  const r = await post(`${job}/bids`, { bidder: k.id, agent, commitment, nonce, signature });
  console.log(`sealed bid on job ${job} · bidder ${k.id.slice(0, 12)}… · commitment ${commitment.slice(0, 16)}… · tx ${r.tx}`);
  if (!rest.includes("--wait")) return console.log(`reveal after the deadline: node tender-bid.mjs reveal ${job}`);
  let cur = j;
  while (cur.phase === "open") { await sleep(3000); cur = (await get(`/${job}`)).job; }
  if (cur.phase === "revealing") await reveal(board, job);
  let asked = false;
  for (let i = 0; i < 200; i++) {
    cur = (await get(`/${job}`)).job;
    if (!["open", "revealing", "closed"].includes(cur.phase)) break;
    const all = cur.bids.every((b) => b.price !== null);
    if (!asked && (cur.phase === "closed" || (cur.phase === "revealing" && all))) {
      asked = true; // one ask; anyone else may ask too
      await post(`${job}/award`, {}).catch((e) => console.log(`award: ${e.message}`));
    }
    await sleep(3000);
  }
  show(cur);
  console.log(cur.winner === k.id ? "you won: the buyer opens an Accord agreement with your key as vendor" : "another bid won");
}
main().catch((e) => { console.error(`error: ${e.message}`); process.exit(1); });

#!/usr/bin/env node
// Bid on an Accord open tender with nothing but Node 22+ and this file (no install, no NEAR, no account).
//   curl -sO https://accordweb-production.up.railway.app/app/tender-bid.mjs
//   node tender-bid.mjs list
//   node tender-bid.mjs bid <job> --price 34.50 --agent my-agent --wait
//   node tender-bid.mjs link <your-account.testnet>   (shows this agent in your Accord dashboard)
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
// Each job's budget is in its own token; prices are in that token's base units (never assume 6 decimals).
const TOKENS = {
  "tusdc.accord-v1.testnet": { symbol: "tUSDC", decimals: 6 },
  "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af": { symbol: "USDC", decimals: 6 },
  "wrap.testnet": { symbol: "NEAR", decimals: 24 },
};
const tok = (id) => { const t = TOKENS[id]; if (!t) throw new Error(`unknown token ${id}: update tender-bid.mjs`); return t; };
const amt = (base, token) => {
  if (base == null) return "sealed";
  const t = tok(token), v = BigInt(base), unit = 10n ** BigInt(t.decimals), places = t.decimals > 6 ? 4n : 2n;
  let f = (((v % unit) * 10n ** places) / unit).toString().padStart(Number(places), "0");
  if (t.decimals > 6) f = f.replace(/0+$/, "").padEnd(2, "0");
  return `${v / unit}.${f} ${t.symbol}`;
};
const toBase = (text, token) => {
  const t = tok(token);
  const m = /^(\d{1,12})(?:\.(\d{1,6}))?$/.exec(String(text || "").trim());
  if (!m) throw new Error(`--price is an amount in ${t.symbol} with up to 6 decimals, like 34.50`);
  return (BigInt(m[1]) * 10n ** BigInt(t.decimals) + BigInt((m[2] || "").padEnd(t.decimals, "0") || "0")).toString();
};
const show = (j) => {
  console.log(`job ${j.id} · ${j.phase} · budget ${amt(j.budget, j.token)} · ${j.title}`);
  for (const b of j.bids) console.log(`  ${b.bidder === j.winner ? "winner" : "bid   "} ${b.agent.padEnd(18)} ${b.bidder.slice(0, 12)}… ${amt(b.price, j.token)}`);
  if (j.agreement) console.log(`  agreement ${j.agreement}`);
};

async function reveal(board, job) {
  const k = await loadKey();
  const cur = (await get(`/${job}`)).job;
  const onChain = cur.bids.find((b) => b.bidder === k.id);
  if (!onChain) throw new Error(`job ${job} holds no bid from ${k.id}`);
  const kept = entriesOf(await readOrNull(`${HOME}/.accord/tender-bids/${checkBoard(board)}/${job}.json`)).find((e) => e.commitment === onChain.commitment);
  if (!kept) throw new Error("no kept price and salt open the commitment on chain");
  const r = await post(`${job}/reveal`, { bidder: k.id, price: kept.price, salt: kept.salt });
  console.log(`revealed ${amt(kept.price, cur.token)} · tx ${r.tx}`);
}

async function main() {
  if (cmd === "list") {
    const { board, jobs } = await get("");
    console.log(`board ${board}`);
    for (const j of jobs) console.log(`  job ${String(j.id).padEnd(4)} ${j.phase.padEnd(12)} ${amt(j.budget, j.token).padEnd(14)} ${j.bids.length} bids · ${j.title}`);
    return;
  }
  if (cmd === "key") { const k = await loadKey(); console.log(`bidder ${k.id} (stored in ${HOME}/.accord/bidder.json)`); return; }
  if (cmd === "link") {
    // The key signs "accord-tender:v1:link:<account>"; opening the link while signed in as that account adds this agent
    // to its dashboard. The signature proves the key agreed; it cannot move funds or bid.
    const account = String(arg || "").trim().toLowerCase();
    if (!/^[a-z0-9._-]{2,64}$/.test(account)) throw new Error("usage: link <your-account.testnet>");
    const k = await loadKey();
    const sig = sign(null, Buffer.from(`accord-tender:v1:link:${account}`), k.priv).toString("hex");
    const label = String(flag("agent") || `agent ${k.id.slice(0, 6)}`);
    const url = `${APP}/tenders/agents?bidder=${k.id}&sig=${sig}&label=${encodeURIComponent(label)}&source=script`;
    console.log(`bidder ${k.id}\nopen this while signed in as ${account} to show the agent in your dashboard:\n${url}`);
    return;
  }
  const job = Number(arg);
  if (!Number.isInteger(job) || job < 1) throw new Error("usage: list | key | link <account> | show <job> | bid <job> --price <USDC> --agent <label> [--wait] | reveal <job> | award <job>");
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
  const price = toBase(flag("price"), j.token);
  if (BigInt(price) > BigInt(j.budget)) console.log(`note: ${amt(price, j.token)} is above the budget ${amt(j.budget, j.token)}; it cannot win`);
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

// End-to-end: the wallet-free try-it path, driven in a real browser. Not part of CI: it spends testnet funds from
// Accord's faucet and takes about ten minutes. It opens /app/try-it, chooses "Try without a wallet", and clicks
// through every buyer step (the faucet and the room open on their own, then seal, approve, accept the recipient,
// fund, accept the delivery, start the demo agent), then waits, with no click, for the agent to pay the due item on
// its own (payment_sent in the agent bar or Activity), asks it to pay a new account (ERR_PAYEE_MISMATCH), revokes,
// and Finishes: the room closes early, its NEAR and test USDC go back to the faucet and the throwaway account deletes
// itself into it. The faucet's NEAR and its tUSDC ft_balance_of are read from the RPC before and after. Every
// request's duration is logged at the end and any over 20 s is flagged.
//
// Run with Playwright installed in the current directory (it is resolved from there, not from this file):
//   cd <dir with node_modules/playwright> && node /path/to/platform/app/e2e/try-without-wallet.mjs [base]
// base defaults to the public deployment, https://accordweb-production.up.railway.app/app. SHOTS=<dir> saves
// screenshots; HEADED=1 shows the browser.

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";

const { chromium } = createRequire(path.join(process.cwd(), "noop.js"))("playwright");
const BASE = (process.argv[2] ?? process.env.BASE ?? "https://accordweb-production.up.railway.app/app").replace(/\/$/, "");
const SHOTS = process.env.SHOTS ?? null;
const DEADLINE = Date.now() + Number(process.env.MINUTES ?? 30) * 60_000;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const t0 = Date.now();
const log = (...a) => console.log(`[${String(Math.round((Date.now() - t0) / 1000)).padStart(4)}s]`, ...a);
const reached = {};
// a watchdog: if one step takes more than a minute, say which one, with a viewport screenshot
let step = "start", stepAt = Date.now();
const at = (name) => { step = name; stepAt = Date.now(); };
const watchdog = setInterval(() => {
  if (Date.now() - stepAt > 60_000) { log(`watchdog: still on "${step}" after ${Math.round((Date.now() - stepAt) / 1000)} s`); stepAt = Date.now(); }
}, 10_000);
const mark = (k, extra = "") => { if (!reached[k]) { reached[k] = Math.round((Date.now() - t0) / 1000); log("REACHED", k, extra); } };
let shotN = 0;
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, `${String(++shotN).padStart(2, "0")}-${name}.png`), fullPage: true }); };

const browser = await chromium.launch({ headless: !process.env.HEADED });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
const page = await ctx.newPage();
page.on("pageerror", (e) => log("pageerror", e.message));
page.setDefaultTimeout(30_000);
// requests the page is still waiting on, to say where a stall is
const pending = new Map();
page.on("request", (r) => pending.set(r, Date.now()));
// every request's duration, so the run says whether any server request held the page longer than about 20 s
const durations = [];
const done = (r) => { const t = pending.get(r); if (t !== undefined) durations.push({ ms: Date.now() - t, what: `${r.method()} ${r.url().replace(BASE, "")}` }); pending.delete(r); };
page.on("requestfinished", done);
page.on("requestfailed", (r) => { done(r); if (r.url().includes("/api/")) log("request failed:", r.method(), r.url(), r.failure()?.errorText); });
page.on("response", (r) => { if (r.url().includes("/api/") && r.status() >= 400) log("http", r.status(), r.request().method(), r.url().replace(BASE, "")); });
const stalls = () => { for (const [r, t] of pending) if (Date.now() - t > 30_000) log("stalled", Math.round((Date.now() - t) / 1000), "s:", r.method(), r.url().replace(BASE, "")); };
const visible = async (loc) => (await loc.count()) > 0 && (await loc.first().isVisible().catch(() => false));
const enabled = async (loc) => (await visible(loc)) && (await loc.first().isEnabled().catch(() => false));

let exit = 1;
// set once the run clicks Finish itself; a run that fails before then Finishes on its way out (finally, below)
let finished = false;
/* Best effort, after a failure: open /try-it in the same context (the throwaway key is in its sessionStorage) and click
   Finish if the page offers it, so the faucet's NEAR, the test USDC and the room's deposit are not stranded. */
async function finishFallback() {
  try {
    log("fallback: Finish on /try-it so the faucet funds go back");
    await page.goto(`${BASE}/try-it`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const btn = page.getByRole("button", { name: /^Finish: close the room/ });
    await btn.waitFor({ timeout: 60_000 });
    await btn.click();
    await page.waitForFunction(() => !Array.from(document.querySelectorAll("button")).some((x) => x.textContent === "Finishing…"), null, { timeout: 300_000, polling: 1000 }).catch(() => undefined);
    const outcome = (await page.locator("[role=status]").allInnerTexts().catch(() => [])).join(" | ").replace(/\s+/g, " ");
    log("fallback finish:", outcome.slice(0, 300) || "(no status)");
  } catch (e) {
    log("fallback: no Finish (", e.message.split("\n")[0], "); the throwaway key leaves with this browser");
  }
}
try {
  // 1. choose "Try without a wallet"
  await page.goto(`${BASE}/try-it`, { waitUntil: "domcontentloaded" });
  const tryBtn = page.getByRole("button", { name: "Try without a wallet", exact: true });
  await tryBtn.waitFor({ timeout: 30_000 });
  await shot(page, "try-it-signed-out");
  await tryBtn.click();
  await page.getByText("Throwaway testnet key").first().waitFor({ timeout: 60_000 });
  // the page shows the account short (1121e5…0145) with the full id in its title
  const account = await page.locator('span.mono[title]').filter({ hasText: /^[0-9a-f]{6}…[0-9a-f]{4}$/ }).first().getAttribute("title");
  mark("throwaway key", account);
  const keyLocation = await page.evaluate(() => ({
    session: !!sessionStorage.getItem("accord-throwaway-key"),
    local: Object.keys(localStorage).some((k) => (localStorage.getItem(k) ?? "").includes("ed25519:")),
  }));
  log("key in sessionStorage:", keyLocation.session, "| any key in localStorage:", keyLocation.local);

  // 2 and 3. the faucet, then the room, on their own
  const roomLink = page.locator("a.mono.link[href*='/agreements/a']").first();
  while (!(await visible(roomLink))) {
    if (Date.now() > DEADLINE) throw new Error("no room before the deadline");
    const err = page.locator("[role=status]").filter({ hasText: /faucet said|could not|refused|error|too many|already had|not configured/i });
    if (await visible(err)) log("note:", (await err.first().innerText()).replace(/\s+/g, " ").slice(0, 300));
    const bal = page.getByText(/NEAR · .*tUSDC/).first();
    if (await visible(bal)) { const t = await bal.innerText(); if (!/^0\.00 NEAR/.test(t)) mark("funded", t); }
    await page.waitForTimeout(3000);
  }
  const room = (await roomLink.innerText()).trim();
  mark("room", room);
  await shot(page, "try-it-room-open");

  // 4. seal the buyer mandate (Northwind preset)
  await page.goto(`${BASE}/agreements/${room}/seal`, { waitUntil: "domcontentloaded" });
  const northwind = page.getByRole("button", { name: /Northwind/ }).first();
  if (await northwind.waitFor({ timeout: 30_000 }).then(() => true, () => false)) await northwind.click();
  const sealBtn = page.getByRole("button", { name: "Seal as the buyer" });
  await sealBtn.waitFor({ timeout: 30_000 });
  await sealBtn.click();
  await page.getByText("Sealed as the buyer").first().waitFor({ timeout: 180_000 });
  mark("sealed");
  await shot(page, "sealed");

  // 5. the room: the demo counterparty acts on its own; the buyer clicks whatever is theirs to do
  await page.goto(`${BASE}/agreements/${room}`, { waitUntil: "domcontentloaded" });
  const clickIf = async (loc, what) => {
    if (!(await enabled(loc))) return false;
    log("click:", what);
    try { await loc.first().click({ timeout: 15_000 }); } catch (e) { log("click failed:", what, e.message.split("\n")[0]); return false; }
    return true;
  };
  let lastAgentNote = "";
  let lastNext = "";
  let startedAt = 0;
  while (!reached.revoked) {
    if (Date.now() > DEADLINE) throw new Error("the deadline passed before revoke");
    at("room loop");
    // a refresh that lands on a failed chain read (an RPC rate limit) shows the 404 page; read the room again
    if (await visible(page.getByText("This page could not be found"))) {
      log("the room page answered 404 (a failed chain read); reloading");
      await page.goto(`${BASE}/agreements/${room}`, { waitUntil: "domcontentloaded" }).catch(() => undefined);
      await page.waitForTimeout(3000);
      continue;
    }
    stalls();
    // the Demo counterparty panel's "next" line says whose move it is
    const next = await page.locator("span.eyebrow", { hasText: /^next$/ }).locator("xpath=following-sibling::span[1]").first().innerText().catch(() => "");
    if (next && next !== lastNext) { lastNext = next; log("counterparty next:", next.replace(/\s+/g, " ").slice(0, 200)); }
    if (await visible(page.getByText("demo agent run by Accord for this test room"))) mark("executing");

    if (await clickIf(page.getByRole("button", { name: "Approve these terms" }), "approve terms")) { mark("approved"); }
    else if (await clickIf(page.getByRole("button", { name: /^Accept recipient / }), "accept recipient")) { mark("recipient accepted"); }
    else if (await clickIf(page.getByRole("button", { name: /^Fund .* t?USDC$/ }), "fund")) { mark("fund clicked"); }
    else if (await clickIf(page.getByRole("button", { name: /^Activate recipient / }), "activate recipient")) { mark("recipient activated"); }
    else if (await clickIf(page.getByRole("button", { name: /^Accept delivery / }), "accept delivery")) { mark("delivery accepted"); }
    else if (await clickIf(page.getByRole("button", { name: "Start the demo agent" }), "start the demo agent")) { mark("agent started"); startedAt = Date.now(); }
    else if (reached.paid && !reached.refused && await clickIf(page.getByRole("button", { name: "Ask the agent to pay a new account" }), "agent pay a new account")) { /* result below */ }
    else if (reached.refused) {
      const hold = page.getByRole("button", { name: /Hold to revoke/ });
      if (await enabled(hold)) {
        // the hold button confirms on a held Space key as well as a held pointer; the key is the steadier gesture here
        log("hold: revoke");
        at("hold to revoke");
        await hold.first().focus();
        await page.keyboard.down("Space");
        await page.waitForTimeout(1800);
        await page.keyboard.up("Space");
        at("wait for Agent revoked");
        const ok = await page.getByText(/Agent revoked/).first().waitFor({ timeout: 90_000 }).then(() => true, () => false);
        if (!ok) {
          const err = await page.locator("[role=status]").allInnerTexts().catch(() => []);
          log("no revoke yet; status lines:", JSON.stringify(err).slice(0, 400), "; trying again");
          await page.goto(`${BASE}/agreements/${room}`, { waitUntil: "domcontentloaded" }).catch(() => undefined);
          await page.waitForTimeout(3000);
          continue;
        }
        mark("revoked");
        await shot(page, "revoked");
        break;
      }
    }

    // wait for a click's outcome, then read the demo agent's last result
    at("wait for the network");
    await page.waitForFunction(() => !/Waiting for the network…|Opening the room…|Sealing in this browser…/.test(document.body.innerText), null, { timeout: 180_000 }).catch(() => log("still waiting for the network after 180 s"));
    // auto-pay: never clicked here. The agent pays the accepted item on its own; the agent bar's reply line and the
    // Activity tab say "Paid item N", and the transcript shows payment_sent
    if (!reached.paid && reached["delivery accepted"]) {
      const body = await page.locator("body").innerText().catch(() => "");
      const m = body.match(/Paid item (\d+)[^\n]*/) ?? (/payment_sent/.test(body) ? ["payment_sent"] : null);
      if (m) {
        mark("paid", `auto-pay with no click: ${m[0].slice(0, 160)}${startedAt ? ` (${Math.round((Date.now() - startedAt) / 1000)} s after the agent started)` : ""}`);
        await shot(page, "auto-paid");
      }
    }
    const agentBox = page.locator("[role=status]").filter({ hasText: /refused|could not|Asked to pay/ });
    at("read results");
    if (await visible(agentBox)) {
      const t = (await agentBox.first().innerText()).replace(/\s+/g, " ");
      if (t !== lastAgentNote) { lastAgentNote = t; log("agent:", t.slice(0, 300)); }
      if (/ERR_PAYEE_MISMATCH/.test(t)) { mark("refused", "ERR_PAYEE_MISMATCH"); await shot(page, "refused"); }
    }
    const actionResult = page.locator("p[role=status]").filter({ hasText: /:/ });
    if (await visible(actionResult)) {
      const t = (await actionResult.first().innerText()).replace(/\s+/g, " ").slice(0, 200);
      if (t !== reached.__lastAction) { reached.__lastAction = t; log("result:", t); }
    }
    await page.waitForTimeout(5000);
  }

  // 6. Finish: close the room early (mutual_close, the demo vendor joins), withdraw_near, and delete the throwaway
  // account with the faucet as beneficiary. The faucet's NEAR is read before and after through the app's own API.
  at("finish");
  // the read API answers { busy: true } while the network is busy: ask again a few times
  const FAUCET = process.env.FAUCET ?? "faucet.accord-v2.testnet";
  const TOKEN = process.env.ACCORD_TOKEN ?? "tusdc.accord-v1.testnet";
  const RPCS = (process.env.NEAR_RPC_URL ?? "").split(",").filter(Boolean).concat(["https://test.rpc.fastnear.com", "https://rpc.testnet.near.org"]);
  const rpcQuery = async (params) => {
    for (let i = 0; i < 12; i++) {
      const url = RPCS[i % RPCS.length];
      try {
        const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(10_000), body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "query", params: { finality: "final", ...params } }) });
        const b = await r.json();
        if (b.result) return b.result;
      } catch { /* the next endpoint */ }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error(`could not read ${JSON.stringify(params)}`);
  };
  const near = async (a) => (await rpcQuery({ request_type: "view_account", account_id: a })).amount;
  const tusdc = async (a) => JSON.parse(Buffer.from((await rpcQuery({ request_type: "call_function", account_id: TOKEN, method_name: "ft_balance_of", args_base64: Buffer.from(JSON.stringify({ account_id: a })).toString("base64") })).result).toString());
  const fmtNear = (y) => (Number(BigInt(y) / 10n ** 21n) / 1000).toFixed(3);
  const fmtUsdc = (u) => (Number(BigInt(u)) / 1e6).toFixed(2);
  await page.goto(`${BASE}/try-it`, { waitUntil: "domcontentloaded" });
  const finish = page.getByRole("button", { name: /^Finish: close the room/ });
  await finish.waitFor({ timeout: 90_000 });
  const before = await near(FAUCET);
  const usdcBefore = await tusdc(FAUCET);
  log(`faucet before Finish: ${fmtNear(before)} NEAR (${before} yocto), ft_balance_of ${fmtUsdc(usdcBefore)} tUSDC (${usdcBefore})`);
  await finish.click();
  await page.getByRole("button", { name: "Finishing…" }).waitFor({ timeout: 10_000 }).catch(() => undefined);
  finished = true;
  await page.waitForFunction(() => !Array.from(document.querySelectorAll("button")).some((x) => x.textContent === "Finishing…"), null, { timeout: 300_000, polling: 1000 });
  const outcome = (await page.locator("[role=status]").allInnerTexts()).join(" | ").replace(/\s+/g, " ");
  log("finish:", outcome.slice(0, 300));
  if (!/^Done\./.test(outcome) && !/ Done\./.test(outcome)) throw new Error(`Finish did not complete: ${outcome.slice(0, 200)}`);
  await page.waitForTimeout(6000);
  const after = await near(FAUCET);
  const usdcAfter = await tusdc(FAUCET);
  const gainNear = BigInt(after) - BigInt(before), gainUsdc = BigInt(usdcAfter) - BigInt(usdcBefore);
  log(`faucet after Finish: ${fmtNear(after)} NEAR (${after} yocto), ft_balance_of ${fmtUsdc(usdcAfter)} tUSDC (${usdcAfter})`);
  log(`faucet gained ${gainNear} yoctoNEAR (${fmtNear(gainNear)} NEAR) and ${gainUsdc} tUSDC base units (${fmtUsdc(gainUsdc)} tUSDC)`);
  if (gainNear <= 0n) log("WARNING: no NEAR came back to the faucet");
  if (gainUsdc <= 0n) log("WARNING: no tUSDC came back to the faucet");
  mark("finished", `faucet +${fmtNear(gainNear)} NEAR, +${fmtUsdc(gainUsdc)} tUSDC`);
  await shot(page, "finished");
  log("after Finish, key in sessionStorage:", await page.evaluate(() => !!sessionStorage.getItem("accord-throwaway-key")));
  // the Done box names the room it closed, with Verify, and keeps it after a reload (sessionStorage)
  const roomLine = /Room (a\d+\.[a-z0-9.-]+) · Verify it/;
  const m = outcome.match(roomLine);
  if (!m) throw new Error(`the Done box does not name the room: ${outcome.slice(0, 200)}`);
  log("done box:", m[0], "→", await page.getByRole("link", { name: "Verify it →" }).first().getAttribute("href"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByText(roomLine).first().waitFor({ timeout: 30_000 });
  mark("room id kept after reload", m[1]);
  exit = 0;
} catch (e) {
  log("FAILED:", e.message);
  await shot(page, "failed").catch(() => undefined);
} finally {
  if (!finished) await finishFallback();
  delete reached.__lastAction;
  clearInterval(watchdog);
  log("summary", JSON.stringify(reached));
  const slow = durations.filter((d) => d.ms > 20_000);
  const top = [...durations].sort((a, b) => b.ms - a.ms).slice(0, 5).map((d) => `${(d.ms / 1000).toFixed(1)} s ${d.what.slice(0, 90)}`);
  log(`requests: ${durations.length}, over 20 s: ${slow.length}; max ${durations.length ? (Math.max(...durations.map((d) => d.ms)) / 1000).toFixed(1) : 0} s; slowest: ${top.join(" | ")}`);
  for (const d of durations) log(`request ${(d.ms / 1000).toFixed(1)} s ${d.what.slice(0, 140)}${d.ms > 20_000 ? "  <-- OVER 20 s" : ""}`);
  await browser.close();
  process.exit(exit);
}

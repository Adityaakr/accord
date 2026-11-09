// End-to-end: the wallet-free try-it path, driven in a real browser. Not part of CI: it spends testnet funds from
// Accord's faucet and takes about ten minutes. It opens /app/try-it, chooses "Try without a wallet", and clicks
// through every buyer step (the faucet and the room open on their own, then seal, approve, accept the recipient,
// fund, accept the delivery, start the demo agent, pay, ask it to pay a new account, revoke), then Finish: the room
// closes early, its NEAR comes back and the throwaway account deletes itself into the faucet.
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
  let paidAt = 0;
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
    else if (await clickIf(page.getByRole("button", { name: "Start the demo agent" }), "start the demo agent")) { mark("agent started"); }
    else if (reached["delivery accepted"] && !reached.paid && Date.now() - paidAt > 15_000 && await clickIf(page.getByRole("button", { name: "Let the agent pay the due item" }), "agent pay")) { paidAt = Date.now(); }
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
    const agentBox = page.locator("[role=status]").filter({ hasText: /Paid item|refused|Item \d|could not|Asked to pay/ });
    at("read results");
    if (await visible(agentBox)) {
      const t = (await agentBox.first().innerText()).replace(/\s+/g, " ");
      if (t !== lastAgentNote) { lastAgentNote = t; log("agent:", t.slice(0, 300)); }
      if (/Paid item/.test(t)) { mark("paid"); await shot(page, "paid"); }
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
  const near = async (a) => {
    for (let i = 0; i < 10; i++) {
      const n = await page.evaluate(async ([base, a]) => (await (await fetch(`${new URL(base).pathname}/api/chain/balances?account=${a}`, { cache: "no-store" })).json()).near ?? null, [BASE, a]);
      if (n !== null) return n;
      await page.waitForTimeout(3000);
    }
    throw new Error(`could not read ${a}'s NEAR`);
  };
  const FAUCET = process.env.FAUCET ?? "faucet.accord-v2.testnet";
  await page.goto(`${BASE}/try-it`, { waitUntil: "domcontentloaded" });
  const finish = page.getByRole("button", { name: /^Finish: close the room/ });
  await finish.waitFor({ timeout: 90_000 });
  const before = await near(FAUCET);
  log("faucet before Finish:", before);
  await finish.click();
  await page.getByRole("button", { name: "Finishing…" }).waitFor({ timeout: 10_000 }).catch(() => undefined);
  await page.waitForFunction(() => !Array.from(document.querySelectorAll("button")).some((x) => x.textContent === "Finishing…"), null, { timeout: 300_000, polling: 1000 });
  const outcome = (await page.locator("[role=status]").allInnerTexts()).join(" | ").replace(/\s+/g, " ");
  log("finish:", outcome.slice(0, 300));
  if (!/^Done\./.test(outcome) && !/ Done\./.test(outcome)) throw new Error(`Finish did not complete: ${outcome.slice(0, 200)}`);
  await page.waitForTimeout(6000);
  const after = await near(FAUCET);
  log("faucet after Finish:", after, "gained", (BigInt(after) - BigInt(before)).toString(), "yoctoNEAR");
  mark("finished", `faucet +${(Number((BigInt(after) - BigInt(before)) / 10n ** 21n) / 1000).toFixed(3)} NEAR`);
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
  delete reached.__lastAction;
  clearInterval(watchdog);
  log("summary", JSON.stringify(reached));
  const slow = durations.filter((d) => d.ms > 20_000);
  const top = [...durations].sort((a, b) => b.ms - a.ms).slice(0, 5).map((d) => `${(d.ms / 1000).toFixed(1)} s ${d.what.slice(0, 90)}`);
  log(`requests: ${durations.length}, over 20 s: ${slow.length}; slowest: ${top.join(" | ")}`);
  await browser.close();
  process.exit(exit);
}

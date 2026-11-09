// End-to-end: the wallet-free try-it path, driven in a real browser. Not part of CI: it spends testnet funds from
// Accord's faucet and takes about ten minutes. It opens /app/try-it, chooses "Try without a wallet", and clicks
// through every buyer step (the faucet and the room open on their own, then seal, approve, accept the recipient,
// fund, accept the delivery, start the demo agent, pay, ask it to pay a new account, revoke).
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
const mark = (k, extra = "") => { if (!reached[k]) { reached[k] = Math.round((Date.now() - t0) / 1000); log("REACHED", k, extra); } };
let shotN = 0;
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, `${String(++shotN).padStart(2, "0")}-${name}.png`), fullPage: true }); };

const browser = await chromium.launch({ headless: !process.env.HEADED });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
const page = await ctx.newPage();
page.on("pageerror", (e) => log("pageerror", e.message));
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
  await page.getByText("Throwaway testnet key").first().waitFor({ timeout: 15_000 });
  const account = await page.locator("span.mono").filter({ hasText: /^[0-9a-f]{64}$/ }).first().innerText();
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
    await loc.first().click();
    return true;
  };
  let lastAgentNote = "";
  let paidAt = 0;
  while (!reached.revoked) {
    if (Date.now() > DEADLINE) throw new Error("the deadline passed before revoke");
    const body = await page.locator("main").innerText().catch(() => "");
    if (/Executing/.test(body)) mark("executing");

    if (await clickIf(page.getByRole("button", { name: "Approve these terms" }), "approve terms")) { mark("approved"); }
    else if (await clickIf(page.getByRole("button", { name: /^Accept recipient / }), "accept recipient")) { mark("recipient accepted"); }
    else if (await clickIf(page.getByRole("button", { name: /^Fund .* USDC$/ }), "fund")) { mark("fund clicked"); }
    else if (await clickIf(page.getByRole("button", { name: /^Accept delivery / }), "accept delivery")) { mark("delivery accepted"); }
    else if (await clickIf(page.getByRole("button", { name: "Start the demo agent" }), "start the demo agent")) { mark("agent started"); }
    else if (!reached.paid && Date.now() - paidAt > 15_000 && await clickIf(page.getByRole("button", { name: "Let the agent pay the due item" }), "agent pay")) { paidAt = Date.now(); }
    else if (reached.paid && !reached.refused && await clickIf(page.getByRole("button", { name: "Ask the agent to pay a new account" }), "agent pay a new account")) { /* result below */ }
    else if (reached.refused) {
      const hold = page.getByRole("button", { name: /Hold to revoke/ });
      if (await enabled(hold)) {
        log("hold: revoke");
        const box = await hold.first().boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(1600);
        await page.mouse.up();
        await page.getByText(/Agent revoked/).waitFor({ timeout: 120_000 });
        mark("revoked");
        await shot(page, "revoked");
        break;
      }
    }

    // wait for a click's outcome, then read the demo agent's last result
    await page.waitForFunction(() => !/Waiting for the network…|Opening the room…|Sealing in this browser…/.test(document.body.innerText), null, { timeout: 180_000 }).catch(() => undefined);
    const agentBox = page.locator("[role=status]").filter({ hasText: /Paid item|refused|Item \d|could not|Asked to pay/ });
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

  // 6. Reset deletes the key from the tab
  const reset = page.getByRole("button", { name: "Reset" }).first();
  if (await visible(reset)) {
    await reset.click();
    await page.waitForTimeout(1500);
    log("after Reset, key in sessionStorage:", await page.evaluate(() => !!sessionStorage.getItem("accord-throwaway-key")));
  }
  exit = 0;
} catch (e) {
  log("FAILED:", e.message);
  await shot(page, "failed").catch(() => undefined);
} finally {
  delete reached.__lastAction;
  log("summary", JSON.stringify(reached));
  await browser.close();
  process.exit(exit);
}

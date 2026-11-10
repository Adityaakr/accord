// Runs once when the app server starts (Next.js instrumentation). It starts the refusal alert timer
// (server/alerts.ts) and reads the Telegram bot's messages (server/telegrambot.ts: Start on a connect link), so refusals are scanned and alerts sent while nobody has a page open. Node runtime only;
// ALERTS=off leaves it off. It also warms the release check (warmVerify, below).

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  warmVerify();
  if (process.env.ALERTS === "off") return;
  const secs = Math.max(5, Number(process.env.ALERT_TICK_SECS ?? 15));
  const { maybeAlerts } = await import("./server/alerts");
  const { pollTelegram } = await import("./server/telegrambot");
  const g = globalThis as { __accordAlertTimer?: ReturnType<typeof setInterval> };
  if (g.__accordAlertTimer) return;
  g.__accordAlertTimer = setInterval(() => { try { maybeAlerts(); void pollTelegram(); } catch { /* the next tick tries again */ } }, secs * 1000);
  g.__accordAlertTimer.unref?.();
}

/* Warm the release check once the server is up: each release's three enclave job runs are proven once with
   outlayer-verify and cached (packages/sdk release-node.ts), so the first visitor to /api/verify gets the cached
   verdict instead of waiting on a cold run. a63 covers release 5's job builds, a6 releases 3 and 4's. */
function warmVerify() {
  if (process.env.VERIFY_WARM === "off") return;
  const port = process.env.PORT || "3000";
  const t = setTimeout(() => {
    for (const id of ["a63.accord-v2.testnet", "a6.accord-v2.testnet"]) {
      fetch(`http://127.0.0.1:${port}/app/api/verify/${id}`, { signal: AbortSignal.timeout(240_000) }).catch(() => { /* warming only */ });
    }
  }, 15_000);
  t.unref?.();
}

// Runs once when the app server starts (Next.js instrumentation). It starts the refusal alert timer
// (server/alerts.ts), so refusals are scanned and alerts sent while nobody has a page open. Node runtime only;
// ALERTS=off leaves it off.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.ALERTS === "off") return;
  const secs = Math.max(5, Number(process.env.ALERT_TICK_SECS ?? 15));
  const { maybeAlerts } = await import("./server/alerts");
  const g = globalThis as { __accordAlertTimer?: ReturnType<typeof setInterval> };
  if (g.__accordAlertTimer) return;
  g.__accordAlertTimer = setInterval(() => { try { maybeAlerts(); } catch { /* the next tick tries again */ } }, secs * 1000);
  g.__accordAlertTimer.unref?.();
}

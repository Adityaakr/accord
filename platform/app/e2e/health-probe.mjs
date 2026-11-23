// Health probe for the hosted demo: no browser, no key, no spend. Run by .github/workflows/demo-health.yml every hour
// (the full "Try a deal" run, try-without-wallet.mjs, runs there every third hour because each one spends testnet NEAR).
//
//   node platform/app/e2e/health-probe.mjs [site]      site defaults to https://useaccord.tech
//
// Checks: the website and /healthz answer 200; /app/try-it renders; /app/api/status reads a testnet block and the
// keeper's, the demo agent's and the /try re-arm's heartbeats are under MAX_HEARTBEAT_MIN minutes old;
// /app/api/verify/<VERIFY_DEAL> returns checks with none failed; the faucet holds at least MIN_FAUCET_NEAR NEAR.
// One line per check, then `health: N ok` (exit 0) or `health: N ok · M failed` (exit 1).

const SITE = (process.argv[2] ?? process.env.SITE ?? "https://useaccord.tech").replace(/\/$/, "");
const VERIFY_DEAL = process.env.VERIFY_DEAL ?? "a106.accord-v2.testnet";
const FAUCET = process.env.FAUCET ?? "faucet.accord-v2.testnet";
const MIN_FAUCET_NEAR = Number(process.env.MIN_FAUCET_NEAR ?? 10);
const MAX_HEARTBEAT_MIN = Number(process.env.MAX_HEARTBEAT_MIN ?? 30);
const RPCS = ["https://test.rpc.fastnear.com", "https://rpc.testnet.near.org"];

const results = [];
const check = async (name, fn) => {
  try {
    const detail = await fn();
    results.push({ name, ok: true });
    console.log(`ok      ${name} · ${detail}`);
  } catch (e) {
    results.push({ name, ok: false });
    console.log(`FAILED  ${name} · ${String(e?.message ?? e).slice(0, 300)}`);
  }
};
const get = async (path, timeoutMs = 30_000) => {
  const t = Date.now();
  const res = await fetch(SITE + path, { signal: AbortSignal.timeout(timeoutMs), headers: { "user-agent": "accord-demo-health" } });
  if (res.status !== 200) throw new Error(`${path}: HTTP ${res.status}`);
  return { res, ms: Date.now() - t };
};

await check("site", async () => { const { ms } = await get("/"); return `/ 200 in ${ms} ms`; });
await check("healthz", async () => { const { ms } = await get("/healthz"); return `/healthz 200 in ${ms} ms`; });
await check("try-it", async () => {
  const { res, ms } = await get("/app/try-it");
  const html = await res.text();
  if (!/Try without a wallet/i.test(html)) throw new Error("/app/try-it does not offer \"Try without a wallet\"");
  return `/app/try-it 200 in ${ms} ms, offers "Try without a wallet"`;
});
await check("status", async () => {
  const { res } = await get("/app/api/status");
  const s = await res.json();
  if (!(s?.rpc?.block > 0)) throw new Error(`no testnet block: ${JSON.stringify(s?.rpc ?? null)}`);
  const beats = new Map((s.heartbeats ?? []).map((h) => [h.service, h]));
  const stale = [];
  for (const svc of ["keeper", "agent", "rearm"]) {
    const h = beats.get(svc);
    const age = h ? (Date.now() - Date.parse(h.at)) / 60_000 : Infinity;
    if (!(age <= MAX_HEARTBEAT_MIN)) stale.push(`${svc} ${h ? `${Math.round(age)} min old` : "missing"}`);
  }
  if (stale.length) throw new Error(`heartbeats over ${MAX_HEARTBEAT_MIN} min: ${stale.join(", ")}`);
  return `block ${s.rpc.block}, keeper/agent/rearm heartbeats under ${MAX_HEARTBEAT_MIN} min`;
});
await check("verify", async () => {
  const { res } = await get(`/app/api/verify/${VERIFY_DEAL}`, 90_000);
  const v = await res.json();
  const checks = v?.checks ?? [];
  if (!checks.length) throw new Error(`no checks for ${VERIFY_DEAL}`);
  const failed = checks.filter((c) => c.status === "failed" || c.status === "fail");
  if (failed.length) throw new Error(`${VERIFY_DEAL}: ${failed.map((c) => `${c.name} ${c.detail ?? ""}`).join("; ")}`);
  return `${VERIFY_DEAL}: ${checks.map((c) => `${c.name} ${c.status}`).join(", ")}`;
});
await check("faucet", async () => {
  let last;
  for (const url of RPCS) {
    try {
      const res = await fetch(url, {
        method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "query", params: { request_type: "view_account", finality: "final", account_id: FAUCET } }),
      });
      const j = await res.json();
      if (!j.result) throw new Error(JSON.stringify(j.error ?? j).slice(0, 200));
      const near = Number(BigInt(j.result.amount) / 10n ** 21n) / 1000;
      if (near < MIN_FAUCET_NEAR) throw new Error(`${FAUCET} holds ${near} NEAR, under ${MIN_FAUCET_NEAR}`);
      return `${FAUCET} ${near} NEAR`;
    } catch (e) { last = e; if (/under/.test(String(e?.message))) throw e; }
  }
  throw last;
});

const failed = results.filter((r) => !r.ok).length;
console.log(`health: ${results.length - failed} ok${failed ? ` · ${failed} failed` : ""}`);
process.exit(failed ? 1 : 0);

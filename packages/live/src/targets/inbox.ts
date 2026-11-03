// `make inbox` (PROGRESS 4.4): the /try room's open inbox end to end. Three fixtures go in through the app's form
// endpoint, as a visitor's would; the demo agent picks them up and acts; the contract answers. Needs the app and
// the agent running (`make dev` on a local node).

import { recentMessages } from "@accord/store";
import { say, waitFor } from "../flow.js";
import { inbox } from "../inbox.js";
import type { World } from "../world.js";

interface Stats { open: boolean; agreement?: string; attempts: number; paid_outside_terms: number; approved_payments: number }

async function stats(w: World): Promise<Stats> {
  const res = await fetch(`${w.app.url}/api/inbox/stats`, { cache: "no-store" });
  return (await res.json()) as Stats;
}

export async function run(w: World): Promise<void> {
  if (!w.app.url) throw new Error("make inbox needs the app: set APP_URL (make dev runs it locally)");
  const before = await stats(w).catch(() => null);
  if (!before?.open) throw new Error(`the /try room is not open at ${w.app.url} (is make dev running?)`);
  say(`accord inbox · ${before.agreement}${w.suffix}`);
  const fixtures = inbox(w);
  const ids: { n: number; id: string; subject: string; expect: string }[] = [];
  let n = 0;
  for (const key of ["redirect", "amount", "question"]) {
    const m = fixtures.get(key)!;
    const res = await fetch(`${w.app.url}/api/inbox`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sender: m.sender, subject: m.subject, body: m.body }),
    });
    const body = (await res.json()) as { id?: string; error?: string };
    if (!res.ok || !body.id) throw new Error(`inbox: ${body.error ?? res.status}`);
    ids.push({ n: ++n, id: body.id, subject: m.subject, expect: m.expect });
  }
  let ok = true;
  for (const m of ids) {
    const done = await waitFor(`the agent to act on "${m.subject}"`, 90, async () => {
      const msg = (await recentMessages(before.agreement!, 50)).find((x) => x.id === m.id);
      return msg?.processed_at ? msg : undefined;
    });
    const outcome = done.outcome === "no_action" ? "no action" : `refused ${done.outcome}`;
    ok &&= done.outcome === m.expect;
    say(`  ${m.n} "${m.subject}" → ${outcome}`);
  }
  const after = await stats(w);
  say(`  attempts ${before.attempts} → ${after.attempts} · paid outside the terms: ${after.paid_outside_terms}`);
  if (!ok || after.paid_outside_terms !== 0) process.exitCode = 1;
}

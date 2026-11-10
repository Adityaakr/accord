// The keeper's observer polling (ARCHITECTURE.md 9.2, PROGRESS 2.9): for every open market-making period, ask the
// observer about each slot whose window has opened and that has no observation on chain yet, and submit what it
// signs. The observer answers `not_yet` (unsigned, saying nothing about the time) until the hidden slot time and
// a final mainnet block after it exist, so asking early costs a call and reveals nothing.

import type { AgreementClient, AtlasTerms, Observation, PeriodView } from "@accord/sdk";

export interface SlotAsk { period: number; slot: number }

/** The slots worth asking about now: window open, period still open, no observation recorded. */
export function slotsToAsk(
  atlas: Pick<AtlasTerms, "period_secs" | "slots_per_period">,
  periods: readonly PeriodView[],
  recorded: ReadonlyMap<number, ReadonlySet<number>>,
  now: number,
): SlotAsk[] {
  const window = Math.floor(atlas.period_secs / Math.max(1, atlas.slots_per_period));
  const out: SlotAsk[] = [];
  for (const p of periods) {
    if (p.outcome !== "Open" || p.starts_at === undefined || p.starts_at > now) continue;
    if (p.closable_at !== undefined && now >= p.closable_at) continue;
    const have = recorded.get(p.period) ?? new Set<number>();
    for (let slot = 0; slot < atlas.slots_per_period; slot++) {
      if (have.has(slot)) continue;
      if (p.starts_at + slot * window > now) break;
      out.push({ period: p.period, slot });
    }
  }
  return out;
}

export type ObserverOutput =
  | ({ mode: "observe"; status: "observed"; sig: string } & Observation)
  | { mode: "observe"; status: "not_yet" }
  | { mode: string; status: "error"; error: string };

/** `wasmHash` is the observer build the agreement pins (`jobs.observer.wasm_hash`); OutLayer runs that version. */
export type AskObserver = (agreement: string, ask: SlotAsk, wasmHash?: string) => Promise<ObserverOutput>;

/** Where the observer runs: the local OutLayer on a local node, or OutLayer's HTTPS API on testnet. */
export type ObserverConfig =
  | { kind: "local"; url: string }
  | { kind: "outlayer"; api: string; owner: string; project: string; paymentKey: string };

const OBSERVER_TIMEOUT_MS = 30_000;

/**
 * The observer as a function. Local: `POST <url>` with the job input, the job output back. OutLayer
 * (app.outlayer.ai/docs/https-api): `POST <api>/call/<owner>/<project>` with `X-Payment-Key`, body `{input, secrets_ref,
 * version_key}`, reply `{status, output}` where `output` is the job's stdout (a JSON string, or already parsed).
 * `secrets_ref` names the owner's `default` profile, as `request_execution` does on chain: without it OutLayer injects no
 * secrets and the observer answers `PROTECTED_OBSERVER_SEED is not set` (a54.accord-v2.testnet, 10 Nov 2026).
 * `version_key` pins the agreement's own observer build; without it OutLayer runs the project's active version.
 */
export function observerFor(cfg: ObserverConfig): AskObserver {
  return async (agreement, ask, wasmHash) => {
    const input = { mode: "observe", agreement, period: ask.period, slot: ask.slot };
    const local = cfg.kind === "local";
    const res = await fetch(local ? cfg.url : `${cfg.api}/call/${cfg.owner}/${cfg.project}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(local ? {} : { "x-payment-key": cfg.paymentKey }) },
      body: JSON.stringify(local ? input : {
        input,
        secrets_ref: { profile: "default", account_id: cfg.owner },
        ...(wasmHash ? { version_key: wasmHash } : {}),
      }),
      signal: AbortSignal.timeout(OBSERVER_TIMEOUT_MS),
    });
    const body = (await res.json()) as Record<string, unknown>;
    if (local) {
      if (!res.ok || !("mode" in body)) throw new Error(`observer ${res.status}: ${String(body.error ?? "")}`);
      return body as ObserverOutput;
    }
    if (body.status !== "completed") throw new Error(`outlayer ${res.status} ${String(body.status)}: ${String(body.error ?? "")}`);
    const out = typeof body.output === "string" ? JSON.parse(body.output) : body.output;
    return out as ObserverOutput;
  };
}

/** The observation `record_observation` takes: the signed object without `sig`, `mode` and `status`. */
export function observationOf(out: Extract<ObserverOutput, { status: "observed" }>): Observation {
  const { sig: _sig, mode: _mode, status: _status, ...observation } = out;
  return observation;
}

/** One pass for one agreement; returns a line per observation recorded. */
export async function observeAgreement(
  deal: AgreementClient,
  atlas: AtlasTerms,
  now: number,
  ask: AskObserver,
  wasmHash?: string,
): Promise<string[]> {
  const periods = await deal.periods();
  const recorded = new Map<number, Set<number>>();
  for (const p of periods) {
    if (p.outcome !== "Open" || p.starts_at === undefined || p.starts_at > now) continue;
    const obs = await deal.observations(p.period);
    recorded.set(p.period, new Set(obs.map((o) => o.observation.slot)));
  }
  const lines: string[] = [];
  for (const s of slotsToAsk(atlas, periods, recorded, now)) {
    // One slot's failure (an observer error, a timeout, a rejected record) never stops the others.
    let out: ObserverOutput;
    try {
      out = await ask(deal.id, s, wasmHash);
    } catch (e) {
      lines.push(`observe ${deal.id} · period ${s.period + 1} slot ${s.slot + 1} · ${(e as Error).message.slice(0, 160)}`);
      continue;
    }
    if (out.status === "not_yet") continue;
    if (out.status !== "observed") {
      lines.push(`observe ${deal.id} · period ${s.period + 1} slot ${s.slot + 1} · ${out.error}`);
      continue;
    }
    const tx = await deal.recordObservation(observationOf(out), out.sig).catch((e: Error) => e);
    if (tx instanceof Error) {
      lines.push(`observe ${deal.id} · period ${s.period + 1} slot ${s.slot + 1} · record failed: ${tx.message.slice(0, 160)}`);
      continue;
    }
    lines.push(
      `observe ${deal.id} · period ${s.period + 1} slot ${s.slot + 1} · mainnet block ${out.venue_block.height} · ` +
        `spread ${out.spread_bps} bps · tx ${tx.txHash}`,
    );
  }
  return lines;
}

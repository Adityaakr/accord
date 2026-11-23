// Why a room ended `No deal`, from what the chain recorded. Pure, so it is tested on recorded transactions.
//
// A no-deal the Sealed Table signed carries its own reason (`no_deal_reason`: the limits did not overlap, a side
// walked away, or a mandate was malformed). An `INFRASTRUCTURE` no-deal means no attempt's answer was one the
// contract accepts, and the contract alone cannot tell why: OutLayer returns `null` to it for a failed run and for a
// run that answered after the yield ended alike. OutLayer's own receipt in the same transaction does say, in a log
// line: `Execution failed: "<error>"` when the run failed (since 22 Nov 2026, `output_storage_unpaid` when the
// attached NEAR could not hold the answer: DECISIONS.md section 38), `Execution promise failed` when the yield ended
// before the worker answered. So the cause is read from the attempts' transactions, never assumed.

import type { RawTx } from "./activity";

export type NoDealKind =
  | "limits" // the Sealed Table signed LIMIT_CHECK: the buyer's ceiling and the vendor's floor did not overlap
  | "walk_away" // signed WALK_AWAY: a side's agent ended the negotiation
  | "bad_input" // signed BAD_INPUT: a mandate could not be read
  | "outlayer_error" // OutLayer ran the job and returned an error for it
  | "late" // OutLayer's answer came after NEAR's wait (the yield) ended
  | "rejected" // an answer arrived and the contract refused it (bad signature, wrong nonce, ...)
  | "unknown"; // no signed answer, and the attempts' transactions could not be read

export interface AttemptFailure {
  attempt: number;
  tx: string;
  kind: "outlayer_error" | "late" | "rejected" | "unknown";
  /** OutLayer's error (outlayer_error) or the contract's reason for refusing the answer (rejected) */
  message: string | null;
}

export interface NoDealCause {
  kind: NoDealKind;
  /** OutLayer's error, or the contract's reason, for the last attempt that gave one */
  message: string | null;
  /** the failed attempts, oldest first (infrastructure no-deals only) */
  attempts: AttemptFailure[];
}

interface Ev { event: string; data: Record<string, unknown> }

function accordEvent(line: string): Ev | null {
  if (!line.startsWith("EVENT_JSON:")) return null;
  try {
    const e = JSON.parse(line.slice("EVENT_JSON:".length)) as { standard?: string; event?: string; data?: unknown[] };
    if (e.standard !== "accord" || typeof e.event !== "string") return null;
    const d = Array.isArray(e.data) ? e.data[0] : null;
    return { event: e.event, data: d && typeof d === "object" ? (d as Record<string, unknown>) : {} };
  } catch {
    return null;
  }
}

/** OutLayer's verdict on the run a transaction requested, from its log lines. */
function outlayerVerdict(tx: RawTx, outlayer: string): { kind: "outlayer_error" | "late"; message: string | null } | null {
  for (const r of tx.receipts) {
    if (r.executor !== outlayer) continue;
    for (const l of r.logs) {
      // `Execution failed: "<error>". Resources: {...}. Refunded <n> yoctoNEAR` (the error is a Rust Debug string)
      const failed = /^Execution failed: "((?:[^"\\]|\\.)*)"/.exec(l);
      if (failed) return { kind: "outlayer_error", message: failed[1]!.replace(/\\(.)/g, "$1") };
      if (l.startsWith("Execution promise failed")) return { kind: "late", message: null };
    }
  }
  return null;
}

/** Every failed negotiation attempt in these transactions, oldest first. */
export function attemptFailures(txs: RawTx[], agreement: string, outlayer: string): AttemptFailure[] {
  const out: AttemptFailure[] = [];
  for (const tx of txs) {
    for (const r of tx.receipts) {
      if (r.executor !== agreement) continue;
      for (const l of r.logs) {
        const e = accordEvent(l);
        if (e?.event !== "negotiation_failed") continue;
        const attempt = Number(e.data.attempt);
        const reason = typeof e.data.reason === "string" ? e.data.reason : "";
        const v = outlayerVerdict(tx, outlayer);
        // an answer that arrived but did not verify is the contract's refusal, whatever OutLayer logged
        const kind = reason && reason !== "no signed output" ? "rejected" : v?.kind ?? "unknown";
        out.push({ attempt: Number.isFinite(attempt) ? attempt : 0, tx: tx.hash, kind, message: kind === "rejected" ? reason : kind === "outlayer_error" ? v?.message ?? null : null });
      }
    }
  }
  return out.sort((a, b) => a.attempt - b.attempt);
}

const SIGNED: Record<string, NoDealKind> = { LIMIT_CHECK: "limits", WALK_AWAY: "walk_away", BAD_INPUT: "bad_input" };

/**
 * The cause of a `NoDeal`: the signed no-deal reason when the Sealed Table answered (`sealedOutput` is its stored
 * output), else what the attempts' transactions say (`txs`, null when they could not be read). An OutLayer error on
 * any attempt names the cause; otherwise a late answer; otherwise a refused one.
 */
export function noDealCause(sealedOutput: string | null, txs: RawTx[] | null, agreement: string, outlayer: string): NoDealCause {
  if (sealedOutput) {
    let reason: unknown = null;
    try { reason = (JSON.parse(sealedOutput) as { no_deal_reason?: unknown }).no_deal_reason; } catch { /* not JSON */ }
    return { kind: SIGNED[String(reason)] ?? "unknown", message: typeof reason === "string" ? reason : null, attempts: [] };
  }
  const attempts = txs ? attemptFailures(txs, agreement, outlayer) : [];
  const last = (k: AttemptFailure["kind"]) => [...attempts].reverse().find((a) => a.kind === k);
  const pick = last("outlayer_error") ?? last("late") ?? last("rejected");
  return { kind: pick?.kind ?? "unknown", message: pick?.message ?? null, attempts };
}

/** The first release whose Sealed Table and Payee deposits hold the largest output the agreement accepts. */
export const DEPOSIT_FIXED_IN_RELEASE = 7;

/** OutLayer refused to hold the run's output: the agreement attached too little NEAR (every room of release 6 and earlier). */
export function isStorageUnpaid(c: Pick<NoDealCause, "kind" | "message"> | null | undefined): boolean {
  return c?.kind === "outlayer_error" && !!c.message?.startsWith("output_storage_unpaid");
}

/** One short line for a status pill or a step answer; `release` is the room's own release. */
export function noDealLine(c: NoDealCause | null | undefined, release: number, sym = "tUSDC"): string {
  switch (c?.kind) {
    case "limits": return `No deal: the buyer's ceiling was below the vendor's floor, so the Sealed Table agreed nothing and no money moved. Open a new room with a ceiling of at least ${sym === "USDC" ? 12 : 30} ${sym}.`;
    case "walk_away": return "No deal: one side's agent walked away inside the Sealed Table, so nothing was agreed and no money moved.";
    case "bad_input": return "No deal: the Sealed Table could not read a mandate, so nothing was agreed and no money moved.";
    case "outlayer_error": return isStorageUnpaid(c) && release < DEPOSIT_FIXED_IN_RELEASE
      ? `No deal: OutLayer refused every attempt with output_storage_unpaid. This room's release (${release}) attaches 0.05 NEAR, too little for OutLayer to hold the Sealed Table's answer; nothing was funded. Rooms opened now are on release ${DEPOSIT_FIXED_IN_RELEASE}, which attaches enough.`
      : isStorageUnpaid(c)
      ? `No deal: OutLayer refused every attempt (${c.message}): the NEAR this room attached did not cover what OutLayer asked to hold the Sealed Table's answer. Nothing was funded.`
      : `No deal: OutLayer returned an error for every attempt (${c.message ?? "no message"}), so the two sides' limits were never compared. Nothing was funded.`;
    case "late": return "No deal: OutLayer's enclave worker answered after NEAR's wait on every attempt, so the two sides' limits were never compared. Nothing was funded.";
    case "rejected": return `No deal: the contract refused the answer of every attempt (${c.message ?? "it did not verify"}). Nothing was funded.`;
    default: return "No deal: no signed answer reached the contract on any of the three attempts, so the two sides' limits were never compared. Nothing was funded.";
  }
}

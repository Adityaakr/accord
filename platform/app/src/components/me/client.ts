"use client";

// Shared by the room's Actions and the cross-room pages (Approvals, Agents, Recipients): one way to build the
// signing client, to word an error, and to read a decision back from chain right before it is signed.

import { useEffect, useState } from "react";
import { AccordError, isDemoEvidence, isRpcBusy, type AgreementView, type Signer } from "@accord/sdk";
import type { PublicConfig } from "../AppConfig";
import { browserAccord } from "../chainClient";
import { onVisibleInterval } from "../visible";

/** The agreement client that signs with the person's own wallet; it reads through the app's server */
export function agreementClient(signer: Signer, cfg: PublicConfig, id: string) {
  return browserAccord(cfg, { signer }).agreement(id);
}

/** A read-only agreement client: views through the app's server (/api/chain), no signer */
export function readClient(cfg: PublicConfig, id: string) {
  return browserAccord(cfg).agreement(id);
}

export function errorText(e: unknown): string {
  // every RPC endpoint rate limited or down: a calm line, never the RPC's raw JSON-RPC body
  if (isRpcBusy(e)) return "The network is busy, retrying shortly. Try again in a moment.";
  return e instanceof AccordError ? e.code ?? e.message : (e as Error).message;
}

export function txLine(label: string, r: unknown): { ok: boolean; text: string; txHash?: string } {
  const x = r as { txHash?: string; status?: string; code?: string } | undefined;
  const tail = x?.code ? ` · ${x.code}` : x?.status ? ` · ${x.status}` : "";
  return { ok: !x?.code, text: `${label}${tail}`, txHash: x?.txHash };
}

/** What the chain says right now about the thing about to be signed */
export interface Readback {
  amount: string | null;
  recipient: string | null;
  lines: [string, string][];
  /** Set when the chain no longer matches what the list showed */
  stale: string | null;
  /** The factory that created the room, for the amount's unit */
  factory?: string;
}

export type Decision =
  | { kind: "terms"; termsHash: string | null }
  | { kind: "recipient"; version: number; expect: string[] }
  | { kind: "delivery"; item: number }
  | { kind: "exception"; id: number }
  | { kind: "period"; period: number }
  | { kind: "revoke"; key: string | null }
  | { kind: "cancel-recipient"; version: number };

export async function readBack(cfg: PublicConfig, room: string, d: Decision): Promise<Readback> {
  const c = readClient(cfg, room);
  const view = await c.get();
  const payee = view.recipient?.account ?? null;
  return { ...(await readBackFor(c, view, payee, room, d)), factory: view.factory };
}

async function readBackFor(c: ReturnType<typeof readClient>, view: AgreementView, payee: string | null, room: string, d: Decision): Promise<Readback> {
  switch (d.kind) {
    case "terms": {
      const stale = view.state !== "Attested" ? `The room is now ${view.state}.` : view.terms_hash !== d.termsHash ? "The terms hash changed." : null;
      return { amount: view.total, recipient: payee, stale, lines: [["Terms hash", view.terms_hash ?? "none"], ["Total", view.total]] };
    }
    case "recipient":
    case "cancel-recipient": {
      const v = (await c.recipients()).find((x) => x.version === d.version);
      const expect = d.kind === "recipient" ? d.expect : ["Proposed", "Proven", "AuthorityApproved", "Accepted"];
      const stale = !v ? "This version no longer exists." : !expect.includes(v.status) ? `It is now ${v.status}.` : null;
      return {
        amount: null, recipient: v?.account ?? null, stale,
        lines: v ? [["Domain", v.domain], ["Version", String(v.version)], ["Status", v.status], ["Rating", v.rating ?? "none"]] : [],
      };
    }
    case "delivery": {
      const it = (await c.items()).find((x) => x.id === d.item);
      const stale = !it ? "This item no longer exists." : it.status !== "Delivered" ? `It is now ${it.status}.` : null;
      return { amount: it?.due_amount ?? null, recipient: payee, stale, lines: it?.delivery ? [["Evidence", it.delivery.evidence_hash.slice(0, 16) + "…" + (isDemoEvidence(it.delivery.evidence_hash, room, it.id) ? " (demo delivery evidence)" : "")]] : [] };
    }
    case "exception": {
      const e = (await c.exceptions()).find((x) => x.id === d.id);
      const stale = !e ? "This exception no longer exists." : e.status !== "pending" ? `It was ${e.status}.` : null;
      return { amount: e?.amount ?? null, recipient: payee, stale, lines: e ? [["Item", String(e.item)], ["Asked by", e.by], ["Reason", e.reason]] : [] };
    }
    case "period": {
      const p = (await c.periods()).find((x) => x.period === d.period);
      const stale = !p ? "This period no longer exists." : p.outcome !== "Review" && p.outcome !== "Withheld" ? `It is now ${p.outcome}.` : null;
      return { amount: null, recipient: payee, stale, lines: p ? [["Observations", `${p.passed} of ${p.observed} passed`]] : [] };
    }
    case "revoke": {
      const stale = !view.agent_key ? "No agent key is installed any more." : view.agent_key !== d.key ? "The agent key changed." : null;
      return { amount: null, recipient: null, stale, lines: [["Key", view.agent_key ?? "none"]] };
    }
  }
}

/** Poll one /api/me* read model for the signed-in account */
export function useMe<T>(path: string, account: string | null, every = 15000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!account) { setData(null); return; }
    let live = true;
    const load = () => fetch(`${path}?account=${encodeURIComponent(account)}`, { cache: "no-store" })
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b.error ?? `HTTP ${r.status}`); return b as T; })
      .then((b) => { if (live) { setData(b); setError(null); } })
      .catch((e: Error) => { if (live) setError(e.message); });
    void load();
    const stop = onVisibleInterval(load, every);
    return () => { live = false; stop(); };
  }, [path, account, every, tick]);
  return { data, error, reload: () => setTick((x) => x + 1) };
}

import { useEffect, useState } from "react"

/* Live values (spec §6). Fetched from VITE_ACCORD_API_URL (JSON, same shape as LiveValues);
   if the source is down, the last-known snapshot in /live/last-known.json is shown WITH its timestamp.
   Nothing here is ever a made-up number: a counter the source did not answer is absent, not zero. */
export type Refusal = { at: string; from: string; subject: string; reason: string }
export type LiveValues = {
  asOf: string                 // ISO timestamp of the snapshot
  source: "live" | "last-known"
  attempts?: number | null         // visitor messages sent to the demo agent (inbox store); absent until the store answers
  movedByAttempts?: number | null  // from the contract's events; absent until read, 0 only while the events say so
  lastRefusal: Refusal | null
  agreement: { id: string; state: "Sealed" | "Attested" | "Executing" | "Settled"; terms: { milestone: number; amount: string; due: string }[]; payee: { domain: string; version: number; proof: string }; lastTransfer: { amount: string; to: string; tx: string; at: string } | null }
  balance: { usdc: string; eth: string; address: string }
  refusals: Refusal[]
  slots: { slot: number; result: "PASS" | "FAIL"; spreadP50Bps: number; depthMin: number; uptimePct: number }[]
}

export const API = (import.meta.env as Record<string, string | undefined>).VITE_ACCORD_API_URL

let cache: LiveValues | null = null
const listeners = new Set<(v: LiveValues) => void>()

async function load(): Promise<LiveValues> {
  if (API) {
    try {
      const r = await fetch(API, { cache: "no-store" })
      if (r.ok) { const v = (await r.json()) as LiveValues; return { ...v, source: "live" } }
    } catch { /* fall through to last known */ }
  }
  const r = await fetch("/live/last-known.json", { cache: "no-store" })
  const v = (await r.json()) as LiveValues
  return { ...v, source: "last-known" }
}

function refresh() {
  load().then((v) => { cache = v; listeners.forEach((l) => l(v)) }).catch(() => {})
}

export function useLive(): LiveValues | null {
  const [v, setV] = useState<LiveValues | null>(cache)
  useEffect(() => {
    listeners.add(setV)
    if (!cache) refresh()
    const t = window.setInterval(refresh, 15_000)
    return () => { listeners.delete(setV); window.clearInterval(t) }
  }, [])
  return v
}

/** A counter exists only when the source answered with a finite number (spec §6: no placeholder numbers). */
export const hasCount = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n)

/** The snapshot's timestamp, "29 Oct 2026, 14:02 UTC". The caller sets the label ("Last updated") and, when
    `source === "last-known"`, the "Data unavailable" line; the word "live" is never printed (honesty gate). */
export function asOfLabel(v: LiveValues) {
  const d = new Date(v.asOf)
  return `${d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`
}

/** Clock time of an ISO timestamp in UTC: "14:02 UTC", or "14:02:31 UTC" with seconds (the refusal line). */
export function utcTime(iso: string, seconds = false) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}), timeZone: "UTC" }) + " UTC"
}

/** Panel title-row label (spec §5 Live panel, §6): "last known · 14:02 UTC" when a source failed, else "updated 14:02 UTC". */
export function panelLabel(v: LiveValues) {
  return v.source === "last-known" ? `last known · ${utcTime(v.asOf)}` : `updated ${utcTime(v.asOf)}`
}

/* ---------- The open inbox: POST ${VITE_ACCORD_API_URL}/inbox ---------- */

export type InboxMessage = { from: string; subject: string; body: string }
export type InboxOutcome =
  | { kind: "sent" }
  | { kind: "rate-limited"; retryAt: Date | null }
  | { kind: "down"; status: number | null }     // network error or 5xx: nothing was sent
  | { kind: "rejected"; status: number }        // any other non-2xx answer
  | { kind: "unconfigured" }

/** `Retry-After` is seconds or an HTTP date; a `retryAt` body field is an ISO timestamp or epoch seconds. */
function parseRetryAt(header: string | null, field: unknown): Date | null {
  if (typeof field === "string" || typeof field === "number") {
    const d = typeof field === "number" ? new Date(field * 1000) : new Date(field)
    if (!Number.isNaN(d.getTime())) return d
  }
  if (header) {
    const secs = Number(header)
    if (Number.isFinite(secs)) return new Date(Date.now() + secs * 1000)
    const d = new Date(header)
    if (!Number.isNaN(d.getTime())) return d
  }
  return null
}

/** Sends a visitor message to the inbox store. Only the store is contacted: no key, no contract call. */
export async function sendToInbox(m: InboxMessage): Promise<InboxOutcome> {
  if (!API) return { kind: "unconfigured" }
  let r: Response
  try {
    r = await fetch(`${API.replace(/\/$/, "")}/inbox`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(m),
    })
  } catch {
    return { kind: "down", status: null }
  }
  if (r.ok) return { kind: "sent" }
  if (r.status === 429) {
    let field: unknown = undefined
    try { field = ((await r.json()) as { retryAt?: unknown }).retryAt } catch { /* no body */ }
    return { kind: "rate-limited", retryAt: parseRetryAt(r.headers.get("Retry-After"), field) }
  }
  if (r.status >= 500) return { kind: "down", status: r.status }
  return { kind: "rejected", status: r.status }
}

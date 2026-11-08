import { KNOWN_TX } from "../content/testnet"

/* Public checks of an Accord agreement, run in the browser against NEAR testnet RPC with no keys: the account is an
   agreement of the factory, its code is the factory release it was created on, it holds no full-access key (at most
   one key limited to `act`), and its record (state, approved total, paid, recipient, refusals) as the contract reports
   it. View methods (platform/contracts): factory `is_agreement({account})`, `release({version})`; agreement
   `get_agreement()`. Each row resolves on its own, so one slow call never holds the others. */

export const FACTORY = "accord-v2.testnet"
const PRIMARY = "https://rpc.testnet.near.org"
const FALLBACK = "https://test.rpc.fastnear.com"
/** Ask the fallback too when the primary has not answered by then; give up on a call after TIMEOUT. */
const HEDGE_MS = 1200
const TIMEOUT_MS = 8000

export class RpcDown extends Error {}
export class UnknownAccount extends Error {}

type Json = Record<string, unknown>

async function post(url: string, method: string, params: Json, signal: AbortSignal): Promise<Json> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "verify", method, params }),
    signal,
  })
  if (!r.ok) throw new RpcDown(`${url} answered ${r.status}`)
  const body = (await r.json()) as Json
  if (body.error) {
    const e = body.error as { cause?: { name?: string }; data?: string; message?: string }
    if (e.cause?.name === "UNKNOWN_ACCOUNT") throw new UnknownAccount(String(params.account_id ?? ""))
    throw new Error(e.data ?? e.message ?? "RPC error")
  }
  return body.result as Json
}

/** One JSON-RPC call: the primary endpoint, hedged to the fallback after HEDGE_MS or on failure, abandoned after
    TIMEOUT_MS. The first answer wins; a definite answer (an unknown account, a contract error) is not retried. */
function rpc(method: string, params: Json, outer?: AbortSignal): Promise<Json> {
  return new Promise((resolve, reject) => {
    const ctl = new AbortController()
    let settled = false
    let pending = 0
    let lastErr: unknown = null
    let hedged = false
    let retries = 0 // both endpoints failed fast (a 429, a dropped connection): try again, still inside TIMEOUT_MS
    const done = (fn: () => void) => { if (settled) return; settled = true; clearTimeout(hedge); clearTimeout(timeout); ctl.abort(); fn() }
    const onAbort = () => done(() => reject(new DOMException("aborted", "AbortError")))
    outer?.addEventListener("abort", onAbort, { once: true })
    const attempt = (url: string) => {
      pending++
      post(url, method, params, ctl.signal).then(
        (res) => done(() => resolve(res)),
        (err) => {
          pending--
          if (settled) return
          if (err instanceof UnknownAccount || !(err instanceof RpcDown || err instanceof TypeError)) { done(() => reject(err)); return }
          lastErr = err
          if (!hedged) { hedged = true; attempt(FALLBACK) }
          else if (pending === 0 && retries < 2) { retries++; setTimeout(() => { if (!settled) attempt(retries % 2 ? FALLBACK : PRIMARY) }, 700 * retries) }
          else if (pending === 0) done(() => reject(new RpcDown(String(lastErr))))
        },
      )
    }
    const hedge = setTimeout(() => { if (!hedged) { hedged = true; attempt(FALLBACK) } }, HEDGE_MS)
    const timeout = setTimeout(() => done(() => reject(new RpcDown("timed out"))), TIMEOUT_MS)
    attempt(PRIMARY)
  })
}

const b64 = (o: unknown) => btoa(JSON.stringify(o))

async function view<T>(account: string, method: string, args: unknown, signal?: AbortSignal): Promise<T> {
  const res = await rpc("query", { request_type: "call_function", finality: "final", account_id: account, method_name: method, args_base64: b64(args) }, signal)
  const bytes = res.result as number[]
  return JSON.parse(new TextDecoder().decode(new Uint8Array(bytes))) as T
}

/** "6", "a6" or "a6.accord-v2.testnet" → "a6.accord-v2.testnet"; anything else is taken as an account id. */
export function normaliseId(raw: string): string {
  const v = raw.trim().toLowerCase()
  if (/^\d+$/.test(v)) return `a${v}.${FACTORY}`
  if (/^a\d+$/.test(v)) return `${v}.${FACTORY}`
  return v
}

export type Result = "loading" | "ok" | "not ok" | "not checked" | "no answer"
export type RowKey = "agreement" | "code" | "keys" | "recipient" | "record"
/** A value is text and links: each link segment is the value itself, pointing at its source on the explorer. */
export type Seg = string | { text: string; href: string; copy?: string; copyLabel?: string }
export type Row = { key: RowKey; name: string; value: Seg[]; result: Result }

export const ROWS: { key: RowKey; name: string }[] = [
  { key: "agreement", name: "Agreement" },
  { key: "code", name: "Contract code" },
  { key: "keys", name: "Access keys" },
  { key: "recipient", name: "Recipient" },
  { key: "record", name: "Record" },
]

type AccessKey = { access_key: { permission: "FullAccess" | { FunctionCall: { receiver_id: string; method_names: string[] } } } }
type Agreement = { release: number; state: string; total: string; paid: string; refusals: number; recipient: { version: number; account: string; domain: string } | null }

const usdc = (raw: string, decimals = 6) => {
  const n = BigInt(raw || "0")
  const d = 10n ** BigInt(decimals)
  return `${n / d}.${(n % d).toString().padStart(decimals, "0").slice(0, 2)}`
}
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const NO_ANSWER = "Testnet RPC did not answer"

/** Runs the five checks for `id`, reporting each row as it settles. Every read starts at once; the code check waits
    only for the record (which names the release). Rows other than Agreement report only once the factory has
    listed the account, so a non-agreement never shows a half-filled table. */
/** The hash at the end of an explorer transaction URL */
export const hashOf = (url?: string) => (url && url.includes("/txns/") ? url.split("/txns/")[1] : undefined)
const addr = (a: string) => `https://testnet.nearblocks.io/address/${a}`

export async function verifyAgreement(id: string, report: (key: RowKey, value: Seg[], result: Result) => void, signal?: AbortSignal): Promise<void> {
  const known = KNOWN_TX[id]
  const rest: RowKey[] = ["code", "keys", "recipient", "record"]
  const quiet = <T,>(p: Promise<T>) => { p.catch(() => {}); return p }

  const acct = quiet(rpc("query", { request_type: "view_account", finality: "final", account_id: id }, signal))
  const listed = quiet(view<boolean>(FACTORY, "is_agreement", { account: id }, signal))
  const keyList = quiet(rpc("query", { request_type: "view_access_key_list", finality: "final", account_id: id }, signal))
  const agreement = quiet(view<Agreement>(id, "get_agreement", {}, signal))
  const release = quiet(agreement.then((a) => view<{ code_hash: string } | null>(FACTORY, "release", { version: a.release }, signal)))

  /* 1. The account exists and the factory lists it as one of its agreements */
  let account: Json
  try {
    const [a, isListed] = await Promise.all([acct, listed])
    if (!isListed) throw new Error("not listed")
    account = a
    report("agreement", [{ text: id, href: addr(id), copy: id }, " · by ", { text: FACTORY, href: addr(FACTORY), copy: FACTORY }], "ok")
  } catch (err) {
    if (signal?.aborted) return
    /* No answer at all is the RPC; any definite answer (unknown account, an id the factory rejects) means it is not one */
    if (err instanceof RpcDown) report("agreement", [NO_ANSWER], "no answer")
    else report("agreement", ["Not an Accord agreement"], "not ok")
    rest.forEach((k) => report(k, [], "not checked"))
    return
  }

  /* 2. Keys, the record and the code, each on its own */
  const keys = keyList
    .then((res) => {
      const list = (res.keys ?? []) as AccessKey[]
      const full = list.filter((k) => k.access_key.permission === "FullAccess").length
      const calls = list.flatMap((k) => (k.access_key.permission === "FullAccess" ? [] : [k.access_key.permission.FunctionCall]))
      const actOnly = calls.every((c) => c.receiver_id === id && c.method_names.length === 1 && c.method_names[0] === "act")
      const ok = full === 0 && calls.length <= 1 && actOnly
      const value = full > 0 ? plural(full, "full-access key", "full-access keys") : calls.length === 0 ? "None; the agent is revoked" : actOnly ? "One agent key, act only" : "A key beyond act"
      report("keys", [{ text: value, href: `${addr(id)}?tab=accesskeys` }], ok ? "ok" : "not ok")
    })
    .catch(() => { if (!signal?.aborted) report("keys", [NO_ANSWER], "no answer") })

  const record = agreement
    .then((a) => {
      const r = a.recipient
      report(
        "recipient",
        r
          ? [{ text: r.account, href: addr(r.account), copy: r.account }, " · ", { text: `v${r.version} proof`, href: known?.recipientApproval ?? `https://${r.domain}/.well-known/accord.json` }]
          : ["None bound yet"],
        r ? "ok" : "not checked",
      )
      const paidOk = BigInt(a.paid || "0") <= BigInt(a.total || "0")
      const txs = `${addr(id)}?tab=txns`
      report(
        "record",
        [
          `${a.state} · `,
          { text: `${usdc(a.paid)} of ${usdc(a.total)} paid`, href: known?.payment ?? txs, copy: hashOf(known?.payment), copyLabel: "the payment transaction hash" },
          " · ",
          a.refusals > 0 ? { text: plural(a.refusals, "refusal", "refusals"), href: known?.refusal ?? txs, copy: hashOf(known?.refusal), copyLabel: "the refusal transaction hash" } : "0 refusals",
        ],
        paidOk ? "ok" : "not ok",
      )
    })
    .catch(() => { if (!signal?.aborted) { report("recipient", [NO_ANSWER], "no answer"); report("record", [NO_ANSWER], "no answer") } })

  const code = Promise.all([agreement, release])
    .then(([a, rel]) => {
      const onChain = String(account.global_contract_hash ?? account.code_hash ?? "")
      const ok = !!rel && onChain === rel.code_hash
      const releaseHref = a.release === 3 ? KNOWN_TX["a6.accord-v2.testnet"].release : `${addr(FACTORY)}?tab=txns`
      report(
        "code",
        ok ? [{ text: `Release ${a.release}`, href: releaseHref }, " · ", { text: `${onChain.slice(0, 8)}…`, href: `${addr(id)}?tab=contract`, copy: onChain, copyLabel: "the code hash" }] : [`Not release ${a.release}`],
        ok ? "ok" : "not ok",
      )
    })
    .catch(() => { if (!signal?.aborted) report("code", [NO_ANSWER], "no answer") })

  await Promise.all([keys, record, code])
}

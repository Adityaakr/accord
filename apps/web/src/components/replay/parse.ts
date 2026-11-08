/* Parsers for the platform README's raw output blocks (make attack, make market-making). The replays draw only what
   these return, so every number, code, account and hash on screen comes from the block's own text. A parser returns null
   when a line it needs is missing; the docs then show the raw block alone. */

type Line = { tag: string; rest: string }

function lines(code: string): { head: string[]; body: Line[] } {
  const all = code.split("\n")
  const head = (all[0] ?? "").split(" · ").map((s) => s.trim())
  const body = all.slice(1).map((l) => {
    const m = l.trim().match(/^(\S+(?: \d+)?)\s{2,}(.*)$/)
    return m ? { tag: m[1], rest: m[2].trim() } : { tag: "", rest: l.trim() }
  })
  return { head, body }
}

/** "tx <hash> (final)" → { hash, note } */
function tx(part: string): { hash: string; note?: string } | null {
  const m = part.match(/^tx (\S+)(?: \((.+)\))?$/)
  return m ? { hash: m[1], note: m[2] } : null
}

/* ---------------------------------------------------------------- make attack */
export type AttackVerdict = { tag: "refused" | "canary"; code: string; parts: string[]; tx: { hash: string; note?: string } | null }
export type Attempt = { subject: string; intent: string; preflight?: string; verdict: AttackVerdict }
export type Attack = {
  title: string
  account: string
  key: string
  where: string
  attempts: Attempt[]
  next: { error: string; why: string }
  escrow: { before: string; after: string; moved: string }
}

export function parseAttack(code: string): Attack | null {
  const { head, body } = lines(code)
  const keyPart = head.find((h) => h.startsWith("agent key "))
  if (head.length < 4 || !keyPart) return null
  const attempts: Attempt[] = []
  let next: Attack["next"] | null = null
  let escrow: Attack["escrow"] | null = null
  for (const { tag, rest } of body) {
    if (tag === "inbox") {
      const m = rest.match(/^"([^"]+)"\s*→\s*agent:\s*(.+)$/)
      if (!m) return null
      attempts.push({ subject: m[1], intent: m[2], verdict: { tag: "refused", code: "", parts: [], tx: null } })
    } else if (tag === "preflight") {
      const a = attempts[attempts.length - 1]
      if (a) a.preflight = rest
    } else if (tag === "refused" || tag === "canary") {
      const a = attempts[attempts.length - 1]
      if (!a) return null
      const parts = rest.split(" · ")
      const t = parts.map(tx).find(Boolean) ?? null
      a.verdict = { tag, code: parts[0], parts: parts.slice(1).filter((p) => !p.startsWith("tx ")), tx: t }
    } else if (tag === "agent") {
      const m = rest.match(/^next call: (\S+) \((.+)\)$/)
      if (m) next = { error: m[1], why: m[2] }
    } else if (tag === "escrow") {
      const [before, after, moved] = rest.split(" · ")
      if (before && after && moved) escrow = { before: before.replace(/ before$/, ""), after: after.replace(/ after$/, ""), moved }
    }
  }
  if (!attempts.length || attempts.some((a) => !a.verdict.code) || !next || !escrow) return null
  return { title: head[0], account: head[1], key: keyPart.replace(/^agent key /, ""), where: head[head.length - 1], attempts, next, escrow }
}

/* ---------------------------------------------------------------- make atlas */
export type Slot = { n: number; block: string; spread: string; bid: string; ask: string; unit: string; pass: boolean }
export type Atlas = {
  title: string
  account: string
  type: string
  venue: string
  where: string
  period: { name: string; note: string }
  slots: Slot[]
  closed: { passed: number; of: number; threshold: number; parts: string[]; outcome: string }
  paid: { lead: string; event: string; amount: string; to: string; tx: string }
  strict: { account: string; period: string; passed: number; of: number; threshold: number; outcome: string }
  withheld: { lead: string; code: string; tx: string }
  scope: string
}

const passOf = (s: string) => s.match(/^(\d+) of (\d+) passed$/)

export function parseAtlas(code: string): Atlas | null {
  const { head, body } = lines(code)
  if (head.length < 5) return null
  const slots: Slot[] = []
  let period: Atlas["period"] | null = null, closed: Atlas["closed"] | null = null, paid: Atlas["paid"] | null = null
  let strict: Atlas["strict"] | null = null, withheld: Atlas["withheld"] | null = null, scope = ""
  for (const { tag, rest } of body) {
    if (tag.startsWith("period ")) period = { name: tag, note: rest }
    else if (tag.startsWith("slot ")) {
      const m = rest.match(/^mainnet block (\d+) · spread (\S+ bps) · depth (\S+) \/ (\S+) (\S+) · (pass|fail)$/)
      if (!m) return null
      slots.push({ n: Number(tag.slice(5)), block: m[1], spread: m[2], bid: m[3], ask: m[4], unit: m[5], pass: m[6] === "pass" })
    } else if (tag === "closed") {
      const parts = rest.split(" · ")
      const p = passOf(parts[0] ?? ""), th = (parts[1] ?? "").match(/^threshold (\d+)$/)
      if (!p || !th) return null
      closed = { passed: Number(p[1]), of: Number(p[2]), threshold: Number(th[1]), parts: parts.slice(2, -1), outcome: parts[parts.length - 1] }
    } else if (tag === "paid") {
      const m = rest.match(/^(.+?) · (\S+) (\S+ \S+) → (\S+) · tx (\S+)$/)
      if (!m) return null
      paid = { lead: m[1], event: m[2], amount: m[3], to: m[4], tx: m[5] }
    } else if (tag === "strict") {
      const parts = rest.split(" · ")
      const p = passOf(parts[2] ?? ""), th = (parts[3] ?? "").match(/^threshold (\d+)$/)
      if (!p || !th || !parts[4]) return null
      strict = { account: parts[0], period: parts[1], passed: Number(p[1]), of: Number(p[2]), threshold: Number(th[1]), outcome: parts[4] }
    } else if (tag === "withheld") {
      const m = rest.match(/^(.+?): (\S+) · tx (\S+)$/)
      if (!m) return null
      withheld = { lead: m[1], code: m[2], tx: m[3] }
    } else if (tag === "scope") scope = rest
  }
  if (!period || !slots.length || !closed || !paid || !strict || !withheld) return null
  return { title: head[0], account: head[1], type: head[2], venue: head[3], where: head[head.length - 1], period, slots, closed, paid, strict, withheld, scope }
}

/** Shorten base58 hashes and keys for display: first 6 … last 4 (the full value is always copied) */
export const shortHash = (h: string) => {
  const m = h.match(/^(ed25519:)?(.+)$/)!
  const v = m[2]
  return v.length > 14 ? `${m[1] ?? ""}${v.slice(0, 6)}…${v.slice(-4)}` : h
}
export const shortenIn = (s: string) => s.replace(/(ed25519:)?[1-9A-HJ-NP-Za-km-z]{32,}/g, (h) => shortHash(h))

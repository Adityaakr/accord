import type { ReactNode } from "react"
import styles from "./ProductShot.module.css"

/* Illustrative product panels for the supporting pages, in the hero preview's style (misty backdrop, light panel).
   One consistent example everywhere: the NEAR/USDC market-making retainer, 18,500 USDC a period, paid to
   halcyon-mm.testnet, bound to halcyon.example. Each panel is labelled "Illustrative". */

type Block =
  | { t: "kv"; k: string; v: string; mono?: boolean; muted?: boolean }
  | { t: "check"; text: ReactNode; state: "ok" | "no" | "wait" }
  | { t: "note"; text: ReactNode }
  | { t: "code"; text: string }
  | { t: "chat"; side: "a" | "b"; who: string; text: string }
  | { t: "slots"; v: number[] }
  | { t: "book" }
  | { t: "amount"; value: string; status: string }

type Shot = { title: string; tag: string; blocks: Block[]; label: string }

const SHOTS = {
  mandate: { title: "Your mandate", tag: "Sealed", label: "A buyer's sealed mandate: limits stay hidden; only the sealed mandate and its commitment hash go on NEAR",
    blocks: [{ t: "kv", k: "Maximum retainer", v: "•••••• USDC", mono: true }, { t: "kv", k: "Maximum spread", v: "≤ 70 bps", mono: true }, { t: "kv", k: "Minimum depth ±2%", v: "≥ 10,000 USDC", mono: true }, { t: "kv", k: "Walk-away", v: "••••••", mono: true },
      { t: "note", text: "Encrypted in your browser to the Sealed Table's key. On chain: the ciphertext and" }, { t: "code", text: "commitment 0x7a3f…e19c" }] },
  terms: { title: "Proposed terms", tag: "Attested", label: "Proposed terms awaiting approval from both companies",
    blocks: [{ t: "kv", k: "Retainer", v: "18,500 USDC / period", mono: true }, { t: "kv", k: "Spread", v: "≤ 60 bps", mono: true }, { t: "kv", k: "Depth ±2%", v: "≥ 12,000 USDC", mono: true }, { t: "kv", k: "Quoting", v: "both sides", mono: true }, { t: "kv", k: "Pays when", v: "4 of 6 slots pass", mono: true },
      { t: "check", text: "Within both mandates' limits", state: "ok" }, { t: "check", text: "Buyer approved", state: "ok" }, { t: "check", text: "Seller approved", state: "wait" }] },
  payment: { title: "Payment request · act(Pay)", tag: "Checked", label: "A payment request checked against the approved terms before it is paid",
    blocks: [{ t: "check", text: <>Milestone <b>Period 3</b> is due</>, state: "ok" }, { t: "check", text: <>Amount <b>18,500 USDC</b> matches the terms</>, state: "ok" }, { t: "check", text: <>Recipient <b>halcyon-mm.testnet</b>, version 1</>, state: "ok" },
      { t: "amount", value: "18,500 USDC", status: "Paid" }] },
  negotiation: { title: "Sealed Table · round 4", tag: "In enclave", label: "Two agents negotiating inside the Sealed Table, with the limit check",
    blocks: [{ t: "chat", side: "a", who: "Buyer's agent", text: "16,000 USDC a period at 50 bps." }, { t: "chat", side: "b", who: "Seller's agent", text: "19,500 USDC. 55 bps is our floor." }, { t: "chat", side: "a", who: "Buyer's agent", text: "18,500 at 60 bps, both sides quoted." },
      { t: "check", text: "Proposal inside both mandates' limits", state: "ok" }] },
  attestation: { title: "Attestation", tag: "Verified", label: "The attestation that comes with the negotiated terms",
    blocks: [{ t: "kv", k: "Enclave", v: "TDX · measurement approved", mono: true }, { t: "kv", k: "Job", v: "neg-7f3a…c21", mono: true }, { t: "kv", k: "Terms hash", v: "0x91c2…4b07", mono: true }, { t: "kv", k: "Transcript hash", v: "0x3e58…a9d1", mono: true },
      { t: "code", text: "outlayer-verify job neg-7f3a…c21 · exit 0" }] },
  visibility: { title: "Who sees what", tag: "Boundary", label: "The privacy boundary: what stays private, what both parties see, and what is public",
    blocks: [{ t: "kv", k: "Your ceiling and walk-away", v: "Only you" }, { t: "kv", k: "Negotiation transcript", v: "Hash only" }, { t: "kv", k: "Approved terms", v: "Both companies" }, { t: "kv", k: "Payment schedule", v: "Public on NEAR" }, { t: "kv", k: "USDC transfers", v: "Public on NEAR" }] },
  payeeProof: { title: "Payee · halcyon.example", tag: "Bound", label: "A recipient bound to the vendor's domain, approved and accepted",
    blocks: [{ t: "check", text: "Domain proof fetched inside the enclave", state: "ok" }, { t: "check", text: "Approved by the vendor's settlement authority", state: "ok" }, { t: "check", text: "Accepted by the buyer", state: "ok" },
      { t: "kv", k: "Recipient", v: "halcyon-mm.testnet", mono: true }, { t: "kv", k: "Version", v: "1", mono: true }] },
  payeeChange: { title: "Recipient change", tag: "Pending", label: "A recipient change that needs a fresh proof, the authority, the buyer and a 24-hour delay",
    blocks: [{ t: "kv", k: "Current", v: "halcyon-mm.testnet · v1", mono: true }, { t: "kv", k: "Proposed", v: "halcyon-ops.testnet · v2", mono: true },
      { t: "check", text: "Fresh domain proof", state: "ok" }, { t: "check", text: "Settlement authority approved", state: "ok" }, { t: "check", text: "Buyer acceptance", state: "wait" }, { t: "note", text: "24-hour delay: 23:41:07 left. Payments go to v1 until then." }] },
  payeeHistory: { title: "Recipient history", tag: "On record", label: "The recipient's version history, including a change request that was refused",
    blocks: [{ t: "kv", k: "v1 · 14 Oct", v: "halcyon-mm.testnet · active", mono: true }, { t: "kv", k: "v2 · 22 Oct", v: "proposed · rejected by buyer", mono: true, muted: true },
      { t: "check", text: "“Our bank details have changed” by email: no change from a message", state: "no" }, { t: "note", text: "Every version, approval and refusal stays on the agreement's record." }] },
  identity: { title: "What Payee proves", tag: "Scope", label: "What a payee binding proves, and what it does not",
    blocks: [{ t: "check", text: "Control of halcyon.example", state: "ok" }, { t: "check", text: "Approval by the vendor's settlement authority", state: "ok" }, { t: "check", text: "Acceptance by the buyer", state: "ok" }, { t: "check", text: "That the company legally exists (KYB, planned for v2)", state: "wait" }] },
  conditions: { title: "Approved conditions", tag: "Both approved", label: "The liquidity conditions both sides approved before the engagement",
    blocks: [{ t: "kv", k: "Venue", v: "Rhea USDC/wNEAR pool", mono: true }, { t: "kv", k: "Schedule", v: "6 hidden slots per period", mono: true }, { t: "kv", k: "Spread", v: "≤ 60 bps", mono: true }, { t: "kv", k: "Depth ±2%", v: "≥ 12,000 USDC", mono: true }, { t: "kv", k: "Quoting", v: "both sides", mono: true }, { t: "kv", k: "Pays when", v: "4 of 6 slots pass", mono: true }] },
  observation: { title: "Slot 4 · USDC/wNEAR", tag: "Attested", label: "One observation slot: the pool's public liquidity, read at a time drawn inside the observer's enclave",
    blocks: [{ t: "book" }, { t: "kv", k: "Spread", v: "47 bps · pass", mono: true }, { t: "kv", k: "Depth ±2%", v: "12,640 USDC · pass", mono: true }, { t: "kv", k: "Quoting", v: "both sides · pass", mono: true }] },
  decision: { title: "Period 3", tag: "Eligible", label: "A period decision: five of six slots passed, so the retainer is eligible",
    blocks: [{ t: "slots", v: [1, 1, 0, 1, 1, 1] }, { t: "note", text: "5 of 6 slots passed. The rule needs 4." }, { t: "amount", value: "18,500 USDC", status: "Eligible" }] },
  scope: { title: "What this version measures", tag: "v0 scope", label: "What the current version of a market-making agreement measures, and what is planned",
    blocks: [{ t: "check", text: "Spread, depth and two-sided quoting of the venue's public liquidity", state: "ok" }, { t: "check", text: "Each observation attested", state: "ok" }, { t: "check", text: "Liquidity attributed to the market maker's own account (planned)", state: "wait" },
      { t: "note", text: "The agreement pays on the conditions as agreed. It does not yet establish who met them." }] },
} satisfies Record<string, Shot>

export type ShotVariant = keyof typeof SHOTS

const Mark = ({ state }: { state: "ok" | "no" | "wait" }) => (
  <span className={`${styles.mark} ${styles[state]}`} aria-hidden="true">{state === "ok" ? "✓" : state === "no" ? "×" : "…"}</span>
)

function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case "kv": return <div className={`${styles.kv} ${b.muted ? styles.muted : ""}`}><span>{b.k}</span>{b.mono ? <code>{b.v}</code> : <b>{b.v}</b>}</div>
    case "check": return <div className={styles.check}><Mark state={b.state} /><span>{b.text}</span></div>
    case "note": return <p className={styles.note}>{b.text}</p>
    case "code": return <code className={styles.code}>{b.text}</code>
    case "chat": return <div className={`${styles.chat} ${b.side === "b" ? styles.chatB : ""}`}><span className={styles.who}>{b.who}</span><span className={styles.bubble}>{b.text}</span></div>
    case "slots": return <div className={styles.slots}>{b.v.map((ok, i) => <span key={i} className={ok ? styles.sPass : styles.sFail}>{ok ? "✓" : "×"}</span>)}</div>
    case "book": return (
      <div className={styles.book} aria-hidden="true">
        {[64, 48, 36, 22].map((w, i) => <span key={`a${i}`} className={styles.ask} style={{ width: `${w}%` }} />)}
        <span className={styles.mid}>mid 4.812 · spread 47 bps</span>
        {[26, 40, 52, 70].map((w, i) => <span key={`b${i}`} className={styles.bid} style={{ width: `${w}%` }} />)}
      </div>
    )
    case "amount": return <div className={styles.amount}><span>{b.value}</span><span className={styles.pill}>{b.status}</span></div>
  }
}

export function ProductShot({ variant, className = "" }: { variant: ShotVariant; className?: string }) {
  const s = SHOTS[variant] as Shot
  return (
    <div className={`${styles.stage} ${className}`} role="img" aria-label={`Illustrative: ${s.label}.`}>
      <div className={styles.panel}>
        <div className={styles.head}>
          <span className={styles.title}>{s.title}</span>
          <span className={styles.tags}><span className={styles.tag}>{s.tag}</span><span className={styles.illus}>Illustrative</span></span>
        </div>
        <div className={styles.body}>{s.blocks.map((b, i) => <BlockView key={i} b={b} />)}</div>
      </div>
    </div>
  )
}

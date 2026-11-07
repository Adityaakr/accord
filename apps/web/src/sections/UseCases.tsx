import { useRef, useState, type KeyboardEvent } from "react"
import { Link } from "react-router-dom"
import { PixelIcon, type PixelName } from "../components/PixelIcon"
import { LINKS } from "../content/links"
import styles from "./UseCases.module.css"

/* Home · Use cases (#use-cases), directly under the hero (copy from Adi, 8 Nov 2026). Accord is one product; each agreement
   type changes the commercial fields and the evidence it accepts, never the controls. Six selectable cards share one
   agreement preview beneath them, so the reader sees the same six fields fill in for each type. Nothing advances on its
   own. Each type carries "Demo" (runs end to end in the developer preview) or "Planned" (not built; the preview shows how
   it would read). The detailed evidence opens on demand. A source appears only where the research page already carries
   one; a published concern establishes the problem, never an endorsement. Accounts and .example domains are illustrative. */

type Decision = "Eligible" | "Held" | "Awaiting review"
type Evidence = { k: string; v: string; tone?: "pass" | "fail" | "refused" | "pending" }
type UseCase = {
  id: string
  icon: PixelName
  title: string
  status: "Demo" | "Planned"
  line: string
  body: string
  condition: string
  note?: string
  obligation: string
  rule: string
  accepts: string
  recipient: string
  decision: Decision
  why: string
  evidence: Evidence[]
  source?: { text: string; href: string }
}

const USES: UseCase[] = [
  {
    id: "market-making", icon: "chart", title: "Market-making agreements", status: "Demo",
    line: "Retainers tied to agreed liquidity conditions",
    body: "Connect recurring retainers to agreed liquidity conditions. Define spread, depth and quoting requirements, then use scheduled observations to determine whether a payment is eligible for release.",
    condition: "the agreed observation threshold is met.",
    note: "Venue-level observations measure market conditions, not an individual market maker's contribution.",
    obligation: "Recurring liquidity retainer · 18,500 USDC a period",
    rule: "4 of 6 observation windows pass: spread ≤ 60 bps, depth ≥ 12,000 USDC within 2%, both sides quoted",
    accepts: "Signed readings from the agreed observer, taken at hidden times",
    recipient: "halcyon-mm.near · proven for halcyon.example",
    decision: "Eligible",
    why: "5 of 6 windows passed, 4 were required. Window 3 measured 9,820 USDC of depth, below the agreed 12,000.",
    evidence: [
      { k: "Window 1", v: "48 bps · 12,910 USDC · both sides", tone: "pass" },
      { k: "Window 2", v: "51 bps · 12,480 USDC · both sides", tone: "pass" },
      { k: "Window 3", v: "52 bps · 9,820 USDC · both sides", tone: "fail" },
      { k: "Window 4", v: "47 bps · 12,640 USDC · both sides", tone: "pass" },
      { k: "Window 5", v: "45 bps · 13,105 USDC · both sides", tone: "pass" },
      { k: "Window 6", v: "49 bps · 12,770 USDC · both sides", tone: "pass" },
      { k: "Observer", v: "signature checked against the approved observer key" },
    ],
    source: { text: "Paid liquidity obligations raised liquidity and firm value. Menkveld and Wang, 2013", href: "/research#menkveld-wang" },
  },
  {
    id: "security", icon: "shield", title: "Security remediation", status: "Planned",
    line: "Fixes paid when the agreed checks pass",
    body: "Agree on the fix before commissioning the work. Define the affected software, required checks and acceptance process; keep payment pending until the submitted patch satisfies those requirements.",
    condition: "the specified checks pass and the required reviewer approves.",
    obligation: "Fix for a reported vulnerability · 6,000 USDC on acceptance",
    rule: "The agreed test suite passes on the submitted patch and the named reviewer approves",
    accepts: "Test results for the submitted patch and the reviewer's approval",
    recipient: "The researcher's approved account",
    decision: "Awaiting review",
    why: "All 14 required checks pass on patch 3f9a2c1. Payment stays pending until the named reviewer approves.",
    evidence: [
      { k: "Patch", v: "3f9a2c1 · submitted against the agreed repository" },
      { k: "Required checks", v: "14 of 14 pass", tone: "pass" },
      { k: "Reviewer", v: "approval pending", tone: "pending" },
    ],
  },
  {
    id: "infrastructure", icon: "server", title: "Infrastructure service agreements", status: "Planned",
    line: "Recurring payments tied to service levels",
    body: "Connect recurring payments to the service levels your business relies on. Agree on availability, latency or capacity requirements, with a defined process for shortfalls and disputed measurements.",
    condition: "the agreed service evidence and payment rules are satisfied.",
    obligation: "Dedicated GPU capacity · 48,000 USDC a month",
    rule: "Availability ≥ 99.5% and p95 latency ≤ 300 ms for the month",
    accepts: "Measurements from the agreed monitor, with a dispute window for the provider",
    recipient: "The provider's approved account",
    decision: "Held",
    why: "Availability measured 99.2% against the agreed 99.5%. The shortfall rule applies, and the provider can dispute the measurement.",
    evidence: [
      { k: "Availability", v: "99.2% · needs ≥ 99.5%", tone: "fail" },
      { k: "p95 latency", v: "212 ms · needs ≤ 300 ms", tone: "pass" },
      { k: "Dispute window", v: "open for 72 hours", tone: "pending" },
    ],
  },
  {
    id: "agent-services", icon: "agents", title: "Agent-to-agent services", status: "Planned",
    line: "Specialist work commissioned within set bounds",
    body: "Let agents commission specialist work within approved boundaries. Set the scope, budget, authorised provider and acceptance criteria before a task begins.",
    condition: "the deliverable is accepted under the agreed rules.",
    obligation: "Market research from a specialist agent · up to 450 USDC",
    rule: "The deliverable is accepted against the agreed criteria",
    accepts: "The delivered work and the buyer agent's recorded acceptance",
    recipient: "The provider agent's approved account",
    decision: "Eligible",
    why: "The report was delivered within scope and budget, and the buyer's agent recorded its acceptance.",
    evidence: [
      { k: "Deliverable", v: "report · hash 0x4be1…9c02" },
      { k: "Budget", v: "420 of 450 USDC", tone: "pass" },
      { k: "Acceptance", v: "recorded by the buyer's agent", tone: "pass" },
    ],
    source: { text: "Define at the contract level what an agent can and cannot do. a16z Frontier, 2026", href: "/research#a16z-frontier" },
  },
  {
    id: "vendor", icon: "bag", title: "Vendor contracts and renewals", status: "Demo",
    line: "Invoices paid only against approved obligations",
    body: "Let agents negotiate price, scope and renewal terms within confidential limits. Both businesses approve the agreement before it governs invoices, scheduled payments and recipient changes.",
    condition: "the invoice matches an approved obligation and the required acceptance is recorded.",
    obligation: "Analytics contract · 12 monthly milestones of 3,000 USDC",
    rule: "The invoice matches an approved milestone and the buyer has accepted delivery",
    accepts: "The buyer's recorded acceptance of the delivery",
    recipient: "fieldwork.near · proven for fieldwork.example",
    decision: "Eligible",
    why: "Milestone 4 was accepted and the invoice matches the approved amount. An earlier request to pay a new account was refused.",
    evidence: [
      { k: "accept_delivery(3)", v: "recorded by the buyer", tone: "pass" },
      { k: "act(Pay{milestone 4, 3,000 USDC})", v: "accepted", tone: "pass" },
      { k: "act(Pay{to \"fieldwork-new.near\"})", v: "refused · ERR_PAYEE_MISMATCH", tone: "refused" },
    ],
    source: { text: "$3.0B lost to business email compromise in 2025. FBI IC3", href: "/research#ic3-2025" },
  },
  {
    id: "grants", icon: "book", title: "Grants and funded milestones", status: "Planned",
    line: "Each payment tied to an accepted milestone",
    body: "Give recipients clear funding commitments and reviewers clear release conditions. Define deliverables, budgets and approval authority before work begins, with each payment tied to an accepted milestone.",
    condition: "the designated reviewers approve the milestone.",
    obligation: "Wallet SDK grant · 42,000 USDC in three milestones",
    rule: "2 of 3 designated reviewers approve the milestone",
    accepts: "The milestone report and the reviewers' approvals",
    recipient: "The grantee's approved account",
    decision: "Awaiting review",
    why: "The milestone 1 report is in. 1 of the 2 required approvals is recorded, so 12,000 USDC stays held.",
    evidence: [
      { k: "Milestone 1 report", v: "submitted" },
      { k: "Reviewer A", v: "approved", tone: "pass" },
      { k: "Reviewer B", v: "pending", tone: "pending" },
      { k: "Reviewer C", v: "pending", tone: "pending" },
    ],
  },
]

const SAFEGUARDS = ["Confidential mandates", "Approved terms", "Scoped agent permissions", "Authorised recipients", "Evidence requirements", "Payment limits"]
const PLANNED = "Planned template. The fields show how this agreement would read; the controls behind them are the ones already demonstrated."
const DECISION_TONE: Record<Decision, string> = { Eligible: styles.dEligible, Held: styles.dHeld, "Awaiting review": styles.dReview }

const Arrow = () => (
  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
)

function Preview({ u, active, id, labelledBy }: { u: UseCase; active: boolean; id: string; labelledBy: string }) {
  const [open, setOpen] = useState(false)
  const rows: [string, string][] = [
    ["Approved obligation", u.obligation],
    ["Payment condition", u.rule],
    ["Accepted evidence", u.accepts],
    ["Authorised recipient", u.recipient],
  ]
  return (
    <div id={id} role="tabpanel" aria-labelledby={labelledBy} hidden={!active} className={styles.preview}>
      <div className={styles.previewBar}>
        <span className={styles.previewName}>
          <PixelIcon name={u.icon} size={18} />
          <span>{u.title}</span>
          <span className={`${styles.status} ${u.status === "Demo" ? styles.demo : ""}`}>{u.status}</span>
        </span>
        <span className={styles.illus}>Agreement preview · Illustrative</span>
      </div>

      <div className={styles.previewBody}>
        <div className={styles.copy}>
          <p className={styles.body}>{u.body}</p>
          <p className={styles.condition}><span>Payment condition:</span> {u.condition}</p>
          {u.note ? <p className={styles.note}>{u.note}</p> : null}
          {u.status === "Planned" ? <p className={styles.note}>{PLANNED}</p> : null}
          {u.source ? (
            <Link to={u.source.href} className={styles.source}>
              <span className={styles.sourceLabel}>Why it matters</span>
              <span className={styles.sourceText}>{u.source.text}</span>
              <Arrow />
            </Link>
          ) : null}
        </div>

        <div className={styles.fields}>
          <dl className={styles.table}>
            {rows.map(([k, v]) => (
              <div key={k} className={styles.row}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
            <div className={styles.row}>
              <dt>Current decision</dt>
              <dd><span className={`${styles.decision} ${DECISION_TONE[u.decision]}`}><i aria-hidden="true" />{u.decision}</span></dd>
            </div>
            <div className={styles.row}><dt>Explanation</dt><dd>{u.why}</dd></div>
          </dl>

          <button type="button" className={styles.more} aria-expanded={open} aria-controls={`${id}-evidence`} onClick={() => setOpen((o) => !o)}>
            {open ? "Hide the evidence" : "Show the evidence"}
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={open ? styles.flip : ""}><path d="m4 6 4 4 4-4" /></svg>
          </button>
          <ul id={`${id}-evidence`} className={styles.evidence} hidden={!open}>
            {u.evidence.map((e) => (
              <li key={e.k} className={e.tone ? styles[`e_${e.tone}`] : ""}>
                <span className={styles.ek}>{e.k}</span>
                <span className={styles.ev}>{e.v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export function UseCases() {
  const [active, setActive] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = e.key === "ArrowRight" || e.key === "ArrowDown" ? i + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? USES.length - 1 : null
    if (next === null) return
    e.preventDefault()
    const n = (next + USES.length) % USES.length
    setActive(n)
    tabs.current[n]?.focus()
  }

  return (
    <section id="use-cases" className={styles.band} aria-labelledby="use-cases-title">
      <div className={styles.inner}>
        <div className={styles.head}>
          <span className={styles.eyebrow}><span className={styles.dot} aria-hidden="true" />Use cases</span>
          <h2 id="use-cases-title" className={styles.heading}>Different agreements. One system of control.</h2>
          <p className={styles.lead}>
            Negotiate privately, approve the terms and define what must happen before money moves. Accord brings the same controls to recurring services,
            specialist work and commerce between agents.
          </p>
        </div>

        <div className={styles.cards} role="tablist" aria-label="Agreement types">
          {USES.map((x, i) => (
            <button key={x.id} ref={(el) => { tabs.current[i] = el }} type="button" role="tab" id={`uc-tab-${x.id}`} aria-controls={`uc-panel-${x.id}`}
              aria-selected={i === active} tabIndex={i === active ? 0 : -1}
              className={`${styles.card} ${i === active ? styles.cardOn : ""}`} onClick={() => setActive(i)} onKeyDown={(e) => onKey(e, i)}>
              <span className={styles.cardTop}>
                <PixelIcon name={x.icon} size={22} />
                <span className={`${styles.status} ${x.status === "Demo" ? styles.demo : ""}`}>{x.status}</span>
              </span>
              <span className={styles.cardTitle}>{x.title}</span>
              <span className={styles.cardLine}>{x.line}</span>
            </button>
          ))}
        </div>

        <div className={styles.stage}>
          <span className={styles.weave} aria-hidden="true" />
          <span className={styles.sheen} aria-hidden="true" />
          {/* every panel stays in the page (crawlers and the Markdown snapshot read all six); only the selected one shows */}
          <div className={styles.stack}>
            {USES.map((x, i) => <Preview key={x.id} u={x} active={i === active} id={`uc-panel-${x.id}`} labelledBy={`uc-tab-${x.id}`} />)}
          </div>
        </div>

        <div className={styles.foot}>
          <div className={styles.footHead}>
            <p className={styles.safeTitle}>Every agreement carries the same safeguards.</p>
            <Link to={LINKS.exampleAgreement} className={styles.explore}>Explore an example agreement <Arrow /></Link>
          </div>
          <ul className={styles.chips}>
            {SAFEGUARDS.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      </div>
    </section>
  )
}

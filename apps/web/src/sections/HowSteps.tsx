import { useEffect, useRef, useState, type ReactNode } from "react"
import { useInView, useReducedMotion } from "motion/react"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { SectionHeading } from "../components/SectionHeading"
import { PixelIcon, type PixelName } from "../components/PixelIcon"
import styles from "./HowSteps.module.css"

/* How it works (#how), redesigned 8 Nov 2026 in the use-case cards' visual language. Six step cards (pixel icon tile,
   number, title, one line) select one large card: the copy on the left (what happens, who acts, what goes on NEAR,
   what cannot happen) and, on the right, the teal stage (weave, glow) with a drawing of the step that draws itself in
   and the agreement record floating beneath it. Teal for a pass; refusal red only for a refusal. Steps advance on
   their own while the section is in view; choosing one takes over; arrow keys move between steps; reduced motion
   neither advances nor draws. Every panel stays in the DOM (inactive ones hidden), so agents and screen readers read
   the whole flow. Example values match the market-making room in the deal-room band. */

const APPEAR: AppearEffect = {
  threshold: 0.2,
  replay: false,
  enter: { opacity: 0, x: 0, y: 24, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1.1s", delay: "0s" } },
}
const CYCLE = 7000

type Line = { k: string; v: ReactNode; tone?: "pass" | "refuse" | "weak" }
type Step = {
  n: string; icon: PixelName; title: string; short: string; state: string
  body: string; who: string; onChain: string; never: string
  record: Line[]
}

const STEPS: Step[] = [
  {
    n: "01", icon: "vault", title: "Sealed", short: "Each side seals its limits", state: "Sealed",
    body: "Each company sets its limits in the browser, such as a price ceiling and the conditions it needs, and seals them. The mandate is encrypted to a key that exists only inside the Sealed Table's enclave.",
    who: "Each company, in its own browser", onChain: "The sealed mandate as ciphertext and its commitment hash", never: "The other side, the operator or the app reading the numbers",
    record: [
      { k: "buyer mandate", v: "sealed · commitment 9f3c…a1", tone: "pass" },
      { k: "seller mandate", v: "sealed · commitment 41de…7b", tone: "pass" },
      { k: "ceiling", v: "hidden", tone: "weak" },
    ],
  },
  {
    n: "02", icon: "agents", title: "Attested", short: "Agents negotiate in the enclave", state: "Attested",
    body: "Both companies' agents negotiate inside the Sealed Table, an attested enclave. Code checks every proposal against both mandates' hard limits, and the agreed terms come out with an attestation anyone can verify.",
    who: "Both agents, inside the enclave", onChain: "The agreed terms, the sealed outcome and the attestation", never: "Terms outside either side's limits; a mandate leaving the enclave",
    record: [
      { k: "round 1", v: "19,800 USDC · above buyer limit", tone: "weak" },
      { k: "round 2", v: "18,500 USDC · inside both limits", tone: "pass" },
      { k: "attestation", v: "verified", tone: "pass" },
    ],
  },
  {
    n: "03", icon: "bank", title: "Approved", short: "Both companies approve and fund", state: "Executing",
    body: "People at both companies read the terms and approve them. Payee binds the recipient: the vendor proves its domain and its settlement authority approves the account. The buyer then funds the agreement's USDC escrow on NEAR.",
    who: "A person at each company", onChain: "Both approvals, the authorised recipient and the escrowed USDC", never: "Terms taking effect before both sides approve",
    record: [
      { k: "approved", v: "buyer ✓ · seller ✓", tone: "pass" },
      { k: "recipient", v: "halcyon-mm.testnet · bound to halcyon.example", tone: "pass" },
      { k: "escrow", v: "funded · USDC on NEAR", tone: "pass" },
    ],
  },
  {
    n: "04", icon: "key", title: "Executing", short: "The agent pays inside the rules", state: "Executing",
    body: "The buyer's agent holds one key that can call one method, act. Each payment must match the approved milestone, amount and recipient; anything else is refused and recorded, whatever the agent was told.",
    who: "The buyer's agent, through act", onChain: "Every payment and every refusal with its reason", never: "A payment to another account, a different amount or an early payment",
    record: [
      { k: "act · period 1", v: "18,500 → halcyon-mm", tone: "pass" },
      { k: "act · new account", v: "ERR_PAYEE_MISMATCH", tone: "refuse" },
      { k: "act · 25,000", v: "ERR_AMOUNT_MISMATCH", tone: "refuse" },
    ],
  },
  {
    n: "05", icon: "chart", title: "Checked", short: "Evidence decides each payment", state: "Executing",
    body: "A payment becomes eligible only when the agreed evidence is recorded. For a market-making agreement, an attested observer reads the pool at hidden times; elsewhere it is delivery acceptance or a reviewer's approval. Otherwise the payment is withheld.",
    who: "An attested observer or the named reviewer; a keeper triggers scheduled steps", onChain: "Each observation or acceptance, and the period's result", never: "The keeper moving funds or changing an outcome",
    record: [
      { k: "spread ≤ 60 bps", v: "5 of 6 slots", tone: "pass" },
      { k: "depth ≥ 12,000", v: "4 of 6 slots", tone: "pass" },
      { k: "period 1", v: "4 of 6 passed · eligible", tone: "pass" },
    ],
  },
  {
    n: "06", icon: "book", title: "Settled", short: "Paid, recorded, checkable", state: "Settled",
    body: "Eligible payments complete to the authorised recipient in USDC. People decide the exceptions, the buyer can revoke the agent's key in one transaction, and the record remains for anyone to check with one command.",
    who: "The contract pays; people decide exceptions", onChain: "The transfer, any exception and the full record", never: "A payment being reversed or redirected after the fact",
    record: [
      { k: "transfer", v: "18,500 USDC → halcyon-mm.testnet", tone: "pass" },
      { k: "exceptions", v: "none open", tone: "weak" },
      { k: "make verify", v: "7 checks ok", tone: "pass" },
    ],
  },
]


/* ---------- the drawings, one per step (360 × 150); .d paths draw in, .f groups fade in, staggered by --i ---------- */
const T = "var(--teal)"
const Lock = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x="-7" y="-2" width="14" height="11" rx="2.5" className={styles.stroke} />
    <path d="M-4 -2v-3.5a4 4 0 0 1 8 0V-2" className={styles.stroke} />
  </g>
)
const Check = ({ x, y }: { x: number; y: number }) => <path d={`M${x - 6} ${y}l4 4 8-9`} className={`${styles.tick} ${styles.d}`} />
const Cross = ({ x, y }: { x: number; y: number }) => <path d={`M${x - 5} ${y - 5}l10 10M${x + 5} ${y - 5}l-10 10`} className={styles.cross} />

const ART: Record<string, ReactNode> = {
  "01": (
    <>
      {[70, 290].map((x, i) => (
        <g key={x} className={styles.f} style={{ ["--i" as string]: i }}>
          <circle cx={x} cy="70" r="28" className={styles.node} />
          <Lock x={x} y={68} />
          <text x={x} y="122" className={styles.lbl} textAnchor="middle">{i ? "seller limits" : "buyer limits"}</text>
        </g>
      ))}
      <path d="M100 70 H 148 M212 70 H 260" className={`${styles.dash} ${styles.d}`} />
      <g className={styles.f} style={{ ["--i" as string]: 2 }}>
        <rect x="150" y="38" width="60" height="64" rx="12" className={styles.enclave} />
        <Lock x={180} y={68} />
        <text x="180" y="122" className={styles.lbl} textAnchor="middle">enclave key</text>
      </g>
    </>
  ),
  "02": (
    <>
      <rect x="20" y="16" width="236" height="112" rx="16" className={styles.enclave} />
      <text x="36" y="38" className={styles.lbl}>sealed table · enclave</text>
      {[["19,800 · above limit", 52, 0, false], ["18,500 · inside both", 86, 1, true]].map(([v, y, i, ok]) => (
        <g key={String(v)} className={styles.f} style={{ ["--i" as string]: Number(i) }}>
          <rect x={Number(i) ? 104 : 36} y={Number(y)} width="140" height="24" rx="12" className={ok ? styles.bubbleOn : styles.bubble} />
          <text x={(Number(i) ? 104 : 36) + 70} y={Number(y) + 16} className={styles.val} textAnchor="middle">{String(v)}</text>
        </g>
      ))}
      <path d="M256 72 H 286" className={`${styles.solid} ${styles.d}`} />
      <g className={styles.f} style={{ ["--i" as string]: 2 }}>
        <circle cx="312" cy="72" r="22" className={styles.badge} />
        <Check x={312} y={72} />
        <text x="312" y="114" className={styles.lblOn} textAnchor="middle">attested</text>
      </g>
    </>
  ),
  "03": (
    <>
      {[[110, "buyer"], [250, "seller"]].map(([x, l], i) => (
        <g key={String(l)} className={styles.f} style={{ ["--i" as string]: i }}>
          <circle cx={Number(x)} cy="34" r="17" className={styles.badge} />
          <Check x={Number(x)} y={34} />
          <text x={Number(x)} y="66" className={styles.lbl} textAnchor="middle">{String(l)} approves</text>
        </g>
      ))}
      <path d="M110 72 C 110 92, 160 92, 168 104 M250 72 C 250 92, 200 92, 192 104" className={`${styles.dash} ${styles.d}`} />
      <g className={styles.f} style={{ ["--i" as string]: 2 }}>
        <rect x="124" y="104" width="112" height="36" rx="10" className={styles.enclave} />
        <text x="180" y="126" className={styles.val} textAnchor="middle">escrow · USDC</text>
      </g>
    </>
  ),
  "04": (
    <>
      <g className={styles.f} style={{ ["--i" as string]: 0 }}>
        <rect x="8" y="52" width="70" height="40" rx="10" className={styles.node} />
        <text x="43" y="76" className={styles.val} textAnchor="middle">agent</text>
      </g>
      <path d="M78 72 H 112" className={`${styles.solid} ${styles.d}`} />
      <g className={styles.f} style={{ ["--i" as string]: 1 }}>
        <rect x="112" y="48" width="80" height="48" rx="12" className={styles.enclave} />
        <text x="152" y="77" className={styles.val} textAnchor="middle">act()</text>
      </g>
      <path d="M192 60 C 212 60, 214 26, 234 26 M192 72 H 234 M192 84 C 212 84, 214 118, 234 118" className={`${styles.solid} ${styles.d}`} />
      <g className={styles.f} style={{ ["--i" as string]: 2 }}><Check x={248} y={26} /><text x="262" y="30" className={styles.lblOn}>halcyon-mm</text></g>
      <g className={styles.f} style={{ ["--i" as string]: 3 }}><Cross x={248} y={72} /><text x="262" y="76" className={styles.lblRefuse}>new account</text></g>
      <g className={styles.f} style={{ ["--i" as string]: 4 }}><Cross x={248} y={118} /><text x="262" y="122" className={styles.lblRefuse}>25,000</text></g>
    </>
  ),
  "05": (
    <>
      <line x1="40" y1="56" x2="320" y2="56" className={styles.dash} />
      <text x="320" y="48" className={styles.lbl} textAnchor="end">agreed depth</text>
      {[1, 1, 0, 1, 1, 0].map((p, i) => {
        const h = p ? 70 + (i % 2) * 8 : 34
        return <rect key={i} x={52 + i * 44} y={128 - h} width="24" height={h} rx="6" className={`${p ? styles.barOn : styles.bar} ${styles.grow}`} style={{ ["--i" as string]: i }} />
      })}
      <line x1="40" y1="128" x2="320" y2="128" className={styles.base} />
      <text x="40" y="146" className={styles.lbl}>6 hidden times</text>
      <text x="320" y="146" className={styles.lblOn} textAnchor="end">4 of 6 · eligible</text>
    </>
  ),
  "06": (
    <>
      <g className={styles.f} style={{ ["--i" as string]: 0 }}>
        <rect x="24" y="50" width="84" height="44" rx="12" className={styles.enclave} />
        <text x="66" y="77" className={styles.val} textAnchor="middle">contract</text>
      </g>
      <path id="how-pay" d="M108 72 C 160 20, 210 20, 252 72" className={`${styles.solid} ${styles.d}`} />
      <circle r="6" className={styles.coin}><animateMotion dur="2.4s" repeatCount="indefinite" path="M108 72 C 160 20, 210 20, 252 72" /></circle>
      <g className={styles.f} style={{ ["--i" as string]: 1 }}>
        <rect x="252" y="50" width="88" height="44" rx="12" className={styles.node} />
        <text x="296" y="77" className={styles.val} textAnchor="middle">recipient</text>
        <circle cx="340" cy="50" r="10" className={styles.badge} />
        <Check x={340} y={50} />
      </g>
      <text x="180" y="20" className={styles.lblOn} textAnchor="middle">18,500 USDC</text>
      <g className={styles.f} style={{ ["--i" as string]: 2 }}>
        {[0, 1, 2].map((k) => <rect key={k} x={100 + k * 58} y="118" width="48" height="6" rx="3" className={styles.recLine} />)}
        <text x="180" y="146" className={styles.lbl} textAnchor="middle">on the public record</text>
      </g>
    </>
  ),
}

export function HowSteps() {
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.3 })
  const [active, setActive] = useState(0)
  const [manual, setManual] = useState(false)
  const [paused, setPaused] = useState(false)
  const auto = !reduce && !manual && !paused && inView

  useEffect(() => {
    if (!auto) return
    const t = window.setTimeout(() => setActive((a) => (a + 1) % STEPS.length), CYCLE)
    return () => window.clearTimeout(t)
  }, [auto, active])

  const choose = (i: number) => { setManual(true); setActive(i) }

  return (
    <section ref={ref} id="how" className={`section ${styles.section}`}>
      <SectionHeading
        eyebrow="How it works"
        title="How a deal room works."
        accent="teal"
        wide
        lead={<p>One agreement from sealed limits to a settled payment, in six steps. The example is the market-making room above.</p>}
      />

      <Appear as="div" className={styles.flow} effect={APPEAR}>
        <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className={styles.flowInner}>
          <div className={styles.steps} role="tablist" aria-label="The six steps of a deal room">
            {STEPS.map((s, i) => {
              const on = i === active
              return (
                <button
                  key={s.n}
                  type="button"
                  role="tab"
                  id={`how-tab-${i}`}
                  aria-selected={on}
                  aria-controls={`how-panel-${i}`}
                  tabIndex={on ? 0 : -1}
                  className={`${styles.step} ${on ? styles.active : ""} ${i < active ? styles.done : ""}`}
                  onClick={() => choose(i)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                      e.preventDefault()
                      const n = (i + (e.key === "ArrowRight" ? 1 : STEPS.length - 1)) % STEPS.length
                      choose(n)
                      document.getElementById(`how-tab-${n}`)?.focus()
                    }
                  }}
                >
                  <span className={styles.stepTop}>
                    <span className={styles.tile}><PixelIcon name={s.icon} size={16} /></span>
                    <span className={`mono ${styles.num}`}>{s.n}</span>
                    {i < active ? <span className={styles.doneTick} aria-hidden="true">✓</span> : null}
                  </span>
                  <span className={styles.stepTitle}>{s.title}</span>
                  <span className={styles.short}>{s.short}</span>
                  {on && auto ? <span className={styles.timer} key={`t-${active}`} aria-hidden="true" /> : null}
                </button>
              )
            })}
          </div>

          {STEPS.map((s, i) => (
            <div key={s.n} role="tabpanel" id={`how-panel-${i}`} aria-labelledby={`how-tab-${i}`} hidden={i !== active} className={styles.panel}>
              <div className={styles.text}>
                <div className={styles.textHead}>
                  <span className={styles.tileLg}><PixelIcon name={s.icon} size={22} /></span>
                  <p className={`mono ${styles.kicker}`}>Step {s.n} of 06</p>
                </div>
                <h3 className={styles.title}>{s.title}: {s.short.toLowerCase()}.</h3>
                <p className={styles.body}>{s.body}</p>
                <dl className={styles.facts}>
                  <div><dt>Who acts</dt><dd>{s.who}</dd></div>
                  <div><dt>On NEAR</dt><dd>{s.onChain}</dd></div>
                  <div className={styles.never}><dt>Cannot happen</dt><dd>{s.never}</dd></div>
                </dl>
              </div>

              <div className={styles.stage}>
                <svg viewBox="0 0 360 150" className={styles.art} aria-hidden="true">{ART[s.n]}</svg>
                <div className={styles.record}>
                  <div className={styles.recordHead}>
                    <span>Agreement record · NEAR/USDC retainer</span>
                    <span className={styles.state}>{s.state}</span>
                  </div>
                  <div className={styles.lines}>
                    {s.record.map((l) => (
                      <div key={l.k} className={styles.line}>
                        <span className={styles.lk}>{l.k}</span>
                        <span className={l.tone === "refuse" ? styles.refuse : l.tone === "pass" ? styles.pass : styles.weak}>{l.v}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.track} aria-hidden="true">{STEPS.map((_, k) => <i key={k} className={k <= i ? styles.trackOn : ""} />)}</div>
                  <p className={styles.illus}>Illustrative values</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Appear>
    </section>
  )
}

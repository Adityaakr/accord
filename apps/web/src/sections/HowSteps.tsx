import { useEffect, useRef, useState, type ReactNode } from "react"
import { useInView, useReducedMotion } from "motion/react"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { SectionHeading } from "../components/SectionHeading"
import { PixelIcon, type PixelName } from "../components/PixelIcon"
import ab from "./AudienceBand.module.css"
import styles from "./HowSteps.module.css"

/* How it works (#how): how any deal room works, whatever the agreement type (8 Nov 2026). The deal-room band's tab
   row and stage hold one card per step: the step on the left (what happens, who acts, what goes on NEAR, what cannot
   happen); on the right a drawing of the step that draws itself in (Adi's pick of the first design: sealed limits into
   the enclave, offers inside both limits, both approvals into escrow, act() with one payment through and two
   refused, evidence against the agreed condition, the payment to the approved recipient) above the agreement record
   for that step. Teal for a pass; refusal red only for a refusal. Steps advance on their own in view; choosing one
   takes over; reduced motion shows each step drawn and does not advance. Every panel stays in the DOM for agents. */

const APPEAR: AppearEffect = {
  threshold: 0.2,
  replay: false,
  enter: { opacity: 0, x: 0, y: 24, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1.1s", delay: "0s" } },
}
const STEP_MS = 7500

type Line = { k: string; v: string; tone?: "pass" | "refuse" | "weak" }
type Step = {
  n: string; icon: PixelName; title: string; short: string; state: string
  body: string; who: string; onChain: string; never: string
  answer: string; record: Line[]
}

const STEPS: Step[] = [
  {
    n: "01", icon: "vault", title: "Sealed", short: "Each side seals its limits", state: "Sealed",
    body: "Each company sets its limits in the browser, such as a price ceiling or floor and the conditions it needs, and seals them. A mandate is encrypted to a key that exists only inside the Sealed Table's enclave.",
    who: "Each company, in its own browser", onChain: "Each sealed mandate as ciphertext, with its commitment hash", never: "The other side, the operator or the app reading the numbers",
    answer: "Both mandates sealed. Neither side sees the other's limits.",
    record: [{ k: "buyer mandate", v: "sealed · commitment on NEAR", tone: "pass" }, { k: "vendor mandate", v: "sealed · commitment on NEAR", tone: "pass" }, { k: "limits", v: "hidden from both sides", tone: "weak" }],
  },
  {
    n: "02", icon: "agents", title: "Attested", short: "Agents negotiate in the enclave", state: "Attested",
    body: "Both companies' agents negotiate inside the Sealed Table, an attested enclave. Code checks every proposal against both mandates' hard limits, and only the agreed terms come out, with an attestation anyone can verify.",
    who: "Both agents, inside the enclave", onChain: "The agreed terms, the sealed outcome and the attestation", never: "Terms outside either side's limits; a mandate leaving the enclave",
    answer: "Terms agreed inside both limits, with an attestation.",
    record: [{ k: "proposals", v: "checked against both limits", tone: "pass" }, { k: "agreed terms", v: "recorded", tone: "pass" }, { k: "attestation", v: "verified", tone: "pass" }],
  },
  {
    n: "03", icon: "bank", title: "Approved", short: "Both companies approve and fund", state: "Executing",
    body: "People at both companies read the terms and approve them. Payee binds the recipient: the vendor proves its domain, its settlement authority approves the account and the buyer accepts it. The buyer then funds the agreement's USDC escrow on NEAR.",
    who: "A person at each company", onChain: "Both approvals, the authorised recipient and the escrowed USDC", never: "Terms taking effect before both sides approve",
    answer: "Approved by both companies. Recipient bound. Escrow funded.",
    record: [{ k: "approvals", v: "buyer ✓ · vendor ✓", tone: "pass" }, { k: "recipient", v: "bound to the vendor's domain", tone: "pass" }, { k: "escrow", v: "funded · USDC on NEAR", tone: "pass" }],
  },
  {
    n: "04", icon: "key", title: "Executing", short: "The agent pays inside the rules", state: "Executing",
    body: "The buyer's agent holds one key that can call one method, act. Each payment must match the approved milestone, amount and recipient; anything else is refused and recorded, whatever the agent was told.",
    who: "The buyer's agent, through act", onChain: "Every payment and every refusal with its reason", never: "A payment to another account, a different amount or an early payment",
    answer: "Payments inside the terms go through. Anything else is refused and recorded.",
    record: [{ k: "approved account", v: "within the terms", tone: "pass" }, { k: "new account", v: "ERR_PAYEE_MISMATCH", tone: "refuse" }, { k: "different amount", v: "ERR_AMOUNT_MISMATCH", tone: "refuse" }],
  },
  {
    n: "05", icon: "chart", title: "Checked", short: "Evidence decides each payment", state: "Executing",
    body: "A payment becomes eligible only when the agreed evidence is recorded: observations of a market at hidden times, the buyer's acceptance of a delivery, or a named reviewer's approval. Otherwise it is withheld for both sides to review.",
    who: "An attested observer, the buyer or a named reviewer; a keeper triggers scheduled steps", onChain: "Each observation or acceptance, and the result", never: "The keeper moving funds or changing an outcome",
    answer: "Evidence decides: eligible, or withheld for review.",
    record: [{ k: "evidence", v: "observation, acceptance or review", tone: "weak" }, { k: "conditions met", v: "eligible", tone: "pass" }, { k: "not met", v: "withheld for review", tone: "weak" }],
  },
  {
    n: "06", icon: "book", title: "Settled", short: "Paid, recorded, checkable", state: "Settled",
    body: "Eligible payments complete to the authorised recipient in USDC. The buyer decides any exception and can revoke the agent's key in one transaction, and the record remains for anyone to check with one command.",
    who: "The contract pays; the buyer decides exceptions", onChain: "The transfer, any exception and the full record", never: "A payment being reversed or redirected after the fact",
    answer: "Paid to the approved recipient, recorded and checkable.",
    record: [{ k: "transfer", v: "USDC → approved recipient", tone: "pass" }, { k: "exceptions", v: "decided by the buyer", tone: "weak" }, { k: "make verify", v: "code, key, recipient, record", tone: "pass" }],
  },
]

/* ---------- the drawings, one per step (360 × 150): .d paths draw in, .f groups rise in order (--i) ---------- */
const Lock = ({ x, y }: { x: number; y: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x="-7" y="-2" width="14" height="11" rx="2.5" className={styles.stroke} />
    <path d="M-4 -2v-3.5a4 4 0 0 1 8 0V-2" className={styles.stroke} />
  </g>
)
const Check = ({ x, y }: { x: number; y: number }) => <path d={`M${x - 6} ${y}l4 4 8-9`} className={`${styles.tick} ${styles.d}`} />
const Cross = ({ x, y }: { x: number; y: number }) => <path d={`M${x - 5} ${y - 5}l10 10M${x + 5} ${y - 5}l-10 10`} className={styles.cross} />
const i = (n: number) => ({ ["--i" as string]: n })

const ART: Record<string, ReactNode> = {
  "01": (
    <>
      {[70, 290].map((x, k) => (
        <g key={x} className={styles.f} style={i(k)}>
          <circle cx={x} cy="66" r="28" className={styles.node} />
          <Lock x={x} y={64} />
          <text x={x} y="118" className={styles.lbl} textAnchor="middle">{k ? "vendor limits" : "buyer limits"}</text>
        </g>
      ))}
      <path d="M100 66 H 148 M212 66 H 260" className={`${styles.dash} ${styles.d}`} />
      <g className={styles.f} style={i(2)}>
        <rect x="150" y="34" width="60" height="64" rx="12" className={styles.enclave} />
        <Lock x={180} y={64} />
        <text x="180" y="118" className={styles.lbl} textAnchor="middle">enclave key</text>
      </g>
    </>
  ),
  "02": (
    <>
      <rect x="20" y="12" width="236" height="112" rx="16" className={styles.enclave} />
      <text x="36" y="34" className={styles.lbl}>sealed table · enclave</text>
      <g className={styles.f} style={i(0)}>
        <rect x="36" y="48" width="150" height="24" rx="12" className={styles.bubble} />
        <text x="111" y="64" className={styles.val} textAnchor="middle">offer · outside a limit</text>
      </g>
      <g className={styles.f} style={i(1)}>
        <rect x="94" y="82" width="150" height="24" rx="12" className={styles.bubbleOn} />
        <text x="169" y="98" className={styles.val} textAnchor="middle">offer · inside both</text>
      </g>
      <path d="M256 68 H 286" className={`${styles.solid} ${styles.d}`} />
      <g className={styles.f} style={i(2)}>
        <circle cx="312" cy="68" r="22" className={styles.badge} />
        <Check x={312} y={68} />
        <text x="312" y="110" className={styles.lblOn} textAnchor="middle">attested</text>
      </g>
    </>
  ),
  "03": (
    <>
      {[[110, "buyer"], [250, "vendor"]].map(([x, l], k) => (
        <g key={String(l)} className={styles.f} style={i(k)}>
          <circle cx={Number(x)} cy="30" r="17" className={styles.badge} />
          <Check x={Number(x)} y={30} />
          <text x={Number(x)} y="62" className={styles.lbl} textAnchor="middle">{String(l)} approves</text>
        </g>
      ))}
      <path d="M110 70 C 110 90, 160 90, 168 102 M250 70 C 250 90, 200 90, 192 102" className={`${styles.dash} ${styles.d}`} />
      <g className={styles.f} style={i(2)}>
        <rect x="124" y="102" width="112" height="36" rx="10" className={styles.enclave} />
        <text x="180" y="124" className={styles.val} textAnchor="middle">escrow · USDC</text>
      </g>
    </>
  ),
  "04": (
    <>
      <g className={styles.f} style={i(0)}>
        <rect x="8" y="52" width="70" height="40" rx="10" className={styles.node} />
        <text x="43" y="76" className={styles.val} textAnchor="middle">agent</text>
      </g>
      <path d="M78 72 H 112" className={`${styles.solid} ${styles.d}`} />
      <g className={styles.f} style={i(1)}>
        <rect x="112" y="48" width="80" height="48" rx="12" className={styles.enclave} />
        <text x="152" y="77" className={styles.val} textAnchor="middle">act()</text>
      </g>
      <path d="M192 60 C 212 60, 214 26, 234 26 M192 72 H 234 M192 84 C 212 84, 214 118, 234 118" className={`${styles.solid} ${styles.d}`} />
      <g className={styles.f} style={i(2)}><Check x={244} y={26} /><text x="256" y="30" className={styles.lblOn}>approved account</text></g>
      <g className={styles.f} style={i(3)}><Cross x={244} y={72} /><text x="256" y="76" className={styles.lblRefuse}>new account</text></g>
      <g className={styles.f} style={i(4)}><Cross x={244} y={118} /><text x="256" y="122" className={styles.lblRefuse}>different amount</text></g>
    </>
  ),
  "05": (
    <>
      <line x1="40" y1="56" x2="320" y2="56" className={styles.dash} />
      <text x="320" y="48" className={styles.lbl} textAnchor="end">agreed condition</text>
      {[1, 1, 0, 1, 1, 0].map((p, k) => {
        const h = p ? 70 + (k % 2) * 8 : 34
        return <rect key={k} x={52 + k * 44} y={128 - h} width="24" height={h} rx="6" className={`${p ? styles.barOn : styles.bar} ${styles.grow}`} style={i(k)} />
      })}
      <line x1="40" y1="128" x2="320" y2="128" className={styles.base} />
      <text x="40" y="146" className={styles.lbl}>evidence recorded</text>
      <text x="320" y="146" className={styles.lblOn} textAnchor="end">enough passed · eligible</text>
    </>
  ),
  "06": (
    <>
      <g className={styles.f} style={i(0)}>
        <rect x="24" y="50" width="84" height="44" rx="12" className={styles.enclave} />
        <text x="66" y="77" className={styles.val} textAnchor="middle">contract</text>
      </g>
      <path d="M108 72 C 160 20, 210 20, 252 72" className={`${styles.solid} ${styles.d}`} />
      <circle r="6" className={styles.coin}><animateMotion dur="2.4s" repeatCount="indefinite" path="M108 72 C 160 20, 210 20, 252 72" /></circle>
      <g className={styles.f} style={i(1)}>
        <rect x="252" y="50" width="88" height="44" rx="12" className={styles.node} />
        <text x="296" y="77" className={styles.val} textAnchor="middle">recipient</text>
        <circle cx="340" cy="50" r="10" className={styles.badge} />
        <Check x={340} y={50} />
      </g>
      <text x="180" y="20" className={styles.lblOn} textAnchor="middle">USDC</text>
      <g className={styles.f} style={i(2)}>
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
  const [cycle, setCycle] = useState(0)
  const [paused, setPaused] = useState(false)
  const running = !reduce && inView && !paused
  const go = (n: number) => { setActive(n); setCycle((c) => c + 1) }
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (!running) return
    const t = window.setTimeout(() => go((active + 1) % STEPS.length), STEP_MS)
    return () => window.clearTimeout(t)
  }, [running, active, cycle])

  return (
    <section ref={ref} id="how" className={`section ${styles.section}`}>
      <SectionHeading
        eyebrow="How it works"
        title="How a deal room works."
        accent="teal"
        wide
        lead={<p>One agreement from sealed limits to a settled payment, in six steps. Every agreement type runs the same way; only the terms and the evidence change.</p>}
      />

      <Appear as="div" className={styles.flow} effect={APPEAR}>
        <div className={ab.uses} role="tablist" aria-label="The six steps of a deal room">
          {STEPS.map((s, k) => (
            <button key={s.n} ref={(el) => { tabs.current[k] = el }} type="button" role="tab" id={`how-tab-${k}`} aria-controls={`how-panel-${k}`}
              aria-selected={k === active} tabIndex={k === active ? 0 : -1} title={s.short}
              className={`${ab.use} ${k === active ? ab.useOn : ""}`} onClick={() => go(k)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
                e.preventDefault()
                const n = (k + (e.key === "ArrowRight" ? 1 : STEPS.length - 1)) % STEPS.length
                go(n); tabs.current[n]?.focus()
              }}>
              <PixelIcon name={s.icon} size={22} />
              <span className={ab.useLabel}><span className={styles.tabNum}>{s.n}</span>{s.title}</span>
              {k === active && !reduce ? (
                <span key={cycle} className={ab.timer} aria-hidden="true" style={{ animationDuration: `${STEP_MS}ms`, animationPlayState: running ? "running" : "paused" }} />
              ) : null}
            </button>
          ))}
        </div>

        <div className={ab.stage} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <span className={ab.weave} aria-hidden="true" />
          <span className={ab.sheen} aria-hidden="true" />
          <div className={styles.stack}>
            {STEPS.map((s, k) => (
              <div key={s.n} role="tabpanel" id={`how-panel-${k}`} aria-labelledby={`how-tab-${k}`} hidden={k !== active} className={styles.card}>
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

                <div className={styles.console}>
                  <div className={ab.room}><span>Deal room · step {s.n} of 06</span><span className={styles.state}>{s.state}</span></div>
                  <svg viewBox="0 0 360 150" className={styles.art} aria-hidden="true">{ART[s.n]}</svg>
                  <div className={styles.record}>
                    {s.record.map((l) => (
                      <div key={l.k} className={styles.line}>
                        <span className={styles.lk}>{l.k}</span>
                        <span className={l.tone === "refuse" ? styles.refuse : l.tone === "pass" ? styles.pass : styles.weak}>{l.v}</span>
                      </div>
                    ))}
                  </div>
                  <p className={`${styles.answer} ${reduce ? "" : ab.sweep}`}>{s.answer}</p>
                  <div className={styles.track} aria-hidden="true">{Array.from({ length: 6 }, (_, t) => <i key={t} className={t < Number(s.n) ? styles.trackOn : ""} />)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Appear>
    </section>
  )
}

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { useInView, useReducedMotion } from "motion/react"
import styles from "./CoreScenes.module.css"

/* Core features · seven scenes, rebuilt 8 Nov 2026 to the restraint rules of the motion-graphics explainer-default
   skill: one real interface element per scene, shown large and clean on the teal stage; one idea per scene; values
   change through soft crossfades; eased motion only (no bounce, no busy background, no explanatory overlay). Each
   card enters with a small rise, plays its one beat, holds, and fades before the loop restarts. Loops run only while
   on screen; reduced motion shows the finished card. Teal for a pass; red only for a refusal or a revocation. */

/* ---------- time helpers ---------- */
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const ease = (x: number) => (x = clamp(x), x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
/* appear at a: fade and rise 6px over 0.5s */
const show = (t: number, a: number): CSSProperties => {
  const k = ease(seg(t, a, a + 0.5))
  return { opacity: k, transform: `translateY(${(1 - k) * 6}px)` }
}
/* crossfade progress at a */
const xf = (t: number, a: number) => ease(seg(t, a, a + 0.45))

function useLoop(dur: number, rest: number) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.4 })
  const reduce = useReducedMotion() ?? false
  const [t, setT] = useState(reduce ? rest : 0)
  useEffect(() => {
    if (reduce) { setT(rest); return }
    if (!inView) return
    let raf = 0, last = performance.now(), acc = 0
    const tick = (now: number) => { acc = (acc + (now - last) / 1000) % dur; last = now; setT(acc); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, reduce, dur, rest])
  return { ref, t }
}

/* the floating card: rises in at the start of the loop, fades out at the end */
function Scene({ dur, rest, wide, children }: { dur: number; rest: number; wide?: boolean; children: (t: number) => ReactNode }) {
  const { ref, t } = useLoop(dur, rest)
  const k = ease(seg(t, 0, 0.6)) * (1 - ease(seg(t, dur - 0.6, dur - 0.1)))
  return (
    <div ref={ref} className={styles.scene}>
      <div className={`${styles.card} ${wide ? styles.wide : ""}`} style={{ opacity: k, transform: `translateY(${(1 - k) * 10}px) scale(${lerp(0.985, 1, k)})` }}>
        {children(t)}
      </div>
    </div>
  )
}

/* ---------- parts ---------- */
const Check = ({ k = 1 }: { k?: number }) => (
  <span className={styles.check} style={{ opacity: k, transform: `scale(${lerp(0.7, 1, k)})` }}>
    <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m3.5 8.5 3 3 6-7" /></svg>
  </span>
)
const Cross = ({ k = 1 }: { k?: number }) => (
  <span className={styles.cross} style={{ opacity: k, transform: `scale(${lerp(0.7, 1, k)})` }}>
    <svg viewBox="0 0 16 16" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
  </span>
)
const Lock = ({ on }: { on: number }) => (
  <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={styles.lock} style={{ color: on > 0.5 ? "var(--teal)" : undefined }}>
    <rect x="3" y="7" width="10" height="7" rx="2" /><path d={`M5.5 7V5a2.5 2.5 0 0 1 5 0${on > 0.5 ? "v2" : ""}`} />
  </svg>
)
/* a value that crossfades from a to b at time at */
const Swap = ({ t, at, a, b, cls = styles.val, clsB }: { t: number; at: number; a: ReactNode; b: ReactNode; cls?: string; clsB?: string }) => {
  const k = xf(t, at)
  return (
    <span className={styles.swap}>
      <span className={cls} style={{ opacity: 1 - k, filter: k > 0.02 && k < 0.98 ? `blur(${k * 3}px)` : undefined }}>{a}</span>
      <span className={clsB ?? cls} style={{ opacity: k, filter: k > 0.02 && k < 0.98 ? `blur(${(1 - k) * 3}px)` : undefined }}>{b}</span>
    </span>
  )
}
const Head = ({ title, sub }: { title: string; sub?: ReactNode }) => (
  <div className={styles.head}><span className={styles.title}>{title}</span>{sub ? <span className={styles.sub}>{sub}</span> : null}</div>
)

/* ================= 1 · confidential negotiation (wide) ================= */
export function SceneNegotiation() {
  return (
    <Scene dur={7.6} rest={6.2} wide>
      {(t) => {
        const glide = ease(seg(t, 2.3, 3.6))
        return (
          <>
            <Head title="Sealed Table" sub={<Swap t={t} at={4.1} a="negotiating" b="attested" cls={styles.sub} clsB={styles.subOn} />} />
            <div className={styles.negGrid}>
              <div>
                {[{ l: "Buyer limit", v: "20,000 ceiling", at: 0.8 }, { l: "Vendor limit", v: "17,000 floor", at: 1.2 }].map((r) => (
                  <div key={r.l} className={styles.row} style={show(t, r.at - 0.5)}>
                    <span className={styles.label}><Lock on={xf(t, r.at)} />{r.l}</span>
                    <Swap t={t} at={r.at} a={r.v} b="sealed" clsB={styles.valOn} />
                  </div>
                ))}
              </div>
              <div className={styles.range}>
                <div className={styles.rangeLabels}><span>buyer range</span><span>vendor range</span></div>
                <div className={styles.track}>
                  <span className={styles.zoneA} />
                  <span className={styles.zoneB} />
                  <span className={styles.overlap} style={{ opacity: xf(t, 1.9) }} />
                  <span className={styles.marker} style={{ left: `${lerp(88, 56, glide)}%`, opacity: ease(seg(t, 2.1, 2.4)) }} />
                </div>
                <div className={styles.rangeFoot} style={show(t, 3.6)}><Check k={xf(t, 3.7)} /><span className={styles.valOn}>Agreed inside both limits</span></div>
              </div>
            </div>
          </>
        )
      }}
    </Scene>
  )
}

/* ================= 2 · one key, one method ================= */
const METHODS = [{ m: "act()", ok: true }, { m: "deploy_contract()" }, { m: "add_full_access_key()" }, { m: "transfer()" }]
export function SceneKey() {
  return (
    <Scene dur={7} rest={5}>
      {(t) => (
        <>
          <Head title="Agent key" sub="FunctionCall" />
          {METHODS.map((r, i) => {
            const on = r.ok ? xf(t, 2.4) : 0
            return (
              <div key={r.m} className={`${styles.row} ${r.ok ? styles.rowGlow : ""}`} style={{ ...show(t, 0.5 + i * 0.25), background: r.ok ? `rgba(145,207,181,${0.08 * on})` : undefined }}>
                <span className={r.ok ? styles.mono : styles.monoDim}>{r.m}</span>
                {r.ok ? <span className={styles.ok}><Check k={on} />allowed</span> : <span className={styles.monoDim}>not allowed</span>}
              </div>
            )
          })}
        </>
      )}
    </Scene>
  )
}

/* ================= 3 · every payment checked ================= */
export function ScenePayment() {
  return (
    <Scene dur={8.4} rest={3.4}>
      {(t) => {
        const swapAt = 4.4
        const bad = xf(t, swapAt + 0.5)
        return (
          <>
            <Head title="Payment request" sub="act()" />
            <div className={styles.row} style={show(t, 0.4)}><span className={styles.label}>Milestone</span><span className={styles.end}><span className={styles.val}>Period 2</span><Check k={xf(t, 1.0)} /></span></div>
            <div className={styles.row} style={show(t, 0.6)}><span className={styles.label}>Amount</span><span className={styles.end}><span className={styles.val}>As agreed</span><Check k={xf(t, 1.4)} /></span></div>
            <div className={styles.row} style={show(t, 0.8)}>
              <span className={styles.label}>Recipient</span>
              <span className={styles.end}>
                <Swap t={t} at={swapAt} a="vendor.near" b="new-account.near" clsB={styles.valBad} />
                <span className={styles.swap}><span style={{ opacity: 1 - bad }}><Check k={xf(t, 1.8)} /></span><span style={{ opacity: bad }}><Cross /></span></span>
              </span>
            </div>
            <div className={styles.foot}>
              <Swap t={t} at={swapAt + 0.6} a={<span className={styles.pillOk} style={{ opacity: xf(t, 2.3) }}><Check />Within the terms · paid</span>} b={<span className={styles.pillBad}>Refused · ERR_PAYEE_MISMATCH</span>} cls={styles.swapFill} />
            </div>
          </>
        )
      }}
    </Scene>
  )
}

/* ================= 4 · a recipient that cannot be redirected ================= */
export function ScenePayee() {
  return (
    <Scene dur={8} rest={6}>
      {(t) => (
        <>
          <Head title="Recipient" sub="vendor.near" />
          <div className={styles.row} style={show(t, 0.4)}>
            <span className={styles.label}>Domain proven</span>
            <span className={styles.end}><span className={styles.val}>vendor.xyz</span><Check k={xf(t, 0.9)} /></span>
          </div>
          <div className={styles.row} style={show(t, 0.6)}>
            <span className={styles.label}>Authority and buyer</span>
            <span className={styles.end}><span className={styles.val}>approved</span><Check k={xf(t, 1.4)} /></span>
          </div>
          {/* a message asks to change the recipient, and changes nothing */}
          <div className={styles.row} style={show(t, 3.2)}>
            <span className={styles.label}>Message</span>
            <Swap t={t} at={4.4} a={<span className={styles.quote}>“Pay our new account”</span>} b={<span className={styles.valOn}>no change</span>} />
          </div>
          <div className={styles.foot}>
            <span className={styles.pillOk} style={{ opacity: xf(t, 2.0) }}><Lock on={1} />Bound for this agreement</span>
          </div>
        </>
      )}
    </Scene>
  )
}

/* ================= 5 · evidence before release ================= */
const SLOTS = [1, 1, 0, 1, 1, 0]
export function SceneEvidence() {
  return (
    <Scene dur={7.6} rest={6}>
      {(t) => {
        const at = (i: number) => 0.8 + i * 0.42
        const passed = SLOTS.filter((p, i) => p && t >= at(i) + 0.2).length
        return (
          <>
            <Head title="Evidence · period 2" sub="hidden times" />
            <div className={styles.slots}>
              {SLOTS.map((p, i) => {
                const k = xf(t, at(i))
                return (
                  <span key={i} className={`${styles.slot} ${p && k > 0.5 ? styles.slotOk : ""}`} style={{ opacity: 0.4 + 0.6 * k }}>
                    {p ? <Check k={k} /> : <span className={styles.dash} style={{ opacity: k }} />}
                  </span>
                )
              })}
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Passed</span>
              <span className={styles.val}><b className={styles.num}>{passed}</b> of 6 · 4 needed</span>
            </div>
            <div className={styles.foot}>
              <Swap t={t} at={3.9} a={<span className={styles.pill}><Lock on={0} />Withheld</span>} b={<span className={styles.pillOk}><Check />Eligible</span>} cls={styles.swapFill} />
            </div>
          </>
        )
      }}
    </Scene>
  )
}

/* ================= 6 · stop the agent in one transaction ================= */
export function SceneRevoke() {
  return (
    <Scene dur={7.6} rest={5.2}>
      {(t) => {
        const pressAt = 1.6
        const press = t > pressAt && t < pressAt + 0.25 ? Math.sin(((t - pressAt) / 0.25) * Math.PI) : 0
        return (
          <>
            <Head title="Agent key" sub="ed25519:Tz8r…5vYc" />
            <div className={styles.row} style={show(t, 0.4)}>
              <span className={styles.label}>Status</span>
              <Swap t={t} at={pressAt + 0.3} a={<span className={styles.status}><i className={styles.dotOk} />Active</span>} b={<span className={styles.status}><i className={styles.dotBad} />Revoked</span>} />
            </div>
            <div className={styles.row} style={show(t, 0.6)}>
              <span className={styles.label}>Keys on the agreement</span>
              <Swap t={t} at={pressAt + 0.4} a="1" b="0" />
            </div>
            <div className={styles.row} style={show(t, 3.2)}>
              <span className={styles.label}>Next act()</span>
              <span className={styles.end}><span className={styles.valBad}>AccessKeyDoesNotExist</span><Cross k={xf(t, 3.5)} /></span>
            </div>
            <div className={styles.foot}>
              <span className={styles.button} style={{ transform: `scale(${1 - 0.04 * press})`, background: `rgba(255,34,68,${0.06 + 0.08 * xf(t, pressAt)})` }}>
                <Swap t={t} at={pressAt + 0.2} a="revoke_agent()" b="Revoked in one transaction" cls={styles.buttonText} />
              </span>
            </div>
          </>
        )
      }}
    </Scene>
  )
}

/* ================= 7 · checkable from public data (wide) ================= */
const CHECKS = [
  { c: "contract code", r: "matches the release hash", ok: true },
  { c: "agent key", r: "FunctionCall · act only", ok: true },
  { c: "recipient proof", r: "bound to the vendor's domain", ok: true },
  { c: "record", r: "payments and refusals reconcile", ok: true },
  { c: "enclave release", r: "job runs proven with outlayer-verify", ok: true },
]
const CMD = "make verify DEAL=<agreement>"
export function SceneVerify() {
  return (
    <Scene dur={8.4} rest={6.6} wide>
      {(t) => {
        const n = Math.floor(clamp((t - 0.5) / 1.1) * CMD.length)
        const at = (i: number) => 1.9 + i * 0.55
        return (
          <>
            <Head title="Terminal" sub="no keys · public data" />
            <div className={styles.cmd}><span className={styles.prompt}>$</span>{CMD.slice(0, n)}<span className={styles.caret} style={{ opacity: t < 1.7 && Math.floor(t * 2.5) % 2 ? 0 : 1 }} /></div>
            {CHECKS.map((c, i) => (
              <div key={c.c} className={`${styles.row} ${styles.checkRow}`} style={show(t, at(i))}>
                <span className={styles.mono}>{c.c}</span>
                <span className={styles.monoDim}>{c.r}</span>
                {c.ok ? <span className={styles.ok}><Check k={xf(t, at(i) + 0.2)} />ok</span> : <span className={styles.monoDim}>pending</span>}
              </div>
            ))}
          </>
        )
      }}
    </Scene>
  )
}

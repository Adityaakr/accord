import { useCallback, useRef, type CSSProperties, type ReactNode } from "react"
import { useInView, useReducedMotion } from "motion/react"
import { CopyButton } from "../CopyButton"
import { QuietLink } from "../QuietLink"
import { useReplay } from "./useReplay"
import styles from "./CodeFlow.module.css"
import rs from "./Replay.module.css"

/* The docs' code blocks, in the replays' family. One motion per block, short and eased, played the first time the
   block is in view (paused off screen); reduced motion shows the final state.
   - Snippet: commands type in, one line after another; copy per line (when more than one) and copy all.
   - OutputLines: a command's printed output reveals line by line, each line's tag in a gutter and a trailing `ok` or
     `not checked` set as a status; a Replay button. The text is the block's own, so copy all copies it exactly.
   - StepFlow: a command sequence as numbered steps on a rail; the active step lights in turn and the agreement's state
     chip advances with it; each step links the transaction where a6 ran it, when the docs map one. */

function Head({ label, code, onReplay }: { label?: string; code: string; onReplay?: () => void }) {
  return (
    <p className={styles.head}>
      <span className={styles.label}>{label ?? ""}</span>
      <span className={styles.headActions}>
        {onReplay ? (
          <button type="button" className={rs.replay} onClick={onReplay} aria-label={`Replay: ${label ?? "this block"}`}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.2 7a4.8 4.8 0 1 0 1.5-3.5" /><path d="M2 1.8v2.6h2.6" /></svg>
            Replay
          </button>
        ) : null}
        <CopyButton text={code} label={label ?? "this code"} />
      </span>
    </p>
  )
}

/* ---------------------------------------------------------------- snippet */
export function Snippet({ code, label, caption }: { code: string; label?: string; caption?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion() ?? false
  const seen = useInView(ref, { once: true, amount: 0.6 })
  const lines = code.split("\n")
  let at = 0
  return (
    <div className={styles.block}>
      <Head label={label} code={code} />
      <div ref={ref} className={`${styles.snippet} ${seen || reduce ? styles.typed : ""}`}>
        {lines.map((l, i) => {
          const style = { "--n": Math.max(l.length, 1), "--d": `${at}ms`, "--t": `${Math.min(900, 140 + l.length * 18)}ms` } as CSSProperties
          at += Math.min(900, 140 + l.length * 18) + 120
          return (
            <div key={i} className={styles.line}>
              <span className={styles.prompt} aria-hidden="true">$</span>
              <code className={`mono ${styles.cmd}`} style={style}>{l}</code>
              {lines.length > 1 ? <CopyButton text={l} label={l} /> : null}
            </div>
          )
        })}
      </div>
      {caption ? <p className={styles.caption}>{caption}</p> : null}
    </div>
  )
}

/* ---------------------------------------------------------------- printed output */
type OutLine = { tag: string; text: string; status?: "ok" | "not checked" }
function outLines(code: string): { title: string; lines: OutLine[] } {
  const [first, ...rest] = code.split("\n")
  return {
    title: first,
    lines: rest.map((raw) => {
      const m = raw.trim().match(/^(\[mock\]|\S+(?: \d+)?)\s{2,}(.*)$/)
      let tag = m ? m[1] : "", text = m ? m[2] : raw.trim()
      let status: OutLine["status"]
      const st = text.match(/^(.*) · (ok|not checked)$/)
      if (st) { text = st[1]; status = st[2] as OutLine["status"] }
      if (!m) { const s = text.match(/^(\S+:)\s(.*)$/); if (s) { tag = s[1]; text = s[2] } }
      return { tag, text, status }
    }),
  }
}

export function OutputLines({ code, label, caption }: { code: string; label?: string; caption?: ReactNode }) {
  const { title, lines } = outLines(code)
  const delay = useCallback((s: number) => (s === 0 ? 250 : 260), [])
  const { ref, stage, reduce, replay } = useReplay(lines.length, delay)
  return (
    <div className={styles.block}>
      <Head label={label} code={code} onReplay={reduce ? undefined : replay} />
      <div ref={ref} className={styles.output}>
        <p className={`mono ${styles.outTitle}`}>{title}</p>
        <ol className={styles.outLines}>
          {lines.map((l, i) => (
            <li key={i} className={`${styles.outLine} ${stage > i ? styles.shown : ""} ${l.tag === "[mock]" ? styles.mock : ""} ${l.tag.endsWith(":") ? styles.summary : ""}`}>
              <span className={`mono ${styles.tag}`}>{l.tag}</span>
              <span className={`mono ${styles.text}`}>{l.text}</span>
              {l.status ? <span className={`${styles.status} ${l.status === "ok" ? styles.ok : ""}`}>{l.status}</span> : <span />}
            </li>
          ))}
        </ol>
      </div>
      {caption ? <p className={styles.caption}>{caption}</p> : null}
    </div>
  )
}

/* ---------------------------------------------------------------- command sequence */
export type FlowStep = { cmd: string; see: ReactNode; href?: string; state?: string }

export function StepFlow({ steps, code, label, start, caption }: { steps: FlowStep[]; code: string; label?: string; start?: string; caption?: ReactNode }) {
  const delay = useCallback((s: number) => (s === 0 ? 300 : 1100), [])
  const { ref, stage, reduce, replay } = useReplay(steps.length, delay)
  /* the state after the last step that has run */
  let state = start
  for (let i = 0; i < Math.min(stage, steps.length); i++) state = steps[i].state ?? state
  const states = [start, ...steps.map((s) => s.state)].filter((s, i, a): s is string => !!s && a.indexOf(s) === i)
  return (
    <div className={styles.block}>
      <Head label={label} code={code} onReplay={reduce ? undefined : replay} />
      <div ref={ref} className={styles.flow}>
        {states.length ? (
          <div className={styles.stateRow}>
            <span className={styles.stateLabel}>agreement state</span>
            <span className={styles.stateTrack}>
              {states.map((s) => (
                <span key={s} className={`${styles.state} ${s === state ? styles.stateOn : ""} ${states.indexOf(s) < states.indexOf(state ?? "") ? styles.statePast : ""}`}>{s}</span>
              ))}
            </span>
          </div>
        ) : null}
        <ol className={styles.steps}>
          {steps.map((s, i) => (
            <li key={s.cmd} className={`${styles.step} ${stage > i ? styles.stepDone : ""} ${stage === i + 1 && stage < steps.length ? styles.stepNow : ""}`}>
              <span className={`mono ${styles.stepNum}`}>{String(i + 1).padStart(2, "0")}</span>
              <span className={styles.stepMain}>
                <span className={styles.stepCmd}>
                  <code className="mono">{s.cmd}</code>
                  <CopyButton text={s.cmd} label={s.cmd} />
                </span>
                <span className={styles.stepSee}>{s.see}</span>
              </span>
              <span className={styles.stepTx}>{s.href ? <QuietLink href={s.href} label={`The transaction where a6 ran ${s.cmd}`}>a6</QuietLink> : null}</span>
            </li>
          ))}
        </ol>
      </div>
      {caption ? <p className={styles.caption}>{caption}</p> : null}
    </div>
  )
}

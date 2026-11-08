import { forwardRef, useId, useState, type ReactNode } from "react"
import { CopyButton } from "../CopyButton"
import { shortHash } from "./parse"
import styles from "./Replay.module.css"

/* The shell every replay shares: the provenance label with a Replay button, the drawing, the block's caption, and a
   "Show raw output" toggle that reveals the exact original text with copy, so nothing in the block is lost. */
/* rawNote: one line shown above the raw text, e.g. when the output was recorded under an earlier command name */
type Props = { label?: string; caption?: ReactNode; raw: string; rawNote?: string; onReplay: () => void; canReplay: boolean; children: ReactNode; ariaLabel: string }

export const ReplayFrame = forwardRef<HTMLDivElement, Props>(function ReplayFrame({ label, caption, raw, rawNote, onReplay, canReplay, children, ariaLabel }, ref) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className={styles.frame}>
      <div className={styles.head}>
        {label ? <span className={styles.label}>{label}</span> : <span />}
        {canReplay ? (
          <button type="button" className={styles.replay} onClick={onReplay} aria-label={`Replay: ${ariaLabel}`}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2.2 7a4.8 4.8 0 1 0 1.5-3.5" /><path d="M2 1.8v2.6h2.6" />
            </svg>
            Replay
          </button>
        ) : null}
      </div>
      <div ref={ref} className={styles.stage} role="figure" aria-label={ariaLabel}>{children}</div>
      {caption ? <p className={styles.caption}>{caption}</p> : null}
      <div className={styles.rawWrap}>
        <button type="button" className={styles.rawToggle} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className={open ? styles.chevOpen : styles.chev}><path d="M3 1.5 6.5 5 3 8.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {open ? "Hide raw output" : "Show raw output"}
        </button>
        <div id={id} className={styles.raw} hidden={!open}>
          {rawNote ? <p className={styles.caption}>{rawNote}</p> : null}
          <pre className="mono">{raw}</pre>
          <CopyButton text={raw} label={label ? `${label}, raw output` : "the raw output"} className={styles.rawCopy} />
        </div>
      </div>
    </div>
  )
})

/** A transaction hash or key: shortened, monospace, with copy. Local-node values are never linked. */
export function Hash({ value, note, what = "transaction hash" }: { value: string; note?: string; what?: string }) {
  return (
    <span className={styles.hash}>
      <span className="mono" title={value}>{shortHash(value)}</span>
      {note ? <span className={styles.hashNote}>({note})</span> : null}
      <CopyButton text={value} label={`${what} ${value}`} />
    </span>
  )
}

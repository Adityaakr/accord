import { useEffect, useState } from "react"
import styles from "./CopyButton.module.css"

/* A small copy button: a copy icon (or the word "copy" with `text` mode), then "copied" for 1.2s, or "failed" when
   the clipboard refuses. The hit area is at least 32px square for phones; the icon is 13px. */
export function CopyButton({ text, label, className = "" }: { text: string; label?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle")
  useEffect(() => {
    if (state === "idle") return
    const t = window.setTimeout(() => setState("idle"), 1200)
    return () => window.clearTimeout(t)
  }, [state])
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setState("copied") } catch { setState("failed") }
  }
  return (
    <button type="button" className={`${styles.copy} ${className}`} onClick={copy} aria-label={`Copy ${label ?? text}`} title={`Copy ${label ?? text}`}>
      {state === "idle" ? (
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <rect x="4.5" y="4.5" width="8" height="8" rx="1.6" />
          <path d="M9.5 4.5V3.1A1.6 1.6 0 0 0 7.9 1.5H3.1A1.6 1.6 0 0 0 1.5 3.1v4.8a1.6 1.6 0 0 0 1.6 1.6h1.4" />
        </svg>
      ) : null}
      <span className={state === "idle" ? styles.srOnly : styles.done} aria-live="polite">{state === "copied" ? "copied" : state === "failed" ? "failed" : ""}</span>
    </button>
  )
}

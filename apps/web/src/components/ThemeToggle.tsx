import { useEffect, useState } from "react"
import styles from "./ThemeToggle.module.css"

/* Light/dark switch. The theme lives on <html data-theme>; index.html applies the stored choice before first paint.
   Dark is the default. The choice is a per-visitor convenience in localStorage (guarded: private windows may throw).
   Every instance stays in sync through a window event. */
type Theme = "dark" | "light"
const KEY = "accord-theme"
const EVENT = "accord-theme-change"

const current = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark")

function apply(t: Theme) {
  document.documentElement.dataset.theme = t
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "light" ? "#f6f6f4" : "#080a09")
  try { localStorage.setItem(KEY, t) } catch { /* storage unavailable: the choice lasts for this page only */ }
  window.dispatchEvent(new Event(EVENT))
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark")
  useEffect(() => {
    const sync = () => setTheme(current())
    sync()
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [])
  const next: Theme = theme === "light" ? "dark" : "light"
  return (
    <button type="button" className={`${styles.toggle} ${className}`} onClick={() => apply(next)} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        {/* sun: shown in dark mode (go light) */}
        <g className={`${styles.icon} ${theme === "dark" ? styles.show : ""}`}>
          <circle cx="10" cy="10" r="3.4" />
          <path d="M10 2.2v1.6M10 16.2v1.6M2.2 10h1.6M16.2 10h1.6M4.5 4.5l1.1 1.1M14.4 14.4l1.1 1.1M4.5 15.5l1.1-1.1M14.4 5.6l1.1-1.1" />
        </g>
        {/* moon: shown in light mode (go dark) */}
        <g className={`${styles.icon} ${theme === "light" ? styles.show : ""}`}>
          <path d="M16.2 12.3A6.6 6.6 0 0 1 7.7 3.8a6.6 6.6 0 1 0 8.5 8.5Z" />
        </g>
      </svg>
    </button>
  )
}

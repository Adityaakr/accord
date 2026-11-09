"use client";

// Light and dark, like the website: the choice is a per-person convenience in localStorage (guarded: private
// windows may throw); with no choice the system preference decides. THEME_SCRIPT runs before paint so the page
// never flashes the wrong theme.

import { useEffect, useState } from "react";
import styles from "./theme.module.css";

const KEY = "accord-theme";
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEY}");if(!t){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","dark")}})();`;

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  // the server cannot know the theme, so the label stays hidden until the real one is read (no "Light theme" flash)
  const [known, setKnown] = useState(false);
  useEffect(() => { setTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"); setKnown(true); }, []);
  const flip = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(KEY, next); } catch { /* the choice lasts for this page only */ }
    setTheme(next);
  };
  return (
    <button type="button" className={styles.toggle} onClick={flip} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>
      {theme === "light" ? (
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="M13 9.5A5.5 5.5 0 1 1 6.5 3a4.5 4.5 0 0 0 6.5 6.5z" /></svg>
      ) : (
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="3" /><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" /></svg>
      )}
      {compact ? null : <span style={known ? undefined : { visibility: "hidden" }}>{theme === "light" ? "Dark theme" : "Light theme"}</span>}
    </button>
  );
}

"use client";

// A command to paste: a caption and a Copy button on a bar above the code, so the button never covers the text.
// The code scrolls sideways rather than wrapping, and is shown exactly as it runs.
import { useState } from "react";
import styles from "./act.module.css";

export function Command({ text, caption = "Terminal", label = "Copy command" }: { text: string; caption?: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className={styles.cmd}>
      <div className={styles.cmdBar}>
        <span>{caption}</span>
        <button type="button" className={styles.copy} aria-label={label}
          onClick={() => { void navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1400); }).catch(() => undefined); }}>
          {done ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className={styles.code}><code>{text}</code></pre>
    </div>
  );
}

"use client";

// A command to paste, with a copy button. The text is shown exactly as it runs.
import { useState } from "react";
import styles from "./act.module.css";

export function Command({ text, label = "Copy command" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className={styles.cmd}>
      <pre className={styles.code}><code>{text}</code></pre>
      <button type="button" className={styles.copy} aria-label={label}
        onClick={() => { void navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1400); }).catch(() => undefined); }}>
        {done ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

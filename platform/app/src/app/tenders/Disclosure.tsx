// A collapsed note: a native <details> with a chevron, a medium title and an optional quiet note beside it.
import type { ReactNode } from "react";
import styles from "./tenders.module.css";

export function Disclosure({ title, note, children, open, className = "" }: {
  title: ReactNode; note?: ReactNode; children: ReactNode; open?: boolean; className?: string;
}) {
  return (
    <details className={`${styles.disc} ${className}`} open={open}>
      <summary>
        <span className={styles.chev} aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <span>{title}</span>
        {note ? <span className={styles.discNote}>{note}</span> : null}
      </summary>
      <div className={styles.discBody}>{children}</div>
    </details>
  );
}

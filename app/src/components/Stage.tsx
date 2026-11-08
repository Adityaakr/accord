// The website's stage: a dark panel with the teal weave and a soft light sheen, holding one floating card.
import type { ReactNode } from "react";
import styles from "./Stage.module.css";

export function Stage({ children, tall }: { children: ReactNode; tall?: boolean }) {
  return (
    <div className={`${styles.stage} ${tall ? styles.tall : ""}`}>
      <span className={styles.weave} aria-hidden="true" />
      <span className={styles.sheen} aria-hidden="true" />
      <div className={styles.inner}>{children}</div>
    </div>
  );
}

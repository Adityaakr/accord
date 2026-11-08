"use client";

// A room's type as one quiet line: a small pixel icon and the name in plain text (no boxes). An optional role reads
// as a subtle leading dot and a word, for lists that mix roles.

import { PixelIcon } from "../PixelIcon";
import styles from "./KindLabel.module.css";

export const KIND_NAME: Record<string, string> = { "market-making": "Market making", procurement: "Vendor contract" };
const ROLE_NAME: Record<string, string> = { buyer: "you buy", vendor: "you sell", authority: "you authorise" };

export function KindLabel({ kind, role, with: counterparty }: { kind: string; role?: string | null; with?: string | null }) {
  return (
    <span className={styles.line}>
      <PixelIcon name={kind === "market-making" ? "chart" : "bag"} size={13} />
      <span>{KIND_NAME[kind] ?? kind}</span>
      {role ? <><span className={styles.sep} aria-hidden="true">·</span><span className={styles.role}><i aria-hidden="true" />{ROLE_NAME[role] ?? role}</span></> : null}
      {counterparty ? <><span className={styles.sep} aria-hidden="true">·</span><span className={styles.with}>with <span className="mono">{counterparty}</span></span></> : null}
    </span>
  );
}

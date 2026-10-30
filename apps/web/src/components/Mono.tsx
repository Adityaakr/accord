import type { ReactNode } from "react"

/* Monospace span for metrics, commands, account ids, refusal strings and state names (brief §2 rule 6).
   `tone="refusal"` is the only place red is used on the site (refusal, canary trip, revocation). */
export function Mono({ children, tone, block, className = "" }: { children: ReactNode; tone?: "refusal"; block?: boolean; className?: string }) {
  const cls = `mono ${tone === "refusal" ? "mono-refusal" : ""} ${block ? "mono-block" : ""} ${className}`
  return block ? <pre className={cls}>{children}</pre> : <code className={cls}>{children}</code>
}

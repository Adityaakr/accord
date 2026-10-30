import type { ReactNode } from "react"
import styles from "./ProductMarks.module.css"

/* Accord's product symbol family: geometric monoline marks on a 24 grid (1.5 stroke, round joins) with one soft tonal
   fill each, set on a glass tile that follows the theme. One family for the product parts, the capabilities and the
   use cases, so every symbol on the site reads as Accord's own rather than a stock icon.
   Strokes draw in once when the tile first appears (`draw`); still under reduced motion. */

type MarkProps = { className?: string }
function Svg({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`${styles.svg} ${className}`}>
      {children}
    </svg>
  )
}
const tone = styles.tone

/* Sealed Table / confidential negotiation: two parties' positions overlap only inside a sealed frame */
export const MarkSealed = ({ className }: MarkProps) => (
  <Svg className={className}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <path className={tone} d="M12 8.3a4.2 4.2 0 0 1 0 7.4 4.2 4.2 0 0 1 0-7.4Z" stroke="none" />
    <circle cx="9.6" cy="12" r="4.2" /><circle cx="14.4" cy="12" r="4.2" />
  </Svg>
)
/* Agreement controls / payment controls: two set limits on their rails */
export const MarkControls = ({ className }: MarkProps) => (
  <Svg className={className}>
    <path d="M4 8h16M4 16h16" />
    <rect className={tone} x="12.5" y="5.5" width="5" height="5" rx="2.5" stroke="none" />
    <circle cx="15" cy="8" r="2.5" /><circle cx="8" cy="16" r="2.5" />
  </Svg>
)
/* Payee / recipient authorisation: one verified destination */
export const MarkRecipient = ({ className }: MarkProps) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <circle className={tone} cx="12" cy="12" r="4.5" stroke="none" />
    <circle cx="12" cy="12" r="4.5" />
    <path d="m10.2 12 1.3 1.3 2.4-2.6" />
  </Svg>
)
/* Agent permissions: a scoped key, with its single permitted method */
export const MarkPermissions = ({ className }: MarkProps) => (
  <Svg className={className}>
    <circle className={tone} cx="8" cy="12" r="4.5" stroke="none" />
    <circle cx="8" cy="12" r="4.5" /><circle cx="8" cy="12" r="1.2" />
    <path d="M12.5 12H21M17.5 12v3M20.5 12v2" />
  </Svg>
)
/* Conditional settlement: a path that only proceeds when the condition holds */
export const MarkConditional = ({ className }: MarkProps) => (
  <Svg className={className}>
    <path d="M3.5 12H9" />
    <path className={tone} d="m12 7.5 4.5 4.5-4.5 4.5L7.5 12Z" stroke="none" />
    <path d="m12 7.5 4.5 4.5-4.5 4.5L7.5 12Z" />
    <path d="M16.5 12h4M18.5 10l2 2-2 2" />
  </Svg>
)
/* Vendor contracts and invoices: a document with its signature line */
export const MarkContract = ({ className }: MarkProps) => (
  <Svg className={className}>
    <path className={tone} d="M14 3v5h5Z" stroke="none" />
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" />
    <path d="M8.5 12.5h7M8.5 17c1-1.2 1.6-1.2 2.3 0s1.4 1.2 2.3 0" />
  </Svg>
)
/* Market-making retainers: order-book depth, bids and asks around the spread */
export const MarkMarket = ({ className }: MarkProps) => (
  <Svg className={className}>
    <path className={tone} d="M3 20V9h2.5v3H8v3h2.5v5ZM13.5 20v-5H16v-3h2.5V9H21v11Z" stroke="none" />
    <path d="M3 20V9h2.5v3H8v3h2.5v5M21 20V9h-2.5v3H16v3h-2.5v5M2.5 20h19" />
    <path d="M12 4v13" strokeDasharray="1.2 1.8" />
  </Svg>
)
/* Agent-to-agent services: two agents, one exchange */
export const MarkAgents = ({ className }: MarkProps) => (
  <Svg className={className}>
    <rect className={tone} x="3" y="8" width="6" height="8" rx="2" stroke="none" />
    <rect x="3" y="8" width="6" height="8" rx="2" /><rect x="15" y="8" width="6" height="8" rx="2" />
    <path d="M9.5 10.5h5m-1.5-1.5 1.5 1.5-1.5 1.5M14.5 13.5h-5m1.5-1.5-1.5 1.5 1.5 1.5" />
  </Svg>
)
/* Foundations and grants: milestones released in sequence */
export const MarkMilestones = ({ className }: MarkProps) => (
  <Svg className={className}>
    <path d="M4 18h16" />
    <path className={tone} d="M4 18v-4h4v4Z" stroke="none" />
    <path d="M4 18v-4h4v4M10 18v-7h4v7M16 18V6h4v12" />
  </Svg>
)

/* The glass tile every mark sits on */
export function MarkTile({ children, size = "md", className = "" }: { children: ReactNode; size?: "sm" | "md" | "lg"; className?: string }) {
  return <span className={`${styles.tile} ${styles[size]} ${className}`} aria-hidden="true">{children}</span>
}

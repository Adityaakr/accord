import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { Arrow } from "./Arrow"
import tl from "../styles/Timeline.module.css"

/* The timeline's quiet link: the text itself is the link, with the Arrow at low opacity until hover. External URLs
   open in a new tab with ↗; site routes use the router with →; /app is a full page load (a separate service). */
export function QuietLink({ href, children, className = "", label, mono = true }: { href: string; children: ReactNode; className?: string; label?: string; mono?: boolean }) {
  const cls = `${mono ? "mono " : ""}${tl.link} ${className}`
  if (href.startsWith("/") && href !== "/app" && !href.startsWith("/app/")) {
    return <Link to={href} className={cls} aria-label={label}>{children}<Arrow /></Link>
  }
  const external = /^https?:/.test(href)
  return (
    <a href={href} className={cls} aria-label={label} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
      {children}<Arrow dir={external ? "up-right" : "right"} />
    </a>
  )
}

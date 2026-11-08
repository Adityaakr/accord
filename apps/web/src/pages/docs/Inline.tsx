import { Fragment } from "react"
import { QuietLink } from "../../components/QuietLink"

/* The docs' two inline marks: `code` → mono, [label](href) → a link (site route or external, with its arrow). */
const TOKEN = /(`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g

export function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN).map((part, i) => {
        if (!part) return null
        if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="mono">{part.slice(1, -1)}</code>
        const m = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
        if (m) return <QuietLink key={i} href={m[2]} mono={false}>{m[1]}</QuietLink>
        return <Fragment key={i}>{part}</Fragment>
      })}
    </>
  )
}

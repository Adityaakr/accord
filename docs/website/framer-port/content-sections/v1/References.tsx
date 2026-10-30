import type { ReactNode } from "react"
import { Appear } from "../lib/motion"
import { SectionHeading, appear } from "../components/SectionHeading"
import { Mono } from "../components/Mono"
import { REFERENCES, UNNUMBERED } from "../content/references"
import styles from "./References.module.css"

/* References (brief §9, anchor #references, accent teal).
   Heading + lead, then the dense bibliography table (# / Source / Date / Link) rendered from REFERENCES.
   Each row is `#ref-n`, the target of every <Ref n /> marker on the site; scroll-margin keeps it under the nav.
   Under the table, the brief's unnumbered line for the four links cited in Under the hood.
   Copy is the brief's, set verbatim; the data comes from src/content/references.ts and is not retyped here. */

/* The tokens the brief sets in monospace inside §9 source cells (metrics and the one command name). */
const MONO_TOKENS = [
  "$3.046B", "$175K", "$300M", "$23M", "$38M", "$5B",
  "12.7%", "16.4%", "32.8%", "24,768", "2,000", "500+", "150+",
  "20%", "40%", "68%", "75%", "1%", "3%", "66M", "35",
  "outlayer-verify",
]
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const MONO_RE = new RegExp(`(?<![\\w$.,-])(?:${MONO_TOKENS.map(escapeRe).join("|")})(?![\\w%+])`, "g")

/* Split a source string and wrap the brief's monospace tokens in <Mono>. */
export function monoSource(text: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(MONO_RE)) {
    const i = m.index ?? 0
    if (i > last) out.push(text.slice(last, i))
    out.push(<Mono key={i}>{m[0]}</Mono>)
    last = i + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const hostname = (href: string) => new URL(href).hostname

function Link({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="ls-link-inline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}

/* Joins nodes with the brief's " · " separator. */
function Dotted({ items }: { items: ReactNode[] }) {
  return (
    <>
      {items.map((node, i) => (
        <span key={i}>
          {i > 0 ? <span className={styles.sep}> · </span> : null}
          {node}
        </span>
      ))}
    </>
  )
}

export function References() {
  const [privateInference, gettingStarted, confidential, accordProject] = UNNUMBERED

  return (
    <section id="references" className={`section ${styles.section}`}>
      <SectionHeading
        eyebrow="References"
        title="Every number and quote, numbered 1 to 44."
        lead="All opened 29 Oct 2026."
        accent="teal"
      />

      <Appear className={`table-wrap ${styles.tableWrap}`} effect={{ ...appear("0.3s"), threshold: 0.1 }}>
        <table className={`table table-dense ${styles.table}`}>
          <thead>
            <tr>
              <th scope="col" className={styles.colN}>#</th>
              <th scope="col">Source</th>
              <th scope="col" className={styles.colDate}>Date</th>
              <th scope="col" className={styles.colLink}>Link</th>
            </tr>
          </thead>
          <tbody>
            {REFERENCES.map((r) => (
              <tr key={r.n} id={`ref-${r.n}`} className={styles.row}>
                <td className={styles.colN}>
                  <Mono>{r.n}</Mono>
                </td>
                <td className={styles.source}>{monoSource(r.source)}</td>
                <td className={styles.colDate}>{r.date}</td>
                <td className={styles.colLink}>
                  <Dotted
                    items={r.links.map((href) => (
                      <Link key={href} href={href}>
                        {hostname(href)}
                      </Link>
                    ))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Appear>

      <Appear as="p" className={`t-body-sm ${styles.unnumbered}`} effect={{ ...appear("0.4s"), threshold: 0.1 }}>
        Also cited in the under-the-hood section without a number:{" "}
        <Dotted
          items={[
            <Link key={privateInference.href} href={privateInference.href}>{privateInference.label}</Link>,
            <Link key={gettingStarted.href} href={gettingStarted.href}>{gettingStarted.label}</Link>,
            <>
              <Link key={confidential.href} href={confidential.href}>{confidential.label}</Link> (the reason the site makes no
              confidential-settlement claim)
            </>,
            <>
              <Link key={accordProject.href} href={accordProject.href}>{accordProject.label}</Link> (the reason the site never says
              "executable agreements").
            </>,
          ]}
        />
      </Appear>
    </section>
  )
}

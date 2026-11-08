import { REFERENCES } from "../content/references"

/* Footnote marker `[n]` → links to row n in the References section (#ref-n).
   Every number on the site carries one; see copy brief ACCORD_WEBSITE_README.md §2 rule 1. */
export function Ref({ n }: { n: number | number[] }) {
  const ns = Array.isArray(n) ? n : [n]
  return (
    <>
      {ns.map((i, idx) => {
        const row = REFERENCES.find((r) => r.n === i)
        return (
          <a key={i} href={`#ref-${i}`} className="ref mono" title={row?.source} aria-label={`Reference ${i}`}>
            {idx > 0 ? " " : ""}[{i}]
          </a>
        )
      })}
    </>
  )
}

import { Navigate, useParams } from "react-router-dom"
import { usePageMeta } from "../../lib/meta"
import { DOC_PAGES } from "../../content/docs/pages"
import { DocsLayout } from "./DocsLayout"
import { Block } from "./Blocks"
import styles from "./Docs.module.css"

/* /docs/:slug: one docs page from content/docs/pages.ts. An unknown slug goes to the overview. */
export function DocPage() {
  const { slug } = useParams()
  const page = DOC_PAGES.find((p) => p.slug === slug)
  usePageMeta(page ? `Accord docs: ${page.title}` : "Accord: Documentation", page?.summary ?? "Accord documentation.")
  if (!page) return <Navigate to="/docs" replace />
  return (
    <div className={styles.page}>
      <DocsLayout page={page}>
        <header className={styles.header}>
          <h1 className={`t-h2 ${styles.title}`}>{page.title}</h1>
          <p className={`t-body-lg ${styles.lead}`}>{page.summary}</p>
        </header>
        {page.sections.map((s) => (
          <section key={s.id} id={s.id} className={styles.section}>
            <h2 className={`t-h5 ${styles.h2}`}><a href={`#${s.id}`} className={styles.anchorLink}>{s.title}</a></h2>
            {s.blocks.map((b, i) => <Block key={i} b={b} />)}
          </section>
        ))}
      </DocsLayout>
    </div>
  )
}

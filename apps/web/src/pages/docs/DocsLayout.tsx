import { useEffect, useState, type ReactNode } from "react"
import { Link, useLocation } from "react-router-dom"
import { Arrow } from "../../components/Arrow"
import { DOC_PAGES } from "../../content/docs/pages"
import type { DocPage } from "../../content/docs/types"
import styles from "./Docs.module.css"

/* The docs shell: a sticky sidebar grouped by section (a drawer under 1024px), breadcrumbs, the page, an
   "On this page" list on wide screens, and previous/next links. */

export const GROUPS: DocPage["group"][] = ["Get started", "Concepts", "Build on NEAR", "Trust"]

function useActive(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? "")
  useEffect(() => {
    if (ids.length === 0) return
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e)
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (top) setActive(top.target.id)
      },
      { rootMargin: "-90px 0px -65% 0px" },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [ids.join("|")]) // eslint-disable-line react-hooks/exhaustive-deps
  return active
}

function Sidebar({ current, onNavigate }: { current: string | null; onNavigate?: () => void }) {
  return (
    <nav className={styles.sideNav} aria-label="Documentation">
      <Link to="/docs" className={`${styles.sideLink} ${current === null ? styles.sideActive : ""}`} aria-current={current === null ? "page" : undefined} onClick={onNavigate}>Overview</Link>
      {GROUPS.map((g) => (
        <div key={g} className={styles.sideGroup}>
          <p className={styles.sideLabel}>{g}</p>
          <ul>
            {DOC_PAGES.filter((p) => p.group === g).map((p) => (
              <li key={p.slug}>
                <Link to={`/docs/${p.slug}`} className={`${styles.sideLink} ${current === p.slug ? styles.sideActive : ""}`} aria-current={current === p.slug ? "page" : undefined} onClick={onNavigate}>{p.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function DocsLayout({ page, children }: { page: DocPage | null; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  const ids = page ? page.sections.map((s) => s.id) : []
  const active = useActive(ids)
  const order = GROUPS.flatMap((g) => DOC_PAGES.filter((p) => p.group === g))
  const i = page ? order.findIndex((p) => p.slug === page.slug) : -1
  const prev = page ? (i > 0 ? order[i - 1] : null) : null
  const next = page ? order[i + 1] ?? null : order[0]

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}><Sidebar current={page?.slug ?? null} /></aside>

      <div className={styles.mobileBar}>
        <button type="button" className={styles.menuButton} aria-expanded={open} aria-controls="docs-drawer" onClick={() => setOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M2 4h10M2 7h10M2 10h10" /></svg>
          Docs menu
        </button>
        <span className={styles.mobileTitle}>{page?.title ?? "Overview"}</span>
      </div>
      {open ? (
        <div className={styles.drawerScrim} onClick={() => setOpen(false)}>
          <div id="docs-drawer" className={styles.drawer} role="dialog" aria-modal="true" aria-label="Documentation" onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.drawerClose} onClick={() => setOpen(false)} aria-label="Close the docs menu">Close</button>
            <Sidebar current={page?.slug ?? null} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <article className={styles.content}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link to="/docs">Docs</Link>
          {page ? <><span aria-hidden="true">/</span><span>{page.group}</span><span aria-hidden="true">/</span><span aria-current="page" className={styles.crumbHere}>{page.title}</span></> : null}
        </nav>
        {children}
        <nav className={styles.pager} aria-label="Previous and next">
          {prev ? <Link to={`/docs/${prev.slug}`} className={styles.pagerLink}><span className={styles.pagerLabel}>Previous</span><span>{prev.title}</span></Link> : <span />}
          {next ? <Link to={`/docs/${next.slug}`} className={`${styles.pagerLink} ${styles.pagerNext}`}><span className={styles.pagerLabel}>Next</span><span>{next.title}<Arrow /></span></Link> : null}
        </nav>
      </article>

      <aside className={styles.toc} aria-label="On this page">
        {page ? (
          <>
            <p className={styles.sideLabel}>On this page</p>
            <ul>
              {page.sections.map((s) => (
                <li key={s.id}><a href={`#${s.id}`} className={`${styles.tocLink} ${active === s.id ? styles.tocActive : ""}`}>{s.title}</a></li>
              ))}
            </ul>
          </>
        ) : null}
      </aside>
    </div>
  )
}

import { useEffect } from "react"

/* Per-page title and description (spec §9). Canonical and social tags follow the title. */
/* Old and short paths render the same page; the canonical URL stays the main one (seo/routes.mjs aliases) */
const CANONICAL: Record<string, string> = { "/atlas": "/use-cases/market-making", "/sealed-table": "/product/sealed-table", "/payee": "/product/payee" }

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title
    const set = (sel: string, attr: string, value: string) => {
      let el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(sel)
      if (!el) { el = document.createElement(sel.startsWith("link") ? "link" : "meta"); const m = sel.match(/\[(\w+)="([^"]+)"\]/); if (m) el.setAttribute(m[1], m[2]); document.head.appendChild(el) }
      el.setAttribute(attr, value)
    }
    set('meta[name="description"]', "content", description)
    set('meta[property="og:title"]', "content", title)
    set('meta[property="og:description"]', "content", description)
    const path = CANONICAL[window.location.pathname] ?? window.location.pathname
    set('link[rel="canonical"]', "href", window.location.origin + path)
    set('meta[property="og:url"]', "content", window.location.origin + path)
    set('meta[name="twitter:title"]', "content", title)
    set('meta[name="twitter:description"]', "content", description)
  }, [title, description])
}

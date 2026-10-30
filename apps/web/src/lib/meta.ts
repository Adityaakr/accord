import { useEffect } from "react"

/* Per-page title and description (spec §9). Canonical and social tags follow the title. */
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
    set('link[rel="canonical"]', "href", window.location.origin + window.location.pathname)
  }, [title, description])
}

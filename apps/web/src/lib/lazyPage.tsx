import { lazy, type ComponentType } from "react"
import { matchPath } from "react-router-dom"

/* Route-level code splitting. Each page is its own chunk; a page already loaded renders straight away (no Suspense
   fallback), so main.tsx preloads the first route's chunk before React replaces the pre-rendered HTML in #root and
   nothing flashes. Pre-rendering is unaffected: scripts/prerender.mjs writes each route's HTML from seo/pages. */
export type Page = ComponentType & { preload: () => Promise<ComponentType> }

export function lazyPage(load: () => Promise<ComponentType>): Page {
  let loaded: ComponentType | null = null
  let pending: Promise<ComponentType> | null = null
  const preload = () => (pending ??= load().then((c) => (loaded = c)))
  const Lazy = lazy(() => preload().then((c) => ({ default: c })))
  return Object.assign(function LazyPage() { return loaded ? <LoadedPage c={loaded} /> : <Lazy /> }, { preload })
}
function LoadedPage({ c: C }: { c: ComponentType }) { return <C /> }

/** Preloads the chunk of the route that matches `pathname` (first match in `routes`, else `fallback`). */
export function preloadRoute(routes: { path: string; page?: Page }[], pathname: string, fallback: Page) {
  const hit = routes.find((r) => r.page && matchPath({ path: r.path, end: true }, pathname))
  return (hit?.page ?? fallback).preload().catch(() => undefined)
}

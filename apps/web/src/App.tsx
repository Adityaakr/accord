import { Suspense, useEffect, useRef } from "react"
import { Routes, Route, Navigate, useLocation } from "react-router-dom"
import Lenis from "lenis"
import { Nav } from "./components/Nav"
import { Footer } from "./components/Footer"
import { lazyPage, type Page } from "./lib/lazyPage"
import styles from "./App.module.css"

/* Every page is its own chunk (lib/lazyPage.tsx), so /docs and /verify do not ship the home page's sections */
const Home = lazyPage(() => import("./pages/Home").then((m) => m.Home))
const NotFound = lazyPage(() => import("./pages/NotFound").then((m) => m.NotFound))
const PrivacyPolicy = lazyPage(() => import("./pages/PrivacyPolicy").then((m) => m.PrivacyPolicy))
const Contact = lazyPage(() => import("./pages/Contact").then((m) => m.Contact))
const Product = lazyPage(() => import("./pages/Product").then((m) => m.Product))
const SealedTable = lazyPage(() => import("./pages/SealedTable").then((m) => m.SealedTable))
const Payee = lazyPage(() => import("./pages/Payee").then((m) => m.Payee))
const MarketMaking = lazyPage(() => import("./pages/MarketMaking").then((m) => m.MarketMaking))
const Security = lazyPage(() => import("./pages/Security").then((m) => m.Security))
const Docs = lazyPage(() => import("./pages/Docs").then((m) => m.Docs))
const DocPage = lazyPage(() => import("./pages/docs/DocPage").then((m) => m.DocPage))
const Research = lazyPage(() => import("./pages/Research").then((m) => m.Research))
const Record = lazyPage(() => import("./pages/Record").then((m) => m.Record))
const Verify = lazyPage(() => import("./pages/Verify").then((m) => m.Verify))
const Join = lazyPage(() => import("./pages/Join").then((m) => m.Join))
const Try = lazyPage(() => import("./pages/Try").then((m) => m.Try))

export const NOT_FOUND = NotFound
/** The route table: path → page (a redirect has no page) */
export const ROUTE_TABLE: { path: string; page?: Page }[] = [
  { path: "/", page: Home },
  { path: "/product", page: Product },
  { path: "/product/sealed-table", page: SealedTable },
  { path: "/product/payee", page: Payee },
  { path: "/payee", page: Payee },
  { path: "/use-cases/market-making", page: MarketMaking },
  { path: "/atlas", page: MarketMaking },
  { path: "/security", page: Security },
  { path: "/docs", page: Docs },
  { path: "/docs/:slug", page: DocPage },
  { path: "/research", page: Research },
  { path: "/demo" },
  { path: "/record", page: Record },
  { path: "/verify", page: Verify },
  { path: "/join", page: Join },
  { path: "/try", page: Try },
  { path: "/sealed-table", page: SealedTable },
  { path: "/404", page: NotFound },
  { path: "/privacy-policy", page: PrivacyPolicy },
  { path: "/contact", page: Contact },
]

/* Layout template "Layout" (vLUWo2njy): fill Background, vertical stack, centered,
   gap 48 (desktop) / 0 (tablet, phone): [Navigation sticky z1] [page content] [Footer].
   Routes follow copy brief ACCORD_WEBSITE_CONTENT.md §F1. */
export function App() {
  const location = useLocation()
  const lenis = useRef<Lenis | null>(null)

  useEffect(() => {
    const l = new Lenis({ lerp: 0.1, smoothWheel: true })
    lenis.current = l
    let raf = 0
    const loop = (t: number) => { l.raf(t); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); l.destroy(); lenis.current = null }
  }, [])

  useEffect(() => {
    const l = lenis.current
    if (location.hash) {
      const id = location.hash.slice(1)
      const el = document.getElementById(id)
      if (el) { l ? l.scrollTo(el, { offset: 0 }) : el.scrollIntoView({ behavior: "smooth" }) }
    } else {
      l ? l.scrollTo(0, { immediate: true }) : window.scrollTo(0, 0)
    }
  }, [location])

  return (
    <div className={styles.layout}>
      <Nav />
      <main id="main" className={styles.content}>
        <Suspense fallback={<div className={styles.loading} aria-busy="true" />}>
          <Routes>
            {ROUTE_TABLE.map(({ path, page: P }) => (
              <Route key={path} path={path} element={P ? <P /> : <Navigate to="/#testnet" replace />} />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

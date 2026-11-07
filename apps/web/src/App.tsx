import { useEffect, useRef } from "react"
import { Routes, Route, useLocation } from "react-router-dom"
import Lenis from "lenis"
import { Nav } from "./components/Nav"
import { Footer } from "./components/Footer"
import { Home } from "./pages/Home"
import { NotFound } from "./pages/NotFound"
import { PrivacyPolicy } from "./pages/PrivacyPolicy"
import { Contact } from "./pages/Contact"
import { Product } from "./pages/Product"
import { SealedTable } from "./pages/SealedTable"
import { Payee } from "./pages/Payee"
import { MarketMaking } from "./pages/MarketMaking"
import { Security } from "./pages/Security"
import { Docs } from "./pages/Docs"
import { Research } from "./pages/Research"
import { Demo } from "./pages/Demo"
import { Record } from "./pages/Record"
import { Verify } from "./pages/Verify"
import { Join } from "./pages/Join"
import { Try } from "./pages/Try"
import styles from "./App.module.css"

/* Layout template "Layout" (vLUWo2njy): fill Background, vertical stack, centered,
   gap 48 (desktop) / 0 (tablet, phone): [Navigation sticky z1] [page content] [Footer].
   Routes follow docs/website/ACCORD_WEBSITE_CONTENT.md §F1. */
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product" element={<Product />} />
          <Route path="/product/sealed-table" element={<SealedTable />} />
          <Route path="/product/payee" element={<Payee />} />
          <Route path="/payee" element={<Payee />} />
          <Route path="/use-cases/market-making" element={<MarketMaking />} />
          <Route path="/atlas" element={<MarketMaking />} />
          <Route path="/security" element={<Security />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/research" element={<Research />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/record" element={<Record />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/join" element={<Join />} />
          <Route path="/try" element={<Try />} />
          <Route path="/sealed-table" element={<SealedTable />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

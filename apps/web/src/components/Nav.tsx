import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Link, useLocation } from "react-router-dom"
import { Logo } from "./Logo"
import { ThemeToggle } from "./ThemeToggle"
import { Button } from "./Button"
import { Hamburger } from "./Hamburger"
import { EASE_UI } from "../lib/motion"
import { LINKS, PRIMARY_CTA } from "../content/links"
import styles from "./Nav.module.css"

/* Navigation (template component xfh9lOiA3) per docs/website/ACCORD_LANDING_PAGE_SPEC.md §2.1, regrouped 8 Nov 2026 around one
   product: centre: Use cases · Product (menu: Overview, Sealed Table, Agreement controls, Payee) · How it works · Security ·
   Verify · Research · Docs; right: GitHub (icon + label, only when configured) and the primary button.
   Phone menu: the same links in the same order, the Product group set out under its label, plus Join and Record. */

type NavItem = { label: string; href: string; external?: boolean; icon?: boolean; note?: string }
const PRODUCT: NavItem[] = [
  { label: "Overview", href: LINKS.product, note: "Negotiation, approval and payment in one deal room" },
  { label: "Sealed Table", href: LINKS.sealedTable, note: "Confidential negotiation between agents" },
  { label: "Agreement controls", href: LINKS.agreementControls, note: "The approved terms govern every payment" },
  { label: "Payee", href: LINKS.payee, note: "Payment only to an authorised recipient" },
]
const BEFORE: NavItem[] = [{ label: "Use cases", href: LINKS.useCases }]
const AFTER: NavItem[] = [
  { label: "How it works", href: "/#how" },
  { label: "Security", href: LINKS.security },
  { label: "Verify", href: LINKS.verify },
  { label: "Research", href: LINKS.research },
  { label: "Docs", href: LINKS.docs },
]
const GITHUB: NavItem | null = LINKS.repo ? { label: "GitHub", href: LINKS.repo, external: true, icon: true } : null
const PHONE_EXTRA: NavItem[] = [
  { label: "Join", href: LINKS.join },
  { label: "Record", href: LINKS.record },
]

/* Desktop Product menu: opens on hover, on click and from the keyboard; Escape or leaving closes it */
function ProductMenu() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const wrap = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  /* a pointer that opened the menu by hovering then clicks: keep it open instead of toggling it shut */
  const byHover = useRef(false)
  useEffect(() => { setOpen(false) }, [location.pathname, location.hash])
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("pointerdown", onDown)
    return () => document.removeEventListener("pointerdown", onDown)
  }, [open])
  return (
    <div ref={wrap} className={styles.group} onMouseEnter={() => { byHover.current = true; setOpen(true) }} onMouseLeave={() => { byHover.current = false; setOpen(false) }}
      onKeyDown={(e) => { if (e.key === "Escape" && open) { setOpen(false); button.current?.focus() } }}
      onBlur={(e) => { if (!wrap.current?.contains(e.relatedTarget as Node)) setOpen(false) }}>
      <button ref={button} type="button" className={`t-body-sm ls-link ${styles.link} ${styles.groupBtn}`} aria-expanded={open} aria-controls="nav-product" onClick={() => { if (byHover.current) { byHover.current = false; setOpen(true) } else setOpen((o) => !o) }}>
        Product
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={open ? styles.chevOpen : styles.chev}><path d="m4 6 4 4 4-4" /></svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div id="nav-product" className={styles.panel} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ type: "tween", ease: EASE_UI, duration: 0.18 }}>
            {PRODUCT.map((p) => (
              <Link key={p.label} to={p.href} className={styles.panelItem}>
                <span className={styles.panelLabel}>{p.label}</span>
                <span className={styles.panelNote}>{p.note}</span>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
    </svg>
  )
}

function NavLink({ item, className, onClick }: { item: NavItem; className: string; onClick?: () => void }) {
  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={`${className} ${item.icon ? styles.iconLink : ""}`} onClick={onClick}>
        {item.icon ? <GitHubIcon /> : null}
        {item.label}
      </a>
    )
  }
  return <Link to={item.href} className={className} onClick={onClick}>{item.label}</Link>
}

export function Nav() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => { setOpen(false) }, [location.pathname, location.hash])
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : ""
    return () => { document.documentElement.style.overflow = "" }
  }, [open])

  return (
    <nav className={`${styles.nav} ${open ? styles.open : ""}`} aria-label="Primary">
      <a href="#main" className={styles.skip}>Skip to content</a>
      <motion.div className={styles.container} animate={{ height: open ? "100vh" : "auto" }} transition={{ type: "tween", ease: EASE_UI, duration: 0.4 }}>
        <div className={styles.navbar}>
          <Logo onClick={() => setOpen(false)} />
          <div className={styles.hamburger}>
            <ThemeToggle className={styles.themePhone} />
            <Hamburger open={open} onTap={() => setOpen((o) => !o)} color={open ? "var(--text-strong)" : "var(--white)"} />
          </div>
        </div>

        <div className={styles.menuDesktop}>
          {BEFORE.map((l) => <NavLink key={l.label} item={l} className={`t-body-sm ls-link ${styles.link}`} />)}
          <ProductMenu />
          {AFTER.map((l) => <NavLink key={l.label} item={l} className={`t-body-sm ls-link ${styles.link}`} />)}
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="mobile-menu"
              className={styles.menuMobile}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "tween", ease: EASE_UI, duration: 0.4 }}
            >
              {BEFORE.map((l) => <NavLink key={l.label} item={l} className={`t-h5 ls-link ${styles.linkMobile}`} onClick={() => setOpen(false)} />)}
              <div className={styles.mobileGroup}>
                <span className={`t-body-sm ${styles.mobileGroupLabel}`}>Product</span>
                {PRODUCT.map((l) => <NavLink key={l.label} item={l} className={`t-h6 ls-link ${styles.linkMobile}`} onClick={() => setOpen(false)} />)}
              </div>
              {[...AFTER, ...PHONE_EXTRA, ...(GITHUB ? [GITHUB] : [])].map((l) => (
                <NavLink key={l.label} item={l} className={`t-h5 ls-link ${styles.linkMobile}`} onClick={() => setOpen(false)} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`${styles.cta} ${open ? styles.ctaOpen : ""}`}>
          {GITHUB ? <NavLink item={GITHUB} className={`t-body-sm ls-link ${styles.link} ${styles.github}`} /> : null}
          <ThemeToggle className={styles.themeDesktop} />
          <Button href={LINKS.openDealRoom} fullWidth={open}>{PRIMARY_CTA}</Button>
        </div>
      </motion.div>
    </nav>
  )
}

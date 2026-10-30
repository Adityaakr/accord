import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Link, useLocation } from "react-router-dom"
import { Logo } from "./Logo"
import { ThemeToggle } from "./ThemeToggle"
import { Button } from "./Button"
import { Hamburger } from "./Hamburger"
import { EASE_UI } from "../lib/motion"
import { LINKS, PRIMARY_CTA } from "../content/links"
import styles from "./Nav.module.css"

/* Navigation (template component xfh9lOiA3) per docs/website/ACCORD_LANDING_PAGE_SPEC.md §2.1:
   centre: Atlas · How it works · Sealed Table · Payee · Security · Verify · Research · Docs;
   right: GitHub (icon + label, only when configured) and the primary button.
   Phone menu: the same links in the same order plus Join and Record (Changelog/Status appear once those pages exist). */

type NavItem = { label: string; href: string; external?: boolean; icon?: boolean }
const LINKS_NAV: NavItem[] = [
  { label: "Atlas", href: LINKS.exploreAtlas },
  { label: "How it works", href: "/#how" },
  { label: "Sealed Table", href: LINKS.sealedTable },
  { label: "Payee", href: LINKS.payee },
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
          {LINKS_NAV.map((l) => <NavLink key={l.label} item={l} className={`t-body-sm ls-link ${styles.link}`} />)}
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
              {[...LINKS_NAV, ...PHONE_EXTRA, ...(GITHUB ? [GITHUB] : [])].map((l) => (
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

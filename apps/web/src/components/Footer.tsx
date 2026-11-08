import { Link } from "react-router-dom"
import { Logo } from "./Logo"
import { NearLogo } from "./NearLogo"
import { LINKS } from "../content/links"
import styles from "./Footer.module.css"

/* Footer (template component FcRdbUGhW) per docs/website/ACCORD_LANDING_PAGE_SPEC.md §2.3:
   Product · Build · Watch · Company columns. Links to pages that do not exist yet
   (Changelog, Status, Brand, Terms, About) are not rendered. Dark theme only (owner's design). */

type Item = { key: string; label: string; href: string; external?: boolean }

const PRODUCT: Item[] = [
  { key: "use-cases", label: "Use cases", href: LINKS.useCases },
  { key: "how", label: "How it works", href: "/#how" },
  { key: "sealed", label: "Sealed Table", href: LINKS.sealedTable },
  { key: "payee", label: "Payee", href: LINKS.payee },
  { key: "security", label: "Security", href: LINKS.security },
  { key: "research", label: "Research", href: LINKS.research },
]
const BUILD: Item[] = [
  ...(LINKS.repo ? [{ key: "github", label: "GitHub", href: LINKS.repo, external: true }] : []),
  { key: "docs", label: "Documentation", href: LINKS.docs },
  { key: "agents", label: "For AI agents", href: "/llms.txt", external: true },
  ...(LINKS.contractId ? [{ key: "contract", label: "Testnet contract", href: `https://testnet.nearblocks.io/address/${LINKS.contractId}`, external: true }] : []),
  { key: "record", label: "Record page", href: LINKS.record },
  { key: "verify", label: "Verify an agreement", href: LINKS.verify },
  { key: "join", label: "Join a deal room", href: LINKS.join },
]
const WATCH: Item[] = [
  ...(LINKS.demoVideo ? [{ key: "video", label: "Demonstration video", href: LINKS.demoVideo, external: true }] : []),
  ...(LINKS.xPost ? [{ key: "post", label: "Announcement", href: LINKS.xPost, external: true }] : []),
]
const COMPANY: Item[] = [
  { key: "contact", label: "Contact", href: LINKS.contact },
  { key: "privacy", label: "Privacy", href: LINKS.privacy },
]

function ItemLink({ it }: { it: Item }) {
  const cls = `t-body-sm ls-link ${styles.item}`
  if (it.external) return <a href={it.href} target="_blank" rel="noopener noreferrer" className={cls}>{it.label}</a>
  return <Link to={it.href} className={cls}>{it.label}</Link>
}

function Column({ title, items }: { title: string; items: Item[] }) {
  if (!items.length) return null
  return (
    <div className={styles.column}>
      <h2 className={`t-h6 ${styles.columnTitle}`}>{title}</h2>
      <div className={styles.items}>{items.map((it) => <ItemLink key={it.key} it={it} />)}</div>
    </div>
  )
}


export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.info}>
          <div className={styles.description}>
            <Logo />
            <p className={`t-body-sm ${styles.tagline}`}>The private deal room and control plane for agent-to-agent commerce.</p>
          </div>
          <p className={`t-body-sm ${styles.copyright}`}>
            Built on
            <NearLogo />
          </p>
        </div>
        <div className={styles.menu}>
          <Column title="Product" items={PRODUCT} />
          <Column title="Build" items={BUILD} />
          <Column title="Watch" items={WATCH} />
          <Column title="Company" items={COMPANY} />
        </div>
      </div>
    </footer>
  )
}

import { Link } from "react-router-dom"
import { Logo } from "./Logo"
import { LINKS } from "../content/links"
import styles from "./Footer.module.css"

/* Footer (template component FcRdbUGhW) per docs/website/ACCORD_LANDING_PAGE_SPEC.md §2.3:
   Product · Build · Watch · Company columns; bottom row: hackathon badge (links to the X post and the
   repository when configured), the licence line, the testnet line. Links to pages that do not exist yet
   (Changelog, Status, Brand, Terms, About) are not rendered. Dark theme only (owner's design). */

type Item = { key: string; label: string; href: string; external?: boolean }

const PRODUCT: Item[] = [
  { key: "atlas", label: "Accord Atlas", href: LINKS.exploreAtlas },
  { key: "how", label: "How it works", href: "/#how" },
  { key: "sealed", label: "Sealed Table", href: LINKS.sealedTable },
  { key: "payee", label: "Payee", href: LINKS.payee },
  { key: "security", label: "Security", href: LINKS.security },
  { key: "research", label: "Research", href: LINKS.research },
  { key: "pricing", label: "Pricing", href: "/#pricing" },
]
const BUILD: Item[] = [
  ...(LINKS.repo ? [{ key: "github", label: "GitHub", href: LINKS.repo, external: true }] : []),
  { key: "docs", label: "Documentation", href: LINKS.docs },
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
      <h6 className={`t-h6 ${styles.columnTitle}`}>{title}</h6>
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
          {/* NEAR's current mark and wordmark (from near.org), black on NEAR green, as in NEAR's own lockup */}
          <p className={`t-body-sm ${styles.copyright}`}>
            Built on
            <span className={styles.nearBadge} role="img" aria-label="NEAR">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true" focusable="false"><path d="M13.9017 0.646973C13.3462 0.646973 12.8304 0.929357 12.5394 1.39357L9.40403 5.95741C9.30186 6.10784 9.34331 6.31059 9.49675 6.41075C9.6211 6.49202 9.78561 6.48196 9.89889 6.38645L12.9851 3.76201C13.0364 3.71677 13.1154 3.72137 13.1616 3.77165C13.1825 3.79469 13.1937 3.82444 13.1937 3.85502V12.0719C13.1937 12.1397 13.1377 12.1942 13.0684 12.1942C13.0312 12.1942 12.9962 12.1783 12.9727 12.1502L3.6435 1.20169C3.33966 0.850174 2.89352 0.647392 2.42388 0.646973H2.09782C1.21536 0.646973 0.5 1.34833 0.5 2.2135V13.7863C0.5 14.6515 1.21536 15.3528 2.09782 15.3528C2.65336 15.3528 3.16915 15.0704 3.46017 14.6062L6.59558 10.0424C6.69769 9.89194 6.65624 9.68919 6.50279 9.58903C6.37845 9.50776 6.21394 9.51782 6.10071 9.61334L3.01446 12.2378C2.96318 12.283 2.88412 12.2784 2.83797 12.2281C2.81703 12.2051 2.80592 12.1753 2.80634 12.1447V3.92583C2.80634 3.85796 2.86232 3.80349 2.93155 3.80349C2.96831 3.80349 3.00377 3.81941 3.02728 3.84748L12.3552 14.7981C12.659 15.1496 13.1052 15.3524 13.5749 15.3528H13.9009C14.7833 15.3532 15.4992 14.6523 15.5 13.7871V2.2135C15.5 1.34833 14.7842 0.646973 13.9017 0.646973Z" /></svg>
              <svg viewBox="0 0 345 86" width="38" height="10" fill="currentColor" aria-hidden="true" focusable="false"><path d="M48.4639 1.10645C39.1502 1.10645 32.3777 3.20312 26.624 8.03978L16.4631 16.4231C15.6162 17.0698 13.9225 17.5532 12.7394 16.5831C11.5526 15.6165 11.3847 14.3265 12.3999 13.0365L17.8177 5.29646C18.6646 4.16645 17.9893 2.71642 16.4631 2.71642H3.42574C1.90314 2.71642 0.716797 3.84643 0.716797 5.29646V80.7635C0.716797 82.2135 1.90314 83.3435 3.42574 83.3435H16.9709C18.4935 83.3435 19.6798 82.2135 19.6798 80.7635V38.193C19.6798 18.6832 36.7808 15.6198 43.2139 15.6198C56.9269 15.6198 61.8374 24.9732 61.8374 32.0663V80.7635C61.8374 82.2135 63.0238 83.3435 64.5464 83.3435H78.0911C79.6137 83.3435 80.8005 82.2135 80.8005 80.7635V30.4532C80.8005 12.3931 68.4421 1.10645 48.4639 1.10645Z" /><path d="M135.995 0.783203C109.752 0.783203 92.9902 16.1032 92.9902 36.9031V48.3535C92.9902 70.2833 109.752 85.2803 135.995 85.2803C159.189 85.2803 175.443 73.8303 177.137 58.3503C177.309 56.7368 176.122 55.6102 174.428 55.6102H161.223C160.036 55.6102 159.021 56.2568 158.681 57.3833C156.988 62.5435 149.032 70.2833 135.995 70.2833C122.957 70.2833 110.766 61.2534 110.935 48.3535L111.106 34.0035C111.274 23.2 123.128 15.7833 135.995 15.7833C147.678 15.7833 159.021 22.0733 160.204 32.3935C160.302 33.5868 159.441 34.6632 158.206 34.89L120.245 41.9068C118.722 42.2299 117.536 43.5199 117.536 45.1299V45.2899C117.536 46.7399 119.058 48.03 121.26 48.03H175.779C177.277 48.03 178.488 46.8736 178.488 45.4499V35.2935C178.488 16.1066 161.048 0.786544 135.991 0.786544L135.995 0.783203Z" /><path d="M230.464 0.781661C209.3 0.781661 191.016 12.5517 191.016 28.0317C191.016 29.3218 192.202 30.2883 193.725 30.2883H207.438C208.792 30.2883 209.807 29.3218 209.979 28.0317C211.333 20.9384 220.307 15.7784 229.957 15.7784C241.468 15.7784 249.26 22.5517 249.26 34.1619V48.1919C249.26 62.5419 238.084 69.7987 224.199 69.7987C213.363 69.7987 207.098 65.9286 207.098 59.6384C207.098 54.1551 210.147 49.4785 222.673 46.7384L240.79 42.0617C242.651 41.5782 243.33 40.1251 242.991 38.5151C242.823 37.2251 241.3 36.5785 239.942 36.5785H221.151C205.236 36.5785 189.15 46.2518 189.15 60.4418V62.6984C189.15 77.2119 203.542 84.7886 219.964 84.7886C230.461 84.7886 239.435 80.9185 245.021 76.4053L253.319 69.6321C254.674 68.502 256.028 68.502 257.211 69.6321C258.226 70.5986 257.887 72.0517 257.04 73.1787L251.961 80.7585C251.114 81.8886 251.79 83.3386 253.316 83.3386H265.506C267.029 83.3386 268.215 82.2085 268.215 80.7585V31.8983C268.215 13.195 254.163 0.77832 230.457 0.77832L230.464 0.781661Z" /><path d="M341.359 2.71973H322.393C315.792 2.71973 309.356 6.58971 304.784 10.2998L297.338 16.4264C296.491 17.0731 294.965 17.5564 293.95 16.7498C292.763 15.9431 292.256 14.3298 293.274 13.0397L298.692 5.29972C299.54 4.16971 298.864 2.71973 297.338 2.71973H284.64C283.117 2.71973 281.931 3.84973 281.931 5.29972V80.7665C281.931 82.2165 283.117 83.3466 284.64 83.3466H298.524C300.046 83.3466 301.233 82.2165 301.233 80.7665V42.0666C301.233 25.4565 308.344 18.0398 323.754 18.0398H341.359C342.881 18.0398 344.068 16.9098 344.068 15.4597V5.29972C344.068 3.84973 342.881 2.71973 341.359 2.71973Z" /></svg>
            </span>
          </p>
        </div>
        <div className={styles.menu}>
          <Column title="Product" items={PRODUCT} />
          <Column title="Build" items={BUILD} />
          <Column title="Watch" items={WATCH} />
          <Column title="Company" items={COMPANY} />
        </div>
      </div>
      <div className={styles.bottom}>
        <p className={`t-body-sm ${styles.bottomLine}`}>Open source under the MIT licence.</p>
        <p className={`t-body-sm ${styles.bottomLine}`}>Runs on NEAR testnet. Mainnet follows an audit.</p>
      </div>
    </footer>
  )
}

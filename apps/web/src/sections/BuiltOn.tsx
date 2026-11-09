import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { NearLogo } from "../components/NearLogo"
import { NearAiLogo } from "../components/NearAiLogo"
import styles from "./BuiltOn.module.css"

/* Home · Built on (#built-on), directly under the hero (8 Nov 2026, from Adi's reference: a logo line). A plain label,
   then a moving line over a faint column grid: each item is the project's own mark and its name, large. Marks are the
   official artwork: USDC is Circle's coin (inline, from Circle's SVG), OutLayer's, Rhea's, NEAR Builders' and
   Intear's are their site icons, HOT's (for HOT Connect, its connector library) and Meteor's the icons their wallets publish in the HOT Connect wallet manifest
   (all in public/assets/logos), NEAR and NEAR AI come from the existing components. Each item's role in Accord sits in the
   DOM for screen readers and agents; the visible line shows names only. Two copies make the loop (the second is
   hidden); hover or focus pauses; reduced motion stands still and wraps. The note says no partnership is claimed. */

const rise: AppearEffect = {
  threshold: 0.2,
  replay: false,
  enter: { opacity: 0, x: 0, y: 16, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1s", delay: "0.1s" } },
}

/* Circle's USDC mark */
const Usdc = () => (
  <svg viewBox="0 0 2000 2000" aria-hidden="true" className={styles.svgMark}>
    <path d="M1000 2000c554.17 0 1000-445.83 1000-1000S1554.17 0 1000 0 0 445.83 0 1000s445.83 1000 1000 1000z" fill="#2775ca" />
    <path d="M1275 1158.33c0-145.83-87.5-195.83-262.5-216.66-125-16.67-150-50-150-108.34s41.67-95.83 125-95.83c75 0 116.67 25 137.5 87.5 4.17 12.5 16.67 20.83 29.17 20.83h66.66c16.67 0 29.17-12.5 29.17-29.16v-4.17c-16.67-91.67-91.67-162.5-187.5-170.83v-100c0-16.67-12.5-29.17-33.33-33.34h-62.5c-16.67 0-29.17 12.5-33.34 33.34v95.83c-125 16.67-204.16 100-204.16 204.17 0 137.5 83.33 191.66 258.33 212.5 116.67 20.83 154.17 45.83 154.17 112.5s-58.34 112.5-137.5 112.5c-108.34 0-145.84-45.84-158.34-108.34-4.16-16.66-16.66-25-29.16-25h-70.84c-16.66 0-29.16 12.5-29.16 29.17v4.17c16.66 104.16 83.33 179.16 220.83 200v100c0 16.66 12.5 29.16 33.33 33.33h62.5c16.67 0 29.17-12.5 33.34-33.33v-100c125-20.84 208.33-108.34 208.33-220.84z" fill="#fff" />
    <path d="M787.5 1595.83c-325-116.66-491.67-479.16-370.83-800 62.5-175 200-308.33 370.83-370.83 16.67-8.33 25-20.83 25-41.67V325c0-16.67-8.33-29.17-25-33.33-4.17 0-12.5 0-16.67 4.16-395.83 125-612.5 545.84-487.5 941.67 75 233.33 254.17 412.5 487.5 487.5 16.67 8.33 33.34 0 37.5-16.67 4.17-4.16 4.17-8.33 4.17-16.66v-58.34c0-12.5-12.5-29.16-25-37.5zM1229.17 295.83c-16.67-8.33-33.34 0-37.5 16.67-4.17 4.17-4.17 8.33-4.17 16.67v58.33c0 16.67 12.5 33.33 25 41.67 325 116.66 491.67 479.16 370.83 800-62.5 175-200 308.33-370.83 370.83-16.67 8.33-25 20.83-25 41.67V1700c0 16.67 8.33 29.17 25 33.33 4.17 0 12.5 0 16.67-4.16 395.83-125 612.5-545.84 487.5-941.67-75-237.5-258.34-416.67-487.5-491.67z" fill="#fff" />
  </svg>
)

type Item = { name: string; role: string; mark: React.ReactNode; wordmark?: boolean }
const ITEMS: Item[] = [
  { name: "NEAR", mark: <span className={`${styles.tile} ${styles.tileNear}`}><NearLogo variant="mono" /></span>,
    role: "The agreement contract, its escrowed USDC and the on-chain record of every payment and refusal." },
  { name: "NEAR AI Cloud", wordmark: true, mark: <span className={styles.nearai}><NearAiLogo /></span>,
    role: "Private inference for the negotiating agents; each response's signature is checked in the enclave." },
  { name: "OutLayer", mark: <img className={styles.tile} src="/assets/logos/outlayer.png" alt="" width={32} height={32} loading="lazy" />,
    role: "Attested enclaves for the Sealed Table, the recipient binding and the market observer." },
  { name: "USDC", mark: <span className={styles.coin}><Usdc /></span>,
    role: "Settlement on NEAR as a NEP-141 token, paid only by the contract from each agreement's own account." },
  { name: "NEAR Intents", mark: <img className={styles.tile} src="/assets/logos/near-intents.png" alt="" width={32} height={32} loading="lazy" />,
    role: "Planned: funding an agreement from other chains through NEAR Intents' 1Click API." },
  { name: "Rhea", mark: <span className={`${styles.tile} ${styles.tileDark}`}><img src="/assets/logos/rhea.svg" alt="" width={22} height={20} loading="lazy" /></span>,
    role: "The USDC/wNEAR pool the market-making observer reads at hidden times." },
  { name: "HOT Connect", mark: <img className={styles.tile} src="/assets/logos/hot-wallet.png" alt="" width={32} height={32} loading="lazy" />,
    role: "HOT's wallet connector library (@hot-labs/near-connect): the Accord app's sign-in, listing the NEAR wallets a principal can use on testnet." },
  { name: "Meteor Wallet", mark: <span className={`${styles.tile} ${styles.tileLight}`}><img src="/assets/logos/meteor-wallet.svg" alt="" width={24} height={24} loading="lazy" /></span>,
    role: "A NEAR wallet for the Accord app; on testnet it signs delegate actions that Accord's relayer sends, so the user pays no gas except for opening a room, whose 2 NEAR deposit the wallet pays itself." },
  { name: "Intear Wallet", mark: <span className={`${styles.tile} ${styles.tileLight}`}><img src="/assets/logos/intear-wallet.svg" alt="" width={24} height={24} loading="lazy" /></span>,
    role: "A NEAR wallet for the Accord app; on testnet it signs delegate actions that Accord's relayer sends, so the user pays no gas except for opening a room, whose 2 NEAR deposit the wallet pays itself." },
  { name: "NEAR Builders", mark: <img className={styles.tile} src="/assets/logos/near-builders.png" alt="" width={32} height={32} loading="lazy" />,
    role: "The NEAR builder community; Accord was built with its build resources." },
]

function Row({ it }: { it: Item }) {
  return (
    <li className={styles.item}>
      <span aria-hidden="true" className={styles.markWrap}>{it.mark}</span>
      {/* NEAR AI's wordmark already reads "near AI"; the visible name adds "Cloud" */}
      <span className={styles.name}>{it.wordmark ? <><span className={styles.sr}>NEAR AI </span>Cloud</> : it.name}</span>
      <span className={styles.sr}>: {it.role}</span>
    </li>
  )
}

export function BuiltOn() {
  return (
    <section id="built-on" className={`section ${styles.section}`} aria-labelledby="built-on-title">
      <h2 id="built-on-title" className={styles.label}>Built on</h2>

      <Appear as="div" className={styles.marquee} effect={rise}>
        <div className={styles.track}>
          <ul className={styles.list}>{ITEMS.map((it) => <Row key={it.name} it={it} />)}</ul>
          <ul className={`${styles.list} ${styles.copy}`} aria-hidden="true" data-seo-skip>{ITEMS.map((it) => <Row key={it.name} it={it} />)}</ul>
        </div>
      </Appear>

      <p className={styles.note}>Accord builds on these networks and services; it does not claim a partnership with them. NEAR Intents, for funding from other chains, is planned.</p>
    </section>
  )
}

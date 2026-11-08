import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { NearLogo } from "../components/NearLogo"
import { NearAiLogo } from "../components/NearAiLogo"
import styles from "./BuiltOn.module.css"

/* Home · Built on (#built-on): a slim moving line (since 8 Nov 2026; was a five-column strip) after the research, before the quotes (8 Nov 2026). What Accord runs on,
   one line each, in the same words as /docs "Five pieces of the NEAR stack". Every mark is monochrome (NEAR and
   NEAR AI in their mono variants; OutLayer and Rhea as the plain dot used on the use-case cards; USDC as a generic
   outline coin, not Circle's logo), nothing links out, and the note says plainly that no partnership is claimed.
   Status is grounded in ~/accord-app PROGRESS.md: built and tested on a local NEAR node; enclave and model runs
   wait on the testnet release. */

const rise: AppearEffect = {
  threshold: 0.3,
  replay: false,
  enter: { opacity: 0, x: 0, y: 24, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1s", delay: "0s" } },
}

const Dot = () => <i className={styles.dot} aria-hidden="true" />
const Coin = () => (
  <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
    <circle cx="8" cy="8" r="6.6" /><path d="M9.8 6.1c-.3-.6-1-1-1.8-1-1 0-1.8.6-1.8 1.4 0 1.9 3.7 1 3.7 2.9 0 .8-.8 1.4-1.9 1.4-.8 0-1.5-.4-1.8-1M8 4v8" strokeLinecap="round" />
  </svg>
)

const ITEMS = [
  { name: "NEAR", mark: <span aria-hidden="true"><NearLogo variant="mono" /></span>, short: "contract, escrow and record", line: "The agreement contract, its escrowed USDC and the on-chain record of every payment and refusal." },
  { name: "Cloud", mark: <span className={styles.nearai}><NearAiLogo mono /></span>, short: "private inference for the agents", line: "Private inference for the negotiating agents; each response's signature is checked in the enclave." },
  { name: "OutLayer", mark: <Dot />, short: "attested enclaves", line: "Attested enclaves for the Sealed Table, the recipient binding and the market observer." },
  { name: "USDC on NEAR", mark: <Coin />, short: "settlement, NEP-141", line: "Settlement as a NEP-141 token, paid only by the contract from each agreement's own account." },
  { name: "Rhea", mark: <Dot />, short: "the pool the observer reads", line: "The USDC/wNEAR pool the market-making observer reads at hidden times." },
]

function Item({ it }: { it: (typeof ITEMS)[number] }) {
  return (
    <li className={styles.item}>
      <span className={styles.name}>{it.mark}<span>{it.name}</span><span className={styles.sr}>: </span></span>
      {/* a short phrase on the line; the full sentence for screen readers and agents */}
      <span className={styles.line} aria-hidden="true">{it.short}</span>
      <span className={styles.sr}>{it.line}</span>
    </li>
  )
}

export function BuiltOn() {
  return (
    <section id="built-on" className={`section ${styles.section}`} aria-labelledby="built-on-title">
      <div className={styles.head}>
        <span className={styles.pill} aria-hidden="true" />
        <h2 id="built-on-title" className={`t-body-sm ${styles.label}`}>Built on</h2>
      </div>

      {/* The moving line: the list, then the same list again (hidden from readers and agents) so the loop never breaks.
          Hover or keyboard focus pauses it; with reduced motion it stands still and wraps. */}
      <Appear as="div" className={styles.marquee} effect={rise}>
        <div className={styles.track}>
          <ul className={styles.list}>{ITEMS.map((it) => <Item key={it.name} it={it} />)}</ul>
          <ul className={`${styles.list} ${styles.copy}`} aria-hidden="true" data-seo-skip>{ITEMS.map((it) => <Item key={it.name} it={it} />)}</ul>
        </div>
      </Appear>

      <p className={styles.note}>
        Accord builds on these networks and services; it does not claim a partnership with them. Built and tested end to end on a local NEAR node;
        the enclave and model runs follow the testnet release.
      </p>
    </section>
  )
}

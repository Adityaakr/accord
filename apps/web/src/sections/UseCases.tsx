import type { ReactNode } from "react"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { SectionHeading } from "../components/SectionHeading"
import { PixelIcon, type PixelName } from "../components/PixelIcon"
import { LogoMark } from "../components/Logo"
import { NearLogo } from "../components/NearLogo"
import { NearAiLogo } from "../components/NearAiLogo"
import styles from "./UseCases.module.css"

/* Home · Use cases (#use-cases), after How it works (8 Nov 2026). Six cards, each an outcome a business would recognise:
   a pixel icon on a tile, the outcome as the title, two sentences, and the parts and rails it runs on. The corner of each
   card holds a small drawing of what the agreement checks, above the title,, in the site's own data colours (teal for a pass, coral for a
   market's asks, refusal red only for a refused payment), fading into the card. Types that are not built yet say
   "Planned". Names and figures match the deal-room band above. */

const rise = (delay: `${number}s`): AppearEffect => ({
  threshold: 0.3,
  replay: false,
  enter: { opacity: 0, x: 0, y: 24, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1s", delay } },
})

/* What a card runs on: Accord's own parts carry the Accord mark, partners their own mark or a plain dot */
type Rail = "near" | "usdc" | "nearai" | "outlayer" | "rhea" | "payee" | "controls" | "sealed"
function RailMark({ r }: { r: Rail }) {
  switch (r) {
    case "near": return <span className={styles.rail}><span aria-hidden="true"><NearLogo variant="mono" /></span>NEAR</span>
    case "nearai": return <span className={styles.rail}><NearAiLogo className={styles.nearai} /></span>
    case "usdc": return <span className={styles.rail}><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><circle cx="8" cy="8" r="6.6" /><path d="M9.8 6.1c-.3-.6-1-1-1.8-1-1 0-1.8.6-1.8 1.4 0 1.9 3.7 1 3.7 2.9 0 .8-.8 1.4-1.9 1.4-.8 0-1.5-.4-1.8-1M8 4v8" strokeLinecap="round" /></svg>USDC</span>
    case "outlayer": return <span className={styles.rail}><i className={styles.railDot} />OutLayer</span>
    case "rhea": return <span className={styles.rail}><i className={styles.railDot} />Rhea pool</span>
    case "payee": return <span className={styles.rail}><LogoMark size={13} />Payee</span>
    case "controls": return <span className={styles.rail}><LogoMark size={13} />Agreement controls</span>
    case "sealed": return <span className={styles.rail}><LogoMark size={13} />Sealed Table</span>
  }
}

const RAIL_NAME: Record<Rail, string> = {
  near: "NEAR", usdc: "USDC", nearai: "NEAR AI", outlayer: "OutLayer", rhea: "the Rhea pool",
  payee: "Payee", controls: "Agreement controls", sealed: "Sealed Table",
}
const listOf = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`)

/* ---------- the corner drawings: drawn on a 200 × 200 grid, shown through the window x 24–186, y 76–174 ---------- */
const T = "var(--teal)"
const Dim = "rgba(var(--ink-rgb), 0.28)"
const Faint = "rgba(var(--ink-rgb), 0.12)"

const Liquidity = () => (
  <svg viewBox="24 76 162 98" aria-hidden="true">
    <path d="M30 150 C 62 140, 86 116, 100 98 L100 150 Z" fill={T} opacity="0.16" />
    <path d="M30 150 C 62 140, 86 116, 100 98" stroke={T} strokeWidth="1.6" fill="none" />
    <path d="M110 98 C 124 116, 148 140, 180 150 L110 150 Z" fill="#ec9a7f" opacity="0.14" />
    <path d="M110 98 C 124 116, 148 140, 180 150" stroke="#ec9a7f" strokeWidth="1.6" fill="none" />
    <line x1="105" y1="78" x2="105" y2="152" stroke={Dim} strokeDasharray="2 3" />
    <line x1="24" y1="152" x2="186" y2="152" stroke={Faint} />
    {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={36 + i * 22} y="162" width="18" height="4" rx="2" fill={i === 2 ? "#ec9a7f" : T} opacity={i === 2 ? 0.8 : 0.9} />)}
  </svg>
)
const Invoices = () => (
  <svg viewBox="24 76 162 98" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <g key={i} transform={`translate(34 ${84 + i * 30})`}>
        <rect width="132" height="22" rx="6" fill="rgba(var(--ink-rgb), 0.05)" stroke={Faint} />
        <rect x="10" y="9" width="58" height="4" rx="2" fill={Dim} />
        <rect x="76" y="9" width="22" height="4" rx="2" fill={Faint} />
        {i === 1
          ? <path d="M114 7l8 8M122 7l-8 8" stroke="var(--refusal)" strokeWidth="1.6" strokeLinecap="round" />
          : <path d="M113 11.5l3 3 6-7" stroke={T} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      </g>
    ))}
  </svg>
)
const Sealed = () => (
  <svg viewBox="24 76 162 98" aria-hidden="true">
    {[48, 162].map((x) => (
      <g key={x} transform={`translate(${x} 122)`}>
        <circle r="17" fill="rgba(var(--ink-rgb), 0.05)" stroke={Dim} />
        <rect x="-6" y="-2" width="12" height="9" rx="2" fill="none" stroke={Dim} strokeWidth="1.3" />
        <path d="M-3.5 -2v-3a3.5 3.5 0 0 1 7 0v3" fill="none" stroke={Dim} strokeWidth="1.3" />
      </g>
    ))}
    <path d="M66 122 H 92 M134 122 H 145" stroke={Dim} strokeDasharray="2 3" />
    <rect x="94" y="104" width="38" height="36" rx="9" fill="rgba(145, 207, 181, 0.1)" stroke={T} strokeOpacity="0.6" />
    <path d="M105 122.5l5 5 10-11" stroke={T} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const Checks = () => (
  <svg viewBox="24 76 162 98" aria-hidden="true">
    {Array.from({ length: 15 }, (_, i) => {
      const x = 34 + (i % 5) * 22, y = 90 + Math.floor(i / 5) * 22
      return i < 14
        ? <rect key={i} x={x} y={y} width="16" height="16" rx="4" fill="rgba(145, 207, 181, 0.16)" stroke={T} strokeOpacity="0.55" />
        : <rect key={i} x={x} y={y} width="16" height="16" rx="4" fill="none" stroke={Dim} strokeDasharray="2 2" />
    })}
    <circle cx="160" cy="112" r="11" fill="none" stroke={Dim} strokeDasharray="2 3" />
    <circle cx="160" cy="109" r="3.2" fill={Dim} />
    <path d="M153.5 118a6.5 4.5 0 0 1 13 0" fill="none" stroke={Dim} strokeWidth="1.3" />
  </svg>
)
const Uptime = () => (
  <svg viewBox="24 76 162 98" aria-hidden="true">
    <line x1="28" y1="104" x2="184" y2="104" stroke={Dim} strokeDasharray="3 3" />
    {[0.97, 0.99, 0.98, 1, 0.99, 0.98, 1, 0.99, 0.86].map((v, i) => {
      const h = 64 * v, last = i === 8
      return <rect key={i} x={34 + i * 16} y={160 - h} width="10" height={h} rx="3" fill={last ? Dim : T} opacity={last ? 1 : 0.75} />
    })}
  </svg>
)
const Milestones = () => (
  <svg viewBox="24 76 162 98" aria-hidden="true">
    <line x1="44" y1="128" x2="164" y2="128" stroke={Faint} strokeWidth="2" />
    <line x1="44" y1="128" x2="104" y2="128" stroke={T} strokeWidth="2" strokeOpacity="0.7" />
    <circle cx="44" cy="128" r="11" fill="rgba(145, 207, 181, 0.18)" stroke={T} />
    <path d="M39 128.5l3.5 3.5 6.5-7" stroke={T} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="104" cy="128" r="11" fill="var(--elevation-strong)" stroke={T} strokeDasharray="3 3" />
    <circle cx="164" cy="128" r="11" fill="var(--elevation-strong)" stroke={Dim} />
    {[0, 1, 2].map((i) => <circle key={i} cx={92 + i * 12} cy="100" r="4.5" fill={i === 0 ? T : "none"} stroke={i === 0 ? "none" : Dim} opacity={i === 0 ? 0.85 : 1} />)}
  </svg>
)

/* status: what the read-only status line says when it is not "planned" or plain "demo" (market making runs on a local node, not testnet) */
type Card = { icon: PixelName; title: string; text: string; runs: Rail[]; art: ReactNode; planned?: boolean; status?: string }
const CARDS: Card[] = [
  {
    icon: "chart", title: "Pay a market maker for liquidity that showed up",
    text: "A project renews an 18,500 USDC retainer. Each period pays only if four of six readings of the pool, taken at hidden times, meet the agreed spread and depth.",
    runs: ["rhea", "outlayer", "near"], art: <Liquidity />, status: "demo (local node)",
  },
  {
    icon: "bag", title: "Let an agent pay invoices it cannot redirect",
    text: "Invoices clear against approved milestones once delivery is accepted. A message asking to pay a new account is refused by the contract, whatever the agent was told.",
    runs: ["payee", "usdc", "near"], art: <Invoices />,
  },
  {
    icon: "agents", title: "Negotiate a renewal without showing your ceiling",
    text: "Both companies' agents bargain inside an enclave. Each side's limit stays sealed; only the agreed terms and an attestation come out for both to approve.",
    runs: ["sealed", "nearai", "outlayer"], art: <Sealed />,
  },
  {
    icon: "shield", title: "Pay for a security fix only when the checks pass",
    text: "The researcher's fee is agreed before work starts and stays in escrow until the agreed checks pass on the patch and the named reviewer approves it.",
    runs: ["controls", "usdc"], art: <Checks />, planned: true,
  },
  {
    icon: "server", title: "Hold a month of capacity that missed its levels",
    text: "Monthly GPU capacity pays in full when availability and latency meet the agreed levels. A shortfall follows the agreed rule, and the provider can dispute the reading.",
    runs: ["controls", "usdc"], art: <Uptime />, planned: true,
  },
  {
    icon: "vault", title: "Release a grant when the reviewers sign off",
    text: "Each tranche moves only when two of three named reviewers accept the milestone, and only to the account the grantee has proven it controls.",
    runs: ["payee", "usdc"], art: <Milestones />, planned: true,
  },
]

export function UseCases() {
  return (
    <section id="use-cases" className={`section ${styles.section}`}>
      <SectionHeading
        eyebrow="Use cases"
        accent="teal"
        wide
        title="Different agreements. One system of control."
        lead={<p>Negotiate privately, approve the terms and define what must happen before money moves. Each card names what it runs on.</p>}
      />

      {/* Each card is an article: crawlers and agents read the status, the title, the text and what it runs on as
          separate, labelled lines; the visual pill and logo row are hidden from them and from screen readers. */}
      <div className={styles.grid}>
        {CARDS.map((c, i) => (
          <Appear key={c.title} as="article" className={styles.card} effect={rise(`${(i % 3) * 0.08}s` as `${number}s`)}>
            <span className={styles.art}>{c.art}</span>
            <span className={styles.top} aria-hidden="true">
              <span className={styles.tile}><PixelIcon name={c.icon} size={22} /></span>
              {c.planned ? <span className={styles.planned}>Planned</span> : null}
            </span>
            <h3 className={styles.title}>{c.planned ? <span className={styles.sr}>Planned: </span> : null}{c.title}</h3>
            <p className={styles.text}>{c.text}</p>
            <p className={styles.sr}>{`Status: ${c.planned ? "planned" : c.status ?? "demo"}. Runs on ${listOf(c.runs.map((r) => RAIL_NAME[r]))}.`}</p>
            <p className={styles.runs} aria-hidden="true">
              <span className={styles.by}>runs on</span>
              {c.runs.map((r) => <RailMark key={r} r={r} />)}
            </p>
          </Appear>
        ))}
      </div>

      <p className={styles.foot}>Any agreement with approved terms, agreed evidence and an authorised recipient works the same way.</p>
    </section>
  )
}

import { usePageMeta } from "../lib/meta"
import { useEffect, useState, type ReactNode } from "react"
import { Appear } from "../lib/motion"
import { appear } from "../components/SectionHeading"
import { PageHero } from "../components/PageHero"
import { Button } from "../components/Button"
import { Mono } from "../components/Mono"
import { LINKS, isPlaceholder } from "../content/links"
import styles from "./Docs.module.css"
import { NearAiLogo } from "../components/NearAiLogo"

/* ------------------------------------------------------------------
   Developers page (/docs): the template's page hero (PageHero: pill + H1 + two lead paragraphs) followed by
   one content section of developer blocks in the template's table style.
   Copy: docs/website/ACCORD_WEBSITE_CONTENT.md A11 (hero) and F5 (official references).
   The NEAR table, the "not yet" paragraph and the commands block reuse the brief's (v4)
   wording as parked in docs/website/framer-port/content-sections/UnderTheHood.tsx, without footnote markers.
   External links render only when configured (LINKS.repo); `<repo-url>` never appears as text.
------------------------------------------------------------------- */

type Piece = { id: string; piece: ReactNode; protects: ReactNode; check: ReactNode }

const PIECES: Piece[] = [
  {
    id: "near-ai-cloud",
    piece: <span className={styles.pieceLogo}><NearAiLogo /> Cloud</span>,
    protects: <>The negotiation turns run on open-weight models inside TEEs, and every response carries a signature</>,
    check: (
      <>
        <Mono>{"make verify-negotiation JOB=<id>"}</Mono> checks the per-response signatures offline against the transcript hash the enclave published
      </>
    ),
  },
  {
    id: "near-outlayer",
    piece: "OutLayer",
    protects: (
      <>
        The negotiation, the payee binding and the observer run in attested TDX enclaves. The contract accepts a result only when the job’s
        measurement is approved on OutLayer’s register contract and the commitments in the output match the ones on chain
      </>
    ),
    check: (
      <>
        <Mono>{"outlayer-verify job <id>"}</Mono> exits <Mono>0</Mono>
      </>
    ),
  },
  {
    id: "near-agreement-contract",
    piece: "The agreement contract",
    protects: <>The approved terms are the only authority the agent has. Every refusal is an event with its reason</>,
    check: (
      <>
        Read the events on the testnet explorer, or run <Mono>make attack</Mono> and watch them appear
      </>
    ),
  },
  {
    id: "near-named-accounts",
    piece: "Named accounts and scoped keys",
    protects: (
      <>
        The agent’s key can call <Mono>act</Mono> on this contract and nothing else. <Mono>revoke</Mono> deletes it in the same transaction that
        flags the agreement
      </>
    ),
    check: (
      <>
        <Mono>{"near account list-keys <contract>"}</Mono> shows the key gone after <Mono>make attack</Mono>
      </>
    ),
  },
  {
    id: "near-usdc",
    piece: "USDC on NEAR",
    protects: (
      <>
        The agreement’s USDC (NEP-141 on NEAR) sits in the agreement’s own account, and only the contract can send it, only through <Mono>act</Mono>, after the request
        is checked against the approved terms
      </>
    ),
    check: (
      <>
        <Mono>make pay</Mono> prints <Mono>payment_sent</Mono> with the amount, the recipient and the transaction link
      </>
    ),
  },
]

/* The brief's commands block, line for line. The clone line is rendered only once LINKS.repo is configured. */
const REPO = isPlaceholder(LINKS.repo) ? "" : LINKS.repo
const COMMANDS = [
  ...(REPO ? [`git clone ${REPO} && cd accord`] : []),
  "make sandbox            # the full flow on a local NEAR sandbox, mocked steps marked",
  "make negotiate          # two sealed mandates in, attested terms out",
  "make approve            # both companies approve; the agreement is Executing",
  "make fund               # the buyer funds the agreement's USDC",
  "make payee              # recipient proven, approved and accepted",
  "make pay                # milestone 1 to the authorised recipient on NEAR testnet",
  "make exception          # a changed amount waits for the buyer's approval",
  "make attack             # redirect and amount refused, the canary deletes the key",
  "make revoke             # the key deleted, the next call rejected by the network",
  "make atlas              # one market-making period on Rhea's pool, read-only",
  "make verify DEAL=<agreement>   # no keys needed",
].join("\n")

/* F5 official references */
const OFFICIAL: { label: string; href: string }[] = [
  { label: "NEAR access keys", href: "https://docs.near.org/protocol/accounts-contracts/access-keys" },
  { label: "NEAR asynchronous cross-contract calls", href: "https://docs.near.org/smart-contracts/anatomy/crosscontract" },
  { label: "NEAR AI Cloud private inference", href: "https://docs.near.ai/cloud/private-inference" },
  { label: "OutLayer trust and verification", href: LINKS.outlayerVerifyGuide },
  { label: "Kraken public order book", href: "https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/book" },
  { label: "Kraken account-specific execution data", href: "https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/executions" },
]

function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle")

  useEffect(() => {
    if (state === "idle") return
    const t = window.setTimeout(() => setState("idle"), 1600)
    return () => window.clearTimeout(t)
  }, [state])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setState("copied")
    } catch {
      setState("failed")
    }
  }

  return (
    <button type="button" className={`t-body-sm ${styles.copy}`} onClick={copy} aria-live="polite">
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy"}
    </button>
  )
}

/* Tables are taller than half a phone viewport, so the in-view trigger is relaxed from the template's 0.5 to 0.2;
   the effect itself (y 32, 1s, EASE_APPEAR) is the template's. */
const blockAppear = (delay: `${number}s`) => ({ ...appear(delay), threshold: 0.2 })

export function Docs() {
  usePageMeta("Accord: Documentation", "Accord documentation: the commands that run a deal room, the agreement contract's methods, and how to check each part yourself on NEAR testnet.")
  return (
    <div className={styles.page}>
      <PageHero
        pill="Developers"
        title="Follow the deal into the code."
        lead={[
          "Inspect how confidential mandates become approved terms, how payment requests are checked, and how executions appear in the agreement record.",
          "Start with the reference flow, reproduce a refusal, and follow a payment through its lifecycle.",
        ]}
      />

      {/* The developer blocks: the NEAR table, the "not yet" note, the commands block, the references, the repository button */}
      <section id="near" className={`section ${styles.main}`}>
        <Appear className={styles.block} effect={blockAppear("0s")}>
          <h2 className={`t-h4 ${styles.subheading}`}>What NEAR does here, and what it does not yet.</h2>
          <div className="table-wrap">
            <table className={`table ${styles.table}`} aria-label="Five pieces of the NEAR stack, what each protects and how you check it">
              <thead>
                <tr>
                  <th scope="col">Piece</th>
                  <th scope="col">What it protects</th>
                  <th scope="col">How you check it</th>
                </tr>
              </thead>
              <tbody>
                {PIECES.map((row) => (
                  <tr key={row.id} id={row.id}>
                    <td className={styles.piece}>{row.piece}</td>
                    <td className={styles.protects}>{row.protects}</td>
                    <td className={styles.check}>{row.check}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Appear>

        <Appear className={styles.note} effect={appear("0s")}>
          <h2 className={`t-h6 ${styles.label}`}>What NEAR does not do here, yet:</h2>
          <p className={`t-body-lg ${styles.noteText}`}>
            confidential settlement (the USDC transfer is public on NEAR, as with any stablecoin payment; private payouts are the next step);
            legal KYB (the enclave proves control of a domain and attests a
            document’s hash; a registry lookup is a v2 integration).
          </p>
        </Appear>

        <Appear className={styles.block} effect={appear("0s")}>
          <h2 className={`t-h6 ${styles.label}`}>Commands</h2>
          <div className={styles.commandsWrap}>
            <Mono block className={styles.commandsBlock}>
              {COMMANDS}
            </Mono>
            <CopyButton text={COMMANDS} />
          </div>
        </Appear>

        {/* F5 */}
        <Appear className={styles.references} effect={appear("0s")}>
          <h2 className={`t-h6 ${styles.label}`}>Official references</h2>
          <ul className={styles.refList}>
            {OFFICIAL.map((r) => (
              <li key={r.href} className="t-body-sm">
                <a href={r.href} className="ls-link-inline" target="_blank" rel="noopener noreferrer">
                  {r.label}
                </a>
              </li>
            ))}
          </ul>
          <p className={`t-body-sm ${styles.refNote}`}>
            The exchange references illustrate the difference between aggregate and account-specific evidence; they do not assert that Accord has integrated Kraken.
          </p>
        </Appear>

        {REPO ? (
          <Appear className={styles.actions} effect={appear("0s")}>
            <Button href={REPO} openInNewTab>View the repository</Button>
          </Appear>
        ) : null}
      </section>
    </div>
  )
}

import { useEffect, useState, type ReactNode } from "react"
import { Appear } from "../lib/motion"
import { SectionHeading, appear } from "../components/SectionHeading"
import { Mono } from "../components/Mono"
import { Ref } from "../components/Ref"
import { UNNUMBERED } from "../content/references"
import { LINKS, isPlaceholder } from "../content/links"
import styles from "./UnderTheHood.module.css"

/* §4.12 Under the hood (anchor #near, accent orange).
   Copy is the brief's, set verbatim: headline, lead, the five-piece table, the "not yet" paragraph,
   the eleven-line commands block, the closing line. Numbers → refs: [20] NEAR AI Cloud verification,
   [19] outlayer-verify, [18] Chain Signatures implementation. The four unnumbered citations come from UNNUMBERED. */

type Piece = { id: string; piece: string; protects: ReactNode; check: ReactNode }

const PIECES: Piece[] = [
  {
    id: "near-ai-cloud",
    piece: "NEAR AI Cloud",
    protects: <>The negotiation turns run on open-weight models inside TEEs, and every response carries a signature</>,
    check: (
      <>
        <Mono>{"make verify-negotiation JOB=<id>"}</Mono> verifies the per-response signatures offline against the transcript hash the enclave
        published <Ref n={20} />
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
        <Mono>{"outlayer-verify job <id>"}</Mono> exits <Mono>0</Mono> <Ref n={19} />
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
    id: "near-chain-signatures",
    piece: "Chain Signatures",
    protects: (
      <>
        The agreement’s Base address can be signed for only by the contract, only through <Mono>act</Mono>. Signing and broadcasting are separate
        steps, which is exactly why signed transfers are listed and burnable <Ref n={18} />
      </>
    ),
    check: (
      <>
        <Mono>make inflight</Mono> burns a nonce and shows the stale broadcast fail on Base Sepolia
      </>
    ),
  },
]

/* The brief's commands block, line for line. `<repo-url>` stays literal until LINKS.repo is configured. */
const REPO = isPlaceholder(LINKS.repo) ? "<repo-url>" : LINKS.repo
const COMMANDS = [
  `git clone ${REPO} && cd accord`,
  "make setup              # testnet accounts, contract, the agreement's Base Sepolia address",
  "make negotiate          # two sealed mandates in, attested terms out",
  "make verify-negotiation JOB=<id>",
  "make bind-payee         # domain proof in the enclave, authority approves, buyer accepts",
  "make pay                # milestone 1 to the bound payee on Base Sepolia",
  "make exception          # out-of-mandate request, buyer approves, milestone 2 pays",
  "make attack             # redirect refused, amount refused, canary, revoke",
  "make inflight           # the signed-but-unbroadcast transfer, nonce burned",
  "make observe SLOT=1     # Glassbook: one attested observation slot",
  "make glassbook          # the market-making scenario end to end",
].join("\n")

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

export function UnderTheHood() {
  return (
    <section id="near" className={`section ${styles.section}`}>
      <SectionHeading
        eyebrow="Under the hood"
        title="What NEAR does here, and what it does not yet."
        lead="Five pieces of the NEAR stack, each protecting one stated property, each with a command that checks it. Nothing is in the design for decoration."
        accent="orange"
      />

      <Appear className={styles.tableAppear} effect={appear("0s")}>
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

      <Appear className={styles.notYet} effect={appear("0s")}>
        <h6 className={`t-h6 ${styles.label}`}>What NEAR does not do here, yet:</h6>
        <p className={`t-body-lg ${styles.notYetText}`}>
          confidential settlement (NEAR Intents has no testnet and the transfer lands on Base in the open, so v1 settles on one rail and says so;
          destination-agnostic payouts through Intents are the next rail); legal KYB (the enclave proves control of a domain and attests a
          document’s hash; a registry lookup is a v2 integration); proving Base receipts to the contract (the relayer reports, the app checks
          Base; a light client is out of scope).
        </p>
      </Appear>

      <Appear className={styles.commands} effect={appear("0s")}>
        <div className={styles.commandsWrap}>
          <Mono block className={styles.commandsBlock}>
            {COMMANDS}
          </Mono>
          <CopyButton text={COMMANDS} />
        </div>
        <p className={`t-body-lg ${styles.closing}`}>Everything above runs on NEAR testnet and Base Sepolia. Mainnet after an audit.</p>
        <p className={`t-body-sm ${styles.cited}`}>
          Also cited, without a number:{" "}
          {UNNUMBERED.map((c, i) => (
            <span key={c.href}>
              {i > 0 ? " · " : ""}
              <a className="ls-link-inline" href={c.href} target="_blank" rel="noreferrer">
                {c.label}
              </a>
            </span>
          ))}
        </p>
      </Appear>
    </section>
  )
}

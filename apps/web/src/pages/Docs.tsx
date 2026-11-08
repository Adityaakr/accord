import { useEffect, useState, type ReactNode } from "react"
import { usePageMeta } from "../lib/meta"
import { PageHero } from "../components/PageHero"
import { Button } from "../components/Button"
import { QuietLink } from "../components/QuietLink"
import { CopyButton } from "../components/CopyButton"
import { NearAiLogo } from "../components/NearAiLogo"
import { LINKS, isPlaceholder } from "../content/links"
import { FLOW, INFRA, TESTNET, acct } from "../content/testnet"
import tl from "../styles/Timeline.module.css"
import styles from "./Docs.module.css"

/* ------------------------------------------------------------------
   /docs in the timeline language (styles/Timeline.module.css): a centred hero, then a sticky section nav (desktop)
   beside one column of groups: Try it on testnet, what NEAR does here, what it does not do yet, the commands, the
   contracts and endpoints, and the official references. Every command, contract id and endpoint links to its source:
   a command to the transaction where agreement a6 ran it, a contract to its explorer page, a tool to its own docs.
   Copy: docs/website/ACCORD_WEBSITE_CONTENT.md A11 (hero) and F5 (references); the try-it steps are the app's.
------------------------------------------------------------------- */

const step = (n: string) => FLOW.find((s) => s.n === n)!.href
const NEAR_AI_DOCS = "https://docs.near.ai/cloud/private-inference"
const NEAR_CLI_DOCS = "https://docs.near.org/tools/near-cli"

type Piece = { id: string; piece: ReactNode; protects: ReactNode; check: ReactNode }

const PIECES: Piece[] = [
  {
    id: "near-ai-cloud",
    piece: <span className={styles.pieceLogo}><NearAiLogo /> Cloud</span>,
    protects: <>The negotiation turns run on open-weight models inside TEEs, and every response carries a signature.</>,
    check: <><QuietLink href={NEAR_AI_DOCS}>{"make verify-negotiation JOB=<id>"}</QuietLink> checks the per-response signatures offline against the transcript hash the enclave published.</>,
  },
  {
    id: "near-outlayer",
    piece: "OutLayer",
    protects: <>The negotiation, the payee binding and the observer run in attested TDX enclaves. The contract accepts a result only when the job’s measurement is approved on OutLayer’s register contract and the commitments in the output match the ones on chain.</>,
    check: <><QuietLink href={LINKS.outlayerVerifyGuide}>{"outlayer-verify job <id>"}</QuietLink> exits <span className="mono">0</span>.</>,
  },
  {
    id: "near-agreement-contract",
    piece: "The agreement contract",
    protects: <>The approved terms are the only authority the agent has. Every refusal is an event with its reason.</>,
    check: <>Read the events on the <QuietLink href={TESTNET.agreementUrl} mono={false}>testnet explorer</QuietLink>, or run <QuietLink href={step("11")}>make attack</QuietLink> and watch them appear.</>,
  },
  {
    id: "near-named-accounts",
    piece: "Named accounts and scoped keys",
    protects: <>The agent’s key can call <span className="mono">act</span> on this contract and nothing else. <QuietLink href={step("12")}>revoke</QuietLink> deletes it in the same transaction that flags the agreement.</>,
    check: <><QuietLink href={NEAR_CLI_DOCS}>{"near account list-keys <contract>"}</QuietLink> shows the key gone after <QuietLink href={step("11")}>make attack</QuietLink>.</>,
  },
  {
    id: "near-usdc",
    piece: "USDC on NEAR",
    protects: <>The agreement’s USDC (NEP-141 on NEAR) sits in the agreement’s own account, and only the contract can send it: through <span className="mono">act</span> after the request is checked against the approved terms, through the vendor's <span className="mono">claim</span> of an eligible payment, or as the refund at <span className="mono">close</span>.</>,
    check: <><QuietLink href={step("10")}>make pay</QuietLink> prints <span className="mono">payment_sent</span> with the amount, the recipient and the transaction link.</>,
  },
]

/* The commands, each with the transaction where agreement a6 ran it (or the page that runs it), where there is one */
const REPO = isPlaceholder(LINKS.repo) ? "" : LINKS.repo
type Command = { cmd: string; does: string; href?: string; label?: string }
const COMMANDS: Command[] = [
  ...(REPO ? [{ cmd: `git clone ${REPO} && cd accord`, does: "the repository", href: REPO, label: "repo" }] : []),
  { cmd: "make sandbox", does: "the full flow on a local NEAR sandbox, mocked steps marked" },
  { cmd: "make negotiate", does: "two sealed mandates in, attested terms out", href: step("03") },
  { cmd: "make approve", does: "both companies approve; the agreement is Executing", href: step("05") },
  { cmd: "make fund", does: "the buyer funds the agreement's USDC", href: step("06") },
  { cmd: "make payee", does: "recipient proven, approved and accepted", href: step("09") },
  { cmd: "make pay", does: "milestone 1 to the authorised recipient on NEAR testnet", href: step("10") },
  { cmd: "make exception", does: "a changed amount waits for the buyer's approval" },
  { cmd: "make attack", does: "redirect and amount refused, the canary deletes the key", href: step("11") },
  { cmd: "make revoke", does: "the key deleted, the next call rejected by the network", href: step("12") },
  { cmd: "make atlas", does: "one market-making period on Rhea's pool, read-only" },
  { cmd: "make verify DEAL=<agreement>", does: "no keys needed", href: "/verify", label: "verify" },
]
const COMMANDS_TEXT = COMMANDS.map((c) => c.cmd).join("\n")

/* Contracts and endpoints, each to its source */
const ENDPOINTS: { name: string; value: string; href: string }[] = [
  { name: "Factory", value: TESTNET.factory, href: TESTNET.factoryUrl },
  { name: "Release", value: `release ${TESTNET.release}`, href: TESTNET.releaseUrl },
  { name: "Agreement", value: TESTNET.agreement, href: TESTNET.agreementUrl },
  { name: "Token", value: TESTNET.token, href: acct(TESTNET.token) },
  { name: "OutLayer", value: "outlayer.testnet", href: acct("outlayer.testnet") },
  { name: "Attestations", value: "testnet-api.outlayer.ai", href: INFRA.find((i) => i.label === "Attestations")!.href },
  { name: "Relayer", value: "relayer transaction", href: INFRA.find((i) => i.label === "Relayer tx")!.href },
  { name: "NEAR RPC", value: "rpc.testnet.near.org", href: "https://docs.near.org/api/rpc/providers" },
  { name: "Explorer", value: "testnet.nearblocks.io", href: "https://testnet.nearblocks.io" },
]

/* F5 official references */
const OFFICIAL: { label: string; href: string }[] = [
  { label: "NEAR access keys", href: "https://docs.near.org/protocol/accounts-contracts/access-keys" },
  { label: "NEAR asynchronous cross-contract calls", href: "https://docs.near.org/smart-contracts/anatomy/crosscontract" },
  { label: "NEAR AI Cloud private inference", href: NEAR_AI_DOCS },
  { label: "OutLayer trust and verification", href: LINKS.outlayerVerifyGuide },
  { label: "Kraken public order book", href: "https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/book" },
  { label: "Kraken account-specific execution data", href: "https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/executions" },
]

/* The guided testnet path (<site>/app/try-it), as "do X, see Y" */
const TRY_STEPS = [
  { do: "Open /app/try-it and sign in with Meteor or Intear on testnet, or your email.", see: "step 1 marked done with your account name." },
  { do: "Get test funds.", see: "your balance reads 2.50 NEAR and 100 tUSDC, with both faucet transactions linked." },
  { do: "Create the room (prefilled against halcyon-demo.testnet).", see: "a new agreement account such as a8.accord-v2.testnet, in state Sealed." },
  { do: "Seal your mandate with the Northwind preset: 40 tUSDC ceiling, 2 to 4 items.", see: "the Demo counterparty panel seals the vendor's mandate and starts the negotiation; the state moves Sealed, then Attested." },
  { do: "Approve the terms, fund the escrow, accept the recipient and the first delivery.", see: "the counterparty approves, proposes halcyon-mm.testnet, the Payee job proves it on the vendor's domain, its authority approves, and once you accept it the recipient is active; the vendor then submits delivery for item 1." },
  { do: "Start the demo agent, then let it pay the due item.", see: "Paid item 1: <amount> tUSDC to halcyon-mm.testnet, the active recipient, with the act transaction linked (the amount is what the negotiated terms say; 15.00 on a8)." },
  { do: "Ask the agent to pay a new account.", see: "ERR_PAYEE_MISMATCH: the contract refused it and recorded the refusal. Nothing moves; the refusal appears in the room's activity." },
  { do: "Revoke the key from the room header.", see: "Agent revoked · next call rejected by the network. Starting the demo agent again installs a new key." },
]

const SECTIONS = [
  { id: "try", label: "Try it on testnet" },
  { id: "near", label: "What NEAR does" },
  { id: "not-yet", label: "Not yet" },
  { id: "commands", label: "Commands" },
  { id: "contracts", label: "Contracts and endpoints" },
  { id: "references", label: "References" },
]

const n2 = (i: number) => String(i + 1).padStart(2, "0")

/* The section nav marks the section nearest the top of the viewport */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e)
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (top) setActive(top.target.id)
      },
      { rootMargin: "-80px 0px -60% 0px" },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [ids])
  return active
}

export function Docs() {
  usePageMeta("Accord: Documentation", "Accord documentation: the commands that run a deal room, the agreement contract's methods, and how to check each part yourself on NEAR testnet.")
  const active = useActiveSection(SECTIONS.map((s) => s.id))
  return (
    <div className={styles.page}>
      <PageHero
        centered
        pill="Developers"
        title="Follow the deal into the code."
        lead="Reproduce the flow, reproduce a refusal, and check every step yourself on NEAR testnet."
      />

      <section className={`section ${styles.main}`}>
        <div className={styles.layout}>
          <nav className={styles.nav} aria-label="On this page">
            <ol>
              {SECTIONS.map((s) => (
                <li key={s.id}><a href={`#${s.id}`} className={active === s.id ? styles.navActive : undefined} aria-current={active === s.id ? "location" : undefined}>{s.label}</a></li>
              ))}
            </ol>
          </nav>

          <div className={tl.column}>
            <div id="try" className={`${tl.group} ${styles.anchor}`}>
              <h2 className={tl.groupLabel}><span>Try it on testnet</span><span className={tl.groupMeta}>about 3 minutes</span></h2>
              <ol className={tl.rows}>
                {TRY_STEPS.map((t, i) => (
                  <li key={t.do} className={`${tl.row} ${styles.rowProse}`}>
                    <span className={`mono ${tl.num}`}>{n2(i)}</span>
                    <span className={styles.prose}>
                      <span className={tl.strong}>{t.do}</span>
                      <span className={tl.weak}>You see: {t.see}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className={styles.actions}>
                <Button variant="primary" href={LINKS.tryDeal}>Try a deal in 3 minutes</Button>
              </div>
              <p className={tl.note}>NEAR testnet with test USDC. Nothing here moves real money; the demo vendor and the demo agent are Accord&apos;s own testnet accounts, labelled in the room.</p>
            </div>

            <div id="near" className={`${tl.group} ${styles.anchor}`}>
              <h2 className={tl.groupLabel}><span>What NEAR does here</span></h2>
              <ol className={tl.rows}>
                {PIECES.map((p, i) => (
                  <li key={p.id} id={p.id} className={`${tl.row} ${styles.rowProse} ${styles.anchor}`}>
                    <span className={`mono ${tl.num}`}>{n2(i)}</span>
                    <span className={styles.prose}>
                      <span className={tl.name}>{p.piece}</span>
                      <span>{p.protects}</span>
                      <span className={styles.check}><span className={tl.weak}>Check: </span>{p.check}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div id="not-yet" className={`${tl.group} ${styles.anchor}`}>
              <h2 className={tl.groupLabel}><span>What NEAR does not do here, yet</span></h2>
              <ol className={tl.rows}>
                <li className={`${tl.row} ${styles.rowProse}`}>
                  <span className={`mono ${tl.num}`}>01</span>
                  <span className={styles.prose}><span className={tl.name}>Settlement privacy</span><span>The USDC transfer is public on NEAR, as with any stablecoin payment; private payouts are the next step.</span></span>
                </li>
                <li className={`${tl.row} ${styles.rowProse}`}>
                  <span className={`mono ${tl.num}`}>02</span>
                  <span className={styles.prose}><span className={tl.name}>Legal KYB</span><span>The enclave proves control of a domain and attests a document’s hash; a registry lookup is a v2 integration.</span></span>
                </li>
              </ol>
            </div>

            <div id="commands" className={`${tl.group} ${styles.anchor}`}>
              <h2 className={tl.groupLabel}><span>Commands</span><CopyButton text={COMMANDS_TEXT} className={tl.copy} /></h2>
              <ol className={tl.rows}>
                {COMMANDS.map((c, i) => (
                  <li key={c.cmd} className={`${tl.row} ${styles.rowCmd}`}>
                    <span className={`mono ${tl.num}`}>{n2(i)}</span>
                    <span className={`mono ${styles.cmd}`}>{c.cmd}</span>
                    <span className={`${tl.meaning} ${styles.does}`}>{c.does}</span>
                    {c.href ? <QuietLink href={c.href} className={`${tl.tx} ${tl.ok}`} label={`${c.cmd}: ${c.label ?? "the transaction on agreement a6"}`}>{c.label ?? "tx"}</QuietLink> : <span className={`mono ${tl.status} ${tl.weak}`}>local</span>}
                  </li>
                ))}
              </ol>
              <p className={tl.note}>Each <span className="mono">tx</span> is the transaction where agreement <span className="mono">a6</span> ran that step on NEAR testnet.</p>
            </div>

            <div id="contracts" className={`${tl.group} ${styles.anchor}`}>
              <h2 className={tl.groupLabel}><span>Contracts and endpoints</span><span className={tl.groupMeta}>NEAR testnet</span></h2>
              <ol className={tl.rows}>
                {ENDPOINTS.map((e, i) => (
                  <li key={e.name} className={`${tl.row} ${tl.rowWide}`}>
                    <span className={`mono ${tl.num}`}>{n2(i)}</span>
                    <span className={tl.name}>{e.name}</span>
                    <span className={`mono ${tl.value}`}><QuietLink href={e.href}>{e.value}</QuietLink></span>
                  </li>
                ))}
              </ol>
            </div>

            <div id="references" className={`${tl.group} ${styles.anchor}`}>
              <h2 className={tl.groupLabel}><span>Official references</span></h2>
              <ol className={tl.rows}>
                {OFFICIAL.map((r, i) => (
                  <li key={r.href} className={`${tl.row} ${styles.rowProse}`}>
                    <span className={`mono ${tl.num}`}>{n2(i)}</span>
                    <span className={styles.prose}><QuietLink href={r.href} mono={false} className={tl.strong}>{r.label}</QuietLink></span>
                  </li>
                ))}
              </ol>
              <p className={tl.note}>The exchange references illustrate the difference between aggregate and account-specific evidence; they do not assert that Accord has integrated Kraken.</p>
              {REPO ? <div className={styles.actions}><Button href={REPO} openInNewTab>View the repository</Button></div> : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

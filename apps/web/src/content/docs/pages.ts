/* The docs site's pages (/docs/<slug>), as data. Facts come only from the platform kit (GOAL, ARCHITECTURE, INTERFACES,
   DECISIONS, README, DEMO, PLATFORM, Makefile, the contracts' sources, app/src/server/delegate.ts) and from content/testnet.ts,
   which wins for what runs on NEAR testnet (8 Nov 2026). Inline marks: `code` and [label](href) only (types.ts). */
import type { DocPage } from "./types"
import { CIRCLE, RELEASE4, TESTNET, VERIFY_COMMAND, VERIFY_RAW, acct, tx } from "../testnet"
import { LINKS } from "../links"

/* a6's transactions, from FLOW and INFRA in testnet.ts */
const A6 = {
  sealBuyer: tx("Ek9Zr1wjD6nrWaKHFak8UDv5Jwbaacqrdh1huNp6qwAk"),
  sealVendor: tx("2Zq8pfNoa1dFzMLAy79aGyek72q3LGcrvRqAjYABisKZ"),
  negotiate: tx("GfX5qKq35rvtUVkp9nBPgw3kkzDSXx6hfY2H5cb3wfHW"),
  approveBuyer: tx("H6cMyE6kzs9SdrC4yaP7CvnDxJqH4NSx7ivKeu2rBHSg"),
  approve: tx("2uv8tTfeYhe2aZ5cMrVNfFzr88kPL4HeSxwYzNhtmveT"),
  fund: tx("2CeFB18jenw2iggWE8mQZy9DehwZ2f97TYXwi3RVeXPy"),
  proof: tx("6koRbw5QDYTgVU52Fe1vH755QGLPwZabQhF1kTk5rup6"),
  authority: tx("FBQnqtKXs5B5zn1A4F1yCDUmACYMqsi2zM2uez6YxDis"),
  payee: tx("3d3LSZvz3yPX5LM1Bk6t9bxiX2x1JDMEt9mfa2fbw11p"),
  pay: tx("2k57zg7iE44muCGRbcc2JTVmy5uGHHyCePXNPmcWCKEQ"),
  attack: tx("AB9HLnWvkzNL418ygx8AVArinPnAK3jqxt4haAjsk8fs"),
  revoke: tx("4ervNQdjrd7MA1n7vWSY7cRUtCpwiQwSK7xDSK2Bmn9P"),
  release: TESTNET.releaseUrl,
  relayer: tx("DyFrt2v9sGhxnRiWVwSydXPWS48exUis56YydCMmrBhC"),
}
const ATTESTATION = "https://testnet-api.outlayer.ai/attestations/13596"
const OUTLAYER_VERIFY = "https://app.outlayer.ai/docs/trust-verification"
const NEAR_AI_VERIFY = "https://docs.near.ai/cloud/verification"

export const DOC_PAGES: DocPage[] = [
  /* ------------------------------------------------------------------ 1. Quickstart */
  {
    slug: "quickstart",
    group: "Get started",
    title: "Quickstart",
    summary: "Run one deal on NEAR testnet at /app/try-it in about 3 minutes: sign in, get test funds, seal your limits, let the demo agent pay, watch a redirect get refused, and revoke the key.",
    sections: [
      {
        id: "before",
        title: "Before you start",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "Network", value: "NEAR testnet", detail: "Everything on this path is testnet with a test USDC token. Nothing here moves real money." },
              { name: "Sign-in", value: "Meteor · Intear · Ledger · Nightly · WalletConnect", detail: "Your own NEAR wallet, switched to testnet. Meteor and Intear send through Accord's relayer, so you pay no gas after opening the room (your wallet pays its 2 NEAR deposit)." },
              { name: "Test funds", value: "2.50 NEAR · 100 tUSDC", detail: "The faucet tops your account up once a day per account. The room's `2 NEAR` deposit is returned when it closes." },
              { name: "Counterparty", value: "halcyon-demo.testnet", href: acct("halcyon-demo.testnet"), detail: "Accord's demo vendor, with its authority `halcyon-auth.testnet`. The demo vendor and the demo agent are Accord's own testnet accounts, labelled in the room." },
              { name: "Time", value: "about 3 minutes" },
            ],
          },
          { kind: "note", text: "Sealing a mandate takes a wallet signature (NEP-413) that derives your document key, so the key never leaves your browser." },
        ],
      },
      {
        id: "open-room",
        title: "Sign in and open a room",
        blocks: [
          {
            kind: "steps",
            steps: [
              {
                title: "Open [/app/try-it](/app/try-it) and sign in with Meteor or Intear on testnet.",
                see: "Step 1 marked done with your account name.",
                image: { id: "tryit-signed-out", alt: "The /app/try-it page before sign-in: five numbered steps, the first one, Connect a wallet, offering Meteor or Intear.", caption: "`/app/try-it` before sign-in. Each step turns to done as you go." },
              },
              {
                title: "Get test funds.",
                see: "Your balance reads `2.50 NEAR` and `100 tUSDC`, with both faucet transactions linked.",
              },
              {
                title: "Create the room, prefilled against `halcyon-demo.testnet`.",
                body: "Your wallet signs `create_agreement` on the factory `accord-v2.testnet` with a `2 NEAR` deposit.",
                see: "A new agreement account such as `a8.accord-v2.testnet`, in state `Sealed`.",
              },
            ],
          },
        ],
      },
      {
        id: "negotiate",
        title: "Seal your limits and negotiate",
        blocks: [
          {
            kind: "steps",
            steps: [
              {
                title: "Seal your mandate with the Northwind preset: `40 tUSDC` ceiling, 2 to 4 items.",
                body: "Your limits are encrypted in the browser to the Sealed Table; the vendor never sees them. The demo vendor seals its own preset (floor `30`, target `38`).",
                see: "The Demo counterparty panel seals the vendor's mandate and starts the negotiation; the state moves `Sealed`, then `Attested`.",
              },
              {
                title: "Approve the terms, fund the escrow, accept the recipient and the first delivery.",
                see: "The counterparty approves, proposes `halcyon-mm.testnet`, the Payee job proves it on the vendor's domain, its authority approves, and once you accept it the recipient is active; the vendor then submits delivery for item 1.",
                image: { id: "room", alt: "A deal room's state strip from Sealed to Settled with Executing reached, the agent bar saying it can call act() on this agreement and nothing else beside Hold to revoke, and the room's tabs.", caption: "The room as the deal moves: the state strip, and the agent's one key with Hold to revoke." },
              },
            ],
          },
          { kind: "note", text: "The counterparty reads the room and makes the vendor's next valid move, so pressing it twice does nothing twice." },
        ],
      },
      {
        id: "pay",
        title: "Pay, refuse, revoke",
        blocks: [
          {
            kind: "steps",
            steps: [
              {
                title: "Start the demo agent, then let it pay the due item.",
                body: "Starting the agent asks your wallet to sign `install_agent_key`: one function-call key on the agreement account that can call `act` and nothing else.",
                see: "`Paid item 1: <amount> tUSDC to halcyon-mm.testnet`, the active recipient, with the `act` transaction linked. The amount is what the negotiated terms say (`15.00` on a8).",
              },
              {
                title: "Ask the agent to pay a new account.",
                see: "`ERR_PAYEE_MISMATCH`: the contract refused it and recorded the refusal. Nothing moves; the refusal appears in the room's activity.",
              },
              {
                title: "Revoke the key from the room header.",
                see: "`Agent revoked · next call rejected by the network`. Starting the demo agent again installs a new key.",
              },
            ],
          },
          {
            kind: "pair",
            images: [
              { id: "agent-paid", alt: "The demo agent panel after a payment inside the terms: Paid item 2, 12.00 tUSDC to halcyon-mm.testnet, the active recipient, with the act transaction linked." },
              { id: "agent-refused", alt: "The demo agent panel after a redirected payment: ERR_PAYEE_MISMATCH, a request to pay 6.00 tUSDC for item 3 to halcyon-markets.testnet, refused and recorded by the contract, with its transaction." },
            ],
            caption: "The demo agent's panel in a test room: a payment inside the terms, then a redirect the contract refused.",
          },
          { kind: "note", text: "The demo agent's key is derived per room and signs `act` itself, never through the relayer." },
        ],
      },
      {
        id: "next",
        title: "Check what happened",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "Verify the agreement", value: "/verify", href: "/verify", detail: "Five public checks in the browser, no account and no keys." },
              { name: "Read a full record", value: "/record", href: "/record", detail: "Agreement a6's 12 steps, each linked to its transaction." },
              { name: "Run it from a terminal", value: "make demo", href: "/docs/cli#verify-demo", detail: "The full loop on testnet from fresh faucet accounts." },
              { name: "What each state means", value: "Concepts", href: "/docs/concepts#lifecycle" },
            ],
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ 2. Concepts */
  {
    slug: "concepts",
    group: "Concepts",
    title: "Concepts",
    summary: "The agreement's states, the parts of Accord, the agent's one scoped key, and the refusal codes the contract records instead of panicking.",
    sections: [
      {
        id: "lifecycle",
        title: "The agreement lifecycle",
        blocks: [
          { kind: "p", text: "Each agreement is its own NEAR account, `a<id>.accord-v2.testnet`, created by the factory. Its state is one of six values in `accord-core` (`State`). Every state has a path to `Settled`, `NoDeal` or `Cancelled`." },
          {
            kind: "rows",
            rows: [
              { name: "Sealed", value: "Sealed", detail: "Created by the buyer's `create_agreement`. Each side commits its mandate with `commit_mandate`: only a commitment hash and ciphertext go on chain. Sub-status `AwaitingMandates`, then `Ready`, then `Requested` once `start_negotiation` sends the run." },
              { name: "Attested", value: "Attested", detail: "The Sealed Table's signed outcome passed the checks in `on_sealed_result`: signature, nonce, both commitments, release, parameters, structure and terms hash." },
              { name: "Executing", value: "Executing", detail: "Both parties called `approve_terms` with the same terms hash. `executing_at` is set and the items are created; funding, recipients, deliveries and payments happen here." },
              { name: "Settled", value: "Settled", detail: "`close` (after the term and grace period) or `mutual_close` paid eligible items, set aside any it could not pay as `Reserved` for the vendor's claim, and refunded the rest to the buyer." },
              { name: "No deal", value: "NoDeal", detail: "A walk-away, a failed limit check, bad input, or three infrastructure failures. Nothing was funded, so there is nothing to refund." },
              { name: "Cancelled", value: "Cancelled", detail: "Either party called `cancel` before `Executing`." },
            ],
          },
          { kind: "note", text: "The deal room in the app groups these into four phases: Sealed, Agreed, Funded and bound, and Paid, refused, revoked. See them on [/record](/record)." },
          { kind: "image", image: { id: "room", alt: "A deal room's state strip from Sealed to Settled with Executing reached, and the agent bar showing its one key and Hold to revoke.", caption: "The room shows the same lifecycle as a strip; the steps between the contract's states are the app's." } },
        ],
      },
      {
        id: "parts",
        title: "The parts of Accord",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "Sealed Table", value: "jobs/sealed-table", detail: "The negotiation, inside an OutLayer TDX enclave with negotiators on NEAR AI Cloud. Code checks every proposal against both mandates; only the terms, commitment hashes, a transcript hash and attestation references leave." },
              { name: "Agreement controls", value: "contracts/agreement", detail: "The contract on each agreement account. It holds the escrow and the approved terms and checks every payment request against them in six gates." },
              { name: "Payee", value: "jobs/payee", detail: "Recipient authorisation: the vendor's domain file lists the account, fetched inside an enclave; the vendor's settlement authority approves it on chain; the buyer accepts it. A change needs all three again and a delay." },
              { name: "Evidence checks", detail: "A payment becomes eligible only when the agreed evidence is recorded: an accepted delivery (procurement) or a period that passed its observations (market making), or an exception the buyer approved." },
            ],
          },
          { kind: "note", text: "Payee proves control of the domain and the authority's approval, not that the company legally exists." },
        ],
      },
      {
        id: "agent-key",
        title: "The agent and its scoped key",
        blocks: [
          {
            kind: "rows",
            label: "What the key can and cannot do",
            rows: [
              { name: "Can call", value: "act", detail: "One method on one account: the agreement it works for. The receiver and the method list are part of the key, enforced by the NEAR protocol before any code runs." },
              { name: "Cannot", detail: "Attach NEAR, transfer NEAR, add or delete keys, deploy code, delete the account, call any other contract, or change the terms, the recipient, the amounts or the evidence." },
              { name: "Gas allowance", value: "0.5 NEAR", detail: "Fixed when the buyer installs it with `install_agent_key`. A key's allowance cannot be raised; when it runs out the agent stops (`NotEnoughAllowance`) and the buyer installs a new key." },
              { name: "Revoke", value: "revoke_agent", href: A6.revoke, tone: "refused", detail: "One buyer transaction marks the key revoked, so `act` refuses it at once (`ERR_REVOKED`), and deletes it in the same transaction. About a block later the network rejects anything it signs (`AccessKeyDoesNotExist`)." },
              { name: "Automatic revoke", value: "ERR_CANARY · 5 in 3600 s", detail: "A payment request naming a canary account, or `refusal_limit` (`5`) refusals by the current key inside `refusal_window_secs` (`3600`), revokes and deletes the key the same way." },
            ],
          },
          { kind: "note", text: "Revoking is not a recall: a payment already made stays made, and it went to the authorised recipient at the approved amount. An eligible payment stays claimable by the vendor with `claim`." },
        ],
      },
      {
        id: "refusals",
        title: "Refusals",
        blocks: [
          { kind: "p", text: "A refusal never panics. `act`, `claim` and `close` return `Refused` with a sequence number, emit an `act_refused` event and keep the refusal in a ring of the last `128`. Only a call that cannot come from the agent panics: `ERR_UNAUTHORIZED`, with no record. The gates run in order and the first failure is recorded." },
          {
            kind: "rows",
            label: "Refusal codes, in gate order",
            rows: [
              { name: "1 · Key revoked", value: "ERR_REVOKED", tone: "refused", detail: "The key was revoked; covers the block between the revoke and its `DeleteKey`." },
              { name: "1 · Not executing", value: "ERR_NOT_EXECUTING", tone: "refused", detail: "The agreement is not in `Executing`." },
              { name: "2 · Canary", value: "ERR_CANARY", tone: "refused", detail: "The recipient is a canary account; the key is also revoked and deleted." },
              { name: "2 · No recipient", value: "ERR_NO_RECIPIENT", tone: "refused", detail: "No active authorised recipient exists yet." },
              { name: "2 · Wrong recipient", value: "ERR_PAYEE_MISMATCH", href: A6.attack, tone: "refused", detail: "The recipient is not the active authorised one. Agreement a6 refused a redirect to `halcyon-markets.testnet` this way." },
              { name: "3 · Unknown item", value: "ERR_UNKNOWN_ITEM", tone: "refused", detail: "No item with that id." },
              { name: "3 · Already paid", value: "ERR_ALREADY_PAID", tone: "refused", detail: "The item is paid." },
              { name: "4 · Not due", value: "ERR_NOT_DUE", tone: "refused", detail: "The delivery is not accepted and its acceptance window has not lapsed." },
              { name: "4 · Period withheld", value: "ERR_PERIOD_WITHHELD", tone: "refused", detail: "Market making: the period did not close `Eligible` and was not resolved to pay." },
              { name: "5 · Wrong amount", value: "ERR_AMOUNT_MISMATCH", tone: "refused", detail: "Not the item's amount, or its approved exception amount." },
              { name: "5 · Over the total", value: "ERR_CAP_EXCEEDED", tone: "refused", detail: "Paid plus this amount would exceed the terms total. Also returned when no further exception can be requested." },
              { name: "5 · Escrow short", value: "ERR_INSUFFICIENT_FUNDS", tone: "refused", detail: "The escrow does not cover the amount." },
              { name: "6 · Payment in flight", value: "ERR_IN_FLIGHT", tone: "refused", detail: "Another payment holds the lock until its callback returns." },
            ],
          },
          { kind: "figure", figure: "gates", caption: "Every `act` request passes the same gates in the same order; the first one that fails names the refusal, and nothing is sent." },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ 3. Agreement types */
  {
    slug: "agreement-types",
    group: "Concepts",
    title: "Agreement types",
    summary: "Six agreement types share the same controls; the commercial fields and the evidence accepted change. Two are built and shown in the demonstration, four are planned.",
    sections: [
      {
        id: "same-controls",
        title: "Same controls in every type",
        blocks: [
          { kind: "p", text: "Every type runs the same lifecycle, the same scoped agent key, the same recipient binding and the same six payment gates. What changes is the terms' commercial fields and the evidence that makes an item payable (gate 4)." },
          { kind: "note", text: "Status `demo` means built and shown in the demonstration. Status `planned` means designed, not built." },
        ],
      },
      {
        id: "built",
        title: "Built",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "Vendor contracts and renewals", value: "procurement · demo", href: TESTNET.agreementUrl, tone: "ok", detail: "Milestones released on accepted delivery; the reference type. Agreement `a6.accord-v2.testnet` ran it end to end on testnet: `35.50 tUSDC` in 3 items, item 1 paid, a redirect refused, the key revoked." },
              { name: "Market-making agreements", value: "market-making · demo", href: "/use-cases/market-making", tone: "ok", detail: "A retainer period is payable only when enough observations of the venue's public liquidity, taken at hidden times, meet the agreed spread, depth and two-sided quoting. In the demonstration, 4 of 6 readings of Rhea's USDC/wNEAR pool must pass. Its recorded runs are on a local node reading real NEAR mainnet blocks; see [make market-making](/docs/cli#market-making)." },
            ],
          },
        ],
      },
      {
        id: "market-making",
        title: "How a market-making period pays",
        blocks: [
          {
            kind: "steps",
            steps: [
              { title: "Hidden slot times", body: "Each slot's time is drawn inside the observer's enclave from a seed generated there. Nobody outside the enclave knows it in advance." },
              { title: "One deterministic sample", body: "The observation is the first final NEAR mainnet block at or after the slot time, read from Rhea's DCL pool (`dclv2.ref-labs.near`) with view calls only, signed by the observer's key. Anyone can recompute it from an archival node." },
              { title: "The contract decides", body: "`record_observation` checks the signature and the slot window; `close_period` applies the rule: `Eligible` when at least `pass_threshold` slots passed, `Review` when unobserved slots leave it undecided or observations conflict, `Withheld` otherwise." },
              { title: "Payment still goes through every gate", body: "An `Eligible` period makes its item payable; the payment still needs the authorised recipient and the approved amount. `Review` and `Withheld` periods go to the buyer (`resolve_period`), not to payment." },
            ],
          },
          { kind: "note", text: "Limit: the observer measures the venue's liquidity, not the market maker's own orders. The deployer owns the observer's seed and could rebind it to a build that reveals slot times in advance. One venue per agreement, retainer-only." },
        ],
      },
      {
        id: "planned",
        title: "Planned",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "Agent-to-agent services", value: "planned", detail: "Buy a service from another company's agent within a weekly amount and a total cap. Evidence: the schedule and cap in the approved terms." },
              { name: "Security remediation", value: "planned", detail: "The researcher's fee stays in escrow until the agreed regression checks pass on the patch and the named reviewer approves it." },
              { name: "Infrastructure service agreements", value: "planned", detail: "Monthly capacity pays in full when the agreed monitor's availability and latency meet the agreed levels; a shortfall follows the agreed rule." },
              { name: "Grants and funded milestones", value: "planned", detail: "Each tranche moves only when two of three named reviewers accept the milestone, and only to the account the grantee has proven it controls." },
            ],
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ 4. How it works on NEAR */
  {
    slug: "near",
    group: "Build on NEAR",
    title: "How it works on NEAR",
    summary: "The factory and agreement contracts, the three OutLayer enclave jobs, NEAR AI Cloud's attestations, USDC held by each agreement's own account, and the relayer that never carries act.",
    sections: [
      {
        id: "accounts",
        title: "Factory and agreement accounts",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "Factory", value: "accord-v2.testnet", href: TESTNET.factoryUrl, detail: "Publishes releases and creates agreements. It cannot call, upgrade or drain an existing agreement." },
              { name: "Release", value: "release 4", href: RELEASE4.publish, detail: "One agreement code hash per release, published as a NEP-591 global contract and referenced by hash, so it cannot change. Every agreement on the release uses it; an agreement keeps its release for life. Release 4 (`ECgsrZwy…`, the security-review fixes) is current on both factories since 9 Nov 2026; a6 and the agreements before it keep release 3 (`8wMuMRre…`)." },
              { name: "Agreement account", value: "a<id>.accord-v2.testnet", href: TESTNET.agreementUrl, detail: "Created in one batch (`CreateAccount`, `Transfer`, `UseGlobalContract`, `FunctionCall new`) with no `AddKey`, so it starts with no keys. It has no method that deploys code and never holds a full-access key." },
              { name: "Creation deposit", value: "2 NEAR", detail: "Paid by the buyer; covers state storage, mandate storage, the agent's gas and the on-chain OutLayer runs." },
            ],
          },
          { kind: "note", text: "Limit: during the hackathon the factory keeps its full-access key so fixes can ship; in production it is deleted after the last upgrade." },
        ],
      },
      {
        id: "outlayer",
        title: "OutLayer enclaves",
        blocks: [
          { kind: "p", text: "Three jobs run as `wasm32-wasip2` builds in OutLayer's Intel TDX enclaves. Each reads what it needs from the agreement's state over RPC endpoints compiled into its build, never from its caller, and signs its output with an ed25519 key derived from a `PROTECTED_` seed generated inside the TEE and bound to that build's wasm hash." },
          {
            kind: "rows",
            rows: [
              { name: "Sealed Table", value: "pubkey · negotiate", href: A6.negotiate, detail: "Decrypts both mandates, runs the negotiators on NEAR AI Cloud, checks the limits and signs the outcome. Release 3 build `7c832ce9…`, keys from pubkey run `13682`." },
              { name: "Payee", value: "pubkey · prove", href: A6.proof, detail: "Fetches the vendor's `/.well-known/accord.json` over TLS, checks the recipient and authority, computes the recipient signals and signs the proof." },
              { name: "Observer", value: "pubkey · observe", detail: "Draws hidden slot times from its seed, reads the venue at one mainnet block and signs the observation." },
            ],
          },
          { kind: "p", text: "The contract accepts a job result only with a valid signature from the release's key, the stored nonce, matching commitments and matching parameters. Each run's TDX quote is published by OutLayer ([an attestation record](" + ATTESTATION + ")); checking a quote against the release build uses the [outlayer-verify](" + OUTLAYER_VERIFY + ") tool." },
          { kind: "note", text: "Limit: under Intel TDX trust assumptions and OutLayer's keystore governance. The deployer owns the seeds and could rebind one to another build." },
        ],
      },
      {
        id: "near-ai",
        title: "NEAR AI Cloud attestations",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "Model", value: "z-ai/glm-5.3-flash", detail: "Called by its canonical id with `x-no-aliasing: true` through `https://cloud-api.near.ai/v1`." },
              { name: "Attestation report", value: "fresh nonce", href: ATTESTATION, detail: "Fetched once per run with a fresh random nonce. Both parts are verified: the gateway's (TDX quote, `report_data`, compose hash) and the model's (TDX quote, `report_data`, RTMR3 replay, `MRCONFIGID`, GPU evidence through NVIDIA NRAS)." },
              { name: "Response signatures", detail: "After every completion the job fetches its signature and checks it against the exact request and response bytes; the signer must be a verified model key." },
            ],
          },
          { kind: "note", text: "Limit: TLS binding is not checked from inside the job. Prompts reach the model through NEAR AI's attested gateway over TLS until end-to-end encryption to the model ships. See [NEAR AI Cloud verification](" + NEAR_AI_VERIFY + ")." },
        ],
      },
      {
        id: "usdc",
        title: "USDC held by the agreement",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "Token on testnet", value: "tusdc.accord-v1.testnet", href: acct(TESTNET.token), detail: "A 6-decimal NEP-141 test token (open mint, capped at 1,000 per call), used because the testnet USDC faucets were down on 8 Nov 2026." },
              { name: "Settle in Circle USDC (testnet)", value: "accord-usdc.testnet", href: acct("accord-usdc.testnet"), detail: "A second factory on the same release 3 settles in Circle's testnet USDC (`3e2210e1…afcb8af`, 6 decimals). Get it at [faucet.circle.com](https://faucet.circle.com), network NEAR Testnet: about `20 USDC` per address every 1 to 2 hours. Each agreement keeps its factory's token for life; try-it defaults to test USDC. `a1.accord-usdc.testnet` ran a full deal in it: funded `14.00 USDC`, paid `5.00` to `halcyon-mm.testnet`, refused a redirect and revoked the agent; see [/record](/record)." },
              { name: "Fund", value: "ft_transfer_call · fund", href: A6.fund, detail: "The buyer sends USDC into the agreement's own account; the escrow is credited up to the terms total and NEP-141 returns any excess." },
              { name: "Pay", value: "act → ft_transfer", href: A6.pay, detail: "After the six gates pass, the agreement's own code sends `ft_transfer` to the recipient under a payment lock with a callback. The key never touches the token contract." },
              { name: "Other ways out", value: "claim · close", detail: "The vendor's `claim` of an eligible payment after the claim delay, and the refund to the buyer at `close`." },
            ],
          },
          { kind: "note", text: "Limit: settlement is not confidential: the USDC transfer is public on NEAR, as with any stablecoin payment." },
        ],
      },
      {
        id: "relayer",
        title: "The relayer",
        blocks: [
          { kind: "p", text: "Accord's relayer (`relay.accord-v2.testnet`, [a relayed transaction](" + A6.relayer + ")) pays gas for NEP-366 signed delegate actions from wallets, so a vendor or buyer with no NEAR can take its steps. Each delegate holds exactly one function call, asks for at most `300 TGas` and expires within `7200` blocks." },
          {
            kind: "rows",
            rows: [
              { name: "Factory", value: "create_agreement", detail: "The only method it carries on the factory." },
              { name: "Agreement accounts", value: "any method but act", detail: "Calls on `a<n>.<factory>` accounts; the contract checks who may call what." },
              { name: "Token", value: "ft_transfer_call", detail: "Only with exactly `1 yoctoNEAR` and only into an Accord agreement." },
              { name: "Never", value: "act", tone: "refused", detail: "The contract identifies the agent by the signing key; through a relayer, the signing key would be the relayer's. The agent signs `act` with its own key." },
            ],
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ 5. Verify */
  {
    slug: "verify",
    group: "Trust",
    title: "Verify an agreement",
    summary: "Check any Accord agreement from public data with one command and no keys, or run five of the checks in the browser at /verify.",
    sections: [
      {
        id: "command",
        title: "The command",
        blocks: [
          { kind: "code", label: "make verify", code: "make verify DEAL=<agreement>", caption: "Needs no account and no keys. Reads NEAR testnet, the release, OutLayer and NEAR AI's attestation report." },
          { kind: "code", label: "On agreement a6", code: VERIFY_COMMAND },
          {
            kind: "rows",
            label: "Other agreements to check",
            rows: [
              { name: "Release 4", value: RELEASE4.agreement, href: "/verify?agreement=" + RELEASE4.agreement, tone: "ok", detail: "The security-review fixes. `" + RELEASE4.verify + "` prints `" + RELEASE4.verifyResult + "`. JSON: `/app/api/verify/" + RELEASE4.agreement + "`." },
              { name: "Circle USDC", value: CIRCLE.agreement, href: "/verify?agreement=" + CIRCLE.agreement, tone: "ok", detail: "The second factory, on release 3. `" + CIRCLE.verify + "` (the same as `ACCORD_FACTORY=accord-usdc.testnet make verify`). JSON: `/app/api/verify/" + CIRCLE.agreement + "`." },
            ],
          },
        ],
      },
      {
        id: "checks",
        title: "What each check means",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "Contract code", value: "ok", href: A6.release, tone: "ok", detail: "The account's code hash equals the published release (`8wMuMRre…` = release 3, global by hash), and the code has no deploy method." },
              { name: "Agreement keys", value: "ok", href: `${TESTNET.agreementUrl}?tab=accesskeys`, tone: "ok", detail: "No full-access key; at most one `FunctionCall` key for `act`. On a6 there are `0` keys, because the agent was revoked." },
              { name: "Sealed outcome", value: "ok", href: A6.negotiate, tone: "ok", detail: "The outcome was signed inside the enclave by the release's Sealed Table key; the commitments and the agreement match." },
              { name: "Enclave release", value: "not checked", href: OUTLAYER_VERIFY, detail: "The Sealed Table build (`7c832ce9…`) and its keys from pubkey run `13682`. Checking the run's attestation needs the outlayer-verify tool." },
              { name: "Model attestation", value: "partial", href: ATTESTATION, detail: "The real model (`z-ai/glm-5.3-flash`): the attestation report is fetched with a fresh nonce and the nonce is bound in it. The hardware quote and GPU evidence are not checked by `make verify`; `make probe-ai` checks them." },
              { name: "Recipient", value: "ok", href: A6.proof, tone: "ok", detail: "`halcyon-mm.testnet`, proven on the vendor's domain `accordweb-production.up.railway.app`, signed by the release's Payee key." },
              { name: "Record", value: "ok", href: A6.pay, tone: "ok", detail: "Payments match the receipts: `1` payment, `1` refusal, `0` exceptions." },
            ],
          },
        ],
      },
      {
        id: "a6-result",
        title: "The result on a6",
        blocks: [
          { kind: "code", label: "make verify DEAL=a6.accord-v2.testnet · 9 Nov 2026", code: VERIFY_RAW, output: true },
          { kind: "note", text: "5 checks ok, 1 partial, 1 not checked: the model check binds the fresh nonce but does not check the hardware quote here, and the enclave release check needs the outlayer-verify tool, which was not installed for this run. See [OutLayer trust and verification](" + OUTLAYER_VERIFY + ")." },
        ],
      },
      {
        id: "in-browser",
        title: "In the browser",
        blocks: [
          { kind: "p", text: "[/verify](/verify) runs five public checks on any agreement id, live from NEAR testnet: the agreement, the contract code, the access keys, the recipient and the record. No account, no keys." },
          { kind: "image", image: { id: "verify", alt: "The site's /verify page checking a6.accord-v2.testnet: five live rows read from testnet (agreement, contract code, access keys, recipient, record) each marked ok, then the full make verify result: 5 ok, 1 partial, 1 not checked.", caption: "/verify on a6.accord-v2.testnet." } },
          { kind: "note", text: "The sealed outcome, the model attestation and the release attestation are checked by `make verify` and in the app, not by /verify." },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ 6. CLI and commands */
  {
    slug: "cli",
    group: "Build on NEAR",
    title: "CLI and commands",
    summary: "Every make target a reader runs, what it does, the transaction where agreement a6 ran it on testnet, and real output from the platform README.",
    sections: [
      {
        id: "setup",
        title: "Set up and run locally",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "Check your tools", value: "make setup-check", detail: "Prints each pinned tool with its version and `ok`, or the install command for anything missing." },
              { name: "Run the tests", value: "make test", detail: "`cargo test` (core unit and property tests, contract unit tests, sandbox integration tests), job tests against fixtures, and the TypeScript tests." },
              { name: "Sandbox", value: "make sandbox", detail: "The full flow on a local NEAR sandbox; the three enclave jobs are replaced by a mock signer and every mocked line says `[mock]`." },
              { name: "The whole product locally", value: "make dev", detail: "A local NEAR node with the real contracts, the jobs' own code run natively, a test USDC faucet, the keeper, the demo agent and the app. Run any live target against it with `NET=local`." },
            ],
          },
          {
            kind: "code",
            label: "make sandbox · from the platform README (3 Nov 2026), first lines",
            output: true,
            code: `accord sandbox · local NEAR node · demo timings
  setup     tUSDC (test token, 6 decimals) · factory accord.test.near · release 1 (embedded, mock build)
  created   a1.accord.test.near · procurement · 0 keys on the account
  sealed    both mandates committed (ciphertexts on chain)
  [mock]    sealed-table output signed by the mock key · signature ok on chain · state Attested
  executing approved by both · terms ad410a91… · funded 36.00 tUSDC
  [mock]    payee proof signed by the mock key · authority approved · buyer accepted · halcyon-mm.test.near active
  agent     1 key · FunctionCall · receiver a1.accord.test.near · methods [act]
  delivery  item 1 submitted · accepted
  paid      item 1 · 12.00 tUSDC → halcyon-mm.test.near · 10 TGas`,
          },
        ],
      },
      {
        id: "live",
        title: "The live flow",
        blocks: [
          { kind: "p", text: "Live targets run against NEAR testnet by default, and against the local node with `NET=local`. Each link is the transaction where agreement a6 ran that step." },
          {
            kind: "rows",
            rows: [
              { name: "Negotiate", value: "make negotiate", href: A6.negotiate, tone: "ok", detail: "Two sealed mandates in, attested terms out: both commitments, the OutLayer request, `gateway and model attestation ok`, `limits pass`, the terms hash, `signature ok on chain`, and the sanity check `ERR_SEALED` both ways." },
              { name: "Approve", value: "make approve", href: A6.approve, tone: "ok", detail: "Both companies approve the same terms hash; the agreement is `Executing`." },
              { name: "Fund", value: "make fund", href: A6.fund, tone: "ok", detail: "The buyer funds the agreement's USDC." },
              { name: "Recipient", value: "make payee", href: A6.payee, tone: "ok", detail: "The recipient proven, approved, accepted and active, with its rating (`allow`)." },
              { name: "Pay", value: "make pay", href: A6.pay, tone: "ok", detail: "The agent pays milestone 1 after the vendor's delivery is accepted: `payment_sent` with the amount, the recipient and the transaction link." },
            ],
          },
          {
            kind: "code",
            label: "The live flow",
            code: "make negotiate\nmake approve\nmake fund\nmake payee\nmake pay",
            flowStart: "Sealed",
            flow: [
              { cmd: "make negotiate", href: A6.negotiate, state: "Attested", see: "Two sealed mandates in, attested terms out." },
              { cmd: "make approve", href: A6.approve, state: "Executing", see: "Both companies approve the same terms hash; the agreement is `Executing`." },
              { cmd: "make fund", href: A6.fund, see: "The buyer funds the agreement's USDC." },
              { cmd: "make payee", href: A6.payee, see: "The recipient proven, approved, accepted and active, with its rating (`allow`)." },
              { cmd: "make pay", href: A6.pay, see: "The agent pays milestone 1 after the vendor's delivery is accepted." },
            ],
          },
        ],
      },
      {
        id: "refusals",
        title: "Refusals, exceptions and revocation",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "Attack", value: "make attack", href: A6.attack, tone: "refused", detail: "Prints, in order: `ERR_PAYEE_MISMATCH`, `ERR_AMOUNT_MISMATCH`, `ERR_CANARY` with the key revoked and deleted, `AccessKeyDoesNotExist` for the next call, and `0 USDC moved by attempts`." },
              { name: "Revoke", value: "make revoke", href: A6.revoke, tone: "refused", detail: "The key before, the revoke transaction with its `DeleteKey` receipt, the rejected call after (`AccessKeyDoesNotExist`), the buyer's `AddKey` with a new allowance, and a payment with the new key." },
              { name: "Exception", value: "make exception", detail: "The agent requests a changed amount; it stays pending until the buyer approves; the payment goes out at the approved amount to the same recipient." },
              { name: "Claim", value: "make claim", detail: "With the agent revoked, the vendor claims an eligible milestone after the claim delay and is paid to the authorised recipient." },
              { name: "Recipient change", value: "make payee-change", detail: "Proof, authority approval, buyer acceptance and the delay before the new recipient is active; the old recipient stays payable until then." },
            ],
          },
          {
            kind: "code",
            label: "make attack NET=local · from the platform README (3 Nov 2026)",
            replay: "attack",
            code: `accord attack · a9.accord.test.near · agent key ed25519:BPDWuq96f5k4XjZbGYkXHCvhJVew6GDWJnEheUbURvnU · local node
  inbox     "Updated bank details" → agent: pay item 1 to halcyon-markets.test.near
  preflight block: not the authorised recipient · preflight off for this run, sending anyway
  refused   ERR_PAYEE_MISMATCH · seq 1 · block 4695 · tx GdqYoVc4uShQHBxLAzpcLeP8URo73Xo4GQi8bpSyweNL
  inbox     "Invoice correction" → agent: pay item 1, 83.00 USDC
  refused   ERR_AMOUNT_MISMATCH · seq 2 · block 4701 · tx 5dDcx4WSX6R9cwA9jBUd1X5FHqWAiLnwqq8KmPoAjM6o
  inbox     "Settlement account" → agent: pay item 1 to halcyon-mm-payments.test.near
  canary    ERR_CANARY · seq 3 · agent key ed25519:BPDWuq96f5k4XjZbGYkXHCvhJVew6GDWJnEheUbURvnU revoked and deleted · tx H5DC9oHpUvuAzWR6YqcQb1tyvyndG6fDf5sNzVH5NkPQ (final)
  agent     next call: AccessKeyDoesNotExist (rejected by the network, no receipt)
  escrow    36.00 USDC before · 36.00 USDC after · 0.00 USDC moved by attempts`,
            caption: "Transaction hashes in this block are on the local node, not testnet.",
          },
        ],
      },
      {
        id: "market-making",
        title: "Market making",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "One period", value: "make market-making", detail: "One market-making period on Rhea's USDC/wNEAR pool, read-only on mainnet: the observations with their mainnet blocks, the pass count against the threshold, the agent's payment, then a stricter agreement's period `Withheld`, and the scope line." },
            ],
          },
          {
            kind: "code",
            label: "make market-making NET=local · recorded on 3 Nov 2026 as make atlas, its earlier name, from the platform README",
            replay: "atlas",
            code: `accord atlas · a14.accord.test.near · market-making · rhea-dcl 17208628…|wrap.near|2000 · local node
  period 1  slot times held in the observer's enclave
  slot 1    mainnet block 222883053 · spread 147 bps · depth 32.78 / 75.62 USDC · pass
  slot 2    mainnet block 222883166 · spread 147 bps · depth 32.78 / 75.62 USDC · pass
  slot 3    mainnet block 222883341 · spread 147 bps · depth 32.78 / 75.62 USDC · pass
  slot 4    mainnet block 222883437 · spread 147 bps · depth 32.78 / 75.62 USDC · pass
  slot 5    mainnet block 222883536 · spread 147 bps · depth 32.78 / 75.62 USDC · pass
  slot 6    mainnet block 222883588 · spread 147 bps · depth 32.78 / 75.62 USDC · pass
  closed    6 of 6 passed · threshold 4 · uptime 100% · Eligible
  paid      agent pays period 1 · payment_sent 7.50 USDC → halcyon-mm.test.near · tx ANBNFhAnAQ8nJMSJmGZJjJQCQu49HQWirnA5GrApZMD2
  strict    a15.accord.test.near · period 1 · 0 of 6 passed · threshold 4 · Withheld
  withheld  agent asks to pay it anyway: ERR_PERIOD_WITHHELD · tx FYuYPokP7R9F6yWx11VRqCHFb7kdvEKXgh5WDBN6A241
  scope     venue-level liquidity, not the market maker's own orders`,
            caption: "The slots are real mainnet blocks; the agreements and transactions are on the local node.",
          },
        ],
      },
      {
        id: "verify-demo",
        title: "Verify, demo and the rest",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "Verify", value: "make verify DEAL=<agreement>", href: "/docs/verify#checks", tone: "ok", detail: "Read-only checks of a live agreement; no keys needed." },
              { name: "Full loop", value: "make demo", detail: "From nothing: faucet accounts, a new agreement, negotiation, approvals, funding, recipient, delivery, payment and one refused attack, with the elapsed time." },
              { name: "Finish an agreement", value: "make finish DEAL=<agreement>", detail: "Runs the steps after the negotiation on an existing agreement; a6 ran `make negotiate`, then `make finish DEAL=a6.accord-v2.testnet`." },
              { name: "Inbox", value: "make inbox", detail: "The `redirect`, `amount` and `question` fixtures through the open inbox: two refusals and one `no action`; `paid outside the terms: 0`." },
              { name: "Deployment check", value: "make check-deploy", detail: "The release wasm has no `mock` symbols, its hash equals the factory's current release, and each live agreement's code hash equals its pinned release." },
              { name: "Gas", value: "make measure", detail: "Measures the gas each call burns, on the local node." },
            ],
          },
          { kind: "code", label: "Copy", code: "make verify DEAL=a6.accord-v2.testnet\nmake demo" },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ 7. Contracts and endpoints */
  {
    slug: "contracts",
    group: "Build on NEAR",
    title: "Contracts and endpoints",
    summary: "The accounts and endpoints Accord uses on NEAR testnet, and the agreement contract's change and view methods, one line each.",
    sections: [
      {
        id: "testnet",
        title: "On NEAR testnet",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "Factory", value: TESTNET.factory, href: TESTNET.factoryUrl },
              { name: "Release", value: `release ${RELEASE4.release}`, href: RELEASE4.publish, detail: "The security-review fixes, current since 9 Nov 2026 ([set current](" + RELEASE4.current + ")). Release 3: [publish](" + TESTNET.releaseUrl + ")." },
              { name: "Agreement", value: TESTNET.agreement, href: TESTNET.agreementUrl, detail: "Ran the full flow on 8 Nov 2026 on release 3; see [/record](/record)." },
              { name: "Agreement on release 4", value: RELEASE4.agreement, href: RELEASE4.agreementUrl, detail: "Negotiated, funded, paid item 1 and refused a redirect on 9 Nov 2026: [fund](" + RELEASE4.steps[1].txs[0] + "), [pay](" + RELEASE4.steps[2].txs[0] + "), [refused](" + RELEASE4.steps[3].txs[0] + ")." },
              { name: "Circle USDC factory", value: CIRCLE.factory, href: acct(CIRCLE.factory), detail: "Settles in Circle's testnet USDC (`3e2210e1…afcb8af`); release 4 current ([publish](" + RELEASE4.usdcPublish + "), [set current](" + RELEASE4.usdcCurrent + "))." },
              { name: "Circle USDC agreement", value: CIRCLE.agreement, href: CIRCLE.agreementUrl, detail: "Release 3. [Funded](" + CIRCLE.steps[0].txs[0] + ") `14.00 USDC`, [paid](" + CIRCLE.steps[1].txs[0] + ") `5.00`, [refused](" + CIRCLE.steps[2].txs[0] + ") a redirect, [revoked](" + CIRCLE.steps[3].txs[0] + ")." },
              { name: "Token", value: TESTNET.token, href: acct(TESTNET.token), detail: "Test USDC, 6 decimals." },
              { name: "OutLayer", value: "outlayer.testnet", href: acct("outlayer.testnet") },
              { name: "Attestations", value: "testnet-api.outlayer.ai", href: ATTESTATION, detail: "`/attestations/<id>` returns the TDX quote for that run." },
              { name: "Relayer", value: "relay.accord-v2.testnet", href: A6.relayer, detail: "Linked: a transaction it relayed." },
              { name: "NEAR RPC", value: "rpc.testnet.near.org", href: "https://docs.near.org/api/rpc/providers" },
              { name: "Explorer", value: "testnet.nearblocks.io", href: "https://testnet.nearblocks.io" },
            ],
          },
        ],
      },
      {
        id: "factory",
        title: "Factory methods",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "create_agreement(args)", value: "buyer · payable", detail: "Creates `a<id>.<factory>` pinned to the current release; enforces the live minimums on the parameters." },
              { name: "publish_release · set_current_release", value: "owner", detail: "Completes a release with its job keys and attestation task ids; new agreements use the current one." },
              { name: "report_recipient · record_payment", value: "an agreement account", detail: "Recipient reports (with the refusal as evidence) and payment stats for the Payee signals." },
              { name: "Views", value: "anyone", detail: "`config()`, `release(v)`, `current_release()`, `agreement(id)`, `agreements(from, limit)`, `agreements_for(account)`, `reports(account)`, `blocked(account)`, `recipient_stats(account, buyer?)`." },
            ],
          },
        ],
      },
      {
        id: "change-methods",
        title: "Agreement change methods",
        blocks: [
          {
            kind: "rows",
            label: "Negotiation and approval",
            rows: [
              { name: "commit_mandate", value: "buyer · vendor", detail: "Stores the caller's commitment and ciphertext (at most `8 KB`); replaceable until the negotiation starts." },
              { name: "start_negotiation", value: "anyone", detail: "Needs both commitments and at least `280 TGas`; requests the Sealed Table run with only the agreement id and a fresh nonce." },
              { name: "approve_terms(terms_hash)", value: "buyer · vendor", detail: "Both approvals of the same hash move the agreement to `Executing`." },
              { name: "cancel", value: "buyer · vendor", detail: "Before `Executing`: `Cancelled`." },
            ],
          },
          {
            kind: "rows",
            label: "Funds, recipient and agent",
            rows: [
              { name: "ft_on_transfer", value: "token", detail: "Funding with `msg` `fund` from the buyer, credited up to the total; the rest is returned." },
              { name: "propose_recipient · approve_recipient · accept_recipient · activate_recipient · cancel_recipient_change", value: "vendor · authority · buyer · anyone", detail: "The Payee flow: proposal and enclave proof, the authority's approval, the buyer's acceptance, activation after the delay, cancellation during it." },
              { name: "install_agent_key(public_key, allowance)", value: "buyer", detail: "Adds the one `FunctionCall` key (receiver self, method `act`), replacing any current key." },
              { name: "revoke_agent", value: "buyer", detail: "Marks the key revoked and deletes it in the same transaction." },
              { name: "act(action)", value: "agent key", detail: "`Pay` or `RequestException` through the six gates; returns the outcome, panics only with `ERR_UNAUTHORIZED`." },
            ],
          },
          {
            kind: "rows",
            label: "Evidence, exceptions and closing",
            rows: [
              { name: "submit_delivery · accept_delivery · dispute_delivery", value: "vendor · buyer", detail: "Delivery evidence for procurement items and the acceptance window." },
              { name: "request_exception · approve_exception · reject_exception", value: "vendor · buyer", detail: "A one-off amount change for one item, optionally waiving its evidence; never a recipient change." },
              { name: "record_observation · close_period · resolve_period", value: "anyone · buyer", detail: "Market making: signed observations, the period's outcome, and the buyer's decision on `Review` or `Withheld`." },
              { name: "claim(item)", value: "vendor", detail: "Pulls an eligible payment to the authorised recipient after the claim delay, agent or no agent." },
              { name: "close · mutual_close · withdraw_near", value: "anyone · both · buyer", detail: "Pay eligible items, set aside what cannot be paid, refund the rest, `Settled`; then the buyer withdraws spare NEAR." },
              { name: "resolve_stale_lock", value: "anyone", detail: "Clears a payment lock older than `600` blocks by reading the token balance." },
            ],
          },
        ],
      },
      {
        id: "views",
        title: "Agreement view methods",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "get_agreement", detail: "State, negotiation, parties, release, parameters, approvals, funded, paid, reserved, the payment lock, recipient, agent key present, refusal and exception counts, budget." },
              { name: "get_terms · get_items · due_items", detail: "The approved terms; each item with its status and absolute due time; the items payable now." },
              { name: "get_refusals(from, limit)", detail: "The refusal log: sequence, time, block, code, item, amount, recipient, signer key." },
              { name: "get_recipients · get_exceptions", detail: "Every recipient version and every exception." },
              { name: "get_periods · get_observations(period)", detail: "Market-making periods and their stored observations." },
              { name: "get_commitments · get_documents · get_sealed_output", detail: "Both commitments and ciphertexts, the encrypted terms documents, and the Sealed Table's signed output." },
              { name: "get_receipts · get_budget", detail: "One receipt per payment; the account's balance, storage stake and liquid NEAR." },
            ],
          },
          { kind: "note", text: "No view returns or derives a mandate's plaintext." },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ 8. Security and limits */
  {
    slug: "security",
    group: "Trust",
    title: "Security and limits",
    summary: "The six claims Accord makes, each with its limit, what NEAR does not do here yet, the limits of this testnet deployment, and the threat model.",
    sections: [
      {
        id: "claims",
        title: "Claims and their limits",
        blocks: [
          {
            kind: "claims",
            rows: [
              {
                claim: "Each company's mandate is readable only inside attested enclaves",
                limit: "Under the hardware's trust assumptions (Intel TDX, NVIDIA confidential computing) and OutLayer's keystore governance. The deployer owns the seed and the factory account, and could rebind the seed to another build or request extra runs. On testnet the job's seed condition admits any caller during an agreement's open request window, so an outside party could request extra runs then and learn bounds on the limits; restricting the seed to the agreement's own calls is the next step. Prompts reach the model through NEAR AI's attested gateway over TLS (TLS binding is not checked from inside the job), unless end-to-end encryption to the model shipped (2.3b). The browser trusts the code the app serves; the CLI is the alternative. The ciphertext stays on chain. The final terms reveal that each side accepted them, as any signed deal does. A negotiator can concede in words; code checks the numbers",
              },
              {
                claim: "The approved terms are the agent's only authority",
                limit: "The agent's judgement is bounded, not protected: it can still be fooled into asking. Attestation proves which code produced the terms, not that the deal was good; people decide that when they approve",
              },
              {
                claim: "Payments go only to the authorised recipient",
                limit: "Authorisation proves control of the domain and the authority's approval, not that the company legally exists. A legal KYB check is a later integration. Testnet agreements run in demo mode: a recipient change waits 120 s and a claim 120 s; live mode enforces at least 24 h for a recipient change and 72 h for a claim, checked by the factory and again by the agreement",
              },
              {
                claim: "Revoking ends the agent's authority in one transaction",
                limit: "A payment already made stays made, and it went to the authorised recipient at the approved amount. A call that reached the chain before the revoke still runs, with every check. Revoking never cancels what the vendor has earned: an eligible payment stays claimable by the vendor",
              },
              {
                claim: "Negotiation is private; settlement is public",
                limit: "The enforced schedule (amounts, dates, recipient) and every payment are public on NEAR, as with any stablecoin payment",
              },
              {
                claim: "A market-making agreement's payment becomes eligible only when the agreed observations pass, unless the buyer approves an exception",
                limit: "A market-making agreement's observer measures the venue's liquidity, not the market maker's own orders. The deployer owns the observer's seed and could rebind it to a build that reveals slot times in advance. A slot nobody polls in time counts as unobserved, and a period that unobserved slots leave undecided, or that has conflicting observations, goes to the buyer, not to payment",
              },
            ],
          },
          { kind: "note", text: "The reason behind each claim is on [/security](/security)." },
        ],
      },
      {
        id: "not-yet",
        title: "What NEAR does not do here yet",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "Settlement privacy", detail: "Settlement is not confidential: the USDC transfer is public on NEAR, as with any stablecoin payment. Only the negotiation is private." },
              { name: "Legal KYB", detail: "Not done. The enclave proves control of a domain, and the vendor's settlement authority approves the account; a registry lookup is a later integration." },
              { name: "Mainnet", value: "not live", detail: "Accord runs on NEAR testnet only; mainnet follows an external audit." },
            ],
          },
        ],
      },
      {
        id: "testnet-limits",
        title: "Limits of this testnet deployment",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "Job secret condition", detail: "The planned condition (only runs an agreement requests can read the seeds) is not expressible with outlayer-cli `0.2.2`. The seeds are locked to the exact build hash and open to any caller: anyone can get a signed output, but every output names the agreement and is checked by that agreement against state it reads itself, so a run requested by someone else cannot change an outcome." },
              { name: "Factory key", detail: "The factory keeps its full-access key during the hackathon so fixes can ship. It cannot touch an existing agreement." },
              { name: "Test token", value: "tusdc.accord-v1.testnet", href: acct(TESTNET.token), detail: "The default factory and the full flow on a6 settle in the repository's test token. Circle's testnet USDC settles on the second factory, `accord-usdc.testnet`, where `a1.accord-usdc.testnet` ran a funded deal." },
              { name: "Release attestation", value: "not checked", href: "/docs/verify#a6-result", detail: "`make verify` on a6 did not check the enclave release: it needs the outlayer-verify tool." },
            ],
          },
        ],
      },
      {
        id: "threats",
        title: "Threat model",
        blocks: [
          {
            kind: "rows",
            label: "Against the agent and the payment",
            rows: [
              { name: "A prompt-injected or confused agent", detail: "Can ask `act` for anything. Stopped by the six gates, the canary, the refusal limit and preflight. Left over: an eligible payment to the authorised recipient, which the terms already allow." },
              { name: "Someone who stole the agent's key", detail: "Same as the agent, stopped the same way, and by `revoke_agent`. Left over: burning the key's gas allowance." },
              { name: "An email or chat impersonating the vendor", detail: "Can ask the agent to pay a new account or more. Stopped by the recipient and amount gates; no method takes a recipient from a message." },
              { name: "A hijacked vendor domain or a stolen authority key", detail: "Can publish or approve an attacker's account. Stopped by the other approvals, the buyer's acceptance and the delay. Left over: the vendor must notice during the delay." },
              { name: "A dishonest buyer", detail: "Can revoke the agent to avoid paying. Stopped by the vendor's claim after the delay; `close` pays eligible items before any refund." },
            ],
          },
          {
            kind: "rows",
            label: "Against the enclaves and the operators",
            rows: [
              { name: "A party probing the other's limits", detail: "Stopped by one run per pair of commitments, jobs that read ciphertexts from chain state, envelopes bound to agreement, role and party, and salted request hashes. Left over: what any accepted or refused deal reveals." },
              { name: "OutLayer's operator", detail: "Could resolve a request with arbitrary output. Stopped because the output must carry the build's signature from a seed only that build can read. Left over: keystore governance and TDX trust." },
              { name: "The deployer", detail: "Could rebind a seed to another build or, while the factory keeps its full-access key, request extra runs. Stated in the limits of claims 1 and 6." },
              { name: "NEAR AI Cloud", detail: "Sees the negotiators' prompts inside its TEEs. Checked by gateway and model attestations with a fresh nonce and per-response signatures. Left over: their TEE and GPU trust assumptions; TLS binding not checked from inside the job." },
              { name: "Our app server", detail: "Could serve altered JavaScript that reads a mandate before encryption. Mitigated by open source, the CLI and SDK as an alternative sealing path, and subresource integrity." },
            ],
          },
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ 9. References */
  {
    slug: "references",
    group: "Trust",
    title: "References",
    summary: "The official documentation behind each part of Accord, the NEAR standards it uses, and the primary sources for the problem it addresses.",
    sections: [
      {
        id: "source",
        title: "Source code",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "Accord repository", value: "github.com/Adityaakr/accord", href: LINKS.repo, detail: "Contracts, enclave jobs, SDK, MCP server, CLI, app and this website. MIT licence." },
              { name: "Claims and their limits", value: "platform/GOAL.md", href: `${LINKS.repo}/blob/main/platform/GOAL.md`, detail: "The source of truth for every claim on this site." },
              { name: "Interfaces", value: "platform/INTERFACES.md", href: `${LINKS.repo}/blob/main/platform/INTERFACES.md`, detail: "Every method, event, error, job schema, SDK call, MCP tool and CLI command." },
              { name: "MCP server, SDK and CLI", value: "platform/packages", href: `${LINKS.repo}/tree/main/platform/packages`, detail: "`@accord/mcp`, `@accord/sdk` and `accord`; run from a clone, not published to npm." },
            ],
          },
        ],
      },
      {
        id: "official",
        title: "Official references",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "NEAR access keys", value: "docs.near.org", href: "https://docs.near.org/protocol/accounts-contracts/access-keys", detail: "A function-call key is limited to one receiver and a list of methods, cannot attach a deposit, and spends gas from a fixed allowance." },
              { name: "NEAR asynchronous cross-contract calls", value: "docs.near.org", href: "https://docs.near.org/smart-contracts/anatomy/crosscontract" },
              { name: "NEAR AI Cloud private inference", value: "docs.near.ai", href: "https://docs.near.ai/cloud/private-inference" },
              { name: "OutLayer trust and verification", value: "app.outlayer.ai", href: OUTLAYER_VERIFY, detail: "How a run's attestation is checked with outlayer-verify." },
              { name: "Kraken public order book", value: "docs.kraken.com", href: "https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/book" },
              { name: "Kraken account-specific execution data", value: "docs.kraken.com", href: "https://docs.kraken.com/exchange/api-reference/spot-websocket-v2/executions" },
            ],
          },
          { kind: "note", text: "The exchange references illustrate the difference between aggregate and account-specific evidence; they do not assert that Accord has integrated Kraken." },
        ],
      },
      {
        id: "near-standards",
        title: "NEAR standards used",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "NEP-591 global contracts", value: "github.com/near/NEPs", href: "https://github.com/near/NEPs/blob/master/neps/nep-0591.md", detail: "A contract referenced by its code hash cannot change; the basis for pinning each agreement's code." },
              { name: "NEP-141 fungible tokens", value: "github.com/near/NEPs", href: "https://github.com/near/NEPs/blob/master/neps/nep-0141.md", detail: "`ft_transfer` and `ft_transfer_call`, including refunds of unused amounts." },
              { name: "NEP-145 storage management", value: "github.com/near/NEPs", href: "https://github.com/near/NEPs/blob/master/neps/nep-0145.md" },
              { name: "NEP-297 events", value: "github.com/near/NEPs", href: "https://github.com/near/NEPs/blob/master/neps/nep-0297.md" },
              { name: "NEP-366 meta transactions", value: "docs.near.org", href: "https://docs.near.org/web3-apps/tutorials/meta-transactions" },
              { name: "NEP-413 message signing", value: "github.com/near/NEPs", href: "https://github.com/near/NEPs/blob/master/neps/nep-0413.md" },
              { name: "Gas and storage", value: "docs.near.org", href: "https://docs.near.org/protocol/transactions/gas" },
              { name: "RPC providers", value: "docs.near.org", href: "https://docs.near.org/api/rpc/providers" },
            ],
          },
        ],
      },
      {
        id: "enclaves",
        title: "OutLayer and NEAR AI Cloud",
        blocks: [
          {
            kind: "rows",
            label: "OutLayer",
            rows: [
              { name: "NEAR integration", value: "app.outlayer.ai", href: "https://app.outlayer.ai/docs/near-integration" },
              { name: "Secrets", value: "app.outlayer.ai", href: "https://app.outlayer.ai/docs/secrets" },
              { name: "Signing keys", value: "app.outlayer.ai", href: "https://app.outlayer.ai/docs/signing-keys" },
              { name: "TEE attestation", value: "app.outlayer.ai", href: "https://app.outlayer.ai/docs/tee-attestation" },
              { name: "outlayer-verify", value: "github.com/out-layer", href: "https://github.com/out-layer/outlayer-verify" },
            ],
          },
          {
            kind: "rows",
            label: "NEAR AI Cloud",
            rows: [
              { name: "Verification", value: "docs.near.ai", href: NEAR_AI_VERIFY, detail: "Attestation reports fetched with a fresh nonce, and per-response signatures bound to the attested model key." },
              { name: "Gateway attestation", value: "docs.near.ai", href: "https://docs.near.ai/cloud/verification/cloud-api/gateway-attestation" },
              { name: "Model attestations", value: "docs.near.ai", href: "https://docs.near.ai/cloud/verification/cloud-api/model-attestations" },
              { name: "Response signatures", value: "docs.near.ai", href: "https://docs.near.ai/cloud/verification/cloud-api/response-signatures" },
              { name: "End-to-end encryption", value: "docs.near.ai", href: "https://docs.near.ai/cloud/guides/e2ee-chat-completions" },
            ],
          },
        ],
      },
      {
        id: "sources",
        title: "Primary sources",
        blocks: [
          {
            kind: "rows",
            rows: [
              { name: "FBI IC3, Internet Crime Report 2025", value: "ic3.gov", href: "https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf", detail: "Business email compromise: `$3,046,598,558` across `24,768` complaints." },
              { name: "OWASP Top 10 for LLM Applications, LLM01:2025", value: "genai.owasp.org", href: "https://genai.owasp.org/llmrisk/llm01-prompt-injection/", detail: "Prompt injection is the first risk, including indirect injection from external sources." },
              { name: "UK NCSC, Prompt injection is not SQL injection", value: "ncsc.gov.uk", href: "https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection", detail: "Design protections should focus on deterministic (non-LLM) safeguards that constrain the system's actions." },
              { name: "NEAR Intents confidential execution", value: "intents.near.org", href: "https://intents.near.org/confidential", detail: "It does not hide data an application publishes or an ordinary transfer on the destination chain; the reason Accord makes no claim of private settlement." },
            ],
          },
        ],
      },
    ],
  },
]

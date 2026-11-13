import { PageHead, Panel } from "@/components/ui";
import styles from "../pages.module.css";

export const metadata = { title: "Docs" };

// GOAL.md "Claims and their limits", verbatim.
const CLAIMS: [string, string, string][] = [
  ["Each company's mandate is readable only inside attested enclaves", "The browser encrypts the mandate to a key derived from a seed generated inside the Sealed Table's enclave, bound to its release build and readable only by runs an agreement requests or that publish the key's public half; the chain holds the ciphertext and a commitment hash; the two negotiators run on NEAR AI Cloud models in TEEs, and the gateway's and the model's attestations are verified with a fresh nonce", "Under the hardware's trust assumptions (Intel TDX, NVIDIA confidential computing) and OutLayer's keystore governance. The deployer owns the seed and the factory account, and could rebind the seed to another build or request extra runs. On testnet the job's seed condition admits any caller during an agreement's open request window, so an outside party could request extra runs then and learn bounds on the limits; restricting the seed to the agreement's own calls is the next step. Prompts reach the model through NEAR AI's attested gateway over TLS (TLS binding is not checked from inside the job); end-to-end encryption to the model is not shipped yet. The browser trusts the code the app serves; the CLI is the alternative. The ciphertext stays on chain. The final terms reveal that each side accepted them, as any signed deal does. A negotiator can concede in words; code checks the numbers"],
  ["The approved terms are the agent's only authority", "The agent's only key is a function-call key on the agreement's own account that can call `act` and nothing else; `act` refuses any payment whose item, evidence, amount or recipient differs from the terms both companies approved", "The agent's judgement is bounded, not protected: it can still be fooled into asking. Attestation proves which code produced the terms, not that the deal was good; people decide that when they approve. The buyer can also approve an exception its agent requests, including a lower amount for an item; the vendor is not asked"],
  ["Payments go only to the authorised recipient", "The recipient is a NEAR account listed in a file on the vendor's domain, fetched inside an enclave; the vendor's settlement authority approves it on chain and the buyer accepts it; a change needs all three again and a 24-hour delay", "Authorisation proves control of the domain and the authority's approval, not that the company legally exists. A legal KYB check is a later integration. Testnet agreements run in demo mode: a recipient change waits 120 s and a claim 120 s; live mode enforces at least 24 h for a recipient change and 72 h for a claim, checked by the factory and again by the agreement"],
  ["Revoking ends the agent's authority in one transaction", "`revoke_agent` marks the agent's key revoked, so the contract refuses it from that receipt on, and deletes it from the agreement account in the same transaction; the account has no other key, so after the deletion lands (about one block) anything the agent signs is rejected by the network before it reaches the contract", "A payment already made stays made, and it went to the authorised recipient at the approved amount. A call that reached the chain before the revoke still runs, with every check. Revoking never cancels what the vendor has earned: an eligible payment stays claimable by the vendor, unless the buyer approves an exception that lowers it"],
  ["Negotiation is private; settlement is public", "Mandates and the transcript stay inside enclaves; only the terms, commitment hashes, a transcript hash and attestation references leave; the commercial terms document is encrypted to the two parties", "The enforced schedule (amounts, dates, recipient) and every payment are public on NEAR, as with any stablecoin payment"],
  ["A market-making agreement's payment becomes eligible only when the agreed observations pass, unless the buyer approves an exception", "Each slot's time is drawn inside the observer's enclave from a seed generated there; the observation is taken at the first NEAR mainnet block after that time, signed by the observer's key, and checked by the contract against the agreed spread, depth and two-sided quoting; anyone can recompute it from an archival node", "A market-making agreement's observer measures the venue's liquidity, not the market maker's own orders. The deployer owns the observer's seed and could rebind it to a build that reveals slot times in advance. A slot nobody polls in time counts as unobserved, and a period that unobserved slots leave undecided, or that has conflicting observations, goes to the buyer, not to payment"],
  ["On an open tender, each price stays sealed until bidding closes and it is revealed, the lowest valid price wins, and the winner's key becomes the vendor of an ordinary Accord agreement", "The tender board stores only a sha256 commitment of each price, and accepts a bid only with the bidder's own ed25519 signature, checked on chain; a reveal must open that commitment; the award is computed on chain by a rule anyone can call; the buyer's link to the agreement is stored only if the factory confirms a procurement agreement with that buyer and the winner's key as vendor", "One party can bid under several keys and reveal only the price that wins after seeing the others; each unrevealed bid forfeits its 0.02 NEAR bond to the buyer, which puts a price on this but does not prevent it, and anyone can fill a job's 32 slots for 32 bonds. Every bid sent from the browser, the CLI or tender-bid.mjs also carries its price timelocked to the drand round after bidding closes (a bid sent on chain directly can attach one), so Accord's keeper can reveal it for a bidder who is away; this relies on drand's threshold network not publishing that round early. The board (`tender-v2.accord-v2.testnet`, no access key) had an internal adversarial review, not the security review of the agreement contracts. The winning bid sets the vendor's sealed floor; the terms are still negotiated in the Sealed Table and approved by both companies. The link checks buyer, vendor and kind, not that the agreement's total or token match the winning bid. Testnet only"],
];

const JUDGE_PATHS = `make verify DEAL=<agreement>   # read-only, no account, no key
make sandbox                    # full flow on a local node; jobs mocked and labelled
make demo NET=local             # full live loop on a local node (NET=local)
make negotiate && make finish DEAL=<agreement>   # the same flow on testnet, then make attack, make revoke`;

export default function Docs() {
  return (
    <div className="container">
      <PageHead title="Docs" lead="How to run Accord, what it claims, and the limit beside each claim." />
      <div className={styles.cols2}>
        <Panel title="Three ways to check it" eyebrow="cheapest first"><pre className={styles.code}>{JUDGE_PATHS}</pre></Panel>
        <Panel title="What the agent's key can and cannot do">
          <ul className={styles.bullets}>
            <li>It can call one method, <span className="mono">act</span>, on one account: the agreement it works for.</li>
            <li>It cannot attach NEAR, transfer NEAR, add or delete keys, deploy code or call any other contract.</li>
            <li>It spends gas from a fixed allowance set when the buyer installs it.</li>
            <li>One buyer transaction, <span className="mono">revoke_agent</span>, ends it; a canary request or five refusals in an hour do the same.</li>
            <li>It cannot change the terms, the recipient, the amounts or the evidence.</li>
          </ul>
        </Panel>
      </div>
      <h2 className={`h3 ${styles.sectionTitle}`}>Claims and their limits</h2>
      <Panel flush>
        <div className={styles.tableWrap}>
          <table className={styles.table} style={{ tableLayout: "fixed", minWidth: 900 }}>
            <thead><tr><th style={{ width: "24%" }}>We claim</th><th style={{ width: "38%" }}>Because</th><th>Limit, stated next to it</th></tr></thead>
            <tbody>
              {CLAIMS.map(([c, b, l]) => (
                <tr key={c}>
                  <td style={{ whiteSpace: "normal", color: "var(--text-strong)", verticalAlign: "top" }}>{c}</td>
                  <td style={{ whiteSpace: "normal", verticalAlign: "top" }} className="small">{b}</td>
                  <td style={{ whiteSpace: "normal", verticalAlign: "top" }} className="small">{l}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

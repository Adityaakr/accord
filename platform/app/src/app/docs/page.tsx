import { PageHead, Panel } from "@/components/ui";
import styles from "../pages.module.css";

export const metadata = { title: "Docs" };

// GOAL.md "Claims and their limits", verbatim.
const CLAIMS: [string, string, string][] = [
  ["Each company's mandate is readable only inside attested enclaves", "The browser encrypts the mandate to a key derived from a seed generated inside the Sealed Table's enclave, bound to its release build and readable only by runs an agreement requests or that publish the key's public half; the chain holds the ciphertext and a commitment hash; the two negotiators run on NEAR AI Cloud models in TEEs, and the gateway's and the model's attestations are verified with a fresh nonce", "Under the hardware's trust assumptions (Intel TDX, NVIDIA confidential computing) and OutLayer's keystore governance. The deployer owns the seed and the factory account, and could rebind the seed to another build or request extra runs. Prompts reach the model through NEAR AI's attested gateway over TLS (TLS binding is not checked from inside the job), unless end-to-end encryption to the model shipped (2.3b). The browser trusts the code the app serves; the CLI is the alternative. The ciphertext stays on chain. The final terms reveal that each side accepted them, as any signed deal does. A negotiator can concede in words; code checks the numbers"],
  ["The approved terms are the agent's only authority", "The agent's only key is a function-call key on the agreement's own account that can call `act` and nothing else; `act` refuses any payment whose item, evidence, amount or recipient differs from the terms both companies approved", "The agent's judgement is bounded, not protected: it can still be fooled into asking. Attestation proves which code produced the terms, not that the deal was good; people decide that when they approve"],
  ["Payments go only to the authorised recipient", "The recipient is a NEAR account listed in a file on the vendor's domain, fetched inside an enclave; the vendor's settlement authority approves it on chain and the buyer accepts it; a change needs all three again and a 24-hour delay", "Authorisation proves control of the domain and the authority's approval, not that the company legally exists. A legal KYB check is a later integration"],
  ["Revoking ends the agent's authority in one transaction", "`revoke_agent` marks the agent's key revoked, so the contract refuses it from that receipt on, and deletes it from the agreement account in the same transaction; the account has no other key, so after the deletion lands (about one block) anything the agent signs is rejected by the network before it reaches the contract", "A payment already made stays made, and it went to the authorised recipient at the approved amount. A call that reached the chain before the revoke still runs, with every check. Revoking never cancels what the vendor has earned: an eligible payment stays claimable by the vendor"],
  ["Negotiation is private; settlement is public", "Mandates and the transcript stay inside enclaves; only the terms, commitment hashes, a transcript hash and attestation references leave; the commercial terms document is encrypted to the two parties", "The enforced schedule (amounts, dates, recipient) and every payment are public on NEAR, as with any stablecoin payment"],
  ["A market-making agreement's payment becomes eligible only when the agreed observations pass, unless the buyer approves an exception", "Each slot's time is drawn inside the observer's enclave from a seed generated there; the observation is taken at the first NEAR mainnet block after that time, signed by the observer's key, and checked by the contract against the agreed spread, depth and two-sided quoting; anyone can recompute it from an archival node", "A market-making agreement's observer measures the venue's liquidity, not the market maker's own orders. The deployer owns the observer's seed and could rebind it to a build that reveals slot times in advance. A slot nobody polls in time counts as unobserved, and a period that unobserved slots leave undecided, or that has conflicting observations, goes to the buyer, not to payment"],
];

const JUDGE_PATHS = `make verify DEAL=<agreement>   # read-only, no account, no key
make sandbox                    # full flow on a local node; jobs mocked and labelled
make demo                       # full live loop on testnet, under two minutes`;

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

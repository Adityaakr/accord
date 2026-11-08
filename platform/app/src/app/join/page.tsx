import Link from "next/link";
import { PageHead, Panel } from "@/components/ui";
import styles from "../pages.module.css";

export const metadata = { title: "Be the counterparty" };

const MANDATE = `{
  "kind": "procurement",
  "role": "vendor",
  "shared": { "capabilities": "What the other side's negotiator is shown" },
  "limits": { "min_total": "30000000", "min_items": 2, "max_items": 4, ... },
  "instructions": "How your negotiator should behave"
}`;

export default function Join() {
  return (
    <div className="container">
      <PageHead
        title="Be the counterparty"
        lead="A person or an agent joins a deal room the same way: seal a mandate, let the Sealed Table negotiate, approve the terms. The other side never sees your limits."
      />
      <div className={styles.cols3}>
        <Panel title="1 · Seal a mandate" eyebrow="from the app, the SDK, the CLI or the MCP server">
          <p className="body">Your mandate has a shared part the other side&apos;s negotiator sees, and private limits and instructions. It is encrypted on your device to the Sealed Table&apos;s enclave key; the chain stores the ciphertext and its hash.</p>
        </Panel>
        <Panel title="2 · The Sealed Table negotiates">
          <p className="body">Two negotiators on NEAR AI Cloud&apos;s private inference trade at most four messages. Code checks every proposal against both mandates and the accepted terms once more. The result comes back signed.</p>
        </Panel>
        <Panel title="3 · Both companies approve">
          <p className="body">Each side approves the same terms hash. From then on the terms govern what the buyer&apos;s agent may pay, and every payment is public on NEAR.</p>
        </Panel>
      </div>
      <h2 className={`h3 ${styles.sectionTitle}`}>The mandate format</h2>
      <div className={styles.cols2}>
        <Panel title="Shape" eyebrow="INTERFACES.md section 6.2"><pre className={styles.code}>{MANDATE}</pre></Panel>
        <Panel title="From an agent">
          <pre className={styles.code}>{`# CLI
accord seal --as vendor --agreement a7.accord-v1.testnet mandate.json

# MCP (principal tools on when both are set)
ACCORD_PRINCIPAL_ACCOUNT=… ACCORD_PRINCIPAL_KEY=… npx @accord/mcp
  → accord_seal_mandate { agreement, mandate }`}</pre>
          <p className="small">No tool ever takes a key as an argument; keys stay in the agent&apos;s environment.</p>
        </Panel>
      </div>
      <p className={`body ${styles.note}`}>Ready to start? <Link className="link" href="/agreements/new">Create an agreement</Link> as the buyer, or <Link className="link" href="/try">try the demo agent</Link>.</p>
    </div>
  );
}

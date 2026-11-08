import { PageHead, Panel } from "@/components/ui";
import { PayeeTool } from "./PayeeTool";
import styles from "../pages.module.css";

export const metadata = { title: "Payee" };

export default function Payee() {
  return (
    <div className="container">
      <PageHead
        title="Authorise where payments go"
        lead="The vendor publishes a small file on its own domain naming its payout accounts and its settlement authority. Inside an enclave the Payee job fetches it; the authority approves on chain; the buyer accepts. A change needs all three again and a 24-hour delay."
      />
      <PayeeTool />
      <div className={styles.cols3} style={{ marginTop: 32 }}>
        <Panel title="What it proves"><p className="body">Control of the domain when the file was fetched, and the authority account&apos;s approval. Not that the company legally exists: a legal KYB check is a later integration.</p></Panel>
        <Panel title="Signals"><p className="body">Whether the account exists, is a contract or changed its code recently, earlier payments from this buyer, refusal reports and the curated blocklist. A canary is always blocked.</p></Panel>
        <Panel title="Pinned domain"><p className="body">The first recipient sets the agreement&apos;s domain. Later changes must use it, so a stolen authority key cannot move payments to a domain the vendor does not control.</p></Panel>
      </div>
    </div>
  );
}

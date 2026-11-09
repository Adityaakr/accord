import Form from "next/form";
import { redirect } from "next/navigation";
import { PageHead, Panel } from "@/components/ui";
import styles from "../pages.module.css";

export const metadata = { title: "Verify" };

// The form is a plain GET (?agreement=…), not a server action: a server action posts back to this page and Next
// checks its Origin against the Host, which fails behind the site's proxy (the page answered with a server error).
// A GET works on every host and from a bookmarked or shared link.
export default async function Verify({ searchParams }: { searchParams: Promise<{ agreement?: string | string[] }> }) {
  const q = (await searchParams).agreement;
  const id = (Array.isArray(q) ? q[0] : q)?.trim();
  if (id) redirect(`/verify/${encodeURIComponent(id)}`);
  return (
    <div className="container">
      <PageHead
        title="Verify an agreement"
        lead="No account and no key needed. The checks read the chain directly and fetch NEAR AI Cloud's attestation report with a nonce your browser chooses."
      />
      <Form action="/verify" className={styles.search}>
        <input name="agreement" className={styles.input} placeholder="a1.accord-v1.testnet" aria-label="Agreement account" required />
        <button type="submit" className={styles.button}>Verify</button>
      </Form>
      <h2 className={`h3 ${styles.sectionTitle}`}>What is checked</h2>
      <div className={styles.cols2}>
        <Panel title="code"><p className="body">The account runs exactly its release&apos;s code, and has no method that deploys code.</p></Panel>
        <Panel title="keys"><p className="body">At most one key: a function-call key for <span className="mono">act</span> on the account itself. Never a full-access key.</p></Panel>
        <Panel title="sealed"><p className="body">The Sealed Table&apos;s outcome is signed by the release&apos;s key and names this agreement and both commitments on chain.</p></Panel>
        <Panel title="model"><p className="body">NEAR AI Cloud&apos;s attestation report, fetched with a fresh nonce, binds that nonce. It attests the model as served now; the negotiating run&apos;s own attestation is bound in the signed outcome (the sealed check).</p></Panel>
        <Panel title="payee"><p className="body">The active recipient&apos;s domain proof is signed by the release&apos;s Payee key, approved by the authority and accepted by the buyer.</p></Panel>
        <Panel title="record"><p className="body">Payments, refusals, exceptions, reserved items and observation conflicts, with receipts that add up to what was paid.</p></Panel>
      </div>
      <p className={`small ${styles.note}`}>The same checks run from a terminal: <span className="mono">make verify DEAL=&lt;agreement&gt;</span>.</p>
    </div>
  );
}

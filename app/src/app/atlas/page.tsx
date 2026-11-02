import Link from "next/link";
import { rooms } from "@/server/data";
import { PageHead, Panel, Pill, StatePill, Usdc } from "@/components/ui";
import styles from "../pages.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Accord Atlas" };

export default async function Atlas() {
  const data = await rooms().catch(() => null);
  const list = (data?.rooms ?? []).filter((r) => r.record.kind === "market-making");
  return (
    <div className="container">
      <PageHead
        eyebrow={<Pill tone="purple">Liquidity agreements with conditional payments</Pill>}
        title="Accord Atlas: agreed liquidity conditions, enforced payment rules."
        lead="A project and its market maker agree a spread, a depth and two-sided quoting. At hidden times the observer reads the venue on NEAR mainnet; a period's retainer becomes payable only when enough observations pass."
      />
      <div className={styles.cols3}>
        <Panel title="Hidden slot times">
          <p className="body">Each slot&apos;s time is drawn inside the observer&apos;s enclave from a seed generated there. Nobody knows it in advance, and every caller after it gets the same sample: the first final mainnet block at or after that time.</p>
        </Panel>
        <Panel title="Checked by the contract">
          <p className="body">The contract verifies the observer&apos;s signature, the venue and the slot window, then counts passes against the threshold. Anyone can recompute an observation from an archival node at its block.</p>
        </Panel>
        <Panel title="People decide the rest">
          <p className="body">A period that unobserved slots leave undecided, or that has conflicting observations, goes to the buyer. A withheld period can still be paid through an exception the buyer approves.</p>
        </Panel>
      </div>

      <h2 className={`h3 ${styles.sectionTitle}`}>Atlas agreements</h2>
      {list.length === 0 ? (
        <p className="body">No Accord Atlas agreements yet.</p>
      ) : (
        <ul className={styles.rows}>
          {list.map(({ record, view }) => (
            <li key={record.account}>
              <Link href={`/agreements/${record.account}`} className={styles.row}>
                <span className="h5">{record.title}</span>
                <span className="small mono">{record.account}</span>
                <span className="small">{view?.periods.map((p, i) => <Pill key={i} tone={p === "Eligible" || p === "ResolvedPay" ? "teal" : p === "Withheld" ? "refusal" : p === "Review" ? "warn" : "neutral"}>{`P${i + 1} ${p.toLowerCase()}`}</Pill>)}</span>
                <span className="small">{view && <><Usdc amount={view.paid} /> paid</>}</span>
                <StatePill state={view?.state ?? "Sealed"} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Panel title="What Accord Atlas does not claim" className={styles.note}>
        <ul className={styles.bullets}>
          <li>It measures the venue&apos;s liquidity, not the market maker&apos;s own orders.</li>
          <li>Retainer-only engagements; no loan-plus-option structures. One venue per agreement.</li>
          <li>The deployer owns the observer&apos;s seed and could rebind it to a build that reveals slot times in advance.</li>
          <li>Slots are minutes in the demo and hours in production, set in the terms.</li>
        </ul>
      </Panel>
    </div>
  );
}

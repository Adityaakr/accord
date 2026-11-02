import Link from "next/link";
import { rooms } from "@/server/data";
import { Pill, PageHead, StatePill, Usdc, Meter } from "@/components/ui";
import { SourceLine } from "@/components/SourceLine";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  let data: Awaited<ReturnType<typeof rooms>> | null = null;
  let error: string | null = null;
  try {
    data = await rooms();
  } catch (e) {
    error = (e as Error).message;
  }

  const list = data?.rooms ?? [];
  const live = list.filter((r) => r.view?.state === "Executing").length;
  const escrow = list.reduce((s, r) => s + BigInt(r.view?.funded ?? "0") - BigInt(r.view?.paid ?? "0") - BigInt(r.view?.refunded ?? "0"), 0n);
  const refusals = list.reduce((s, r) => s + (r.view?.refusals ?? 0), 0);

  return (
    <div className="container">
      <PageHead
        eyebrow={data ? <SourceLine {...data.source} /> : null}
        title="Deal rooms"
        lead="Each deal room is its own NEAR account. Two companies seal their mandates, approve the signed terms, and the terms decide what the buyer's agent may pay."
        aside={<Link href="/agreements/new" className={styles.primary}>New agreement</Link>}
      />

      <div className={styles.stats}>
        <Stat label="Deal rooms" value={String(list.length)} />
        <Stat label="Executing" value={String(live)} />
        <Stat label="Held in escrow" value={<Usdc amount={escrow < 0n ? 0n : escrow} />} />
        <Stat label="Payments refused" value={String(refusals)} tone={refusals > 0 ? "refusal" : undefined} />
      </div>

      {error && (
        <div className={styles.error} role="alert">
          <p className="h5">The chain could not be read</p>
          <p className="small mono">{error}</p>
        </div>
      )}

      {data && list.length === 0 && (
        <div className={styles.emptyState}>
          <p className="h4">No deal rooms yet</p>
          <p className="body">Create the first agreement, or run <span className="mono">make demo</span> to open one end to end.</p>
        </div>
      )}

      {list.length > 0 && (
        <ul className={styles.list}>
          {list.map(({ record, view }) => {
            const total = BigInt(view?.total ?? "0");
            const paid = BigInt(view?.paid ?? "0");
            return (
              <li key={record.account}>
                <Link href={`/agreements/${record.account}`} className={styles.row}>
                  <div className={styles.rowMain}>
                    <div className={styles.rowTitle}>
                      <span className="h5">{record.title}</span>
                      {record.kind === "market-making" ? <Pill tone="purple">Accord Atlas</Pill> : <Pill>procurement</Pill>}
                      {view?.canary_tripped && <Pill tone="refusal">canary tripped</Pill>}
                    </div>
                    <span className="small mono">{record.account}</span>
                  </div>
                  <div className={styles.rowParties}>
                    <span className="small">{record.buyer}</span>
                    <span className="faint" aria-hidden="true">→</span>
                    <span className="small">{record.vendor}</span>
                  </div>
                  <div className={styles.rowMoney}>
                    {total > 0n ? (
                      <>
                        <span className="small"><Usdc amount={paid} /> <span className="faint">of</span> <Usdc amount={total} /></span>
                        <Meter value={paid} max={total} />
                      </>
                    ) : (
                      <span className="small faint">terms not agreed yet</span>
                    )}
                  </div>
                  <div className={styles.rowState}>
                    <StatePill state={view?.state ?? "Sealed"} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "refusal" }) {
  return (
    <div className={styles.stat}>
      <span className="small">{label}</span>
      <span className={`${styles.statValue} ${tone === "refusal" ? styles.statRefusal : ""}`}>{value}</span>
    </div>
  );
}

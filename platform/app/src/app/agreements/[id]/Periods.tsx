import type { AtlasTerms, PeriodView, StoredObservation } from "@accord/sdk";
import { ObservationLog, PeriodGrid } from "@/components/atlas";
import { Empty, Panel } from "@/components/ui";

/** A market-making deal room: each period's slots, then every observation the contract accepted. */
export function Periods({
  periods, observations, atlas, now,
}: { periods: PeriodView[]; observations: StoredObservation[][]; atlas: AtlasTerms; now: number }) {
  const all = observations.flat().sort((a, b) => b.observation.venue_block.height - a.observation.venue_block.height);
  return (
    <>
      <Panel
        title="Periods"
        eyebrow="slot times are drawn inside the observer's enclave; each sample is the first NEAR mainnet block after its time"
      >
        <PeriodGrid periods={periods} observations={observations} atlas={atlas} now={now} />
        <p className="small" style={{ marginTop: 14 }}>
          Numbers in the slots are the spread in basis points. The observer measures the venue&apos;s liquidity, not the market
          maker&apos;s own orders.
        </p>
      </Panel>
      <Panel
        title="Observation log"
        eyebrow="signed by the observer, checked by the contract; anyone can re-read the pool at each mainnet block"
        aside={<span className="small mono">{all.length} recorded</span>}
        flush
      >
        {all.length === 0 ? (
          <div style={{ padding: "4px 20px 16px" }}><Empty>No observation yet. The first arrives after the first hidden slot time.</Empty></div>
        ) : (
          <ObservationLog rows={all} />
        )}
      </Panel>
    </>
  );
}

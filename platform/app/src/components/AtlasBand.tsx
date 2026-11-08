import Link from "next/link";
import { atlasConsole } from "@/server/atlas";
import { Pill } from "./ui";
import styles from "./atlasband.module.css";

/** The home page's line into market-making agreements: the latest mainnet reading and how the liquidity agreements stand. */
export async function AtlasBand() {
  const c = await atlasConsole().catch(() => null);
  if (!c || c.rooms.length === 0) return null;
  const o = c.latest?.observation;
  return (
    <Link href="/market-making" className={styles.band}>
      <Pill tone="purple">Market making</Pill>
      <span className={styles.text}>
        {o ? (
          <>Rhea NEAR/USDC at mainnet block <span className="mono">{o.venue_block.height.toLocaleString("en-US")}</span>: spread{" "}
            <span className="mono">{o.spread_bps} bps</span>, depth <span className="mono">{(Number(o.depth_bid) / 1e6).toFixed(0)} / {(Number(o.depth_ask) / 1e6).toFixed(0)}</span> USDC</>
        ) : (
          <>Waiting for the first hidden slot time</>
        )}
        <span className="faint"> · </span>
        {c.rooms.length} agreement{c.rooms.length === 1 ? "" : "s"} · {c.totals.observations} observations · {c.totals.eligible} eligible · {c.totals.withheldPeriods} withheld
      </span>
      <span className={styles.arrow} aria-hidden="true">→</span>
    </Link>
  );
}

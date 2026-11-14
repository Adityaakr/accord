// Says, from chain state, when the Sealed Table is not answering in time, why, and what still works without it.
// Shown only while the newest ended negotiation on the factory got no signed answer (server/tablehealth.ts).

import Link from "next/link";
import type { TableHealth } from "@/server/tablehealth";
import styles from "./TableNotice.module.css";

const utc = (at: number) => `${new Date(at * 1000).toISOString().slice(11, 16)} UTC`;

/** The ways to see Accord work that need no new negotiation, so no OutLayer run. */
export function WithoutTheTable() {
  return (
    <ul>
      <li><Link href="/try" prefetch={false}>The live room</Link>: an agreement already past negotiation and funded. Send its agent a redirect and the contract refuses it on chain.</li>
      <li><Link href="/replay" prefetch={false}>The replay</Link>: a recorded run of <code>a32.accord-v2.testnet</code>, each step with its transaction.</li>
      <li><Link href="/verify" prefetch={false}>Verify</Link> any earlier agreement: its negotiation, attestation and payments are already on chain.</li>
    </ul>
  );
}

export function TableNotice({ health, context }: { health: TableHealth | null; context: "deal" | "tender" }) {
  if (!health?.late || !health.newestUnanswered) return null;
  const n = health.unanswered;
  return (
    <aside className={styles.notice} role="status">
      <p>
        <strong>The Sealed Table is answering late right now.</strong>{" "}
        The negotiation runs in an enclave on OutLayer&apos;s testnet worker, and a NEAR contract can wait about <code>200</code> blocks
        (2 to 3 minutes) for its answer. {n === 1 ? "The newest negotiation" : <>The newest <code>{n}</code> negotiations</>} on{" "}
        <code>{health.factory}</code> got no signed answer inside that wait (latest: <code>{health.newestUnanswered.account}</code>,
        opened {utc(health.newestUnanswered.at)}), so {n === 1 ? "it" : "they"} ended as <code>No deal</code> after three attempts. Nothing was funded.
      </p>
      <p>
        {context === "tender"
          ? "Bidding, revealing and the award are not affected: they run on NEAR alone. The step after the award, negotiating the agreement, may end the same way until the worker catches up."
          : "A deal you open now may end the same way at the negotiation step. The delay is on OutLayer's side; your limits stay sealed either way."}
        {" "}Until it clears, these need no new negotiation:
      </p>
      <WithoutTheTable />
    </aside>
  );
}

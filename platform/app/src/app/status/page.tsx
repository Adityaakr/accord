import Link from "next/link";
import { config, source } from "@/server/accord";
import { heartbeats } from "@/server/store";
import { faucetStatus } from "@/server/demo";
import { FAUCET_NEAR_TARGET, grantsToday, visitorsLeft } from "@/server/faucetgrant";
import { formatNear } from "@accord/sdk";
import { PageHead, Panel, Pill } from "@/components/ui";
import { SourceLine } from "@/components/SourceLine";
import styles from "../pages.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Status" };

// What each service holds, read from services/keeper/src/main.ts, services/agent/src/main.ts and room.ts.
const SERVICES = [
  {
    id: "keeper", label: "Keeper", what: "Starts negotiations, activates recipients, polls the observer, closes periods and agreements.",
    holds: "Holds no privileged key: only the key to its own account, which pays gas. Every method it calls is open to anyone, so a party can call them from the app when it is down.",
  },
  {
    id: "agent", label: "Demo agent", what: "Reads the /try inbox and acts on it.",
    holds: "Holds one act key, for Accord's own public demo room at /try only. The contract still checks every payment it asks for.",
  },
  {
    id: "rearm", label: "/try re-arm", what: "Keeps the public room usable: delivers its items, tops up its NEAR, closes it when it is used up and opens the next.",
    holds: "Holds the keys of the demo room's own fictional principals, including its buyer key, which it uses to reinstall the agent key there five minutes after a revocation. It touches no other room.",
  },
];

export default async function Status() {
  const c = config();
  const [src, beats, faucet, grants] = await Promise.all([
    source().catch(() => null), heartbeats().catch(() => []), faucetStatus().catch(() => undefined), grantsToday().catch(() => null),
  ]);
  const now = Date.now();
  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <PageHead title="Status" lead="The services that add liveness, and exactly what each one holds. Only the demo agent and the /try re-arm hold keys that act in an agreement, and only in Accord's own public demo room." />
      <Panel title="Chain">
        <div className={styles.statusRow}>
          <span>{c.label} RPC <span className="mono small faint">{c.rpc}</span></span>
          {src ? <SourceLine {...src} /> : <Pill tone="refusal">unreachable</Pill>}
        </div>
        <div className={styles.statusRow}><span>Factory</span><span className="mono">{c.factory}</span></div>
      </Panel>
      <div style={{ height: 16 }} />
      <Panel title="Faucet">
        {faucet === null ? (
          <p className="small">No faucet is configured on this deployment.</p>
        ) : faucet === undefined ? (
          <div className={styles.statusRow}><span>Faucet account</span><Pill tone="refusal">unreachable</Pill></div>
        ) : (
          <>
            <div className={styles.statusRow}><span>Account</span><span className="mono">{faucet.account}</span></div>
            <div className={styles.statusRow}><span>Testnet NEAR</span><span className="mono">{formatNear(faucet.near)} NEAR</span></div>
            <div className={styles.statusRow}>
              <span>Visitors left, estimated</span>
              <span className="mono">{visitorsLeft(faucet.near)}</span>
            </div>
            {grants && (
              <div className={styles.statusRow}>
                <span>Accounts funded today (UTC)</span>
                <span className="mono">{grants.count}{grants.durable ? "" : " since this process started"}</span>
              </div>
            )}
            <p className="small" style={{ paddingTop: 14 }}>
              The estimate assumes every visitor arrives with an empty account and takes the full <span className="mono">{formatNear(FAUCET_NEAR_TARGET, 1)}</span> NEAR plus gas, so it is a floor.
              Each account and each network gets one drip a UTC day.
            </p>
          </>
        )}
      </Panel>
      <div style={{ height: 16 }} />
      <Panel title="Services">
        {SERVICES.map((s) => {
          const b = beats.find((x) => x.service === s.id);
          const age = b ? Math.round((now - new Date(b.at).getTime()) / 1000) : null;
          const ok = age !== null && age < 180;
          return (
            <div key={s.id} className={styles.statusRow}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="h5">{s.label}</span>
                <span className="small">{s.what}</span>
                <span className="small faint">{s.holds}</span>
              </div>
              <Pill tone={ok ? "teal" : "muted"}>{age === null ? "not running on this deployment" : ok ? `${age} s ago` : `last seen ${Math.round(age / 60)} min ago`}</Pill>
            </div>
          );
        })}
        {SERVICES.every((s) => !beats.some((b) => b.service === s.id)) && (
          <p className="small" style={{ paddingTop: 14 }}>
            These three are not deployed here yet, so the always-open public room at <Link className="link" href="/try">/try</Link> is paused.
            Agreements and their contracts do not depend on them, and <Link className="link" href="/try-it">your own deal room</Link> runs its demo agent in the room itself.
          </p>
        )}
      </Panel>
    </div>
  );
}

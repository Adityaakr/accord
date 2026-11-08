import Link from "next/link";
import { config, source } from "@/server/accord";
import { heartbeats } from "@/server/store";
import { PageHead, Panel, Pill } from "@/components/ui";
import { SourceLine } from "@/components/SourceLine";
import styles from "../pages.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Status" };

const SERVICES = [
  { id: "keeper", label: "Keeper", what: "Starts negotiations, activates recipients, polls the observer, closes periods and agreements." },
  { id: "agent", label: "Demo agent", what: "Reads the /try inbox and acts on it with its one key." },
  { id: "rearm", label: "/try re-arm", what: "Installs a new agent key five minutes after a revocation in the public room only." },
];

export default async function Status() {
  const c = config();
  const [src, beats] = await Promise.all([source().catch(() => null), heartbeats().catch(() => [])]);
  const now = Date.now();
  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <PageHead title="Status" lead="The services that add liveness. None of them holds a key that can change an outcome: every method they call is open to anyone." />
      <Panel title="Chain">
        <div className={styles.statusRow}>
          <span>{c.label} RPC <span className="mono small faint">{c.rpc}</span></span>
          {src ? <SourceLine {...src} /> : <Pill tone="refusal">unreachable</Pill>}
        </div>
        <div className={styles.statusRow}><span>Factory</span><span className="mono">{c.factory}</span></div>
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

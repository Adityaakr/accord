import Link from "next/link";
import { tryRoom } from "@/server/tryroom";
import { recentMessages } from "@/server/store";
import { accord } from "@/server/accord";
import { PageHead, Panel, Pill, Usdc } from "@/components/ui";
import { AutoRefresh } from "@/components/AutoRefresh";
import { InboxForm } from "./InboxForm";
import { Counters } from "./Counters";
import styles from "./try.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Try the agent" };

export default async function Try() {
  const room = await tryRoom().catch(() => null);
  const [messages, refusals, due] = room
    ? await Promise.all([
        recentMessages(room.account, 12),
        accord().agreement(room.account).refusals(undefined, 12),
        accord().agreement(room.account).dueItems(),
      ])
    : [[], [], []];

  return (
    <div className="container">
      <AutoRefresh seconds={8} />
      <PageHead
        eyebrow={<Pill tone="warn">public demo room</Pill>}
        title="Try to get the agent to pay you"
        lead="Write to the buyer's accounts-payable agent the way a vendor would. It is deliberately gullible and acts on what it reads. The agreement's code decides what actually moves."
      />

      <div className={styles.grid}>
        <div className={styles.main}>
          <Panel title="Write to the agent" eyebrow={room ? <>inbox of the agent for <Link className="mono link" href={`/agreements/${room.account}`}>{room.account}</Link></> : "the room is closed"}>
            {room ? (
              <InboxForm recipient={room.recipient?.account ?? null} due={due.map((d) => ({ item: d.item, amount: d.amount }))} />
            ) : (
              <p className="body">The room has used today&apos;s allowance and reopens at 00:00 UTC. The refusal log stays live.</p>
            )}
          </Panel>

          <Panel title="What the agent did" flush>
            {messages.length === 0 ? (
              <p className={`body ${styles.pad}`}>No messages yet. Try asking it to pay a different account, or a different amount.</p>
            ) : (
              <ul className={styles.messages}>
                {messages.map((m) => (
                  <li key={m.id} className={styles.message}>
                    <div className={styles.messageTop}>
                      <span className="h5">{m.subject}</span>
                      <Outcome outcome={m.outcome} />
                    </div>
                    <p className="small">from {m.sender} · {new Date(m.received_at).toISOString().slice(11, 19)} UTC</p>
                    <p className="body">{m.body.length > 240 ? `${m.body.slice(0, 240)}…` : m.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <aside className={styles.side}>
          <Counters />
          <Panel title="Latest refusals" flush>
            {refusals.length === 0 ? (
              <p className={`small ${styles.pad}`}>None yet.</p>
            ) : (
              <ul className={styles.refusals} aria-live="polite">
                {[...refusals].reverse().map((r) => (
                  <li key={r.seq}>
                    <span className={`mono ${styles.code}`}>{r.code}</span>
                    <span className="small">{r.amount !== "0" && <Usdc amount={r.amount} />}{r.recipient && <> → <span className="mono">{r.recipient}</span></>}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="About this room">
            <p className="small">This public demo room re-arms its agent five minutes after a revocation. In a real agreement only the buyer can do that.</p>
            <p className="small">Its items are 0.01 USDC each, one due at a time. The form only stores your message; it holds no key and calls no contract. Ten messages an hour per visitor.</p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Outcome({ outcome }: { outcome: string | null }) {
  if (!outcome) return <Pill>waiting for the agent</Pill>;
  if (outcome.startsWith("ERR_")) return <Pill tone="refusal">{outcome}</Pill>;
  if (outcome === "sent") return <Pill tone="teal">paid within the terms</Pill>;
  if (outcome === "preflight_blocked") return <Pill tone="refusal">preflight blocked</Pill>;
  return <Pill tone="muted">{outcome.replace(/_/g, " ")}</Pill>;
}

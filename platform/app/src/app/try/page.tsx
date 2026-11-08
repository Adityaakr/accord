import Link from "next/link";
import { closedReason, duration, rearmTimings, tryRoom } from "@/server/tryroom";
import { heartbeats, recentMessages } from "@/server/store";
import { accord, config } from "@/server/accord";
import { PageHead, Panel, Pill, Usdc } from "@/components/ui";
import { AutoRefresh } from "@/components/AutoRefresh";
import { InboxForm } from "./InboxForm";
import { Counters } from "./Counters";
import styles from "./try.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Try the agent" };

/* The attack as recorded on NEAR testnet (a6 and a8): the agent told to pay halcyon-markets.testnet, refused by the
   contract each time. Shown in place of the room while the public room's services are not running here. */
const RECORDED = [
  { agreement: "a6.accord-v2.testnet", item: 2, amount: "13000000", at: "2026-11-08T17:04:30Z", tx: "AB9HLnWvkzNL418ygx8AVArinPnAK3jqxt4haAjsk8fs" },
  { agreement: "a8.accord-v2.testnet", item: 2, amount: "12000000", at: "2026-11-08T17:48:34Z", tx: "37zUgEoe8jbqnqQQhSe8L1VPBMRrrqXdsDorgDY7cEYL" },
  { agreement: "a8.accord-v2.testnet", item: 3, amount: "6000000", at: "2026-11-08T17:53:37Z", tx: "CPirnYdV9J55zsKRkvQkdzFZujXzEYHzkhqo51NBWtm4" },
];
const SERVICES = ["keeper", "agent", "rearm"];

export default async function Try() {
  const room = await tryRoom().catch(() => null);
  const closed = room ? null : await closedReason();
  // the public room needs its services; with none of them beating, say so and show the recorded attack instead
  const beats = room ? [] : await heartbeats().catch(() => []);
  const fresh = beats.some((b) => SERVICES.includes(b.service) && Date.now() - new Date(b.at).getTime() < 180_000);
  if (!room && !fresh) return <Recorded />;
  const t = rearmTimings();
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
              <p className="body">{closed}</p>
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
            <p className="small">This public demo room re-arms its agent {duration(t.rearmSecs)} after a revocation. In a real agreement only the buyer can do that.</p>
            <p className="small">Its items are 0.01 USDC each, one due at a time, the next {duration(t.itemIntervalSecs)} after a payment. The form only stores your message; it holds no key and calls no contract. Ten messages an hour per visitor.</p>
            <p className="small">The re-arm never asks for a payment. When a room&apos;s term ends, closing it settles any item the terms already made payable, as in every agreement.</p>
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

function Recorded() {
  const explorer = config().explorer ?? "https://testnet.nearblocks.io";
  return (
    <div className="container">
      <PageHead
        eyebrow={<Pill tone="muted">recorded on NEAR testnet</Pill>}
        title="Try to get the agent to pay you"
        lead="On NEAR testnet the demonstration agent was told to pay a new account three times, on agreements a6 and a8. The contract refused each payment. Run the same attack in your own deal room in about three minutes."
      />
      <div className={styles.grid}>
        <div className={styles.main}>
          <Panel title="Refused on testnet" eyebrow="the agent's own act calls, each naming an account the vendor never proved" flush>
            <ul className={styles.refusals}>
              {RECORDED.map((r) => (
                <li key={r.tx}>
                  <span className={`mono ${styles.code}`}>ERR_PAYEE_MISMATCH</span>
                  <span className="small">
                    <Link className="mono link" href={`/agreements/${r.agreement}`}>{r.agreement.split(".")[0]}</Link> item {r.item} · <Usdc amount={r.amount} /> → <span className="mono">halcyon-markets.testnet</span>
                    {" · "}{r.at.slice(11, 16)} UTC, {r.at.slice(0, 10)}
                    {" · "}<a className="mono link" href={`${explorer}/txns/${r.tx}`} target="_blank" rel="noreferrer">tx {r.tx.slice(0, 8)}</a>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          <div className={styles.sendRow}>
            <Link className={styles.send} href="/try-it">Run it in your own room</Link>
            <Link className="link small" href="/verify/a6.accord-v2.testnet">Verify a6</Link>
          </div>
        </div>
        <aside className={styles.side}>
          <Panel title="About this page">
            <p className="small">Nothing moved in any of these attempts; each refusal is on the agreement&apos;s record. A successful attempt can only ever produce a payment to the authorised recipient at the approved amount.</p>
            <p className="small">The always-open public room, where anyone can write to the agent, returns when its service is running on this deployment. <Link className="link" href="/status">Status</Link></p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

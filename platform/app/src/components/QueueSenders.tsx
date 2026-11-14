// Who else is waiting on OutLayer's worker right now: the `sender_id` of each unanswered request in the newest run,
// as OutLayer's contract reports it, each linked to its account on the explorer. They are named so the delay can be
// checked by anyone: these accounts are waiting too, they are not its cause.

const SHOWN = 8;
const EXPLORER = "https://testnet.nearblocks.io";
/** An agreement account of ours (`a<n>.<factory>`): a room of this app, not another project. */
const isRoom = (id: string) => /^a\d+\.accord-[a-z0-9-]+\.(testnet|near)$/.test(id);

export function QueueSenders({ senders, outlayer = "outlayer.testnet", explorer = EXPLORER }: { senders: string[]; outlayer?: string; explorer?: string }) {
  if (senders.length === 0) return null;
  const shown = senders.slice(0, SHOWN);
  const more = senders.length - shown.length;
  const others = senders.filter((s) => !isRoom(s)).length;
  return (
    <>
      Waiting on the same shared worker right now, read from{" "}
      <a className="mono" href={`${explorer}/address/${outlayer}`} target="_blank" rel="noreferrer">{outlayer}</a>:{" "}
      {shown.map((s, i) => (
        <span key={s}>
          {i > 0 ? ", " : null}
          <a className="mono" href={`${explorer}/address/${s}`} target="_blank" rel="noreferrer">{s}</a>
          {isRoom(s) ? " (an Accord room)" : null}
        </span>
      ))}
      {more > 0 ? <> and <span className="mono">{more}</span> more</> : null}.
      {others > 0 ? <> {others === senders.length ? "These are other projects' accounts" : "The rest are other projects' accounts"}: their requests are unanswered too, so the delay is the worker's, not one project's.</> : null}
    </>
  );
}

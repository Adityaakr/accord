// Who else is waiting on OutLayer's worker right now: the `sender_id` of each unanswered request in the newest run,
// as OutLayer's contract reports it, each linked to its account on the explorer. They are named so the delay can be
// checked by anyone: these accounts are waiting too, they are not its cause. Only what the reading shows is said:
// which accounts have a request unanswered, and which of them are ours. Nothing is said about who they are or why.

const SHOWN = 8;
const EXPLORER = "https://testnet.nearblocks.io";
/** An agreement account of ours (`a<n>.<factory>`): a room of this app. */
const isRoom = (id: string) => /^a\d+\.accord-[a-z0-9-]+\.(testnet|near)$/.test(id);
/** Any account of ours: a factory (`accord-v2.testnet`) or anything under one. Everything else is not Accord's. */
const isOurs = (id: string) => /(^|\.)accord-[a-z0-9-]+\.(testnet|near)$/.test(id);

export function QueueSenders({ senders, outlayer = "outlayer.testnet", explorer = EXPLORER }: { senders: string[]; outlayer?: string; explorer?: string }) {
  if (senders.length === 0) return null;
  const shown = senders.slice(0, SHOWN);
  const more = senders.length - shown.length;
  const others = senders.filter((s) => !isOurs(s)).length;
  return (
    <>
      Waiting on the same shared worker right now, read from{" "}
      <a className="mono" href={`${explorer}/address/${outlayer}`} target="_blank" rel="noreferrer">{outlayer}</a>:{" "}
      {shown.map((s, i) => (
        <span key={s}>
          {i > 0 ? ", " : null}
          <a className="mono" href={`${explorer}/address/${s}`} target="_blank" rel="noreferrer">{s}</a>
          {isRoom(s) ? " (an Accord room)" : isOurs(s) ? " (Accord's)" : null}
        </span>
      ))}
      {more > 0 ? <> and <span className="mono">{more}</span> more</> : null}.
      {others > 0 ? <> {others === senders.length ? "None of these accounts is Accord's" : <>The other <span className="mono">{others}</span> {others === 1 ? "is not Accord's account" : "are not Accord's accounts"}</>}: {others === 1 && others !== senders.length ? "its request is" : "their requests are"} unanswered too.</> : null}
    </>
  );
}

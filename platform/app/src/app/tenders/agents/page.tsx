// The signed-in account's tender agents: link one (from a link the script or the CLI prints, or this browser's own
// key), see what each bid on and won, unlink. The board decides everything; this page only shows it.
import { YourAgents } from "./YourAgents";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your agents" };

const one = (v: string | string[] | undefined): string | null => (typeof v === "string" ? v : null);

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const bidder = one(q.bidder), sig = one(q.sig);
  const link = bidder && sig && /^[0-9a-f]{64}$/.test(bidder) && /^[0-9a-f]{128}$/.test(sig)
    ? { bidder, sig, label: (one(q.label) ?? "").slice(0, 64), source: one(q.source) ?? "script" }
    : null;
  return <YourAgents link={link} />;
}
